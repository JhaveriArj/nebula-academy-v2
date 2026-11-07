/* Java's value model, kept honest because lessons depend on the details.
   Tier 1 lesson 05 exists to teach that `50 / 3` is 16, so int arithmetic has to
   truncate and wrap exactly the way the JVM does, not the way JavaScript does. */

export interface JObject {
  className: string;
  fields: Map<string, JValue>;
  /** Backing object for a mocked SDK class. See src/ftc-mock/. */
  native?: unknown;
  /** Set for enum constants. */
  enumName?: string;
  enumOrdinal?: number;
}

export interface JArray {
  elemType: string;
  items: JValue[];
}

export type JValue =
  | { k: 'int'; v: number }
  | { k: 'long'; v: number }
  | { k: 'double'; v: number }
  | { k: 'float'; v: number }
  | { k: 'boolean'; v: boolean }
  | { k: 'char'; v: number }
  | { k: 'string'; v: string }
  | { k: 'null' }
  | { k: 'void' }
  | { k: 'obj'; ref: JObject }
  | { k: 'array'; ref: JArray };

export const JNULL: JValue = { k: 'null' };
export const JVOID: JValue = { k: 'void' };

export const jint = (v: number): JValue => ({ k: 'int', v: v | 0 });
export const jlong = (v: number): JValue => ({ k: 'long', v: Math.trunc(v) });
export const jdouble = (v: number): JValue => ({ k: 'double', v });
export const jfloat = (v: number): JValue => ({ k: 'float', v: Math.fround(v) });
export const jbool = (v: boolean): JValue => ({ k: 'boolean', v });
export const jchar = (v: number): JValue => ({ k: 'char', v: v & 0xffff });
export const jstring = (v: string): JValue => ({ k: 'string', v });

const NUMERIC = new Set(['int', 'long', 'double', 'float', 'char']);
export const isNumeric = (x: JValue): boolean => NUMERIC.has(x.k);

/** The numeric payload. char participates in arithmetic as its code point, as in Java. */
export function num(x: JValue): number {
  switch (x.k) {
    case 'int':
    case 'long':
    case 'double':
    case 'float':
    case 'char':
      return x.v;
    case 'boolean':
      return x.v ? 1 : 0;
    default:
      return NaN;
  }
}

export function truth(x: JValue): boolean {
  return x.k === 'boolean' ? x.v : false;
}

/** How Java prints a value, which is what System.out.println and telemetry show. */
export function toJavaString(x: JValue): string {
  switch (x.k) {
    case 'string':
      return x.v;
    case 'null':
      return 'null';
    case 'boolean':
      return x.v ? 'true' : 'false';
    case 'char':
      return String.fromCharCode(x.v);
    case 'int':
    case 'long':
      return String(x.v);
    case 'float':
    case 'double':
      return formatJavaDouble(x.v);
    case 'array':
      return `[${x.ref.elemType}@${'1'.padStart(8, '0')}`;
    case 'obj':
      if (x.ref.enumName) return x.ref.enumName;
      return `${x.ref.className}@1`;
    case 'void':
      return 'void';
  }
}

/** Java prints 1.0 for 1.0, 0.5 for 0.5, and Infinity/NaN by name. */
export function formatJavaDouble(v: number): string {
  if (Number.isNaN(v)) return 'NaN';
  if (v === Infinity) return 'Infinity';
  if (v === -Infinity) return '-Infinity';
  if (Number.isInteger(v) && Math.abs(v) < 1e7) return `${v}.0`;
  // Java switches to scientific notation outside [1e-3, 1e7).
  const a = Math.abs(v);
  if (a !== 0 && (a < 1e-3 || a >= 1e7)) {
    return v.toExponential().replace(/e([+-])(\d)$/, 'E$1$2').replace('e', 'E');
  }
  return String(v);
}

/** Binary numeric promotion: double > float > long > int. */
function promote(a: JValue, b: JValue): 'double' | 'float' | 'long' | 'int' {
  if (a.k === 'double' || b.k === 'double') return 'double';
  if (a.k === 'float' || b.k === 'float') return 'float';
  if (a.k === 'long' || b.k === 'long') return 'long';
  return 'int';
}

const make = (kind: 'double' | 'float' | 'long' | 'int', v: number): JValue => {
  switch (kind) {
    case 'double': return jdouble(v);
    case 'float': return jfloat(v);
    case 'long': return jlong(v);
    case 'int': return jint(v);
  }
};

export class ArithmeticDivideByZero extends Error {
  constructor() {
    super('/ by zero');
  }
}

