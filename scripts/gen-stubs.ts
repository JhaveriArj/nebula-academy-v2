/* Generates ftc-stubs/**.java from src/ftc-mock/ for the real-javac gate in CI.

   Compiling every starter.java and solution.java against these stubs is the guarantee
   behind "a kid's code pastes into Android Studio unchanged" — if a lesson file is not
   genuinely valid Java against the real package names and signatures, CI fails.
   Run: npm run gen:stubs */
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_NATIVE_CLASSES } from '../src/ftc-mock/registry';
import type { NativeClass } from '../src/ftc-mock/types';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'ftc-stubs');

const PRIMITIVES = new Set(['int', 'long', 'short', 'byte', 'double', 'float', 'boolean', 'char', 'void']);
const JDK = new Set(['String', 'Object', 'Class', 'CharSequence', 'Integer', 'Double', 'Boolean', 'Long', 'Float', 'Character', 'Number']);

/** java.* classes are real JDK types; emitting them would shadow the real ones. */
const emitted = ALL_NATIVE_CLASSES.filter((c) => !c.fqn.startsWith('java.'));

interface Outer {
  fqn: string;
  simple: string;
  pkg: string;
  self: NativeClass | null;
  nested: NativeClass[];
}

const outers = new Map<string, Outer>();

const pkgOf = (fqn: string, simple: string) => fqn.slice(0, fqn.length - simple.length - 1);

for (const c of emitted) {
  const parts = c.simple.split('.');
  if (parts.length === 1) {
    const pkg = pkgOf(c.fqn, c.simple);
    const o = outers.get(c.simple) ?? { fqn: c.fqn, simple: c.simple, pkg, self: null, nested: [] };
    o.self = c;
    o.fqn = c.fqn;
    o.pkg = pkg;
    outers.set(c.simple, o);
  } else {
    const outerName = parts[0]!;
    const outerFqn = c.fqn.slice(0, c.fqn.length - c.simple.length + outerName.length);
    const pkg = pkgOf(outerFqn, outerName);
    const o = outers.get(outerName) ?? { fqn: outerFqn, simple: outerName, pkg, self: null, nested: [] };
    o.nested.push(c);
    if (!o.self) {
      o.fqn = outerFqn;
      o.pkg = pkg;
    }
    outers.set(outerName, o);
  }
}

/** Where each simple name lives, for imports. */
const home = new Map<string, string>();
for (const o of outers.values()) home.set(o.simple, o.fqn);

const defaultBody = (returns: string): string => {
  if (returns === 'void') return ' { }';
  if (returns === 'boolean') return ' { return false; }';
  if (PRIMITIVES.has(returns)) return ' { return 0; }';
  return ' { return null; }';
};

/** Collect the outer type names a declaration mentions, so we can import them. */
function referenced(c: NativeClass, into: Set<string>): void {
  const add = (t: string) => {
    const head = t.replace(/\[\]$/, '').split('.')[0]!;
    if (!PRIMITIVES.has(head) && !JDK.has(head)) into.add(head);
  };
  for (const f of c.fields ?? []) add(f.type);
  for (const m of c.methods ?? []) {
    add(m.returns);
    m.params.forEach(add);
  }
  for (const k of c.constructors ?? []) k.params.forEach(add);
  if (c.extends) add(c.extends);
  for (const i of c.implements ?? []) add(i);
}

