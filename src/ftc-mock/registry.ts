import type { NativeClass, NativeMethod, NativeField } from './types';
import { HARDWARE_CLASSES } from './hardware';
import { NAVIGATION_CLASSES } from './navigation';
import { OPMODE_CLASSES } from './opmode';
import { JAVA_LANG_CLASSES } from './javalang';

/* The whole mocked SDK in one place. docs/FTC_MOCK_COVERAGE.md and ftc-stubs/*.java are
   both generated from this list, so a lesson cannot call something the docs do not list. */

export const ALL_NATIVE_CLASSES: NativeClass[] = [
  ...HARDWARE_CLASSES,
  ...NAVIGATION_CLASSES,
  ...OPMODE_CLASSES,
  ...JAVA_LANG_CLASSES,
];

/* Names the real SDK makes reachable by more than one route. DcMotor.Direction is the
   one kids actually type, even though Direction is declared on DcMotorSimple. */
const ALIASES: Record<string, string> = {
  'DcMotor.Direction': 'DcMotorSimple.Direction',
  'DcMotorEx.Direction': 'DcMotorSimple.Direction',
  'CRServo.Direction': 'DcMotorSimple.Direction',
  Direction: 'DcMotorSimple.Direction',
  RunMode: 'DcMotor.RunMode',
  ZeroPowerBehavior: 'DcMotor.ZeroPowerBehavior',
  'DcMotorEx.RunMode': 'DcMotor.RunMode',
  'DcMotorEx.ZeroPowerBehavior': 'DcMotor.ZeroPowerBehavior',
  'LogoFacingDirection': 'RevHubOrientationOnRobot.LogoFacingDirection',
  'UsbFacingDirection': 'RevHubOrientationOnRobot.UsbFacingDirection',
  Parameters: 'IMU.Parameters',
  Item: 'Telemetry.Item',
};

const BY_SIMPLE = new Map<string, NativeClass>();
const BY_FQN = new Map<string, NativeClass>();
for (const c of ALL_NATIVE_CLASSES) {
  BY_SIMPLE.set(c.simple, c);
  BY_FQN.set(c.fqn, c);
  // A nested type is reachable by its own last segment too, e.g. RunMode.
  const tail = c.simple.split('.').pop()!;
  if (!BY_SIMPLE.has(tail)) BY_SIMPLE.set(tail, c);
}

/** Resolves 'DcMotor', 'DcMotor.RunMode' or a fully qualified name. */
export function findNativeClass(name: string): NativeClass | undefined {
  if (!name) return undefined;
  const direct = BY_FQN.get(name) ?? BY_SIMPLE.get(name);
  if (direct) return direct;
  const aliased = ALIASES[name];
  if (aliased) return BY_SIMPLE.get(aliased);
  // A fully qualified name we do not carry, but whose tail we do.
  if (name.includes('.')) {
    const parts = name.split('.');
    for (let take = 2; take <= Math.min(3, parts.length); take++) {
      const candidate = parts.slice(-take).join('.');
      const hit = BY_SIMPLE.get(candidate) ?? (ALIASES[candidate] ? BY_SIMPLE.get(ALIASES[candidate]!) : undefined);
      if (hit) return hit;
    }
    const tail = parts[parts.length - 1]!;
    return BY_SIMPLE.get(tail) ?? (ALIASES[tail] ? BY_SIMPLE.get(ALIASES[tail]!) : undefined);
  }
  return undefined;
}

/** Methods including everything inherited, nearest declaration winning. */
export function nativeMethods(cls: NativeClass): NativeMethod[] {
  const chain: NativeClass[] = [];
  let cur: NativeClass | undefined = cls;
  const seen = new Set<string>();
  while (cur && !seen.has(cur.fqn)) {
    seen.add(cur.fqn);
    chain.push(cur);
    const next: NativeClass | undefined = cur.extends ? findNativeClass(cur.extends) : undefined;
    for (const i of cur.implements ?? []) {
      const impl = findNativeClass(i);
      if (impl && !seen.has(impl.fqn)) chain.push(impl);
    }
    cur = next;
  }
  return chain.flatMap((c) => c.methods ?? []);
}

export function nativeFields(cls: NativeClass): NativeField[] {
  const out: NativeField[] = [];
  let cur: NativeClass | undefined = cls;
  const seen = new Set<string>();
  while (cur && !seen.has(cur.fqn)) {
    seen.add(cur.fqn);
    out.push(...(cur.fields ?? []));
    cur = cur.extends ? findNativeClass(cur.extends) : undefined;
  }
  return out;
}

/** Is `name` the class `ancestor`, or does it inherit from it? */
export function nativeExtends(name: string, ancestor: string): boolean {
  let cur = findNativeClass(name);
  const target = findNativeClass(ancestor);
  if (!cur || !target) return false;
  const seen = new Set<string>();
  while (cur && !seen.has(cur.fqn)) {
    if (cur.fqn === target.fqn) return true;
    seen.add(cur.fqn);
    if ((cur.implements ?? []).some((i) => findNativeClass(i)?.fqn === target.fqn)) return true;
    cur = cur.extends ? findNativeClass(cur.extends) : undefined;
  }
  return false;
}

/** Every method a lesson is allowed to call, as "Class.method" strings.
    tests/content.test.ts checks lesson sources against this set. */
export function coverageKeys(): string[] {
  const keys: string[] = [];
  for (const c of ALL_NATIVE_CLASSES) {
    for (const m of c.methods ?? []) keys.push(`${c.simple}.${m.name}`);
    for (const f of c.fields ?? []) keys.push(`${c.simple}.${f.name}`);
    for (const e of c.enumConstants ?? []) keys.push(`${c.simple}.${e}`);
  }
  return [...new Set(keys)].sort();
}
