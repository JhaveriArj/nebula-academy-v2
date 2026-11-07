#!/usr/bin/env node
/* Measures the contrast pairs docs/DESIGN.md commits to, straight from theme.css.
   DESIGN.md promises >=4.5:1 for text "measured in CI, not eyeballed". This is that. */
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/ui/theme.css', import.meta.url), 'utf8');
const root = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')));

const tokens = {};
for (const m of root.matchAll(/--([a-z-]+):\s*(#[0-9A-Fa-f]{6})/g)) tokens[m[1]] = m[2];

const chan = (h) => h.slice(1).match(/../g).map((x) => parseInt(x, 16) / 255);
const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const lum = (h) => {
  const [r, g, b] = chan(h).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/* [foreground, background, minimum, what it is used for] */
const PAIRS = [
  ['ink', 'hull', 4.5, 'body text on paint'],
  ['ink', 'hull-soft', 4.5, 'body text on an inset field'],
  ['ink-mid', 'hull', 4.5, 'secondary text on paint'],
  ['go', 'hull', 4.5, 'a test passed'],
  ['go', 'hull-soft', 4.5, 'a test passed, inset'],
  ['alert', 'hull', 4.5, 'the robot got confused'],
  ['alert', 'hull-soft', 4.5, 'error text, inset'],
  ['hull', 'chart', 4.5, 'text on a dark working surface'],
  ['lamp', 'chart', 4.5, 'the amber lamp on a dark surface'],
  ['seam', 'chart', 3.0, 'chart line work'],
  ['ink', 'seam', 3.0, 'focus ring against a seam'],
];

/* The amber rule from DESIGN.md: --lamp must FAIL on light paint, and the
   design depends on that failure. If someone "fixes" amber to pass on hull,
   the rule has quietly been deleted and the stylesheet needs re-reading. */
const MUST_FAIL = [['lamp', 'hull', 3.0, 'amber is a lamp; it may not sit on paint']];

let bad = 0;
const show = (fg, bg, min, why, r, ok) => {
  const line = `${ok ? 'ok  ' : 'FAIL'}  ${fg} on ${bg}  ${r.toFixed(2)}:1  (min ${min})  ${why}`;
  console.log(line);
  if (!ok) bad++;
};

for (const [fg, bg, min, why] of PAIRS) {
  if (!tokens[fg] || !tokens[bg]) {
    console.log(`FAIL  missing token --${!tokens[fg] ? fg : bg} in theme.css`);
    bad++;
    continue;
  }
  const r = ratio(tokens[fg], tokens[bg]);
  show(fg, bg, min, why, r, r >= min);
}
for (const [fg, bg, under, why] of MUST_FAIL) {
  const r = ratio(tokens[fg], tokens[bg]);
  show(fg, bg, `<${under}`, why, r, r < under);
}

if (bad) {
  console.error(`\ncontrast: ${bad} pair(s) wrong. See docs/DESIGN.md.`);
  process.exit(1);
}
console.log(`\ncontrast: ${PAIRS.length + MUST_FAIL.length} pairs ok.`);
