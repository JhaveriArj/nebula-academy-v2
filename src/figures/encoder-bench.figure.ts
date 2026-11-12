import * as k from './kit/iso-kit';
import { TICKS_PER_REV, TICKS_PER_CM } from '../sim/simulation';

/* Fig: the encoder bench. A goBILDA-style gearmotor stands on a plate; on its shaft are a
   slotted counting disc, read by a sensor fork, and a 9.6 cm wheel that winds a tape. The tape
   pulls a carriage along a 40 cm ruler. So one picture shows the whole chain a Tier 4 kid has
   to hold in their head: setPower turns the motor, the disc counts ticks, and ticks are
   distance (537.7 a turn, 30.16 cm a turn, 17.8 a centimetre: the same constants the
   simulator uses). Honest simplification, said in the caption: a real 5203's encoder sits on
   the fast motor shaft before the gearbox; here the disc rides the wheel shaft so it can be
   watched. */

// ---------------------------------------------------------------- the model (pure, tested)

export const RPM = 312;
export const MAX_TICKS_PER_S = (RPM / 60) * TICKS_PER_REV; // 2796 at power 1
export const RULER_CM = 30; // one turn of the wheel is 30.16 cm, so the ruler is one turn long
export const MAX_TICKS = RULER_CM * TICKS_PER_CM;

export interface BenchState {
  ticks: number;
  power: number;
  /** RUN_TO_POSITION target in ticks, or null in plain setPower mode. */
  target: number | null;
}

/** Advances the bench by dt seconds. RUN_TO_POSITION slows inside the last 60 ticks and
    stops within 5, as a motor controller's own loop does; the end stops stall the motor. */
export function stepBench(s: BenchState, dt: number): BenchState {
  let power = s.power;
  const target = s.target;
  if (target !== null) {
    const error = target - s.ticks;
    if (Math.abs(error) < 5) return { ticks: target, power: 0, target: null };
    power = Math.sign(error) * Math.min(Math.abs(s.power), Math.abs(error) / 60 + 0.08);
    // Never step past the target: a long step would overshoot and hunt back and forth forever.
    const move = Math.sign(error) * Math.min(Math.abs(error), Math.abs(power) * MAX_TICKS_PER_S * dt);
    return { ticks: s.ticks + move, power: s.power, target };
  }
  const ticks = Math.max(0, Math.min(MAX_TICKS, s.ticks + power * MAX_TICKS_PER_S * dt));
  return { ticks, power, target };
}

export const isBusy = (s: BenchState) => s.target !== null;
export const cmOf = (ticks: number) => ticks / TICKS_PER_CM;

// ---------------------------------------------------------------- the drawing

const U = 3; // world units per centimetre
const W = 640, H = 400;
const PLATE = { x: -150, y: -60, w: 270, d: 120, r: 8 };
const PLATE_H = 12, FOOT_H = 5;
const M: k.Plane = [-112, -6];       // the motor's axis
const MOTOR_R = 11, MOTOR_TOP = 40, GEAR_TOP = 52;
const DISC_R = 24, DISC_Z = 54, DISC_H = 1.6;
const WHEEL_R = 4.8 * U, WHEEL_Z = 60, WHEEL_H = 9;
const TAPE_Z = 64.5;
const TAPE_Y = M[1] - WHEEL_R;      // the tape leaves the wheel on its back edge
const X0 = -70;                      // the ruler's 0 cm
const CARRIAGE = { w: 26, d: 22 };
const MAST_TOP = TAPE_Z + 1.5;
const SLOTS = 16;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [M[0], M[1], WHEEL_Z + WHEEL_H], [X0 + RULER_CM * U, TAPE_Y, MAST_TOP]],
  W, H, { pad: 28, azimuth: 38 },
);
const at = (p: k.Point3) => k.iso(p, P);
const S = (paths: Parameters<typeof k.solidSvg>[0], style?: Parameters<typeof k.solidSvg>[1]) => k.solidSvg(paths, style);
const L = (d: string, style?: Parameters<typeof k.lineSvg>[1]) => k.lineSvg(d, style);
const D = (points: k.Flat[], style?: Parameters<typeof k.dotsSvg>[1]) => k.dotsSvg(points, style);
const byDepth = (points: k.Plane[]) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function plate(): string {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: 'lo' }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: 'mid' }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: 'mid' }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: 'lo' }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(''), { tone: 'lo' }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // The ruler: 0 to 40 cm along the front, a tick a centimetre, a long one every 5.
  const strip = { x: X0 - 6, y: PLATE.y + PLATE.d - 18, w: RULER_CM * U + 12, d: 9, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }));
  const ticks = k.topTicks(X0, X0 + RULER_CM * U, U, 5, strip.y + 0.8, 0.6, [2.2, 4.2], P);
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }));
  for (let cm = 0; cm <= RULER_CM; cm += 10) { // engraved, like a real rule; the readout says the number
    out.push(k.faceTextSvg(k.topMatrix([X0 + cm * U, strip.y + 7.4], 0.6, P, 'x'), String(cm), { size: 3, tone: 'lo', anchor: 'middle' }));
  }
  out.push(D([at([strip.x + 2, strip.y + 4.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 4.5, 0.6])], { size: 0.45 }));
  return out.join('');
}

