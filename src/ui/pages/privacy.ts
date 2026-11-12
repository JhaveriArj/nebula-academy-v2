import { el, mount } from '../dom';
import { loadContentFile } from '../../content/loader';
import { renderMarkdown } from '../markdown';

/* Privacy, for parents and mentors. The words are content/privacy.md, so they are edited
   there, like every other piece of prose on the site; this only lays them out. */

export function privacyPage(): HTMLElement {
  const page = el('article', { class: 'prose-page privacy-page' },
    el('p', { class: 'mentor-note', text: 'Loading the privacy page.' }));
  loadContentFile('privacy.md')
    .then((markdown) => mount(page, renderMarkdown(markdown)))
    .catch(() => mount(page,
      el('h1', { class: 'display', text: 'Privacy' }),
      el('p', { class: 'fail', text: 'The privacy page could not be loaded. Reload to try again.' })));
  return page;
}
