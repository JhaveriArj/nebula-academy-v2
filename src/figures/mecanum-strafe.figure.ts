import * as k from './kit/iso-kit';
import { MECANUM_MOTORS, TICK_MS, toRad, normalizeDeg, clamp } from '../sim/simulation';
import { ROBOT_HALF, TILE_CM } from '../sim/field';

/* Fig: the mecanum robot on a practice square of two by two foam tiles. Each wheel has its
   rollers drawn at 45 degrees, and above each wheel a sliding rod on a little ruler shows
   which way that wheel pushes: along its roller diagonal, forwards or backwards. The four
   pushes add up to what the robot does, and the robot drives, slides or spins on the tiles
   by exactly the simulator's sums (src/sim/simulation.ts, Simulation.step): the same 120 cm/s
   wheel speed, the same 85 percent for sideways, the same 40 cm track for turning, and the
   right-hand motors bolted on mirrored, so a power of -0.5 rolls them forwards. That last
   part is what the next lesson fixes with setDirection, and the caption says so. */

// ---------------------------------------------------------------- the model (pure, tested)

export type Motor = (typeof MECANUM_MOTORS)[number];
export type Powers = Record<Motor, number>;

/** The simulator's mecanum tuning (TUNING.mecanum in simulation.ts, which is not exported;
    tests/figure-mecanum-strafe.test.ts checks these against a running Simulation). */
export const MAX_WHEEL_CM_S = 120;
export const TRACK_CM = 40;
export const STRAFE_EFF = 0.85;
/** Bolted on mirrored, as Simulation gives them mountInverted. */
export const MOUNT_INVERTED: readonly Motor[] = ['frontRight', 'backRight'];
export const POWER = 0.5;

/** How fast a wheel's rim rolls forwards, in cm/s, for the power the code gives its motor. */
export const wheelCmS = (motor: Motor, power: number) =>
  clamp(power, -1, 1) * (MOUNT_INVERTED.includes(motor) ? -1 : 1) * MAX_WHEEL_CM_S;

export interface Motion {
  /** cm/s forwards. */
  forward: number;
  /** cm/s to the robot's right. */
  strafe: number;
  /** rad/s, counter-clockwise positive, as the simulator and the IMU count it. */
  omega: number;
}

/** The simulator's mecanum sums: four wheel speeds in, forward, sideways and turn out. */
export function motionOf(p: Powers): Motion {
  const fl = wheelCmS('frontLeft', p.frontLeft);
  const fr = wheelCmS('frontRight', p.frontRight);
  const bl = wheelCmS('backLeft', p.backLeft);
  const br = wheelCmS('backRight', p.backRight);
  return {
    forward: (fl + fr + bl + br) / 4,
    strafe: ((fl - fr - bl + br) / 4) * STRAFE_EFF,
    omega: -((fl - fr + bl - br) / 4) / TRACK_CM,
  };
}

export const turnDegS = (m: Motion) => (m.omega * 180) / Math.PI;

/** cm from the middle of the square, simulator axes (+y is up the field), heading in degrees. */
export interface Pose { x: number; y: number; headingDeg: number }

/** One step, integrated at the midpoint heading exactly as Simulation.step does it. The
    figure's floor follows the robot, so there are no walls to clamp at. */
export function stepPose(pose: Pose, m: Motion, dt: number): Pose {
  const halfTurn = (m.omega * dt * 180) / Math.PI / 2;
  const mid = toRad(pose.headingDeg + halfTurn);
  return {
    x: pose.x + (-Math.sin(mid) * m.forward + Math.cos(mid) * m.strafe) * dt,
    y: pose.y + (Math.cos(mid) * m.forward + Math.sin(mid) * m.strafe) * dt,
    headingDeg: normalizeDeg(pose.headingDeg + (m.omega * dt * 180) / Math.PI),
  };
}

/** Steps a whole duration in the simulator's own 20 ms ticks. The loop is bounded by the
    duration, so it always ends. */
export function drive(pose: Pose, p: Powers, seconds: number): Pose {
  const m = motionOf(p);
  const ticks = Math.min(10_000, Math.max(0, Math.round((seconds * 1000) / TICK_MS)));
  for (let i = 0; i < ticks; i++) pose = stepPose(pose, m, TICK_MS / 1000);
  return pose;
}

/** Which way each wheel's rim rolls (+1 forwards) for a motion, turned into the powers the
    code has to send: the mirrored right side needs the opposite sign. */
const powersFor = (roll: [number, number, number, number]): Powers => {
  const out = {} as Powers;
  MECANUM_MOTORS.forEach((motor, i) => {
    out[motor] = roll[i]! * POWER * (MOUNT_INVERTED.includes(motor) ? -1 : 1) || 0;
  });
  return out;
};

