import type { NativeClass, DeviceBinding, MockContext, NativeField } from './types';
import { nativeOf } from './types';
import type { JObject } from '../runtime/java/values';
import { cmTo } from './navigation';
import { jbool, jdouble, jfloat, jint, jstring, JVOID, num } from '../runtime/java/values';
import type { RunMode, ZeroPowerBehavior, GamepadState } from '../sim/simulation';

/* com.qualcomm.robotcore.hardware */

/** The configuration name this device object is bound to. */
const dev = (self: JObject | null, ctx: MockContext): string =>
  nativeOf<DeviceBinding>(self, ctx, 'This device').name;

export const DIRECTION: NativeClass = {
  fqn: 'com.qualcomm.robotcore.hardware.DcMotorSimple.Direction',
  simple: 'DcMotorSimple.Direction',
  kind: 'enum',
  enumConstants: ['FORWARD', 'REVERSE'],
  doc: 'Motor direction. Reachable as DcMotor.Direction too, as in the real SDK.',
};

export const RUN_MODE: NativeClass = {
  fqn: 'com.qualcomm.robotcore.hardware.DcMotor.RunMode',
  simple: 'DcMotor.RunMode',
  kind: 'enum',
  enumConstants: ['RUN_WITHOUT_ENCODER', 'RUN_USING_ENCODER', 'RUN_TO_POSITION', 'STOP_AND_RESET_ENCODER'],
  doc: 'How a motor interprets setPower: raw, velocity-controlled, or driving to a target.',
};

export const ZERO_POWER: NativeClass = {
  fqn: 'com.qualcomm.robotcore.hardware.DcMotor.ZeroPowerBehavior',
  simple: 'DcMotor.ZeroPowerBehavior',
  kind: 'enum',
  enumConstants: ['UNKNOWN', 'BRAKE', 'FLOAT'],
  doc: 'Whether a motor holds position or coasts when told to stop.',
};

export const SERVO_DIRECTION: NativeClass = {
  fqn: 'com.qualcomm.robotcore.hardware.Servo.Direction',
  simple: 'Servo.Direction',
  kind: 'enum',
  enumConstants: ['FORWARD', 'REVERSE'],
  doc: 'Servo direction.',
};

/** The real SDK declares power and direction here, and Direction is nested in it.
    `DcMotor.Direction.REVERSE` only compiles because DcMotor inherits from this. */
export const DC_MOTOR_SIMPLE: NativeClass = {
  fqn: 'com.qualcomm.robotcore.hardware.DcMotorSimple',
  simple: 'DcMotorSimple',
  kind: 'interface',
  doc: 'The shared parent of DcMotor and CRServo: power and direction.',
  methods: [
    {
      name: 'setPower',
      params: ['double'],
      returns: 'void',
      call: (ctx, self, args) => {
        const name = dev(self, ctx);
        if (ctx.sim.servo(name) && !ctx.sim.motor(name)) ctx.sim.setCRServoPower(name, num(args[0]!));
        else ctx.sim.setMotorPower(name, num(args[0]!));
        return JVOID;
      },
    },
    {
      name: 'getPower',
      params: [],
      returns: 'double',
      call: (ctx, self) => {
        const name = dev(self, ctx);
        return jdouble(ctx.sim.motor(name)?.power ?? ctx.sim.servo(name)?.continuousPower ?? 0);
      },
    },
    {
      name: 'setDirection',
      params: ['DcMotorSimple.Direction'],
      returns: 'void',
      call: (ctx, self, args) => {
        const m = ctx.sim.motor(dev(self, ctx));
        const d = args[0];
        if (m) m.reversed = d?.k === 'obj' && d.ref.enumName === 'REVERSE';
        return JVOID;
      },
    },
    {
      name: 'getDirection',
      params: [],
      returns: 'DcMotorSimple.Direction',
      call: (ctx, self) =>
        ctx.enumValue('DcMotorSimple.Direction', ctx.sim.motor(dev(self, ctx))?.reversed ? 'REVERSE' : 'FORWARD'),
    },
  ],
};

