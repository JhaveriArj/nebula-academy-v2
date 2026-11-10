import { el, svg } from './dom';
import { mascotHead } from './mascot';
import { playWatch, type WatchSpec } from '../sim/watch';
import { FIELD_CM } from '../sim/field';

/* The graphic kit: every drawn element the site shares, in one place, so a lesson, a mentor
   guide and the star chart use the same hand, the same stroke and the same two materials
   (night navy and cream paper) as the landing page. Colours come from tokens via the kit-*
   classes in app.css; nothing here writes a colour down.

   1. mascot()        the character, from art-source/mascot-4x.png, in three crops
   2. fieldThumb()    any robot path, drawn on a 6x6 field
   3. tierEmblem()    six drawn tier marks on a 32px grid, 2px round strokes
   4. paper()         the cream card, plain, torn or pinned, with a faint grain
   5. marks           the wobble filter, circled numbers, a swash, a tick, an arrow
   6. codeChip()      a token of code, on dark or on paper
   7. nebula()        the grain and soft light behind a page, with a density from 0 to 1 */

// ------------------------------------------------------------------ 5. the hand

const WOBBLE_ID = 'kit-wobble';

/** The hand-drawn filter lives once per document; every ink mark refers to it. */
export function ensureInk(): void {
  if (document.getElementById(WOBBLE_ID)) return;
  document.body.appendChild(
    svg('svg', { class: 'kit-defs', width: '0', height: '0', 'aria-hidden': 'true', focusable: 'false' },
      // A fixed region in user units: a percentage of the bounding box is zero for a perfectly
      // straight line, and the filtered line would vanish.
      svg('filter', { id: WOBBLE_ID, filterUnits: 'userSpaceOnUse', x: '-1000', y: '-1000', width: '4000', height: '4000' },
        svg('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.035', numOctaves: '2', seed: '7', result: 'n' }),
        svg('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: '4' }),
      ),
    ),
  );
}
const ink = { filter: `url(#${WOBBLE_ID})` };

/** A number with a loose ink circle round it, like the "0" on the landing page's tier list. */
export function circledNumber(n: number | string, size = 64): HTMLElement {
  ensureInk();
  return el('span', { class: 'kit-circled', style: `--size:${size}px` },
    el('span', { class: 'kit-circled-n', text: String(n) }),
    svg('svg', { class: 'kit-circle', viewBox: '0 0 100 100', 'aria-hidden': 'true' },
      svg('path', { d: 'M58 9 C 24 4, 6 30, 9 55 C 12 82, 42 95, 66 88 C 90 80, 97 52, 88 30 C 82 16, 68 9, 47 12', pathLength: '1', ...ink })),
  );
}

/** An underline drawn in one stroke, a little uneven. */
export function swash(width = 160): SVGElement {
  ensureInk();
  return svg('svg', { class: 'kit-swash', viewBox: '0 0 160 16', width: String(width), height: String(width / 10), 'aria-hidden': 'true' },
    svg('path', { d: 'M3 11 C 30 5, 60 4, 90 7 C 110 9, 130 10, 157 5', pathLength: '1', ...ink }));
}

/** A tick in the same hand. */
export function inkCheck(size = 24): SVGElement {
  ensureInk();
  return svg('svg', { class: 'kit-check', viewBox: '0 0 24 24', width: String(size), height: String(size), 'aria-hidden': 'true' },
    svg('path', { d: 'M4 13 L10 19 L20 5', pathLength: '1', ...ink }));
}

/** An arrow, drawn curving, for pointing at something on paper. */
export function inkArrow(size = 48): SVGElement {
  ensureInk();
  return svg('svg', { class: 'kit-arrow', viewBox: '0 0 48 32', width: String(size), height: String((size * 2) / 3), 'aria-hidden': 'true' },
    svg('path', { d: 'M4 26 C 14 8, 30 6, 42 12 M34 6 L43 12 L35 19', pathLength: '1', ...ink }));
}

