import { ALL_NATIVE_CLASSES } from '../../ftc-mock/registry';

/* Real javac needs an import for every FTC SDK type a file names; this interpreter resolves
   them by simple name and does not. Builder mode (ages 13 to 18, about to move to Android
   Studio) asks for the imports anyway, through this check, so the code a kid writes here
   compiles there unchanged. Explorer stays lenient. See docs/ARCHITECTURE.md.

   The same check guards every lesson file in tests/content.test.ts. */

export interface MissingImport {
  /** The simple name used in the code, e.g. "DcMotor". */
  name: string;
  /** What to import, e.g. "com.qualcomm.robotcore.hardware.DcMotor". */
  fqn: string;
  /** The first line that names it, 1-based. */
  line: number;
}

/** Blanks comments and string contents but keeps every line break, so lines still count. */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/.*$/gm, (m) => ' '.repeat(m.length))
    .replace(/"(?:[^"\\\n]|\\.)*"/g, (m) => `"${' '.repeat(Math.max(0, m.length - 2))}"`)
    .replace(/^[ \t]*(?:package|import)\b.*$/gm, (m) => ' '.repeat(m.length));
}

export function missingImports(source: string): MissingImport[] {
  const imported = new Set<string>();
  const wildcards: string[] = [];
  for (const m of source.matchAll(/^[ \t]*import\s+(?:static\s+)?([\w.]+)(\.\*)?\s*;/gm)) {
    if (m[2]) wildcards.push(m[1]!);
    else imported.add(m[1]!.split('.').pop()!);
  }

  const lines = codeOnly(source).split('\n');
  const found = new Map<string, MissingImport>();
  for (const cls of ALL_NATIVE_CLASSES) {
    // java.lang needs no import, and a nested type is reached through its outer one.
    if (cls.fqn.startsWith('java.')) continue;
    const outer = cls.simple.split('.')[0]!;
    if (imported.has(outer) || found.has(outer)) continue;
    const pkg = cls.fqn.slice(0, cls.fqn.lastIndexOf(`.${cls.simple}`));
    if (wildcards.includes(pkg)) continue;
    const pattern = new RegExp(`\\b${outer}\\b`);
    const index = lines.findIndex((text) => pattern.test(text));
    if (index < 0) continue;
    found.set(outer, { name: outer, fqn: `${pkg}.${outer}`, line: index + 1 });
  }
  return [...found.values()].sort((a, b) => a.line - b.line || a.name.localeCompare(b.name));
}
