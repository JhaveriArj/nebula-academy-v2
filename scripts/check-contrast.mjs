#!/usr/bin/env node
/* Measures the contrast pairs docs/DESIGN.md commits to, straight from theme.css, in both
   the light page and the dark page. DESIGN.md promises >=4.5:1 for text "measured in CI,
   not eyeballed". This is that. */
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/ui/theme.css', import.meta.url), 'utf8');

const block = (selector) => {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`theme.css has no ${selector} block`);
  const open = css.indexOf('{', start);
  return css.slice(open, css.indexOf('}', open));
};
const read = (text) => {
  const out = {};
  for (const m of text.matchAll(/--([a-z-]+):\s*(#[0-9A-Fa-f]{6})/g)) out[m[1]] = m[2];
  return out;
};

const light = read(block(':root {'));
const dark = { ...light, ...read(block(":root[data-theme='dark'] {")) };

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

/* [foreground, background, minimum, what it is used for]. Checked in both modes. */
const PAGE = [
  ['ink', 'bg', 4.5, 'body text on the page'],
  ['ink', 'surface', 4.5, 'body text on a panel'],
  ['ink', 'surface-soft', 4.5, 'body text on an inset field'],
  ['ink-mid', 'bg', 4.5, 'secondary text on the page'],
  ['ink-mid', 'surface', 4.5, 'secondary text on a panel'],
  ['primary', 'surface-soft', 4.5, 'current step, tier number'],
  ['on-primary', 'primary', 4.5, 'text on a main button'],
  ['link', 'bg', 4.5, 'a link on the page'],
  ['link', 'surface', 4.5, 'a link on a panel'],
  ['go', 'surface', 4.5, 'a test passed'],
  ['alert', 'surface', 4.5, 'the robot got confused'],
  ['badge', 'surface', 4.5, 'the one-second celebration'],
  ['line-strong', 'surface', 3.0, 'a control border'],
];

/* Space is the same in both modes except its ground. */
const SPACE = [
  ['space-ink', 'space', 4.5, 'text on a dark screen'],
  ['space-mute', 'space', 4.5, 'secondary text on a dark screen'],
  ['space-mute', 'space-raised', 4.5, 'labels on a raised dark control'],
  ['space-dim', 'space', 4.5, 'chart notes, code gutter'],
  ['star', 'space', 4.5, 'the yellow light on a dark screen'],
  ['on-star', 'star', 4.5, 'text on the yellow start button'],
  ['space-go', 'space', 4.5, 'pass, on a dark screen'],
  ['space-alert', 'space', 4.5, 'confused, on a dark screen'],
  ['syn-comment', 'space', 4.5, 'code comments'],
  ['syn-number', 'space', 4.5, 'code numbers'],
  ['syn-string', 'space', 4.5, 'code strings'],
  ['syn-type', 'space', 4.5, 'code types'],
  ['space-route', 'space', 2.0, 'chart route line work'],
];

/* The yellow rule from DESIGN.md: --star must FAIL as text on the light page, and the
   design depends on that failure. If someone "fixes" it to pass, the rule has quietly
   been deleted and the stylesheet needs re-reading. */
const MUST_FAIL = [['star', 'bg', 3.0, 'yellow is a light; it may not carry text on the light page']];

let bad = 0;
let count = 0;
const check = (mode, t, fg, bg, min, why) => {
  count++;
  if (!t[fg] || !t[bg]) {
    console.log(`FAIL  [${mode}] missing token --${!t[fg] ? fg : bg} in theme.css`);
    bad++;
    return;
  }
  const r = ratio(t[fg], t[bg]);
  const ok = r >= min;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  [${mode}] ${fg} on ${bg}  ${r.toFixed(2)}:1  (min ${min})  ${why}`);
  if (!ok) bad++;
};

for (const [mode, t] of [['light', light], ['dark', dark]]) {
  for (const pair of [...PAGE, ...SPACE]) check(mode, t, ...pair);
}
for (const [fg, bg, under, why] of MUST_FAIL) {
  count++;
  const r = ratio(light[fg], light[bg]);
  const ok = r < under;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  [light] ${fg} on ${bg}  ${r.toFixed(2)}:1  (must be <${under})  ${why}`);
  if (!ok) bad++;
}

if (bad) {
  console.error(`\ncontrast: ${bad} pair(s) wrong. See docs/DESIGN.md.`);
  process.exit(1);
}
console.log(`\ncontrast: ${count} pairs ok.`);