// ------------------------------------------------------------------ 1. the mascot

export type MascotPose = 'full' | 'head' | 'peek';
const ART = `${import.meta.env.BASE_URL}art`;

/** The character. `full` stands on its own feet (with a cast shadow when it has ground to
    stand on), `head` is the head alone (vector under 48px, so it stays crisp in a header),
    `peek` is head and shoulders, cut off by whatever edge it is placed behind. Decorative by
    default; pass `alt` when the picture says something the text does not. */
export function mascot(pose: MascotPose, options: { height?: number; shadow?: boolean; alt?: string } = {}): HTMLElement {
  const { height = 160, shadow = pose === 'full', alt = '' } = options;
  const a11y = alt ? {} : { 'aria-hidden': 'true' };
  if (pose === 'head' && height <= 48) {
    return el('span', { class: 'kit-mascot is-head is-vector', style: `--h:${height}px`, ...a11y }, mascotHead(height));
  }
  const src = {
    full: { file: 'mascot-hero-560.webp', srcset: `${ART}/mascot-hero-560.webp 560w, ${ART}/mascot-hero-1108.webp 1108w`, w: 560, h: 1233 },
    head: { file: 'mascot-head-512.webp', srcset: `${ART}/mascot-head-512.webp 512w`, w: 512, h: 522 },
    peek: { file: 'mascot-peek-560.webp', srcset: `${ART}/mascot-peek-560.webp 560w`, w: 560, h: 718 },
  }[pose];
  const width = Math.round((height * src.w) / src.h);
  return el('span', { class: `kit-mascot is-${pose}${shadow ? ' has-shadow' : ''}`, style: `--h:${height}px` },
    el('img', {
      src: `${ART}/${src.file}`,
      srcset: src.srcset,
      sizes: `${width}px`,
      width: String(src.w),
      height: String(src.h),
      alt,
      loading: 'lazy',
      decoding: 'async',
    }),
  );
}

// ------------------------------------------------------------------ 2. field thumbnails

export interface Point { x: number; y: number }
export interface Pose extends Point { headingDeg: number }

/** The route a watch script drives, as field points, plus where the robot ends up. */
export function routeOf(spec: WatchSpec): { points: Point[]; start: Pose; end: Pose } {
  const frames = playWatch(spec);
  const last = frames[frames.length - 1]!.snapshot;
  const trail = last.trail ?? [];
  const first = frames[0]!.snapshot.pose;
  return { points: trail, start: { ...first }, end: { ...last.pose } };
}

/** A lesson's path on a 6x6 field: tiles, where the robot starts (dashed), where it stops
    (solid), and the route between in the yellow ink. `tone: 'wrong'` draws the route in the
    alert colour, for "this is what the bug looks like". */
