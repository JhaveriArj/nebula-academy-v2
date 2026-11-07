import type { NativeClass, NativeField, MockContext } from './types';
import { nativeOf } from './types';
import {
  jbool, jdouble, jint, jlong, jstring, JVOID, num, toJavaString, type JValue, type JObject,
} from '../runtime/java/values';
import { formatJava } from './format';

/* com.qualcomm.robotcore.eventloop.opmode and the Telemetry / ElapsedTime it comes with */

export const TELEOP: NativeClass = {
  fqn: 'com.qualcomm.robotcore.eventloop.opmode.TeleOp',
  simple: 'TeleOp',
  kind: 'annotation',
  annotationElements: ['name', 'group'],
  doc: 'Marks a driver-controlled OpMode so the Driver Station lists it.',
};

export const AUTONOMOUS: NativeClass = {
  fqn: 'com.qualcomm.robotcore.eventloop.opmode.Autonomous',
  simple: 'Autonomous',
  kind: 'annotation',
  annotationElements: ['name', 'group', 'preselectTeleOp'],
  doc: 'Marks an autonomous OpMode so the Driver Station lists it.',
};

export const DISABLED: NativeClass = {
  fqn: 'com.qualcomm.robotcore.eventloop.opmode.Disabled',
  simple: 'Disabled',
  kind: 'annotation',
  annotationElements: [],
  doc: 'Hides an OpMode from the Driver Station without deleting it.',
};

export const OVERRIDE: NativeClass = {
  fqn: 'java.lang.Override',
  simple: 'Override',
  kind: 'annotation',
  annotationElements: [],
  doc: 'Standard Java annotation. Checked for shape only.',
};

const builtinField = (name: 'hardwareMap' | 'telemetry' | 'gamepad1' | 'gamepad2', type: string): NativeField => ({
  name,
  type,
  get: (ctx) => ctx.builtin(name),
});

/** The fields and methods a kid's `extends OpMode` inherits. */
export const OP_MODE: NativeClass = {
  fqn: 'com.qualcomm.robotcore.eventloop.opmode.OpMode',
  simple: 'OpMode',
  kind: 'class',
  doc: 'The base class of a driver-controlled OpMode: init() once, then loop() forever.',
  overridable: ['init', 'init_loop', 'start', 'loop', 'stop'],
  fields: [
    builtinField('hardwareMap', 'HardwareMap'),
    builtinField('telemetry', 'Telemetry'),
    builtinField('gamepad1', 'Gamepad'),
    builtinField('gamepad2', 'Gamepad'),
  ],
  methods: [
    {
      name: 'getRuntime',
      params: [],
      returns: 'double',
      tick: true,
      call: (ctx) => jdouble(ctx.sim.timeMs / 1000),
    },
    { name: 'resetRuntime', params: [], returns: 'void', call: () => JVOID },
    // Declared so a subclass can call super.init() and so javac sees them.
    { name: 'init', params: [], returns: 'void', call: () => JVOID },
    { name: 'init_loop', params: [], returns: 'void', call: () => JVOID },
    { name: 'start', params: [], returns: 'void', call: () => JVOID },
    { name: 'loop', params: [], returns: 'void', call: () => JVOID },
    { name: 'stop', params: [], returns: 'void', call: () => JVOID },
  ],
};

export const LINEAR_OP_MODE: NativeClass = {
  fqn: 'com.qualcomm.robotcore.eventloop.opmode.LinearOpMode',
  simple: 'LinearOpMode',
  kind: 'class',
  extends: 'OpMode',
  doc: 'An OpMode that runs top to bottom in runOpMode(). The base class for autonomous.',
  overridable: ['runOpMode'],
  methods: [
    { name: 'runOpMode', params: [], returns: 'void', call: () => JVOID },
    {
      name: 'waitForStart',
      params: [],
      returns: 'void',
      call: (ctx) => {
        ctx.waitForStart();
        return JVOID;
      },
    },
    { name: 'opModeIsActive', params: [], returns: 'boolean', tick: true, call: (ctx) => jbool(ctx.opModeIsActive()) },
    { name: 'isStopRequested', params: [], returns: 'boolean', tick: true, call: (ctx) => jbool(ctx.isStopRequested()) },
    { name: 'opModeInInit', params: [], returns: 'boolean', tick: true, call: (ctx) => jbool(ctx.opModeInInit()) },
    {
      name: 'sleep',
      params: ['long'],
      returns: 'void',
      call: (ctx, _self, args) => {
        ctx.sleep(num(args[0]!));
        return JVOID;
      },
    },
    {
      name: 'idle',
      params: [],
      returns: 'void',
      call: (ctx) => {
        ctx.sleep(0);
        return JVOID;
      },
    },
    { name: 'terminateOpModeNow', params: [], returns: 'void', call: () => JVOID },
  ],
};

export const TELEMETRY_ITEM: NativeClass = {
  fqn: 'org.firstinspires.ftc.robotcore.external.Telemetry.Item',
  simple: 'Telemetry.Item',
  kind: 'interface',
  doc: 'The handle addData returns. Declared so the real signature is honest.',
  methods: [
    { name: 'setRetained', params: ['boolean'], returns: 'Telemetry.Item', call: (_c, self) => selfValue(self) },
    { name: 'setValue', params: ['Object'], returns: 'Telemetry.Item', call: (_c, self) => selfValue(self) },
  ],
};

const selfValue = (self: JObject | null): JValue =>
  self ? { k: 'obj', ref: self } : { k: 'null' };

