import { parse } from './parser';
import type * as A from './ast';
import {
  JNULL, JVOID, binaryOp, coerce, defaultValue, jbool, jchar, jdouble, jfloat, jint, jlong,
  jstring, num, truth, typeNameOf, unaryOp, valuesEqual, ArithmeticDivideByZero,
  PRIMITIVE_TYPES, type JArray, type JObject, type JValue,
} from './values';
import {
  CompileFailure, ExecutionLimit, JavaRuntimeError, diag,
  type Diagnostic, type JavaThrow,
} from './diagnostics';
import { check } from './checker';
import { Simulation, TICK_MS } from '../../sim/simulation';
import {
  findNativeClass, nativeExtends, nativeFields, nativeMethods,
} from '../../ftc-mock/registry';
import { STRING_METHODS } from '../../ftc-mock/javalang';
import type { MockContext, NativeField, NativeMethod } from '../../ftc-mock/types';

/* A tree-walking interpreter for the Java subset in docs/ARCHITECTURE.md.
   It runs in a Web Worker in the browser and in-process under Vitest, which is the
   whole reason the 42-solution test suite takes a second rather than minutes. */

/* ----------------------------------------------------------- control flow */

class ReturnSignal {
  constructor(readonly value: JValue) {}
}
class BreakSignal {
  constructor(readonly label: string | null) {}
}
class ContinueSignal {
  constructor(readonly label: string | null) {}
}

/* ----------------------------------------------------------------- scopes */

interface Slot {
  value: JValue;
  /** Declared type, so compound assignment narrows the way Java does. */
  type: string;
}

class Env {
  private vars = new Map<string, Slot>();

  constructor(readonly parent: Env | null) {}

  declare(name: string, type: string, value: JValue): void {
    this.vars.set(name, { value, type });
  }

  lookup(name: string): Slot | undefined {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- walking the scope chain
    let e: Env | null = this;
    while (e) {
      const s = e.vars.get(name);
      if (s) return s;
      e = e.parent;
    }
    return undefined;
  }
}

/* ------------------------------------------------------------ class table */

interface ClassInfo {
  name: string;
  decl: A.TypeDecl;
  superName: string | null;
  statics: Map<string, JValue>;
  staticsReady: boolean;
  enumValues: Map<string, JValue>;
  enumOrder: string[];
}

/* ------------------------------------------------------------------ public */

export interface RunOptions {
  sim?: Simulation;
  /** Wall-clock ceiling. The brief asks for 10 s. */
  timeLimitMs?: number;
  /** Interpreter step ceiling, which is what actually catches a tight infinite loop. */
  maxSteps?: number;
  /** Sim-clock ceiling, so a robot loop cannot run for a simulated hour. */
  maxSimMs?: number;
  /** For a TeleOp: how long to run loop(). */
  teleOpForMs?: number;
  /** Called before every loop() iteration so the host can feed gamepad input. */
  onTick?: (sim: Simulation) => void;
  /** Cooperative cancellation, e.g. the kid pressed Stop. */
  shouldStop?: () => boolean;
  /** Math.random() is seeded from this so a lesson can never be flaky. */
  seed?: number;
}

export type RunStopReason = 'finished' | 'time' | 'steps' | 'simTime' | 'stopped';

export interface RunResult {
  ok: boolean;
  diagnostics: Diagnostic[];
  thrown: JavaThrow | null;
  stopReason: RunStopReason;
  sim: Simulation;
  /** What the entry point was, for the lesson UI. */
  entry: string | null;
  steps: number;
  /** The line the run stopped on, when it stopped early. */
  stopLine: number;
}

const DEFAULTS = {
  timeLimitMs: 10_000,
  maxSteps: 4_000_000,
  maxSimMs: 60_000,
  teleOpForMs: 4_000,
};

/* A TeleOp driven one loop() at a time.

   A LinearOpMode can run to completion in a Web Worker and have its snapshots replayed,
   because nothing outside it changes while it runs. A TeleOp cannot: the kid is holding
   the sticks, and a worker in a long synchronous loop never processes the messages that
   would carry their input. So a TeleOp runs on the main thread, one loop() per frame,
   which keeps the page responsive and the gamepad live. Each loop() is short, and a
   runaway inside one still trips the step budget in milliseconds. */
export interface TeleOpSession {
  readonly sim: Simulation;
  readonly className: string;
  /** Runs one loop() and one sim tick. False once the TeleOp has finished or failed. */
  step(): boolean;
  /** Runs stop() and releases the session. */
  finish(): RunResult;
  readonly result: RunResult | null;
}

/** A session for a TeleOp, a RunResult if it will not compile, or null if the program is
    not a TeleOp at all — in which case the caller should run it in the worker instead. */
export function startTeleOp(
  source: string,
  options: RunOptions = {},
): TeleOpSession | RunResult | null {
  const sim = options.sim ?? new Simulation();
  const { unit, diagnostics } = parse(source);
  const fail = (ds: Diagnostic[]): RunResult => ({
    ok: false, diagnostics: ds, thrown: null, stopReason: 'finished', sim, entry: null, steps: 0,
    stopLine: ds[0]?.line ?? 1,
  });
  if (diagnostics.some((d) => d.severity === 'error')) return fail(diagnostics);
  const semantic = check(unit);
  if (semantic.length) return fail([...diagnostics, ...semantic]);

  const interp = new Interpreter(unit, sim, options);
  return interp.openTeleOp(diagnostics);
}

/** What kind of program this is, without running any of it. */
export function entryKindOf(source: string): 'teleop' | 'linear' | 'main' | null {
  const { unit, diagnostics } = parse(source);
  if (diagnostics.some((d) => d.severity === 'error')) return null;
  const probe = new Interpreter(unit, new Simulation(), {});
  return probe.entryKind();
}

export function runJava(source: string, options: RunOptions = {}): RunResult {
  const sim = options.sim ?? new Simulation();
  const { unit, diagnostics } = parse(source);
  const bail = (ds: Diagnostic[]): RunResult => ({
    ok: false, diagnostics: ds, thrown: null, stopReason: 'finished', sim, entry: null, steps: 0,
    stopLine: ds[0]?.line ?? 1,
  });

  if (diagnostics.some((d) => d.severity === 'error')) return bail(diagnostics);

  // Resolve names and types before running anything, as javac does. Tier 0 lessons 02
  // and 03 depend on a misspelling being reported instead of half-executed.
  const semantic = check(unit);
  if (semantic.length) return bail([...diagnostics, ...semantic]);

  const interp = new Interpreter(unit, sim, options);
  return interp.run(diagnostics);
}

/* ------------------------------------------------------------ interpreter */

interface Frame {
  env: Env;
  thisObj: JObject | null;
  cls: ClassInfo | null;
  method: string;
  line: number;
}

class Interpreter implements MockContext {
  readonly classes = new Map<string, ClassInfo>();
  private frames: Frame[] = [];
  private steps = 0;
  private deadline: number;
  private limits: typeof DEFAULTS;
  private stopRequested = false;
  private hasStarted = false;
  /** When a TeleOp is scheduled to end. Reaching it is a normal finish, not a runaway. */
  private teleOpDeadlineMs: number | null = null;
  private stopLine = 1;
  private builtins = new Map<string, JValue>();
  private enumCache = new Map<string, Map<string, JValue>>();
  private rngState: number;
  private simCap: number;

  constructor(
    private unit: A.CompilationUnit,
    readonly sim: Simulation,
    private options: RunOptions,
  ) {
    this.limits = { ...DEFAULTS, ...stripUndefined(options) };
    this.deadline = Date.now() + this.limits.timeLimitMs;
    this.rngState = (options.seed ?? 20260101) | 0;
    this.simCap = this.limits.maxSimMs;
    for (const t of unit.types) this.registerType(t);
  }

