import { el, mount } from '../dom';
import { icon } from '../icons';
import { pathway } from '../../content/loader';
import { api, classesEnabled, ClassError, type ClassReport } from '../../classes/api';
import { deleteClass, forgetClass, mentorClasses } from '../../classes/membership';
import { tierEmblem } from '../kit';

/* One class, for its mentor: each kid's nickname, how many lessons they have passed, a
   segment per lesson by tier, and when they last passed one. Only reachable with the class's
   mentor key, which lives in this browser. */

export function classPage(code: string): HTMLElement {
  const page = el('article', { class: 'progress-page class-page' });
  const mine = mentorClasses().find((c) => c.code === code);

  if (!classesEnabled() || !mine) {
    mount(page,
      el('h1', { class: 'display', text: 'Class not found here' }),
      el('p', { text: classesEnabled()
        ? 'This browser does not have the mentor key for that class. Open it from the mentor guides with its code and key.'
        : 'Classes are not set up on this copy of Nebula.' }),
      el('p', {}, el('a', { href: '#/mentor', text: 'Back to the mentor guides' })),
    );
    return page;
  }

  const status = el('p', { class: 'class-status', role: 'status', 'aria-live': 'polite' });
  const body = el('div', { class: 'class-body' }, el('p', { class: 'class-hint', text: 'Loading the class.' }));
  const askFirst = (title: string, text: string, yes: string, action: () => Promise<void>) => {
    const dialog = el('dialog', { class: 'panel-dialog', 'aria-labelledby': 'confirm-title' },
      el('h2', { id: 'confirm-title', class: 'display', text: title }),
      el('p', { text }),
      el('div', { class: 'button-row' },
        el('button', { type: 'button', class: 'btn btn-quiet', autofocus: true, onclick: () => { dialog.close(); dialog.remove(); } }, el('span', { text: 'Cancel' })),
        el('button', { type: 'button', class: 'btn btn-danger', onclick: async () => { dialog.close(); dialog.remove(); try { await action(); } catch (e) { mount(status, el('span', { class: 'fail', text: e instanceof ClassError ? e.message : 'That did not work. Try again.' })); } } }, el('span', { text: yes })),
      ),
    );
    page.append(dialog);
    dialog.showModal();
  };

  const refresh = el('button', { type: 'button', class: 'btn btn-quiet', onclick: () => void load() }, el('span', { text: 'Refresh' }));
  mount(page,
    el('p', {}, el('a', { href: '#/mentor', class: 'class-back' }, icon('back', 20), 'Mentor guides')),
    el('header', { class: 'progress-head' },
      el('h1', { class: 'display', text: mine.name }),
      el('p', { class: 'progress-lede' }, 'Class code ', el('strong', { class: 'class-code-big', text: mine.code }), '. Kids join it from their Progress page.'),
    ),
    el('div', { class: 'button-row' }, refresh),
    status,
    body,
    el('section', { class: 'progress-danger', 'aria-labelledby': 'class-danger' },
      el('h2', { id: 'class-danger', class: 'display', text: 'Close the class' }),
      el('p', { text: 'Deleting the class removes every nickname and pass in it from the server. Kids keep their progress in their own browsers.' }),
      el('div', { class: 'button-row' },
        el('button', { type: 'button', class: 'btn btn-quiet', onclick: () => askFirst('Forget this class here?', `The class stays on the server, but this computer forgets ${mine.name} and its mentor key. Without the key nobody can open it again or delete its nicknames. Copy the key first if you might need it.`, 'Yes, forget it', async () => { forgetClass(mine.code); location.hash = '#/mentor'; }) }, el('span', { text: 'Forget it on this computer' })),
        el('button', { type: 'button', class: 'btn btn-danger', onclick: () => askFirst('Delete the class?', `Every nickname and pass in ${mine.name} is deleted. This cannot be undone.`, 'Yes, delete it', async () => { await deleteClass(mine); location.hash = '#/mentor'; }) }, el('span', { text: 'Delete the class' })),
      ),
    ),
  );

  async function load(): Promise<void> {
    refresh.setAttribute('disabled', '');
    try {
      const report = await api.classReport(mine!.code, mine!.key);
      mount(body, table(report));
      mount(status, '');
    } catch (error) {
      mount(status, el('span', { class: 'fail', text: error instanceof ClassError ? error.message : 'The class could not be loaded.' }));
    } finally {
      refresh.removeAttribute('disabled');
    }
  }

  function table(report: ClassReport): HTMLElement {
    const total = pathway.tiers.reduce((n, t) => n + t.lessons.length, 0);
    if (report.members.length === 0) {
      return el('p', { class: 'class-empty', text: `Nobody has joined yet. Give the kids the code ${report.code}; they join from their Progress page.` });
    }
    return el('ol', { class: 'class-table' },
      el('li', { class: 'class-row is-head', 'aria-hidden': 'true' },
        el('span', { text: 'Nickname' }),
        el('span', { text: 'Passed' }),
        ...pathway.tiers.map((t) => el('span', { class: 'class-tier-head' }, tierEmblem(t.tier, 20), el('span', { text: `Tier ${t.tier}` }))),
        el('span', { text: 'Last pass' }),
        el('span'),
      ),
      ...report.members.map((m) => {
        const passed = new Set(m.passes.map((p) => p.lesson_id));
        const last = m.passes.reduce<string | null>((a, p) => (a && a > p.passed_at ? a : p.passed_at), null);
        return el('li', { class: 'class-row' },
          el('span', { class: 'class-nick display', text: m.nickname }),
          el('span', { class: 'class-count', text: `${passed.size} / ${total}` }),
          ...pathway.tiers.map((t) => {
            const n = t.lessons.filter((l) => passed.has(l.id)).length;
            return el('span', { class: 'progress-segments', role: 'img', 'aria-label': `Tier ${t.tier}: ${n} of ${t.lessons.length}` },
              ...t.lessons.map((l) => el('span', { class: `progress-seg${passed.has(l.id) ? ' is-on' : ''}`, title: l.title })));
          }),
          el('span', { class: 'class-when', text: last ? relative(last) : 'not yet' }),
          el('button', {
            type: 'button', class: 'btn btn-quiet class-remove', 'aria-label': `Remove ${m.nickname} from the class`,
            onclick: () => askFirst(`Remove ${m.nickname}?`, `${m.nickname} and their passes are deleted from the class. Their progress in their own browser stays.`, 'Remove', async () => { await api.removeMember(mine!.code, mine!.key, m.id); await load(); }),
          }, el('span', { text: 'Remove' })),
        );
      }),
    );
  }

  void load();
  return page;
}

function relative(iso: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  const [unit, size] = steps.find(([, n]) => Math.abs(seconds) >= n) ?? ['second', 1];
  return Math.abs(seconds) < 60 ? 'a moment ago' : rtf.format(Math.round(seconds / size), unit);
}
