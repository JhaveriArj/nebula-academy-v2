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

  /* --- Design rules, CSS only --- */
  if (ext === '.css') {
    const src = readFileSync(file, 'utf8');
    src.split('\n').forEach((line, i) => {
      const at = `${rel(file)}:${i + 1}`;
      if (/box-shadow\s*:\s*(?!none)/.test(line))
        problems.push(`${at}  box-shadow. DESIGN.md: no shadows anywhere; panels use one --seam hairline.`);
      const r = line.match(/border-radius\s*:\s*([0-9.]+)px/);
      if (r && Number(r[1]) > 3)
        problems.push(`${at}  border-radius ${r[1]}px. DESIGN.md caps it at 3px.`);
      if (/:hover/.test(line) && !/:focus|:active|@media \(hover/.test(src))
        problems.push(`${at}  :hover with no :focus counterpart. The baseline device is a touchscreen.`);
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