  private registerType(t: A.TypeDecl): void {
    this.classes.set(t.name, {
      name: t.name,
      decl: t,
      superName: t.superclass?.name ?? null,
      statics: new Map(),
      staticsReady: false,
      enumValues: new Map(),
      enumOrder: t.enumConstants.map((c) => c.name),
    });
    for (const n of t.nested) this.registerType(n);
  }

  /* ------------------------------------------------------------- MockContext */

  sleep(ms: number): void {
    const ticks = Math.max(0, Math.round(ms / TICK_MS));
    for (let i = 0; i < ticks; i++) {
      this.tick();
      if (this.simExhausted()) return;
    }
    if (ticks === 0) this.tick();
  }

  opModeIsActive(): boolean {
    return (
      this.hasStarted && !this.stopRequested && !this.simExhausted() && !this.cancelled() && !this.teleOpOver()
    );
  }

  isStopRequested(): boolean {
    return this.stopRequested || this.simExhausted() || this.cancelled();
  }

  opModeInInit(): boolean {
    return !this.hasStarted;
  }

  waitForStart(): void {
    this.hasStarted = true;
    this.tick();
  }

  instance(className: string, native?: unknown): JValue {
    const cls = findNativeClass(className);
    const ref: JObject = { className: cls?.simple ?? className, fields: new Map(), isNative: true };
    if (native !== undefined) ref.native = native;
    return { k: 'obj', ref };
  }

  enumValue(className: string, constant: string): JValue {
    const cls = findNativeClass(className);
    const key = cls?.simple ?? className;
    let table = this.enumCache.get(key);
    if (!table) {
      table = new Map();
      this.enumCache.set(key, table);
    }
    let v = table.get(constant);
    if (!v) {
      const ordinal = cls?.enumConstants?.indexOf(constant) ?? -1;
      const ref: JObject = {
        className: key,
        fields: new Map(),
        isNative: true,
        enumName: constant,
        enumOrdinal: ordinal < 0 ? 0 : ordinal,
      };
      v = { k: 'obj', ref };
      table.set(constant, v);
    }
    return v;
  }

  builtin(name: 'hardwareMap' | 'telemetry' | 'gamepad1' | 'gamepad2'): JValue {
    let v = this.builtins.get(name);
    if (!v) {
      v =
        name === 'hardwareMap'
          ? this.instance('HardwareMap', {})
          : name === 'telemetry'
            ? this.instance('Telemetry', {})
            : this.instance('Gamepad', { which: name === 'gamepad2' ? 2 : 1 });
      this.builtins.set(name, v);
    }
    return v;
  }

  builtinSystemOut(): JValue {
    let v = this.builtins.get('System.out');
    if (!v) {
      v = this.instance('PrintStream', {});
      this.builtins.set('System.out', v);
    }
    return v;
  }

  /** A small deterministic PRNG, so Math.random() cannot make a lesson flaky. */
  random(): number {
    this.rngState = (Math.imul(this.rngState, 1103515245) + 12345) & 0x7fffffff;
    return this.rngState / 0x7fffffff;
  }

  fail(exceptionClass: string, message: string): never {
    throw new JavaRuntimeError({
      exceptionClass,
      message,
      line: this.line,
      stack: this.stackTrace(),
    });
  }

  /* ------------------------------------------------------------------ budget */

  private get line(): number {
    return this.frames[this.frames.length - 1]?.line ?? 1;
  }

  private cancelled(): boolean {
    return this.options.shouldStop?.() ?? false;
  }

  private simExhausted(): boolean {
    return this.sim.timeMs >= this.simCap;
  }

  private teleOpOver(): boolean {
    return this.teleOpDeadlineMs !== null && this.sim.timeMs >= this.teleOpDeadlineMs;
  }

  /** One sim step. Driven by the native methods marked `tick` and by loop() boundaries. */
  private tick(): void {
    if (this.simExhausted() || this.teleOpOver()) return;
    this.options.onTick?.(this.sim);
    this.sim.step();
  }

  private spend(): void {
    this.steps++;
    if (this.steps > this.limits.maxSteps) {
      throw new ExecutionLimit('steps', this.line, this.stackTrace());
    }
    if ((this.steps & 0x3ff) === 0) {
      if (Date.now() > this.deadline) throw new ExecutionLimit('time', this.line, this.stackTrace());
      if (this.cancelled()) throw new ExecutionLimit('stopped', this.line, this.stackTrace());
    }
  }

  private stackTrace(): string[] {
    return [...this.frames]
      .reverse()
      .map((f) => `\tat ${f.cls?.name ?? 'Main'}.${f.method}(${f.cls?.name ?? 'Main'}.java:${f.line})`);
  }

  /* --------------------------------------------------------------------- run */

  run(parseDiagnostics: Diagnostic[]): RunResult {
    const base: Omit<RunResult, 'ok' | 'thrown' | 'stopReason'> = {
      diagnostics: parseDiagnostics,
      sim: this.sim,
      entry: null,
      steps: 0,
      stopLine: 1,
    };

    let stopReason: RunStopReason = 'finished';
    let thrown: JavaThrow | null = null;
    let entry: string | null = null;

    try {
      const target = this.findEntry();
      if (!target) {
        const d = diag(
          'no.main.method',
          'no OpMode found: a lesson needs a class that extends OpMode or LinearOpMode',
          { line: 1, column: 1, length: 1 },
        );
        return { ...base, ok: false, diagnostics: [...parseDiagnostics, d], thrown: null, stopReason: 'finished' };
      }
      entry = `${target.cls.name}.${target.kind === 'main' ? 'main' : target.kind === 'linear' ? 'runOpMode' : 'loop'}`;

      if (target.kind === 'main') {
        this.callStatic(target.cls, 'main', [
          { k: 'array', ref: { elemType: 'String', items: [] } },
        ]);
      } else {
        const self = this.newUserObject(target.cls, []);
        if (target.kind === 'linear') {
          this.hasStarted = false;
          this.invokeUser(self, target.cls, 'runOpMode', []);
        } else {
          this.runTeleOp(self, target.cls);
        }
      }
    } catch (e) {
      if (e instanceof ExecutionLimit) {
        stopReason = e.reason;
        this.stopLine = e.line;
      } else if (e instanceof JavaRuntimeError) {
        thrown = e.thrown;
      } else if (e instanceof CompileFailure) {
        return {
          ...base,
          ok: false,
          diagnostics: [...parseDiagnostics, ...e.diagnostics],
          thrown: null,
          stopReason: 'finished',
          entry,
        };
      } else if (e instanceof ReturnSignal) {
        // A return out of the entry point. Normal.
      } else {
        throw e;
      }
    }

    if (stopReason === 'finished' && this.simExhausted()) stopReason = 'simTime';

    return {
      ...base,
      ok: thrown === null && (stopReason === 'finished' || stopReason === 'stopped'),
      diagnostics: parseDiagnostics,
      thrown,
      stopReason,
      entry,
      steps: this.steps,
    };
  }

  entryKind(): 'teleop' | 'linear' | 'main' | null {
    return this.findEntry()?.kind ?? null;
  }

