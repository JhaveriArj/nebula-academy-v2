import type { NativeClass, NativeMethod, MockContext } from './types';
import {
  jbool, jchar, jdouble, jint, jstring, JVOID, num, toJavaString, jlong, type JValue,
} from '../runtime/java/values';
import { formatJava } from './format';

/* The java.lang surface the lessons need. Everything else is deliberately absent and
   reported by name, per docs/ARCHITECTURE.md. */

export const PRINT_STREAM: NativeClass = {
  fqn: 'java.io.PrintStream',
  simple: 'PrintStream',
  kind: 'class',
  doc: 'System.out. On a real robot this goes to logcat; here it is the lesson console.',
  methods: [
    {
      name: 'println',
      params: ['Object'],
      returns: 'void',
      call: (ctx, _s, args) => {
        ctx.sim.println(args.length ? toJavaString(args[0]!) : '');
        return JVOID;
      },
    },
    {
      name: 'println',
      params: [],
      returns: 'void',
      call: (ctx) => {
        ctx.sim.println('');
        return JVOID;
      },
    },
    {
      name: 'print',
      params: ['Object'],
      returns: 'void',
      call: (ctx, _s, args) => {
        ctx.sim.print(args.length ? toJavaString(args[0]!) : '');
        return JVOID;
      },
    },
    {
      name: 'printf',
      params: ['String', 'Object'],
      varargs: true,
      returns: 'PrintStream',
      call: (ctx, _s, args) => {
        const fmt = args[0] && args[0].k === 'string' ? args[0].v : '';
        ctx.sim.print(formatJava(ctx, fmt, args.slice(1)));
        return ctx.builtinSystemOut();
      },
    },
  ],
};

export const SYSTEM: NativeClass = {
  fqn: 'java.lang.System',
  simple: 'System',
  kind: 'class',
  doc: 'System.out for printing, and a clock backed by the sim rather than the wall.',
  fields: [
    { name: 'out', type: 'PrintStream', isStatic: true, get: (ctx) => ctx.builtinSystemOut() },
    { name: 'err', type: 'PrintStream', isStatic: true, get: (ctx) => ctx.builtinSystemOut() },
  ],
  methods: [
    {
      name: 'currentTimeMillis',
      params: [],
      returns: 'long',
      isStatic: true,
      call: (ctx) => jlong(ctx.sim.timeMs),
    },
    {
      name: 'nanoTime',
      params: [],
      returns: 'long',
      isStatic: true,
      call: (ctx) => jlong(ctx.sim.timeMs * 1e6),
    },
  ],
};

const m1 = (name: string, fn: (x: number) => number, ret = 'double'): NativeMethod => ({
  name,
  params: ['double'],
  returns: ret,
  isStatic: true,
  call: (_c, _s, args) => (ret === 'int' ? jint(fn(num(args[0]!))) : jdouble(fn(num(args[0]!)))),
});

export const MATH: NativeClass = {
  fqn: 'java.lang.Math',
  simple: 'Math',
  kind: 'class',
  doc: 'Arithmetic helpers. Math.random() is seeded so a lesson cannot become flaky.',
  fields: [
    { name: 'PI', type: 'double', isStatic: true, get: () => jdouble(Math.PI) },
    { name: 'E', type: 'double', isStatic: true, get: () => jdouble(Math.E) },
  ],
  methods: [
    // abs/max/min keep int-ness, because `Math.abs(count)` in an int context must stay int.
    {
      name: 'abs',
      params: ['double'],
      returns: 'double',
      isStatic: true,
      call: (_c, _s, args) => {
        const a = args[0]!;
        const v = Math.abs(num(a));
        return a.k === 'int' || a.k === 'char' ? jint(v) : a.k === 'long' ? jlong(v) : jdouble(v);
      },
    },
    {
      name: 'max',
      params: ['double', 'double'],
      returns: 'double',
      isStatic: true,
      call: (_c, _s, args) => pickNumeric(args, Math.max),
    },
    {
      name: 'min',
      params: ['double', 'double'],
      returns: 'double',
      isStatic: true,
      call: (_c, _s, args) => pickNumeric(args, Math.min),
    },
    m1('sqrt', Math.sqrt),
    m1('floor', Math.floor),
    m1('ceil', Math.ceil),
    m1('sin', Math.sin),
    m1('cos', Math.cos),
    m1('tan', Math.tan),
    m1('asin', Math.asin),
    m1('acos', Math.acos),
    m1('atan', Math.atan),
    m1('toRadians', (d) => (d * Math.PI) / 180),
    m1('toDegrees', (r) => (r * 180) / Math.PI),
    m1('signum', Math.sign),
    m1('round', Math.round, 'int'),
    {
      name: 'pow',
      params: ['double', 'double'],
      returns: 'double',
      isStatic: true,
      call: (_c, _s, args) => jdouble(Math.pow(num(args[0]!), num(args[1]!))),
    },
    {
      name: 'atan2',
      params: ['double', 'double'],
      returns: 'double',
      isStatic: true,
      call: (_c, _s, args) => jdouble(Math.atan2(num(args[0]!), num(args[1]!))),
    },
    {
      name: 'hypot',
      params: ['double', 'double'],
      returns: 'double',
      isStatic: true,
      call: (_c, _s, args) => jdouble(Math.hypot(num(args[0]!), num(args[1]!))),
    },
    {
      name: 'random',
      params: [],
      returns: 'double',
      isStatic: true,
      call: (ctx) => jdouble(ctx.random()),
    },
  ],
};

