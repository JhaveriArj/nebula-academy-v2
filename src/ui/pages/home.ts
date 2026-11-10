import { el, svg, prefersReducedMotion } from '../dom';
import { icon } from '../icons';
import { createFieldView } from '../components/field';
import { playWatch } from '../../sim/watch';
import { counts, hasChosenMode, isPassed, setMode, type Mode } from '../../progress/store';
import { applyMode } from '../header';
import { pathway } from '../../content/loader';
import { FIELD_CM } from '../../sim/field';
import { lessonHref } from '../router';
import { frameIndex } from '../frames';
import { FIRST_LINE, HERO_CHECKS, HERO_JAVA, HERO_LINES, HERO_SPEC, LESSON_ONE_CHECKS, SIDES, demoStateAt } from '../heroDemo';

/* The home page: an FTC team's engineering notebook, read at night.

   The hero is the product working. A copy of the lesson screen runs eight lines of Java:
   the robot drives a square while the running lines light up, and when it stops, three
   of the Tier 0 checkpoint's own checks pass. tests/hero-demo.test.ts runs the same Java
   through the real interpreter, so the demo cannot drift from what the product does.
   Below it, the three steps of every lesson, the six tiers on paper, and the mentor guide.
   See docs/DESIGN.md. */

/** How long the finished square stays on screen before the demo runs again. */
const HOLD_MS = 3200;