// Order: frontLeft, frontRight, backLeft, backRight.
export const PRESETS = {
  'Forward': powersFor([1, 1, 1, 1]),
  'Strafe right': powersFor([1, -1, -1, 1]),
  'Strafe left': powersFor([-1, 1, 1, -1]),
  'Turn': powersFor([1, -1, 1, -1]),
  'Stop': powersFor([0, 0, 0, 0]),
} as const;
export type Preset = keyof typeof PRESETS;

/** A wheel button steps its motor through 0.5, -0.5 and 0. */
export const nextPower = (power: number) => (power > 0 ? -POWER : power < 0 ? 0 : POWER);

// ---------------------------------------------------------------- the drawing

const W = 640, H = 420;
const HALF = 33;                            // the mat's half width; world units are centimetres
const LIP = 7, BASE_Z = -7, MAT_Z = -1.2, FOOT_H = 4;
const BASE = { x: -HALF - LIP, y: -HALF - LIP, w: (HALF + LIP) * 2, d: (HALF + LIP) * 2, r: 5 };

const R = ROBOT_HALF;
const WHEEL_R = 4.8, WHEEL_W = 3.8;         // goBILDA 96 mm mecanum, 38 mm wide
const WHEEL_SIDE = R - WHEEL_W / 2, WHEEL_FWD = 16;
const DECK_SIDE = R - WHEEL_W - 0.6, DECK_Z = 1.4, DECK_H = 1.6, DECK_TOP = DECK_Z + DECK_H;
const AXLE_Z = WHEEL_R;
const MOTOR_R = AXLE_Z - DECK_TOP;          // the motors lie on the deck, on the wheel's axle
const ROD_TRAVEL = 2.8;
const GAUGE_AT = { side: 8.6, fwd: 7.6 };

type RF = [number, number];                 // robot frame: [right, forward] in cm

interface Wheel { motor: Motor; at: RF; out: number; push: RF }
const S2 = Math.SQRT1_2;
/** Each wheel pushes along its floor rollers' diagonal: frontLeft and backRight forwards and
    to the right, frontRight and backLeft forwards and to the left (the sim's strafe sum). */
const WHEELS: Wheel[] = [
  { motor: 'frontLeft', at: [-WHEEL_SIDE, WHEEL_FWD], out: -1, push: [S2, S2] },
  { motor: 'frontRight', at: [WHEEL_SIDE, WHEEL_FWD], out: 1, push: [-S2, S2] },
  { motor: 'backLeft', at: [-WHEEL_SIDE, -WHEEL_FWD], out: -1, push: [-S2, S2] },
  { motor: 'backRight', at: [WHEEL_SIDE, -WHEEL_FWD], out: 1, push: [S2, S2] },
];

const P = k.fitProjection(
  [...k.boxCorners(BASE, BASE_Z - FOOT_H, 0), [-HALF, -HALF, 12], [HALF, HALF, 12]],
  W, H, { pad: 26, azimuth: 30, elevation: 40 },
);
const at = (p: k.Point3) => k.iso(p, P);
const S = (paths: k.SolidPaths, style?: k.SolidStyle) => k.solidSvg(paths, style);
const L = (d: string, style?: k.LineStyle) => k.lineSvg(d, style);
const D = (points: k.Flat[], style?: Parameters<typeof k.dotsSvg>[1]) => k.dotsSvg(points, style);

const CAM = k.cameraOf(P);
/** Toward the viewer, in world space: what depthOf measures along. */
const VIEW: k.Point3 = [CAM.cosA * CAM.cosE, CAM.sinA * CAM.cosE, CAM.sinE];
const LIGHT: k.Plane = [-CAM.sinA, CAM.cosA];

