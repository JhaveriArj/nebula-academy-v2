import * as k from './kit/iso-kit';

/* Fig: the loop counter. A ratchet dial on a pedestal holds the loop's counter: its pointer is
   `side`. A gate pin on the pedestal marks the last value the check lets through (side <= 4), and
   a lamp beside it shows the check: green while it is true, red once it is false. On a mat next
   to it a small tank robot drives one side of a square and turns one corner for every pass, as in
   the lesson's own loop:

     for (int side = 1; side <= 4; side++) { ... drive 1000 ms at 0.6, turn 785 ms ... }

   So one pass is: the lamp checks, the robot drives a side and turns, the ratchet clicks side up
   by one. After pass 4 the pointer reaches 5, past the pin; the lamp goes red and the loop ends.
   The limit buttons move the pin to 3, 4 or 6 so the kid sees the number of passes change. */

// ---------------------------------------------------------------- the model (pure, tested)

/** The loop as the lesson writes it: start at 1, keep going while side <= limit, add one. */
export const START = 1;
export const LIMIT = 4;
export const LIMITS = [3, 4, 6] as const;
/** One pass of the body, from the lesson's solution: drive 1000 ms, then turn 785 ms. */
export const DRIVE_MS = 1000;
export const TURN_MS = 785;
export const PASS_SECONDS = (DRIVE_MS + TURN_MS) / 1000;
/** A loop that never ends is stopped here, so nothing in the figure can spin forever. */
export const MAX_PASSES = 100;

export interface LoopState {
  /** The counter: side in `for (int side = 1; side <= limit; side++)`. */
  side: number;
  limit: number;
  /** How many times the body has run. */
  passes: number;
}

export const startLoop = (limit: number): LoopState => ({ side: START, limit, passes: 0 });
/** The check, made before every pass. */
export const checkHolds = (s: LoopState) => s.side <= s.limit;
export const isDone = (s: LoopState) => !checkHolds(s) || s.passes >= MAX_PASSES;
/** How many passes the loop makes for a limit: 4 for side <= 4. */
export const passesFor = (limit: number) => Math.min(MAX_PASSES, Math.max(0, limit - START + 1));

/** One pass: if the check holds, run the body once, then side++. Past the end it changes nothing. */
export function nextPass(s: LoopState): LoopState {
  if (isDone(s)) return s;
  return { ...s, side: s.side + 1, passes: s.passes + 1 };
}

/** Every pass that is left, with a guard so it always stops. */
export function runLoop(s: LoopState): LoopState {
  for (let i = 0; i < MAX_PASSES && !isDone(s); i++) s = nextPass(s);
  return s;
}

/** The drawn pass count follows the model at the robot's real speed and never passes it. One
    long step (a background tab, reduced motion) lands exactly on the target; no loop, no hunt. */
export function shownToward(shown: number, target: number, dt: number): number {
  if (!(dt > 0) || shown >= target) return target;
  return Math.min(target, shown + dt / PASS_SECONDS);
}

/** The words in the corner, for a pass count t (whole passes done, plus the share of the next). */
export function readoutOf(limit: number, t: number): string {
  const passes = Math.floor(t + 1e-9);
  const side = START + passes;
  const holds = side <= limit;
  const count = `${passes} ${passes === 1 ? 'pass' : 'passes'}`;
  return `side ${side} · ${side} <= ${limit} ${holds ? 'true' : 'false'} · ${count}`;
}

// The square on the mat. Corners in order of travel; the robot starts at the first, heading +x,
// and turns left at each corner (left on screen, for this camera).
export const SQUARE = 64;
const C0: k.Plane = [28, 34];
export const CORNERS: k.Plane[] = [C0, [C0[0] + SQUARE, C0[1]], [C0[0] + SQUARE, C0[1] - SQUARE], [C0[0], C0[1] - SQUARE]];
const DRIVE_SHARE = DRIVE_MS / (DRIVE_MS + TURN_MS);
const ease = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

export interface Pose { x: number; y: number; /** degrees, counting left turns */ heading: number }