export const DC_MOTOR: NativeClass = {
  fqn: 'com.qualcomm.robotcore.hardware.DcMotor',
  simple: 'DcMotor',
  kind: 'interface',
  extends: 'DcMotorSimple',
  doc: 'A drive or mechanism motor. The core device of every lesson from Tier 0. `getDeviceName()` returns a description of the device type (`"Motor"`), as the real SDK does, not the configured name.',
  methods: [
    {
      name: 'setMode',
      params: ['DcMotor.RunMode'],
      returns: 'void',
      call: (ctx, self, args) => {
        const d = args[0];
        const mode = (d?.k === 'obj' ? d.ref.enumName : 'RUN_WITHOUT_ENCODER') as RunMode;
        ctx.sim.setMotorMode(dev(self, ctx), mode);
        return JVOID;
      },
    },
    {
      name: 'getMode',
      params: [],
      returns: 'DcMotor.RunMode',
      call: (ctx, self) =>
        ctx.enumValue('DcMotor.RunMode', ctx.sim.motor(dev(self, ctx))?.mode ?? 'RUN_WITHOUT_ENCODER'),
    },
    {
      name: 'setZeroPowerBehavior',
      params: ['DcMotor.ZeroPowerBehavior'],
      returns: 'void',
      call: (ctx, self, args) => {
        const m = ctx.sim.motor(dev(self, ctx));
        const d = args[0];
        if (m && d?.k === 'obj') m.zeroPower = (d.ref.enumName ?? 'BRAKE') as ZeroPowerBehavior;
        return JVOID;
      },
    },
    {
      name: 'getZeroPowerBehavior',
      params: [],
      returns: 'DcMotor.ZeroPowerBehavior',
      call: (ctx, self) =>
        ctx.enumValue('DcMotor.ZeroPowerBehavior', ctx.sim.motor(dev(self, ctx))?.zeroPower ?? 'BRAKE'),
    },
    {
      name: 'getCurrentPosition',
      params: [],
      returns: 'int',
      tick: true,
      call: (ctx, self) => jint(Math.round(ctx.sim.motor(dev(self, ctx))?.ticks ?? 0)),
    },
    {
      name: 'setTargetPosition',
      params: ['int'],
      returns: 'void',
      call: (ctx, self, args) => {
        const m = ctx.sim.motor(dev(self, ctx));
        if (m) m.targetTicks = Math.trunc(num(args[0]!));
        return JVOID;
      },
    },
    {
      name: 'getTargetPosition',
      params: [],
      returns: 'int',
      call: (ctx, self) => jint(Math.round(ctx.sim.motor(dev(self, ctx))?.targetTicks ?? 0)),
    },
    {
      name: 'isBusy',
      params: [],
      returns: 'boolean',
      tick: true,
      call: (ctx, self) => jbool(ctx.sim.isBusy(dev(self, ctx))),
    },
    {
      name: 'getDeviceName',
      params: [],
      returns: 'String',
      // HardwareDevice.getDeviceName() describes the kind of device, not the name it has in
      // the robot configuration. A lesson that wants that name keeps it in a String itself.
      call: () => jstring('Motor'),
    },
  ],
};

export const DC_MOTOR_EX: NativeClass = {
  fqn: 'com.qualcomm.robotcore.hardware.DcMotorEx',
  simple: 'DcMotorEx',
  kind: 'interface',
  extends: 'DcMotor',
  doc: 'A motor with velocity control, used in the Tier 5 proportional-control lesson.',
  methods: [
    {
      name: 'setVelocity',
      params: ['double'],
      returns: 'void',
      call: (ctx, self, args) => {
        ctx.sim.setMotorVelocity(dev(self, ctx), num(args[0]!));
        return JVOID;
      },
    },
    {
      name: 'getVelocity',
      params: [],
      returns: 'double',
      call: (ctx, self) => jdouble(ctx.sim.motor(dev(self, ctx))?.velocity ?? 0),
    },
  ],
};

export const SERVO: NativeClass = {
  fqn: 'com.qualcomm.robotcore.hardware.Servo',
  simple: 'Servo',
  kind: 'interface',
  doc: 'A positional servo, 0.0 to 1.0. The claw.',
  methods: [
    {
      name: 'setPosition',
      params: ['double'],
      returns: 'void',
      call: (ctx, self, args) => {
        ctx.sim.setServoPosition(dev(self, ctx), num(args[0]!));
        return JVOID;
      },
    },
    {
      name: 'getPosition',
      params: [],
      returns: 'double',
      call: (ctx, self) => jdouble(ctx.sim.servo(dev(self, ctx))?.position ?? 0),
    },
    {
      name: 'setDirection',
      params: ['Servo.Direction'],
      returns: 'void',
      call: () => JVOID,
    },
    {
      name: 'scaleRange',
      params: ['double', 'double'],
      returns: 'void',
      call: (ctx, self, args) => {
        const s = ctx.sim.servo(dev(self, ctx));
        if (s) {
          s.min = num(args[0]!);
          s.max = num(args[1]!);
        }
        return JVOID;
      },
    },
  ],
};