function hull(points: k.Flat[]): k.Flat[] {
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

/* --- the plate: a base on feet, a mat of four foam tiles, four low walls ---------------- */

function plateBelow(): string {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, BASE_Z - FOOT_H, -BASE_Z, P)}"/>`];
  const feet = k.corners(BASE, 16).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  for (const [x, y] of feet) {
    out.push(S(k.cylinder(x, y, 6, BASE_Z - FOOT_H, 1.4, P, 28), { tone: 'lo' }));
    out.push(S(k.cylinder(x, y, 4.6, BASE_Z - FOOT_H + 1.4, FOOT_H - 1.4, P, 28), { tone: 'mid' }));
  }
  out.push(S(k.slabOf(BASE, BASE_Z, MAT_Z - BASE_Z, P, 8, 1.2), { tone: 'mid' }));
  const screws = k.corners(BASE, 3.6);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 1.6, MAT_Z, P, 16)).join(''), { tone: 'lo' }));
  out.push(D(screws.map(([x, y]) => at([x, y, MAT_Z])), { size: 0.5 }));
  // A label plate on the near lip, with three rule lines standing for its printing.
  const label = { x: -6, y: HALF + 1.6, w: 26, d: LIP - 3.2, r: 0.6 };
  out.push(S(k.slabOf(label, MAT_Z, 0.5, P, 3), { tone: 'lo', crease: 'none' }));
  const ly = label.y + label.d / 2;
  out.push(L(k.lineOnTop([label.x + 3, ly], [label.x + 21, ly], MAT_Z + 0.5, P), { tone: 'lo', free: true }));
  out.push(D([at([label.x + 1.4, ly, MAT_Z + 0.5]), at([label.x + label.w - 1.4, ly, MAT_Z + 0.5])], { size: 0.4 }));
  // The foam mat. Its seams and texture slide under the robot (floorSvg), so the view
  // follows the robot the way a camera would.
  const mat = { x: -HALF, y: -HALF, w: HALF * 2, d: HALF * 2, r: 0 };
  out.push(S(k.slabOf(mat, MAT_Z, -MAT_Z, P, 2), { tone: 'lo', crease: 'lo' }));
  return out.join('');
}

const DIMPLE = TILE_CM / 6;                 // the foam's moulded texture, six to a tile
const wrap = (v: number, step: number) => ((v % step) + step) % step;

/** The tile seams and the moulded dimples, offset by where the robot has got to. Seams run
    edge to edge of the mat; the dimples stay inside it. */
function floorSvg(pose: Pose): string {
  const ox = wrap(pose.x, TILE_CM), oy = wrap(-pose.y, TILE_CM);
  const seams: string[] = [];
  for (let s = -ox - TILE_CM * 2; s <= HALF; s += TILE_CM) if (s > -HALF) seams.push(k.lineOnTop([s, -HALF], [s, HALF], 0, P));
  for (let s = -oy - TILE_CM * 2; s <= HALF; s += TILE_CM) if (s > -HALF) seams.push(k.lineOnTop([-HALF, s], [HALF, s], 0, P));
  const dx = wrap(pose.x, DIMPLE), dy = wrap(-pose.y, DIMPLE);
  const dots: k.Flat[] = [];
  for (let x = -dx - DIMPLE * 8 + DIMPLE / 2; x < HALF - 1; x += DIMPLE) {
    if (x < -HALF + 1) continue;
    for (let y = -dy - DIMPLE * 8 + DIMPLE / 2; y < HALF - 1; y += DIMPLE) if (y > -HALF + 1) dots.push(at([x, y, 0]));
  }
  return L(seams.join(''), { tone: 'faint' }) + D(dots, { size: 0.55, tone: 'mid' });
}

/* --- the robot, rebuilt each frame at its pose ------------------------------------------ */

interface Frame { pose: Pose; spin: Record<Motor, number>; rod: Record<Motor, number> }

/** Robot frame to world. The sim's +y is up the field; the drawing's world turns it to -y so
    the picture keeps the sim's handedness (left is left, a right turn is clockwise). */
function placer(pose: Pose) {
  const h = toRad(pose.headingDeg);
  const F: RF = [-Math.sin(h), Math.cos(h)], Rt: RF = [Math.cos(h), Math.sin(h)];
  const dir = ([r, f]: RF): k.Plane => [r * Rt[0] + f * F[0], -(r * Rt[1] + f * F[1])];
  const pt = ([r, f]: RF): k.Plane => dir([r, f]);   // the robot stays in the middle; the floor moves
  return { dir, pt };
}
type Placer = ReturnType<typeof placer>;

/** A box of length len along `along` and width wid across it, standing on z. */
function box(pl: Placer, c: RF, along: RF, len: number, wid: number, z: number, h: number, bevel = 0) {
  const across: RF = [-along[1], along[0]];
  const corner = (a: number, b: number): k.Plane =>
    pl.pt([c[0] + along[0] * a * len / 2 + across[0] * b * wid / 2, c[1] + along[1] * a * len / 2 + across[1] * b * wid / 2]);
  return k.extrude([corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)], z, h, P, { convex: true, bevel });
}

