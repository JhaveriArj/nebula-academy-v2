import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* The swap-in rule (docs/ART_PIPELINE.md): every Blender render in public/art has its SVG
   fallback beside it, both sizes, an alt text, and stays under 150 KB. */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ART = join(ROOT, 'public/art');
const alt = JSON.parse(readFileSync(join(ROOT, 'content/art-alt.json'), 'utf8')) as Record<string, string>;
const renders = readdirSync(ART).filter((f) => f.endsWith('@2x.webp')).map((f) => f.slice(0, -'@2x.webp'.length));

describe('rendered art', () => {
  it.each(renders)('%s has an SVG fallback, both sizes, alt text, and fits the budget', (name) => {
    expect(existsSync(join(ART, `${name}.svg`)), `public/art/${name}.svg`).toBe(true);
    expect(existsSync(join(ART, `${name}.webp`)), `public/art/${name}.webp`).toBe(true);
    expect(alt[name], `content/art-alt.json has no "${name}"`).toBeTruthy();
    for (const file of [`${name}.webp`, `${name}@2x.webp`]) {
      expect(statSync(join(ART, file)).size, file).toBeLessThanOrEqual(150 * 1024);
    }
  });

  it('renders in the palette theme.css defines', () => {
    const theme = readFileSync(join(ROOT, 'src/ui/theme.css'), 'utf8').toUpperCase();
    const palette = readFileSync(join(ROOT, 'art/scenes/common.py'), 'utf8').match(/#[0-9A-Fa-f]{6}/g) ?? [];
    expect(palette.length).toBeGreaterThan(5);
    for (const hex of palette) expect(theme, `${hex} in art/scenes/common.py is not in theme.css`).toContain(hex.toUpperCase());
  });

  it('gives every SVG an alt text', () => {
    for (const f of readdirSync(ART).filter((f) => f.endsWith('.svg'))) {
      expect(alt[f.slice(0, -4)], `content/art-alt.json has no "${f.slice(0, -4)}"`).toBeTruthy();
    }
  });
});
