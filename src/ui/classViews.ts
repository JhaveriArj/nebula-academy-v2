import { el, mount } from './dom';
import { classesEnabled, ClassError } from '../classes/api';
import {
  addExistingClass, createClass, joinClass, leaveClass, membership, mentorClasses, refreshMembership,
} from '../classes/membership';

/* The two class panels: the kid's (on Progress) and the mentor's (on the mentor guides).
   Both render nothing when classes are not set up on this copy of Nebula. */

const say = (error: unknown) => (error instanceof ClassError ? error.message : 'Something went wrong. Try again in a minute.');

/** A labelled text field: a real <label>, a hint tied to the input, never a placeholder alone. */
function field(id: string, label: string, hint: string | null, input: Record<string, unknown>): { row: HTMLElement; input: HTMLInputElement } {
  const box = el('input', { id, class: 'class-input', type: 'text', autocomplete: 'off', spellcheck: 'false', ...(hint ? { 'aria-describedby': `${id}-hint` } : {}), ...input });
  return {
    input: box,
    row: el('div', { class: 'class-field' },
      el('label', { for: id, text: label }),
      box,
      hint ? el('p', { id: `${id}-hint`, class: 'class-hint', text: hint }) : null),
  };
}

// ------------------------------------------------------------------ the kid

export function kidClassPanel(): HTMLElement | null {
  if (!classesEnabled()) return null;
  const panel = el('section', { class: 'class-panel', 'aria-labelledby': 'class-title' });
  const status = el('p', { class: 'class-status', role: 'status', 'aria-live': 'polite' });

  const render = () => {
    const m = membership();
    if (m) {
      const dialog = el('dialog', { class: 'panel-dialog', 'aria-labelledby': 'leave-title' },
        el('h2', { id: 'leave-title', class: 'display', text: 'Leave the class?' }),
        el('p', { text: `Your nickname and the list of lessons you passed are deleted from ${m.className}. Your progress in this browser stays as it is.` }),
        el('div', { class: 'button-row' },
          el('button', { type: 'button', class: 'btn btn-quiet', autofocus: true, onclick: () => dialog.close() }, el('span', { text: 'Stay in the class' })),
          el('button', {
            type: 'button', class: 'btn btn-danger',
            onclick: async () => {
              dialog.close();
              try {
                await leaveClass();
                mount(status, 'You have left the class.');
                render();
              } catch (error) {
                mount(status, el('span', { class: 'fail', text: say(error) }));
              }
            },
          }, el('span', { text: 'Yes, leave' })),
        ),
      );
      mount(panel,
        el('h2', { id: 'class-title', class: 'display', text: 'Your class' }),
        el('p', {}, 'You are in ', el('strong', { text: m.className }), ' as ', el('strong', { text: m.nickname }), '.'),
        el('p', { class: 'class-hint', text: 'Your mentor can see which lessons you have passed and when. Nothing else is sent: not your code, not your name.' }),
        el('div', { class: 'button-row' },
          el('button', { type: 'button', class: 'btn btn-quiet', onclick: () => dialog.showModal() }, el('span', { text: 'Leave the class' }))),
        status,
        dialog,
      );
      return;
    }

    const code = field('class-code', 'Class code', 'Six letters and numbers, from your mentor.', { maxlength: '6', autocapitalize: 'characters', inputmode: 'text', class: 'class-input is-code' });
    const nick = field('class-nick', 'Nickname', 'Use a first name or a made-up name, never your full name.', { maxlength: '24' });
    const join = el('button', { type: 'submit', class: 'btn btn-quiet' }, el('span', { text: 'Join the class' }));
    const form = el('form', {
      class: 'class-form',
      onsubmit: async (event: Event) => {
        event.preventDefault();
        if (!code.input.value.trim() || !nick.input.value.trim()) {
          mount(status, el('span', { class: 'fail', text: 'Fill in both the class code and a nickname.' }));
          return;
        }
        join.setAttribute('disabled', '');
        mount(status, 'Joining.');
        try {
          await joinClass(code.input.value, nick.input.value);
          mount(status, 'Joined. Your mentor can see your passed lessons now.');
          render();
        } catch (error) {
          mount(status, el('span', { class: 'fail', text: say(error) }));
        } finally {
          join.removeAttribute('disabled');
        }
      },
    }, code.row, nick.row, el('div', { class: 'button-row' }, join));
    mount(panel,
      el('h2', { id: 'class-title', class: 'display', text: 'Join a class' }),
      el('p', { text: 'If your mentor gave you a class code, join here and they can see which lessons you have passed. You do not need an account, and you can leave at any time.' }),
      form,
      status,
    );
  };

  render();
  void refreshMembership().then(render).catch(() => undefined);
  return panel;
}

