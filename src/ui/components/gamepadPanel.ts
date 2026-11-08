import { el } from '../dom';
import { emptyGamepad, type GamepadState } from '../../sim/simulation';

/* The on-screen controller.

   The baseline device in CLAUDE.md is a touchscreen Chromebook with no mouse and often no
   controller, so this has to be fully usable by thumb: every target clears 44 px, the
   sticks are dragged with pointer events, and nothing depends on hover. A real controller
   is used when one is plugged in, and the two can be used interchangeably.

   Pushing a stick forward reports a negative y, exactly as the real SDK does, so the minus
   sign Tier 3 lesson 06 teaches is the same minus sign here. */

export interface GamepadPanel {
  element: HTMLElement;
  /** Writes the current control state into the sim's gamepad. */
  apply(target: GamepadState): void;
  /** Starts polling a real controller, if one is connected. */
  start(): void;
  stop(): void;
  reset(): void;
}

interface StickState {
  x: number;
  y: number;
}

const BUTTONS: { key: keyof GamepadState; label: string; cls: string }[] = [
  { key: 'y', label: 'Y', cls: 'pad-y' },
  { key: 'x', label: 'X', cls: 'pad-x' },
  { key: 'b', label: 'B', cls: 'pad-b' },
  { key: 'a', label: 'A', cls: 'pad-a' },
];

const DPAD: { key: keyof GamepadState; label: string; cls: string }[] = [
  { key: 'dpad_up', label: 'Up', cls: 'dpad-up' },
  { key: 'dpad_left', label: 'Left', cls: 'dpad-left' },
  { key: 'dpad_right', label: 'Right', cls: 'dpad-right' },
  { key: 'dpad_down', label: 'Down', cls: 'dpad-down' },
];

const SHOULDERS: { key: keyof GamepadState; label: string }[] = [
  { key: 'left_bumper', label: 'LB' },
  { key: 'left_trigger', label: 'LT' },
  { key: 'right_trigger', label: 'RT' },
  { key: 'right_bumper', label: 'RB' },
];