/** A round part lying on its side: a wheel, a gearbox, a motor can. Its axis is horizontal. */
function roundAlong(centre: k.Plane, z: number, axis: k.Plane, radius: number, len: number, steps = 36) {
  const u: k.Plane = [-axis[1], axis[0]];
  const p = (theta: number, s: number): k.Point3 => [
    centre[0] + axis[0] * s + u[0] * radius * Math.cos(theta),
    centre[1] + axis[1] * s + u[1] * radius * Math.cos(theta),
    z + radius * Math.sin(theta),
  ];
  const thetas = Array.from({ length: steps }, (_, i) => (i / steps) * Math.PI * 2);
  const endSign = axis[0] * VIEW[0] + axis[1] * VIEW[1] >= 0 ? 1 : -1;
  const face = thetas.map((t) => at(p(t, (endSign * len) / 2)));
  const back = thetas.map((t) => at(p(t, (-endSign * len) / 2)));
  const outline = k.pathOf(hull([...face, ...back]), true);
  const shades: string[][] = [[], [], [], []];
  thetas.forEach((t0, i) => {
    const t1 = thetas[(i + 1) % steps]! + (i === steps - 1 ? Math.PI * 2 : 0);
    const tm = (t0 + t1) / 2;
    const n: k.Point3 = [u[0] * Math.cos(tm), u[1] * Math.cos(tm), Math.sin(tm)];
    if (n[0] * VIEW[0] + n[1] * VIEW[1] + n[2] * VIEW[2] <= 0) return;
    const lit = clamp((n[0] * LIGHT[0] + n[1] * LIGHT[1]) * 0.5 + 0.5 + n[2] * 0.3, 0, 0.999);
    shades[Math.floor(lit * 4)]!.push(k.pathOf([at(p(t0, -len / 2)), at(p(t1, -len / 2)), at(p(t1, len / 2)), at(p(t0, len / 2))], true));
  });
  const paths: k.SolidPaths = {
    fill: outline,
    outline,
    crease: k.pathOf(face, true),
    top: k.pathOf(face, true),
    shades: shades.map((s) => s.join('')),
  };
  return { paths, p, u, endSign, face: (s: number) => s * endSign };
}

/** The seams between a mecanum wheel's rollers: lines that wind 45 degrees across the tread,
    drawn where they face you. The hand is chosen so the rollers on the floor lie along push. */
function rollerSeams(w: ReturnType<typeof roundAlong>, len: number, hand: number, phase: number, count = 10): string {
  const lines: string[] = [];
  const pieces = 8;
  for (let i = 0; i < count; i++) {
    let run: k.Flat[] = [];
    for (let j = 0; j <= pieces; j++) {
      const s = -len / 2 + (len * j) / pieces;
      const theta = phase + (i / count) * Math.PI * 2 + hand * (s / WHEEL_R);
      const n: k.Point3 = [w.u[0] * Math.cos(theta), w.u[1] * Math.cos(theta), Math.sin(theta)];
      const seen = n[0] * VIEW[0] + n[1] * VIEW[1] + n[2] * VIEW[2] > 0.12;
      if (seen) run.push(at(w.p(theta, s)));
      else { if (run.length > 1) lines.push(k.pathOf(run)); run = []; }
    }
    if (run.length > 1) lines.push(k.pathOf(run));
  }
  return lines.join('');
}

const dot2 = (a: k.Plane, b: k.Plane) => a[0] * b[0] + a[1] * b[1];
const depth2 = (p: k.Plane, z = 0) => k.depthOf([p[0], p[1], z], P);

function wheelSvg(pl: Placer, wh: Wheel, spin: number): string {
  const axis = pl.dir([wh.out, 0]);         // pointing out of the robot
  const centre = pl.pt(wh.at);
  const w = roundAlong(centre, AXLE_Z, axis, WHEEL_R, WHEEL_W, 40);
  const push = pl.dir(wh.push);
  const hand = Math.sign(dot2(push, axis)) * Math.sign(dot2(push, w.u)) || 1;
  const seams = rollerSeams(w, WHEEL_W - 0.3, hand, spin);
  let cap = '';
  if (w.endSign > 0) {                      // the hub face looks at you: a ring and a nut
    const hub = (r: number) => k.pathOf(Array.from({ length: 28 }, (_, i) => {
      const t = (i / 28) * Math.PI * 2;
      return at([centre[0] + axis[0] * WHEEL_W / 2 + w.u[0] * r * Math.cos(t), centre[1] + axis[1] * WHEEL_W / 2 + w.u[1] * r * Math.cos(t), AXLE_Z + r * Math.sin(t)]);
    }), true);
    cap = L(hub(WHEEL_R - 1.1), { tone: 'lo' }) + L(hub(1.4), { tone: 'mid' }) +
      D([at([centre[0] + axis[0] * WHEEL_W / 2, centre[1] + axis[1] * WHEEL_W / 2, AXLE_Z])], { size: 0.6, tone: 'hi' });
  }
  return S(w.paths, { tone: 'hi', crease: 'lo', inner: L(seams, { tone: 'lo' }) }) + cap;
}

