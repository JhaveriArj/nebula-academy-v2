import * as k from './kit/iso-kit';
import { ARM_MIN_TICKS, ARM_MAX_TICKS, ARM_TICKS_PER_S } from '../sim/simulation';

/* Fig: the proportional arm. An armMotor on a cradle swings an arm in front of a half-round
   scale. A pointer clipped to the scale's rim is the target. A dial on the bench is the power
   gauge: its needle shows error times kP, held between -0.4 and 0.4 and never under 0.08,
   with no power once the arm is within 1 degree. Those are the Tier 5 "Easing in" rules
   (target 90, kP 0.012), so far from the pointer the needle is pinned and the arm swings fast,
   and close in the needle falls back and the arm eases in. The lesson turns the robot; the
   arm's angle stands in for the yaw, which the caption says.

   The arm's travel is the simulator's armMotor: 0 to 1200 ticks, 900 ticks a second at full
   power. The figure lays those 1200 ticks over a 180 degree swing, so full power is 135
   degrees a second. Unlike the simulator, the arm has weight: its speed follows the power
   with a 0.25 s lag. That is what makes a large kP overshoot and wobble, as the lesson's
   Boost says it will. */

// ---------------------------------------------------------------- the model (pure, tested)

export const SWING_DEG = 180;
export const TICKS_PER_DEG = (ARM_MAX_TICKS - ARM_MIN_TICKS) / SWING_DEG; // 6.67
export const MAX_DEG_PER_S = ARM_TICKS_PER_S / TICKS_PER_DEG; // 135 at power 1
export const MAX_POWER = 0.4;   // the lesson's clamp
export const MIN_POWER = 0.08;  // the lesson's minimum, below which friction wins
export const CLOSE_ENOUGH = 1;  // degrees: the lesson's Math.abs(error) < 1.0
export const ARM_LAG = 0.25;    // seconds for the arm's speed to catch up with the power
export const KP_STEPS = [0.002, 0.006, 0.012, 0.025, 0.05, 0.1] as const;
export const DEFAULT_KP = 0.012;
export const TARGETS = { low: 30, middle: 90, high: 150 } as const;
export type TargetName = keyof typeof TARGETS;

const SUBSTEP = 1 / 240;         // fixed inner step, so a long frame can never blow up
const MAX_SUBSTEPS = 240 * 10;   // at most 10 simulated seconds per call
const STILL_SPEED = 0.5;         // degrees a second: slower than this inside the band is stopped

export interface ArmState {
  /** Degrees, 0 (arm flat to the right) to 180 (flat to the left). */
  angle: number;
  /** Degrees a second. */
  speed: number;
  target: number;
  kP: number;
}

/** The lesson's loop body: power = error * kP, held inside ±0.4, never weaker than 0.08,
    and none at all once the error is under 1 degree. */
export function powerFor(error: number, kP: number): number {
  if (!Number.isFinite(error) || Math.abs(error) < CLOSE_ENOUGH) return 0;
  let power = error * kP;
  if (power > MAX_POWER) power = MAX_POWER;
  if (power < -MAX_POWER) power = -MAX_POWER;
  if (power > 0 && power < MIN_POWER) power = MIN_POWER;
  if (power < 0 && power > -MIN_POWER) power = -MIN_POWER;
  return power;
}

export const errorOf = (s: ArmState) => s.target - s.angle;
export const ticksOf = (angle: number) => ARM_MIN_TICKS + angle * TICKS_PER_DEG;
export const isSettled = (s: ArmState) => s.speed === 0 && Math.abs(errorOf(s)) < CLOSE_ENOUGH;

/** Advances the arm by dt seconds in steps no longer than 1/240 s, and at most 10 simulated
    seconds per call, so any dt, even a huge one, stays stable and the loop always ends. */
