import * as k from './kit/iso-kit';
import { TICK_MS } from '../sim/simulation';

/* Fig: the OpMode bench. A Driver Station key panel with three keys (INIT, START, STOP) drives
   two machines on one plate. INIT turns a small cam exactly once: its one lobe pushes a rod out
   and back, and then the cam stands still for the rest of the run. That is init(). START sets a
   peg wheel turning, and every peg that passes flicks a lever into a counter. That is loop(),
   again and again until STOP. The wheel turns once a second and carries 50 pegs, because the
   simulator runs loop() once per 20 ms step (TICK_MS), 50 times a second, the same rate the
   lesson text says. Like the simulator, the first loop() runs the moment START is pressed. */

// ---------------------------------------------------------------- the model (pure, tested)

export const LOOP_MS = TICK_MS;                // one pass of loop() per simulator step
export const LOOPS_PER_S = 1000 / LOOP_MS;     // 50
export const PEGS = LOOPS_PER_S;               // so the wheel turns exactly once a second

export type Phase = 'idle' | 'init' | 'running' | 'stopped';
export type DsKey = 'INIT' | 'START' | 'STOP';

export interface OpModeState {
  phase: Phase;
  initRuns: number;
  /** Has START been pressed in this run? STOP straight from init runs no loop() at all. */
  started: boolean;
  /** Milliseconds since START, frozen at STOP. */
  ms: number;
}

export const IDLE: OpModeState = { phase: 'idle', initRuns: 0, started: false, ms: 0 };

/** Which keys a real Driver Station offers in each phase. */
export function canPress(s: OpModeState, key: DsKey): boolean {
  if (key === 'INIT') return s.phase === 'idle' || s.phase === 'stopped';
  if (key === 'START') return s.phase === 'init';
  return s.phase === 'init' || s.phase === 'running';
}

/** Presses a key. A key the Driver Station would not offer changes nothing. INIT after a STOP
    is a fresh run, like the real one: a new OpMode object, so init() has run once again. */
export function press(s: OpModeState, key: DsKey): OpModeState {
  if (!canPress(s, key)) return s;
  if (key === 'INIT') return { phase: 'init', initRuns: 1, started: false, ms: 0 };
  if (key === 'START') return { ...s, phase: 'running', started: true, ms: 0 };
  return { ...s, phase: 'stopped' };
}

/** Advances the clock by dt seconds. No loop, so any step, however long, is safe. */
export function stepOpMode(s: OpModeState, dt: number): OpModeState {
  if (s.phase !== 'running' || !(dt > 0) || !Number.isFinite(dt)) return s;
  return { ...s, ms: s.ms + dt * 1000 };
}

/** How many times loop() has run: once at START, then once every LOOP_MS. */
export function loopRuns(s: OpModeState): number {
  if (!s.started) return 0;
  return Math.floor(s.ms / LOOP_MS + 1e-6) + 1;
}

/** The moment (ms after START) loop() runs for the nth time; the 50th is at 980 ms. */
export const msOfLoop = (n: number) => (n - 1) * LOOP_MS;

export const seconds = (s: OpModeState) => s.ms / 1000;

// ---------------------------------------------------------------- the drawing

const W = 640, H = 380;
const PLATE = { x: -114, y: -60, w: 228, d: 150, r: 8 };
const PLATE_H = 12, FOOT_H = 5;

const C: k.Plane = [-80, -24];          // the init cam's axis
const CAM_Z = 30, CAM_H = 5, CAM_BASE = 13, CAM_LOBE = 8;
const ROD_Z = CAM_Z + 1.5, ROD_T = 2.4, ROD_L = 40;
const GUIDE_X = C[0] + 30;               // the rod's guide block, from here to +10
const INIT_TURN_S = 0.9;                 // how long the cam takes to show its one turn

const WC: k.Plane = [40, -8];           // the loop wheel's axis
const DISC_Z = 29, DISC_H = 5, DISC_R = 46, PEG_R = 42.5, PEG_H = 4.5;

