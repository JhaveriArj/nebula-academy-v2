import { el, mount } from '../dom';
import { icon } from '../icons';
import type { FriendlyError } from '../../runtime/errorTranslator';

/* The console. One of the two dark surfaces, so amber is allowed here.

   When something goes wrong, the kid sees one sentence in their own language, the line
   number, and the likely fix. The real javac or JVM text stays available behind a toggle,
   because a Tier 5 kid heading for Android Studio needs to recognise it. CLAUDE.md. */

export interface ConsolePanel {
  element: HTMLElement;
  setOutput(text: string): void;
  showError(error: FriendlyError | null): void;
  setStatus(text: string | null): void;
  clear(): void;
}

export function createConsolePanel(options: { onGoToLine?: (line: number) => void } = {}): ConsolePanel {
  const status = el('p', { class: 'console-status', role: 'status', 'aria-live': 'polite' });
  const problem = el('div', { class: 'console-problem' });
  const output = el('pre', { class: 'console-output', 'aria-label': 'Program output' });

  const element = el('div', { class: 'console on-dark' },
    el('div', { class: 'console-head' },
      el('span', { class: 'console-title display', text: 'Console' }),
      status,
    ),
    problem,
    output,
  );

  const clear = () => {
    mount(problem);
    output.textContent = '';
    mount(status);
  };

  return {
    element,
    clear,
    setStatus: (text) => {
      mount(status, text ?? '');
    },
    setOutput: (text) => {
      output.textContent = text;
      output.scrollTop = output.scrollHeight;
    },
    showError: (error) => {
      if (!error) {
        mount(problem);
        return;
      }
      const raw = el('pre', { class: 'console-raw', hidden: true, text: error.raw });
      const toggle = el('button', {
        type: 'button',
        class: 'link-button',
        'aria-expanded': 'false',
        onclick: () => {
          const shown = raw.hasAttribute('hidden');
          if (shown) raw.removeAttribute('hidden');
          else raw.setAttribute('hidden', '');
          toggle.setAttribute('aria-expanded', String(shown));
          toggle.textContent = shown ? 'Hide the real error' : 'Show the real error';
        },
      }, 'Show the real error');

      mount(problem,
        el('div', { class: `problem problem-${error.kind}` },
          el('p', { class: 'problem-headline' },
            icon(error.kind === 'limit' ? 'reset' : 'failed', 20),
            el('span', { text: error.headline }),
          ),
          error.fix ? el('p', { class: 'problem-fix', text: error.fix }) : null,
          el('p', { class: 'problem-actions' },
            error.line && options.onGoToLine
              ? el('button', {
                  type: 'button',
                  class: 'link-button',
                  onclick: () => options.onGoToLine?.(error.line!),
                }, `Go to line ${error.line}`)
              : null,
            toggle,
          ),
          raw,
        ),
      );
    },
  };
}