  /** Returns a stepper when this program is a TeleOp, or null to run it normally. */
  openTeleOp(parseDiagnostics: Diagnostic[]): TeleOpSession | null {
    const target = this.findEntry();
    if (!target || target.kind !== 'teleop') return null;

    const cls = target.cls;
    let finished = false;
    let result: RunResult | null = null;
    const base = (): Omit<RunResult, 'ok' | 'thrown' | 'stopReason'> => ({
      diagnostics: parseDiagnostics,
      sim: this.sim,
      entry: `${cls.name}.loop`,
      steps: this.steps,
      stopLine: this.stopLine,
    });
    const settle = (stopReason: RunStopReason, thrown: JavaThrow | null): RunResult => {
      finished = true;
      result = {
        ...base(),
        ok: thrown === null && (stopReason === 'finished' || stopReason === 'stopped'),
        thrown,
        stopReason,
      };
      return result;
    };

    let self: JValue;
    try {
      self = this.newUserObject(cls, []);
      this.teleOpDeadlineMs = Math.min(this.simCap, this.limits.teleOpForMs);
      if (this.findUserMethod(cls, 'init', 0)) this.invokeUser(self, cls, 'init', []);
      this.hasStarted = true;
      if (this.findUserMethod(cls, 'start', 0)) this.invokeUser(self, cls, 'start', []);
    } catch (e) {
      // init() or start() failed, so there is nothing to drive. Hand back a session
      // that is already finished and carries the failure.
      const failed = this.settleFrom(e, settle);
      return {
        sim: this.sim,
        className: cls.name,
        result: failed,
        step: () => false,
        finish: () => failed,
      };
    }

    const hasLoop = this.findUserMethod(cls, 'loop', 0) !== null;
    const session: TeleOpSession = {
      sim: this.sim,
      className: cls.name,
      get result() {
        return result;
      },
      step: () => {
        if (finished) return false;
        if (!hasLoop || this.teleOpOver() || this.simExhausted() || this.cancelled() || this.stopRequested) {
          return false;
        }
        // The wall-clock budget is per frame here, not per run: a TeleOp is meant to
        // keep going, and only a runaway inside one loop() should be stopped.
        this.deadline = Date.now() + 250;
        try {
          this.invokeUser(self, cls, 'loop', []);
          this.tick();
          return true;
        } catch (e) {
          this.settleFrom(e, settle);
          return false;
        }
      },
      finish: () => {
        if (result) return result;
        try {
          if (this.findUserMethod(cls, 'stop', 0)) this.invokeUser(self, cls, 'stop', []);
        } catch {
          // A failure in stop() should not replace what already happened.
        }
        return settle('finished', null);
      },
    };
    return session;
  }

  private settleFrom(
    e: unknown,
    settle: (reason: RunStopReason, thrown: JavaThrow | null) => RunResult,
  ): RunResult {
    if (e instanceof ExecutionLimit) {
      this.stopLine = e.line;
      return settle(e.reason, null);
    }
    if (e instanceof JavaRuntimeError) return settle('finished', e.thrown);
    if (e instanceof CompileFailure) return settle('finished', null);
    if (e instanceof ReturnSignal) return settle('finished', null);
    throw e;
  }

  private runTeleOp(self: JValue, cls: ClassInfo): void {
    const obj = self.k === 'obj' ? self.ref : null;
    if (!obj) return;
    this.teleOpDeadlineMs = Math.min(this.simCap, this.sim.timeMs + this.limits.teleOpForMs);

    if (this.findUserMethod(cls, 'init', 0)) this.invokeUser(self, cls, 'init', []);
    this.hasStarted = true;
    if (this.findUserMethod(cls, 'start', 0)) this.invokeUser(self, cls, 'start', []);

    const hasLoop = this.findUserMethod(cls, 'loop', 0) !== null;
    while (hasLoop && !this.teleOpOver() && !this.simExhausted() && !this.cancelled() && !this.stopRequested) {
      this.invokeUser(self, cls, 'loop', []);
      this.tick();
    }
    if (this.findUserMethod(cls, 'stop', 0)) this.invokeUser(self, cls, 'stop', []);
  }

  private findEntry(): { kind: 'linear' | 'teleop' | 'main'; cls: ClassInfo } | null {
    const all = [...this.classes.values()];
    const annotated = all.filter((c) =>
      c.decl.annotations.some((a) => a.name === 'TeleOp' || a.name === 'Autonomous'),
    );
    const ordered = [...annotated, ...all.filter((c) => !annotated.includes(c))];

    for (const c of ordered) {
      if (this.inheritsNative(c, 'LinearOpMode')) return { kind: 'linear', cls: c };
    }
    for (const c of ordered) {
      if (this.inheritsNative(c, 'OpMode')) return { kind: 'teleop', cls: c };
    }
    for (const c of ordered) {
      const m = c.decl.methods.find(
        (x) => x.name === 'main' && x.modifiers.includes('static') && x.params.length === 1,
      );
      if (m) return { kind: 'main', cls: c };
    }
    return null;
  }

  /** Does this user class inherit, possibly through other user classes, from a native one? */
  private inheritsNative(cls: ClassInfo, nativeName: string): boolean {
    let cur: ClassInfo | undefined = cls;
    const seen = new Set<string>();
    while (cur && !seen.has(cur.name)) {
      seen.add(cur.name);
      const sup = cur.superName;
      if (!sup) return false;
      const userSuper = this.classes.get(sup);
      if (userSuper) {
        cur = userSuper;
        continue;
      }
      return nativeExtends(sup, nativeName);
    }
    return false;
  }

  /* -------------------------------------------------------------- instances */

  private newUserObject(cls: ClassInfo, args: JValue[]): JValue {
    const obj: JObject = { className: cls.name, fields: new Map() };
    const value: JValue = { k: 'obj', ref: obj };
    this.initFields(obj, cls);
    const ctor = pickOverload(
      cls.decl.constructors.map((c) => ({ params: c.params.map((p) => typeKey(p.type)), varargs: false, decl: c })),
      args,
    );
    if (ctor) {
      this.invokeDeclared(value, cls, ctor.decl, args, cls.name);
    } else if (args.length > 0 && cls.decl.constructors.length > 0) {
      this.fail(
        'IllegalArgumentException',
        `no constructor of ${cls.name} takes ${args.length} value${args.length === 1 ? '' : 's'}`,
      );
    }
    return value;
  }

  /** Field defaults and initializers, superclass first, as Java does. */
  private initFields(obj: JObject, cls: ClassInfo): void {
    const chain: ClassInfo[] = [];
    let cur: ClassInfo | undefined = cls;
    const seen = new Set<string>();
    while (cur && !seen.has(cur.name)) {
      seen.add(cur.name);
      chain.unshift(cur);
      cur = cur.superName ? this.classes.get(cur.superName) : undefined;
    }
    for (const c of chain) {
      for (const f of c.decl.fields) {
        if (f.modifiers.includes('static')) continue;
        obj.fields.set(f.name, defaultValue(typeKey(f.type)));
      }
    }
    for (const c of chain) {
      for (const f of c.decl.fields) {
        if (f.modifiers.includes('static') || !f.init) continue;
        const frame: Frame = { env: new Env(null), thisObj: obj, cls: c, method: '<init>', line: f.line };
        this.frames.push(frame);
        try {
          const v = this.coerceOrFail(this.eval(f.init, frame), typeKey(f.type), f);
          obj.fields.set(f.name, v);
        } finally {
          this.frames.pop();
        }
      }
    }
  }

  private ensureStatics(cls: ClassInfo): void {
    if (cls.staticsReady) return;
    cls.staticsReady = true;

    if (cls.decl.kind === 'enum') {
      cls.decl.enumConstants.forEach((c, i) => {
        const ref: JObject = {
          className: cls.name,
          fields: new Map(),
          enumName: c.name,
          enumOrdinal: i,
        };
        const value: JValue = { k: 'obj', ref };
        cls.enumValues.set(c.name, value);
        cls.statics.set(c.name, value);
      });
    }

    for (const f of cls.decl.fields) {
      if (!f.modifiers.includes('static')) continue;
      cls.statics.set(f.name, defaultValue(typeKey(f.type)));
    }
    for (const f of cls.decl.fields) {
      if (!f.modifiers.includes('static') || !f.init) continue;
      const frame: Frame = { env: new Env(null), thisObj: null, cls, method: '<clinit>', line: f.line };
      this.frames.push(frame);
      try {
        cls.statics.set(f.name, this.coerceOrFail(this.eval(f.init, frame), typeKey(f.type), f));
      } finally {
        this.frames.pop();
      }
    }
  }