export function stepArm(s: ArmState, dt: number): ArmState {
  const steps = Number.isFinite(dt) && dt > 0 ? Math.min(MAX_SUBSTEPS, Math.ceil(dt / SUBSTEP)) : 0;
  const h = steps ? Math.min(SUBSTEP, dt / steps) : 0; // past 10 s, the rest of dt is dropped
  let { angle, speed } = s;
  for (let i = 0; i < steps; i++) {
    const power = powerFor(s.target - angle, s.kP);
    speed += (power * MAX_DEG_PER_S - speed) * Math.min(1, h / ARM_LAG);
    angle += speed * h;
    if (angle <= 0) { angle = 0; speed = Math.max(0, speed); }
    if (angle >= SWING_DEG) { angle = SWING_DEG; speed = Math.min(0, speed); }
  }
  if (Math.abs(s.target - angle) < CLOSE_ENOUGH && Math.abs(speed) < STILL_SPEED) speed = 0;
  return { ...s, angle, speed };
}

/** Where the arm comes to rest: steps until settled, giving up after 60 simulated seconds. */
export function settle(s: ArmState): ArmState {
  for (let i = 0; i < 1800 && !isSettled(s); i++) s = stepArm(s, 1 / 30);
  return s;
}

export const startState = (): ArmState => ({ angle: 0, speed: 0, target: TARGETS.middle, kP: DEFAULT_KP });

/** The next kP step up (+1) or down (-1), staying inside KP_STEPS. */
export function stepKp(kP: number, by: 1 | -1): number {
  const at = KP_STEPS.findIndex((v) => v >= kP - 1e-9);
  const index = Math.max(0, Math.min(KP_STEPS.length - 1, (at < 0 ? KP_STEPS.length - 1 : at) + by));
  return KP_STEPS[index]!;
}

// ---------------------------------------------------------------- the drawing

type XZ = [number, number];
const W = 640, H = 400;
const PLATE = { x: -116, y: -26, w: 232, d: 98, r: 8 };
const PLATE_H = 10, FOOT_H = 6;
const Z0 = 24;                        // the pivot's height; the shaft runs along y
const RAIL = { x: -100, y: -12, w: 200, d: 16, r: 2 };
const RAIL_TOP = 12;
const SCALE_R = 94;                   // the half-round scale plate
const SCALE_Y0 = -5, SCALE_Y1 = 0;
const TICK_OUT = 82, TICK_MINOR = 77, TICK_MAJOR = 71;
const ARM_Y0 = 0.8, ARM_Y1 = 4.8, ARM_TIP = 80;
const GEAR_R = 12.5, CAN_R = 10.5;
const GEAR_Y = [ARM_Y1, 12] as const, CAN_Y = [12, 27] as const;
const CRADLE = { x: -11, y: 7, w: 22, d: 18, r: 2 };
const G: k.Plane = [62, 42];          // the power gauge's centre
const GAUGE_R = 23, GAUGE_Z = 5, GAUGE_TOP = 13;
const GAUGE_SWEEP = (120 * Math.PI) / 180; // ±0.4 power is ±120 degrees of needle

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [0, SCALE_Y0, Z0 + SCALE_R + 6], [-SCALE_R - 6, SCALE_Y0, Z0], [SCALE_R + 6, SCALE_Y0, Z0]],
  W, H, { pad: 30, azimuth: 58 },
);
const at = (p: k.Point3) => k.iso(p, P);
const S = (paths: k.SolidPaths, style?: k.SolidStyle) => k.solidSvg(paths, style);
const L = (d: string, style?: k.LineStyle) => k.lineSvg(d, style);
const D = (points: k.Flat[], style?: Parameters<typeof k.dotsSvg>[1]) => k.dotsSvg(points, style);
const byDepth = (points: k.Plane[]) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const rad = (deg: number) => (deg * Math.PI) / 180;
const polar = (r: number, deg: number): XZ => [r * Math.cos(rad(deg)), Z0 + r * Math.sin(rad(deg))];
const onFace = (y: number) => (points: XZ[], closed = false) => k.pathOf(points.map(([x, z]) => at([x, y, z])), closed);

