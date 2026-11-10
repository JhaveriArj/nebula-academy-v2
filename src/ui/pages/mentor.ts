import { el, mount } from '../dom';
import { icon } from '../icons';
import { pathway, loadContentFile } from '../../content/loader';
import { renderMarkdown } from '../markdown';

/* The mentor page. Plain, printable, and the same text as content/mentor/*.md so there is
   one copy of the advice rather than two. */

export function mentorPage(tierParam: string | null): HTMLElement {
  const requested = Number(tierParam);
  const tier = Number.isInteger(requested) && requested >= 0 && requested <= 5 ? requested : null;

  const body = el('div', { class: 'mentor-body' });
  const page = el('article', { class: 'prose-page mentor-page' },
    el('h1', { text: 'Mentor guides' }),
    el('p', { class: 'lede', text: 'One guide per tier: what the kids already have, the mistakes you will see in the order you will see them, what to say when someone is stuck, and a checkpoint rubric you can print.' }),
    el('nav', { class: 'tier-tabs', 'aria-label': 'Choose a tier' },
      ...pathway.tiers.map((t) =>
        el('a', {
          href: `#/mentor/${t.tier}`,
          class: 'tier-tab',
          'aria-current': tier === t.tier ? 'page' : undefined,
        }, `Tier ${t.tier}`, el('span', { class: 'tier-tab-name', text: t.name })),
      ),
    ),
    body,
  );

  if (tier === null) {
    mount(body,
      el('p', { text: 'Pick a tier above. Every guide is written to be read in five minutes before a session, or printed and kept in the pit.' }),
      el('ul', { class: 'plain-list' },
        ...pathway.tiers.map((t) =>
          el('li', {},
            el('a', { href: `#/mentor/${t.tier}`, text: `Tier ${t.tier}, ${t.name}` }),
            el('span', { class: 'muted', text: ` — ${t.subtitle.toLowerCase()}` }),
          ),
        ),
      ),
    );
    return page;
  }

  const prev = pathway.tiers.find((t) => t.tier === tier - 1);
  const next = pathway.tiers.find((t) => t.tier === tier + 1);
  // Printing is the point of these guides (they go in the pit), so the button says so.
  const printButton = el('button', { type: 'button', class: 'btn btn-quiet mentor-print', onclick: () => window.print() },
    icon('mentor', 20), el('span', { text: 'Print this guide' }));
  const pager = el('nav', { class: 'mentor-pager', 'aria-label': 'Other tiers' },
    prev
      ? el('a', { href: `#/mentor/${prev.tier}`, class: 'mentor-pager-link is-prev' },
          icon('back', 20), el('span', {}, el('span', { class: 'mentor-pager-dir', text: 'Previous' }), `Tier ${prev.tier}, ${prev.name}`))
      : el('span'),
    next
      ? el('a', { href: `#/mentor/${next.tier}`, class: 'mentor-pager-link is-next' },
          el('span', {}, el('span', { class: 'mentor-pager-dir', text: 'Next' }), `Tier ${next.tier}, ${next.name}`), icon('next', 20))
      : el('span'),
  );

  mount(body, el('p', { class: 'muted', text: 'Loading the guide.' }));
  loadContentFile(`mentor/tier-${tier}.md`)
    .then((markdown) => {
      // The page already has its <h1>, so the guide's own # becomes an <h2>.
      mount(body,
        el('div', { class: 'mentor-tools' }, printButton),
        renderMarkdown(markdown, { headingOffset: 1 }),
        pager,
      );
    })
    .catch(() => {
      mount(body, el('p', { class: 'fail', text: `The guide for tier ${tier} could not be loaded.` }));
    });

  return page;
}