const PIVOT: k.Plane = [WC[0] + 59 * Math.cos(0.96), WC[1] + 59 * Math.sin(0.96)];        // the counter lever's pivot
const ARM_Z = DISC_Z + DISC_H + 1;
const ARM_DIR = Math.atan2(WC[1] - PIVOT[1], WC[0] - PIVOT[0]);
const COUNTER = { x: PIVOT[0] - 4, y: PIVOT[1] + 6, w: 26, d: 26, r: 2.5 };
const COUNTER_H = ARM_Z - 5;
const ARM_BACK = 13;                     // the lever's back end, over the counter's slot

const PANEL = { x: -72, y: 46, w: 68, d: 36, r: 3 };
const PANEL_H = 14;
const KEYS: DsKey[] = ['INIT', 'START', 'STOP'];
const keyPlan = (i: number) => ({ x: PANEL.x + 8 + i * 19, y: PANEL.y + 12, w: 14, d: 14, r: 2 });

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [WC[0], WC[1] - DISC_R, DISC_Z + DISC_H + PEG_H],
    [C[0] - 22, C[1], CAM_Z + CAM_H + 2],
    [COUNTER.x + COUNTER.w, COUNTER.y + COUNTER.d, 0],
  ],
  W, H, { pad: 30, azimuth: 40 },
);
const at = (p: k.Point3) => k.iso(p, P);
type Paths = Parameters<typeof k.solidSvg>[0];
type Style = Parameters<typeof k.solidSvg>[1];
const S = (paths: Paths, style?: Style) => k.solidSvg(paths, style);
const L = (d: string, style?: Parameters<typeof k.lineSvg>[1]) => k.lineSvg(d, style);
const D = (points: k.Flat[], style?: Parameters<typeof k.dotsSvg>[1]) => k.dotsSvg(points, style);
const byDepth = (points: k.Plane[]) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const rotate = (points: k.Plane[], about: k.Plane, a: number): k.Plane[] =>
  points.map(([x, y]) => [about[0] + x * Math.cos(a) - y * Math.sin(a), about[1] + x * Math.sin(a) + y * Math.cos(a)]);

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
  // A label plate at the front, its rule lines standing for printed words.
  const label = { x: 4, y: 66, w: 54, d: 12, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: 'lo', crease: 'none' }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P), { tone: 'faint' }));
  out.push(L([[4, 32], [4, 22], [4, 40]].map(([dx, len], i) => k.lineOnTop([label.x + dx!, label.y + 3.4 + i * 2.6], [label.x + dx! + len!, label.y + 3.4 + i * 2.6], 0.8, P)).join(''), { tone: 'lo', free: true }));
  out.push(D([at([label.x + label.w - 4, label.y + 3.5, 0.8]), at([label.x + label.w - 4, label.y + label.d - 3.5, 0.8])], { size: 0.45 }));
  return out.join('');
}

/** The two cables from the key panel, lying on the plate under everything they pass. */
function cables(): string {
  const z = 0.4;
  const toCam: k.Plane = [PANEL.x + 22, 4];
  const toWheel: k.Plane = [PANEL.x + 50, 26];
  const rim = (c: k.Plane, r: number, toward: k.Plane): k.Plane => {
    const a = Math.atan2(toward[1] - c[1], toward[0] - c[0]);
    return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r];
  };
  const cam = rim(C, 15.4, toCam), wheel = rim(WC, 20.4, toWheel);
  const flat = ([x, y]: k.Plane) => at([x, y, z]);
  return k.wireSvg(flat([toCam[0], PANEL.y]), flat(cam), { via: [flat(toCam)], tone: 'lo', size: 1 }) +
    k.wireSvg(flat([toWheel[0], PANEL.y]), flat(wheel), { via: [flat(toWheel)], tone: 'lo', size: 1 });
}

// -------- INIT: a cam that turns once

const camRadius = (phi: number) => CAM_BASE + CAM_LOBE * Math.pow(Math.max(0, Math.cos(phi)), 3);
/** The lobe points away from the rod (-x) at rest; one turn sweeps it past the rod once. */
const lobeAngle = (turn: number) => Math.PI + turn * Math.PI * 2;
const camRing = (turn: number): k.Plane[] =>
  Array.from({ length: 72 }, (_, i) => {
    const a = (i / 72) * Math.PI * 2;
    const r = camRadius(a - lobeAngle(turn));
    return [C[0] + r * Math.cos(a), C[1] + r * Math.sin(a)];
  });
const rodTip = (turn: number) => C[0] + camRadius(0 - lobeAngle(turn));