/** A convex profile drawn in the x-z plane and pushed along y from y0 to y1: the scale plate,
    the arm, the motor and the pointer all face the viewer this way. Shaded by facing like
    the kit's own extrude, with the face toward +y lit as a side and up-facing edges as tops. */
function slabY(ring: XZ[], y0: number, y1: number): k.SolidPaths {
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const [ax, az] = ring[i]!, [bx, bz] = ring[(i + 1) % ring.length]!;
    area += ax * bz - bx * az;
  }
  const ccw = area > 0;
  const { sinA, cosA } = k.cameraOf(P);
  const front = ring.map(([x, z]) => at([x, y1, z]));
  const back = ring.map(([x, z]) => at([x, y0, z]));
  const shades: string[][] = [[], [], [], []];
  const tops: string[] = [];
  const crease: string[] = [];
  const bucket = (nx: number, ny: number) => Math.min(3, Math.max(0, Math.floor(((nx * -sinA + ny * cosA + 1) / 2) * 4)));
  let run: k.Flat[] = [];
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    const [ax, az] = ring[i]!, [bx, bz] = ring[j]!;
    const len = Math.hypot(bx - ax, bz - az) || 1;
    const nx = (ccw ? bz - az : az - bz) / len, nz = (ccw ? ax - bx : bx - ax) / len;
    const facing = k.depthOf([nx, 0, nz], P) > 1e-9;
    if (!facing) { if (run.length > 1) crease.push(k.pathOf(run)); run = []; continue; }
    const quad = k.pathOf([front[i]!, front[j]!, back[j]!, back[i]!], true);
    if (nz > 0.6) tops.push(quad); else shades[bucket(nx, 0)]!.push(quad);
    if (!run.length) run.push(front[i]!);
    run.push(front[j]!);
  }
  if (run.length > 1) crease.push(k.pathOf(run));
  shades[bucket(0, 1)]!.push(k.pathOf(front, true));
  const hull = hullOf([...front, ...back]);
  return { fill: k.pathOf(hull, true), outline: k.pathOf(hull, true), crease: crease.join(''), top: tops.join(''), shades: shades.map((s) => s.join('')) };
}

function hullOf(points: k.Flat[]): k.Flat[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: k.Flat, a: k.Flat, b: k.Flat) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: k.Flat[]) => {
    const out: k.Flat[] = [];
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2]!, out[out.length - 1]!, p) <= 0) out.pop();
      out.push(p);
    }
    return out.slice(0, -1);
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

const circleXZ = (cx: number, cz: number, r: number, steps = 40): XZ[] =>
  Array.from({ length: steps }, (_, i) => [cx + r * Math.cos((i / steps) * Math.PI * 2), cz + r * Math.sin((i / steps) * Math.PI * 2)] as XZ);

function bench(): string {
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
  // A label plate, its rule lines standing for printed text.
  const label = { x: -104, y: 44, w: 44, d: 16, r: 2 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P), { tone: 'faint' }));
  out.push(L(k.lineOnTop([label.x + 5, label.y + 5], [label.x + 30, label.y + 5], 0.8, P), { tone: 'lo', free: true }));
  out.push(L(k.lineOnTop([label.x + 5, label.y + 8], [label.x + 36, label.y + 8], 0.8, P), { tone: 'lo', free: true }));
  out.push(L(k.lineOnTop([label.x + 5, label.y + 11], [label.x + 22, label.y + 11], 0.8, P), { tone: 'lo', free: true }));
  out.push(D([at([label.x + 2.6, label.y + label.d / 2, 0.8]), at([label.x + label.w - 2.6, label.y + label.d / 2, 0.8])], { size: 0.45 }));
  return out.join('');
}

