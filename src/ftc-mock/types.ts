import type { JValue, JObject } from '../runtime/java/values';
import type { Simulation } from '../sim/simulation';

/* The mocked FTC SDK. Package names and method signatures are the real ones, from
   ftc-docs.firstinspires.org and the FtcRobotController repo, so a kid's file pastes
   into Android Studio unchanged.

   Declaration and implementation live in the same object on purpose: that is what makes
   "one signature table, three consumers" true rather than aspirational. The interpreter
   registers from these objects, scripts/gen-stubs.mjs generates ftc-stubs/*.java from
   them for the real javac gate, and scripts/gen-coverage.mjs generates
   docs/FTC_MOCK_COVERAGE.md from them. There is nowhere to add a method that the
   coverage doc would not immediately show. */

export interface MockContext {
  readonly sim: Simulation;
  /** Advances the sim clock. Backs LinearOpMode.sleep(long). */
  sleep(ms: number): void;
  opModeIsActive(): boolean;
  isStopRequested(): boolean;
  opModeInInit(): boolean;
  waitForStart(): void;
  /** Builds an instance of a mocked class, for factory methods like hardwareMap.get. */
  instance(className: string, native?: unknown): JValue;
  /** Looks up an enum constant, e.g. enumValue('DistanceUnit', 'CM'). */
  enumValue(className: string, constant: string): JValue;
  /** The per-run singletons an OpMode subclass inherits as fields: hardwareMap,
      telemetry, gamepad1, gamepad2. Identity is stable for the whole run. */
  builtin(name: 'hardwareMap' | 'telemetry' | 'gamepad1' | 'gamepad2'): JValue;
  /** Seeded, so Math.random() cannot make a lesson's tests flaky. */
  random(): number;
  /** The single System.out instance. */
  builtinSystemOut(): JValue;
  /** Throws a Java exception from native code. */
  fail(exceptionClass: string, message: string): never;
}

export type NativeCall = (ctx: MockContext, self: JObject | null, args: JValue[]) => JValue;

export interface NativeMethod {
  name: string;
  /** Declared parameter types, as they appear in Java source. */
  params: string[];
  returns: string;
  isStatic?: boolean;
  /** The last parameter is a varargs tail, e.g. Telemetry.addData(String, String, Object...). */
  varargs?: boolean;
  /** Overrides the generated Java signature in ftc-stubs/, for the few methods whose
      real declaration needs generics that the interpreter does not model —
      HardwareMap.get being the one that matters. Body excluded. */
  stub?: string;
  /** Calling this advances the sim one 20 ms tick.

      Set on the methods real FTC code polls in a loop condition — opModeIsActive(),
      isBusy(), a sensor read, ElapsedTime.seconds(). Tying the clock to these calls
      rather than to every loop iteration is what makes
      `while (opModeIsActive()) { ... }` run at the right rate while a Tier 1
      counting loop costs no robot time at all. A loop that polls nothing cannot
      advance the clock, so it is caught by the step budget instead. */
  tick?: boolean;
  call: NativeCall;
}

export interface NativeField {
  name: string;
  type: string;
  isStatic?: boolean;
  get(ctx: MockContext, self: JObject | null): JValue;
  set?(ctx: MockContext, self: JObject | null, value: JValue): void;
}

export interface NativeConstructor {
  params: string[];
  varargs?: boolean;
  /** Returns the backing object stored on JObject.native. */
  build(ctx: MockContext, args: JValue[]): unknown;
}

export type NativeKind = 'class' | 'interface' | 'enum' | 'annotation';

export interface NativeClass {
  /** Fully qualified, e.g. com.qualcomm.robotcore.hardware.DcMotor. */
  fqn: string;
  simple: string;
  kind: NativeKind;
  /** Simple name of the superclass or super-interface. */
  extends?: string;
  implements?: string[];
  /** In ordinal order. */
  enumConstants?: string[];
  fields?: NativeField[];
  methods?: NativeMethod[];
  constructors?: NativeConstructor[];
  /** Permitted annotation elements, e.g. ['name', 'group'] for @TeleOp. */
  annotationElements?: string[];
  /** Methods kid code is expected to override, used by the "no main method" check. */
  overridable?: string[];
  /** One line for docs/FTC_MOCK_COVERAGE.md. */
  doc?: string;
}

/** Narrows a JObject's backing store. */
export function nativeOf<T>(self: JObject | null, ctx: MockContext, what: string): T {
  if (!self || self.native === undefined) {
    ctx.fail('NullPointerException', `${what} has not been set up yet`);
  }
  return self.native as T;
}

export interface DeviceBinding {
  name: string;
}
