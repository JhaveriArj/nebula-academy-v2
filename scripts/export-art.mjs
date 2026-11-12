#!/usr/bin/env node
/* Turns Blender renders into site art. docs/ART_PIPELINE.md explains the whole loop.

   For every art/renders/<name>.png (rendered at 2x the size it shows on screen) it writes
     public/art/<name>@2x.webp   the full size, for sharp screens
     public/art/<name>.webp      half size
   with cwebp (Homebrew: `brew install webp`), so the site gains no npm dependency.
   Quality steps down until a file is under 150 KB. A render needs a hand-drawn
   public/art/<name>.svg (the fallback) and an alt text in content/art-alt.json, or it stops.

   Usage: node scripts/export-art.mjs [name ...]   (no names: every render) */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const RENDERS = join(ROOT, 'art/renders');
const OUT = join(ROOT, 'public/art');
const LIMIT = 150 * 1024;
const alt = JSON.parse(readFileSync(join(ROOT, 'content/art-alt.json'), 'utf8'));

try {
  execFileSync('cwebp', ['-version'], { stdio: 'ignore' });
} catch {
  console.error('cwebp is not installed. On a Mac: brew install webp');
  process.exit(1);
}

const wanted = process.argv.slice(2);
const names = readdirSync(RENDERS)
  .filter((f) => f.endsWith('.png'))
  .map((f) => f.slice(0, -4))
  .filter((n) => wanted.length === 0 || wanted.includes(n));
if (names.length === 0) {
  console.error(`No renders to export in art/renders/${wanted.length ? ` named ${wanted.join(', ')}` : ''}.`);
  process.exit(1);
}

let failed = false;
for (const name of names) {
  if (!existsSync(join(OUT, `${name}.svg`))) {
    console.error(`${name}: draw public/art/${name}.svg first. Every render needs an SVG to fall back to.`);
    failed = true;
    continue;
  }
  if (!alt[name]) {
    console.error(`${name}: add its alt text to content/art-alt.json.`);
    failed = true;
    continue;
  }
  const png = join(RENDERS, `${name}.png`);
  const width = readFileSync(png).readUInt32BE(16); // PNG header: width at byte 16
  for (const [file, w] of [[`${name}@2x.webp`, width], [`${name}.webp`, Math.round(width / 2)]]) {
    const out = join(OUT, file);
    for (const q of [82, 74, 66, 58]) {
      execFileSync('cwebp', ['-quiet', '-mt', '-m', '6', '-q', String(q), '-alpha_q', '60', '-resize', String(w), '0', png, '-o', out]);
      if (statSync(out).size <= LIMIT) break;
    }
    const kb = (statSync(out).size / 1024).toFixed(1);
    console.log(`${file}  ${w} px wide  ${kb} KB${statSync(out).size > LIMIT ? '  (over 150 KB even at q58)' : ''}`);
  }
}
if (failed) process.exit(1);
console.log('Done. Restart `npm run dev` (or rebuild) so the site sees new renders.');