function scale(): string {
  const out: string[] = [];
  // The rail the scale stands on, screwed down at both ends.
  out.push(S(k.slabOf(RAIL, 0, RAIL_TOP, P, 3, 0.6), { tone: 'mid' }));
  out.push(L(k.sideSeam(RAIL, 4, P, 3), { tone: 'faint' }));
  out.push(D([at([RAIL.x + 5, RAIL.y + 13, RAIL_TOP]), at([RAIL.x + RAIL.w - 5, RAIL.y + 13, RAIL_TOP])], { size: 0.5 }));
  // The half-round plate.
  const half: XZ[] = [];
  for (let i = 0; i <= 72; i++) half.push(polar(SCALE_R, (i / 72) * 180));
  half.push([-SCALE_R, RAIL_TOP], [SCALE_R, RAIL_TOP]);
  const face = onFace(SCALE_Y1);
  const groove: XZ[] = [];
  for (let i = 0; i <= 72; i++) groove.push(polar(SCALE_R - 5, (i / 72) * 180));
  groove.push([-(SCALE_R - 5), RAIL_TOP + 4], [SCALE_R - 5, RAIL_TOP + 4]);
  // The scale: a ring at 82 with a tick every 5 degrees hanging from it, a long one every 30.
  const ringLine: XZ[] = [];
  for (let i = 0; i <= 72; i++) ringLine.push(polar(TICK_OUT, (i / 72) * 180));
  const minor: string[] = [], major: string[] = [];
  for (let deg = 0; deg <= 180; deg += 5) {
    const big = deg % 30 === 0;
    (big ? major : minor).push(face([polar(TICK_OUT, deg), polar(big ? TICK_MAJOR : TICK_MINOR, deg)]));
  }
  const inner = L(face(groove, true), { tone: 'faint' }) + L(face(ringLine), { tone: 'lo' }) + L(minor.join(''), { tone: 'lo' }) + L(major.join(''), { tone: 'mid' }) +
    L(face(circleXZ(0, Z0, 16, 48), true), { tone: 'faint' }) +
    D([at([-(SCALE_R - 9), SCALE_Y1, RAIL_TOP + 7]), at([SCALE_R - 9, SCALE_Y1, RAIL_TOP + 7])], { size: 0.5 });
  out.push(S(slabY(half, SCALE_Y0, SCALE_Y1), { tone: 'mid', inner }));
  return out.join('');
}

/** The target pointer: a clip that rides the rim, its tip on the scale ring. */
function pointerAt(deg: number): k.SolidPaths {
  const local: XZ[] = [[TICK_OUT + 1, 0], [SCALE_R - 3, -4.5], [SCALE_R + 6, -4.5], [SCALE_R + 6, 4.5], [SCALE_R - 3, 4.5]];
  const c = Math.cos(rad(deg)), s = Math.sin(rad(deg));
  return slabY(local.map(([u, v]) => [u * c - v * s, Z0 + u * s + v * c] as XZ), SCALE_Y0 - 1.5, SCALE_Y1 + 1.8);
}

/** The arm at an angle: a bar on the motor's shaft that narrows to a pointer at 80. */
function armAt(deg: number): { body: k.SolidPaths; holes: string } {
  const local: XZ[] = [[66, -5], [ARM_TIP, -0.9], [ARM_TIP, 0.9], [66, 5]];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI / 2 + (i / 12) * Math.PI;
    local.push([-12 + 5 * Math.cos(a), 5 * Math.sin(a)]);
  }
  const c = Math.cos(rad(deg)), s = Math.sin(rad(deg));
  const turn = ([u, v]: XZ): XZ => [u * c - v * s, Z0 + u * s + v * c];
  const face = onFace(ARM_Y1);
  const holes = [30, 46, 60].map((u) => face(circleXZ(u, 0, u === 60 ? 1.6 : 2.4, 20).map(turn), true)).join('');
  return { body: slabY(local.map(turn), ARM_Y0, ARM_Y1), holes };
}

function arm(deg: number): string {
  const { body, holes } = armAt(deg);
  return S(body, { tone: 'hi', crease: 'lo', lit: true, inner: L(holes, { tone: 'lo' }) });
}

