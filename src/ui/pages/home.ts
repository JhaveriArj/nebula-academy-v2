import { el, prefersReducedMotion } from '../dom';
import { icon } from '../icons';
import { createFieldView } from '../components/field';
import { playWatch, type WatchSpec } from '../../sim/watch';
import { counts, hasChosenMode, isPassed, setMode, type Mode } from '../../progress/store';
import { applyMode } from '../header';
import { pathway } from '../../content/loader';
import { lessonHref } from '../router';
import { frameIndex } from '../frames';

/* The home page.

   docs/DESIGN.md: the hero is a live thing, not a headline. The real sim, the real robot
   sprite, driving a short loop, with one button. No tagline over it, no gradient, and the
   first sentence sits below the field and says something specific. */

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
  const startButton = (mode: Mode, label: string) =>
    el('a', {
      href: lessonHref(startAt),
      class: 'btn btn-start',
      onclick: () => {
        setMode(mode);
        applyMode();
      },
    }, el('span', { text: label }), icon('next', 20));

  const field = createFieldView({ label: 'The virtual robot driving a short loop on the field', glow: true });
  const frames = playWatch(HERO);

  const everyLesson = pathway.tiers.flatMap((t) => t.lessons);
  // The first lesson they have not passed, or the very first one. Read from
  // content/pathway.json rather than named here, which the design lint enforces.
  const startAt = (everyLesson.find((l) => !isPassed(l.id)) ?? everyLesson[0])?.id ?? '';
  const { passed, total } = counts();
  const returning = passed > 0;

  // The order the tiers are shown in is the order they are flown in, so a stagger index
  // on each row lets the scroll reveal follow the route.
  const tierRow = (t: (typeof pathway.tiers)[number], i: number) =>
    el('li', { class: 'reveal', style: `--i: ${i}; --tier: var(--tier-${t.tier})` },
      // Each row looks like a tappable list row, so it is one: it opens the chart.
      el('a', { href: '#/chart', class: 'tier-row' },
        el('span', { class: 'tier-row-tile' },
          // The tier's patch: a different silhouette per tier, so it reads without color.
          el('img', { class: 'tier-row-badge', src: `${import.meta.env.BASE_URL}art/badge-t${t.tier}.svg`, alt: '', width: '40', height: '40', decoding: 'async' }),
        ),
        el('span', { class: 'tier-row-text' },
          el('span', { class: 'tier-row-kicker', text: `Tier ${t.tier}` }),
          el('strong', { class: 'tier-row-name', text: t.name }),
          el('span', { class: 'tier-row-sub', text: t.subtitle }),
        ),
        el('span', { class: 'tier-row-meta' },
          el('span', { class: 'meta-chip' }, icon('lessons', 18), el('span', { text: `${t.lessons.length} lessons` })),
          el('span', { class: 'meta-chip' }, icon('robot', 18), el('span', { text: t.robot === 'tank' ? 'Tank drive' : 'Mecanum drive' })),
        ),
        el('span', { class: 'tier-row-go' }, icon('next', 20)),
      ),
    );

  const page = el('div', { class: 'home' },
    el('section', { class: 'hero', 'aria-labelledby': 'hero-title' },
      el('div', { class: 'hero-copy' },
        el('h1', { class: 'hero-title', id: 'hero-title' },
          // The no-break space keeps "A" from ending a line on its own.
          'Write real Java. A\u00a0real robot drives. Then put your code on your team’s bot.',
        ),
        el('p', { class: 'hero-sub' },
          'Six tiers, 42 lessons, ages 9 to 18. No account, nothing to install.',
        ),
        returning
          ? el('p', { class: 'hero-progress' }, el('span', { class: 'hero-progress-dot', 'aria-hidden': 'true' }), el('span', { text: `${passed} of ${total} lessons passed` }))
          : null,
        hasChosenMode()
          ? el('div', { class: 'hero-actions' },
              el('a', { href: lessonHref(startAt), class: 'btn btn-start' },
                el('span', { text: returning ? 'Carry on' : 'Start your first mission' }),
                icon('next', 20),
              ),
              el('a', { href: '#/chart', class: 'btn btn-electric' }, icon('chart', 20), el('span', { text: 'See the star chart' })),
            )
          // First visit: one tap picks the mode and starts, so nothing stands in the way,
          // and a nine-year-old is not started in Builder by default.
          : el('div', { class: 'start-choice', role: 'group', 'aria-labelledby': 'start-choice-label' },
              el('p', { class: 'start-choice-label', id: 'start-choice-label', text: 'Start your first mission. How old are you?' }),
              el('div', { class: 'start-choice-buttons' },
                startButton('explorer', 'I am 9 to 12'),
                startButton('builder', 'I am 13 to 18'),
              ),
              el('p', { class: 'start-choice-note', text: 'You can switch between Explorer and Builder any time at the top.' }),
            ),
      ),
      // The stage: the live simulator on a screen, with the mascot standing in front of it.
      el('div', { class: 'hero-stage' },
        el('div', { class: 'hero-screen' },
          el('p', { class: 'hero-screen-bar' },
            el('span', { class: 'live-dot', 'aria-hidden': 'true' }),
            el('span', { text: 'Live simulator' }),
          ),
          el('div', { class: 'hero-field' }, field.canvas),
        ),
        el('img', {
          class: 'hero-mascot',
          src: `${import.meta.env.BASE_URL}art/mascot-560.webp`,
          alt: '',
          width: '322',
          height: '560',
          fetchpriority: 'high',
        }),
      ),
    ),

    el('div', { class: 'home-features' },
      feature('Write code, watch it drive',
        'Each lesson gives you a robot and a job. Change the code, press Run, and the robot on the field does what you told it.',
        '#/chart', 'Open the star chart', 'code', 0),
      feature('Real FTC Java',
        'The package names and methods match the FIRST Tech Challenge SDK. By Tier 5, your code pastes into Android Studio unchanged.',
        '#/about', 'How it works', 'robot', 1),
      feature('For mentors',
        'One guide per tier: what the kids already know, the mistakes you will see, what to say when someone is stuck, and a rubric you can print.',
        '#/mentor', 'Mentor guides', 'mentor', 2),
    ),

    el('section', { class: 'home-tiers', 'aria-labelledby': 'tiers-title' },
      el('div', { class: 'home-tiers-head reveal' },
        el('h2', { id: 'tiers-title', text: 'The six tiers' }),
        el('p', { text: 'Start at Launchpad. Each tier opens when you pass the one before it.' }),
      ),
      el('ol', { class: 'tier-list' }, ...pathway.tiers.map(tierRow)),
    ),
  );

  spotlight(page);

  // Loop the hero. Under reduced motion the robot is parked with its route behind it.
  if (prefersReducedMotion()) {
    field.draw(frames[frames.length - 1]!.snapshot);
  } else {
    let raf = 0;
    const startedAt = performance.now();
    const play = (now: number) => {
      const index = frameIndex(now, startedAt, frames.length, true);
      field.draw(frames[index]!.snapshot);
      raf = requestAnimationFrame(play);
    };
    raf = requestAnimationFrame(play);
    page.addEventListener('nebula:leave', () => {
      cancelAnimationFrame(raf);
      field.destroy();
    });
  }

  requestAnimationFrame(() => field.resize());
  return page;
}

function feature(title: string, body: string, href: string, cta: string, iconName: string, i: number): HTMLElement {
  return el('section', { class: 'feature-card reveal', style: `--i: ${i}` },
    el('span', { class: 'feature-icon', 'aria-hidden': 'true' }, icon(iconName, 26)),
    el('h2', { class: 'feature-title', text: title }),
    el('p', { class: 'feature-body', text: body }),
    el('a', { href, class: 'panel-link' }, el('span', { text: cta }), icon('next', 18)),
  );
}

/** A soft light that follows the pointer across a feature card's border (after Magic UI's
 *  Magic Card). Pointer-only polish: touch and keyboard users lose nothing without it. */
function spotlight(root: HTMLElement): void {
  root.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    const card = (event.target as Element).closest<HTMLElement>('.feature-card');
    if (!card) return;
    const box = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${event.clientX - box.left}px`);
    card.style.setProperty('--my', `${event.clientY - box.top}px`);
  });
}
