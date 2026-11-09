import { el, svg, prefersReducedMotion } from '../dom';
import { createFieldView } from '../components/field';
import { playWatch, type WatchSpec } from '../../sim/watch';
import { counts, hasChosenMode, isPassed, setMode, type Mode } from '../../progress/store';
import { applyMode } from '../header';
import { pathway } from '../../content/loader';
import { FIELD_CM } from '../../sim/field';
import { lessonHref } from '../router';
import { frameIndex } from '../frames';

/* The home page: an FTC team's engineering notebook, read at night.

   Two materials on purpose. Everything that teaches (type, spacing, the simulator, the code)
   is precise. Everything the mascot touches is drawn by hand: the paper, the ink marks, the
   route the robot leaves behind. One moment carries the color: the route drawing itself in
   yellow on load. Nothing else moves except hover. See docs/DESIGN.md. */

const HERO: WatchSpec = {
  robot: 'mecanum',
  start: { x: 120, y: 120, headingDeg: 0 },
  withElements: true,
  durationMs: 6400,
  steps: [
    { atMs: 0, motors: { frontLeft: 0.55, frontRight: -0.55, backLeft: 0.55, backRight: -0.55 } },
    { atMs: 1500, motors: { frontLeft: 0.55, frontRight: 0.55, backLeft: -0.55, backRight: -0.55 } },
    { atMs: 3000, motors: { frontLeft: -0.55, frontRight: 0.55, backLeft: -0.55, backRight: 0.55 } },
    { atMs: 3700, motors: { frontLeft: 0.55, frontRight: -0.55, backLeft: 0.55, backRight: -0.55 } },
    { atMs: 5000, motors: { frontLeft: 0, frontRight: 0, backLeft: 0, backRight: 0 }, servos: { clawServo: 1 } },
  ],
};