function camMotor(): string {
  const [x, y] = C;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: x - 15, y: y - 15, w: 30, d: 30, r: 15 }, 0, 0.1, P)}" style="filter:blur(5px)"/>`];
  out.push(S(k.cylinder(x, y, 15.4, 0, 2, P, 40, 0.4), { tone: 'lo' }));
  out.push(D([0, 1, 2, 3].map((i) => at([x + Math.cos(i * Math.PI / 2 + 0.6) * 13.4, y + Math.sin(i * Math.PI / 2 + 0.6) * 13.4, 2])), { size: 0.45 }));
  out.push(S(k.cylinder(x, y, 11, 2, 18, P, 40, 0.6), { tone: 'mid' }));
  out.push(L([8, 13].map((z) => k.sideArc(x, y, 11, z, P, 20)).join(''), { tone: 'faint' }));
  out.push(S(k.cylinder(x, y, 12.4, 20, 4, P, 40, 0.5), { tone: 'mid' }));
  out.push(L(k.ring(x, y, 8, 24, P, 28), { tone: 'lo' }));
  out.push(S(k.cylinder(x, y, 3, 24, CAM_Z - 24, P, 20), { tone: 'hi' }));
  return out.join('');
}

function cam(turn: number): string {
  const [x, y] = C;
  const a = lobeAngle(turn);
  return S(k.extrude(camRing(turn), CAM_Z, CAM_H, P, { bevel: 0.6 }), { tone: 'hi', crease: 'lo' }) +
    L(k.lineOnTop([x + Math.cos(a) * 6, y + Math.sin(a) * 6], [x + Math.cos(a) * (CAM_BASE + CAM_LOBE - 3), y + Math.sin(a) * (CAM_BASE + CAM_LOBE - 3)], CAM_Z + CAM_H, P), { tone: 'hi' }) +
    S(k.cylinder(x, y, 4, CAM_Z + CAM_H, 2, P, 24), { tone: 'mid' }) +
    D([at([x, y, CAM_Z + CAM_H + 2])], { size: 0.6, tone: 'hi' });
}

const rodY = C[1] - ROD_T / 2;
/** The rod up to the guide block, its collar and the spring that pushes it back on the cam. */
function rodBack(turn: number): string {
  const tip = rodTip(turn);
  const collar = tip + 5;
  const coil = k.coil(collar + 2.4, GUIDE_X, [C[1], ROD_Z + ROD_T / 2], 3, 5, 'x', P);
  return L(coil.back, { tone: 'lo' }) +
    S(k.slabOf({ x: tip - 0.6, y: rodY, w: GUIDE_X + 2 - tip, d: ROD_T, r: 1 }, ROD_Z, ROD_T, P, 3), { tone: 'mid' }) +
    S(k.slabOf({ x: collar, y: C[1] - 4, w: 2.4, d: 8, r: 0.8 }, ROD_Z - 2.6, ROD_T + 5.2, P, 3, 0.3), { tone: 'mid' }) +
    L(coil.front, { tone: 'mid' });
}

function guide(): string {
  const plan = { x: GUIDE_X, y: C[1] - 7, w: 10, d: 14, r: 1.2 };
  const foot = { x: GUIDE_X - 3, y: C[1] - 10, w: 16, d: 20, r: 2 };
  return S(k.slabOf(foot, 0, 3, P, 4, 0.5), { tone: 'mid' }) +
    D(k.corners(foot, 2.6).map(([px, py]) => at([px, py, 3])), { size: 0.42 }) +
    S(k.slabOf(plan, 3, ROD_Z + ROD_T + 4 - 3, P, 4, 0.5), { tone: 'mid' }) +
    L(k.sideRing([GUIDE_X + 10, C[1], ROD_Z + ROD_T / 2], 2.6, 'x', P, 20), { tone: 'faint' });
}

function rodFront(turn: number): string {
  const end = rodTip(turn) + ROD_L;
  const from = GUIDE_X + 10;
  return S(k.slabOf({ x: from - 0.5, y: rodY, w: end - from + 0.5, d: ROD_T, r: 1 }, ROD_Z, ROD_T, P, 3), { tone: 'mid' }) +
    S(k.cylinder(end, C[1], 2.8, ROD_Z - 1, ROD_T + 2, P, 20, 0.3), { tone: 'mid' });
}