/** Where the robot is after t passes: drive the side, then turn 90 degrees left at the corner. */
export function robotPose(t: number): Pose {
  const n = Math.floor(Math.max(0, t) + 1e-9);
  const f = Math.max(0, t) - n;
  const from = CORNERS[n % 4]!;
  const to = CORNERS[(n + 1) % 4]!;
  if (f < DRIVE_SHARE) {
    const s = ease(f / DRIVE_SHARE);
    return { x: from[0] + (to[0] - from[0]) * s, y: from[1] + (to[1] - from[1]) * s, heading: n * 90 };
  }
  return { x: to[0], y: to[1], heading: n * 90 + 90 * ease((f - DRIVE_SHARE) / (1 - DRIVE_SHARE)) };
}

/** The pointer's value: it stays on side while the body runs and clicks up once the turn is
    nearly over, which is when side++ happens. */
export function pointerAt(t: number): number {
  const n = Math.floor(Math.max(0, t) + 1e-9);
  return START + n + ease((Math.max(0, t) - n - 0.9) / 0.1);
}

// ---------------------------------------------------------------- the drawing

const W = 640, H = 330;
const PLATE = { x: -126, y: -58, w: 252, d: 116, r: 8 };
const PLATE_H = 12, FOOT_H = 5;
const D: k.Plane = [-76, -4];          // the dial's shaft
const PED = { x: D[0] - 32, y: D[1] - 32, w: 64, d: 64, r: 4 };
const PED_TOP = 14;
const RATCHET_R = 28, RATCHET_TOP = 18;
const DIAL_R = 24, DIAL_TOP = 26;
const SLOTS = 8;                      // positions 1 to 8 round the dial
const PIN_R = 31;
const LAMP: k.Plane = [-28, -40];
const LAMP_TOP = 40;
const MAT = { x: 6, y: -46, w: 108, d: 96, r: 3 };
const MAT_H = 1;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [LAMP[0], LAMP[1], LAMP_TOP + 2], [D[0], D[1] - DIAL_R, DIAL_TOP]],
  W, H, { pad: 30, azimuth: 56 },
);
const at = (p: k.Point3) => k.iso(p, P);
const S = (paths: k.SolidPaths, style?: k.SolidStyle) => k.solidSvg(paths, style);
const L = (d: string, style?: k.LineStyle) => k.lineSvg(d, style);
const Dots = (points: k.Flat[], style?: Parameters<typeof k.dotsSvg>[1]) => k.dotsSvg(points, style);
const byDepth = (points: k.Plane[]) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

/** The dial's angle convention (the kit's radialTicks): 0 points to -y, turning toward +x. */
const angleOf = (value: number) => ((value - START) / SLOTS) * Math.PI * 2;
const onDial = (angle: number, r: number): k.Plane => [D[0] + Math.sin(angle) * r, D[1] - Math.cos(angle) * r];
/** The pin stands between the last value the check lets through and the first it stops. */
const pinAngleFor = (limit: number) => angleOf(limit + 0.5);

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
  out.push(Dots(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // A label plate on the front edge: three rule lines that stand for printed text.
  const label = { x: -112, y: 37, w: 46, d: 13, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: 'lo', crease: 'none' }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P), { tone: 'faint' }));
  out.push(L([[16, 0], [24, 3.6], [12, 7.2]].map(([w, dy]) => k.lineOnTop([label.x + 6, label.y + 3 + dy!], [label.x + 6 + w!, label.y + 3 + dy!], 0.8, P)).join(''), { tone: 'lo', free: true }));
  out.push(Dots([at([label.x + 3, label.y + label.d / 2, 0.8]), at([label.x + label.w - 3, label.y + label.d / 2, 0.8])], { size: 0.45 }));
  return out.join('');
}

function mat(): string {
  const out = [S(k.slabOf(MAT, 0, MAT_H, P, 4), { tone: 'lo', crease: 'none' })];
  out.push(L(k.planOutline(k.insetPlan(MAT, 4), MAT_H, P, 4), { tone: 'faint' }));
  // The square the robot drives, taped on the mat, with a cross at each corner.
  out.push(L(k.onTop(CORNERS, MAT_H, P, true), { tone: 'faint' }));
  out.push(L(CORNERS.map(([x, y]) => k.lineOnTop([x - 3, y], [x + 3, y], MAT_H, P) + k.lineOnTop([x, y - 3], [x, y + 3], MAT_H, P)).join(''), { tone: 'lo' }));
  return out.join('');
}