export const TELEMETRY: NativeClass = {
  fqn: 'org.firstinspires.ftc.robotcore.external.Telemetry',
  simple: 'Telemetry',
  kind: 'interface',
  doc: 'The Driver Station readout. addData builds lines, update() sends them.',
  methods: [
    {
      name: 'addData',
      params: ['String', 'Object'],
      returns: 'Telemetry.Item',
      call: (ctx, _self, args) => {
        const key = args[0] ? toJavaString(args[0]) : '';
        ctx.sim.addTelemetry(key, args[1] ? toJavaString(args[1]) : 'null');
        return ctx.instance('Telemetry.Item', {});
      },
    },
    {
      name: 'addData',
      params: ['String', 'String', 'Object'],
      varargs: true,
      returns: 'Telemetry.Item',
      call: (ctx, _self, args) => {
        const key = args[0] ? toJavaString(args[0]) : '';
        const fmt = args[1] && args[1].k === 'string' ? args[1].v : '';
        ctx.sim.addTelemetry(key, formatJava(ctx, fmt, args.slice(2)));
        return ctx.instance('Telemetry.Item', {});
      },
    },
    {
      name: 'addLine',
      params: [],
      returns: 'Telemetry.Item',
      call: (ctx) => {
        ctx.sim.addTelemetry('', '');
        return ctx.instance('Telemetry.Item', {});
      },
    },
    {
      name: 'addLine',
      params: ['String'],
      returns: 'Telemetry.Item',
      call: (ctx, _self, args) => {
        ctx.sim.addTelemetry('', args[0] ? toJavaString(args[0]) : '');
        return ctx.instance('Telemetry.Item', {});
      },
    },
    {
      name: 'update',
      params: [],
      returns: 'boolean',
      call: (ctx) => {
        ctx.sim.updateTelemetry();
        return jbool(true);
      },
    },
    {
      name: 'clear',
      params: [],
      returns: 'void',
      call: (ctx) => {
        ctx.sim.clearTelemetry();
        return JVOID;
      },
    },
    {
      name: 'clearAll',
      params: [],
      returns: 'void',
      call: (ctx) => {
        ctx.sim.clearTelemetry();
        return JVOID;
      },
    },
    { name: 'setMsTransmissionInterval', params: ['int'], returns: 'void', call: () => JVOID },
    { name: 'setAutoClear', params: ['boolean'], returns: 'void', call: () => JVOID },
  ],
};

interface Stopwatch {
  startMs: number;
}

export const ELAPSED_TIME: NativeClass = {
  fqn: 'com.qualcomm.robotcore.util.ElapsedTime',
  simple: 'ElapsedTime',
  kind: 'class',
  doc: 'A stopwatch. Backed by the sim clock, so a timed loop is reproducible.',
  constructors: [
    { params: [], build: (ctx) => ({ startMs: ctx.sim.timeMs }) },
    { params: ['long'], build: (ctx) => ({ startMs: ctx.sim.timeMs }) },
  ],
  methods: [
    {
      name: 'seconds',
      params: [],
      returns: 'double',
      tick: true,
      call: (ctx, self) => jdouble((ctx.sim.timeMs - watch(ctx, self).startMs) / 1000),
    },
    {
      name: 'milliseconds',
      params: [],
      returns: 'double',
      tick: true,
      call: (ctx, self) => jdouble(ctx.sim.timeMs - watch(ctx, self).startMs),
    },
    {
      name: 'time',
      params: [],
      returns: 'double',
      tick: true,
      call: (ctx, self) => jdouble((ctx.sim.timeMs - watch(ctx, self).startMs) / 1000),
    },
    {
      name: 'nanoseconds',
      params: [],
      returns: 'long',
      call: (ctx, self) => jlong((ctx.sim.timeMs - watch(ctx, self).startMs) * 1e6),
    },
    {
      name: 'startTime',
      params: [],
      returns: 'double',
      call: (ctx, self) => jdouble(watch(ctx, self).startMs / 1000),
    },
    {
      name: 'reset',
      params: [],
      returns: 'void',
      call: (ctx, self) => {
        watch(ctx, self).startMs = ctx.sim.timeMs;
        return JVOID;
      },
    },
    {
      name: 'toString',
      params: [],
      returns: 'String',
      call: (ctx, self) => jstring(((ctx.sim.timeMs - watch(ctx, self).startMs) / 1000).toFixed(3)),
    },
  ],
};

const watch = (ctx: MockContext, self: JObject | null): Stopwatch =>
  nativeOf<Stopwatch>(self, ctx, 'This ElapsedTime');

export const RANGE: NativeClass = {
  fqn: 'com.qualcomm.robotcore.util.Range',
  simple: 'Range',
  kind: 'class',
  doc: 'Clipping helper. Range.clip is how FTC code keeps a power inside -1..1.',
  methods: [
    {
      name: 'clip',
      params: ['double', 'double', 'double'],
      returns: 'double',
      isStatic: true,
      call: (_ctx, _self, args) =>
        jdouble(Math.max(num(args[1]!), Math.min(num(args[2]!), num(args[0]!)))),
    },
    {
      name: 'clip',
      params: ['int', 'int', 'int'],
      returns: 'int',
      isStatic: true,
      call: (_ctx, _self, args) =>
        jint(Math.max(num(args[1]!), Math.min(num(args[2]!), num(args[0]!)))),
    },
  ],
};

export const OPMODE_CLASSES: NativeClass[] = [
  TELEOP, AUTONOMOUS, DISABLED, OVERRIDE,
  OP_MODE, LINEAR_OP_MODE,
  TELEMETRY, TELEMETRY_ITEM, ELAPSED_TIME, RANGE,
];