export function homePage(): HTMLElement {
  const field = createFieldView({ label: 'The simulator: a robot driving a short route on a 12 foot field', instrument: true });
  const frames = playWatch(HERO);

  const everyLesson = pathway.tiers.flatMap((t) => t.lessons);
  // The first lesson they have not passed, or the very first one. Read from
  // content/pathway.json rather than named here, which the design lint enforces.
  const next = everyLesson.find((l) => !isPassed(l.id)) ?? everyLesson[0];
  const startAt = next?.id ?? '';
  const { passed } = counts();
  const returning = passed > 0;
  const currentTier = pathway.tiers.find((t) => t.lessons.some((l) => l.id === startAt))?.tier ?? 0;

  const ageButton = (mode: Mode, label: string) =>
    el('a', {
      href: lessonHref(startAt),
      class: 'nb-button nb-button-light',
      onclick: () => {
        setMode(mode);
        applyMode();
      },
    }, label);

  // The route the robot leaves, drawn in ink over the canvas and revealed as it drives.
  const route = svg('path', { class: 'nb-route', d: routePath(frames), pathLength: '1', filter: 'url(#nb-wobble)' });
  const routeLayer = svg('svg', { class: 'nb-route-layer', viewBox: `0 0 ${FIELD_CM} ${FIELD_CM}`, 'aria-hidden': 'true' }, route);

  const page = el('div', { class: 'nb' },
    inkDefs(),

    // ------------------------------------------------------------------ hero
    el('section', { class: 'nb-hero', 'aria-labelledby': 'hero-title' },
      el('div', { class: 'nb-hero-copy' },
        el('h1', { class: 'nb-title', id: 'hero-title', text: 'Program a competition robot in real Java' }),
        el('p', { class: 'nb-lede', text: '42 short lessons for ages 9 to 18. You write the code, a robot on the screen drives it, and by the last tier it runs on your FTC team’s robot. Nothing to install and no account.' }),
        hasChosenMode()
          ? el('div', { class: 'nb-actions' },
              el('a', { href: lessonHref(startAt), class: 'nb-button nb-button-primary' },
                returning && next ? `Carry on: ${next.title}` : 'Start lesson 1'),
              el('a', { href: '#/chart', class: 'nb-link', text: 'See all 42 lessons' }),
            )
          // First visit: the age question is the start button, so it never blocks, and a
          // nine-year-old is not started in Builder by default.
          : el('div', { class: 'nb-start', role: 'group', 'aria-labelledby': 'nb-start-label' },
              el('p', { class: 'nb-start-label', id: 'nb-start-label', text: 'Start lesson 1. How old are you?' }),
              el('div', { class: 'nb-actions' },
                ageButton('explorer', 'I am 9 to 12'),
                ageButton('builder', 'I am 13 to 18'),
              ),
            ),
      ),

      // The instrument: the real simulator, framed like something you would measure with.
      el('figure', { class: 'nb-instrument' },
        el('div', { class: 'nb-instrument-frame' },
          el('ol', { class: 'nb-ruler nb-ruler-y', 'aria-hidden': 'true' }, ...['F', 'E', 'D', 'C', 'B', 'A'].map((r) => el('li', { text: r }))),
          el('div', { class: 'nb-screen' }, field.canvas, routeLayer),
          el('ol', { class: 'nb-ruler nb-ruler-x', 'aria-hidden': 'true' }, ...[0, 2, 4, 6, 8, 10, 12].map((ft) => el('li', { text: ft === 12 ? '12 ft' : String(ft) }))),
          // The mascot leans on the frame's left edge and stands on the desk the frame sits
          // on, with a shadow under its feet.
          el('div', { class: 'nb-mascot', 'aria-hidden': 'true' },
            el('img', { src: `${import.meta.env.BASE_URL}art/mascot-560.webp`, alt: '', width: '322', height: '560', fetchpriority: 'high' }),
          ),
        ),
        el('figcaption', { class: 'nb-caption', text: 'The simulator from every lesson, drawn to the scale of a real FTC field' }),
      ),
    ),

    // ------------------------------------------------- how a lesson works
    el('section', { class: 'nb-story', 'aria-label': 'How a lesson works' },
      storyRow('nb-row',
        el('div', { class: 'nb-row-text' },
          el('h2', { text: 'You start with code that already works' }),
          el('p', { text: 'Lesson 1 drives the robot 50 centimetres. One number decides how long the wheels turn. Your job is to find it and make the robot go further.' }),
        ),
        editorMock(),
      ),
      storyRow('nb-row nb-row-flip',
        beforeAfter(),
        el('div', { class: 'nb-row-text' },
          el('h2', { text: 'Press Run and see what changed' }),
          el('p', { text: 'The field is drawn to scale, 12 feet across like the real one. Double the number and the robot goes twice as far. When it does something you did not expect, the console tells you which line it got stuck on.' }),
        ),
      ),
      storyRow('nb-row',
        el('div', { class: 'nb-row-text' },
          el('h2', { text: 'Mentors get a guide for every tier' }),
          el('p', { text: 'Each one lists what the kids already know, the mistakes you will see in the order you will see them, and what to say when someone is stuck.' }),
          el('a', { href: '#/mentor', class: 'nb-link', text: 'Read the Tier 0 guide' }),
        ),
        rubricSheet(),
      ),
    ),

    // ------------------------------------------------------- the notebook page
    el('section', { class: 'nb-tiers', 'aria-labelledby': 'tiers-title' },
      el('div', { class: 'nb-paper' },
        el('h2', { class: 'nb-paper-title', id: 'tiers-title', text: 'Six tiers, in the order you fly them' }),
        el('ol', { class: 'nb-tier-list' },
          ...pathway.tiers.map((t) =>
            el('li', {},
              el('a', { href: '#/chart', class: 'nb-tier' },
                el('span', { class: 'nb-tier-num', 'aria-hidden': 'true' },
                  String(t.tier),
                  // The one "you are here" mark, in the antenna's yellow ink.
                  t.tier === currentTier ? inkCircle('nb-here') : null,
                ),
                el('span', { class: 'nb-tier-name' },
                  el('span', { class: 'visually-hidden', text: `Tier ${t.tier}: ` }),
                  t.name,
                  t.tier === currentTier ? el('span', { class: 'visually-hidden', text: ' (you are here)' }) : null,
                ),
                el('span', { class: 'nb-tier-sub', text: t.subtitle }),
                el('span', { class: 'nb-tier-meta', text: `${t.lessons.length} lessons, ${t.robot === 'tank' ? 'tank drive' : 'mecanum drive'}` }),
              ),
            ),
          ),
        ),
      ),
    ),
  );

  // The one animation on the page: the robot drives its route once and the ink follows it.
  // Under reduced motion the robot is parked at the end with the route already drawn.
  const last = frames.length - 1;
  const show = (index: number) => {
    field.draw(frames[index]!.snapshot);
    route.style.strokeDashoffset = String(1 - index / Math.max(1, last));
  };
  if (prefersReducedMotion()) {
    show(last);
  } else {
    let raf = 0;
    const startedAt = performance.now() + 500;
    const play = (now: number) => {
      const index = frameIndex(now, startedAt, frames.length, false);
      show(index);
      if (index < last) raf = requestAnimationFrame(play);
    };
    show(0);
    raf = requestAnimationFrame(play);
    page.addEventListener('nebula:leave', () => {
      cancelAnimationFrame(raf);
      field.destroy();
    });
  }

  requestAnimationFrame(() => field.resize());
  return page;
}

