import * as k from './kit/iso-kit';

/* Fig: the program reader. A punched card holds the Tier 0 program, one row for each line that
   runs, top line at the back. A reader head on a gantry steps down the card one row at a time,
   so the program runs top to bottom, one line at a time. The two dials on the console show the
   power each setPower line gives leftDrive and rightDrive, and a small tank robot on a lane
   drives with that power. The sleep row is a long slot: while sleep waits, the head's stylus
   slides along the slot and the robot keeps driving. A longer sleep is a longer slot and a
   longer drive.

   The program is the one in content/tiers/0-launchpad/02-run-and-break-it/starter.java (same
   lines, same line numbers; tests/figure-program-reader.test.ts reads the file to keep them in
   step). Full power drives the simulator's tank robot 100 cm every second (also tested), so
   sleep(1000) is 100 cm and sleep(2000) is 200 cm.

   Honest slowdown, said in the caption: a line like setPower takes far less than a millisecond,
   so the reader rests on each one for READ_MS of wall time while the program clock stands still.
   Only sleep makes the clock (and the robot) move. */

// ---------------------------------------------------------------- the model (pure, tested)

export const FULL_POWER_CM_S = 100; // the tank robot at power 1 (src/sim/simulation.ts)
export const READ_MS = 650; // wall time the reader rests on a line that takes no time
export const SLEEPS = [1000, 2000] as const;
export const TRACK_CM = (Math.max(...SLEEPS) / 1000) * FULL_POWER_CM_S; // 200 cm: the longest drive

export type Motor = 'leftDrive' | 'rightDrive';
export interface Line {
  /** Line number in the lesson's starter.java. */
  n: number;
  code: string;
  motor?: Motor;
  power?: number;
  /** Only sleep has this: how long the program waits. */
  ms?: number;
}

export function programOf(sleepMs: number): Line[] {
  return [
    { n: 15, code: 'waitForStart();' },
    { n: 17, code: 'int speed = 1;' },
    { n: 19, code: 'System.out.println("Starting up");' },
    { n: 24, code: 'leftDrive.setPower(speed);', motor: 'leftDrive', power: 1 },
    { n: 25, code: 'rightDrive.setPower(speed);', motor: 'rightDrive', power: 1 },
    { n: 26, code: `sleep(${sleepMs});`, ms: sleepMs },
    { n: 28, code: 'leftDrive.setPower(0);', motor: 'leftDrive', power: 0 },
    { n: 29, code: 'rightDrive.setPower(0);', motor: 'rightDrive', power: 0 },
  ];
}

export interface RunState {
  /** The line running now: -1 before the start, program.length once it has finished. */
  line: number;
  /** Time spent on this line: program time for sleep, reading time for any other line. */
  into: number;
  /** The program's own clock in ms. Only sleep moves it. */
  ms: number;
  cm: number;
  left: number;
  right: number;
}

export const READY: RunState = { line: -1, into: 0, ms: 0, cm: 0, left: 0, right: 0 };

export const isDone = (program: Line[], s: RunState) => s.line >= program.length;
export const isSleeping = (program: Line[], s: RunState) => {
  const ms = program[s.line]?.ms;
  return ms !== undefined && s.into < ms;
};

/** Moves to the next line and runs it. A setPower line takes effect at once. */
export function enter(program: Line[], s: RunState): RunState {
  const line = Math.min(program.length, s.line + 1);
  const next: RunState = { ...s, line, into: 0 };
  const code = program[line];
  if (code?.motor === 'leftDrive') next.left = code.power!;
  if (code?.motor === 'rightDrive') next.right = code.power!;
  return next;
}

/** Lets ms of program time pass with the powers as they are: the robot drives. */
function drive(s: RunState, ms: number): RunState {
  const speed = ((s.left + s.right) / 2) * FULL_POWER_CM_S;
  const cm = Math.max(0, Math.min(TRACK_CM, s.cm + (speed * ms) / 1000));
  return { ...s, cm, ms: s.ms + ms };
}