export const CR_SERVO: NativeClass = {
  fqn: 'com.qualcomm.robotcore.hardware.CRServo',
  simple: 'CRServo',
  kind: 'interface',
  extends: 'DcMotorSimple',
  doc: 'A continuous-rotation servo, driven by power rather than position.',
  methods: [],
};

export const DISTANCE_SENSOR: NativeClass = {
  fqn: 'com.qualcomm.robotcore.hardware.DistanceSensor',
  simple: 'DistanceSensor',
  kind: 'interface',
  doc: 'Forward-facing range sensor. Reads out to 200 cm, like a REV 2 m sensor.',
  methods: [
    {
      name: 'getDistance',
      params: ['DistanceUnit'],
      returns: 'double',
      tick: true,
      call: (ctx, _self, args) => {
        const u = args[0];
        const unit = u?.k === 'obj' ? (u.ref.enumName ?? 'CM') : 'CM';
        return jdouble(cmTo(unit, ctx.sim.distanceCm()));
      },
    },
  ],
};

export const COLOR_SENSOR: NativeClass = {
  fqn: 'com.qualcomm.robotcore.hardware.ColorSensor',
  simple: 'ColorSensor',
  kind: 'interface',
  doc: 'Downward colour sensor reading the tile under the robot.',
  methods: [
    { name: 'red', params: [], returns: 'int', tick: true, call: (ctx) => jint(ctx.sim.colorAt().r) },
    { name: 'green', params: [], returns: 'int', tick: true, call: (ctx) => jint(ctx.sim.colorAt().g) },
    { name: 'blue', params: [], returns: 'int', tick: true, call: (ctx) => jint(ctx.sim.colorAt().b) },
    { name: 'alpha', params: [], returns: 'int', tick: true, call: (ctx) => jint(ctx.sim.colorAt().alpha) },
    {
      name: 'argb',
      params: [],
      returns: 'int',
      tick: true,
      call: (ctx) => {
        const c = ctx.sim.colorAt();
        return jint(((c.alpha & 255) << 24) | ((c.r & 255) << 16) | ((c.g & 255) << 8) | (c.b & 255));
      },
    },
  ],
};

export const NORMALIZED_COLOR_SENSOR: NativeClass = {
  fqn: 'com.qualcomm.robotcore.hardware.NormalizedColorSensor',
  simple: 'NormalizedColorSensor',
  kind: 'interface',
  doc: 'Colour sensor with channels scaled to 0..1 and an adjustable gain.',
  methods: [
    {
      name: 'getNormalizedColors',
      params: [],
      returns: 'NormalizedRGBA',
      tick: true,
      call: (ctx) => {
        const c = ctx.sim.colorAt();
        return ctx.instance('NormalizedRGBA', {
          red: c.r / 255,
          green: c.g / 255,
          blue: c.b / 255,
          alpha: c.alpha / 255,
        });
      },
    },
    { name: 'setGain', params: ['float'], returns: 'void', call: () => JVOID },
    { name: 'getGain', params: [], returns: 'float', call: () => jfloat(1) },
  ],
};

export const IMU_PARAMETERS: NativeClass = {
  fqn: 'com.qualcomm.robotcore.hardware.IMU.Parameters',
  simple: 'IMU.Parameters',
  kind: 'class',
  doc: 'Describes the hub mounting, built from a RevHubOrientationOnRobot.',
  constructors: [{ params: ['RevHubOrientationOnRobot'], build: () => ({}) }],
  methods: [],
};

export const IMU: NativeClass = {
  fqn: 'com.qualcomm.robotcore.hardware.IMU',
  simple: 'IMU',
  kind: 'interface',
  doc: 'The Control Hub inertial measurement unit. Yaw is counter-clockwise positive.',
  methods: [
    { name: 'initialize', params: ['IMU.Parameters'], returns: 'boolean', call: () => jbool(true) },
    {
      name: 'getRobotYawPitchRollAngles',
      params: [],
      returns: 'YawPitchRollAngles',
      tick: true,
      call: (ctx) => ctx.instance('YawPitchRollAngles', { yaw: ctx.sim.yawDeg(), pitch: 0, roll: 0 }),
    },
    {
      name: 'resetYaw',
      params: [],
      returns: 'void',
      call: (ctx) => {
        ctx.sim.resetYaw();
        return JVOID;
      },
    },
  ],
};

const STICK_FIELDS = [
  'left_stick_x', 'left_stick_y', 'right_stick_x', 'right_stick_y', 'left_trigger', 'right_trigger',
] as const satisfies readonly (keyof GamepadState)[];

