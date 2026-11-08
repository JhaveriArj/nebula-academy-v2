import { el } from '../dom';
import { createStarChart } from '../components/starChart';
import { pathway } from '../../content/loader';
import { counts, isPassed, isTierUnlocked } from '../../progress/store';
import { lessonHref } from '../router';
import { prefersReducedMotion } from '../dom';

/* The Level Map page. The chart does the work; this adds the heading and the plain list
   that makes every waypoint reachable by keyboard and readable by a screen reader. */

export interface ChartPage {
  element: HTMLElement;
  celebrate(lessonId: string): void;
}

export function chartPage(): ChartPage {
  const chart = createStarChart({ reducedMotion: prefersReducedMotion() });
  const { passed, total } = counts();

  const element = el('div', { class: 'chart-page' },
    el('div', { class: 'chart-head' },
      el('h1', { text: 'Star chart' }),
      el('p', { class: 'muted', text: `${passed} of ${total} waypoints logged. A station opens when the one before it is finished.` }),
    ),
    el('div', { class: 'chart-frame' }, chart.element),

    el('section', { class: 'chart-index' },
      el('h2', { text: 'Every lesson' }),
      el('p', { class: 'muted', text: 'The same waypoints as a list, in order.' }),
      ...pathway.tiers.map((tier) => {
        const unlocked = isTierUnlocked(tier.tier);
        return el('section', { class: `chart-index-tier ${unlocked ? '' : 'is-locked'}` },
          el('h3', {},
            el('span', { class: 'display', text: `Tier ${tier.tier} · ${tier.name}` }),
            el('span', { class: 'muted', text: ` · ${tier.subtitle}` }),
          ),
          unlocked
            ? el('ol', { class: 'chart-index-list' },
                ...tier.lessons.map((lesson, i) =>
                  el('li', { class: isPassed(lesson.id) ? 'is-flown' : '' },
                    el('a', { href: lessonHref(lesson.id) },
                      el('span', { class: 'chart-index-number display', text: String(i + 1).padStart(2, '0') }),
                      el('span', { text: lesson.title }),
                    ),
                    isPassed(lesson.id) ? el('span', { class: 'pass', text: 'flown' }) : null,
                  ),
                ),
              )
            : el('p', { class: 'muted', text: `Locked until the Tier ${tier.tier - 1} checkpoint passes.` }),
        );
      }),
    ),
  );

  return { element, celebrate: (lessonId) => chart.celebrate(lessonId) };
}