/** The path driven so far: from the start corner through every corner passed, to the robot. */
function trailTo(t: number): string {
  const n = Math.floor(Math.max(0, t) + 1e-9);
  const points: k.Plane[] = [];
  for (let i = 0; i <= Math.min(n, MAX_PASSES); i++) points.push(CORNERS[i % 4]!);
  const pose = robotPose(t);
  points.push([pose.x, pose.y]);
  return points.length > 1 ? k.onTop(points, MAT_H + 0.05, P) : '';
}

function lamp(): string {
  const [x, y] = LAMP;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: x - 7, y: y - 7, w: 14, d: 14, r: 7 }, 0, 0.1, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.cylinder(x, y, 6, 0, 3, P, 28, 0.5), { tone: 'mid' }));
  out.push(Dots([0, 1, 2].map((i) => at([x + Math.cos(i * 2.1 + 0.6) * 4.4, y + Math.sin(i * 2.1 + 0.6) * 4.4, 3])), { size: 0.4 }));
  out.push(S(k.cylinder(x, y, 1.8, 3, LAMP_TOP - 12, P, 16), { tone: 'mid', crease: 'none' }));
  out.push(S(k.cylinder(x, y, 5, LAMP_TOP - 9, 7, P, 32, 0.5), { tone: 'mid' }));
  out.push(L(k.sideArc(x, y, 5, LAMP_TOP - 5, P, 20), { tone: 'faint' }));
  out.push(S(k.cylinder(x, y, 3.8, LAMP_TOP - 2, 2, P, 32), { tone: 'hi' }));
  out.push(`<path data-part="lamp" class="iso-line" data-tone="green" d="${k.ring(x, y, 2.6, LAMP_TOP, P, 28)}" style="stroke-width:1.6"/>`);
  return out.join('');
}

/** The cable that carries the check from the pedestal to the lamp, flat on the plate. */
function cable(): string {
  const from = at([PED.x + PED.w, D[1] - 20, 0.4]);
  const to = at([LAMP[0], LAMP[1] + 6, 0.4]);
  return k.wireSvg(from, to, { via: [at([LAMP[0], D[1] - 20, 0.4])], tone: 'mid', size: 1 });
}

function pedestal(): string {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(PED, 2), 0, 0.1, P)}" style="filter:blur(5px)"/>`];
  out.push(S(k.slabOf(PED, 0, PED_TOP, P, 6, 0.8), { tone: 'mid', inner: L(k.sideSeam(PED, 4, P, 6), { tone: 'faint' }) }));
  out.push(L(k.planOutline(k.insetPlan(PED, 3.5), PED_TOP, P, 6), { tone: 'faint' }));
  out.push(Dots(k.corners(PED, 6).map(([x, y]) => at([x, y, PED_TOP])), { size: 0.5 }));
  // The pawl that lets the ratchet go one way, one tooth at a time: a pivot post and an arm.
  const pa = onDial(angleOf(6.6), RATCHET_R + 1.2);
  const pivot = onDial(angleOf(6.1), RATCHET_R + 2.6);
  out.push(S(k.cylinder(pivot[0], pivot[1], 1.6, PED_TOP, 5, P, 16), { tone: 'mid' }));
  out.push(L(k.lineOnTop(pivot, pa, PED_TOP + 3, P), { tone: 'hi' }));
  return out.join('');
}

function pinSvg(): string {
  // Built at the dial's shaft; a translate puts it at the limit.
  return S(k.cylinder(0, 0, 3.2, PED_TOP, 1.2, P, 24), { tone: 'lo' }) +
    S(k.cylinder(0, 0, 2, PED_TOP + 1.2, 9, P, 20), { tone: 'hi' }) +
    L(k.ring(0, 0, 1, PED_TOP + 10.2, P, 12), { tone: 'mid' });
}
const pinMove = (angle: number) => { const [x, y] = onDial(angle, PIN_R); return k.translateAlong(P, [x, y, 0]); };
const pinInFront = (angle: number) => k.depthOf([Math.sin(angle), -Math.cos(angle), 0], P) > 0;

const teeth = (value: number) => {
  // 32 teeth, four to a click, turning with the pointer: they share the shaft.
  const turn = angleOf(value);
  const out: string[] = [];
  for (let i = 0; i < 32; i++) {
    const a = turn + (i / 32) * Math.PI * 2;
    out.push(k.lineOnTop(onDial(a, DIAL_R), onDial(a + 0.06, RATCHET_R), RATCHET_TOP, P));
  }
  return out.join('');
};