function motor(): string {
  const out: string[] = [];
  out.push(S(k.slabOf(CRADLE, 0, Z0 - GEAR_R + 0.5, P, 3, 0.5), { tone: 'mid' }));
  out.push(D(k.corners(CRADLE, 3).map(([x, y]) => at([x, y, Z0 - GEAR_R + 0.5])), { size: 0.45 }));
  // The gearbox on the shaft side, then the motor can, its strap and the end cap.
  const face = (y: number) => onFace(y);
  out.push(S(slabY(circleXZ(0, Z0, GEAR_R, 48), GEAR_Y[0], GEAR_Y[1]), { tone: 'mid', inner: L(face(GEAR_Y[1])(circleXZ(0, Z0, GEAR_R - 2.2, 48), true), { tone: 'lo' }) }));
  out.push(S(slabY(circleXZ(0, Z0, CAN_R, 48), CAN_Y[0], CAN_Y[1]), { tone: 'mid' }));
  out.push(S(slabY(circleXZ(0, Z0, CAN_R + 0.9, 48), 17.5, 20), { tone: 'lo' }));
  const cap = face(CAN_Y[1]);
  out.push(L(cap(circleXZ(0, Z0, CAN_R - 2, 40), true), { tone: 'lo' }));
  out.push(L(cap(circleXZ(0, Z0, 2.4, 16), true), { tone: 'mid' }));
  out.push(D([at([-5, CAN_Y[1], Z0 + 5]), at([5, CAN_Y[1], Z0 - 5])], { size: 0.45 }));
  return out.join('');
}

// The motor's cable leaves the cradle's side and runs over the bench to the gauge's pedestal.
function cable(): string {
  const x0 = CRADLE.x + CRADLE.w, x1 = G[0] - GAUGE_R - 6, y = CRADLE.y + CRADLE.d - 4;
  const via = [at([x0 + 3, y, 0.6]), at([x1 - 3, y, 0.6])];
  return k.wireSvg(at([x0, y, 4]), at([x1, y, 2.5]), { via, tone: 'mid', size: 1 });
}

const needleDir = (power: number): k.Plane => {
  const { sinA, cosA } = k.cameraOf(P);
  const phi = (Math.max(-MAX_POWER, Math.min(MAX_POWER, power)) / MAX_POWER) * GAUGE_SWEEP;
  return [-cosA * Math.cos(phi) + sinA * Math.sin(phi), -sinA * Math.cos(phi) - cosA * Math.sin(phi)];
};
const needleAt = (power: number) => {
  const [dx, dy] = needleDir(power);
  return k.lineOnTop([G[0] - dx * 4.5, G[1] - dy * 4.5], [G[0] + dx * (GAUGE_R - 4.4), G[1] + dy * (GAUGE_R - 4.4)], GAUGE_TOP + 0.2, P);
};

function gauge(): string {
  const out: string[] = [];
  const pedestal = { x: G[0] - GAUGE_R - 6, y: G[1] - GAUGE_R - 4, w: GAUGE_R * 2 + 12, d: GAUGE_R * 2 + 8, r: 4 };
  out.push(S(k.slabOf(pedestal, 0, GAUGE_Z, P, 4, 0.5), { tone: 'mid' }));
  out.push(D(k.corners(pedestal, 3).map(([x, y]) => at([x, y, GAUGE_Z])), { size: 0.45 }));
  out.push(S(k.cylinder(G[0], G[1], GAUGE_R, GAUGE_Z, GAUGE_TOP - GAUGE_Z, P, 64, 0.8), { tone: 'hi', crease: 'lo' }));
  out.push(L(k.knurl(G[0], G[1], GAUGE_R, GAUGE_Z + 0.8, GAUGE_TOP - 3, 72, P, 0.3), { tone: 'lo' }));
  out.push(L(k.sideArc(G[0], G[1], GAUGE_R, GAUGE_TOP - 3, P, 40), { tone: 'faint' }));
  out.push(L(k.ring(G[0], G[1], GAUGE_R - 2, GAUGE_TOP, P, 64), { tone: 'lo' }));
  // A tick every 0.04 of power from -0.4 to 0.4, long ones at -0.4, -0.2, 0, 0.2 and 0.4.
  const minor: string[] = [], major: string[] = [];
  for (let i = -10; i <= 10; i++) {
    const [dx, dy] = needleDir(i * 0.04);
    const big = i % 5 === 0;
    const r0 = GAUGE_R - 2.4, r1 = r0 - (big ? 4.2 : 2.2);
    (big ? major : minor).push(k.lineOnTop([G[0] + dx * r0, G[1] + dy * r0], [G[0] + dx * r1, G[1] + dy * r1], GAUGE_TOP, P));
  }
  out.push(L(minor.join(''), { tone: 'lo' }), L(major.join(''), { tone: 'mid' }));
  return out.join('');
}