function motorSvg(pl: Placer, wh: Wheel): string {
  const axis = pl.dir([wh.out, 0]);
  const inner = WHEEL_SIDE - WHEEL_W / 2;   // the wheel's inside face
  const along = (d: number) => pl.pt([wh.out * (inner - d), wh.at[1]]);
  const shaft = roundAlong(along(0.45), AXLE_Z, axis, 0.6, 0.9, 12);
  const gear = roundAlong(along(0.9 + 1.4), AXLE_Z, axis, MOTOR_R, 2.8, 28);
  const can = roundAlong(along(3.7 + 2.8), AXLE_Z, axis, MOTOR_R - 0.15, 5.6, 28);
  // Drawn far end first, so the near end covers it.
  const parts = [
    { key: depth2(along(0.45)), svg: S(shaft.paths, { tone: 'mid' }) },
    { key: depth2(along(2.3)), svg: S(gear.paths, { tone: 'mid', inner: L(seamAround(gear, 0.4), { tone: 'faint' }) }) },
    { key: depth2(along(6.5)), svg: S(can.paths, { tone: 'mid', inner: L(seamAround(can, -1.2) + seamAround(can, 1.2), { tone: 'faint' }) }) },
  ];
  return parts.sort((a, b) => a.key - b.key).map((x) => x.svg).join('');
}

/** A seam ring round a round part at s along its axis: its front half only. */
function seamAround(w: ReturnType<typeof roundAlong>, s: number): string {
  const pts: k.Flat[] = [];
  const out: string[] = [];
  for (let i = 0; i <= 32; i++) {
    const t = (i / 32) * Math.PI * 2;
    const n: k.Point3 = [w.u[0] * Math.cos(t), w.u[1] * Math.cos(t), Math.sin(t)];
    if (n[0] * VIEW[0] + n[1] * VIEW[1] + n[2] * VIEW[2] > 0) pts.push(at(w.p(t, s)));
    else if (pts.length) { out.push(k.pathOf(pts)); pts.length = 0; }
  }
  if (pts.length > 1) out.push(k.pathOf(pts));
  return out.join('');
}

/** The push gauge over a wheel: a ruler, two bushings, and a rod with a lit collar that slides
    along the wheel's push diagonal. Centred when the wheel is still. */
function gaugeSvg(pl: Placer, wh: Wheel, rod: number): string {
  const c: RF = [Math.sign(wh.at[0]) * GAUGE_AT.side, Math.sign(wh.at[1]) * GAUGE_AT.fwd];
  const d = wh.push;
  const off = (s: number): RF => [c[0] + d[0] * s, c[1] + d[1] * s];
  const out: string[] = [];
  out.push(S(box(pl, c, d, 11, 2.8, DECK_TOP, 0.4), { tone: 'lo', crease: 'none' }));
  // Ticks across the ruler, a centimetre apart, the middle one bright.
  const across: RF = [-d[1], d[0]];
  const tick = (s: number, len: number) => {
    const a = off(s), half = len / 2;
    return k.lineOnTop(pl.pt([a[0] - across[0] * half, a[1] - across[1] * half]), pl.pt([a[0] + across[0] * half, a[1] + across[1] * half]), DECK_TOP + 0.4, P);
  };
  out.push(L([-3, -2, -1, 1, 2, 3].map((s) => tick(s, 1.6)).join(''), { tone: 'lo' }));
  out.push(L(tick(0, 2.8), { tone: 'hi' }));
  // Which end is nearer decides the order: far bushing, rod and collar, near bushing.
  const nearEnd = depth2(pl.dir(d)) > 0 ? 1 : -1;
  const ROD_Z = DECK_TOP + 1.6, ROD_H = 0.9;
  const rodPiece = (s0: number, s1: number) =>
    s1 - s0 > 0.05 ? S(box(pl, off((s0 + s1) / 2), d, s1 - s0, 0.9, ROD_Z, ROD_H), { tone: 'hi' }) : '';
  const bush = (sign: number) => S(box(pl, off(sign * 4.6), d, 1.6, 2.4, DECK_TOP + 0.4, 2.8, 0.3), { tone: 'mid' }) +
    D([at([...pl.pt(off(sign * 4.6)), DECK_TOP + 3.2] as k.Point3)], { size: 0.4 });
  // The rod is 13.2 long; outside the bushings (faces at 3.8 and 5.4) only its ends show.
  const outer = (sign: number) => (sign > 0 ? rodPiece(5.4, rod + 6.6) : rodPiece(rod - 6.6, -5.4));
  out.push(outer(-nearEnd), bush(-nearEnd));
  out.push(rodPiece(-3.8, 3.8));
  out.push(S(box(pl, off(rod), d, 1.8, 2.6, ROD_Z - 0.7, ROD_H + 1.4), { tone: 'hi', lit: true }));
  out.push(bush(nearEnd), outer(nearEnd));
  return out.join('');
}