/** Advances by wallMs of real time. With auto (Run) the reader rests READ_MS on each line and
    moves on by itself; without it (Next line) it only lets a sleep that is running finish.
    Every pass of the loop either uses up the time or moves to a later line, and the count is
    capped as well, so even an endless step (reduced motion) always returns. */
export function advance(program: Line[], s: RunState, wallMs: number, auto: boolean): RunState {
  if (!(wallMs > 0)) return s;
  let left = wallMs;
  for (let guard = 0; guard < program.length * 3 + 3 && !isDone(program, s); guard++) {
    if (s.line < 0) {
      if (!auto) break;
      s = enter(program, s);
      continue;
    }
    const line = program[s.line]!;
    if (line.ms !== undefined && s.into < line.ms) {
      const take = Math.min(left, line.ms - s.into);
      s = { ...drive(s, take), into: s.into + take };
      left -= take;
      if (s.into < line.ms) break; // the wall time ran out in the middle of the sleep
      continue;
    }
    if (!auto) break;
    const rest = line.ms !== undefined ? 0 : READ_MS - s.into; // a finished sleep moves on at once
    if (left < rest) { s = { ...s, into: s.into + left }; break; }
    left -= rest;
    s = enter(program, s);
  }
  return s;
}

/** How far the whole program drives the robot. */
export const cmAfter = (sleepMs: number) => advance(programOf(sleepMs), READY, Infinity, true).cm;

// ---------------------------------------------------------------- the drawing

const W = 640, H = 350;
const PLATE = { x: -176, y: -74, w: 358, d: 148, r: 8 };
const PLATE_H = 12, FOOT_H = 5;
// The reader: a tray with the card in it, a rail either side, a bridge that rides the rails.
const TRAY = { x: -150, y: -62, w: 92, d: 124, r: 3 };
const CARD = { x: -144, y: -56, w: 80, d: 112, r: 2 };
const CARD_Z = 3, CARD_TOP = 3.8;
const ROWS = 8;
const ROW_GAP = 12.5;
const ROW0 = -43.75;
const rowY = (i: number) => ROW0 + i * ROW_GAP;
const HOLE_X = -134;           // every line's hole, and where the sleep slot starts
const SLOT_PER_MS = 0.03;      // sleep(2000) is a 60-unit slot
const RAIL_X = [-161, -55] as const;
const RAIL = { y: -66, d: 132, w: 6 };
const BAR_Z = 13, BAR_TOP = 17, BLOCK_TOP = 18;
const HEAD_Z = 9, HEAD_TOP = 19, KNOB_TOP = 22;
const PARK = [rowY(0) - 9, rowY(ROWS - 1) + 9] as const; // where the head waits before and after
// The lane and the robot.
const U = 0.7;                 // world units per centimetre on the lane
const X0 = -10;                // the lane's 0 cm
const TY = 14;                 // the lane's centre line
const LANE = { x: -34, y: TY - 17, w: 200, d: 34, r: 2 };
const STRIP = { x: X0 - 6, y: 46, w: TRACK_CM * U + 12, d: 9, r: 1 };
const WHEEL_R = 3.6, WHEEL_Z = 5.5, WHEEL_X = [-9, 9] as const;
// The console with the two power dials.
const CONSOLE = { x: -30, y: -64, w: 120, d: 36, r: 4 };
const CONSOLE_TOP = 9, DIAL_TOP = 13, DIAL_R = 13;
const DIALS: Record<Motor, k.Plane> = { leftDrive: [6, -46], rightDrive: [54, -46] };

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [HOLE_X, PARK[0] - 7, KNOB_TOP + 1],
    [RAIL_X[0], PARK[0] - 5, BLOCK_TOP],
    [CONSOLE.x + CONSOLE.w, CONSOLE.y, DIAL_TOP],
  ],
  W, H, { pad: 26, azimuth: 50 },
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
  // The ruler under the lane: 0 to 200 cm, a tick every 10 cm, a long one every 50.
  out.push(S(k.slabOf(STRIP, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }));
  const ticks = k.topTicks(X0, X0 + TRACK_CM * U, 10 * U, 5, STRIP.y + 0.8, 0.6, [2.2, 4.2], P);
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }));
  for (let cm = 0; cm <= TRACK_CM; cm += 100) {
    out.push(k.faceTextSvg(k.topMatrix([X0 + cm * U, STRIP.y + 7.6], 0.6, P, 'x'), String(cm), { size: 3, tone: 'lo', anchor: 'middle' }));
  }
  out.push(D([at([STRIP.x + 2, STRIP.y + 4.5, 0.6]), at([STRIP.x + STRIP.w - 2, STRIP.y + 4.5, 0.6])], { size: 0.45 }));
  return out.join('');
}