const BUTTON_FIELDS = [
  'a', 'b', 'x', 'y', 'left_bumper', 'right_bumper',
  'dpad_up', 'dpad_down', 'dpad_left', 'dpad_right', 'start', 'back',
] as const satisfies readonly (keyof GamepadState)[];

export const GAMEPAD: NativeClass = {
  fqn: 'com.qualcomm.robotcore.hardware.Gamepad',
  simple: 'Gamepad',
  kind: 'class',
  doc: 'Driver Station controller state. left_stick_y is negative when pushed forward.',
  fields: [
    ...STICK_FIELDS.map(
      (name): NativeField => ({
        name,
        type: 'float',
        get: (ctx, self) => jfloat(pad(ctx, self)[name]),
      }),
    ),
    ...BUTTON_FIELDS.map(
      (name): NativeField => ({
        name,
        type: 'boolean',
        get: (ctx, self) => jbool(pad(ctx, self)[name]),
      }),
    ),
  ],
  methods: [],
};

function pad(ctx: MockContext, self: JObject | null): GamepadState {
  const which = (self?.native as { which?: number } | undefined)?.which ?? 1;
  return which === 2 ? ctx.sim.gamepad2 : ctx.sim.gamepad1;
}

/** What hardwareMap.get can hand back, keyed by the requested class. */
const DEVICE_CLASSES: Record<string, 'motor' | 'servo' | 'crservo' | 'sensor' | 'imu'> = {
  DcMotor: 'motor',
  DcMotorEx: 'motor',
  DcMotorSimple: 'motor',
  Servo: 'servo',
  CRServo: 'crservo',
  DistanceSensor: 'sensor',
  ColorSensor: 'sensor',
  NormalizedColorSensor: 'sensor',
  IMU: 'imu',
};

export const HARDWARE_MAP: NativeClass = {
  fqn: 'com.qualcomm.robotcore.hardware.HardwareMap',
  simple: 'HardwareMap',
  kind: 'class',
  doc: 'Looks a device up by the name in the robot configuration.',
  methods: [
    {
      name: 'get',
      params: ['Class', 'String'],
      returns: 'Object',
      // The real declaration is generic, which is what lets
      // `DcMotor m = hardwareMap.get(DcMotor.class, "m")` compile in Android Studio.
      stub: 'public <T> T get(Class<? extends T> classOrInterface, String deviceName)',
      call: (ctx, _self, args) => {
        const classArg = args[0];
        const nameArg = args[1];
        const wanted =
          classArg?.k === 'obj' ? ((classArg.ref.native as { target?: string } | undefined)?.target ?? '') : '';
        const name = nameArg?.k === 'string' ? nameArg.v : '';
        const kind = DEVICE_CLASSES[wanted.split('.').pop() ?? ''];

        if (!kind) {
          ctx.fail(
            'IllegalArgumentException',
            `Nebula's robot has no ${wanted || 'device'} to hand out. See docs/FTC_MOCK_COVERAGE.md for the devices it has.`,
          );
        }

        // The configuration name has to match exactly, as on a real robot.
        const exists =
          kind === 'motor'
            ? ctx.sim.motor(name) !== undefined
            : kind === 'servo' || kind === 'crservo'
              ? ctx.sim.servo(name) !== undefined
              : kind === 'imu'
                ? name === 'imu'
                : name === 'distanceSensor' || name === 'colorSensor';

        if (!exists) {
          const available =
            kind === 'motor'
              ? ctx.sim.knownMotors().join(', ')
              : kind === 'servo' || kind === 'crservo'
                ? 'clawServo'
                : kind === 'imu'
                  ? 'imu'
                  : 'distanceSensor, colorSensor';
          ctx.fail(
            'IllegalArgumentException',
            `Unable to find a hardware device with the name "${name}". This robot has: ${available}.`,
          );
        }

        const className =
          kind === 'imu' ? 'IMU' : wanted.split('.').pop()!;
        return ctx.instance(className, { name });
      },
    },
  ],
};

export const HARDWARE_CLASSES: NativeClass[] = [
  DIRECTION, RUN_MODE, ZERO_POWER, SERVO_DIRECTION,
  DC_MOTOR_SIMPLE, DC_MOTOR, DC_MOTOR_EX, SERVO, CR_SERVO,
  DISTANCE_SENSOR, COLOR_SENSOR, NORMALIZED_COLOR_SENSOR,
  IMU, IMU_PARAMETERS, GAMEPAD, HARDWARE_MAP,
];