// -------- loop(): a wheel of 50 pegs and a counter

function wheelMotor(): string {
  const [x, y] = WC;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: x - 20, y: y - 20, w: 40, d: 40, r: 20 }, 0, 0.1, P)}" style="filter:blur(6px)"/>`];
  out.push(S(k.cylinder(x, y, 20.4, 0, 2, P, 48, 0.4), { tone: 'lo' }));
  out.push(D([0, 1, 2, 3, 4, 5].map((i) => at([x + Math.cos(i * Math.PI / 3 + 0.3) * 18, y + Math.sin(i * Math.PI / 3 + 0.3) * 18, 2])), { size: 0.45 }));
  out.push(S(k.cylinder(x, y, 15, 2, 18, P, 48, 0.6), { tone: 'mid' }));
  out.push(L([8, 14].map((z) => k.sideArc(x, y, 15, z, P, 24)).join(''), { tone: 'faint' }));
  out.push(S(k.cylinder(x, y, 16.6, 20, 5, P, 48, 0.5), { tone: 'mid' }));
  out.push(S(k.cylinder(x, y, 5, 25, DISC_Z - 25, P, 24), { tone: 'hi' }));
  return out.join('');
}

const pegAngle = (i: number, turn: number) => (i / PEGS + turn) * Math.PI * 2 + ARM_DIR + Math.PI;
const pegPoint = (i: number, turn: number): k.Plane => {
  const a = pegAngle(i, turn);
  return [WC[0] + Math.cos(a) * PEG_R, WC[1] + Math.sin(a) * PEG_R];
};
/** Pegs as short posts; peg 0 at the lever when turn is a whole number. */
function pegs(turn: number, lit = false): string {
  const top = DISC_Z + DISC_H;
  const points = Array.from({ length: PEGS }, (_, i) => pegPoint(i, turn));
  return L(points.map((p) => k.rise(p, top, top + PEG_H, P)).join(''), { tone: lit ? 'lit' : 'hi' }) +
    D(points.map(([x, y]) => at([x, y, top + PEG_H])), { size: 0.55, tone: 'hi' });
}
/** The marks on the wheel's face that turn with it: three spokes and the index line at peg 0. */
function wheelFace(turn: number): string {
  const top = DISC_Z + DISC_H;
  const spokes = [0, 1, 2].map((i) => {
    const a = pegAngle(0, turn) + Math.PI / 3 + (i * Math.PI * 2) / 3;
    return k.lineOnTop([WC[0] + Math.cos(a) * 9, WC[1] + Math.sin(a) * 9], [WC[0] + Math.cos(a) * (DISC_R - 9), WC[1] + Math.sin(a) * (DISC_R - 9)], top, P);
  }).join('');
  const a = pegAngle(0, turn);
  const index = k.lineOnTop([WC[0] + Math.cos(a) * 12, WC[1] + Math.sin(a) * 12], [WC[0] + Math.cos(a) * (DISC_R - 6), WC[1] + Math.sin(a) * (DISC_R - 6)], top, P);
  return L(spokes, { tone: 'lo' }) + L(index, { tone: 'hi' });
}

function disc(): string {
  const [x, y] = WC;
  const top = DISC_Z + DISC_H;
  return S(k.cylinder(x, y, DISC_R, DISC_Z, DISC_H, P, 96, 0.8), { tone: 'mid', crease: 'lo' }) +
    L(k.ring(x, y, DISC_R - 6, top, P, 96) + k.ring(x, y, 9, top, P, 32), { tone: 'faint' });
}

function hub(): string {
  const [x, y] = WC;
  const top = DISC_Z + DISC_H;
  return S(k.cylinder(x, y, 6, top, 2.4, P, 28, 0.4), { tone: 'mid' }) + D([at([x, y, top + 2.4])], { size: 0.6, tone: 'hi' });
}

/** The lever: a peg passing its tip swings it, and its back end clicks the counter. */
const armRing = (swing: number) =>
  rotate(k.roundedPlan({ x: -ARM_BACK - 1.6, y: -1.6, w: ARM_BACK + 21.1, d: 3.2, r: 1.6 }, 4), [0, 0], ARM_DIR + swing).map(([x, y]) => [x + PIVOT[0], y + PIVOT[1]] as k.Plane);