const needle = (power: number, [cx, cy]: k.Plane) => {
  // Power 0 points straight back; +1 points the way the robot drives (+x), -1 the other way.
  const a = power * (Math.PI / 2);
  return k.lineOnTop([cx - Math.sin(a) * 2.4, cy + Math.cos(a) * 2.4], [cx + Math.sin(a) * 9.4, cy - Math.cos(a) * 9.4], DIAL_TOP + 0.2, P);
};

function console_(): string {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(CONSOLE, 2), 0, 0.1, P)}" style="filter:blur(5px)"/>`];
  out.push(S(k.slabOf(CONSOLE, 0, CONSOLE_TOP, P, 6, 0.8), { tone: 'mid', inner: L(k.sideSeam(CONSOLE, 3, P, 6), { tone: 'faint' }) }));
  out.push(L(k.planOutline(k.insetPlan(CONSOLE, 3), CONSOLE_TOP, P, 6), { tone: 'faint' }));
  out.push(D(k.corners(CONSOLE, 4.5).map(([x, y]) => at([x, y, CONSOLE_TOP])), { size: 0.45 }));
  for (const motor of ['leftDrive', 'rightDrive'] as const) {
    const [cx, cy] = DIALS[motor];
    out.push(S(k.cylinder(cx, cy, DIAL_R, CONSOLE_TOP, DIAL_TOP - CONSOLE_TOP, P, 64, 0.6), { tone: 'mid' }));
    out.push(L(k.knurl(cx, cy, DIAL_R, CONSOLE_TOP + 0.8, DIAL_TOP - 1.4, 60, P, 0.3), { tone: 'lo' }));
    out.push(L(k.ring(cx, cy, DIAL_R - 1.6, DIAL_TOP, P, 64), { tone: 'lo' }));
    const t = k.radialTicks(cx, cy, DIAL_R - 2.2, 10, 5, DIAL_TOP, [1.4, 3], P, -Math.PI / 2, Math.PI);
    out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }));
    out.push(`<path data-part="needle-${motor}" class="iso-line" data-tone="hi" d="${needle(0, DIALS[motor])}" style="stroke-width:1.3"/>`);
    out.push(L(k.ring(cx, cy, 1.5, DIAL_TOP + 0.2, P, 16), { tone: 'hi' }));
    // Engraved L and R in front of each dial: the robot's left and right wheel.
    out.push(k.faceTextSvg(k.topMatrix([cx, cy + DIAL_R + 3.6], CONSOLE_TOP, P, 'x'), motor === 'leftDrive' ? 'L' : 'R', { size: 4, tone: 'lo', anchor: 'middle' }));
  }
  return out.join('');
}

const slotPath = (ms: number) => {
  const y = rowY(5);
  return k.planOutline({ x: HOLE_X - 2.2, y: y - 2.2, w: ms * SLOT_PER_MS + 4.4, d: 4.4, r: 2.2 }, CARD_TOP, P, 6);
};

