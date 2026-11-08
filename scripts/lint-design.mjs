#!/usr/bin/env node
/* The grep-able rules docs/DESIGN.md and CLAUDE.md commit to.
   These are promises that are easy to break by accident six weeks from now. */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const problems = [];

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'dist') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

const files = walk(ROOT);
const rel = (p) => relative(ROOT, p);

for (const file of files) {
  const ext = extname(file);

  /* --- Design rules, CSS only. theme.css is the one place a color is written. --- */
  if (ext === '.css') {
    const src = readFileSync(file, 'utf8');
    const isTheme = rel(file) === 'src/ui/theme.css';
    src.split('\n').forEach((line, i) => {
      const at = `${rel(file)}:${i + 1}`;
      if (!isTheme && /#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?|oklch)\(/.test(line))
        problems.push(`${at}  color literal. Add a token to src/ui/theme.css and use var(--token).`);
      const r = line.match(/border-radius\s*:\s*([^;]+)/);
      if (r && !isTheme && !/^(var\(--radius[a-z-]*\)|50%|0)$/.test(r[1].trim()))
        problems.push(`${at}  border-radius ${r[1].trim()}. Use a --radius-* token from theme.css.`);
      const sh = line.match(/box-shadow\s*:\s*([^;]+)/);
      if (sh && !isTheme && !/none|var\(--/.test(sh[1]))
        problems.push(`${at}  box-shadow without a token. Use a --shadow-* token from theme.css.`);
      const fs = line.match(/font-size\s*:\s*([0-9.]+)px/);
      if (fs && Number(fs[1]) < 14)
        problems.push(`${at}  font-size ${fs[1]}px. DESIGN.md: nothing a kid reads goes under 14 px.`);
      const minus = line.match(/font-size\s*:\s*calc\(var\(--size-label\)\s*-\s*([0-9.]+)px\)/);
      if (minus && Number(minus[1]) >= 2)
        problems.push(`${at}  --size-label minus ${minus[1]}px drops under 14 px in Builder. Wrap it in max(14px, ...).`);
      if (/:hover/.test(line) && !/:focus|:active|@media \(hover/.test(src))
        problems.push(`${at}  :hover with no :focus counterpart. The baseline device is a touchscreen.`);
    });
  }

  /* --- No color literals in UI code either: canvas and CodeMirror read the tokens. --- */
  if (rel(file).startsWith('src/ui/') && ext === '.ts') {
    const src = readFileSync(file, 'utf8');
    src.split('\n').forEach((line, i) => {
      if (/(^|[^\w.])(confirm|alert|prompt)\(/.test(line.replace(/\/\/.*$/, '')))
        problems.push(`${rel(file)}:${i + 1}  browser dialog. DESIGN.md: undo for undoable actions, an inline question for the rest.`);
      if (/['"`]#[0-9a-fA-F]{3,8}['"`]/.test(line))
        problems.push(`${rel(file)}:${i + 1}  color literal in UI code. Read it from theme.css instead.`);
    });
  }

  /* --- The content/src wall, from CLAUDE.md --- */
  if (rel(file).startsWith('content/')) {
    const allowed = ['.md', '.java', '.json'];
    if (!allowed.includes(ext))
      problems.push(`${rel(file)}  content/ holds Markdown, Java and JSON only. CLAUDE.md.`);
  }

  /* --- src/ may not hardcode a lesson id --- */
  if (rel(file).startsWith('src/') && (ext === '.ts' || ext === '.js')) {
    const src = readFileSync(file, 'utf8');
    src.split('\n').forEach((line, i) => {
      if (/['"`]t[0-5]-[a-z0-9-]{3,}['"`]/.test(line) && !/example|placeholder/i.test(line))
        problems.push(
          `${rel(file)}:${i + 1}  hardcoded lesson id. src/ must stay content-agnostic; read it from content/pathway.json.`,
        );
    });
  }
}

if (problems.length) {
  console.error('design lint found problems:\n');
  for (const p of problems) console.error('  ' + p);
  console.error(`\n${problems.length} problem(s).`);
  process.exit(1);
}
console.log('design lint: ok.');