function robotSvg(f: Frame): string {
  const pl = placer(f.pose);
  const centre = pl.pt([0, 0]);
  const outVec = (wh: Wheel) => pl.dir([wh.out, 0]);
  const halo = { x: centre[0] - R * 0.8, y: centre[1] - R * 0.8, w: R * 1.6, d: R * 1.6, r: R * 0.6 };
  const out = [`<path class="iso-halo" d="${k.haloOf(halo, 0, 0.1, P)}" style="filter:blur(6px)"/>`];
  const byDepth = (list: Wheel[]) => [...list].sort((a, b) => depth2(pl.pt(a.at)) - depth2(pl.pt(b.at)));
  const far = WHEELS.filter((wh) => dot2(outVec(wh), [VIEW[0], VIEW[1]]) < 0);
  const near = WHEELS.filter((wh) => !far.includes(wh));
  for (const wh of byDepth(far)) out.push(wheelSvg(pl, wh, f.spin[wh.motor]));
  // The deck, its groove and corner screws.
  const deck = k.extrude([[-DECK_SIDE, -R], [DECK_SIDE, -R], [DECK_SIDE, R], [-DECK_SIDE, R]].map((p) => pl.pt(p as RF)), DECK_Z, DECK_H, P, { bevel: 0.5 });
  out.push(S(deck, { tone: 'mid' }));
  const g = 1.6;
  out.push(L(k.pathOf([[-DECK_SIDE + g, -R + g], [DECK_SIDE - g, -R + g], [DECK_SIDE - g, R - g], [-DECK_SIDE + g, R - g]].map((p) => at([...pl.pt(p as RF), DECK_TOP] as k.Point3)), true), { tone: 'faint' }));
  out.push(D([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => at([...pl.pt([a! * (DECK_SIDE - 3.2), b! * (R - 3.2)]), DECK_TOP] as k.Point3)), { size: 0.45 }));
  // Everything that stands on the deck, far to near.
  const items: { key: number; svg: string }[] = [];
  for (const wh of WHEELS) {
    items.push({ key: depth2(pl.pt([wh.out * 12, wh.at[1]]), AXLE_Z), svg: motorSvg(pl, wh) });
    const gc: RF = [Math.sign(wh.at[0]) * GAUGE_AT.side, Math.sign(wh.at[1]) * GAUGE_AT.fwd];
    items.push({ key: depth2(pl.pt(gc), DECK_TOP), svg: gaugeSvg(pl, wh, f.rod[wh.motor]) });
  }
  // The control hub, the battery and, at the front, the distance sensor that marks forwards.
  const hub = box(pl, [0, -1], [0, 1], 10, 6.4, DECK_TOP, 2.2, 0.4);
  items.push({ key: depth2(pl.pt([0, -1]), DECK_TOP), svg: S(hub, { tone: 'mid' }) + D([[-2, 3], [0, 3], [2, 3]].map(([a, b]) => at([...pl.pt([a!, b!]), DECK_TOP + 2.2] as k.Point3)), { size: 0.45 }) + D([at([...pl.pt([2, -4.6]), DECK_TOP + 2.2] as k.Point3)], { size: 0.6, tone: 'hi' }) });
  const battery = box(pl, [0, -12], [0, 1], 7, 6.4, DECK_TOP, 3.4, 0.5);
  items.push({ key: depth2(pl.pt([0, -12]), DECK_TOP), svg: S(battery, { tone: 'mid', inner: L(k.pathOf([pl.pt([-3.2, -12]), pl.pt([3.2, -12])].map((p) => at([...p, DECK_TOP + 3.4] as k.Point3))), { tone: 'faint' }) }) });
  const sensor = box(pl, [0, R - 1.8], [1, 0], 6, 3, DECK_TOP, 2.6, 0.3);
  items.push({ key: depth2(pl.pt([0, R - 1.8]), DECK_TOP), svg: S(sensor, { tone: 'hi' }) + D([at([...pl.pt([-1.3, R - 1.8]), DECK_TOP + 2.6] as k.Point3), at([...pl.pt([1.3, R - 1.8]), DECK_TOP + 2.6] as k.Point3)], { size: 0.7, tone: 'hi' }) });
  out.push(...items.sort((a, b) => a.key - b.key).map((x) => x.svg));
  for (const wh of byDepth(near)) out.push(wheelSvg(pl, wh, f.spin[wh.motor]));
  return out.join('');
}

