import { el } from '../dom';
import {
  TIER_EMBLEM_NAMES, circledNumber, codeChip, fieldThumb, inkArrow, inkCheck, mascot, nebula, paper, routeOf, swash, tierEmblem,
} from '../kit';
import { HERO_SPEC, LESSON_ONE_RUN, LESSON_ONE_START } from '../heroDemo';
import type { WatchSpec } from '../../sim/watch';

const mistakeFiles = import.meta.glob('../../../content/mentor/*.mistakes.json', { eager: true, import: 'default' }) as Record<string, { mistakes: { mistake: number; caption: string; watch: WatchSpec; expected?: WatchSpec }[] }>;

/* A contact sheet of every component in src/ui/kit.ts, for reviewing the kit. Development
   only: app.ts mounts it at #/kit when import.meta.env.DEV, so it never ships. */

const square = (turnMs: number, sides = 4): WatchSpec => ({
  robot: 'tank',
  start: HERO_SPEC.start!,
  withElements: false,
  durationMs: sides * (1500 + turnMs) + 200,
  steps: [
    ...Array.from({ length: sides }, (_, i) => [
      { atMs: i * (1500 + turnMs), motors: { leftDrive: 0.8, rightDrive: 0.8 } },
      { atMs: i * (1500 + turnMs) + 1500, motors: { leftDrive: -0.5, rightDrive: 0.5 } },
    ]).flat(),
    { atMs: sides * (1500 + turnMs), motors: { leftDrive: 0, rightDrive: 0 } },
  ],
});
const straight = (ms: number): WatchSpec => ({
  robot: 'tank', start: LESSON_ONE_START, withElements: false, durationMs: ms + 200,
  steps: [{ atMs: 0, motors: { leftDrive: 0.5, rightDrive: 0.5 } }, { atMs: ms, motors: { leftDrive: 0, rightDrive: 0 } }],
});

export function kitSheet(): HTMLElement {
  const row = (title: string, note: string, ...specimens: HTMLElement[]) =>
    el('section', { class: 'kit-row' },
      el('h2', {}, title, el('span', { text: note })),
      el('div', { class: 'kit-specimens' }, ...specimens));
  const spec = (caption: string, ...content: (Node | string)[]) =>
    el('figure', { class: 'kit-specimen' }, ...content, el('figcaption', { text: caption }));

  return el('div', { class: 'kit-sheet' },
    nebula(0.35),
    el('h1', { text: 'Graphic kit' }),
    el('p', { class: 'kit-sheet-lede', text: 'Every shared graphic from src/ui/kit.ts, at the sizes the pages will use. Night navy and cream paper, one hand, 2px strokes.' }),

    row('1 Mascot', 'art-source/mascot-4x.png',
      spec('full, with cast shadow, 200px', mascot('full', { height: 200 })),
      spec('full, no ground, 120px', mascot('full', { height: 120, shadow: false })),
      spec('head, raster, 96px', mascot('head', { height: 96 })),
      spec('head, vector, 28px', mascot('head', { height: 28 })),
      spec('peek, behind an edge', el('div', { class: 'kit-peek-edge' }, mascot('peek', { height: 200, shadow: false }))),
      spec('pointing: not in the art',
        el('p', { class: 'kit-sheet-lede', style: 'max-width:22ch;margin:0', text: 'The master is one standing pose; a pointing arm has to be drawn, not cropped.' })),
    ),

    row('2 Field thumbnails', 'routeOf(spec) + fieldThumb()',
      spec('lesson 1, 120px', fieldThumb(routeOf(LESSON_ONE_RUN), { label: 'Lesson 1: drives 100 cm forward' })),
      spec('the hero square', fieldThumb(routeOf(HERO_SPEC), { label: 'A square, back where it started' })),
      spec('wrong: turns too long', fieldThumb(routeOf(square(1100)), { label: 'Each turn goes too far, so the square opens out', tone: 'wrong' })),
      spec('wrong: sleep too long', fieldThumb(routeOf(straight(6000)), { label: 'Drives straight into the far wall', tone: 'wrong' })),
      spec('64px, in a list', fieldThumb(routeOf(LESSON_ONE_RUN), { size: 64, label: 'Lesson 1' })),
    ),

    row('3 Tier emblems', '32px grid, 2px round strokes',
      ...TIER_EMBLEM_NAMES.map((name, t) => spec(`${t} ${name}`, tierEmblem(t, 32, name))),
      ...[0, 3, 5].map((t) => spec(`${t} at 96px`, tierEmblem(t, 96))),
    ),

    row('4 Paper', 'plain, torn, pinned',
      spec('plain', el('div', { style: 'width:240px' }, paper('plain', el('p', { style: 'margin:0', text: 'The cream card, one shadow, a faint grain.' })))),
      spec('torn', el('div', { style: 'width:240px' }, paper('torn', el('p', { style: 'margin:0', text: 'Ripped along the bottom, like a page out of the notebook.' })))),
      spec('pinned', el('div', { style: 'width:240px' }, paper('pinned', el('p', { style: 'margin:0' }, 'All checks passed. ', codeChip('sleep(2000)', 'paper'), ' was the one.')))),
      spec('paper with a mascot', el('div', { class: 'kit-on-paper', style: 'width:240px' }, paper('plain', mascot('full', { height: 110 })))),
    ),

    row('5 Hand marks', 'one wobble filter for all of them',
      spec('circled number, 64px', circledNumber(0, 64)),
      spec('circled number, 40px', circledNumber(12, 40)),
      spec('swash', swash(180)),
      spec('tick', inkCheck(32)),
      spec('arrow', inkArrow(56)),
      spec('on paper', el('div', { style: 'width:200px' }, paper('plain', el('span', { style: 'display:flex;gap:12px;align-items:center' }, inkCheck(28), inkArrow(48), circledNumber(3, 40))))),
    ),

    row('6 Code chips', 'dark and paper',
      spec('dark', el('p', { style: 'margin:0' }, 'Set ', codeChip('leftDrive.setPower(0.5);'), ' then wait.')),
      spec('paper', el('div', { style: 'width:280px' }, paper('plain', el('p', { style: 'margin:0' }, 'They write ', codeChip('int speed = 0.6;', 'paper'), ' and the error names both types.')))),
    ),

    row('8 Mentor margin pictures', 'content/mentor/tier-N.mistakes.json',
      ...Object.entries(mistakeFiles).flatMap(([file, data]) => data.mistakes.map((m) =>
        spec(`${file.match(/tier-\d/)![0]} #${m.mistake}`, fieldThumb(routeOf(m.watch), { label: m.caption, tone: 'wrong', ...(m.expected ? { ghost: routeOf(m.expected) } : {}) }))))),

    row('7 Nebula', 'density 0, 0.3, 0.6, 1',
      ...[0, 0.3, 0.6, 1].map((d) => spec(`density ${d}`, el('div', { class: 'kit-nebula-box' }, nebula(d)))),
    ),
  );
}