function gaugeHub(): string {
  return L(k.ring(G[0], G[1], 1.6, GAUGE_TOP, P, 16), { tone: 'hi' }) + D([at([G[0], G[1], GAUGE_TOP])], { size: 0.5, tone: 'hi' });
}

function figure(s: ArmState): string {
  return k.figureSvg({
    width: W,
    height: H,
    label: 'A motor on a cradle swings an arm in front of a half-round scale marked every 5 degrees. A pointer on the rim marks the target. A dial on the bench shows the motor power: the error times kP, held between minus 0.4 and 0.4.',
    body: [
      bench(),
      scale(),
      `<g data-part="pointer">${S(pointerAt(s.target), { tone: 'hi', crease: 'lo' })}</g>`,
      `<g data-part="arm">${arm(s.angle)}</g>`,
      motor(),
      cable(),
      gauge(),
      `<path data-part="needle" class="iso-line" data-tone="hi" d="${needleAt(powerFor(errorOf(s), s.kP))}" style="stroke-width:1.6"/>`,
      gaugeHub(),
    ],
  });
}

// ---------------------------------------------------------------- live

const num = (v: number, places: number) => {
  const t = v.toFixed(places);
  return /^-0\.?0*$/.test(t) ? t.slice(1) : t;
};
// Cut, not rounded, so an error of 0.96 inside the stop band never reads 1.0.
const cut = (v: number) => num(Math.trunc(v * 10) / 10, 1);
/** Two lines, so it fits the card beside the hint on a 1024 px screen. */
const readoutOf = (s: ArmState) =>
  `target ${s.target}° · arm ${num(s.angle, 1)}° · error ${cut(errorOf(s))}\npower ${num(powerFor(errorOf(s), s.kP), 2)} · kP ${s.kP}`;