const zeroBy = (): Record<Motor, number> => ({ frontLeft: 0, frontRight: 0, backLeft: 0, backRight: 0 });
const HOME: Pose = { x: 0, y: 0, headingDeg: 0 };

function figure(): string {
  return k.figureSvg({
    width: W,
    height: H,
    label: 'A four-wheel mecanum robot on a square of two by two foam tiles with low walls. Each wheel has rollers at 45 degrees, and a sliding rod above each wheel shows which way along its diagonal that wheel pushes.',
    body: [
      plateBelow(),
      `<g data-part="floor">${floorSvg(HOME)}</g>`,
      `<g data-part="robot">${robotSvg({ pose: HOME, spin: zeroBy(), rod: zeroBy() })}</g>`,
    ],
  });
}

// ---------------------------------------------------------------- live

const TOUR: Preset[] = ['Forward', 'Strafe right', 'Strafe left', 'Turn'];
const TOUR_EACH_S = 3;

const fmt = (v: number) => String(Math.round(v) || 0);
export function readoutOf(m: Motion): string {
  const deg = turnDegS(m);
  const side = `${m.strafe < -0.5 ? 'left' : 'right'} ${fmt(Math.abs(m.strafe))}`;
  const turn = Math.abs(deg) < 0.5 ? 'turn 0°/s' : `turn ${deg < 0 ? 'right' : 'left'} ${fmt(Math.abs(deg))}°/s`;
  return `fwd ${fmt(m.forward)} · ${side} cm/s · ${turn}`;
}

const rodFor = (motor: Motor, p: Powers) =>
  ROD_TRAVEL * clamp(wheelCmS(motor, p[motor]) / (MAX_WHEEL_CM_S * POWER), -1, 1);