function arm(swing: number): string {
  const pin = rotate([[ARM_BACK, 0]], PIVOT, ARM_DIR + Math.PI + swing)[0]!;
  return L(k.rise(pin, COUNTER_H, ARM_Z, P), { tone: 'mid' }) +
    S(k.extrude(armRing(swing), ARM_Z, 2, P), { tone: 'hi' }) +
    S(k.cylinder(PIVOT[0], PIVOT[1], 3, ARM_Z + 2, 1.6, P, 20), { tone: 'mid' }) +
    D([at([PIVOT[0], PIVOT[1], ARM_Z + 3.6])], { size: 0.5, tone: 'hi' });
}

function pivotPost(): string {
  const [x, y] = PIVOT;
  return S(k.cylinder(x, y, 5, 0, 3, P, 24, 0.4), { tone: 'lo' }) +
    S(k.cylinder(x, y, 2.4, 3, ARM_Z - 3, P, 20), { tone: 'mid' }) +
    L(k.sideArc(x, y, 2.4, 18, P, 12), { tone: 'faint' });
}

function counter(): string {
  const c = COUNTER;
  const top = COUNTER_H;
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(c, 2), 0, 0.1, P)}" style="filter:blur(5px)"/>`];
  out.push(S(k.slabOf(c, 0, top, P, 4, 0.8), { tone: 'mid', inner: L(k.sideSeam(c, 8, P, 4), { tone: 'faint' }) }));
  // The slot the lever's pin clicks in, a window, a knurled reset knob, four screws, and vents.
  const back = rotate([[ARM_BACK, 0]], PIVOT, ARM_DIR + Math.PI)[0]!;
  out.push(L(k.planOutline({ x: back[0] - 5, y: back[1] - 2.2, w: 10, d: 4.4, r: 2.2 }, top, P, 4), { tone: 'lo' }));
  const win = { x: c.x + 4, y: c.y + 11, w: 11, d: 11, r: 1.5 };
  out.push(L(k.planOutline(win, top, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(win, 1.6), top, P, 4), { tone: 'faint' }));
  out.push(D(k.corners(c, 2.6).map(([px, py]) => at([px, py, top])), { size: 0.42 }));
  const kx = c.x + 20, ky = c.y + 17;
  out.push(S(k.cylinder(kx, ky, 3.2, top, 3, P, 24), { tone: 'mid' }));
  out.push(L(k.knurl(kx, ky, 3.2, top, top + 3, 24, P, 0.3), { tone: 'lo' }));
  const fy = c.y + c.d;
  const slot = (x0: number, x1: number, z0: number, z1: number) =>
    k.pathOf([at([x0, fy, z0]), at([x1, fy, z0]), at([x1, fy, z1]), at([x0, fy, z1])], true);
  out.push(L([0, 1, 2].map((i) => slot(c.x + 6, c.x + c.w - 6, 12 + i * 5, 13.6 + i * 5)).join(''), { tone: 'lo' }));
  return out.join('');
}

// -------- the key panel

function panel(): string {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(PANEL, 2), 0, 0.1, P)}" style="filter:blur(5px)"/>`];
  out.push(S(k.slabOf(PANEL, 0, PANEL_H, P, 4, 0.8), { tone: 'mid', inner: L(k.sideSeam(PANEL, 4, P, 4), { tone: 'faint' }) }));
  out.push(L(k.planOutline({ x: PANEL.x + 5, y: PANEL.y + 9, w: PANEL.w - 10, d: 20, r: 2 }, PANEL_H, P, 4), { tone: 'faint' }));
  out.push(D(k.corners(PANEL, 3).map(([x, y]) => at([x, y, PANEL_H])), { size: 0.45 }));
  return out.join('');
}

/** A key with the Driver Station's own marks engraved: a ring, a play triangle, a stop square. */
function key(i: number): string {
  const p = keyPlan(i);
  const cx = p.x + p.w / 2, cy = p.y + p.d / 2, top = PANEL_H + 3;
  const mark = i === 0
    ? k.ring(cx, cy, 3.2, top, P, 24)
    : i === 1
      ? k.onTop([[cx - 3, cy - 3.4], [cx + 3.6, cy], [cx - 3, cy + 3.4]], top, P, true)
      : k.planOutline({ x: cx - 3, y: cy - 3, w: 6, d: 6, r: 0.5 }, top, P, 2);
  return S(k.slabOf(p, PANEL_H, 3, P, 4, 0.5), { tone: 'hi' }) + L(mark, { tone: 'hi' });
}

