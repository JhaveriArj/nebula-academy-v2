import { parse } from './java/parser';
import { runJava, type RunResult } from './java/interpreter';
import { Simulation, normalizeDeg, type GamepadState, type RobotPose, type RobotKind } from '../sim/simulation';
import { translateDiagnostic, translateLimit, translateThrow, type FriendlyError } from './errorTranslator';
import type * as A from './java/ast';

/* The check types a lesson's tests.json may use. Every one of them answers a question a
   kid can see the answer to on the field or in the console, which is the point: a failing
   check has to say what the robot did, not that an assertion returned false. */

export type Check =
  | { type: 'outputContains'; text: string; times?: number; label?: string }
  | { type: 'outputMatches'; pattern: string; flags?: string; label?: string }
  | { type: 'robotMovedAtLeastCm'; cm: number; label?: string }
  | { type: 'robotWithinCmOf'; x: number; y: number; tolerance: number; label?: string }
  | { type: 'robotHeadingWithin'; degrees: number; tolerance: number; relative?: boolean; label?: string }
  | { type: 'motorPowerEverExceeded'; motor: string; power: number; label?: string }
  | { type: 'servoReached'; servo: string; position: number; tolerance?: number; label?: string }
  | { type: 'telemetryHasKey'; key: string; label?: string }
  | { type: 'methodExists'; name: string; params?: number; className?: string; label?: string }
  | { type: 'classExists'; name: string; extends?: string; label?: string }
  | { type: 'noForbiddenCalls'; calls: string[]; label?: string }
  | { type: 'ranUnder'; ms: number; label?: string };

export type CheckType = Check['type'];

/** One timed change to the controller, so a TeleOp can be tested without a human. */
export interface InputEvent {
  atMs: number;
  set: Partial<GamepadState>;
}

export interface TestSpec {
  robot?: RobotKind;
  start?: RobotPose;
  /** How long to run a TeleOp's loop(). Ignored for a LinearOpMode. */
  teleOpForMs?: number;
  maxSimMs?: number;
  withElements?: boolean;
  input?: InputEvent[];
  checks: Check[];
}

export interface CheckResult {
  label: string;
  passed: boolean;
  /** What actually happened, in the kid's terms. */
  detail: string;
  type: CheckType;
}

export interface TestRunResult {
  /** False when the program did not compile, so no check could run. */
  compiled: boolean;
  /** The one thing to show when something went wrong before the checks. */
  error: FriendlyError | null;
  results: CheckResult[];
  passed: boolean;
  sim: Simulation;
  run: RunResult;
}

export function buildSim(spec: TestSpec): Simulation {
  return new Simulation({
    robot: spec.robot ?? 'mecanum',
    ...(spec.start ? { start: spec.start } : {}),
    ...(spec.withElements === false ? { withElements: false } : {}),
  });
}

/** Applies a lesson's scripted controller input as the sim reaches each time. */
export function scriptedInput(spec: TestSpec): (s: Simulation) => void {
  const input = [...(spec.input ?? [])].sort((a, b) => a.atMs - b.atMs);
  let next = 0;
  return (s) => {
    while (next < input.length && input[next]!.atMs <= s.timeMs) {
      Object.assign(s.gamepad1, input[next]!.set);
      next++;
    }
  };
}

/** What went wrong with a Run or a Check, in the order a kid should hear it: a compile error,
    then a crash, then a loop that never ended. Null when the program ran to its end. (A live
    TeleOp ending on sim time is a normal end, so lesson.ts keeps its own short version.) */
export function firstProblem(run: RunResult, sim: Simulation, source: string): FriendlyError | null {
  const firstError = run.diagnostics.find((d) => d.severity === 'error');
  if (firstError) return translateDiagnostic(firstError, source);
  if (run.thrown) return translateThrow(run.thrown, source);
  if (run.stopReason === 'steps' || run.stopReason === 'time' || run.stopReason === 'simTime') {
    return translateLimit(run.stopReason, sim.timeMs, run.stopLine);
  }
  return null;
}