// ------------------------------------------------------------------ the mentor

export function mentorClassPanel(): HTMLElement | null {
  if (!classesEnabled()) return null;
  const panel = el('section', { class: 'class-panel is-paper', 'aria-labelledby': 'classes-title' });
  const status = el('p', { class: 'class-status', role: 'status', 'aria-live': 'polite' });
  let justMade: { code: string; key: string } | null = null;

  const render = () => {
    const classes = mentorClasses();
    const name = field('class-name', 'Class name', 'What you call the group, for example "Tuesday robotics".', { maxlength: '60' });
    const make = el('button', { type: 'submit', class: 'btn btn-quiet' }, el('span', { text: 'Make a class' }));
    const code = field('class-add-code', 'Class code', null, { maxlength: '6', autocapitalize: 'characters', class: 'class-input is-code' });
    const key = field('class-add-key', 'Mentor key', null, { maxlength: '64' });

    mount(panel,
      el('h2', { id: 'classes-title', class: 'display', text: 'Your classes' }),
      el('p', { text: 'Make a class, give the kids its code, and see which lessons each of them has passed. Kids join with a nickname, no account and no email.' }),
      justMade
        ? el('div', { class: 'class-made' },
            el('p', {}, 'Give the kids this code: ', el('strong', { class: 'class-code-big', text: justMade.code })),
            el('p', {}, 'Your mentor key is ', el('code', { text: justMade.key }), '. Keep a copy: it is the only way to open this class on another computer, and Nebula cannot show it again.'),
            el('button', { type: 'button', class: 'btn btn-quiet', onclick: () => { void navigator.clipboard?.writeText(`Class ${justMade!.code}, mentor key ${justMade!.key}`); mount(status, 'Copied the code and key.'); } }, el('span', { text: 'Copy code and key' })),
          )
        : null,
      classes.length
        ? el('ul', { class: 'class-list' }, ...classes.map((c) => el('li', {},
            el('a', { href: `#/class/${c.code}`, class: 'class-link' },
              el('span', { class: 'class-list-name', text: c.name }),
              el('span', { class: 'class-list-code', text: c.code })))))
        : null,
      el('form', {
        class: 'class-form',
        onsubmit: async (event: Event) => {
          event.preventDefault();
          if (!name.input.value.trim()) { mount(status, el('span', { class: 'fail', text: 'Give the class a name first.' })); return; }
          make.setAttribute('disabled', '');
          try {
            const c = await createClass(name.input.value);
            justMade = { code: c.code, key: c.key };
            render();
            mount(status, `Made ${c.name}.`);
          } catch (error) {
            mount(status, el('span', { class: 'fail', text: say(error) }));
          } finally {
            make.removeAttribute('disabled');
          }
        },
      }, name.row, el('div', { class: 'button-row' }, make)),
      el('details', { class: 'class-elsewhere' },
        el('summary', { text: 'Open a class you made on another computer' }),
        el('form', {
          class: 'class-form',
          onsubmit: async (event: Event) => {
            event.preventDefault();
            try {
              const c = await addExistingClass(code.input.value, key.input.value);
              render();
              mount(status, `Added ${c.name}.`);
            } catch (error) {
              mount(status, el('span', { class: 'fail', text: say(error) }));
            }
          },
        }, code.row, key.row, el('div', { class: 'button-row' }, el('button', { type: 'submit', class: 'btn btn-quiet' }, el('span', { text: 'Open it here' })))),
      ),
      status,
    );
  };
  render();
  return panel;
}
