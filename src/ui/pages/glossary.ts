import { el, mount } from '../dom';
import { loadContentFile } from '../../content/loader';
import { renderMarkdown } from '../markdown';

/* The glossary: every word a Learn section puts in bold. The words are content/glossary.md;
   its opening note is for whoever edits the file, so the page starts at the first term. */

export function glossaryPage(): HTMLElement {
  const page = el('article', { class: 'prose-page glossary-page' },
    el('p', { class: 'mentor-note', text: 'Loading the glossary.' }));
  loadContentFile('glossary.md')
    .then((markdown) => {
      const terms = markdown.slice(Math.max(0, markdown.indexOf('\n## ')));
      mount(page,
        el('h1', { class: 'display', text: 'Glossary' }),
        el('p', { text: 'Every new word from the lessons, in the order you meet them.' }),
        renderMarkdown(terms));
    })
    .catch(() => mount(page,
      el('h1', { class: 'display', text: 'Glossary' }),
      el('p', { class: 'fail', text: 'The glossary could not be loaded. Reload to try again.' })));
  return page;
}