function ratchet(): string {
  return S(k.cylinder(D[0], D[1], RATCHET_R, PED_TOP, RATCHET_TOP - PED_TOP, P, 64, 0.5), { tone: 'mid' }) +
    `<path data-part="teeth" class="iso-line" data-tone="lo" d="${teeth(START)}"/>`;
}

/** Ticks for positions 1 to 8: bright up to the limit (the check is true there), dim beyond. */
const slotTicks = (limit: number) => {
  const inside: string[] = [];
  const outside: string[] = [];
  for (let v = START; v < START + SLOTS; v++) {
    const a = angleOf(v);
    const d = k.lineOnTop(onDial(a, DIAL_R - 6.5), onDial(a, DIAL_R - 2.2), DIAL_TOP, P);
    (v <= limit ? inside : outside).push(d);
  }
  return { inside: inside.join(''), outside: outside.join('') };
};

function dial(): string {
  const [x, y] = D;
  const ticks = slotTicks(LIMIT);
  return S(k.cylinder(x, y, DIAL_R, RATCHET_TOP, DIAL_TOP - RATCHET_TOP, P, 64, 0.8), { tone: 'hi', crease: 'lo' }) +
    L(k.knurl(x, y, DIAL_R, RATCHET_TOP + 1, DIAL_TOP - 2.5, 84, P, 0.3), { tone: 'lo' }) +
    L(k.sideArc(x, y, DIAL_R, DIAL_TOP - 2.5, P, 40), { tone: 'faint' }) +
    L(k.ring(x, y, DIAL_R - 2.2, DIAL_TOP, P, 64), { tone: 'lo' }) +
    `<path data-part="ticks-in" class="iso-line" data-tone="hi" d="${ticks.inside}" style="stroke-width:1"/>` +
    `<path data-part="ticks-out" class="iso-line" data-tone="lo" d="${ticks.outside}"/>`;
}

const pointerPath = (value: number) => k.lineOnTop(onDial(angleOf(value) + Math.PI, 5), onDial(angleOf(value), DIAL_R - 4), DIAL_TOP + 0.2, P);
const pointerTip = (value: number) => at([...onDial(angleOf(value), DIAL_R - 4), DIAL_TOP + 0.2]);

function pointer(): string {
  const [tx, ty] = pointerTip(START);
  return `<path data-part="pointer" class="iso-line" data-tone="lit" d="${pointerPath(START)}" style="stroke-width:1.6"/>` +
    `<circle data-part="pointer-tip" class="iso-wire-end" cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="1.1" style="stroke:var(--anatomy-lit)"/>` +
    S(k.cylinder(D[0], D[1], 2.4, DIAL_TOP, 1, P, 20), { tone: 'hi' }) +
    Dots([at([D[0], D[1], DIAL_TOP + 1])], { size: 0.6, tone: 'hi' });
}

// The robot: a small tank, built from rotated boxes each time it moves.
function box(cx: number, cy: number, l: number, w: number, r: number, heading: number, ox: number, oy: number): k.Plane[] {
  const h = (heading * Math.PI) / 180;
  const fx = Math.cos(h), fy = -Math.sin(h);   // forward
  const sx = -fy, sy = fx;                      // to the robot's right on the floor plan
  return k.roundedPlan({ x: -l / 2, y: -w / 2, w: l, d: w, r }, 3).map(([u, v]) => {
    const a = u + ox, b = v + oy;
    return [cx + fx * a + sx * b, cy + fy * a + sy * b] as k.Plane;
  });
}