function reader(sleepMs: number): string {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(TRAY, 2), 0, 0.1, P)}" style="filter:blur(5px)"/>`];
  out.push(S(k.slabOf(TRAY, 0, CARD_Z, P, 5, 0.5), { tone: 'mid' }));
  out.push(S(k.slabOf(CARD, CARD_Z, CARD_TOP - CARD_Z, P, 4), { tone: 'hi', crease: 'lo' }));
  // A faint rule between rows, edge to edge, like a printed card.
  out.push(L(Array.from({ length: ROWS - 1 }, (_, i) => k.lineOnTop([CARD.x, rowY(i) + ROW_GAP / 2], [CARD.x + CARD.w, rowY(i) + ROW_GAP / 2], CARD_TOP, P)).join(''), { tone: 'faint' }));
  // One punched hole for each line that runs at once; the sleep row's slot is drawn live.
  const holes = Array.from({ length: ROWS }, (_, i) => i).filter((i) => i !== 5).map((i) => k.ring(HOLE_X, rowY(i), 2.2, CARD_TOP, P, 18));
  out.push(L(holes.join(''), { tone: 'mid' }));
  out.push(`<path data-part="slot" class="iso-line" data-tone="mid" d="${slotPath(sleepMs)}"/>`);
  // The rails, and the far end stops (the near ones go in front of the bridge).
  for (const x of RAIL_X) {
    out.push(S(k.slabOf({ x, y: RAIL.y, w: RAIL.w, d: RAIL.d, r: 1 }, 0, 4, P, 3, 0.4), { tone: 'mid' }));
    out.push(L(k.lineOnTop([x + RAIL.w / 2, RAIL.y + 2], [x + RAIL.w / 2, RAIL.y + RAIL.d - 2], 4, P), { tone: 'faint' }));
  }
  out.push(stops(RAIL.y - 4));
  return out.join('');
}

function stops(y: number): string {
  return RAIL_X.map((x) =>
    S(k.slabOf({ x: x - 1, y, w: RAIL.w + 2, d: 4, r: 1 }, 0, 8, P, 3, 0.5), { tone: 'mid' }) +
    D([at([x + 1, y + 2, 8]), at([x + RAIL.w - 1, y + 2, 8])], { size: 0.45 })).join('');
}

/** The bridge, built over row y = 0 and moved along y. */
function bridge(): string {
  const out: string[] = [];
  const blocks = RAIL_X.map((x) => ({ x: x - 1, y: -5, w: RAIL.w + 2, d: 10, r: 1.5 }));
  out.push(S(k.slabOf(blocks[0]!, 4, BLOCK_TOP - 4, P, 3, 0.5), { tone: 'mid' }));
  out.push(S(k.slabOf({ x: RAIL_X[0] + RAIL.w + 1, y: -2.5, w: RAIL_X[1] - RAIL_X[0] - RAIL.w - 2, d: 5, r: 1 }, BAR_Z, BAR_TOP - BAR_Z, P, 3, 0.4), { tone: 'mid' }));
  out.push(S(k.slabOf(blocks[1]!, 4, BLOCK_TOP - 4, P, 3, 0.5), { tone: 'mid' }));
  for (const b of blocks) out.push(D([at([b.x + b.w / 2, b.y + 2.4, BLOCK_TOP]), at([b.x + b.w / 2, b.y + b.d - 2.4, BLOCK_TOP])], { size: 0.45 }));
  return out.join('');
}

/** The reader head, built at (0, 0) and moved along x on the bridge and along y with it. */
function head(): string {
  const plan = { x: -7, y: -7, w: 14, d: 14, r: 2 };
  return S(k.cylinder(0, 0, 1, CARD_TOP + 0.4, HEAD_Z - CARD_TOP - 0.4, P, 14), { tone: 'hi' }) +
    S(k.slabOf(plan, HEAD_Z, HEAD_TOP - HEAD_Z, P, 4, 0.6), { tone: 'hi', lit: true }) +
    L(k.planOutline(k.insetPlan(plan, 2.4), HEAD_TOP, P, 4), { tone: 'faint' }) +
    D(k.corners(plan, 2.6).map(([x, y]) => at([x, y, HEAD_TOP])), { size: 0.4, tone: 'lo' }) +
    S(k.cylinder(0, 0, 3, HEAD_TOP, KNOB_TOP - HEAD_TOP, P, 24), { tone: 'mid' }) +
    L(k.knurl(0, 0, 3, HEAD_TOP + 0.4, KNOB_TOP - 0.4, 22, P, 0.3), { tone: 'lo' });
}