export function mount(host: HTMLElement): () => void {
  let state = startState();
  host.innerHTML = k.plateHtml({
    fig: 'Fig 5',
    title: 'Proportional arm',
    hint: 'Pick a target',
    readout: readoutOf(state),
    keys: [
      { mark: 'lit', label: 'The arm, turned by armMotor' },
      { mark: 'raised', label: 'The pointer on the rim: the target' },
      { mark: 'edge', label: 'The dial needle: the power, error times kP' },
    ],
    caption: `Power is error times kP, held inside -${MAX_POWER} and ${MAX_POWER} and never under ${MIN_POWER}, and none once the arm is within ${CLOSE_ENOUGH} degree. Far from the target the needle sits at ${MAX_POWER}; close in it falls back and the arm eases in. A bigger kP swings past and wobbles; a smaller one crawls. This is the same loop as your turn, with the arm's angle in place of the yaw. The arm's 180 degree swing is the simulator's 0 to ${ARM_MAX_TICKS} ticks, and full power moves it ${ARM_TICKS_PER_S} ticks a second.`,
    body: `<div class="iso-stage">${figure(state)}</div>`,
  });
  const plateEl = host.querySelector<HTMLElement>('.iso-plate')!;
  const controls = document.createElement('div');
  controls.className = 'figure-controls';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Move the arm');
  const button = (label: string, onPress: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-quiet figure-button';
    b.textContent = label;
    b.addEventListener('click', () => { touched = true; onPress(); sync(); run(); });
    controls.append(b);
    return b;
  };
  const targetButtons = (Object.keys(TARGETS) as TargetName[]).map((name) => {
    const b = button(`Target: ${name}`, () => { state = { ...state, target: TARGETS[name] }; });
    return { b, name };
  });
  const smaller = button('kP smaller', () => { state = { ...state, kP: stepKp(state.kP, -1) }; say(`kP ${state.kP}`); });
  const bigger = button('kP bigger', () => { state = { ...state, kP: stepKp(state.kP, 1) }; say(`kP ${state.kP}`); });
  button('Reset', () => { state = startState(); });
  plateEl.after(controls);

  const svg = host.querySelector('svg')!;
  const parts = {
    pointer: svg.querySelector('[data-part="pointer"]')!,
    arm: svg.querySelector('[data-part="arm"]')!,
    needle: svg.querySelector('[data-part="needle"]')!,
  };
  const readoutEl = host.querySelector<HTMLElement>('[data-readout]')!;
  readoutEl.style.whiteSpace = 'pre';
  readoutEl.style.textAlign = 'right';
  readoutEl.style.lineHeight = '1.4';
  const live = document.createElement('p');
  live.className = 'visually-hidden';
  live.setAttribute('aria-live', 'polite');
  controls.after(live);
  const say = (text: string) => { live.textContent = text; };

  const still = matchMedia('(prefers-reduced-motion: reduce)');
  let touched = false, visible = false, frame = 0, last = 0, rest = 0, tourAt = 0;
  let shownTarget = state.target, drawnAngle = NaN, drawnTarget = NaN, announced = '';
  const TOUR = [TARGETS.low, TARGETS.high, TARGETS.middle];

  const sync = () => {
    for (const { b, name } of targetButtons) b.setAttribute('aria-pressed', String(state.target === TARGETS[name]));
    smaller.disabled = state.kP <= KP_STEPS[0];
    bigger.disabled = state.kP >= KP_STEPS[KP_STEPS.length - 1]!;
  };

  const draw = () => {
    if (state.angle !== drawnAngle) {
      drawnAngle = state.angle;
      parts.arm.innerHTML = arm(state.angle);
    }
    if (shownTarget !== drawnTarget) {
      drawnTarget = shownTarget;
      parts.pointer.innerHTML = S(pointerAt(shownTarget), { tone: 'hi', crease: 'lo' });
    }
    parts.needle.setAttribute('d', needleAt(powerFor(errorOf(state), state.kP)));
    const text = readoutOf(state);
    if (readoutEl.textContent !== text) readoutEl.textContent = text;
    const words = `Arm resting at ${num(state.angle, 1)} degrees, target ${state.target}, kP ${state.kP}`;
    if (isSettled(state) && words !== announced) { announced = words; say(words); }
  };

  // The idle tour, until someone presses a button: low, high, middle, resting between moves.
  const tour = (dt: number) => {
    if (!isSettled(state)) { rest = 0; return; }
    rest += dt;
    if (rest > 1.6) { rest = 0; state = { ...state, target: TOUR[tourAt++ % TOUR.length]! }; sync(); }
  };

  const tick = (now: number) => {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    const calm = still.matches;
    if (!touched && !calm) tour(dt);
    if (calm) {
      state = settle(state); // reduced motion: jump to where the arm comes to rest
      shownTarget = state.target;
    } else {
      state = stepArm(state, dt);
      shownTarget += (state.target - shownTarget) * (1 - Math.exp(-dt / 0.12));
      if (Math.abs(state.target - shownTarget) < 0.05) shownTarget = state.target;
    }
    draw();
    const moving = !isSettled(state) || shownTarget !== state.target;
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