function pickNumeric(args: JValue[], f: (a: number, b: number) => number): JValue {
  const a = args[0]!;
  const b = args[1]!;
  const v = f(num(a), num(b));
  const anyDouble = a.k === 'double' || b.k === 'double' || a.k === 'float' || b.k === 'float';
  return anyDouble ? jdouble(v) : jint(v);
}

export const INTEGER: NativeClass = {
  fqn: 'java.lang.Integer',
  simple: 'Integer',
  kind: 'class',
  doc: 'Integer.parseInt and the int bounds.',
  fields: [
    { name: 'MAX_VALUE', type: 'int', isStatic: true, get: () => jint(2147483647) },
    { name: 'MIN_VALUE', type: 'int', isStatic: true, get: () => jint(-2147483648) },
  ],
  methods: [
    {
      name: 'parseInt',
      params: ['String'],
      returns: 'int',
      isStatic: true,
      call: (ctx, _s, args) => {
        const text = args[0] && args[0].k === 'string' ? args[0].v.trim() : '';
        if (!/^[+-]?\d+$/.test(text)) {
          ctx.fail('NumberFormatException', `For input string: "${text}"`);
        }
        return jint(Number(text));
      },
    },
    {
      name: 'toString',
      params: ['int'],
      returns: 'String',
      isStatic: true,
      call: (_c, _s, args) => jstring(String(Math.trunc(num(args[0]!)))),
    },
    {
      name: 'valueOf',
      params: ['int'],
      returns: 'Integer',
      isStatic: true,
      call: (_c, _s, args) => jint(num(args[0]!)),
    },
  ],
};

export const DOUBLE: NativeClass = {
  fqn: 'java.lang.Double',
  simple: 'Double',
  kind: 'class',
  doc: 'Double.parseDouble and the double bounds.',
  fields: [
    { name: 'MAX_VALUE', type: 'double', isStatic: true, get: () => jdouble(Number.MAX_VALUE) },
    { name: 'MIN_VALUE', type: 'double', isStatic: true, get: () => jdouble(Number.MIN_VALUE) },
  ],
  methods: [
    {
      name: 'parseDouble',
      params: ['String'],
      returns: 'double',
      isStatic: true,
      call: (ctx, _s, args) => {
        const text = args[0] && args[0].k === 'string' ? args[0].v.trim() : '';
        const v = Number(text);
        if (text === '' || Number.isNaN(v)) {
          ctx.fail('NumberFormatException', `For input string: "${text}"`);
        }
        return jdouble(v);
      },
    },
    {
      name: 'toString',
      params: ['double'],
      returns: 'String',
      isStatic: true,
      call: (_c, _s, args) => jstring(toJavaString(jdouble(num(args[0]!)))),
    },
  ],
};

export const BOOLEAN: NativeClass = {
  fqn: 'java.lang.Boolean',
  simple: 'Boolean',
  kind: 'class',
  doc: 'Boolean.parseBoolean.',
  methods: [
    {
      name: 'parseBoolean',
      params: ['String'],
      returns: 'boolean',
      isStatic: true,
      call: (_c, _s, args) => jbool(args[0]?.k === 'string' && args[0].v.toLowerCase() === 'true'),
    },
  ],
};

export const STRING_CLASS: NativeClass = {
  fqn: 'java.lang.String',
  simple: 'String',
  kind: 'class',
  doc: 'String.format and String.valueOf. Instance methods are listed below.',
  methods: [
    {
      name: 'format',
      params: ['String', 'Object'],
      varargs: true,
      returns: 'String',
      isStatic: true,
      call: (ctx, _s, args) => {
        const fmt = args[0] && args[0].k === 'string' ? args[0].v : '';
        return jstring(formatJava(ctx, fmt, args.slice(1)));
      },
    },
    {
      name: 'valueOf',
      params: ['Object'],
      returns: 'String',
      isStatic: true,
      call: (_c, _s, args) => jstring(args[0] ? toJavaString(args[0]) : 'null'),
    },
  ],
};