function lane(): string {
  const out = [S(k.slabOf(LANE, 0, 1, P, 4), { tone: 'lo', crease: 'none' })];
  out.push(L(k.lineOnTop([LANE.x, TY], [LANE.x + LANE.w, TY], 1, P), { tone: 'faint' }));
  const wall = { x: LANE.x + LANE.w - 8, y: TY - 14, w: 6, d: 28, r: 1 };
  out.push(S(k.slabOf(wall, 1, 11, P, 3, 0.5), { tone: 'mid' }));
  out.push(D([at([wall.x + 3, wall.y + 3, 12]), at([wall.x + 3, wall.y + wall.d - 3, 12])], { size: 0.45 }));
  return out.join('');
}

const spokes = (cm: number) => {
  const turn = (cm * U) / WHEEL_R; // rolling without slipping
  const y = TY + 15;
  return WHEEL_X.flatMap((wx) => [0, 1, 2].map((i) => {
    const a = Math.PI / 2 - turn + (i * Math.PI * 2) / 3;
    return k.segment([wx + Math.cos(a) * 0.9, y, WHEEL_Z + Math.sin(a) * 0.9], [wx + Math.cos(a) * (WHEEL_R - 0.6), y, WHEEL_Z + Math.sin(a) * (WHEEL_R - 0.6)], P);
  })).join('');
};

/** The tank robot, built at x = 0 and moved along the lane. The far tread is leftDrive (the
    robot faces +x, so its left is the far side) and the near one is rightDrive. */
function robot(): string {
  const chassis = { x: -14, y: TY - 10, w: 28, d: 20, r: 2.5 };
  const pod = (y: number) => ({ x: -16, y, w: 32, d: 5, r: 2.4 });
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: -16, y: TY - 15, w: 32, d: 30, r: 4 }, 1, 0.1, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.slabOf(pod(TY - 15), 1, 9, P, 4, 0.4), { tone: 'mid' }));
  out.push(S(k.slabOf(chassis, 3, 9, P, 4, 0.6), { tone: 'hi' }));
  out.push(L(k.planOutline(k.insetPlan(chassis, 2.5), 12, P, 4), { tone: 'faint' }));
  out.push(D(k.corners(chassis, 2.6).map(([x, y]) => at([x, y, 12])), { size: 0.4, tone: 'lo' }));
  const hub = { x: -8, y: TY - 6, w: 12, d: 12, r: 1.5 };
  out.push(S(k.slabOf(hub, 12, 4, P, 3, 0.4), { tone: 'mid' }));
  out.push(L(k.planOutline(k.insetPlan(hub, 2), 16, P, 3), { tone: 'faint' }));
  out.push(S(k.slabOf(pod(TY + 10), 1, 9, P, 4, 0.4), { tone: 'mid' }));
  out.push(L(WHEEL_X.map((wx) => k.sideRing([wx, TY + 15, WHEEL_Z], WHEEL_R, 'y', P, 28)).join(''), { tone: 'lo' }));
  out.push(`<path data-part="spokes" class="iso-line" data-tone="mid" d="${spokes(0)}"/>`);
  out.push(D(WHEEL_X.map((wx) => at([wx, TY + 15, WHEEL_Z])), { size: 0.5, tone: 'hi' }));
  // The pointer that reads the ruler.
  out.push(S(k.slabOf({ x: -1, y: TY + 15, w: 2, d: STRIP.y + 1 - (TY + 15), r: 0.5 }, 2, 1, P, 2), { tone: 'hi', lit: true }));
  return out.join('');
}

function figure(sleepMs: number): string {
  return k.figureSvg({
    width: W,
    height: H,
    label: 'A program reader on a plate. A punched card has one row for each line of the program, top line at the back. A reader head on a sliding bridge steps down the rows one at a time. The sleep row is a long slot. Two dials show the power of leftDrive and rightDrive, and a small robot drives along a lane with a 200 centimetre ruler.',
    body: [
      plate(),
      console_(),
      reader(sleepMs),
      `<g data-part="bridge" transform="${k.translateAlong(P, [0, PARK[0], 0])}">${bridge()}</g>`,
      `<g data-part="head" transform="${k.translateAlong(P, [HOLE_X, PARK[0], 0])}">${head()}</g>`,
      stops(RAIL.y + RAIL.d),
      lane(),
      `<g data-part="robot" transform="${k.translateAlong(P, [X0, 0, 0])}">${robot()}</g>`,
    ],
  });
}

