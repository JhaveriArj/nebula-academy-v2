import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

describe('project docs', () => {
  it('has the docs the brief requires', () => {
    for (const p of ['docs/PATHWAY.md', 'docs/DESIGN.md', 'docs/ARCHITECTURE.md', 'CLAUDE.md']) {
      expect(existsSync(join(ROOT, p)), `${p} is missing`).toBe(true);
    }
  });

  it('PATHWAY.md accounts for all 42 lessons across six tiers', () => {
    const pathway = read('docs/PATHWAY.md');
    const ids = [...pathway.matchAll(/`(t[0-5]-[a-z0-9-]+)`/g)].map((m) => m[1]);
    const unique = new Set(ids);
    expect(unique.size).toBe(42);
    for (const tier of [0, 1, 2, 3, 4, 5]) {
      const count = [...unique].filter((id) => id!.startsWith(`t${tier}-`)).length;
      expect(count, `tier ${tier} lesson count`).toBe([4, 8, 7, 8, 8, 7][tier]);
    }
  });

  it('DESIGN.md names the palette that theme.css implements', () => {
    const design = read('docs/DESIGN.md');
    const theme = read('src/ui/theme.css');
    for (const token of ['--ink', '--hull', '--seam', '--chart', '--lamp', '--go']) {
      expect(design, `${token} missing from DESIGN.md`).toContain(token);
      expect(theme, `${token} missing from theme.css`).toContain(token);
    }
  });

  it('ARCHITECTURE.md records the CheerpJ finding and the runtime decision', () => {
    const arch = read('docs/ARCHITECTURE.md');
    expect(arch).toMatch(/CheerpJ/);
    expect(arch).toMatch(/javac/);
  });
});
