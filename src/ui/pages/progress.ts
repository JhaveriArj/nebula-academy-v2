import { el, mount } from '../dom';
import { icon } from '../icons';
import { counts, exportJson, importJson, load, reset, tierCounts } from '../../progress/store';
import { pathway } from '../../content/loader';

/* Progress export and import. No account and no server, per CLAUDE.md, so a file is how a
   kid moves their work between a school Chromebook and home. */

export function progressPage(onChange: () => void): HTMLElement {
  const status = el('p', { class: 'muted', role: 'status', 'aria-live': 'polite' });
  const clearRow = el('div', { class: 'clear-row' });

  const download = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10);
    const link = el('a', { href: url, download: `nebula-progress-${stamp}.json` });
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    mount(status, 'Saved. Keep that file somewhere you will find it again.');
  };

  const file = el('input', {
    type: 'file',
    accept: '.json,application/json',
    class: 'visually-hidden',
    onchange: () => {
      const chosen = file.files?.[0];
      if (!chosen) return;
      chosen
        .text()
        .then((text) => {
          const result = importJson(text);
          if (result.ok) {
            mount(status, 'Loaded. Your chart has been brought up to date.');
            onChange();
            render();
          } else {
            mount(status, el('span', { class: 'fail', text: result.reason }));
          }
        })
        .catch(() => mount(status, el('span', { class: 'fail', text: 'That file could not be read.' })));
      file.value = '';
    },
  });

  const summary = el('div', { class: 'progress-summary' });
  const page = el('article', { class: 'prose-page' },
    el('h1', { text: 'Your progress' }),
    el('p', { class: 'lede', text: 'Nebula keeps your work in this browser. There is no account, so if this computer gets wiped, the file below is the only copy.' }),
    summary,
    el('h2', { text: 'Move it somewhere safe' }),
    el('p', { text: 'Saving gives you one .json file holding which lessons you have passed and the code you have written. Loading it on another computer picks up where you left off.' }),
    el('div', { class: 'button-row' },
      el('button', { type: 'button', class: 'btn', onclick: download }, icon('export', 20), el('span', { text: 'Save to a file' })),
      el('button', { type: 'button', class: 'btn', onclick: () => file.click() }, icon('import', 20), el('span', { text: 'Load from a file' })),
      file,
    ),
    status,
    el('h2', { text: 'Start again' }),
    el('p', { text: 'This clears every passed lesson and every piece of code you have written, in this browser only. Save a file first if you might want it back.' }),
    clearRow,
  );

  // Clearing cannot be undone, so it still asks first, but inline rather than through a
  // browser confirm(): the question names what is lost and the buttons say what they do.
  function askToClear(): void {
    const question = el('p', { class: 'clear-question', tabindex: '-1', text: 'Clear every passed lesson and all your saved code in this browser? A file you have already saved is not affected.' });
    mount(clearRow,
      question,
      el('div', { class: 'button-row' },
        el('button', {
          type: 'button',
          class: 'btn btn-danger',
          onclick: () => {
            reset();
            showClearButton();
            mount(status, 'Cleared. Tier 0 is open and the rest is locked again.');
            onChange();
            render();
          },
        }, el('span', { text: 'Yes, clear everything' })),
        el('button', { type: 'button', class: 'btn btn-quiet', onclick: () => { showClearButton(); (clearRow.querySelector('button') as HTMLElement | null)?.focus(); } },
          el('span', { text: 'Keep my progress' })),
      ),
    );
    question.focus();
  }

  function showClearButton(): void {
    mount(clearRow,
      el('div', { class: 'button-row' },
        el('button', { type: 'button', class: 'btn btn-danger', onclick: askToClear }, el('span', { text: 'Clear everything' })),
      ),
    );
  }
  showClearButton();

  function render(): void {
    const now = counts();
    mount(summary,
      el('p', { class: 'progress-count' },
        el('strong', { text: `${now.passed} of ${now.total}` }),
        ' lessons passed.',
      ),
      el('ul', { class: 'progress-tiers' },
        ...pathway.tiers.map((t) => {
          const c = tierCounts(t.tier);
          return el('li', {},
            el('span', { class: 'progress-tier-name', text: `Tier ${t.tier}, ${t.name}` }),
            el('span', { class: c.passed === c.total ? 'pass' : 'muted', text: `${c.passed} of ${c.total}` }),
          );
        }),
      ),
      el('p', { class: 'muted', text: `Last saved ${new Date(load().savedAt).toLocaleString()}.` }),
    );
  }

  render();
  return page;
}