export function robotSvg(pose: Pose): string {
  const { x, y, heading } = pose;
  const z = MAT_H;
  const out = [`<path class="iso-halo" d="${k.extrude(box(x, y, 26, 23, 4, heading, 0, 0), z, 0.1, P).fill}" style="filter:blur(3px)"/>`];
  const h = (heading * Math.PI) / 180;
  const fx = Math.cos(h), fy = -Math.sin(h), sx = -fy, sy = fx;
  const wheels = [-1, 1].flatMap((side) => [-1, 1].map((end) => ({
    side, end, depth: k.depthOf([x + fx * end * 6.4 + sx * side * 10, y + fy * end * 6.4 + sy * side * 10, 0], P),
  })));
  const centre = k.depthOf([x, y, 0], P);
  const wheel = (w: { side: number; end: number }) => S(k.extrude(box(x, y, 9, 4.2, 1.6, heading, w.end * 6.4, w.side * 10), z, 8, P), { tone: 'mid' });
  for (const w of wheels.filter((w) => w.depth < centre)) out.push(wheel(w));
  out.push(S(k.extrude(box(x, y, 26, 15.4, 2.6, heading, 0, 0), z + 2, 8, P, { bevel: 0.6 }), { tone: 'hi' }));
  out.push(S(k.extrude(box(x, y, 16, 11, 2, heading, -2, 0), z + 10, 1.6, P), { tone: 'mid' }));
  // The nose: which way is forward.
  out.push(S(k.extrude(box(x, y, 4, 8, 1.2, heading, 9.5, 0), z + 10, 3, P), { tone: 'hi' }));
  for (const w of wheels.filter((w) => w.depth >= centre)) out.push(wheel(w));
  return out.join('');
}

function figure(): string {
  const start = robotPose(0);
  return k.figureSvg({
    width: W,
    height: H,
    label: 'A ratchet dial on a pedestal holds the loop counter, side. A pin marks the limit and a lamp shows whether side is at most the limit. Beside it, a small robot on a mat drives one side of a square for every pass of the loop.',
    body: [
      plate(),
      mat(),
      `<path data-part="trail" class="iso-line" data-tone="mid" d="" style="stroke-width:1"/>`,
      cable(),
      lamp(),
      pedestal(),
      `<g data-part="pin-back"></g>`,
      ratchet(),
      dial(),
      `<g data-part="pin-front"></g>`,
      pointer(),
      `<g data-part="robot">${robotSvg(start)}</g>`,
    ],
  });
}

// ---------------------------------------------------------------- live

