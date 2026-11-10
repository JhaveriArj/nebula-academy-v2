import { el, mount, prefersReducedMotion } from '../dom';
import { icon } from '../icons';
import { pathway, loadContentFile, hasContentFile } from '../../content/loader';
import { renderMarkdown } from '../markdown';
import { circledNumber, fieldThumb, mascot, paper, routeOf, tierEmblem } from '../kit';
import type { WatchSpec } from '../../sim/watch';

/* The mentor page: a printed guide on the desk. A sticky list of tiers on the left, and the
   guide itself as one cream sheet. The text is content/mentor/tier-N.md, so there is one copy
   of the advice; content/mentor/tier-N.mistakes.json adds a small field picture beside some
   common mistakes, showing what the robot does when a kid makes that mistake. */

interface MistakePicture { mistake: number; caption: string; watch: WatchSpec; expected?: WatchSpec }

const pad2 = (n: number) => String(n).padStart(2, '0');

export function mentorPage(tierParam: string | null): HTMLElement {
  const requested = Number(tierParam);
  const tier = tierParam !== null && tierParam !== undefined && tierParam !== '' && Number.isInteger(requested) && requested >= 0 && requested <= 5 ? requested : null;

  const side = el('nav', { class: 'mentor-side', 'aria-label': 'Mentor guides by tier' },
    el('p', { class: 'mentor-side-title display' }, el('a', { href: '#/mentor', text: 'Mentor guides' })),
    el('ol', { class: 'mentor-side-list' },
      ...pathway.tiers.map((t) =>
        el('li', {},
          el('a', {
            href: `#/mentor/${t.tier}`,
            class: 'mentor-side-link',
            'aria-current': tier === t.tier ? 'page' : undefined,
          },
          tierEmblem(t.tier, 24),
          el('span', {}, el('span', { class: 'mentor-side-tier', text: `Tier ${t.tier}` }), el('span', { class: 'mentor-side-name', text: t.name }))),
        ),
      ),
    ),
    // The mascot leans in from below the list: someone is reading over your shoulder.
    el('div', { class: 'mentor-side-peek', 'aria-hidden': 'true' }, mascot('peek', { height: 150, shadow: false })),
  );

  const sheet = el('article', { class: 'mentor-sheet kit-paper is-plain' });
  const page = el('div', { class: 'mentor-shell' }, side, el('div', { class: 'mentor-main' }, sheet));

  if (tier === null) {
    mount(sheet,
      el('header', { class: 'mentor-head' },
        el('div', { class: 'mentor-head-text' },
          el('h1', { class: 'display', text: 'Mentor guides' }),
          el('p', { class: 'mentor-lede', text: 'One guide per tier: what the kids already have, the mistakes you will see in the order you will see them, what to say when someone is stuck, and a checkpoint rubric you can print.' }),
        ),
      ),
      el('ol', { class: 'mentor-index' },
        ...pathway.tiers.map((t) =>
          el('li', {},
            el('a', { href: `#/mentor/${t.tier}`, class: 'mentor-index-link' },
              tierEmblem(t.tier, 32),
              el('span', { class: 'mentor-index-tier', text: `Tier ${t.tier}` }),
              el('span', { class: 'mentor-index-name', text: t.name }),
              el('span', { class: 'mentor-index-sub', text: t.subtitle }),
            ),
          ),
        ),
      ),
      el('p', { class: 'mentor-note', text: 'Every guide is written to be read in five minutes before a session, or printed and kept in the pit.' }),
    );
    return page;
  }

  const meta = pathway.tiers.find((t) => t.tier === tier)!;
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

  // The guide arrives after first paint; holding a screen's height for it keeps the pager and
  // the footer from jumping down when it lands (CLS).
  const body = el('div', { class: 'mentor-body is-loading' }, el('p', { class: 'mentor-note', text: 'Loading the guide.' }));
  mount(sheet,
    el('header', { class: 'mentor-head' },
      el('div', { class: 'mentor-head-mark', 'aria-hidden': 'true' },
        tierEmblem(tier, 96),
        circledNumber(tier, 44),
      ),
      el('div', { class: 'mentor-head-text' },
        el('h1', { class: 'display', text: `Tier ${tier}, ${meta.name}` }),
        el('p', { class: 'mentor-lede', text: meta.subtitle }),
      ),
      printButton,
    ),
    body,
    pager,
  );

  const picturesFile = `mentor/tier-${tier}.mistakes.json`;
  Promise.all([
    loadContentFile(`mentor/tier-${tier}.md`),
    hasContentFile(picturesFile)
      ? loadContentFile(picturesFile).then((raw) => (JSON.parse(raw) as { mistakes: MistakePicture[] }).mistakes)
      : Promise.resolve([] as MistakePicture[]),
  ])
    .then(([markdown, pictures]) => {
      // The sheet's header already names the tier, so the guide's own title line is dropped.
      const withoutTitle = markdown.replace(/^#\s[^\n]*\n/, '');
      const fragment = renderMarkdown(withoutTitle);
      mount(body, ...shapeGuide(fragment, pictures));
      body.classList.remove('is-loading');
      revealSections(body);
    })
    .catch(() => {
      mount(body, el('p', { class: 'fail', text: `The guide for tier ${tier} could not be loaded.` }));
      body.classList.remove('is-loading');
    });

  return page;
}

/** Splits the rendered guide at its headings into sections, numbers the common mistakes in
    the margin with their field pictures beside them, and pins the rubric to the sheet. */
function shapeGuide(fragment: DocumentFragment, pictures: MistakePicture[]): HTMLElement[] {
  const nodes = [...fragment.childNodes];
  const sections: HTMLElement[] = [];
  let current = el('section', { class: 'mentor-section is-intro' });
  sections.push(current);
  for (const node of nodes) {
    if (node instanceof HTMLHeadingElement && node.tagName === 'H2') {
      current = el('section', { class: 'mentor-section' });
      sections.push(current);
    }
    current.append(node);
  }

  for (const section of sections) {
    const heading = section.querySelector('h2');
    const title = heading?.textContent ?? '';
    if (/^Common mistakes/i.test(title)) numberMistakes(section, pictures);
    if (/^Checkpoint rubric/i.test(title)) {
      section.classList.add('is-rubric');
      const card = paper('pinned');
      card.classList.add('mentor-rubric');
      card.append(...[...section.childNodes]);
      section.append(card);
    }
  }
  return sections.filter((s) => s.childNodes.length > 0);
}

function numberMistakes(section: HTMLElement, pictures: MistakePicture[]): void {
  const heading = section.querySelector('h2')!;
  const rest = [...section.childNodes].filter((n) => n !== heading);
  const list = el('ol', { class: 'mistakes' });
  let item: HTMLElement | null = null;
  let n = 0;
  for (const node of rest) {
    const startsMistake = node instanceof HTMLParagraphElement && node.firstElementChild?.tagName === 'STRONG' && node.firstChild === node.firstElementChild;
    if (startsMistake) {
      n += 1;
      const picture = pictures.find((p) => p.mistake === n);
      item = el('li', { class: `mistake${picture ? ' has-picture' : ''}` },
        el('span', { class: 'mistake-num', 'aria-hidden': 'true', text: pad2(n) }),
        el('div', { class: 'mistake-text' }),
      );
      if (picture) {
        item.append(el('figure', { class: 'mistake-picture' },
          fieldThumb(routeOf(picture.watch), { size: 120, label: picture.caption, tone: 'wrong', ...(picture.expected ? { ghost: routeOf(picture.expected) } : {}) }),
          el('figcaption', { text: picture.caption }),
        ));
      }
      list.append(item);
    }
    if (item) item.querySelector('.mistake-text')!.append(node);
    else section.append(node);
  }
  section.append(list);
}

/** Each section rises 16px into place the first time it scrolls into view. The text is
    always there; the motion only plays on top of it. */
function revealSections(root: HTMLElement): void {
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) return;
  const fold = innerHeight;
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      io.unobserve(entry.target);
      (entry.target as HTMLElement).animate(
        [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }],
        { duration: 450, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      );
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  for (const section of root.querySelectorAll<HTMLElement>('.mentor-section')) {
    // Sections already on screen at load are not animated; they are what you open onto.
    if (section.getBoundingClientRect().top < fold) continue;
    io.observe(section);
  }
}