export function createGamepadPanel(): GamepadPanel {
  const held = new Set<keyof GamepadState>();
  const left: StickState = { x: 0, y: 0 };
  const right: StickState = { x: 0, y: 0 };
  let realPad: number | null = null;
  let polling = false;

  const stick = (state: StickState, label: string, cls: string) => {
    const thumb = el('div', { class: 'stick-thumb' });
    const pad = el('div', {
      class: `stick ${cls}`,
      role: 'application',
      tabindex: '0',
      'aria-label': `${label} stick. Drag it, or use the arrow keys.`,
    }, el('div', { class: 'stick-well' }, thumb), el('span', { class: 'stick-label', text: label }));

    const place = (x: number, y: number) => {
      state.x = Math.max(-1, Math.min(1, x));
      state.y = Math.max(-1, Math.min(1, y));
      thumb.style.transform = `translate(${state.x * 32}px, ${state.y * 32}px)`;
    };

    const fromPointer = (event: PointerEvent) => {
      const box = pad.getBoundingClientRect();
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;
      const radius = Math.min(box.width, box.height) / 2 - 10;
      place((event.clientX - cx) / radius, (event.clientY - cy) / radius);
    };

    pad.addEventListener('pointerdown', (event) => {
      pad.setPointerCapture(event.pointerId);
      fromPointer(event);
      event.preventDefault();
    });
    pad.addEventListener('pointermove', (event) => {
      if (pad.hasPointerCapture(event.pointerId)) fromPointer(event);
    });
    const release = () => place(0, 0);
    pad.addEventListener('pointerup', release);
    pad.addEventListener('pointercancel', release);
    pad.addEventListener('lostpointercapture', release);

    // Keyboard, because a Chromebook without a touchscreen still has arrow keys.
    pad.addEventListener('keydown', (event) => {
      const step = 1;
      const map: Record<string, [number, number]> = {
        ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0],
      };
      const delta = map[event.key];
      if (!delta) return;
      place(delta[0], delta[1]);
      event.preventDefault();
    });
    pad.addEventListener('keyup', release);
    pad.addEventListener('blur', release);

    return pad;
  };

  const button = (key: keyof GamepadState, label: string, cls: string) => {
    const node = el('button', {
      type: 'button',
      class: `pad-button ${cls}`,
      'aria-pressed': 'false',
      'aria-label': label,
    }, el('span', { text: label }));
    const down = (on: boolean) => {
      if (on) held.add(key);
      else held.delete(key);
      node.setAttribute('aria-pressed', String(on));
    };
    node.addEventListener('pointerdown', (event) => {
      node.setPointerCapture(event.pointerId);
      down(true);
      event.preventDefault();
    });
    node.addEventListener('pointerup', () => down(false));
    node.addEventListener('pointercancel', () => down(false));
    node.addEventListener('lostpointercapture', () => down(false));
    node.addEventListener('keydown', (event) => {
      if (event.key === ' ' || event.key === 'Enter') {
        down(true);
        event.preventDefault();
      }
    });
    node.addEventListener('keyup', () => down(false));
    node.addEventListener('blur', () => down(false));
    return node;
  };

  const connected = el('span', { class: 'pad-connected muted', text: '' });

  const element = el('div', { class: 'gamepad on-dark' },
    el('div', { class: 'pad-head' },
      el('span', { class: 'pad-title display', text: 'Gamepad 1' }),
      connected,
    ),
    el('div', { class: 'pad-shoulders' },
      ...SHOULDERS.map((s) => button(s.key, s.label, 'pad-shoulder')),
    ),
    // Sticks first: they are what a kid drives with, and a row of two 96 px sticks over a
    // row of two button clusters is the shortest shape that fits a side column.
    el('div', { class: 'pad-main' },
      stick(left, 'Left', 'stick-left'),
      stick(right, 'Right', 'stick-right'),
      el('div', { class: 'dpad', role: 'group', 'aria-label': 'D-pad' },
        ...DPAD.map((d) => button(d.key, d.label, `dpad-button ${d.cls}`)),
      ),
      el('div', { class: 'pad-face', role: 'group', 'aria-label': 'Face buttons' },
        ...BUTTONS.map((b) => button(b.key, b.label, `pad-face-button ${b.cls}`)),
      ),
    ),
  );

  addEventListener('gamepadconnected', (event) => {
    realPad = (event as GamepadEvent).gamepad.index;
    connected.textContent = 'controller connected';
  });
  addEventListener('gamepaddisconnected', () => {
    realPad = null;
    connected.textContent = '';
  });

  const readReal = (target: GamepadState): boolean => {
    if (realPad === null || typeof navigator.getGamepads !== 'function') return false;
    const pad = navigator.getGamepads()[realPad];
    if (!pad) return false;
    const axis = (i: number) => {
      const v = pad.axes[i] ?? 0;
      return Math.abs(v) < 0.06 ? 0 : v; // deadband, as Tier 3 lesson 06 describes
    };
    target.left_stick_x = axis(0);
    target.left_stick_y = axis(1);
    target.right_stick_x = axis(2);
    target.right_stick_y = axis(3);
    const pressed = (i: number) => pad.buttons[i]?.pressed === true;
    const value = (i: number) => pad.buttons[i]?.value ?? 0;
    target.a = pressed(0);
    target.b = pressed(1);
    target.x = pressed(2);
    target.y = pressed(3);
    target.left_bumper = pressed(4);
    target.right_bumper = pressed(5);
    target.left_trigger = value(6);
    target.right_trigger = value(7);
    target.back = pressed(8);
    target.start = pressed(9);
    target.dpad_up = pressed(12);
    target.dpad_down = pressed(13);
    target.dpad_left = pressed(14);
    target.dpad_right = pressed(15);
    return true;
  };

  return {
    element,
    start: () => {
      polling = true;
    },
    stop: () => {
      polling = false;
    },
    reset: () => {
      held.clear();
      left.x = left.y = right.x = right.y = 0;
      for (const node of element.querySelectorAll('[aria-pressed]')) {
        node.setAttribute('aria-pressed', 'false');
      }
      for (const thumb of element.querySelectorAll<HTMLElement>('.stick-thumb')) {
        thumb.style.transform = 'translate(0px, 0px)';
      }
    },
    apply(target) {
      Object.assign(target, emptyGamepad());
      if (polling && readReal(target)) return;

      target.left_stick_x = left.x;
      target.left_stick_y = left.y;
      target.right_stick_x = right.x;
      target.right_stick_y = right.y;
      for (const key of held) {
        if (key === 'left_trigger' || key === 'right_trigger') target[key] = 1;
        else Object.assign(target, { [key]: true });
      }
    },
  };
}