export function mount(host: HTMLElement): () => void {
  host.innerHTML = k.plateHtml({
    fig: 'Fig 1',
    title: 'Loop counter',
    hint: 'Press Next pass',
    readout: readoutOf(LIMIT, 0),
    keys: [
      { mark: 'lit', label: 'The pointer: the value of side' },
      { mark: 'raised', label: 'The pin: the last value the check lets through' },
      { mark: 'green', label: 'The lamp: green while the check is true, red once it is false' },
    ],
    caption: `The loop is for (int side = ${START}; side <= ${LIMIT}; side++). Before every pass the lamp checks side <= ${LIMIT}. Each pass the robot drives one side (${DRIVE_MS} ms) and turns one corner (${TURN_MS} ms), then the ratchet clicks side up by one. After pass ${LIMIT}, side is ${LIMIT + 1}, the check is false, and the loop ends.`,
    body: `<div class="iso-stage">${figure()}</div>`,
  });
  const plateEl = host.querySelector<HTMLElement>('.iso-plate')!;
  const captionEl = host.querySelector<HTMLElement>('.iso-caption');
  const controls = document.createElement('div');
  controls.className = 'figure-controls';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Run the loop');
  const button = (label: string, onPress: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-quiet figure-button';
    b.textContent = label;
    b.addEventListener('click', () => { takeOver(); onPress(); run(); });
    controls.append(b);
    return b;
  };
  button('Next pass', () => {
    if (isDone(state)) { say(`side is ${state.side}, and ${state.side} <= ${state.limit} is false, so the loop is over. Press Reset to start again.`); return; }
    state = nextPass(state);
  });
  button('Run the loop', () => { state = runLoop(state); });
  button('Reset', () => { state = startLoop(state.limit); shown = 0; });
  const limitButtons = LIMITS.map((limit) => {
    const b = button(`side <= ${limit}`, () => { state = startLoop(limit); shown = 0; setLimit(limit); });
    b.setAttribute('aria-pressed', String(limit === LIMIT));
    return b;
  });
  plateEl.after(controls);

  const svg = host.querySelector('svg')!;
  const part = (name: string) => svg.querySelector(`[data-part="${name}"]`)!;
  const parts = {
    trail: part('trail'), robot: part('robot'), pointer: part('pointer'), tip: part('pointer-tip'),
    teeth: part('teeth'), lamp: part('lamp'), ticksIn: part('ticks-in'), ticksOut: part('ticks-out'),
    pinBack: part('pin-back'), pinFront: part('pin-front'),
  };
  const pin = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  pin.innerHTML = pinSvg();
  const readoutEl = host.querySelector('[data-readout]')!;
  const live = document.createElement('p');
  live.className = 'visually-hidden';
  live.setAttribute('aria-live', 'polite');
  controls.after(live);
  const say = (text: string) => { live.textContent = text; };

  const still = matchMedia('(prefers-reduced-motion: reduce)');
  let state = startLoop(LIMIT);
  let shown = 0;
  let pinAngle = pinAngleFor(LIMIT);
  let touched = false, visible = false, frame = 0, last = 0, tourClock = 0, restAt = -1;
  let announced = '', drawnPose = '', drawnLimit = -1;

  /** The first press during the idle tour keeps what the kid sees: the pass on screen finishes
      and the loop waits there, instead of jumping to wherever the tour was heading. */
  function takeOver() {
    if (touched) return;
    touched = true;
    const passes = Math.ceil(shown - 1e-9);
    state = { side: START + passes, limit: state.limit, passes };
  }

  function setLimit(limit: number) {
    limitButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(LIMITS[i] === limit)));
    if (captionEl) captionEl.textContent = `The loop is for (int side = ${START}; side <= ${limit}; side++). Before every pass the lamp checks side <= ${limit}. Each pass the robot drives one side (${DRIVE_MS} ms) and turns one corner (${TURN_MS} ms), then the ratchet clicks side up by one. After pass ${passesFor(limit)}, side is ${limit + 1}, the check is false, and the loop ends.`;
  }

  const draw = () => {
    const pose = robotPose(shown);
    const key = `${pose.x.toFixed(2)},${pose.y.toFixed(2)},${pose.heading.toFixed(2)}`;
    if (key !== drawnPose) { drawnPose = key; parts.robot.innerHTML = robotSvg(pose); }
    parts.trail.setAttribute('d', trailTo(shown));
    const value = pointerAt(shown);
    parts.pointer.setAttribute('d', pointerPath(value));
    const [tx, ty] = pointerTip(value);
    parts.tip.setAttribute('cx', tx.toFixed(1));
    parts.tip.setAttribute('cy', ty.toFixed(1));
    parts.teeth.setAttribute('d', teeth(value));
    if (drawnLimit !== state.limit) {
      drawnLimit = state.limit;
      const ticks = slotTicks(state.limit);
      parts.ticksIn.setAttribute('d', ticks.inside);
      parts.ticksOut.setAttribute('d', ticks.outside);
    }
    pin.setAttribute('transform', pinMove(pinAngle));
    const slot = pinInFront(pinAngle) ? parts.pinFront : parts.pinBack;
    if (pin.parentNode !== slot) slot.append(pin);
    const side = START + Math.floor(shown + 1e-9);
    parts.lamp.setAttribute('data-tone', side <= state.limit ? 'green' : 'red');
    const text = readoutOf(state.limit, shown);
    if (readoutEl.textContent !== text) readoutEl.textContent = text;
    if (shown === state.passes) {
      const words = `side is ${side}. ${side} <= ${state.limit} is ${side <= state.limit}. ${state.passes} ${state.passes === 1 ? 'pass' : 'passes'} done.${isDone(state) ? ' The loop is over.' : ''}`;
      if (words !== announced) { announced = words; if (touched) say(words); }
    }
  };

  // The idle tour, until someone presses a button: run the lesson's loop, rest, start again.
  const tour = (dt: number) => {
    tourClock += dt;
    if (tourClock < 1.4) return;
    if (!isDone(state)) { state = runLoop(state); return; }
    if (shown < state.passes) return;
    if (restAt < 0) restAt = tourClock;
    if (tourClock - restAt > 2.6) { state = startLoop(LIMIT); shown = 0; restAt = -1; tourClock = 0.8; }
  };

  const tick = (now: number) => {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    const calm = still.matches;
    if (!touched && !calm) tour(dt);
    shown = calm ? state.passes : shownToward(shown, state.passes, dt);
    const goal = pinAngleFor(state.limit);
    pinAngle = calm || Math.abs(goal - pinAngle) < 1e-3 ? goal : pinAngle + (goal - pinAngle) * (1 - Math.exp(-dt / 0.18));
    draw();
    const moving = shown !== state.passes || pinAngle !== goal;
    frame = visible && (moving || (!touched && !calm)) ? requestAnimationFrame(tick) : 0;
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