  /* ---------------------------------------------------------------- invoking */

  private findUserMethod(cls: ClassInfo, name: string, arity: number): { cls: ClassInfo; decl: A.MethodDecl } | null {
    let cur: ClassInfo | undefined = cls;
    const seen = new Set<string>();
    while (cur && !seen.has(cur.name)) {
      seen.add(cur.name);
      const hit = cur.decl.methods.find(
        (m) => m.name === name && m.body !== null && (m.params.length === arity || hasVarargs(m)),
      );
      if (hit) return { cls: cur, decl: hit };
      cur = cur.superName ? this.classes.get(cur.superName) : undefined;
    }
    return null;
  }

  private userMethodCandidates(cls: ClassInfo, name: string): { cls: ClassInfo; decl: A.MethodDecl }[] {
    const out: { cls: ClassInfo; decl: A.MethodDecl }[] = [];
    let cur: ClassInfo | undefined = cls;
    const seen = new Set<string>();
    while (cur && !seen.has(cur.name)) {
      seen.add(cur.name);
      for (const m of cur.decl.methods) if (m.name === name) out.push({ cls: cur, decl: m });
      cur = cur.superName ? this.classes.get(cur.superName) : undefined;
    }
    return out;
  }

  private invokeUser(self: JValue, cls: ClassInfo, name: string, args: JValue[]): JValue {
    const found = this.findUserMethod(cls, name, args.length);
    if (!found) this.fail('NoSuchMethodError', `${cls.name}.${name}`);
    return this.invokeDeclared(self, found.cls, found.decl, args, name);
  }

  private invokeDeclared(
    self: JValue,
    cls: ClassInfo,
    decl: A.MethodDecl,
    args: JValue[],
    name: string,
  ): JValue {
    if (this.frames.length > 400) {
      throw new JavaRuntimeError({
        exceptionClass: 'StackOverflowError',
        message: null,
        line: decl.line,
        stack: this.stackTrace().slice(0, 12),
      });
    }
    this.ensureStatics(cls);
    const env = new Env(null);
    bindParams(decl, args, env, (v, t) => this.coerceOrFail(v, t, decl));
    const frame: Frame = {
      env,
      thisObj: self.k === 'obj' ? self.ref : null,
      cls,
      method: name,
      line: decl.line,
    };
    this.frames.push(frame);
    try {
      if (decl.body) this.execBlock(decl.body, frame, new Env(env));
      const rt = decl.returnType ? typeKey(decl.returnType) : 'void';
      return rt === 'void' ? JVOID : defaultValue(rt);
    } catch (e) {
      if (e instanceof ReturnSignal) {
        const rt = decl.returnType ? typeKey(decl.returnType) : 'void';
        if (rt === 'void') return JVOID;
        return this.coerceOrFail(e.value, rt, decl);
      }
      throw e;
    } finally {
      this.frames.pop();
    }
  }

  private callStatic(cls: ClassInfo, name: string, args: JValue[]): JValue {
    this.ensureStatics(cls);
    const cands = this.userMethodCandidates(cls, name).filter((c) => c.decl.body);
    const chosen = pickOverload(
      cands.map((c) => ({ params: c.decl.params.map((p) => typeKey(p.type)), varargs: hasVarargs(c.decl), decl: c })),
      args,
    );
    if (!chosen) this.fail('NoSuchMethodError', `${cls.name}.${name}`);
    return this.invokeDeclared(JNULL, chosen.decl.cls, chosen.decl.decl, args, name);
  }

  /* ------------------------------------------------------------- statements */

  private execBlock(block: A.Block, frame: Frame, env: Env): void {
    for (const s of block.stmts) this.exec(s, frame, env);
  }

  private exec(stmt: A.Stmt, frame: Frame, env: Env): void {
    this.spend();
    frame.line = stmt.line;

    switch (stmt.t) {
      case 'block':
        this.execBlock(stmt, frame, new Env(env));
        return;

      case 'empty':
        return;

      case 'localType':
        if (!this.classes.has(stmt.decl.name)) this.registerType(stmt.decl);
        return;

      case 'localVar': {
        const base = typeKey(stmt.type);
        for (const d of stmt.decls) {
          const type = base + '[]'.repeat(d.dims);
          let value: JValue;
          if (d.init) {
            const raw = d.init.t === 'arrayInit' ? this.buildArray(stmt.type, d.init, frame, env, d.dims) : this.eval(d.init, frame, env);
            value = type === 'var' ? raw : this.coerceOrFail(raw, type, stmt);
          } else {
            value = defaultValue(type);
          }
          env.declare(d.name, type === 'var' ? typeNameOf(value) : type, value);
        }
        return;
      }

      case 'expr':
        this.eval(stmt.expr, frame, env);
        return;

      case 'if':
        if (truth(this.condition(stmt.cond, frame, env))) this.exec(stmt.then, frame, new Env(env));
        else if (stmt.otherwise) this.exec(stmt.otherwise, frame, new Env(env));
        return;

      case 'while':
        for (;;) {
          this.spend();
          if (!truth(this.condition(stmt.cond, frame, env))) return;
          try {
            this.exec(stmt.body, frame, new Env(env));
          } catch (e) {
            if (e instanceof BreakSignal && e.label === null) return;
            if (e instanceof ContinueSignal && e.label === null) continue;
            throw e;
          }
        }

      case 'doWhile':
        for (;;) {
          this.spend();
          try {
            this.exec(stmt.body, frame, new Env(env));
          } catch (e) {
            if (e instanceof BreakSignal && e.label === null) return;
            if (!(e instanceof ContinueSignal && e.label === null)) throw e;
          }
          if (!truth(this.condition(stmt.cond, frame, env))) return;
        }

      case 'for': {
        const outer = new Env(env);
        for (const init of stmt.init) this.exec(init, frame, outer);
        for (;;) {
          this.spend();
          if (stmt.cond && !truth(this.condition(stmt.cond, frame, outer))) return;
          try {
            this.exec(stmt.body, frame, new Env(outer));
          } catch (e) {
            if (e instanceof BreakSignal && e.label === null) return;
            if (!(e instanceof ContinueSignal && e.label === null)) throw e;
          }
          for (const u of stmt.update) this.eval(u, frame, outer);
        }
      }

      case 'forEach': {
        const seq = this.eval(stmt.iterable, frame, env);
        if (seq.k !== 'array') {
          this.fail('ClassCastException', `for-each needs an array, but this is ${typeNameOf(seq)}`);
        }
        const type = typeKey(stmt.varType);
        for (const item of [...seq.ref.items]) {
          this.spend();
          const inner = new Env(env);
          inner.declare(stmt.varName, type, this.coerceOrFail(item, type, stmt));
          try {
            this.exec(stmt.body, frame, inner);
          } catch (e) {
            if (e instanceof BreakSignal && e.label === null) return;
            if (!(e instanceof ContinueSignal && e.label === null)) throw e;
          }
        }
        return;
      }

      case 'return':
        throw new ReturnSignal(stmt.value ? this.eval(stmt.value, frame, env) : JVOID);

      case 'break':
        throw new BreakSignal(stmt.label);

      case 'continue':
        throw new ContinueSignal(stmt.label);

      case 'throw': {
        const v = this.eval(stmt.value, frame, env);
        const cls = v.k === 'obj' ? v.ref.className : 'RuntimeException';
        const msg = v.k === 'obj' ? (v.ref.fields.get('message') ?? JNULL) : JNULL;
        throw new JavaRuntimeError({
          exceptionClass: cls,
          message: msg.k === 'string' ? msg.v : null,
          line: stmt.line,
          stack: this.stackTrace(),
        });
      }

      case 'switch': {
        const subject = this.eval(stmt.subject, frame, env);
        const inner = new Env(env);
        let matched = -1;
        for (let i = 0; i < stmt.cases.length; i++) {
          const c = stmt.cases[i]!;
          if (!c.labels.length) continue;
          for (const label of c.labels) {
            const lv = this.switchLabel(label, subject, frame, inner);
            if (valuesEqual(lv, subject)) {
              matched = i;
              break;
            }
          }
          if (matched >= 0) break;
        }
        if (matched < 0) matched = stmt.cases.findIndex((c) => !c.labels.length);
        if (matched < 0) return;

        try {
          for (let i = matched; i < stmt.cases.length; i++) {
            for (const s of stmt.cases[i]!.stmts) this.exec(s, frame, inner);
            if (stmt.cases[i]!.arrow) return;
          }
        } catch (e) {
          if (e instanceof BreakSignal && e.label === null) return;
          throw e;
        }
        return;
      }
    }
  }

