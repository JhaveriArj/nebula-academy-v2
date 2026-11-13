import { el } from './dom';
import { mascotHead } from './mascot';
import { fieldThumb, routeOf } from './kit';
import { HERO_SPEC } from './heroDemo';

/* The site footer, the same on every page but the lesson (which holds itself to the screen):
   the mascot's head as the brand mark, the four links, who made it, the FIRST trademark note,
   and one field thumbnail of the square the home page drives, as the footer's one picture. */

export function siteFooter(): HTMLElement {
  return el('footer', { class: 'site-footer' },
    el('div', { class: 'site-footer-top' },
      el('a', { href: '#/', class: 'site-footer-brand', 'aria-label': 'Nebula Academy, home' },
        mascotHead(28),
        el('span', { text: 'Nebula Academy' }),
      ),
      el('nav', { class: 'site-footer-nav', 'aria-label': 'Footer' },
        ...[['Chart', '#/chart'], ['Mentor', '#/mentor'], ['Progress', '#/progress'], ['Glossary', '#/glossary'], ['About', '#/about'], ['Privacy', '#/privacy']].map(([label, href]) =>
          el('a', { href: href!, class: 'site-footer-link', text: label! })),
      ),
    ),
    el('div', { class: 'site-footer-body' },
      el('div', {},
        el('p', { class: 'site-footer-made' },
          'Built by an FTC team. Free, with no accounts and no analytics; your progress stays in this browser.',
          ' If a mentor gives you a class code, joining sends a nickname and your passed lessons to the class server. ',
          el('a', { href: '#/privacy', text: 'How privacy works' })),
        el('p', { class: 'site-footer-legal', text: 'FIRST®, FIRST® Tech Challenge and FTC® are trademarks of FIRST (For Inspiration and Recognition of Science and Technology), which is not involved with, and does not endorse, Nebula Academy.' }),
      ),
      el('figure', { class: 'site-footer-thumb' },
        fieldThumb(routeOf(HERO_SPEC), { size: 72, label: 'The square from the Tier 0 checkpoint' }),
      ),
    ),
  );
}