/** Result of an arithmetic or comparison operator, or null when the operands are wrong. */
export function binaryOp(op: string, a: JValue, b: JValue): JValue | null {
  // String concatenation wins over arithmetic when either side is a String.
  if (op === '+' && (a.k === 'string' || b.k === 'string')) {
    return jstring(toJavaString(a) + toJavaString(b));
  }

  switch (op) {
    case '&&':
      if (a.k !== 'boolean' || b.k !== 'boolean') return null;
      return jbool(a.v && b.v);
    case '||':
      if (a.k !== 'boolean' || b.k !== 'boolean') return null;
      return jbool(a.v || b.v);
    case '==':
    case '!=': {
      const eq = valuesEqual(a, b);
      return jbool(op === '==' ? eq : !eq);
    }
  }

  if (op === '&' || op === '|' || op === '^') {
    if (a.k === 'boolean' && b.k === 'boolean') {
      const r = op === '&' ? a.v && b.v : op === '|' ? a.v || b.v : a.v !== b.v;
      return jbool(r);
    }
    if (!isNumeric(a) || !isNumeric(b)) return null;
    const x = num(a) | 0;
    const y = num(b) | 0;
    return jint(op === '&' ? x & y : op === '|' ? x | y : x ^ y);
  }

  if (!isNumeric(a) || !isNumeric(b)) return null;
  const x = num(a);
  const y = num(b);

  switch (op) {
    case '<': return jbool(x < y);
    case '>': return jbool(x > y);
    case '<=': return jbool(x <= y);
    case '>=': return jbool(x >= y);
  }

  const kind = promote(a, b);
  const intLike = kind === 'int' || kind === 'long';

  switch (op) {
    case '+': return make(kind, x + y);
    case '-': return make(kind, x - y);
    case '*': return make(kind, x * y);
    case '/':
      if (intLike) {
        if (y === 0) throw new ArithmeticDivideByZero();
        // This truncation toward zero is the whole point of Tier 1 lesson 05.
        return make(kind, Math.trunc(x / y));
      }
      return make(kind, x / y);
    case '%':
      if (intLike) {
        if (y === 0) throw new ArithmeticDivideByZero();
        return make(kind, x % y);
      }
      return make(kind, x % y);
    case '<<': return jint((x | 0) << (y | 0));
    case '>>': return jint((x | 0) >> (y | 0));
    case '>>>': return jint((x | 0) >>> (y | 0));
    default: return null;
  }
}

export function valuesEqual(a: JValue, b: JValue): boolean {
  if (a.k === 'null' || b.k === 'null') return a.k === b.k;
  if (isNumeric(a) && isNumeric(b)) return num(a) === num(b);
  if (a.k === 'boolean' && b.k === 'boolean') return a.v === b.v;
  // Reference equality, as Java does for objects and Strings compared with ==.
  if (a.k === 'string' && b.k === 'string') return a.v === b.v;
  if (a.k === 'obj' && b.k === 'obj') return a.ref === b.ref;
  if (a.k === 'array' && b.k === 'array') return a.ref === b.ref;
  return false;
}

export function unaryOp(op: string, a: JValue): JValue | null {
  switch (op) {
    case '!':
      return a.k === 'boolean' ? jbool(!a.v) : null;
    case '-':
      if (!isNumeric(a)) return null;
      return make(a.k === 'char' ? 'int' : (a.k as 'int' | 'long' | 'double' | 'float'), -num(a));
    case '+':
      if (!isNumeric(a)) return null;
      return make(a.k === 'char' ? 'int' : (a.k as 'int' | 'long' | 'double' | 'float'), num(a));
    case '~':
      if (!isNumeric(a)) return null;
      return jint(~(num(a) | 0));
    default:
      return null;
  }
}

/** The zero value a field or array slot starts with. */
export function defaultValue(type: string): JValue {
  switch (type) {
    case 'int': return jint(0);
    case 'long': return jlong(0);
    case 'short': return jint(0);
    case 'byte': return jint(0);
    case 'double': return jdouble(0);
    case 'float': return jfloat(0);
    case 'boolean': return jbool(false);
    case 'char': return jchar(0);
    default: return JNULL;
  }
}

export const PRIMITIVE_TYPES = new Set([
  'int', 'long', 'short', 'byte', 'double', 'float', 'boolean', 'char', 'void',
]);

/** Widening and narrowing on assignment and on an explicit cast. */
export function coerce(value: JValue, target: string, explicit = false): JValue | null {
  if (target === 'var' || target === '' ) return value;
  switch (target) {
    case 'int':
      if (!isNumeric(value)) return null;
      if (!explicit && (value.k === 'double' || value.k === 'float' || value.k === 'long')) return null;
      return jint(Math.trunc(num(value)));
    case 'long':
      if (!isNumeric(value)) return null;
      if (!explicit && (value.k === 'double' || value.k === 'float')) return null;
      return jlong(Math.trunc(num(value)));
    case 'short':
    case 'byte':
      if (!isNumeric(value)) return null;
      return jint(Math.trunc(num(value)));
    case 'double':
      if (!isNumeric(value)) return null;
      return jdouble(num(value));
    case 'float':
      if (!isNumeric(value)) return null;
      if (!explicit && value.k === 'double') return null;
      return jfloat(num(value));
    case 'char':
      if (!isNumeric(value)) return null;
      if (!explicit && value.k !== 'char' && value.k !== 'int') return null;
      return jchar(Math.trunc(num(value)));
    case 'boolean':
      return value.k === 'boolean' ? value : null;
    case 'String':
    case 'java.lang.String':
      if (value.k === 'string' || value.k === 'null') return value;
      return explicit ? value : null;
    case 'Object':
    case 'java.lang.Object':
      return value;
    default:
      // Reference types: the interpreter checks the class hierarchy, not us.
      return value;
  }
}

/** Human name for a value's type, for diagnostics like "int cannot be converted to String". */
export function typeNameOf(x: JValue): string {
  switch (x.k) {
    case 'string': return 'String';
    case 'obj': return x.ref.className;
    case 'array': return `${x.ref.elemType}[]`;
    case 'null': return '<null>';
    default: return x.k;
  }
}