function rail(): string {
  const out: string[] = [];
  const y = TAPE_Y - 4;
  out.push(S(k.slabOf({ x: X0 - 16, y, w: RULER_CM * U + 30, d: 8, r: 1 }, 0, 3, P, 3, 0.4), { tone: 'mid' }));
  out.push(L(k.lineOnTop([X0 - 14, y + 4], [X0 + RULER_CM * U + 12, y + 4], 3, P), { tone: 'faint' }));
  for (const x of [X0 - 21, X0 + RULER_CM * U + CARRIAGE.w / 2 + 2]) {
    out.push(S(k.slabOf({ x, y: y - 3, w: 5, d: 14, r: 1.2 }, 0, 8, P, 3, 0.5), { tone: 'mid' }));
    out.push(D([at([x + 2.5, y, 8]), at([x + 2.5, y + 8, 8])], { size: 0.45 }));
  }
  return out.join('');
}

function carriage(): string {
  const plan = { x: -CARRIAGE.w / 2, y: TAPE_Y - CARRIAGE.d / 2, w: CARRIAGE.w, d: CARRIAGE.d, r: 2.5 };
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(plan, 3), 3, 0.1, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.slabOf(plan, 3, 6, P, 5, 0.6), { tone: 'mid' }));
  out.push(L(k.planOutline(k.insetPlan(plan, 3), 9, P, 4), { tone: 'faint' }));
  out.push(D(k.corners(plan, 3.5).map(([x, y]) => at([x, y, 9])), { size: 0.4, tone: 'lo' }));
  // The pointer that reads the ruler, and the mast the tape is tied to.
  out.push(S(k.slabOf({ x: -1.2, y: plan.y + plan.d, w: 2.4, d: PLATE.y + PLATE.d - 18 - (plan.y + plan.d) + 1, r: 0.6 }, 6, 1.2, P, 2), { tone: 'hi', lit: true }));
  out.push(S(k.cylinder(0, TAPE_Y, 2, 9, MAST_TOP - 9, P, 18), { tone: 'mid' }));
  out.push(L(k.ring(0, TAPE_Y, 2.8, MAST_TOP, P, 18), { tone: 'hi' }));
  return out.join('');
}

function motor(): string {
  const [x, y] = M;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: x - 14, y: y - 14, w: 28, d: 28, r: 14 }, 0, 0.1, P)}" style="filter:blur(5px)"/>`];
  // Mount bracket, then the can, the gearbox and the shaft collar.
  out.push(S(k.slabOf({ x: x - 16, y: y - 16, w: 32, d: 32, r: 3 }, 0, 3, P, 6, 0.5), { tone: 'mid' }));
  out.push(D(k.corners({ x: x - 16, y: y - 16, w: 32, d: 32, r: 3 }, 4).map(([px, py]) => at([px, py, 3])), { size: 0.45 }));
  out.push(S(k.cylinder(x, y, MOTOR_R, 3, MOTOR_TOP - 3, P, 40, 0.6), { tone: 'mid' }));
  out.push(L([14, 22, 30].map((z) => k.sideArc(x, y, MOTOR_R, z, P, 20)).join(''), { tone: 'faint' }));
  out.push(S(k.cylinder(x, y, MOTOR_R + 1.4, MOTOR_TOP, GEAR_TOP - MOTOR_TOP, P, 40, 0.6), { tone: 'mid' }));
  out.push(L(k.sideArc(x, y, MOTOR_R + 1.4, MOTOR_TOP + 6, P, 20), { tone: 'lo' }));
  out.push(L(k.ring(x, y, MOTOR_R - 1, GEAR_TOP, P, 32), { tone: 'lo' }));
  out.push(D([0, 1, 2, 3].map((i) => at([x + Math.cos(i * Math.PI / 2 + 0.4) * 8, y + Math.sin(i * Math.PI / 2 + 0.4) * 8, GEAR_TOP])), { size: 0.45 }));
  out.push(S(k.cylinder(x, y, 3.2, GEAR_TOP, DISC_Z - GEAR_TOP, P, 20), { tone: 'hi' }));
  // The sensor fork that reads the disc's slots: two jaws, one either side of the rim.
  const fork = { x: x + DISC_R - 4, y: y - 3, w: 10, d: 6, r: 1 };
  out.push(S(k.slabOf(fork, GEAR_TOP - 4, 3, P, 3, 0.4), { tone: 'mid' }));
  out.push(S(k.slabOf({ ...fork, x: fork.x + 6, w: 4 }, GEAR_TOP - 1, DISC_Z + DISC_H + 3 - GEAR_TOP + 1, P, 3, 0.4), { tone: 'mid' }));
  return out.join('');
}

