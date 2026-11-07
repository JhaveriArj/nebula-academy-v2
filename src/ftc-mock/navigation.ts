import type { NativeClass, NativeCall, NativeMethod } from './types';
import { nativeOf } from './types';
import { jdouble, jfloat, jint, jstring, num } from '../runtime/java/values';

/* org.firstinspires.ftc.robotcore.external.navigation and com.qualcomm.hardware.rev */

const DEG = 'DEGREES';

export const ANGLE_UNIT: NativeClass = {
  fqn: 'org.firstinspires.ftc.robotcore.external.navigation.AngleUnit',
  simple: 'AngleUnit',
  kind: 'enum',
  enumConstants: ['DEGREES', 'RADIANS'],
  doc: 'Degrees or radians, passed to IMU angle getters.',
  methods: [
    {
      name: 'fromDegrees',
      params: ['double'],
      returns: 'double',
      call: (_ctx, self, args) =>
        jdouble(self?.enumName === DEG ? num(args[0]!) : (num(args[0]!) * Math.PI) / 180),
    },
    {
      name: 'fromRadians',
      params: ['double'],
      returns: 'double',
      call: (_ctx, self, args) =>
        jdouble(self?.enumName === DEG ? (num(args[0]!) * 180) / Math.PI : num(args[0]!)),
    },
  ],
};

const CM_PER: Record<string, number> = { METER: 100, CM: 1, MM: 0.1, INCH: 2.54 };

export const DISTANCE_UNIT: NativeClass = {
  fqn: 'org.firstinspires.ftc.robotcore.external.navigation.DistanceUnit',
  simple: 'DistanceUnit',
  kind: 'enum',
  enumConstants: ['METER', 'CM', 'MM', 'INCH'],
  doc: 'The unit a DistanceSensor reading is returned in.',
  methods: [
    {
      name: 'fromCm',
      params: ['double'],
      returns: 'double',
      call: (_ctx, self, args) => jdouble(num(args[0]!) / (CM_PER[self?.enumName ?? 'CM'] ?? 1)),
    },
  ],
};

/** Converts centimetres from the sim into whatever unit the kid asked for. */
export function cmTo(unitName: string, cm: number): number {
  return cm / (CM_PER[unitName] ?? 1);
}

export const YAW_PITCH_ROLL_ANGLES: NativeClass = {
  fqn: 'org.firstinspires.ftc.robotcore.external.navigation.YawPitchRollAngles',
  simple: 'YawPitchRollAngles',
  kind: 'class',
  doc: 'A snapshot of the robot orientation, returned by IMU.getRobotYawPitchRollAngles().',
  methods: [
    angleGetter('getYaw', 'yaw'),
    angleGetter('getPitch', 'pitch'),
    angleGetter('getRoll', 'roll'),
    {
      name: 'toString',
      params: [],
      returns: 'String',
      call: (ctx, self) => {
        const a = nativeOf<Angles>(self, ctx, 'YawPitchRollAngles');
        return jstring(`YawPitchRollAngles(yaw=${a.yaw.toFixed(1)})`);
      },
    },
  ],
};

interface Angles {
  yaw: number;
  pitch: number;
  roll: number;
}

function angleGetter(method: string, key: keyof Angles): NativeMethod {
  const call: NativeCall = (ctx, self, args) => {
    const a = nativeOf<Angles>(self, ctx, 'YawPitchRollAngles');
    const unit = args[0];
    const name = unit && unit.k === 'obj' ? unit.ref.enumName : DEG;
    const deg = a[key];
    return jdouble(name === 'RADIANS' ? (deg * Math.PI) / 180 : deg);
  };
  return { name: method, params: ['AngleUnit'], returns: 'double', call };
}

export const REV_HUB_ORIENTATION: NativeClass = {
  fqn: 'com.qualcomm.hardware.rev.RevHubOrientationOnRobot',
  simple: 'RevHubOrientationOnRobot',
  kind: 'class',
  doc: 'Describes how the Control Hub is mounted, passed to IMU.Parameters.',
  constructors: [
    {
      params: ['RevHubOrientationOnRobot.LogoFacingDirection', 'RevHubOrientationOnRobot.UsbFacingDirection'],
      build: () => ({}),
    },
  ],
  methods: [],
};

const SIX_WAYS = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'FORWARD', 'BACKWARD'];

export const LOGO_FACING: NativeClass = {
  fqn: 'com.qualcomm.hardware.rev.RevHubOrientationOnRobot.LogoFacingDirection',
  simple: 'RevHubOrientationOnRobot.LogoFacingDirection',
  kind: 'enum',
  enumConstants: SIX_WAYS,
  doc: 'Which way the REV logo on the hub points.',
};

export const USB_FACING: NativeClass = {
  fqn: 'com.qualcomm.hardware.rev.RevHubOrientationOnRobot.UsbFacingDirection',
  simple: 'RevHubOrientationOnRobot.UsbFacingDirection',
  kind: 'enum',
  enumConstants: SIX_WAYS,
  doc: 'Which way the hub USB port points.',
};

export const NORMALIZED_RGBA: NativeClass = {
  fqn: 'org.firstinspires.ftc.robotcore.external.navigation.NormalizedRGBA',
  simple: 'NormalizedRGBA',
  kind: 'class',
  doc: 'Colour with each channel scaled to 0..1, from NormalizedColorSensor.',
  fields: (['red', 'green', 'blue', 'alpha'] as const).map((ch) => ({
    name: ch,
    type: 'float',
    get: (ctx, self) => jfloat(nativeOf<Record<string, number>>(self, ctx, 'NormalizedRGBA')[ch] ?? 0),
  })),
  methods: [
    {
      name: 'toColor',
      params: [],
      returns: 'int',
      call: (ctx, self) => {
        const c = nativeOf<Record<string, number>>(self, ctx, 'NormalizedRGBA');
        const b = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255);
        return jint((b(c.alpha ?? 1) << 24) | (b(c.red ?? 0) << 16) | (b(c.green ?? 0) << 8) | b(c.blue ?? 0));
      },
    },
  ],
};

export const NAVIGATION_CLASSES: NativeClass[] = [
  ANGLE_UNIT,
  DISTANCE_UNIT,
  YAW_PITCH_ROLL_ANGLES,
  REV_HUB_ORIENTATION,
  LOGO_FACING,
  USB_FACING,
  NORMALIZED_RGBA,
];