export function homePage(): HTMLElement {
  const everyLesson = pathway.tiers.flatMap((t) => t.lessons);
  // The first lesson they have not passed, or the very first one. Read from
  // content/pathway.json rather than named here, which the design lint enforces.
  const next = everyLesson.find((l) => !isPassed(l.id)) ?? everyLesson[0];
  const startAt = next?.id ?? '';
  const { passed } = counts();
  const returning = passed > 0;
  const currentTier = pathway.tiers.find((t) => t.lessons.some((l) => l.id === startAt))?.tier ?? 0;
  const lessonCount = everyLesson.length;

  const ageButton = (mode: Mode, label: string, primary: boolean) =>
    el('a', {
      href: lessonHref(startAt),
      class: primary ? 'nb-button nb-button-primary' : 'nb-button nb-button-quiet',
      onclick: () => {
        setMode(mode);
        applyMode();
      },
    }, label);

  const operator = el('div', { class: 'nb-operator', 'aria-hidden': 'true' },
    el('img', {
      src: `${import.meta.env.BASE_URL}art/mascot-hero-560.webp`,
      srcset: `${import.meta.env.BASE_URL}art/mascot-hero-560.webp 560w, ${import.meta.env.BASE_URL}art/mascot-hero-1108.webp 1108w`,
      sizes: '(min-width: 2000px) 440px, 260px',
      alt: '',
      width: '560',
      height: '1233',
      fetchpriority: 'high',
    }),
  );
  const nod = () => {
    if (prefersReducedMotion()) return;
    operator.classList.remove('is-nodding');
    void operator.offsetWidth;
    operator.classList.add('is-nodding');
  };
  const demo = heroDemo(nod);

  const page = el('div', { class: 'nb' },
    inkDefs(),

    // ------------------------------------------------------------------ hero
    el('section', { class: 'nb-hero', 'aria-labelledby': 'hero-title' },
      el('div', { class: 'nb-hero-head' },
        el('div', { class: 'nb-hero-title' },
          el('h1', { class: 'nb-title', id: 'hero-title', text: 'Program a competition robot in real Java' }),
          el('ul', { class: 'nb-proof', 'aria-label': 'At a glance' },
            el('li', { text: `${lessonCount} lessons` }),
            el('li', { text: `${pathway.tiers.length} tiers` }),
            el('li', { text: 'Ages 9 to 18' }),
            el('li', { text: 'FTC SDK method names' }),
            el('li', { text: 'Free, no account' }),
          ),
        ),
        el('div', { class: 'nb-hero-copy' },
        el('p', { class: 'nb-lede', text: 'You write the code, a robot on the screen drives it, and by the last tier the same code runs on your FTC team’s robot.' }),
        hasChosenMode()
          ? el('div', { class: 'nb-actions' },
              el('a', { href: lessonHref(startAt), class: 'nb-button nb-button-primary' },
                returning && next ? `Carry on: ${next.title}` : 'Start lesson 1'),
              el('a', { href: '#/chart', class: 'nb-button nb-button-quiet', text: `See all ${lessonCount} lessons` }),
            )
          // First visit: the age question is the start button, so it never blocks, and a
          // nine-year-old is not started in Builder by default.
          : el('div', { class: 'nb-start', role: 'group', 'aria-labelledby': 'nb-start-label' },
              el('p', { class: 'nb-start-label', id: 'nb-start-label', text: 'Start lesson 1. How old are you?' }),
              el('div', { class: 'nb-actions' },
                ageButton('explorer', 'I am 9 to 12', false),
                ageButton('builder', 'I am 13 to 18', false),
              ),
            ),
        ),
      ),
      // The mascot is the operator: it stands on the same line as the bottom of the window,
      // turned toward the code, and nods once each time the checks pass.
      el('div', { class: 'nb-hero-stage' },
        operator,
        demo.element,
      ),
    ),

    // ------------------------------------------------- how a lesson works
    el('section', { class: 'nb-how', 'aria-labelledby': 'how-title' },
      el('div', { class: 'nb-section-head' },
        el('h2', { id: 'how-title', text: 'How a lesson works' }),
        el('p', { text: 'Every lesson is the same three steps on one screen, and takes 10 to 40 minutes. These are from lesson 1.' }),
      ),
      el('ol', { class: 'nb-steps' },
        step('01', 'Read the mission', readingMock(),
          'A short read in plain words. New words are in bold and in the glossary.'),
        step('02', 'Change the code', editorMock(),
          'The code already works. You find the number that matters and change it.'),
        step('03', 'Run it and watch the checks', runMock(),
          'The robot drives your code, and each check turns green when it passes.'),
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

    // ------------------------------------------------------------ mentors
    el('section', { class: 'nb-mentors', 'aria-labelledby': 'mentors-title' },
      el('div', { class: 'nb-mentors-text' },
        el('h2', { id: 'mentors-title', text: 'Mentors get a guide for every tier' }),
        el('p', { text: 'Each one lists what the kids already know, the mistakes you will see in the order you will see them, and what to say when someone is stuck.' }),
        el('a', { href: '#/mentor', class: 'nb-link', text: 'Read the Tier 0 guide' }),
      ),
      rubricSheet(),
    ),
  );

  page.addEventListener('nebula:leave', () => demo.destroy());
  requestAnimationFrame(() => demo.resize());
  return page;
}

// ------------------------------------------------------------------ the hero demo

interface Demo {
  element: HTMLElement;
  resize(): void;
  destroy(): void;
}

/** A copy of the lesson screen running HERO_LINES: code, field, checks and a readout. */
function heroDemo(onPass: () => void): Demo {
  const field = createFieldView({ label: 'The simulator: a tank robot driving a square, one side and one corner at a time', instrument: true });
  const frames = playWatch(HERO_SPEC);
  const last = frames.length - 1;

  const route = svg('path', { class: 'nb-route', d: routePath(frames), pathLength: '1', filter: 'url(#nb-wobble)' });
  const routeLayer = svg('svg', { class: 'nb-route-layer', viewBox: `0 0 ${FIELD_CM} ${FIELD_CM}`, 'aria-hidden': 'true' }, route);

  // The whole of Square.java, with the eight running lines at full strength and the rest
  // dimmed; the panel opens scrolled so the loop sits in view with a little context above.
  const fileLines = HERO_JAVA.replace(/\n$/, '').split('\n');
  const lastLoopLine = FIRST_LINE + HERO_LINES.length - 1;
  const allLines = fileLines.map((text, i) =>
    el('span', { class: i + 1 >= FIRST_LINE && i + 1 <= lastLoopLine ? 'nb-demo-line' : 'nb-demo-line is-context' },
      el('span', { class: 'nb-code-n', text: String(i + 1) }), ...highlight(text)));
  const lines = allLines.slice(FIRST_LINE - 1, lastLoopLine);
  const code = el('pre', { class: 'nb-code nb-demo-code', tabindex: '0', 'aria-label': 'Square.java, the Java the robot is running' }, el('code', {}, ...allLines));
  const scrollToLoop = () => {
    // Show up to three dimmed lines above the loop, but never at the cost of the loop itself.
    const first = allLines[FIRST_LINE - 1];
    const end = allLines[lastLoopLine - 1];
    if (!first || !end) return;
    const loopHeight = end.offsetTop + end.offsetHeight - first.offsetTop;
    const room = code.clientHeight - 32 - loopHeight;
    let top = first.offsetTop;
    for (let i = 1; i <= 3; i++) {
      const above = allLines[FIRST_LINE - 1 - i];
      if (!above || first.offsetTop - above.offsetTop > room) break;
      top = above.offsetTop;
    }
    code.scrollTop = top - 16;
  };

  const checks = HERO_CHECKS.checks.map((c) =>
    el('li', { class: 'nb-check' }, el('span', { class: 'nb-check-mark', 'aria-hidden': 'true' }, icon('passed', 16)), el('span', { text: c.label ?? '' })));
  const checksDone = el('span', { class: 'visually-hidden' });

  const readout = {
    side: el('output', { class: 'nb-readout-v' }),
    left: el('output', { class: 'nb-readout-v' }),
    right: el('output', { class: 'nb-readout-v' }),
    time: el('output', { class: 'nb-readout-v' }),
  };
  const statusText = el('span');
  const status = el('span', { class: 'nb-window-state' }, el('span', { class: 'nb-state-dot', 'aria-hidden': 'true' }), statusText);

  const toggle = el('button', { type: 'button', class: 'nb-demo-toggle' });
  const setToggle = (playing: boolean) => {
    toggle.replaceChildren(icon(playing ? 'pause' : 'run', 16), el('span', { text: playing ? 'Pause' : 'Play' }));
    toggle.setAttribute('aria-label', playing ? 'Pause the demo' : 'Play the demo');
  };

  const element = el('figure', { class: 'nb-demo' },
    el('div', { class: 'nb-window' },
      el('div', { class: 'nb-window-bar' },
        el('div', { class: 'nb-window-tools' },
          el('span', { class: 'nb-window-file', text: 'Square.java' }),
          status,
          toggle,
        ),
      ),
      el('div', { class: 'nb-window-body' },
        el('div', { class: 'nb-window-code' },
          code,
          el('div', { class: 'nb-demo-checks' },
            el('p', { class: 'nb-demo-checks-title', text: 'Checks from the Tier 0 checkpoint' }),
            el('ul', {}, ...checks),
            checksDone,
          ),
        ),
        el('div', { class: 'nb-window-field' }, field.canvas, routeLayer),
      ),
      el('dl', { class: 'nb-readout' },
        el('div', {}, el('dt', { text: 'side' }), el('dd', {}, readout.side)),
        el('div', {}, el('dt', { text: 'leftDrive' }), el('dd', {}, readout.left)),
        el('div', {}, el('dt', { text: 'rightDrive' }), el('dd', {}, readout.right)),
        el('div', {}, el('dt', { text: 'time' }), el('dd', {}, readout.time)),
      ),
    ),
    el('figcaption', { class: 'nb-caption', text: 'Eight lines from the Tier 0 checkpoint, running in the same simulator every lesson uses' }),
  );

  const power = (p: number) => (p < 0 ? '−' : '') + Math.abs(p).toFixed(2);
  let shownDone: boolean | null = null;
  const show = (index: number) => {
    field.draw(frames[index]!.snapshot);
    route.style.strokeDashoffset = String(1 - index / Math.max(1, last));
    const s = demoStateAt(index);
    lines.forEach((line, i) => line.classList.toggle('is-running', s.lines.includes(i)));
    readout.side.textContent = `${s.side} of ${SIDES}`;
    readout.left.textContent = power(s.left);
    readout.right.textContent = power(s.right);
    readout.time.textContent = `${s.seconds.toFixed(1)} s`;
    if (s.done !== shownDone) {
      shownDone = s.done;
      element.classList.toggle('is-done', s.done);
      statusText.textContent = s.done ? `${checks.length} of ${checks.length} passed` : 'running';
      if (s.done && !reduced) onPass();
      // Announced once per run, not on every frame.
      checksDone.textContent = s.done ? `All ${checks.length} checks passed.` : '';
    }
  };

  // The loop: run, hold the finished square, run again. It pauses when it is off screen or
  // the tab is hidden, and the Pause button stops it for good (WCAG 2.2.2). Under reduced
  // motion it starts finished and Play runs it once.
  const reduced = prefersReducedMotion();
  const cycle = frames.length + Math.round(HOLD_MS / 20);
  let raf = 0;
  let playing = false;
  let userPaused = reduced;
  let visible = true;
  let frameAt = reduced ? last : 0;
  let origin = 0;

  const tick = (now: number) => {
    const raw = frameIndex(now, origin, reduced ? frames.length : cycle, !reduced);
    frameAt = raw;
    show(Math.min(raw, last));
    if (reduced && raw >= last) {
      stop();
      userPaused = true;
      setToggle(false);
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  const start = () => {
    if (playing) return;
    playing = true;
    origin = performance.now() - frameAt * 20;
    raf = requestAnimationFrame(tick);
  };
  const stop = () => {
    playing = false;
    cancelAnimationFrame(raf);
  };
  const sync = () => (!userPaused && visible && !document.hidden ? start() : stop());

  toggle.addEventListener('click', () => {
    userPaused = !userPaused;
    if (!userPaused && frameAt >= last && reduced) frameAt = 0;
    setToggle(!userPaused);
    sync();
  });
  const seen = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true;
    sync();
  });
  seen.observe(element);
  document.addEventListener('visibilitychange', sync);

  setToggle(!userPaused);
  show(frameAt);
  sync();

  return {
    element,
    resize: () => {
      field.resize();
      scrollToLoop();
    },
    destroy: () => {
      stop();
      seen.disconnect();
      document.removeEventListener('visibilitychange', sync);
      field.destroy();
    },
  };
}

/** Just enough colouring for the eight demo lines, in the editor's own token colours. */
function highlight(line: string): (string | HTMLElement)[] {
  const parts: (string | HTMLElement)[] = [];
  const re = /\b(for|int|package|import|public|class|extends|void)\b|\b(\d+(?:\.\d+)?)\b|\b(setPower|sleep|waitForStart|get)\b|("[^"]*")|(@\w+)/g;
  let at = 0;
  for (const m of line.matchAll(re)) {
    if (m.index! > at) parts.push(line.slice(at, m.index));
    const cls = m[1] ? 'syn-kw' : m[2] ? 'syn-num' : m[3] ? 'syn-fn' : m[4] ? 'syn-str' : 'syn-ann';
    parts.push(el('span', { class: cls, text: m[0] }));
    at = m.index! + m[0].length;
  }
  parts.push(line.slice(at));
  return parts;
}

/** The route as an SVG path in field centimetres (y flipped: the field's y runs up). */
function routePath(frames: ReturnType<typeof playWatch>): string {
  const trail = frames[frames.length - 1]?.snapshot.trail ?? [];
  return trail
    .filter((_, i) => i % 3 === 0 || i === trail.length - 1)
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${(FIELD_CM - p.y).toFixed(1)}`)
    .join(' ');
}

// ------------------------------------------------------------ how a lesson works

function step(n: string, title: string, view: HTMLElement, note: string): HTMLElement {
  return el('li', { class: 'nb-step' },
    el('div', { class: 'nb-step-head' },
      el('span', { class: 'nb-step-n', 'aria-hidden': 'true', text: n }),
      el('h3', { text: title }),
    ),
    el('div', { class: 'nb-step-view' }, view),
    el('p', { class: 'nb-step-note', text: note }),
  );
}

/** Lesson 1's reading pane, in its own words. */
function readingMock(): HTMLElement {
  const code = (t: string) => el('code', { text: t });
  return el('div', { class: 'nb-read', 'aria-hidden': 'true' },
    el('p', { class: 'nb-read-h', text: 'Mission' }),
    el('p', { text: 'The robot drives forward, and you decide how far.' }),
    el('p', { class: 'nb-read-h', text: 'Learn' }),
    el('p', {}, code('leftDrive.setPower(0.5);'), ' tells the left wheel how fast to spin. ', el('strong', { text: 'Power' }), ' runs from ', code('-1.0'), ' to ', code('1.0'), ', so ', code('0.5'), ' is half speed.'),
    el('p', {}, code('sleep(1000);'), ' keeps it going for 1000 ', el('strong', { text: 'milliseconds' }), '. That is one second.'),
  );
}

/** Lesson 1's code as the editor shows it, the one number changed and circled in ink. */
function editorMock(): HTMLElement {
  const num = (t: string) => el('span', { class: 'syn-num', text: t });
  const fn = (t: string) => el('span', { class: 'syn-fn', text: t });
  const com = (t: string) => el('span', { class: 'syn-com', text: t });
  const line = (n: number, ...parts: (string | HTMLElement)[]) =>
    el('span', { class: n === 21 ? 'nb-code-line is-marked' : 'nb-code-line' }, el('span', { class: 'nb-code-n', text: String(n) }), ...parts);
  return el('div', { class: 'nb-editor', 'aria-hidden': 'true' },
    el('pre', { class: 'nb-code' },
      el('code', {},
        line(17, '    leftDrive.', fn('setPower'), '(', num('0.5'), ');'),
        line(18, '    rightDrive.', fn('setPower'), '(', num('0.5'), ');'),
        line(19, ''),
        line(20, '    ', com('// TODO: make this number bigger')),
        line(21, '    ', fn('sleep'), '(', el('span', { class: 'nb-code-target' }, num('2000'), inkCircle('nb-code-circle')), ');'),
        line(22, ''),
        line(23, '    leftDrive.', fn('setPower'), '(', num('0'), ');'),
        line(24, '    rightDrive.', fn('setPower'), '(', num('0'), ');'),
      ),
    ),
  );
}

/** The run: the robot twice as far as before, measured, and lesson 1's checks passed. */
function runMock(): HTMLElement {
  const before = 50;
  const after = 100;
  const y = (cm: number) => 128 - cm;
  return el('div', { class: 'nb-run' },
    svg('svg', { class: 'nb-mini-field', viewBox: '0 0 120 140', role: 'img', 'aria-label': `With sleep(2000) the robot drives ${after} centimetres, twice as far as before` },
      ...[20, 40, 60, 80, 100].map((x) => svg('line', { x1: String(x), y1: '0', x2: String(x), y2: '140', class: 'nb-mini-grid' })),
      ...[20, 40, 60, 80, 100, 120].map((v) => svg('line', { x1: '0', y1: String(v), x2: '120', y2: String(v), class: 'nb-mini-grid' })),
      svg('line', { x1: '40', y1: '128', x2: '40', y2: String(y(after)), class: 'nb-mini-path' }),
      svg('rect', { x: '32', y: String(y(before) - 8), width: '16', height: '16', rx: '2', class: 'nb-mini-ghost' }),
      svg('rect', { x: '32', y: String(y(after) - 8), width: '16', height: '16', rx: '2', class: 'nb-mini-robot' }),
      svg('path', { d: `M60 ${y(after)} h6 V128 h-6`, class: 'nb-mini-measure', filter: 'url(#nb-wobble)' }),
      svg('text', { x: '72', y: String((y(after) + 128) / 2 + 3), 'font-size': '10', class: 'nb-mini-cm', text: `${after} cm` }),
    ),
    el('ul', { class: 'nb-run-checks' },
      ...LESSON_ONE_CHECKS.map((label) =>
        el('li', { class: 'nb-check is-passed' }, el('span', { class: 'nb-check-mark', 'aria-hidden': 'true' }, icon('passed', 16)), el('span', { text: label }))),
    ),
  );
}

// ------------------------------------------------------------------ ink and paper

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