const discSlots = (turn: number) =>
  k.radialTicks(M[0], M[1], DISC_R - 1.2, SLOTS, SLOTS, DISC_Z + DISC_H, [6, 6], P, turn * Math.PI * 2);
const spokes = (turn: number) => {
  const [x, y] = M;
  return [0, 1, 2].map((i) => {
    const a = turn * Math.PI * 2 + (i * Math.PI * 2) / 3;
    return k.lineOnTop([x + Math.cos(a) * 3.6, y + Math.sin(a) * 3.6], [x + Math.cos(a) * (WHEEL_R - 3), y + Math.sin(a) * (WHEEL_R - 3)], WHEEL_Z + WHEEL_H, P);
  }).join('');
};

function disc(): string {
  const [x, y] = M;
  return S(k.cylinder(x, y, DISC_R, DISC_Z, DISC_H, P, 64), { tone: 'mid' }) +
    `<path data-part="slots" class="iso-line" data-tone="hi" d="${discSlots(0).major}"/>` +
    S(k.cylinder(x, y, 3.6, DISC_Z + DISC_H, WHEEL_Z - DISC_Z - DISC_H, P, 20), { tone: 'mid' });
}

function wheel(): string {
  const [x, y] = M;
  return S(k.cylinder(x, y, WHEEL_R, WHEEL_Z, WHEEL_H, P, 64, 0.8), { tone: 'hi', crease: 'lo', lit: true }) +
    L(k.knurl(x, y, WHEEL_R, WHEEL_Z + 1.5, WHEEL_Z + WHEEL_H - 1.5, 72, P, 0.3), { tone: 'lo' }) +
    L(k.ring(x, y, WHEEL_R - 2.2, WHEEL_Z + WHEEL_H, P, 64), { tone: 'lo' }) +
    `<path data-part="spokes" class="iso-line" data-tone="mid" d="${spokes(0)}"/>` +
    L(k.ring(x, y, 3.6, WHEEL_Z + WHEEL_H, P, 18), { tone: 'mid' }) +
    D([at([x, y, WHEEL_Z + WHEEL_H])], { size: 0.6, tone: 'hi' });
}

const tapeTo = (cm: number) => k.lineOnTop([M[0], TAPE_Y], [X0 + cm * U, TAPE_Y], TAPE_Z, P);

function figure(): string {
  return k.figureSvg({
    width: W,
    height: H,
    label: 'A motor stands on a plate. On its shaft are a slotted disc, read by a sensor fork, and a wheel 9.6 centimetres across. The wheel winds a tape that pulls a carriage along a 40 centimetre ruler. Every turn of the wheel is 537.7 ticks and moves the carriage 30.16 centimetres.',
    body: [
      plate(),
      rail(),
      `<g data-part="carriage" transform="${k.translateAlong(P, [X0, 0, 0])}">${carriage()}</g>`,
      `<path data-part="tape" class="iso-line" data-tone="hi" d="${tapeTo(0)}" style="stroke-width:1"/>`,
      motor(),
      disc(),
      wheel(),
    ],
  });
}

// ---------------------------------------------------------------- live

const POWERS = [0.5, -0.5, 0] as const;
const DRIVE_CM = 20;

