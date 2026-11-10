import { el } from './dom';
import { icon } from './icons';
import { mascotHead } from './mascot';
import { getAppearance, getBigType, getMode, setAppearance, setBigType, setMode, type Appearance, type Mode } from '../progress/store';

/* The header. The mode toggle is two buttons rather than a switch, because a switch does
   not say which way is which and a nine-year-old should not have to guess.

   Text size and light/dark live together behind one Display button, in a native popover
   (top layer, light dismiss, Escape closes it), so the header holds one kind of control per
   job instead of three (HIG toolbars.md: "avoid overcrowding"). */

export interface Header {
  element: HTMLElement;
  refresh(): void;
}


export function createHeader(onModeChange: () => void): Header {
  const modeButtons = new Map<Mode, HTMLButtonElement>();

  // Each mode button explains itself in a small tooltip that shows on hover and on keyboard
  // focus alike (never hover only), and is read out as the button's description.
  const makeModeButton = (mode: Mode, label: string, hint: string) => {
    const tipId = `mode-tip-${mode}`;
    const button = el('button', {
      type: 'button',
      class: 'mode-button',
      'aria-pressed': String(getMode() === mode),
      'aria-describedby': tipId,
      onclick: () => {
        if (getMode() === mode) return;
        setMode(mode);
        applyMode();
        refresh();
        onModeChange();
      },
    }, label, el('span', { class: 'mode-tip', id: tipId, 'aria-hidden': 'true', text: hint }));
    modeButtons.set(mode, button);
    return button;
  };

  const bigType = el('button', {
    type: 'button',
    class: 'display-toggle',
    role: 'switch',
    'aria-checked': String(getBigType()),
    onclick: () => {
      setBigType(!getBigType());
      applyMode();
      refresh();
    },
  }, el('span', { text: 'Larger text' }), el('span', { class: 'display-switch', 'aria-hidden': 'true' }));

  const appearanceButtons = new Map<Appearance, HTMLButtonElement>();
  const appearanceButton = (value: Appearance, label: string) => {
    const button = el('button', {
      type: 'button',
      class: 'mode-button',
      'aria-pressed': String(getAppearance() === value),
      onclick: () => {
        setAppearance(value);
        applyMode();
        refresh();
      },
    }, label);
    appearanceButtons.set(value, button);
    return button;
  };

  const panel = el('div', { id: 'display-panel', class: 'display-panel', popover: 'auto', role: 'dialog', 'aria-label': 'Display' },
    el('p', { class: 'display-title', text: 'Display' }),
    bigType,
    el('p', { class: 'display-label', id: 'appearance-label', text: 'Light or dark' }),
    el('div', { class: 'mode-toggle', role: 'group', 'aria-labelledby': 'appearance-label' },
      appearanceButton('auto', 'Auto'),
      appearanceButton('light', 'Light'),
      appearanceButton('dark', 'Dark'),
    ),
    el('p', { class: 'display-note', text: 'Auto follows this computer\'s setting.' }),
  );

  const displayButton = el('button', {
    type: 'button',
    class: 'icon-button display-button',
    popovertarget: 'display-panel',
    'aria-label': 'Display',
  }, icon('contrast', 22), el('span', { class: 'display-button-label', text: 'Display' }));

  const navLinks = [['Chart', '#/chart'], ['Mentor', '#/mentor'], ['Progress', '#/progress'], ['About', '#/about']]
    .map(([label, href]) => el('a', { href: href!, class: 'nav-link' }, el('span', { text: label! })));
  const indicator = el('span', { class: 'nav-indicator', 'aria-hidden': 'true' });
  const nav = el('nav', { class: 'site-nav', 'aria-label': 'Main' }, ...navLinks, indicator);

  const element = el('header', { class: 'site-header' },
    el('a', { href: '#/', class: 'wordmark', 'aria-label': 'Nebula Academy, home' },
      // Head and name share a baseline inside a box the link centres.
      el('span', { class: 'wordmark-lockup' },
        mascotHead(28),
        el('span', { class: 'wordmark-name', text: 'Nebula Academy' }),
      ),
    ),
    nav,
    el('div', { class: 'header-controls' },
      el('div', { class: 'mode-toggle', role: 'group', 'aria-label': 'Reading mode' },
        makeModeButton('explorer', 'Explorer', 'Explorer: ages 9 to 12, more help'),
        makeModeButton('builder', 'Builder', 'Builder: ages 13 to 18, full editor'),
      ),
      displayButton,
    ),
    panel,
  );

  // The current page gets a 2px yellow underline that slides from item to item, moved with a
  // transform so it never triggers layout.
  function placeIndicator(): void {
    const current = navLinks.find((a) => a.getAttribute('aria-current') === 'page');
    indicator.classList.toggle('is-shown', !!current);
    if (!current) return;
    const span = current.querySelector('span') ?? current;
    const navBox = nav.getBoundingClientRect();
    const box = span.getBoundingClientRect();
    indicator.style.transform = `translateX(${box.left - navBox.left}px) scaleX(${box.width / 100})`;
  }
  addEventListener('resize', () => placeIndicator());

  function refresh(): void {
    const section = location.hash.replace(/^#\/?/, '').split('/')[0] ?? '';
    for (const a of navLinks) {
      if (a.getAttribute('href') === `#/${section}`) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    requestAnimationFrame(placeIndicator);
    for (const [mode, button] of modeButtons) {
      button.setAttribute('aria-pressed', String(getMode() === mode));
    }
    bigType.setAttribute('aria-checked', String(getBigType()));
    for (const [value, button] of appearanceButtons) {
      button.setAttribute('aria-pressed', String(getAppearance() === value));
    }
  }

  return { element, refresh };
}

/** Mirrors the saved mode onto the document, where theme.css reads it. */
export function applyMode(): void {
  const root = document.documentElement;
  root.setAttribute('data-mode', getMode());
  root.setAttribute('data-bigtype', getBigType() ? 'on' : 'off');
  const appearance = getAppearance();
  const before = root.getAttribute('data-theme');
  if (appearance === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', appearance);
  // The field canvas cannot read CSS variables live; tell it to repaint.
  if (before !== root.getAttribute('data-theme')) dispatchEvent(new Event('nebula:appearance'));
}