  /** `case DRIVE:` is a bare name that means the enum constant, not a variable. */
  private switchLabel(label: A.Expr, subject: JValue, frame: Frame, env: Env): JValue {
    if (label.t === 'name' && subject.k === 'obj' && subject.ref.enumName !== undefined) {
      const owner = this.classes.get(subject.ref.className);
      if (owner) {
        this.ensureStatics(owner);
        const v = owner.enumValues.get(label.name);
        if (v) return v;
      }
      const native = findNativeClass(subject.ref.className);
      if (native?.enumConstants?.includes(label.name)) {
        return this.enumValue(subject.ref.className, label.name);
      }
    }
    return this.eval(label, frame, env);
  }

  private condition(expr: A.Expr, frame: Frame, env: Env): JValue {
    const v = this.eval(expr, frame, env);
    if (v.k !== 'boolean') {
      this.fail(
        'ClassCastException',
        `a condition has to be true or false, but this one is ${typeNameOf(v)}`,
      );
    }
    return v;
  }

  /* ------------------------------------------------------------ expressions */

  private eval(expr: A.Expr, frame: Frame, env: Env = frame.env): JValue {
    this.spend();
    frame.line = expr.line;

    switch (expr.t) {
      case 'literal':
        switch (expr.kind) {
          case 'int': return jint(expr.value as number);
          case 'long': return jlong(expr.value as number);
          case 'double': return jdouble(expr.value as number);
          case 'float': return jfloat(expr.value as number);
          case 'boolean': return jbool(expr.value as boolean);
          case 'char': return jchar(String(expr.value).charCodeAt(0));
          case 'string': return jstring(String(expr.value));
          case 'null': return JNULL;
        }
        return JNULL;

      case 'this':
        return frame.thisObj ? { k: 'obj', ref: frame.thisObj } : JNULL;

      case 'super':
        return frame.thisObj ? { k: 'obj', ref: frame.thisObj } : JNULL;

      case 'name':
        return this.readName(expr, frame, env);

      case 'field':
        return this.readField(expr, frame, env);

      case 'index': {
        const arr = this.eval(expr.target, frame, env);
        const idx = Math.trunc(num(this.eval(expr.index, frame, env)));
        return this.arraySlot(arr, idx).get();
      }

      case 'call':
        return this.evalCall(expr, frame, env);

      case 'new': {
        const name = expr.type.name;
        const user = this.classes.get(name.split('.').pop() ?? name);
        const args = expr.args.map((a) => this.eval(a, frame, env));
        if (user) return this.newUserObject(user, args);
        const native = findNativeClass(name);
        if (native?.constructors?.length) {
          const chosen = pickOverload(
            native.constructors.map((c) => ({ params: c.params, varargs: c.varargs ?? false, decl: c })),
            args,
          );
          if (chosen) return this.instance(native.simple, chosen.decl.build(this, args));
        }
        if (native) {
          this.fail('InstantiationException', `${native.simple} is given to you by the robot, not created with new`);
        }
        return this.fail('NoClassDefFoundError', name);
      }

      case 'newArray': {
        if (expr.init) return this.buildArray(expr.type, expr.init, frame, env, expr.extraDims + expr.sizes.length);
        const sizes = expr.sizes.map((s) => Math.trunc(num(this.eval(s, frame, env))));
        return this.makeArray(typeKey(expr.type), sizes, expr.extraDims);
      }

      case 'arrayInit':
        return this.buildArray({ ...expr, name: 'Object', dims: 0, args: [] }, expr, frame, env, 1);

      case 'unary': {
        const v = this.eval(expr.operand, frame, env);
        const r = unaryOp(expr.op, v);
        if (!r) {
          this.fail('ClassCastException', `'${expr.op}' does not work on ${typeNameOf(v)}`);
        }
        return r;
      }

      case 'prefix': {
        const slot = this.lvalue(expr.operand, frame, env);
        const next = this.step1(slot.get(), expr.op, slot.type());
        slot.set(next);
        return next;
      }

      case 'postfix': {
        const slot = this.lvalue(expr.operand, frame, env);
        const before = slot.get();
        slot.set(this.step1(before, expr.op, slot.type()));
        return before;
      }

      case 'binary': {
        // Short-circuit before evaluating the right side, as Java does.
        if (expr.op === '&&') {
          const l = this.condition(expr.left, frame, env);
          if (!truth(l)) return jbool(false);
          return this.condition(expr.right, frame, env);
        }
        if (expr.op === '||') {
          const l = this.condition(expr.left, frame, env);
          if (truth(l)) return jbool(true);
          return this.condition(expr.right, frame, env);
        }
        const a = this.eval(expr.left, frame, env);
        const b = this.eval(expr.right, frame, env);
        let r: JValue | null;
        try {
          r = binaryOp(expr.op, a, b);
        } catch (e) {
          if (e instanceof ArithmeticDivideByZero) this.fail('ArithmeticException', '/ by zero');
          throw e;
        }
        if (!r) {
          this.fail(
            'ClassCastException',
            `'${expr.op}' does not work between ${typeNameOf(a)} and ${typeNameOf(b)}`,
          );
        }
        return r;
      }

      case 'assign': {
        const slot = this.lvalue(expr.target, frame, env);
        let value: JValue;
        if (expr.op === '=') {
          value = this.eval(expr.value, frame, env);
        } else {
          const op = expr.op.slice(0, -1);
          const current = slot.get();
          const rhs = this.eval(expr.value, frame, env);
          let r: JValue | null;
          try {
            r = binaryOp(op, current, rhs);
          } catch (e) {
            if (e instanceof ArithmeticDivideByZero) this.fail('ArithmeticException', '/ by zero');
            throw e;
          }
          if (!r) {
            this.fail(
              'ClassCastException',
              `'${expr.op}' does not work between ${typeNameOf(current)} and ${typeNameOf(rhs)}`,
            );
          }
          value = r;
        }
        // Compound assignment narrows implicitly in Java, so allow it explicitly.
        const target = slot.type();
        const coerced = coerce(value, target, true) ?? value;
        slot.set(coerced);
        return coerced;
      }

      case 'ternary':
        return truth(this.condition(expr.cond, frame, env))
          ? this.eval(expr.then, frame, env)
          : this.eval(expr.otherwise, frame, env);

      case 'cast': {
        const v = this.eval(expr.operand, frame, env);
        const t = typeKey(expr.type);
        const r = coerce(v, t, true);
        if (!r) this.fail('ClassCastException', `cannot turn ${typeNameOf(v)} into ${t}`);
        return r;
      }

      case 'instanceOf': {
        const v = this.eval(expr.operand, frame, env);
        return jbool(this.isInstance(v, expr.type.name));
      }

      case 'classLit':
        return this.instance('Class', { target: expr.type.name });
    }
  }