export function mount(host: HTMLElement): () => void {
  const readout = (s: BenchState) =>
    `${Math.round(s.ticks)} ticks · ${cmOf(s.ticks).toFixed(1)} cm${isBusy(s) ? ' · isBusy()' : ''}`;
  host.innerHTML = k.plateHtml({
    fig: 'Fig 4',
    title: 'Encoder bench',
    hint: 'Press a button',
    readout: readout({ ticks: 0, power: 0, target: null }),
    keys: [
      { mark: 'lit', label: 'The wheel and the carriage pointer: what moves' },
      { mark: 'raised', label: 'The slotted disc: the encoder counts its slots as ticks' },
    ],
    caption: `One turn of the wheel is ${TICKS_PER_REV} ticks and pulls the tape ${(TICKS_PER_REV / TICKS_PER_CM).toFixed(2)} cm, so a centimetre is ${TICKS_PER_CM.toFixed(1)} ticks. On a real goBILDA 5203 the encoder sits on the fast motor shaft, before the gearbox; here the disc rides the wheel shaft so you can watch it.`,
    body: `<div class="iso-stage" role="img" aria-label="Encoder bench">${figure()}</div>`,
  });
  const plateEl = host.querySelector<HTMLElement>('.iso-plate')!;
  const controls = document.createElement('div');
  controls.className = 'figure-controls';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Drive the motor');
  const button = (label: string, onPress: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-quiet figure-button';
    b.textContent = label;
    b.addEventListener('click', () => { touched = true; onPress(); run(); });
    controls.append(b);
  };
  for (const p of POWERS) button(`setPower(${p.toFixed(1)})`, () => { state = { ...state, power: p, target: null }; });
  button(`Drive ${DRIVE_CM} cm`, () => {
    const goal = Math.min(MAX_TICKS, Math.round(state.ticks + DRIVE_CM * TICKS_PER_CM));
    state = { ...state, power: 0.5, target: state.ticks + 5 >= MAX_TICKS ? 0 : goal };
  });
  plateEl.after(controls);

  const svg = host.querySelector('svg')!;
  const parts = {
    carriage: svg.querySelector('[data-part="carriage"]')!,
    tape: svg.querySelector('[data-part="tape"]')!,
    slots: svg.querySelector('[data-part="slots"]')!,
    spokes: svg.querySelector('[data-part="spokes"]')!,
  };
  const readoutEl = host.querySelector('[data-readout]')!;
  const live = document.createElement('p');
  live.className = 'visually-hidden';
  live.setAttribute('aria-live', 'polite');
  controls.after(live);

  const still = matchMedia('(prefers-reduced-motion: reduce)');
  let state: BenchState = { ticks: 0, power: 0, target: null };
  let touched = false, visible = false, frame = 0, last = 0, tourClock = 0;
  let announced = '';

  const draw = () => {
    const cm = cmOf(state.ticks);
    const turn = state.ticks / TICKS_PER_REV;
    parts.carriage.setAttribute('transform', k.translateAlong(P, [X0 + cm * U, 0, 0]));
    parts.tape.setAttribute('d', tapeTo(cm));
    parts.slots.setAttribute('d', discSlots(turn).major);
    parts.spokes.setAttribute('d', spokes(turn));
    const text = readout(state);
    if (readoutEl.textContent !== text) readoutEl.textContent = text;
    const settled = `${Math.round(state.ticks)} ticks, ${cm.toFixed(1)} centimetres`;
    if (state.power === 0 && !isBusy(state) && settled !== announced) { announced = settled; live.textContent = settled; }
  };

  // The idle tour, until someone presses a button: drive 20 cm, wait, drive back.
  const tour = (dt: number) => {
    tourClock += dt;
    const phase = Math.floor(tourClock / 4) % 2;
    const goal = phase === 0 ? Math.round(DRIVE_CM * TICKS_PER_CM) : 0;
    if (state.target !== goal && Math.abs(state.ticks - goal) > 5) state = { ...state, power: 0.5, target: goal };
  };

  const tick = (now: number) => {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    if (!touched && !still.matches) tour(dt);
    if (still.matches) {
      // Reduced motion: jump to where the motor would stop, instead of travelling there.
      for (let i = 0; i < 600 && isBusy(state); i++) state = stepBench(state, 1 / 30);
      if (state.power !== 0) state = stepBench(state, 0.5);
    } else {
      state = stepBench(state, dt);
    }
    draw();
    const moving = isBusy(state) || (state.power !== 0 && state.ticks > 0 && state.ticks < MAX_TICKS);
    frame = visible && (moving || (!touched && !still.matches)) ? requestAnimationFrame(tick) : 0;
  };
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };

  const seen = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1]!.isIntersecting;
    if (visible) run(); else if (frame) { cancelAnimationFrame(frame); frame = 0; }
  }, { rootMargin: '120px 0px' });
  seen.observe(host);
  draw();

  return () => { seen.disconnect(); if (frame) cancelAnimationFrame(frame); frame = 0; };
}
