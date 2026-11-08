import { el, prefersReducedMotion } from '../dom';
import { icon } from '../icons';
import { createFieldView } from '../components/field';
import { playWatch, type WatchSpec } from '../../sim/watch';
import { counts, isPassed } from '../../progress/store';
import { pathway } from '../../content/loader';
import { lessonHref } from '../router';

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
  const field = createFieldView({ label: 'The virtual robot driving a short loop on the field' });
  const frames = playWatch(HERO);

  const everyLesson = pathway.tiers.flatMap((t) => t.lessons);
  // The first lesson they have not passed, or the very first one. Read from
  // content/pathway.json rather than named here, which the design lint enforces.
  const startAt = (everyLesson.find((l) => !isPassed(l.id)) ?? everyLesson[0])?.id ?? '';
  const { passed, total } = counts();
  const returning = passed > 0;

  const page = el('div', { class: 'home' },
    el('section', { class: 'hero', 'aria-labelledby': 'hero-title' },
      el('div', { class: 'hero-field' }, field.canvas),
      el('div', { class: 'hero-aside' },
        el('h1', { class: 'hero-title', id: 'hero-title' },
          'Write real Java. A real robot drives. Then put your code on your team’s bot.',
        ),
        el('p', { class: 'hero-sub' },
          'Six tiers, 42 lessons, ages 9 to 18. No account, nothing to install.',
        ),
        returning
          ? el('p', { class: 'hero-progress', text: `${passed} of ${total} lessons passed.` })
          : null,
        el('a', { href: lessonHref(startAt), class: 'btn btn-start' },
          el('span', { text: returning ? 'Carry on' : 'Start your first mission' }),
          icon('next', 20),
        ),
      ),
      el('img', {
        class: 'hero-mascot',
        src: `${import.meta.env.BASE_URL}art/mascot-264.png`,
        alt: '',
        width: '152',
        height: '264',
        decoding: 'async',
      }),
    ),

    el('div', { class: 'home-panels' },
      panel('What you actually do',
        'Every lesson gives you a robot and a job. You change the code, press Run, and watch the robot on the field do what you told it. When the checks go green, the next waypoint on the chart lights up.',
        '#/chart', 'Open the chart', 'chart'),
      panel('Why it is real Java',
        'The package names and method signatures are the ones in the FIRST Tech Challenge SDK. By Tier 3 you are writing an OpMode; by Tier 5 you are pasting it into Android Studio unchanged.',
        '#/about', 'How it works', 'robot'),
      panel('For mentors',
        'Each tier has a guide: what the kids already know, the mistakes you will see in the order you will see them, what to say when someone is stuck, and a checkpoint rubric you can print.',
        '#/mentor', 'Mentor guides', 'mentor'),
    ),

    el('section', { class: 'home-tiers' },
      el('h2', { text: 'The six tiers' }),
      el('ol', { class: 'tier-list' },
        ...pathway.tiers.map((t) =>
          el('li', { class: 'tier-row' },
            el('span', { class: 'tier-row-number display', text: `T${t.tier}` }),
            el('span', { class: 'tier-row-name' },
              el('strong', { text: t.name }),
              el('span', { class: 'muted', text: ` · ${t.subtitle}` }),
            ),
            el('span', { class: 'tier-row-count muted', text: `${t.lessons.length} lessons` }),
            el('span', { class: 'tier-row-robot muted', text: t.robot }),
          ),
        ),
      ),
    ),
  );

  // Loop the hero. Under reduced motion the robot is parked with its route behind it.
  if (prefersReducedMotion()) {
    field.draw(frames[frames.length - 1]!.snapshot);
  } else {
    let raf = 0;
    const startedAt = performance.now();
    const play = (now: number) => {
      // A rAF timestamp can predate startedAt by a frame; clamp so the index never goes negative.
      const index = Math.floor((Math.max(0, now - startedAt) / 20) % frames.length);
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

function panel(title: string, body: string, href: string, cta: string, iconName: string): HTMLElement {
  return el('section', { class: 'home-panel' },
    el('h2', { text: title }),
    el('p', { text: body }),
    el('a', { href, class: 'panel-link' }, icon(iconName, 20), el('span', { text: cta })),
  );
}
