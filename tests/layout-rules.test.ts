import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* Layout rules from docs/DESIGN.md that a big stylesheet edit can delete without any other
   test noticing. One of them already went missing once. */
const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/ui/app.css'), 'utf8');

describe('app.css keeps the rules DESIGN.md depends on', () => {
  it('holds the lesson page to the screen at desktop sizes (it stacks and scrolls at 900px and below)', () => {
    expect(css).toMatch(/@media \(min-width: 901px\) and \(min-height: 561px\)\s*\{\s*#app:has\(\.lesson\)\s*\{[^}]*height: 100dvh/);
  });

  it('gives the chart page its full width inside the flex outlet', () => {
    expect(css).toMatch(/\.chart-page \{ width: 100%;/);
  });

  it('keeps the gamepad in two rows', () => {
    expect(css).toMatch(/\.pad-main \{[^}]*grid-template-columns: auto auto;/);
  });
});