/* String instance methods. A String is a primitive JValue rather than a JObject, so the
   interpreter dispatches these separately instead of through NativeClass.methods. */
export interface StringMethod {
  params: string[];
  returns: string;
  varargs?: boolean;
  call(ctx: MockContext, recv: string, args: JValue[]): JValue;
}

const str = (v: JValue | undefined): string => (v && v.k === 'string' ? v.v : v ? toJavaString(v) : '');

export const STRING_METHODS: Record<string, StringMethod[]> = {
  length: [{ params: [], returns: 'int', call: (_c, r) => jint(r.length) }],
  isEmpty: [{ params: [], returns: 'boolean', call: (_c, r) => jbool(r.length === 0) }],
  charAt: [
    {
      params: ['int'],
      returns: 'char',
      call: (ctx, r, a) => {
        const i = Math.trunc(num(a[0]!));
        if (i < 0 || i >= r.length) {
          ctx.fail('StringIndexOutOfBoundsException', `index ${i}, length ${r.length}`);
        }
        return jchar(r.charCodeAt(i));
      },
    },
  ],
  substring: [
    {
      params: ['int'],
      returns: 'String',
      call: (ctx, r, a) => {
        const i = Math.trunc(num(a[0]!));
        if (i < 0 || i > r.length) ctx.fail('StringIndexOutOfBoundsException', `begin ${i}, length ${r.length}`);
        return jstring(r.slice(i));
      },
    },
    {
      params: ['int', 'int'],
      returns: 'String',
      call: (ctx, r, a) => {
        const i = Math.trunc(num(a[0]!));
        const j = Math.trunc(num(a[1]!));
        if (i < 0 || j > r.length || i > j) {
          ctx.fail('StringIndexOutOfBoundsException', `begin ${i}, end ${j}, length ${r.length}`);
        }
        return jstring(r.slice(i, j));
      },
    },
  ],
  indexOf: [{ params: ['String'], returns: 'int', call: (_c, r, a) => jint(r.indexOf(str(a[0]))) }],
  lastIndexOf: [{ params: ['String'], returns: 'int', call: (_c, r, a) => jint(r.lastIndexOf(str(a[0]))) }],
  contains: [{ params: ['CharSequence'], returns: 'boolean', call: (_c, r, a) => jbool(r.includes(str(a[0]))) }],
  startsWith: [{ params: ['String'], returns: 'boolean', call: (_c, r, a) => jbool(r.startsWith(str(a[0]))) }],
  endsWith: [{ params: ['String'], returns: 'boolean', call: (_c, r, a) => jbool(r.endsWith(str(a[0]))) }],
  equals: [{ params: ['Object'], returns: 'boolean', call: (_c, r, a) => jbool(a[0]?.k === 'string' && a[0].v === r) }],
  equalsIgnoreCase: [
    { params: ['String'], returns: 'boolean', call: (_c, r, a) => jbool(r.toLowerCase() === str(a[0]).toLowerCase()) },
  ],
  compareTo: [
    { params: ['String'], returns: 'int', call: (_c, r, a) => jint(r < str(a[0]) ? -1 : r > str(a[0]) ? 1 : 0) },
  ],
  toUpperCase: [{ params: [], returns: 'String', call: (_c, r) => jstring(r.toUpperCase()) }],
  toLowerCase: [{ params: [], returns: 'String', call: (_c, r) => jstring(r.toLowerCase()) }],
  trim: [{ params: [], returns: 'String', call: (_c, r) => jstring(r.trim()) }],
  concat: [{ params: ['String'], returns: 'String', call: (_c, r, a) => jstring(r + str(a[0])) }],
  replace: [
    {
      params: ['CharSequence', 'CharSequence'],
      returns: 'String',
      call: (_c, r, a) => jstring(r.split(str(a[0])).join(str(a[1]))),
    },
  ],
  // Annotated because TypeScript contextually types a `toString` property from
  // Object.prototype rather than from the index signature.
  toString: [{ params: [], returns: 'String', call: (_c, r: string) => jstring(r) }] as StringMethod[],
  hashCode: [
    {
      params: [],
      returns: 'int',
      call: (_c, r) => {
        let h = 0;
        for (let i = 0; i < r.length; i++) h = (Math.imul(31, h) + r.charCodeAt(i)) | 0;
        return jint(h);
      },
    },
  ],
  split: [
    {
      params: ['String'],
      returns: 'String[]',
      call: (_c, r, a) => ({
        k: 'array',
        ref: { elemType: 'String', items: r.split(new RegExp(str(a[0]))).map((p) => jstring(p)) },
      }),
    },
  ],
};

export const JAVA_LANG_CLASSES: NativeClass[] = [
  PRINT_STREAM, SYSTEM, MATH, INTEGER, DOUBLE, BOOLEAN, STRING_CLASS,
];