export function mount(host: HTMLElement): () => void {
  host.innerHTML = k.plateHtml({
    fig: 'Fig 4',
    title: 'Mecanum pushes',
    hint: 'Press a button',
    readout: readoutOf(motionOf(PRESETS.Stop)),
    keys: [
      { mark: 'lit', label: 'The collar on each rod: which way that wheel pushes' },
      { mark: 'raised', label: 'The gearmotors: the right two are bolted on mirrored' },
    ],
    caption: `The rollers that touch the floor sit at 45 degrees, so each wheel pushes along a diagonal. With all four rolling forwards, the sideways pushes cancel and the robot drives at ${MAX_WHEEL_CM_S * POWER} cm/s. With frontLeft and backRight forwards and the other two backwards, the forward pushes cancel and it slides sideways at ${Math.round(MAX_WHEEL_CM_S * POWER * STRAFE_EFF)} cm/s, 85 percent, like the simulator. The right-hand motors are mirrored, so here a power of -0.5 rolls them forwards; the next lesson fixes that with setDirection.`,
    body: `<div class="iso-stage">${figure()}</div>`,
  });
  const plateEl = host.querySelector<HTMLElement>('.iso-plate')!;
  const group = (label: string) => {
    const g = document.createElement('div');
    g.className = 'figure-controls';
    g.setAttribute('role', 'group');
    g.setAttribute('aria-label', label);
    return g;
  };
  const presets = group('Drive the robot');
  const wheels = group('Set one motor');
  const makeButton = (parent: HTMLElement, label: string, onPress: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-quiet figure-button';
    b.textContent = label;
    b.addEventListener('click', () => { touched = true; onPress(); labelWheels(); announce(); go(); });
    parent.append(b);
    return b;
  };
  for (const name of Object.keys(PRESETS) as Preset[]) makeButton(presets, name, () => choose(name));
  const wheelButtons = new Map<Motor, HTMLButtonElement>();
  for (const motor of MECANUM_MOTORS) {
    wheelButtons.set(motor, makeButton(wheels, motor, () => {
      // A motor changed mid-run: carry on from where the robot is.
      const next = { ...(pending ?? powers), [motor]: nextPower((pending ?? powers)[motor]) };
      if (pending) pending = next; else powers = next;
    }));
  }
  plateEl.after(presets);
  presets.after(wheels);
  const live = document.createElement('p');
  live.className = 'visually-hidden';
  live.setAttribute('aria-live', 'polite');
  wheels.after(live);

  const robotEl = host.querySelector('[data-part="robot"]')!;
  const floorEl = host.querySelector('[data-part="floor"]')!;
  const readoutEl = host.querySelector('[data-readout]')!;
  const hintEl = host.querySelector<HTMLElement>('[data-corner="hint"]')!;
  const still = matchMedia('(prefers-reduced-motion: reduce)');

  let powers: Powers = { ...PRESETS.Stop };
  /** Powers waiting for the robot to be back in the middle. */
  let pending: Powers | null = null;
  let pose: Pose = { ...HOME };
  let homing = false, carry = 0, tourAt = 0, tourClock = 0;
  const spin = zeroBy(), rod = zeroBy();
  let touched = false, visible = false, frame = 0, last = 0;

  const shown = () => pending ?? powers;
  function labelWheels() {
    for (const [motor, b] of wheelButtons) {
      const p = String(shown()[motor]);
      b.textContent = `${motor} ${p}`;
      b.setAttribute('aria-label', `${motor} power ${p}. Press to change it.`);
    }
  }
  function announce() {
    const said = MECANUM_MOTORS.map((m) => `${m} ${shown()[m]}`).join(', ');
    live.textContent = `${said}. ${readoutOf(motionOf(shown())).replace(/ · /g, ', ')}`;
  }

  /** A move starts with the robot facing up the field, so it is turned back straight first. */
  function choose(name: Preset) {
    if (name === 'Stop') { powers = { ...PRESETS.Stop }; pending = null; homing = false; return; }
    pending = { ...PRESETS[name] };
    powers = { ...PRESETS.Stop };
    homing = true;
    tourClock = 0;
  }

  const draw = () => {
    floorEl.innerHTML = floorSvg(pose);
    robotEl.innerHTML = robotSvg({ pose, spin, rod });
    const text = homing ? 'lining up' : readoutOf(motionOf(powers));
    if (readoutEl.textContent !== text) {
      readoutEl.textContent = text;
      // On a narrow card the readout and the hint would run into each other: the readout wins,
      // since the buttons under the card say what to do.
      hintEl.style.visibility = 'visible';
      const a = hintEl.getBoundingClientRect(), b = readoutEl.getBoundingClientRect();
      if (a.width && a.right + 16 > b.left) hintEl.style.visibility = 'hidden';
    }
  };

  /** Reduced motion: no travel and no tour. The robot jumps to where one second of driving
      ends, with each rod already at its end. */
  function jump() {
    if (homing) { pose = { ...pose, headingDeg: 0 }; homing = false; }
    if (pending) { powers = pending; pending = null; }
    pose = drive(pose, powers, 1);
    for (const m of MECANUM_MOTORS) rod[m] = rodFor(m, powers);
    draw();
  }

  const nextInTour = () => { tourAt++; choose(TOUR[tourAt % TOUR.length]!); labelWheels(); };

  const tick = (now: number) => {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    if (still.matches) { frame = 0; jump(); return; }
    if (homing) {
      // Turned back to face up the field; the wheels stop and the rods recentre on the way.
      const ease = 1 - Math.exp(-dt / 0.16);
      pose = { ...pose, headingDeg: pose.headingDeg * (1 - ease) };
      for (const m of MECANUM_MOTORS) rod[m] *= 1 - ease;
      if (Math.abs(pose.headingDeg) < 0.5) {
        pose = { ...pose, headingDeg: 0 };
        homing = false;
        if (pending) { powers = pending; pending = null; }
        carry = 0;
      }
    } else {
      // Fixed 20 ms steps, like the simulator, so the robot travels exactly as far.
      const m = motionOf(powers);
      carry += dt;
      for (let i = 0; i < 4 && carry >= TICK_MS / 1000; i++) {
        pose = stepPose(pose, m, TICK_MS / 1000);
        carry -= TICK_MS / 1000;
      }
      carry = Math.min(carry, TICK_MS / 1000);
      for (const motor of MECANUM_MOTORS) {
        spin[motor] += (wheelCmS(motor, powers[motor]) / WHEEL_R) * dt;
        rod[motor] += (rodFor(motor, powers) - rod[motor]) * (1 - Math.exp(-dt / 0.12));
      }
      // The idle tour: each move for three seconds, then the next.
      tourClock += dt;
      if (!touched && tourClock > TOUR_EACH_S) nextInTour();
    }
    draw();
    const moving = homing || MECANUM_MOTORS.some((m) => powers[m] !== 0);
    frame = visible && (moving || !touched) ? requestAnimationFrame(tick) : 0;
  };
  const go = () => {
    if (still.matches) { jump(); return; }
    if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); }
  };

  const seen = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1]!.isIntersecting;
    if (visible) go(); else if (frame) { cancelAnimationFrame(frame); frame = 0; }
  }, { rootMargin: '120px 0px' });
  seen.observe(host);
  // The idle tour starts with Forward, unless motion is turned down.
  if (!still.matches) choose(TOUR[0]!);
  labelWheels();
  readoutEl.textContent = '';               // so the first draw fits the corners
  draw();

  return () => { seen.disconnect(); if (frame) cancelAnimationFrame(frame); frame = 0; };
}
