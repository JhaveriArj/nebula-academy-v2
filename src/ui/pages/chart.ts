import { el } from '../dom';
import { createStarChart } from '../components/starChart';
import { pathway } from '../../content/loader';
import { counts, isPassed, isTierUnlocked } from '../../progress/store';
import { lessonHref } from '../router';
import { prefersReducedMotion } from '../dom';
import { inkCheck, nebula, tierEmblem } from '../kit';

/* The star chart page. The chart runs the full width of the window on the night field;
   under it, "Every lesson" is the same route as a plain table, which is what makes every
   lesson reachable by keyboard and readable by a screen reader. */

export interface ChartPage {
  element: HTMLElement;
  celebrate(lessonId: string): void;
}

export function chartPage(): ChartPage {
  const chart = createStarChart({ reducedMotion: prefersReducedMotion() });
  const { passed, total } = counts();

  const element = el('div', { class: 'chart-page' },
    el('section', { class: 'chart-field' },
      nebula(1),
      el('div', { class: 'chart-head' },
        el('h1', { class: 'display', text: 'Star chart' }),
        el('p', { text: `${passed} of ${total} lessons flown. A station opens when the checkpoint before it passes.` }),
      ),
      el('div', { class: 'chart-frame' }, chart.element),
      el('p', { class: 'chart-swipe-note', text: 'Swipe sideways to see the whole chart, or use the list below.' }),
    ),

    el('section', { class: 'chart-index', 'aria-labelledby': 'chart-index-title' },
      el('h2', { id: 'chart-index-title', class: 'display', text: 'Every lesson' }),
      ...pathway.tiers.map((tier) => {
        const unlocked = isTierUnlocked(tier.tier);
        const done = tier.lessons.filter((l) => isPassed(l.id)).length;
        return el('section', { class: `chart-index-tier${unlocked ? '' : ' is-locked'}` },
          el('h3', { class: 'chart-index-head' },
            tierEmblem(tier.tier, 24),
            el('span', { class: 'chart-index-tiernum', text: `Tier ${tier.tier}` }),
            el('span', { class: 'chart-index-name display', text: tier.name }),
            el('span', { class: 'chart-index-count', text: unlocked ? `${done} of ${tier.lessons.length}` : `locked: opens after the Tier ${tier.tier - 1} checkpoint` }),
          ),
          el('ol', { class: 'chart-index-list' },
            ...tier.lessons.map((lesson, i) => {
              const flown = isPassed(lesson.id);
              const num = el('span', { class: 'chart-index-number', text: String(i + 1).padStart(2, '0') });
              const status = flown
                ? el('span', { class: 'chart-index-status is-flown' }, inkCheck(18), el('span', { class: 'visually-hidden', text: 'flown' }))
                : unlocked
                  ? el('span', { class: 'chart-index-status' })
                  : el('span', { class: 'chart-index-status is-locked' }, el('span', { class: 'visually-hidden', text: 'locked' }));
              return el('li', { class: `${flown ? 'is-flown' : ''}${unlocked ? '' : ' is-locked'}` },
                unlocked
                  ? el('a', { href: lessonHref(lesson.id), class: 'chart-index-row' }, num, el('span', { class: 'chart-index-title', text: lesson.title }), status)
                  : el('div', { class: 'chart-index-row' }, num, el('span', { class: 'chart-index-title', text: lesson.title }), status),
              );
            }),
          ),
        );
      }),
    ),
  );

  return { element, celebrate: (lessonId) => chart.celebrate(lessonId) };
}