/** The route as an SVG path in field centimetres (y flipped: the field's y runs up). */
function routePath(frames: ReturnType<typeof playWatch>): string {
  const trail = frames[frames.length - 1]?.snapshot.trail ?? [];
  return trail
    .filter((_, i) => i % 3 === 0 || i === trail.length - 1)
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${(FIELD_CM - p.y).toFixed(1)}`)
    .join(' ');
}

/** The hand-drawn look: a little turbulence displacing a stroke, so ink is never ruled. */
function inkDefs(): SVGElement {
  return svg('svg', { class: 'nb-defs', width: '0', height: '0', 'aria-hidden': 'true', focusable: 'false' },
    svg('filter', { id: 'nb-wobble', x: '-5%', y: '-5%', width: '110%', height: '110%' },
      svg('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.035', numOctaves: '2', seed: '7', result: 'n' }),
      svg('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: '4' }),
    ),
  );
}

/** A loose ink circle, open at the top like one drawn in a hurry. */
function inkCircle(cls: string): SVGElement {
  return svg('svg', { class: cls, viewBox: '0 0 100 100', 'aria-hidden': 'true' },
    svg('path', { d: 'M58 9 C 24 4, 6 30, 9 55 C 12 82, 42 95, 66 88 C 90 80, 97 52, 88 30 C 82 16, 68 9, 47 12', filter: 'url(#nb-wobble)' }),
  );
}

function storyRow(cls: string, ...children: (HTMLElement | SVGElement)[]): HTMLElement {
  return el('div', { class: cls }, ...children);
}

/** Lesson 1's real code, set like the editor, with the one number circled in ink. */
function editorMock(): HTMLElement {
  const num = (t: string) => el('span', { class: 'syn-num', text: t });
  const fn = (t: string) => el('span', { class: 'syn-fn', text: t });
  const com = (t: string) => el('span', { class: 'syn-com', text: t });
  const line = (n: number, ...parts: (string | HTMLElement)[]) =>
    el('span', { class: n === 21 ? 'nb-code-line is-marked' : 'nb-code-line' }, el('span', { class: 'nb-code-n', text: String(n) }), ...parts);
  return el('figure', { class: 'nb-editor' },
    el('figcaption', { class: 'nb-editor-tab', text: 'HelloRobot.java' }),
    el('pre', { class: 'nb-code' },
      el('code', {},
        line(15, '        ', fn('waitForStart'), '();'),
        line(16, ''),
        line(17, '        leftDrive.', fn('setPower'), '(', num('0.5'), ');'),
        line(18, '        rightDrive.', fn('setPower'), '(', num('0.5'), ');'),
        line(19, ''),
        line(20, '        ', com('// TODO: make this number bigger')),
        line(21, '        ', fn('sleep'), '(', el('span', { class: 'nb-code-target' }, num('1000'), inkCircle('nb-code-circle')), ');'),
        line(22, ''),
        line(23, '        leftDrive.', fn('setPower'), '(', num('0'), ');'),
        line(24, '        rightDrive.', fn('setPower'), '(', num('0'), ');'),
      ),
    ),
    el('p', { class: 'nb-editor-note', text: 'This one. Milliseconds the wheels keep turning.' }),
  );
}

/** The same robot, the same field, two numbers: what Run shows you. */
function beforeAfter(): HTMLElement {
  const panel = (label: string, cm: number) => {
    const top = 140 - 20 - cm;
    return el('figure', { class: 'nb-mini' },
      el('figcaption', { class: 'nb-mini-label', text: label }),
      svg('svg', { class: 'nb-mini-field', viewBox: '0 0 120 140', role: 'img', 'aria-label': `The robot drives ${cm} centimetres` },
        ...[20, 40, 60, 80, 100].map((x) => svg('line', { x1: String(x), y1: '0', x2: String(x), y2: '140', class: 'nb-mini-grid' })),
        ...[20, 40, 60, 80, 100, 120].map((y) => svg('line', { x1: '0', y1: String(y), x2: '120', y2: String(y), class: 'nb-mini-grid' })),
        svg('line', { x1: '60', y1: '120', x2: '60', y2: String(top + 10), class: 'nb-mini-path' }),
        svg('rect', { x: '52', y: String(top), width: '16', height: '16', rx: '2', class: 'nb-mini-robot' }),
        svg('rect', { x: '52', y: '120', width: '16', height: '16', rx: '2', class: 'nb-mini-start' }),
        svg('path', { d: `M80 ${top + 8} h6 V128 h-6`, class: 'nb-mini-measure', filter: 'url(#nb-wobble)' }),
        svg('text', { x: '90', y: String((top + 128) / 2 + 3), 'font-size': '7', class: 'nb-mini-cm', text: `${cm} cm` }),
      ),
    );
  };
  return el('div', { class: 'nb-before-after' },
    panel('sleep(1000)', 50),
    panel('sleep(2000)', 100),
  );
}

/** The Tier 0 checkpoint rubric on paper, from the real mentor guide, with two ticks inked. */
function rubricSheet(): HTMLElement {
  const tick = () => svg('svg', { class: 'nb-tick', viewBox: '0 0 24 24', 'aria-hidden': 'true' },
    svg('path', { d: 'M4 13 L10 19 L20 5', filter: 'url(#nb-wobble)' }));
  const row = (what: string, gotIt: string, ticked: boolean) =>
    el('tr', {},
      el('th', { scope: 'row', text: what }),
      el('td', {}, ticked ? tick() : null, el('span', { text: gotIt })),
    );
  return el('figure', { class: 'nb-rubric' },
    el('figcaption', { class: 'nb-rubric-title', text: 'Checkpoint rubric, Tier 0' }),
    el('table', {},
      el('thead', {}, el('tr', {}, el('th', { scope: 'col', text: 'The kid' }), el('th', { scope: 'col', text: 'Got it when' }))),
      el('tbody', {},
        row('Drives a square', 'Four sides, four corners, finishes near the start', true),
        row('Prints their name', 'The same name on three lines', true),
        row('Reads errors', 'Finds the line number and looks there', false),
      ),
    ),
    el('p', { class: 'nb-rubric-q', text: 'Ask before they move on: if I asked you to make the square twice as big, what would you change?' }),
  );
}