export function runLessonTests(source: string, spec: TestSpec): TestRunResult {
  const sim = buildSim(spec);
  const run = runJava(source, {
    sim,
    ...(spec.teleOpForMs !== undefined ? { teleOpForMs: spec.teleOpForMs } : {}),
    ...(spec.maxSimMs !== undefined ? { maxSimMs: spec.maxSimMs } : {}),
    onTick: scriptedInput(spec),
  });

  // A compile error, a crash or a loop that never ends: the checks cannot say anything useful.
  const error = firstProblem(run, sim, source);
  if (error) {
    const compiled = !run.diagnostics.some((d) => d.severity === 'error');
    return { compiled, error, results: [], passed: false, sim, run };
  }

  const ast = parse(source).unit;
  const results = spec.checks.map((c) => evaluate(c, sim, ast, source));
  return {
    compiled: true,
    error: null,
    results,
    passed: results.every((r) => r.passed),
    sim,
    run,
  };
}

/* ------------------------------------------------------------ the checks */

function evaluate(
  check: Check,
  sim: Simulation,
  ast: A.CompilationUnit,
  source: string,
): CheckResult {
  const ok = (label: string, passed: boolean, detail: string): CheckResult => ({
    label: check.label ?? label,
    passed,
    detail,
    type: check.type,
  });

  switch (check.type) {
    case 'outputContains': {
      const text = sim.outputText();
      const times = check.times ?? 1;
      const found = countOccurrences(text, check.text);
      return ok(
        times > 1 ? `Prints "${check.text}" ${times} times` : `Prints "${check.text}"`,
        found >= times,
        found === 0
          ? `Nothing printed matched "${check.text}".`
          : `Found it ${found} time${found === 1 ? '' : 's'}${times > 1 ? `, and ${times} were needed` : ''}.`,
      );
    }

    case 'outputMatches': {
      const re = new RegExp(check.pattern, check.flags ?? '');
      const text = sim.outputText();
      return ok(
        `The console matches ${check.pattern}`,
        re.test(text),
        text.trim() ? `The console said: ${firstLines(text)}` : 'The console was empty.',
      );
    }

    case 'robotMovedAtLeastCm':
      return ok(
        `The robot drives at least ${check.cm} cm`,
        sim.distanceTravelledCm >= check.cm,
        `It travelled ${sim.distanceTravelledCm.toFixed(1)} cm.`,
      );

    case 'robotWithinCmOf': {
      const d = Math.hypot(sim.pose.x - check.x, sim.pose.y - check.y);
      return ok(
        `The robot finishes within ${check.tolerance} cm of the target spot`,
        d <= check.tolerance,
        `It finished ${d.toFixed(1)} cm away, at x=${sim.pose.x.toFixed(0)}, y=${sim.pose.y.toFixed(0)}.`,
      );
    }

    case 'robotHeadingWithin': {
      const actual = check.relative ? sim.headingChangeDeg : sim.pose.headingDeg;
      const off = Math.abs(normalizeDeg(actual - check.degrees));
      return ok(
        check.relative
          ? `The robot turns ${check.degrees} degrees`
          : `The robot ends up facing ${check.degrees} degrees`,
        off <= check.tolerance,
        `It ${check.relative ? 'turned' : 'is facing'} ${actual.toFixed(1)} degrees, which is ${off.toFixed(1)} off.`,
      );
    }

    case 'motorPowerEverExceeded': {
      const m = sim.motor(check.motor);
      return ok(
        `${check.motor} is given more than ${check.power} power`,
        (m?.peakAbsPower ?? 0) > check.power,
        m
          ? `The most it was ever given was ${m.peakAbsPower.toFixed(2)}.`
          : `This robot has no motor called ${check.motor}.`,
      );
    }

    case 'servoReached': {
      const s = sim.servo(check.servo);
      const tol = check.tolerance ?? 0.05;
      const reached = s ? Math.abs(s.position - check.position) <= tol : false;
      return ok(
        `${check.servo} reaches ${check.position}`,
        reached,
        s ? `It ended at ${s.position.toFixed(2)}.` : `This robot has no servo called ${check.servo}.`,
      );
    }

    case 'telemetryHasKey':
      return ok(
        `Telemetry shows "${check.key}"`,
        sim.telemetryKeysSeen.has(check.key),
        sim.telemetryKeysSeen.size
          ? `Telemetry showed: ${[...sim.telemetryKeysSeen].join(', ')}.`
          : 'Telemetry never showed anything. Remember telemetry.update().',
      );

    case 'methodExists': {
      const classes = allTypes(ast).filter((t) => !check.className || t.name === check.className);
      const hit = classes
        .flatMap((t) => t.methods)
        .find((m) => m.name === check.name && (check.params === undefined || m.params.length === check.params));
      return ok(
        `There is a method called ${check.name}`,
        hit !== undefined,
        hit
          ? `Found ${check.name} with ${hit.params.length} parameter${hit.params.length === 1 ? '' : 's'}.`
          : check.params !== undefined
            ? `No method called ${check.name} that takes ${check.params} value${check.params === 1 ? '' : 's'}.`
            : `No method called ${check.name} yet.`,
      );
    }

    case 'classExists': {
      const hit = allTypes(ast).find((t) => t.name === check.name);
      const extendsOk = !check.extends || hit?.superclass?.name === check.extends;
      return ok(
        check.extends ? `There is a class ${check.name} that extends ${check.extends}` : `There is a class called ${check.name}`,
        hit !== undefined && extendsOk,
        hit
          ? extendsOk
            ? `Found class ${check.name}.`
            : `Class ${check.name} exists but extends ${hit.superclass?.name ?? 'nothing'}.`
          : `No class called ${check.name} yet.`,
      );
    }

    case 'noForbiddenCalls': {
      const used = check.calls.filter((c) => new RegExp(`\\b${escapeRegExp(c)}\\s*\\(`).test(source));
      return ok(
        `This one is solved without ${check.calls.join(' or ')}`,
        used.length === 0,
        used.length ? `This still uses ${used.join(' and ')}.` : 'None of those were used.',
      );
    }

    case 'ranUnder':
      return ok(
        `The whole run finishes in under ${(check.ms / 1000).toFixed(0)} seconds`,
        sim.timeMs < check.ms,
        `It took ${(sim.timeMs / 1000).toFixed(1)} seconds of robot time.`,
      );
  }

  return {
    label: 'Unknown check',
    passed: false,
    detail: `tests.json uses a check type this runner does not know: ${(check as { type: string }).type}`,
    type: (check as { type: CheckType }).type,
  };
}

/* ------------------------------------------------------------- utilities */

export function allTypes(unit: A.CompilationUnit): A.TypeDecl[] {
  const out: A.TypeDecl[] = [];
  const walk = (t: A.TypeDecl) => {
    out.push(t);
    t.nested.forEach(walk);
  };
  unit.types.forEach(walk);
  return out;
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    count++;
    i = haystack.indexOf(needle, i + needle.length);
  }
  return count;
}

const firstLines = (s: string, n = 3) =>
  s.trim().split('\n').slice(0, n).join(' / ') + (s.trim().split('\n').length > n ? ' ...' : '');

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Every check type this runner implements. tests/content.test.ts validates against it. */
export const CHECK_TYPES: CheckType[] = [
  'outputContains', 'outputMatches', 'robotMovedAtLeastCm', 'robotWithinCmOf',
  'robotHeadingWithin', 'motorPowerEverExceeded', 'servoReached', 'telemetryHasKey',
  'methodExists', 'classExists', 'noForbiddenCalls', 'ranUnder',
];