  private step1(v: JValue, op: '++' | '--', type: string): JValue {
    const delta = op === '++' ? 1 : -1;
    const r = binaryOp('+', v, jint(delta));
    if (!r) this.fail('ClassCastException', `'${op}' does not work on ${typeNameOf(v)}`);
    return coerce(r, type, true) ?? r;
  }

  private isInstance(v: JValue, name: string): boolean {
    const simple = name.split('.').pop() ?? name;
    if (v.k === 'string') return simple === 'String' || simple === 'Object';
    if (v.k === 'null') return false;
    if (v.k !== 'obj') return simple === 'Object';
    if (simple === 'Object') return true;
    let cur: ClassInfo | undefined = this.classes.get(v.ref.className);
    const seen = new Set<string>();
    while (cur && !seen.has(cur.name)) {
      if (cur.name === simple) return true;
      seen.add(cur.name);
      if ((cur.decl.interfaces ?? []).some((i) => i.name === simple)) return true;
      const sup: string | null = cur.superName;
      if (!sup) return false;
      const next = this.classes.get(sup);
      if (!next) return nativeExtends(sup, simple);
      cur = next;
    }
    return nativeExtends(v.ref.className, simple);
  }

  /* --------------------------------------------------------------- lvalues */

  private lvalue(
    expr: A.Expr,
    frame: Frame,
    env: Env,
  ): { get(): JValue; set(v: JValue): void; type(): string } {
    if (expr.t === 'name') {
      const slot = env.lookup(expr.name) ?? frame.env.lookup(expr.name);
      if (slot) {
        return { get: () => slot.value, set: (v) => void (slot.value = v), type: () => slot.type };
      }
      if (frame.thisObj && frame.thisObj.fields.has(expr.name)) {
        const obj = frame.thisObj;
        return {
          get: () => obj.fields.get(expr.name) ?? JNULL,
          set: (v) => obj.fields.set(expr.name, v),
          type: () => this.fieldType(obj.className, expr.name),
        };
      }
      const owner = this.staticOwner(frame.cls, expr.name);
      if (owner) {
        this.ensureStatics(owner);
        return {
          get: () => owner.statics.get(expr.name) ?? JNULL,
          set: (v) => owner.statics.set(expr.name, v),
          type: () => this.fieldType(owner.name, expr.name),
        };
      }
      this.fail('NoSuchFieldError', `cannot find a variable called ${expr.name}`);
    }

    if (expr.t === 'field') {
      // A static field on a class name, e.g. Config.speed = 0.5.
      if (expr.target.t === 'name') {
        const cls = this.classes.get(expr.target.name);
        if (cls && !env.lookup(expr.target.name)) {
          this.ensureStatics(cls);
          return {
            get: () => cls.statics.get(expr.name) ?? JNULL,
            set: (v) => cls.statics.set(expr.name, v),
            type: () => this.fieldType(cls.name, expr.name),
          };
        }
      }
      const target = this.eval(expr.target, frame, env);
      if (target.k === 'null') {
        this.fail('NullPointerException', `${describeTarget(expr.target)} has not been set up yet`);
      }
      if (target.k !== 'obj') {
        this.fail('NoSuchFieldError', `${typeNameOf(target)} has no field called ${expr.name}`);
      }
      const obj = target.ref;
      const nf = this.findNativeFieldFor(obj.className, expr.name);
      if (nf) {
        return {
          get: () => nf.get(this, obj),
          set: (v) => {
            if (nf.set) nf.set(this, obj, v);
            else this.fail('IllegalAccessError', `${obj.className}.${expr.name} is read-only`);
          },
          type: () => nf.type,
        };
      }
      if (!obj.fields.has(expr.name)) {
        this.fail('NoSuchFieldError', `${obj.className} has no field called ${expr.name}`);
      }
      return {
        get: () => obj.fields.get(expr.name) ?? JNULL,
        set: (v) => obj.fields.set(expr.name, v),
        type: () => this.fieldType(obj.className, expr.name),
      };
    }

    if (expr.t === 'index') {
      const arr = this.eval(expr.target, frame, env);
      const idx = Math.trunc(num(this.eval(expr.index, frame, env)));
      return this.arraySlot(arr, idx);
    }

    this.fail('IllegalArgumentException', 'the left side of = has to be a variable, a field or an array slot');
  }

  private arraySlot(arr: JValue, idx: number): { get(): JValue; set(v: JValue): void; type(): string } {
    if (arr.k === 'null') this.fail('NullPointerException', 'this array has not been created yet');
    if (arr.k !== 'array') this.fail('ClassCastException', `${typeNameOf(arr)} is not an array`);
    const a: JArray = arr.ref;
    if (idx < 0 || idx >= a.items.length) {
      this.fail(
        'ArrayIndexOutOfBoundsException',
        `Index ${idx} out of bounds for length ${a.items.length}`,
      );
    }
    return {
      get: () => a.items[idx]!,
      set: (v) => {
        a.items[idx] = coerce(v, a.elemType, true) ?? v;
      },
      type: () => a.elemType,
    };
  }

  private fieldType(className: string, field: string): string {
    const nativeFirst = this.findNativeFieldFor(className, field);
    if (nativeFirst && findNativeClass(className)) return nativeFirst.type;
    let cur: ClassInfo | undefined = this.classes.get(className);
    const seen = new Set<string>();
    while (cur && !seen.has(cur.name)) {
      seen.add(cur.name);
      const f = cur.decl.fields.find((x) => x.name === field);
      if (f) return typeKey(f.type);
      cur = cur.superName ? this.classes.get(cur.superName) : undefined;
    }
    return this.findNativeFieldFor(className, field)?.type ?? '';
  }

  private staticOwner(cls: ClassInfo | null, name: string): ClassInfo | undefined {
    let cur: ClassInfo | undefined = cls ?? undefined;
    const seen = new Set<string>();
    while (cur && !seen.has(cur.name)) {
      seen.add(cur.name);
      if (cur.decl.fields.some((f) => f.name === name && f.modifiers.includes('static'))) return cur;
      if (cur.decl.kind === 'enum' && cur.enumOrder.includes(name)) return cur;
      cur = cur.superName ? this.classes.get(cur.superName) : undefined;
    }
    return undefined;
  }

  private findNativeFieldFor(className: string, field: string): NativeField | undefined {
    const native = findNativeClass(className);
    if (!native) return undefined;
    return nativeFields(native).find((f) => f.name === field);
  }

  /* ----------------------------------------------------------------- names */

  private readName(expr: A.NameExpr, frame: Frame, env: Env): JValue {
    const slot = env.lookup(expr.name) ?? frame.env.lookup(expr.name);
    if (slot) return slot.value;

    if (frame.thisObj) {
      if (frame.thisObj.fields.has(expr.name)) return frame.thisObj.fields.get(expr.name)!;
      const nf = this.findNativeFieldFor(frame.thisObj.className, expr.name);
      if (nf) return nf.get(this, frame.thisObj);
      // Inherited native fields, e.g. hardwareMap inside a kid's OpMode.
      const inherited = this.inheritedNativeField(frame.cls, expr.name);
      if (inherited) return inherited.get(this, frame.thisObj);
    }

    const owner = this.staticOwner(frame.cls, expr.name);
    if (owner) {
      this.ensureStatics(owner);
      return owner.statics.get(expr.name) ?? JNULL;
    }

    this.fail('NoSuchFieldError', `cannot find a variable called ${expr.name}`);
  }