function figure(): string {
  return k.figureSvg({
    width: W,
    height: H,
    label: 'A plate with a key panel of three keys, INIT, START and STOP. INIT turns a small cam once, which pushes a rod out and back one time. START sets a wheel of 50 pegs turning once a second; each peg flicks a lever into a counter, one click for each time loop() runs. STOP stops the wheel.',
    body: [
      plate(),
      cables(),
      camMotor(),
      `<g data-part="cam">${cam(0)}</g>`,
      `<g data-part="rod-back">${rodBack(0)}</g>`,
      guide(),
      `<g data-part="rod-front">${rodFront(0)}</g>`,
      panel(),
      ...KEYS.map((_, i) => `<g data-key="${i}">${key(i)}</g>`),
      wheelMotor(),
      disc(),
      `<g data-part="face">${wheelFace(0)}</g>`,
      hub(),
      `<g data-part="pegs">${pegs(0)}</g>`,
      pivotPost(),
      counter(),
      `<g data-part="arm">${arm(0)}</g>`,
    ],
  });
}

// ---------------------------------------------------------------- live

const PHASE_WORD: Record<Phase, string> = { idle: 'waiting', init: 'init', running: 'running', stopped: 'stopped' };
const PHASE_SAID: Record<Phase, string> = {
  idle: 'Waiting for INIT',
  init: 'INIT pressed. init() ran once',
  running: 'START pressed. loop() is running fifty times a second',
  stopped: 'STOP pressed',
};
const ease = (u: number) => u * u * (3 - 2 * u);
/** How far a peg pushes the lever: most when it meets the tip, then it slips past. */
const swingOf = (ms: number) => {
  const f = (ms / LOOP_MS) % 1;
  return 0.16 * Math.pow(1 - f, 3);
};

// The idle tour, until someone presses a button: INIT, START, a few seconds of loop(), STOP.
const TOUR: [number, DsKey | 'RESET'][] = [[1.4, 'INIT'], [3.4, 'START'], [7.4, 'STOP'], [10, 'RESET']];
const TOUR_S = 10;

