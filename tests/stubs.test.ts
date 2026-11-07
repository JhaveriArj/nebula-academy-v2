import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_NATIVE_CLASSES } from '../src/ftc-mock/registry';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STUBS = join(ROOT, 'ftc-stubs');

const javaFiles = (dir: string, out: string[] = []): string[] => {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) javaFiles(p, out);
    else if (n.endsWith('.java')) out.push(p);
  }
  return out;
};

const PRIMITIVES = new Set(['int', 'long', 'short', 'byte', 'double', 'float', 'boolean', 'char', 'void']);
const JAVA_LANG = new Set([
  'String', 'Object', 'Class', 'CharSequence', 'Integer', 'Double', 'Boolean', 'Long',
  'Float', 'Character', 'Number', 'Exception', 'RuntimeException', 'InterruptedException',
  'Throwable', 'Override', 'T',
]);

/* The real-javac gate runs in CI with a JDK (.github/workflows/ci.yml); this machine has
   none. These checks are what can be verified without one, and they cover the generator
   mistakes that would actually break javac: an unresolvable type, an unbalanced brace, a
   duplicate signature, or a nested type referenced through a parent that does not extend
   the type declaring it. */
describe('generated ftc-stubs are structurally valid Java', () => {
  const files = javaFiles(STUBS);

  it('exist, and there is one per outer type', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('declare a package that matches their directory', () => {
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      const pkg = /^package ([\w.]+);/m.exec(src)?.[1];
      expect(pkg, `${relative(ROOT, f)} has no package`).toBeTruthy();
      const expected = relative(STUBS, dirname(f)).split('/').join('.');
      expect(pkg, relative(ROOT, f)).toBe(expected);
    }
  });

  it('have balanced braces and parentheses', () => {
    for (const f of files) {
      const src = readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '').replace(/"(?:[^"\\]|\\.)*"/g, '""');
      const count = (ch: string) => [...src].filter((c) => c === ch).length;
      expect(count('{'), relative(ROOT, f)).toBe(count('}'));
      expect(count('('), relative(ROOT, f)).toBe(count(')'));
    }
  });

  it('reference only types that are imported, same-package, nested here, or java.lang', () => {
    const byPackage = new Map<string, Set<string>>();
    for (const f of files) {
      const pkg = relative(STUBS, dirname(f)).split('/').join('.');
      const set = byPackage.get(pkg) ?? new Set<string>();
      set.add(f.split('/').pop()!.replace('.java', ''));
      byPackage.set(pkg, set);
    }

    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      const pkg = relative(STUBS, dirname(f)).split('/').join('.');
      const imported = new Set(
        [...src.matchAll(/^import ([\w.]+);/gm)].map((m) => m[1]!.split('.').pop()!),
      );
      const samePackage = byPackage.get(pkg) ?? new Set<string>();
      const declaredHere = new Set(
        [...src.matchAll(/(?:class|interface|enum|@interface)\s+(\w+)/g)].map((m) => m[1]!),
      );

      const body = src.replace(/^(?:package|import)\b.*$/gm, '').replace(/\/\/.*$/gm, '');
      // Every capitalised identifier used as a type, taking only the head of a dotted name.
      for (const m of body.matchAll(/\b([A-Z][A-Za-z0-9_]*)(?:\.[A-Z][A-Za-z0-9_]*)*\b/g)) {
        const head = m[1]!;
        if (PRIMITIVES.has(head) || JAVA_LANG.has(head)) continue;
        // Enum constants are SHOUTY_CASE, not types.
        if (/^[A-Z0-9_]+$/.test(head) && head.length > 1) continue;
        const ok = imported.has(head) || samePackage.has(head) || declaredHere.has(head);
        expect(ok, `${relative(ROOT, f)} uses ${head} with no import`).toBe(true);
      }
    }
  });

  it('declare no duplicate method signatures inside one type', () => {
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      const sigs = [...src.matchAll(/^\s*(?:public |static |abstract )*[\w.<>?\[\] ]+ (\w+)\(([^)]*)\)/gm)].map(
        (m) => `${m[1]}(${m[2]!.replace(/\s*\w+$/g, '').replace(/\s+/g, '')})`,
      );
      const dupes = sigs.filter((s, i) => sigs.indexOf(s) !== i);
      expect(dupes, relative(ROOT, f)).toEqual([]);
    }
  });

  it('keep the inheritance the real SDK has, so DcMotor.Direction resolves', () => {
    const dcMotor = readFileSync(join(STUBS, 'com/qualcomm/robotcore/hardware/DcMotor.java'), 'utf8');
    expect(dcMotor).toContain('interface DcMotor extends DcMotorSimple');
    const simple = readFileSync(join(STUBS, 'com/qualcomm/robotcore/hardware/DcMotorSimple.java'), 'utf8');
    expect(simple).toContain('enum Direction');
    const ex = readFileSync(join(STUBS, 'com/qualcomm/robotcore/hardware/DcMotorEx.java'), 'utf8');
    expect(ex).toContain('interface DcMotorEx extends DcMotor');
    const linear = readFileSync(join(STUBS, 'com/qualcomm/robotcore/eventloop/opmode/LinearOpMode.java'), 'utf8');
    expect(linear).toContain('class LinearOpMode extends OpMode');
  });

  it('keep hardwareMap.get generic, which is what makes the assignment compile', () => {
    const hm = readFileSync(join(STUBS, 'com/qualcomm/robotcore/hardware/HardwareMap.java'), 'utf8');
    expect(hm).toContain('<T> T get(Class<? extends T> classOrInterface, String deviceName)');
  });

  it('cover every mocked class that is not a real JDK type', () => {
    const emitted = new Set(files.map((f) => f.split('/').pop()!.replace('.java', '')));
    for (const c of ALL_NATIVE_CLASSES) {
      if (c.fqn.startsWith('java.')) continue;
      const outer = c.simple.split('.')[0]!;
      expect(emitted.has(outer), `${c.simple} has no stub`).toBe(true);
    }
  });

  it('are regenerated from the registry, so the committed copy is current', () => {
    // A stale ftc-stubs/ would make the CI gate test the wrong signatures.
    const motorMethods = ALL_NATIVE_CLASSES.find((c) => c.simple === 'DcMotor')!.methods ?? [];
    const dcMotor = readFileSync(join(STUBS, 'com/qualcomm/robotcore/hardware/DcMotor.java'), 'utf8');
    for (const m of motorMethods) {
      expect(dcMotor, `DcMotor.${m.name} missing from the stub`).toContain(` ${m.name}(`);
    }
  });
});