  /** Walks a user class's superclass chain into the mocked SDK to find a field. */
  private inheritedNativeField(cls: ClassInfo | null, name: string): NativeField | undefined {
    let cur: ClassInfo | undefined = cls ?? undefined;
    const seen = new Set<string>();
    while (cur && !seen.has(cur.name)) {
      seen.add(cur.name);
      const sup: string | null = cur.superName;
      if (!sup) return undefined;
      const userSuper = this.classes.get(sup);
      if (userSuper) {
        cur = userSuper;
        continue;
      }
      const native = findNativeClass(sup);
      return native ? nativeFields(native).find((f) => f.name === name) : undefined;
    }
    return undefined;
  }

  private readField(expr: A.FieldAccess, frame: Frame, env: Env): JValue {
    // Array length.
    const maybeArray = expr.name === 'length' ? this.tryEval(expr.target, frame, env) : null;
    if (maybeArray && maybeArray.k === 'array') return jint(maybeArray.ref.items.length);

    // A static field or enum constant reached through a class name.
    if (expr.target.t === 'name' && !env.lookup(expr.target.name) && !frame.env.lookup(expr.target.name)) {
      const user = this.classes.get(expr.target.name);
      if (user) {
        this.ensureStatics(user);
        const v = user.statics.get(expr.name);
        if (v) return v;
      }
      const native = findNativeClass(expr.target.name);
      if (native) {
        if (native.enumConstants?.includes(expr.name)) return this.enumValue(native.simple, expr.name);
        const f = nativeFields(native).find((x) => x.name === expr.name && x.isStatic);
        if (f) return f.get(this, null);
      }
    }

    // A nested name like DcMotor.RunMode.RUN_TO_POSITION arrives as field(field(name)).
    const dotted = flattenDotted(expr);
    if (dotted) {
      const owner = dotted.slice(0, -1).join('.');
      const member = dotted[dotted.length - 1]!;
      const native = findNativeClass(owner);
      if (native) {
        if (native.enumConstants?.includes(member)) return this.enumValue(native.simple, member);
        const f = nativeFields(native).find((x) => x.name === member && x.isStatic);
        if (f) return f.get(this, null);
      }
      const user = this.classes.get(owner.split('.').pop() ?? owner);
      if (user) {
        this.ensureStatics(user);
        const v = user.statics.get(member);
        if (v) return v;
      }
    }

    const target = this.eval(expr.target, frame, env);
    if (target.k === 'null') {
      this.fail('NullPointerException', `${describeTarget(expr.target)} has not been set up yet`);
    }
    if (target.k === 'array' && expr.name === 'length') return jint(target.ref.items.length);
    if (target.k !== 'obj') {
      this.fail('NoSuchFieldError', `${typeNameOf(target)} has no field called ${expr.name}`);
    }
    const obj = target.ref;
    if (obj.fields.has(expr.name)) return obj.fields.get(expr.name)!;
    const nf = this.findNativeFieldFor(obj.className, expr.name);
    if (nf) return nf.get(this, obj);
    this.fail('NoSuchFieldError', `${obj.className} has no field called ${expr.name}`);
  }

  /** Evaluate without reporting a failure, for the array-length probe. */
  private tryEval(expr: A.Expr, frame: Frame, env: Env): JValue | null {
    const depth = this.frames.length;
    try {
      return this.eval(expr, frame, env);
    } catch {
      this.frames.length = depth;
      return null;
    }
  }

  /* ----------------------------------------------------------------- calls */

  private evalCall(expr: A.CallExpr, frame: Frame, env: Env): JValue {
    const args = expr.args.map((a) => this.eval(a, frame, env));
    frame.line = expr.line;

    // Unqualified: this class, its superclasses, then the mocked SDK it inherits from.
    if (!expr.target) {
      if (expr.name === 'this' || expr.name === 'super') return JVOID;

      if (frame.cls) {
        const cands = this.userMethodCandidates(frame.cls, expr.name).filter((c) => c.decl.body);
        const chosen = pickOverload(
          cands.map((c) => ({
            params: c.decl.params.map((p) => typeKey(p.type)),
            varargs: hasVarargs(c.decl),
            decl: c,
          })),
          args,
        );
        if (chosen) {
          const self: JValue = frame.thisObj ? { k: 'obj', ref: frame.thisObj } : JNULL;
          return this.invokeDeclared(self, chosen.decl.cls, chosen.decl.decl, args, expr.name);
        }
      }

      const inherited = this.inheritedNativeMethod(frame.cls, expr.name, args);
      if (inherited) return this.callNative(inherited, frame.thisObj, args);

      this.fail('NoSuchMethodError', `cannot find a method called ${expr.name}`);
    }

    // Static call through a class name: Math.abs, Integer.parseInt, String.format.
    if (expr.target.t === 'name' && !env.lookup(expr.target.name) && !frame.env.lookup(expr.target.name)) {
      const user = this.classes.get(expr.target.name);
      if (user) {
        const statics = this.userMethodCandidates(user, expr.name).filter(
          (c) => c.decl.body && c.decl.modifiers.includes('static'),
        );
        const chosen = pickOverload(
          statics.map((c) => ({
            params: c.decl.params.map((p) => typeKey(p.type)),
            varargs: hasVarargs(c.decl),
            decl: c,
          })),
          args,
        );
        if (chosen) return this.invokeDeclared(JNULL, chosen.decl.cls, chosen.decl.decl, args, expr.name);
        if (user.decl.kind === 'enum') {
          const special = this.enumStatic(user, expr.name, args);
          if (special) return special;
        }
      }
      const native = findNativeClass(expr.target.name);
      if (native) {
        const m = pickNative(nativeMethods(native), expr.name, args, true);
        if (m) return this.callNative(m, null, args);
      }
    }

    const target = this.eval(expr.target, frame, env);

    if (target.k === 'null') {
      this.fail('NullPointerException', `${describeTarget(expr.target)} has not been set up yet`);
    }

    // String instance methods.
    if (target.k === 'string') {
      const overloads = STRING_METHODS[expr.name];
      if (overloads) {
        const chosen = pickOverload(
          overloads.map((o) => ({ params: o.params, varargs: o.varargs ?? false, decl: o })),
          args,
        );
        if (chosen) return chosen.decl.call(this, target.v, args);
      }
      this.fail('NoSuchMethodError', `String has no method called ${expr.name}`);
    }

    if (target.k !== 'obj') {
      this.fail('NoSuchMethodError', `${typeNameOf(target)} has no method called ${expr.name}`);
    }

    const obj = target.ref;

    // A user class instance. An SDK object is never one, even when a kid has a class
    // of the same name.
    const userCls = obj.isNative ? undefined : this.classes.get(obj.className);
    if (userCls) {
      const cands = this.userMethodCandidates(userCls, expr.name).filter((c) => c.decl.body);
      const chosen = pickOverload(
        cands.map((c) => ({
          params: c.decl.params.map((p) => typeKey(p.type)),
          varargs: hasVarargs(c.decl),
          decl: c,
        })),
        args,
      );
      if (chosen) return this.invokeDeclared(target, chosen.decl.cls, chosen.decl.decl, args, expr.name);
      if (obj.enumName !== undefined) {
        const e = this.enumInstanceMethod(obj, expr.name);
        if (e) return e;
      }
      const inherited = this.inheritedNativeMethod(userCls, expr.name, args);
      if (inherited) return this.callNative(inherited, obj, args);
      this.fail('NoSuchMethodError', `${obj.className} has no method called ${expr.name}`);
    }

    // A mocked SDK instance.
    const native = findNativeClass(obj.className);
    if (native) {
      const m = pickNative(nativeMethods(native), expr.name, args);
      if (m) return this.callNative(m, obj, args);
      if (obj.enumName !== undefined) {
        const e = this.enumInstanceMethod(obj, expr.name);
        if (e) return e;
      }
    }
    if (obj.enumName !== undefined) {
      const e = this.enumInstanceMethod(obj, expr.name);
      if (e) return e;
    }
    this.fail('NoSuchMethodError', `${obj.className} has no method called ${expr.name}`);
  }