export function fieldThumb(route: { points: Point[]; start: Pose; end: Pose }, options: { size?: number; label: string; tone?: 'right' | 'wrong' } ): SVGElement {
  ensureInk();
  const { size = 120, label, tone = 'right' } = options;
  const k = 120 / FIELD_CM;
  const X = (x: number) => (x * k).toFixed(1);
  const Y = (y: number) => ((FIELD_CM - y) * k).toFixed(1);
  // Start pose, the trail, then the end pose: a straight drive leaves too few trail points
  // to draw on its own.
  const pts = [route.start, ...route.points.filter((_, i, all) => i % 2 === 0 || i === all.length - 1), route.end];
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${X(p.x)} ${Y(p.y)}`).join(' ');
  const robot = (pose: Pose, cls: string) =>
    svg('rect', { x: '-5', y: '-5', width: '10', height: '10', rx: '1.5', class: cls,
      transform: `translate(${X(pose.x)} ${Y(pose.y)}) rotate(${-pose.headingDeg})` });
  return svg('svg', { class: `kit-thumb is-${tone}`, viewBox: '0 0 120 120', width: String(size), height: String(size), role: 'img', 'aria-label': label },
    svg('rect', { class: 'kit-thumb-floor', x: '0', y: '0', width: '120', height: '120', rx: '6' }),
    ...[20, 40, 60, 80, 100].flatMap((v) => [
      svg('line', { class: 'kit-thumb-grid', x1: String(v), y1: '0', x2: String(v), y2: '120' }),
      svg('line', { class: 'kit-thumb-grid', x1: '0', y1: String(v), x2: '120', y2: String(v) }),
    ]),
    robot(route.start, 'kit-thumb-start'),
    svg('path', { class: 'kit-thumb-route', d, ...ink }),
    robot(route.end, 'kit-thumb-robot'),
  );
}

// ------------------------------------------------------------------ 3. tier emblems

/* Drawn on a 32px grid, 2px strokes, round caps and joins, no fills, currentColor. Each says
   what its tier is about: the robot leaving the pad; going round (loops); two parts docking
   (methods and objects); a gamepad (a TeleOp you drive); a route with its flag (the robot
   drives itself); a compass star (out to a real robot, the deep end). */
const EMBLEMS: string[][] = [
  // 0 Launchpad
  ['M16 4 C 20 8 21 13 20 19 H 12 C 11 13 12 8 16 4 Z', 'M16 10.5 a 1.8 1.8 0 1 0 0.01 0', 'M12 15 L 9 20 L 12 19.5', 'M20 15 L 23 20 L 20 19.5', 'M14.5 22.5 L 16 25.5 L 17.5 22.5', 'M6 28 H 26'],
  // 1 Orbit
  ['M16 11 a 5 5 0 1 0 0.01 0', 'M4.5 21.5 C 2 17, 10 10.5, 20 8.5 C 28 7, 31 10, 27.5 13.5', 'M27.5 13.5 m -1.5 0 a 1.5 1.5 0 1 0 3 0 a 1.5 1.5 0 1 0 -3 0', 'M8.5 23.5 C 13 24.5, 19 23, 24 20'],
  // 2 Docking
  ['M3 11 H 11 V 21 H 3', 'M29 11 H 21 V 21 H 29', 'M11 16 H 15.5', 'M21 13 L 17.5 16 L 21 19', 'M6 8 V 6', 'M26 8 V 6'],
  // 3 First Flight
  ['M10 10 H 22 C 26.5 10 29 16 27.5 21.5 C 26.7 24.5 23.5 24.5 21.5 21.5 H 10.5 C 8.5 24.5 5.3 24.5 4.5 21.5 C 3 16 5.5 10 10 10 Z', 'M10 14 V 18', 'M8 16 H 12', 'M21 14.5 h 0.01', 'M23.5 17 h 0.01'],
  // 4 Mission Control
  ['M5 26 C 10 26 10 17 16 17 C 22 17 21 9 26 9', 'M5 26 h 0.01', 'M26 9 V 3 L 30 4.5 L 26 6', 'M12 21.5 h 0.01', 'M19.5 13.5 h 0.01'],
  // 5 Deep Space
  ['M16 3 L 18.5 13.5 L 29 16 L 18.5 18.5 L 16 29 L 13.5 18.5 L 3 16 L 13.5 13.5 Z', 'M24.5 6.5 h 0.01', 'M7 25.5 h 0.01', 'M26 25 h 0.01'],
];

export const TIER_EMBLEM_NAMES = ['Launchpad', 'Orbit', 'Docking', 'First Flight', 'Mission Control', 'Deep Space'];

export function tierEmblem(tier: number, size = 32, label?: string): SVGElement {
  const paths = EMBLEMS[tier] ?? EMBLEMS[0]!;
  return svg('svg', {
    class: 'kit-emblem',
    viewBox: '0 0 32 32',
    width: String(size),
    height: String(size),
    ...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' }),
  }, ...paths.map((d) => svg('path', { d })));
}

// ------------------------------------------------------------------ 4. paper

export type PaperVariant = 'plain' | 'torn' | 'pinned';

/** The cream card. `torn` has a ripped bottom edge; `pinned` has a drawn pin through its
    top. One shadow, no rotation (the tilt is for the landing page's rubric alone). */
export function paper(variant: PaperVariant, ...children: (Node | string | null)[]): HTMLElement {
  return el('div', { class: `kit-paper is-${variant}` },
    variant === 'pinned'
      ? svg('svg', { class: 'kit-pin', viewBox: '0 0 24 32', width: '24', height: '32', 'aria-hidden': 'true' },
          svg('path', { class: 'kit-pin-needle', d: 'M12 14 L 12 30' }),
          svg('circle', { class: 'kit-pin-head', cx: '12', cy: '9', r: '7' }),
          svg('circle', { class: 'kit-pin-shine', cx: '9.5', cy: '6.5', r: '2' }))
      : null,
    ...children,
  );
}

// ------------------------------------------------------------------ 6. code chips

export function codeChip(text: string, tone: 'dark' | 'paper' = 'dark'): HTMLElement {
  return el('code', { class: `kit-chip is-${tone}`, text });
}

// ------------------------------------------------------------------ 7. the nebula

/** The night behind a page: two soft lights off-centre and a fine grain. `density` runs from
    0 (plain navy) to 1 (as rich as the landing hero); inner pages sit around 0.3. */
export function nebula(density = 1): HTMLElement {
  const d = Math.max(0, Math.min(1, density));
  return el('div', { class: 'kit-nebula', style: `--density:${d}`, 'aria-hidden': 'true' });
}

// ------------------------------------------------------------------ step icons

/* The lesson's steps, drawn like the tier emblems (24px grid, 2px round strokes): a telescope
   to look at the mission, a play triangle for the demo, a book to learn, a keyboard to try,
   a ticked box for the checks, a rocket for the boost. */
const STEP_ICONS: Record<string, string[]> = {
  mission: ['M4 13 L15 7.5 L17 11.5 L6 17 Z', 'M15 7.5 L19 5.5 L21 9.5 L17 11.5', 'M10 15 L8.5 21', 'M10 15 L13.5 20.5', 'M3.5 13.5 L5.5 17.5'],
  watch: ['M8 5.5 L19 12 L8 18.5 Z'],
  learn: ['M12 6.5 C 9.5 5 6.5 4.5 3.5 5 V 18.5 C 6.5 18 9.5 18.5 12 20 C 14.5 18.5 17.5 18 20.5 18.5 V 5 C 17.5 4.5 14.5 5 12 6.5 Z', 'M12 6.5 V 20'],
  try: ['M3 7 H 21 V 18 H 3 Z', 'M6.5 10.5 h 0.01', 'M10 10.5 h 0.01', 'M13.5 10.5 h 0.01', 'M17 10.5 h 0.01', 'M7.5 14.5 H 16.5'],
  check: ['M4 4 H 20 V 20 H 4 Z', 'M8 12.5 L 11 15.5 L 16.5 9'],
  boost: ['M12 3 C 15.5 6 16.5 10 15.5 15 H 8.5 C 7.5 10 8.5 6 12 3 Z', 'M12 8.5 a 1.5 1.5 0 1 0 0.01 0', 'M8.5 12.5 L 6 16.5 L 8.5 16', 'M15.5 12.5 L 18 16.5 L 15.5 16', 'M10.5 18 L 12 21 L 13.5 18'],
};

export function stepIcon(name: string, size = 20): SVGElement {
  return svg('svg', { class: 'kit-step-icon', viewBox: '0 0 24 24', width: String(size), height: String(size), 'aria-hidden': 'true' },
    ...(STEP_ICONS[name] ?? STEP_ICONS['watch']!).map((d) => svg('path', { d })));
}