// ---------------------------------------------------------------- live

const secs = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

export function mount(host: HTMLElement): () => void {
  let sleepMs: number = SLEEPS[0];
  let program = programOf(sleepMs);
  const readout = (s: RunState) => {
    const where = s.line < 0 ? 'ready' : isDone(program, s) ? 'done' : `line ${program[s.line]!.n}`;
    return `${where} · ${secs(s.ms)} · ${Math.round(s.cm)} cm`;
  };
  host.innerHTML = k.plateHtml({
    fig: 'Fig 2',
    title: 'Program reader',
    hint: 'Press a button',
    readout: readout(READY),
    keys: [
      { mark: 'lit', label: 'The reader head and the robot: what moves' },
      { mark: 'raised', label: 'The card: one row for each line, top line at the back. The long slot is sleep' },
      { mark: 'dim', label: 'The dials: power for leftDrive (left dial) and rightDrive (right dial)' },
    ],
    caption: `The reader rests on each line so you can watch it. On a real robot a line like setPower takes far less than a millisecond, so only sleep makes time pass, and while it waits the wheels keep the power they were given. Full power drives this robot ${FULL_POWER_CM_S} cm every second, so sleep(1000) drives it ${cmAfter(1000)} cm and sleep(2000) drives it ${cmAfter(2000)} cm.`,
    body: `<div class="iso-stage" role="img" aria-label="Program reader">${figure(sleepMs)}</div>`,
  });
  const plateEl = host.querySelector<HTMLElement>('.iso-plate')!;

  const controls = document.createElement('div');
  controls.className = 'figure-controls';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Run the program');
  const button = (label: string, onPress: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-quiet figure-button';
    b.textContent = label;
    b.addEventListener('click', () => { touched = true; onPress(); run(); });
    controls.append(b);
    return b;
  };
  button('Run', () => {
    if (state.line < 0 || isDone(program, state)) state = READY;
    auto = true;
  });
  const nextButton = button('Next line', () => {
    auto = false;
    if (isSleeping(program, state)) return; // a sleep has to finish before the next line
    if (isDone(program, state)) state = READY;
    state = enter(program, state);
  });
  button('Reset', () => { auto = false; state = READY; });
  const sleepButtons = SLEEPS.map((ms) => button(`sleep(${ms})`, () => setSleep(ms)));
  plateEl.after(controls);

  // The program itself, as text: the line running now is marked, so a kid can match card row
  // to line of code.
  const listing = document.createElement('ol');
  listing.className = 'figure-code';
  listing.setAttribute('aria-label', 'The program, one line for each card row');
  const items = program.map(() => {
    const li = document.createElement('li');
    const n = document.createElement('span');
    n.className = 'figure-code-n';
    const code = document.createElement('code');
    li.append(n, code);
    listing.append(li);
    return { li, n, code };
  });
  controls.after(listing);
  const live = document.createElement('p');
  live.className = 'visually-hidden';
  live.setAttribute('aria-live', 'polite');
  listing.after(live);

  const svg = host.querySelector('svg')!;
  const parts = {
    bridge: svg.querySelector('[data-part="bridge"]')!,
    head: svg.querySelector('[data-part="head"]')!,
    slot: svg.querySelector('[data-part="slot"]')!,
    robot: svg.querySelector('[data-part="robot"]')!,
    spokes: svg.querySelector('[data-part="spokes"]')!,
    leftDrive: svg.querySelector('[data-part="needle-leftDrive"]')!,
    rightDrive: svg.querySelector('[data-part="needle-rightDrive"]')!,
  };
  const readoutEl = host.querySelector('[data-readout]')!;

  const still = matchMedia('(prefers-reduced-motion: reduce)');
  let state: RunState = READY;
  let auto = false, touched = false, visible = false, frame = 0, last = 0, doneFor = 0;
  // Eased positions: the bridge's row, the head along the bridge, and the two needles.
  let row: number = PARK[0], hx = HOLE_X, needleL = 0, needleR = 0;
  let shownLine = -2;

  const listingText = () => program.forEach((line, i) => {
    items[i]!.n.textContent = String(line.n);
    items[i]!.code.textContent = line.code;
  });
  function setSleep(ms: number) {
    sleepMs = ms;
    program = programOf(ms);
    auto = false;
    state = READY;
    parts.slot.setAttribute('d', slotPath(ms));
    sleepButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(SLEEPS[i] === ms)));
    listingText();
  }
  setSleep(sleepMs);

  const targets = () => {
    const done = isDone(program, state);
    const rowAt = state.line < 0 ? PARK[0] : done ? PARK[1] : rowY(state.line);
    const line = program[state.line];
    const slide = line?.ms !== undefined ? Math.min(1, state.into / line.ms) * line.ms * SLOT_PER_MS : 0;
    return { rowAt, headAt: HOLE_X + slide, sliding: isSleeping(program, state) };
  };

  const ease = (from: number, to: number, dt: number, tau: number) => {
    const next = from + (to - from) * (1 - Math.exp(-dt / tau));
    return Math.abs(to - next) < 0.01 ? to : next;
  };

  const draw = () => {
    parts.bridge.setAttribute('transform', k.translateAlong(P, [0, row, 0]));
    parts.head.setAttribute('transform', k.translateAlong(P, [hx, row, 0]));
    parts.robot.setAttribute('transform', k.translateAlong(P, [X0 + state.cm * U, 0, 0]));
    parts.spokes.setAttribute('d', spokes(state.cm));
    parts.leftDrive.setAttribute('d', needle(needleL, DIALS.leftDrive));
    parts.rightDrive.setAttribute('d', needle(needleR, DIALS.rightDrive));
    const text = readout(state);
    if (readoutEl.textContent !== text) readoutEl.textContent = text;
    if (shownLine !== state.line) {
      shownLine = state.line;
      items.forEach(({ li }, i) => {
        if (i === state.line) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      });
      nextButton.setAttribute('aria-disabled', String(isSleeping(program, state)));
      if (touched) {
        const line = program[state.line];
        live.textContent = state.line < 0 ? 'Ready at the top.'
          : line ? `Line ${line.n}: ${line.code}`
          : `Done. The robot drove ${Math.round(state.cm)} centimetres in ${(state.ms / 1000).toFixed(1)} seconds.`;
      }
    }
    if (!isSleeping(program, state) && nextButton.getAttribute('aria-disabled') === 'true') nextButton.setAttribute('aria-disabled', 'false');
  };

  // The idle tour, until someone presses a button: run with sleep(1000), rest, then sleep(2000).
  const tour = (dt: number) => {
    if (state.line < 0) { auto = true; return; }
    if (!isDone(program, state)) return;
    doneFor += dt;
    if (doneFor > 2.6) { doneFor = 0; setSleep(sleepMs === SLEEPS[0] ? SLEEPS[1] : SLEEPS[0]); auto = true; }
  };

  const tick = (now: number) => {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    const calm = still.matches;
    if (!touched && !calm) tour(dt);
    // Reduced motion: a run, or a sleep, jumps straight to where it ends.
    state = advance(program, state, calm ? Infinity : dt * 1000, auto);
    if (isDone(program, state)) auto = false;
    const t = targets();
    if (calm) {
      row = t.rowAt; hx = t.headAt; needleL = state.left; needleR = state.right;
    } else {
      row = ease(row, t.rowAt, dt, 0.14);
      hx = t.sliding ? t.headAt : ease(hx, t.headAt, dt, 0.14);
      needleL = ease(needleL, state.left, dt, 0.12);
      needleR = ease(needleR, state.right, dt, 0.12);
    }
    draw();
    const settled = row === t.rowAt && hx === t.headAt && needleL === state.left && needleR === state.right;
    const busy = auto || isSleeping(program, state) || !settled;
    frame = visible && (busy || (!touched && !calm)) ? requestAnimationFrame(tick) : 0;
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