function renderMembers(c: NativeClass, indent: string, isInterface: boolean): string[] {
  const out: string[] = [];

  for (const f of c.fields ?? []) {
    out.push(`${indent}public ${f.isStatic ? 'static ' : ''}${f.type} ${f.name};`);
  }
  if ((c.fields ?? []).length) out.push('');

  for (const k of c.constructors ?? []) {
    out.push(`${indent}public ${c.simple.split('.').pop()}(${k.params.map((p, i) => `${p} a${i}`).join(', ')}) { }`);
  }
  if ((c.constructors ?? []).length) out.push('');

  const seen = new Set<string>();
  for (const m of c.methods ?? []) {
    if (m.stub) {
      out.push(`${indent}${m.stub}${isInterface ? ';' : defaultBody(m.returns)}`);
      continue;
    }
    const params = m.params.map((p, i) => {
      const varargs = m.varargs && i === m.params.length - 1;
      return `${p}${varargs ? '...' : ''} a${i}`;
    });
    const sig = `${m.name}(${params.join(', ')})`;
    // Two overloads can collide once parameter names are erased; keep the first.
    const key = `${m.name}/${m.params.join(',')}/${m.varargs ? 'v' : ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const mods = isInterface ? '' : `public ${m.isStatic ? 'static ' : ''}`;
    const throws = m.name === 'runOpMode' ? ' throws InterruptedException' : '';
    out.push(`${indent}${mods}${m.returns} ${sig}${throws}${isInterface ? ';' : defaultBody(m.returns)}`);
  }
  return out;
}

function renderType(c: NativeClass, indent: string, nested: boolean): string[] {
  const name = c.simple.split('.').pop()!;
  const mods = nested ? 'public static' : 'public';
  const out: string[] = [];

  if (c.kind === 'annotation') {
    out.push(`${indent}${nested ? 'public' : 'public'} @interface ${name} {`);
    for (const e of c.annotationElements ?? []) out.push(`${indent}    String ${e}() default "";`);
    out.push(`${indent}}`);
    return out;
  }

  if (c.kind === 'enum') {
    out.push(`${indent}${nested ? 'public' : 'public'} enum ${name} {`);
    out.push(`${indent}    ${(c.enumConstants ?? []).join(', ')};`);
    const members = renderMembers(c, `${indent}    `, false);
    if (members.length) {
      out.push('');
      out.push(...members);
    }
    out.push(`${indent}}`);
    return out;
  }

  if (c.kind === 'interface') {
    const ext = c.extends ? ` extends ${c.extends}` : '';
    out.push(`${indent}${nested ? 'public' : 'public'} interface ${name}${ext} {`);
    out.push(...renderMembers(c, `${indent}    `, true));
    out.push(`${indent}}`);
    return out;
  }

  const ext = c.extends ? ` extends ${c.extends}` : '';
  const impl = (c.implements ?? []).length ? ` implements ${(c.implements ?? []).join(', ')}` : '';
  out.push(`${indent}${mods} class ${name}${ext}${impl} {`);
  out.push(...renderMembers(c, `${indent}    `, false));
  out.push(`${indent}}`);
  return out;
}

rmSync(OUT, { recursive: true, force: true });

let files = 0;
for (const o of outers.values()) {
  const refs = new Set<string>();
  if (o.self) referenced(o.self, refs);
  for (const n of o.nested) referenced(n, refs);
  // A nested type's own name resolves without an import.
  refs.delete(o.simple);
  for (const n of o.nested) refs.delete(n.simple.split('.')[0]!);

  const imports = [...refs]
    .flatMap((r) => {
      const fqn = home.get(r);
      if (!fqn) return [];
      return pkgOf(fqn, fqn.split('.').pop()!) === o.pkg ? [] : [fqn];
    })
    .sort()
    .map((fqn) => `import ${fqn};`);

  const lines: string[] = [
    '// Generated by npm run gen:stubs. Do not edit.',
    '// Signature-only stubs of the mocked FTC SDK, used by the real-javac gate in CI',
    '// so that every lesson file is proven to be valid Java. See docs/ARCHITECTURE.md.',
    `package ${o.pkg};`,
    '',
  ];
  if (imports.length) lines.push(...imports, '');

  const self: NativeClass =
    o.self ??
    // A parent that only exists to hold nested types, e.g. DcMotorSimple holds Direction.
    { fqn: o.fqn, simple: o.simple, kind: 'interface', methods: [] };

  const body = renderType(self, '', false);
  // Splice the nested types in before the closing brace.
  const close = body.length - 1;
  const nestedLines = o.nested.flatMap((n) => ['', ...renderType(n, '    ', true)]);
  lines.push(...body.slice(0, close), ...nestedLines, body[close]!);

  const path = join(OUT, ...o.pkg.split('.'), `${o.simple}.java`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, lines.join('\n') + '\n');
  files++;
}

console.log(`gen:stubs  ${files} .java stub files -> ftc-stubs/`);
