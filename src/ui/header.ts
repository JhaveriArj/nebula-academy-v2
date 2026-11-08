import { el } from './dom';
import { icon } from './icons';
import { getBigType, getMode, setBigType, setMode, type Mode } from '../progress/store';

/* The header. Light painted metal, per docs/DESIGN.md, so no amber appears here.
   The mode toggle is two buttons rather than a switch, because a switch does not say
   which way is which and a nine-year-old should not have to guess. */

export interface Header {
  element: HTMLElement;
  refresh(): void;
}

const BASE = import.meta.env.BASE_URL;

export function createHeader(onModeChange: () => void): Header {
  const modeButtons = new Map<Mode, HTMLButtonElement>();

  const makeModeButton = (mode: Mode, label: string, hint: string) => {
    const button = el('button', {
      type: 'button',
      class: 'mode-button',
      'aria-pressed': String(getMode() === mode),
      title: hint,
      onclick: () => {
        if (getMode() === mode) return;
        setMode(mode);
        applyMode();
        refresh();
        onModeChange();
      },
    }, label);
    modeButtons.set(mode, button);
    return button;
  };

  const bigType = el('button', {
    type: 'button',
    class: 'icon-button bigtype-button',
    'aria-pressed': String(getBigType()),
    // The visible label and the accessible name are the same words; on narrow headers the
    // label hides and the name stays.
    'aria-label': 'Larger text',
    onclick: () => {
      setBigType(!getBigType());
      applyMode();
      refresh();
    },
  }, icon('bigtype', 22), el('span', { class: 'bigtype-label', text: 'Larger text' }));

  const element = el('header', { class: 'site-header' },
    el('a', { href: '#/', class: 'wordmark', 'aria-label': 'Nebula Academy, home' },
      el('img', { src: `${BASE}art/mascot-112.png`, alt: '', width: '25', height: '44' }),
      el('span', { class: 'wordmark-name', text: 'Nebula Academy' }),
    ),
    el('nav', { class: 'site-nav', 'aria-label': 'Main' },
      el('a', { href: '#/chart', class: 'nav-link' }, icon('chart', 20), el('span', { text: 'Chart' })),
      el('a', { href: '#/mentor', class: 'nav-link' }, icon('mentor', 20), el('span', { text: 'Mentor' })),
      el('a', { href: '#/progress', class: 'nav-link' }, icon('passed', 20), el('span', { text: 'Progress' })),
      el('a', { href: '#/about', class: 'nav-link' }, el('span', { text: 'About' })),
    ),
    el('div', { class: 'header-controls' },
      el('div', { class: 'mode-toggle', role: 'group', 'aria-label': 'Reading mode' },
        makeModeButton('explorer', 'Explorer', 'Ages 9 to 12: larger text, more code filled in'),
        makeModeButton('builder', 'Builder', 'Ages 13 to 18: full editing and the Why panels'),
      ),
      bigType,
    ),
  );

  function refresh(): void {
    for (const [mode, button] of modeButtons) {
      button.setAttribute('aria-pressed', String(getMode() === mode));
    }
    bigType.setAttribute('aria-pressed', String(getBigType()));
  }

  return { element, refresh };
}

/** Mirrors the saved mode onto the document, where theme.css reads it. */
export function applyMode(): void {
  const root = document.documentElement;
  root.setAttribute('data-mode', getMode());
  root.setAttribute('data-bigtype', getBigType() ? 'on' : 'off');
}
