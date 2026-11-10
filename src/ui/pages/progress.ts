import { el, mount, prefersReducedMotion } from '../dom';
import { icon } from '../icons';
import { counts, exportJson, importJson, isPassed, load, reset, tierCounts } from '../../progress/store';
import { pathway } from '../../content/loader';
import { circledNumber, mascot, paper, tierEmblem } from '../kit';

/* Progress export and import. No account and no server, per CLAUDE.md, so a file is how a
   kid moves their work between a school Chromebook and home. */

export function progressPage(onChange: () => void): HTMLElement {
  const status = el('p', { class: 'progress-status', role: 'status', 'aria-live': 'polite' });
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
    // The visible "Load" button opens this; the input itself is not a second tab stop.
    'aria-label': 'Progress file to load',
    tabindex: '-1',
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
  const tiersTable = el('div', { class: 'progress-tiers' });
  const saved = el('div', { class: 'progress-saved' });
  const page = el('article', { class: 'progress-page' },
    el('header', { class: 'progress-head' },
      el('h1', { class: 'display', text: 'Your progress' }),
      el('p', { class: 'progress-lede', text: 'Nebula keeps your work in this browser. There is no account, so if this computer gets wiped, a saved file is the only copy.' }),
    ),
    summary,
    tiersTable,
    el('section', { class: 'progress-safe', 'aria-labelledby': 'progress-safe-title' },
      el('div', { class: 'progress-safe-text' },
        el('h2', { id: 'progress-safe-title', class: 'display', text: 'Move it somewhere safe' }),
        el('p', { text: 'Saving gives you one .json file holding which lessons you have passed and the code you have written. Loading it on another computer picks up where you left off.' }),
        el('div', { class: 'button-row' },
          el('button', { type: 'button', class: 'btn btn-quiet', onclick: download }, icon('import', 20), el('span', { text: 'Save to a file' })),
          el('button', { type: 'button', class: 'btn btn-quiet', onclick: () => file.click() }, icon('export', 20), el('span', { text: 'Load from a file' })),
          file,
        ),
        status,
        saved,
      ),
      // The mascot stands by the save buttons with the one piece of advice that matters.
      el('figure', { class: 'progress-mascot' },
        el('figcaption', { class: 'progress-bubble' }, paper('plain', el('span', { text: 'Save a file before you clear anything.' }))),
        mascot('full', { height: 190 }),
      ),
    ),
    el('section', { class: 'progress-danger', 'aria-labelledby': 'progress-danger-title' },
      el('h2', { id: 'progress-danger-title', class: 'display', text: 'Start again' }),
      el('p', { text: 'This clears every passed lesson and every piece of code you have written, in this browser only. Save a file first if you might want it back.' }),
      clearRow,
    ),
  );

  // Clearing cannot be undone, so it asks first, in a dialog drawn like the site's own panels
  // rather than the browser's confirm(): the question names what is lost and each button
  // says what it does. Escape and "Keep my progress" both leave everything as it was.
  const dialog = el('dialog', { class: 'panel-dialog', 'aria-labelledby': 'clear-title', 'aria-describedby': 'clear-body' },
    el('h2', { id: 'clear-title', class: 'display', text: 'Clear everything?' }),
    el('p', { id: 'clear-body', text: 'Every passed lesson and all your saved code in this browser will be gone. A file you have already saved is not affected.' }),
    el('div', { class: 'button-row' },
      el('button', { type: 'button', class: 'btn btn-quiet', autofocus: true, onclick: () => dialog.close() }, el('span', { text: 'Keep my progress' })),
      el('button', {
        type: 'button',
        class: 'btn btn-danger',
        onclick: () => {
          reset();
          dialog.close();
          mount(status, 'Cleared. Tier 0 is open and the rest is locked again.');
          onChange();
          render();
        },
      }, el('span', { text: 'Yes, clear everything' })),
    ),
  );
  page.append(dialog);
  mount(clearRow,
    el('div', { class: 'button-row' },
      el('button', { type: 'button', class: 'btn btn-danger', onclick: () => dialog.showModal() }, el('span', { text: 'Clear everything' })),
    ),
  );

  let first = true;
  function render(): void {
    const now = counts();
    const bar = el('span', { class: 'progress-bar-fill' });
    mount(summary,
      el('p', { class: 'progress-count' },
        el('span', { class: 'progress-count-num display' }, circledNumber(now.passed, 88)),
        el('span', { class: 'progress-count-of display', text: `/ ${now.total}` }),
        el('span', { class: 'progress-count-label', text: 'lessons passed' }),
      ),
      el('div', { class: 'progress-bar', role: 'img', 'aria-label': `${now.passed} of ${now.total} lessons passed` }, bar),
    );
    const share = now.total ? now.passed / now.total : 0;
    bar.style.transform = `scaleX(${share})`;
    if (first && !prefersReducedMotion()) {
      bar.animate([{ transform: 'scaleX(0)' }, { transform: `scaleX(${share})` }], { duration: 600, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
    }
    first = false;

    mount(tiersTable,
      el('h2', { class: 'visually-hidden', text: 'By tier' }),
      el('ol', { class: 'progress-tier-list' },
        ...pathway.tiers.map((t) => {
          const c = tierCounts(t.tier);
          return el('li', { class: `progress-tier${c.passed === c.total ? ' is-done' : ''}` },
            tierEmblem(t.tier, 28),
            el('span', { class: 'progress-tier-label' },
              el('span', { class: 'progress-tier-num', text: `Tier ${t.tier}` }),
              el('span', { class: 'progress-tier-name display', text: t.name }),
            ),
            // One segment per lesson, filled when it has passed.
            el('span', { class: 'progress-segments', 'aria-hidden': 'true' },
              ...t.lessons.map((l) => el('span', { class: `progress-seg${isPassed(l.id) ? ' is-on' : ''}` }))),
            el('span', { class: 'progress-tier-count', text: `${c.passed} of ${c.total}` }),
          );
        }),
      ),
    );
    mount(saved, lastSaved(load().savedAt));
  }

  render();
  return page;
}

/** "Last saved 3 minutes ago", with the exact date and time on the <time> element. */
function lastSaved(savedAt: string | number): HTMLElement {
  const when = new Date(savedAt);
  const seconds = Math.round((when.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  const [unit, size] = steps.find(([, n]) => Math.abs(seconds) >= n) ?? ['second', 1];
  const relative = Math.abs(seconds) < 30 ? 'a moment ago' : rtf.format(Math.round(seconds / size), unit);
  return el('p', { class: 'progress-when' },
    'Last saved ',
    el('time', { datetime: when.toISOString(), title: when.toLocaleString(), text: relative }),
    '.',
  );
}