  private callNative(m: NativeMethod, self: JObject | null, args: JValue[]): JValue {
    const result = m.call(this, self, args);
    if (m.tick) this.tick();
    return result;
  }

  private inheritedNativeMethod(cls: ClassInfo | null, name: string, args: JValue[]): NativeMethod | undefined {
    let cur: ClassInfo | undefined = cls ?? undefined;
    const seen = new Set<string>();
    while (cur && !seen.has(cur.name)) {
      seen.add(cur.name);
      const sup: string | null = cur.superName;
      if (!sup) return undefined;
      const userSuper = this.classes.get(sup);
      if (userSuper) {
        cur = userSuper;
        continue;
      }
      const native = findNativeClass(sup);
      if (!native) return undefined;
      return pickNative(nativeMethods(native), name, args);
    }
    return undefined;
  }

  private enumStatic(cls: ClassInfo, name: string, args: JValue[]): JValue | null {
    this.ensureStatics(cls);
    if (name === 'values') {
      return {
        k: 'array',
        ref: { elemType: cls.name, items: cls.enumOrder.map((n) => cls.enumValues.get(n)!) },
      };
    }
    if (name === 'valueOf' && args[0]?.k === 'string') {
      const v = cls.enumValues.get(args[0].v);
      if (!v) this.fail('IllegalArgumentException', `No enum constant ${cls.name}.${args[0].v}`);
      return v;
    }
    return null;
  }

  private enumInstanceMethod(obj: JObject, name: string): JValue | null {
    if (name === 'name' || name === 'toString') return jstring(obj.enumName ?? '');
    if (name === 'ordinal') return jint(obj.enumOrdinal ?? 0);
    return null;
  }

  /* ---------------------------------------------------------------- arrays */

  private makeArray(elemType: string, sizes: number[], extraDims: number): JValue {
    const [first, ...rest] = sizes;
    const n = first ?? 0;
    if (n < 0) this.fail('NegativeArraySizeException', String(n));
    const innerType = elemType + '[]'.repeat(rest.length + extraDims);
    const items: JValue[] = [];
    for (let i = 0; i < n; i++) {
      items.push(rest.length ? this.makeArray(elemType, rest, extraDims) : defaultValue(innerType));
    }
    return { k: 'array', ref: { elemType: innerType, items } };
  }

  private buildArray(
    type: A.TypeRef,
    init: A.ArrayInitExpr,
    frame: Frame,
    env: Env,
    dims: number,
  ): JValue {
    const elemType = typeKey(type) + '[]'.repeat(Math.max(0, dims - 1));
    const items = init.items.map((item) =>
      item.t === 'arrayInit'
        ? this.buildArray(type, item, frame, env, dims - 1)
        : this.coerceOrFail(this.eval(item, frame, env), elemType, item),
    );
    return { k: 'array', ref: { elemType, items } };
  }

  /* ----------------------------------------------------------------- types */

  private coerceOrFail(value: JValue, type: string, at: { line: number }): JValue {
    if (!type || type === 'var' || type === 'Object' || type === 'void') return value;
    const r = coerce(value, type);
    if (r) return r;
    throw new CompileFailure([
      diag(
        'incompatible.types',
        `incompatible types: ${typeNameOf(value)} cannot be converted to ${type}`,
        { line: at.line, column: 1, length: 1 },
        { found: typeNameOf(value), expected: type },
      ),
    ]);
  }
}

/* -------------------------------------------------------------- utilities */

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** The type key used for coercion: the declared name plus array brackets. */
export function typeKey(t: A.TypeRef): string {
  const base = PRIMITIVE_TYPES.has(t.name) ? t.name : (t.name.split('.').pop() ?? t.name);
  return base + '[]'.repeat(t.dims);
}

function hasVarargs(m: A.MethodDecl): boolean {
  return m.params.some((p) => p.varargs);
}

function bindParams(
  decl: A.MethodDecl,
  args: JValue[],
  env: Env,
  fit: (v: JValue, t: string) => JValue,
): void {
  decl.params.forEach((p, i) => {
    const t = typeKey(p.type);
    if (p.varargs) {
      const rest = args.slice(i);
      env.declare(p.name, t, { k: 'array', ref: { elemType: t.replace(/\[\]$/, ''), items: rest } });
      return;
    }
    const given = args[i];
    env.declare(p.name, t, given === undefined ? defaultValue(t) : fit(given, t));
  });
}

interface Overload<T> {
  params: string[];
  varargs: boolean;
  decl: T;
}

/** Arity first, then how well the argument types fit. Good enough for the subset,
    and it never silently picks a wildly wrong overload. */
function pickOverload<T>(candidates: Overload<T>[], args: JValue[]): Overload<T> | null {
  const viable = candidates.filter(
    (c) => (c.varargs ? args.length >= c.params.length - 1 : c.params.length === args.length),
  );
  if (!viable.length) return null;
  if (viable.length === 1) return viable[0]!;
  let best = viable[0]!;
  let bestScore = -1;
  for (const c of viable) {
    let score = 0;
    for (let i = 0; i < Math.min(args.length, c.params.length); i++) {
      score += fitScore(c.params[i]!, args[i]!);
    }
    if (!c.varargs) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

/** Name first, then arity, then argument fit. The name argument is mandatory because
    omitting it silently resolved `telemetry.update()` to `addLine()` and
    `Math.round(x)` to `Math.abs(x)` — every arity-0 method on a class looked viable. */
function pickNative(
  methods: NativeMethod[],
  name: string,
  args: JValue[],
  onlyStatic = false,
): NativeMethod | undefined {
  const named = methods.filter((m) => m.name === name && (!onlyStatic || m.isStatic));
  const chosen = pickOverload(
    named.map((m) => ({ params: m.params, varargs: m.varargs ?? false, decl: m })),
    args,
  );
  return chosen?.decl;
}

function fitScore(param: string, arg: JValue): number {
  const exact: Record<string, JValue['k']> = {
    int: 'int', long: 'long', double: 'double', float: 'float',
    boolean: 'boolean', char: 'char', String: 'string',
  };
  if (exact[param] === arg.k) return 3;
  if (param === 'Object') return 1;
  if (['int', 'long', 'double', 'float', 'char', 'short', 'byte'].includes(param)) {
    return ['int', 'long', 'double', 'float', 'char'].includes(arg.k) ? 2 : 0;
  }
  if (arg.k === 'obj' && (arg.ref.className === param || param.endsWith(arg.ref.className))) return 3;
  if (arg.k === 'obj') return 1;
  if (arg.k === 'null') return 1;
  return 0;
}

function flattenDotted(expr: A.Expr): string[] | null {
  const parts: string[] = [];
  let cur: A.Expr = expr;
  for (;;) {
    if (cur.t === 'field') {
      parts.unshift(cur.name);
      cur = cur.target;
      continue;
    }
    if (cur.t === 'name') {
      parts.unshift(cur.name);
      return parts.length > 1 ? parts : null;
    }
    return null;
  }
}

/** Names the thing that was null, so the message can say which device is missing. */
function describeTarget(expr: A.Expr): string {
  if (expr.t === 'name') return `'${expr.name}'`;
  if (expr.t === 'field') return `'${expr.name}'`;
  if (expr.t === 'call') return `the result of ${expr.name}()`;
  return 'this value';
}