export function mount(host: HTMLElement): () => void {
  const readout = (s: OpModeState) =>
    `${PHASE_WORD[s.phase]} · init() ${s.initRuns} · loop() ${loopRuns(s)} · ${seconds(s).toFixed(1)} s`;
  host.innerHTML = k.plateHtml({
    fig: 'Fig 3',
    title: 'OpMode bench',
    hint: 'Press INIT, then START',
    readout: readout(IDLE),
    keys: [
      { mark: 'lit', label: 'Lit: the part of your OpMode running now' },
      { mark: 'raised', label: 'The keys: INIT, START and STOP, as on the Driver Station' },
    ],
    caption: `init() runs once, when the driver presses INIT: the small cam turns one time, pushes its rod once, and stands still. After START, loop() runs every ${LOOP_MS} ms, ${LOOPS_PER_S} times a second, until STOP. The wheel turns once a second and each of its ${PEGS} pegs is one pass of loop(), so the 50th pass comes as the wheel finishes its first turn.`,
    body: `<div class="iso-stage" role="img" aria-label="OpMode bench">${figure()}</div>`,
  });
  const plateEl = host.querySelector<HTMLElement>('.iso-plate')!;
  const controls = document.createElement('div');
  controls.className = 'figure-controls';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Driver Station');
  const buttons = new Map<DsKey | 'RESET', HTMLButtonElement>();
  const button = (id: DsKey | 'RESET', label: string, onPress: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-quiet figure-button';
    b.textContent = label;
    b.addEventListener('click', () => { touched = true; onPress(); sync(); run(); });
    controls.append(b);
    buttons.set(id, b);
  };
  for (const key of KEYS) button(key, key, () => act(key));
  button('RESET', 'Reset', () => act('RESET'));
  plateEl.after(controls);

  const svg = host.querySelector('svg')!;
  const part = (name: string) => svg.querySelector(`[data-part="${name}"]`)!;
  const parts = {
    cam: part('cam'), rodBack: part('rod-back'), rodFront: part('rod-front'),
    face: part('face'), pegs: part('pegs'), arm: part('arm'),
    keys: KEYS.map((_, i) => svg.querySelector(`[data-key="${i}"]`)!),
  };
  const readoutEl = host.querySelector('[data-readout]')!;
  const live = document.createElement('p');
  live.className = 'visually-hidden';
  live.setAttribute('aria-live', 'polite');
  controls.after(live);

  const still = matchMedia('(prefers-reduced-motion: reduce)');
  let state: OpModeState = IDLE;
  let touched = false, visible = false, frame = 0, last = 0, tourClock = 0, tourNext = 0;
  let camTurn = 0;          // 0..1 while the cam shows its one turn
  let camTurning = false;
  let drawn = '';

  const act = (key: DsKey | 'RESET') => {
    if (key === 'RESET') { state = IDLE; camTurn = 0; camTurning = false; return; }
    if (!canPress(state, key)) return;
    state = press(state, key);
    if (key === 'INIT') { camTurn = 0; camTurning = true; }
  };

  /** Buttons follow the Driver Station: only the keys it offers now are enabled. */
  const sync = () => {
    for (const key of KEYS) buttons.get(key)!.disabled = !canPress(state, key);
    buttons.get('RESET')!.disabled = state.phase === 'idle';
    const said = PHASE_SAID[state.phase];
    if (live.textContent !== said && (touched || state.phase === 'idle')) live.textContent = touched ? said : '';
  };

  const latched = (s: OpModeState) => (s.phase === 'init' ? 0 : s.phase === 'running' ? 1 : s.phase === 'stopped' ? 2 : -1);

  const draw = () => {
    const calm = still.matches;
    const turnNow = calm ? 0 : seconds(state) % 1;
    const swing = calm || state.phase !== 'running' ? 0 : swingOf(state.ms);
    const camAt = camTurning ? ease(camTurn) : 0;
    const running = state.phase === 'running';
    const key = `${camAt}|${turnNow}|${swing}|${running}`;
    if (key !== drawn) {
      drawn = key;
      parts.cam.innerHTML = cam(camAt);
      parts.rodBack.innerHTML = rodBack(camAt);
      parts.rodFront.innerHTML = rodFront(camAt);
      parts.face.innerHTML = wheelFace(turnNow);
      parts.pegs.innerHTML = pegs(turnNow, running);
      parts.arm.innerHTML = arm(swing);
    }
    // One lit part: the cam while it shows init() running, the pegs while loop() runs.
    parts.cam.querySelector('.iso-solid')?.toggleAttribute('data-lit', camTurning);
    const down = latched(state);
    parts.keys.forEach((g, i) => {
      const t = i === down ? k.translateAlong(P, [0, 0, -2.4]) : '';
      if ((g.getAttribute('transform') ?? '') !== t) { if (t) g.setAttribute('transform', t); else g.removeAttribute('transform'); }
    });
    const text = readout(state);
    if (readoutEl.textContent !== text) readoutEl.textContent = text;
  };

  const tour = (dt: number) => {
    tourClock += dt;
    while (tourNext < TOUR.length && tourClock >= TOUR[tourNext]![0]) act(TOUR[tourNext++]![1]);
    if (tourClock >= TOUR_S) { tourClock -= TOUR_S; tourNext = 0; }
    sync();
  };

  const tick = (now: number) => {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    const calm = still.matches;
    if (!touched && !calm) tour(dt);
    if (camTurning) {
      camTurn = calm ? 1 : Math.min(1, camTurn + dt / INIT_TURN_S);
      if (camTurn >= 1) { camTurn = 0; camTurning = false; }
    }
    state = stepOpMode(state, dt);
    draw();
    const moving = state.phase === 'running' || camTurning;
    frame = visible && (moving || (!touched && !calm)) ? requestAnimationFrame(tick) : 0;
  };
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };

  const seen = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1]!.isIntersecting;
    if (visible) run(); else if (frame) { cancelAnimationFrame(frame); frame = 0; }
  }, { rootMargin: '120px 0px' });
  seen.observe(host);
  sync();
  draw();

  return () => { seen.disconnect(); if (frame) cancelAnimationFrame(frame); frame = 0; };
}
