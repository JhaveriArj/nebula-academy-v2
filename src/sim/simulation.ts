import {
  FIELD_CM,
  ROBOT_HALF,
  DEFAULT_START,
  startingElements,
  tileColorAt,
  TILE_RGB,
  type FieldElement,
} from './field';

/* A deterministic 2D sim. It steps at a fixed 20 ms and never reads wall-clock time,
   so the same Java source produces bit-identical robot state on a Chromebook and in CI.
   That is what lets tests use a 2 cm tolerance instead of a 20 cm one. */

export const TICK_MS = 20;

/** How many TICK_MS steps a live TeleOp owes after elapsedMs of real time, plus the leftover
    to carry into the next frame, so the robot runs at 50 Hz whatever the screen's refresh
    rate. At most `max` a frame, so a stalled tab does not try to catch up all at once. */
export function ticksDue(carryMs: number, elapsedMs: number, max = 5): { ticks: number; carryMs: number } {
  const total = carryMs + Math.max(0, elapsedMs);
  const ticks = Math.min(max, Math.floor(total / TICK_MS));
  return { ticks, carryMs: ticks === max ? 0 : total - ticks * TICK_MS };
}
/** System.out limits: lessons check a few lines; a runaway loop must not freeze the tab. */
export const MAX_LINES = 2_000;
export const MAX_LINE = 1_000;
export const TICKS_PER_REV = 537.7; // goBILDA 5203 312 rpm, the common FTC choice
export const WHEEL_CIRC_CM = 30.16; // 96 mm wheel
export const TICKS_PER_CM = TICKS_PER_REV / WHEEL_CIRC_CM;

export type RobotKind = 'tank' | 'mecanum';

/* Round, teachable numbers. A kid should be able to predict that half power for two
   seconds is about a metre. */
const TUNING = {
  tank: { maxWheelCmS: 100, trackCm: 50, strafeEff: 0 },
  mecanum: { maxWheelCmS: 120, trackCm: 40, strafeEff: 0.85 },
} as const;

export const TANK_MOTORS = ['leftDrive', 'rightDrive'] as const;
export const MECANUM_MOTORS = ['frontLeft', 'frontRight', 'backLeft', 'backRight'] as const;

export const ARM_MIN_TICKS = 0;
export const ARM_MAX_TICKS = 1200;
const ARM_TICKS_PER_S = 900;

export type RunMode =
  | 'RUN_WITHOUT_ENCODER'
  | 'RUN_USING_ENCODER'
  | 'RUN_TO_POSITION'
  | 'STOP_AND_RESET_ENCODER';

export type ZeroPowerBehavior = 'BRAKE' | 'FLOAT' | 'UNKNOWN';

export interface MotorState {
  power: number;
  /** setDirection(REVERSE) flips both the commanded power and the encoder. */
  reversed: boolean;
  /** True for the mecanum robot's right-hand motors, which are bolted on mirrored.

      This is why setDirection(REVERSE) exists on a real robot, and Tier 3 lesson 05
      is about it: without reversing the right side, four positive powers make the
      robot spin rather than drive. The tank robot used by Tiers 0-2 is deliberately
      left un-mirrored, because its drivetrain wiring is locked boilerplate there and
      is not the subject. See docs/ARCHITECTURE.md. */
  mountInverted: boolean;
  mode: RunMode;
  zeroPower: ZeroPowerBehavior;
  ticks: number;
  targetTicks: number;
  /** For DcMotorEx.setVelocity, in ticks per second. */
  velocity: number | null;
  /** Highest |power| ever commanded, for the motorPowerEverExceeded check. */
  peakAbsPower: number;
}

export interface ServoState {
  position: number;
  min: number;
  max: number;
  /** For CRServo. */
  continuousPower: number;
}

export interface GamepadState {
  left_stick_x: number;
  left_stick_y: number;
  right_stick_x: number;
  right_stick_y: number;
  left_trigger: number;
  right_trigger: number;
  a: boolean;
  b: boolean;
  x: boolean;
  y: boolean;
  left_bumper: boolean;
  right_bumper: boolean;
  dpad_up: boolean;
  dpad_down: boolean;
  dpad_left: boolean;
  dpad_right: boolean;
  start: boolean;
  back: boolean;
}

export function emptyGamepad(): GamepadState {
  return {
    left_stick_x: 0, left_stick_y: 0, right_stick_x: 0, right_stick_y: 0,
    left_trigger: 0, right_trigger: 0,
    a: false, b: false, x: false, y: false,
    left_bumper: false, right_bumper: false,
    dpad_up: false, dpad_down: false, dpad_left: false, dpad_right: false,
    start: false, back: false,
  };
}

export interface RobotPose {
  x: number;
  y: number;
  /** Degrees, 0 = facing +y, counter-clockwise positive, matching IMU yaw. */
  headingDeg: number;
}

export interface SimOptions {
  robot?: RobotKind;
  start?: RobotPose;
  /** Elements can be left out for lessons that do not need them. */
  withElements?: boolean;
}

export interface TelemetryLine {
  key: string;
  value: string;
}

export class Simulation {
  readonly kind: RobotKind;
  readonly motors = new Map<string, MotorState>();
  readonly servos = new Map<string, ServoState>();
  elements: FieldElement[];

  pose: RobotPose;
  /** Sim time in ms. Backs ElapsedTime and sleep(); never Date.now(). */
  timeMs = 0;
  /** Path length travelled, for robotMovedAtLeastCm. */
  distanceTravelledCm = 0;
  /** Net heading change, signed, for robotHeadingWithin on a turn. */
  headingChangeDeg = 0;

  /** The imu's zero point; resetYaw() moves it to the current heading. */
  private yawOffsetDeg = 0;

  gamepad1 = emptyGamepad();
  gamepad2 = emptyGamepad();

  /** System.out lines. */
  output: string[] = [];
  private droppedLines = 0;
  /** Current Driver Station panel contents, replaced on each update(). */
  telemetry: TelemetryLine[] = [];
  /** Every key ever shown, for telemetryHasKey. */
  telemetryKeysSeen = new Set<string>();
  /** Everything telemetry has ever displayed, for outputContains over telemetry. */
  telemetryLog: string[] = [];

  /** Breadcrumb trail for drawing the route behind the robot. */
  trail: { x: number; y: number }[] = [];

  readonly startPose: RobotPose;

  constructor(opts: SimOptions = {}) {
    this.kind = opts.robot ?? 'mecanum';
    this.startPose = { ...(opts.start ?? DEFAULT_START) };
    this.pose = { ...this.startPose };
    this.elements = opts.withElements === false ? [] : startingElements();

    const names = this.kind === 'tank' ? TANK_MOTORS : MECANUM_MOTORS;
    for (const n of names) {
      this.motors.set(n, newMotor(this.kind === 'mecanum' && (n === 'frontRight' || n === 'backRight')));
    }
    this.motors.set('armMotor', newMotor());
    this.servos.set('clawServo', { position: 0, min: 0, max: 1, continuousPower: 0 });
    this.trail.push({ x: this.pose.x, y: this.pose.y });
  }

  /* ------------------------------------------------------------ hardware map */

  motor(name: string): MotorState | undefined {
    return this.motors.get(name);
  }

  servo(name: string): ServoState | undefined {
    return this.servos.get(name);
  }

  /** The names a lesson may ask for, fixed across all tiers by CLAUDE.md. */
  knownMotors(): string[] {
    return [...this.motors.keys()];
  }

  setMotorPower(name: string, power: number): void {
    const m = this.motors.get(name);
    if (!m) return;
    const clamped = Math.max(-1, Math.min(1, power));
    m.power = clamped;
    m.velocity = null;
    m.peakAbsPower = Math.max(m.peakAbsPower, Math.abs(clamped));
  }

  setMotorVelocity(name: string, ticksPerSecond: number): void {
    const m = this.motors.get(name);
    if (!m) return;
    m.velocity = ticksPerSecond;
    const asPower = ticksPerSecond / (TICKS_PER_CM * this.tuning.maxWheelCmS);
    m.power = Math.max(-1, Math.min(1, asPower));
    m.peakAbsPower = Math.max(m.peakAbsPower, Math.abs(m.power));
  }

  setMotorMode(name: string, mode: RunMode): void {
    const m = this.motors.get(name);
    if (!m) return;
    if (mode === 'STOP_AND_RESET_ENCODER') {
      m.ticks = 0;
      m.power = 0;
      m.mode = 'RUN_USING_ENCODER';
      return;
    }
    m.mode = mode;
  }

  setServoPosition(name: string, position: number): void {
    const s = this.servos.get(name);
    if (!s) return;
    s.position = Math.max(0, Math.min(1, position));
  }

  setCRServoPower(name: string, power: number): void {
    const s = this.servos.get(name);
    if (!s) return;
    s.continuousPower = Math.max(-1, Math.min(1, power));
  }

  private get tuning() {
    return TUNING[this.kind];
  }

  /* --------------------------------------------------------------- sensors */

  /** IMU yaw in degrees, counter-clockwise positive, relative to the last resetYaw. */
  yawDeg(): number {
    return normalizeDeg(this.pose.headingDeg - this.yawOffsetDeg);
  }

  resetYaw(): void {
    this.yawOffsetDeg = this.pose.headingDeg;
  }

  /** Forward-facing distance sensor, measured from the front face. Capped like a 2M sensor. */
  distanceCm(): number {
    const MAX = 200;
    const rad = toRad(this.pose.headingDeg);
    const fx = -Math.sin(rad);
    const fy = Math.cos(rad);
    const ox = this.pose.x + fx * ROBOT_HALF;
    const oy = this.pose.y + fy * ROBOT_HALF;

    let best = MAX;
    // Walls.
    for (const [nx, ny, wall] of [
      [1, 0, FIELD_CM],
      [-1, 0, 0],
      [0, 1, FIELD_CM],
      [0, -1, 0],
    ] as const) {
      const denom = fx * nx + fy * ny;
      if (denom <= 1e-9) continue;
      const t = nx !== 0 ? (wall - ox) / fx : (wall - oy) / fy;
      if (t > 0 && t < best) best = t;
    }
    // Elements, as circles.
    for (const e of this.elements) {
      const t = rayCircle(ox, oy, fx, fy, e.x, e.y, e.r);
      if (t !== null && t > 0 && t < best) best = t;
    }
    return Math.min(MAX, best);
  }

  /** Downward colour sensor at the robot centre. */
  colorAt(): { r: number; g: number; b: number; alpha: number } {
    const tile = tileColorAt(this.pose.x, this.pose.y);
    const rgb = TILE_RGB[tile];
    return { ...rgb, alpha: Math.round((rgb.r + rgb.g + rgb.b) / 3) };
  }

  tileUnderRobot(): string {
    return tileColorAt(this.pose.x, this.pose.y);
  }

  /* ----------------------------------------------------------------- output */

  print(text: string): void {
    const last = this.output.length - 1;
    if (last >= 0 && !this.output[last]!.endsWith('\n')) {
      // A print() in a loop grows one line forever; past MAX_LINE it keeps only its ending.
      const line = this.output[last]! + text;
      this.output[last] = line.length > MAX_LINE ? line.slice(0, MAX_LINE) + (line.endsWith('\n') ? '\n' : '') : line;
    } else {
      this.output.push(text.length > MAX_LINE ? text.slice(0, MAX_LINE) + (text.endsWith('\n') ? '\n' : '') : text);
    }
    // A println() in a runaway loop made 570,000 lines (19 MB) for the console; keep the newest.
    if (this.output.length > MAX_LINES) {
      this.droppedLines += this.output.length - MAX_LINES;
      this.output.splice(0, this.output.length - MAX_LINES);
    }
  }

  println(text: string): void {
    this.print(text + '\n');
  }

  /** The text of everything System.out has produced. */
  outputText(): string {
    if (this.droppedLines) return `(${this.droppedLines} older lines were dropped to keep the console small)\n` + this.output.join('');
    return this.output.join('');
  }

  addTelemetry(key: string, value: string): void {
    this.pendingTelemetry.push({ key, value });
    this.telemetryKeysSeen.add(key);
  }

  private pendingTelemetry: TelemetryLine[] = [];

  updateTelemetry(): void {
    this.telemetry = [...this.pendingTelemetry];
    for (const line of this.telemetry) {
      this.telemetryLog.push(line.key ? `${line.key} : ${line.value}` : line.value);
    }
    this.pendingTelemetry = [];
  }

  clearTelemetry(): void {
    this.pendingTelemetry = [];
  }

  /* ------------------------------------------------------------------ physics */

  /** One fixed 20 ms step. */
  step(): void {
    const dt = TICK_MS / 1000;
    const { maxWheelCmS, trackCm, strafeEff } = this.tuning;

    const wheel = (name: string): number => {
      const m = this.motors.get(name);
      if (!m) return 0;
      let p = m.power;
      if (m.mode === 'RUN_TO_POSITION') {
        const error = m.targetTicks - m.ticks;
        p = Math.abs(error) < 10 ? 0 : Math.sign(error) * Math.abs(m.power);
      }
      if (m.reversed) p = -p;
      if (m.mountInverted) p = -p;
      return p * maxWheelCmS;
    };

    let vForward = 0;
    let vStrafe = 0;
    let omega = 0;

    if (this.kind === 'tank') {
      const l = wheel('leftDrive');
      const r = wheel('rightDrive');
      vForward = (l + r) / 2;
      omega = (r - l) / trackCm; // rad/s, counter-clockwise positive
      this.accumulateTicks('leftDrive', l, dt);
      this.accumulateTicks('rightDrive', r, dt);
    } else {
      const fl = wheel('frontLeft');
      const fr = wheel('frontRight');
      const bl = wheel('backLeft');
      const br = wheel('backRight');
      // Inverse of the mecanum mixing taught in Tier 3 lesson 08:
      //   frontLeft = drive + strafe + turn   frontRight = drive - strafe - turn
      //   backLeft  = drive - strafe + turn   backRight  = drive + strafe - turn
      vForward = (fl + fr + bl + br) / 4;
      vStrafe = ((fl - fr - bl + br) / 4) * strafeEff;
      const turnCw = (fl - fr + bl - br) / 4;
      omega = -turnCw / trackCm;
      this.accumulateTicks('frontLeft', fl, dt);
      this.accumulateTicks('frontRight', fr, dt);
      this.accumulateTicks('backLeft', bl, dt);
      this.accumulateTicks('backRight', br, dt);
    }

    // Arm, with the encoder limits Tier 5 lesson 01 is about.
    const arm = this.motors.get('armMotor');
    if (arm) {
      let p = arm.power;
      if (arm.mode === 'RUN_TO_POSITION') {
        const error = arm.targetTicks - arm.ticks;
        p = Math.abs(error) < 10 ? 0 : Math.sign(error) * Math.abs(arm.power);
      }
      if (arm.reversed) p = -p;
      arm.ticks = clamp(arm.ticks + p * ARM_TICKS_PER_S * dt, ARM_MIN_TICKS, ARM_MAX_TICKS);
    }

    const beforeX = this.pose.x;
    const beforeY = this.pose.y;
    const beforeHeading = this.pose.headingDeg;

    // Integrate at the midpoint heading so a turn-and-drive arc is not biased.
    const halfTurn = (omega * dt * 180) / Math.PI / 2;
    const midRad = toRad(this.pose.headingDeg + halfTurn);
    const fx = -Math.sin(midRad);
    const fy = Math.cos(midRad);
    // Robot-relative +strafe is to the robot's right.
    const rx = Math.cos(midRad);
    const ry = Math.sin(midRad);

    this.pose.x += (fx * vForward + rx * vStrafe) * dt;
    this.pose.y += (fy * vForward + ry * vStrafe) * dt;
    this.pose.headingDeg = normalizeDeg(this.pose.headingDeg + (omega * dt * 180) / Math.PI);

    this.pushElements();
    this.clampToField();

    this.distanceTravelledCm += Math.hypot(this.pose.x - beforeX, this.pose.y - beforeY);
    this.headingChangeDeg += angleDelta(beforeHeading, this.pose.headingDeg);
    this.timeMs += TICK_MS;

    const tail = this.trail[this.trail.length - 1];
    if (!tail || Math.hypot(this.pose.x - tail.x, this.pose.y - tail.y) > 2) {
      this.trail.push({ x: this.pose.x, y: this.pose.y });
      if (this.trail.length > 2000) this.trail.shift();
    }
  }

  /** Advance by a duration, rounded up to whole ticks. */
  advance(ms: number): void {
    const ticks = Math.max(0, Math.round(ms / TICK_MS));
    for (let i = 0; i < ticks; i++) this.step();
  }

  private accumulateTicks(name: string, wheelCmS: number, dt: number): void {
    const m = this.motors.get(name);
    if (!m) return;
    const travelled = wheelCmS * dt;
    // The encoder counts in the motor's own frame, so both the REVERSE flag and the
    // mirrored mounting have to be undone to get back to what the motor itself turned.
    const toMotorFrame = (m.reversed ? -1 : 1) * (m.mountInverted ? -1 : 1);
    m.ticks += travelled * TICKS_PER_CM * toMotorFrame;
  }

  isBusy(name: string): boolean {
    const m = this.motors.get(name);
    if (!m || m.mode !== 'RUN_TO_POSITION') return false;
    return Math.abs(m.targetTicks - m.ticks) >= 10;
  }

  private clampToField(): void {
    this.pose.x = clamp(this.pose.x, ROBOT_HALF, FIELD_CM - ROBOT_HALF);
    this.pose.y = clamp(this.pose.y, ROBOT_HALF, FIELD_CM - ROBOT_HALF);
  }

  /** Elements are pushable, so a kid who drives into one sees it move. */
  private pushElements(): void {
    for (const e of this.elements) {
      const dx = e.x - this.pose.x;
      const dy = e.y - this.pose.y;
      const reach = ROBOT_HALF + e.r;
      if (Math.abs(dx) > reach || Math.abs(dy) > reach) continue;
      const overlapX = reach - Math.abs(dx);
      const overlapY = reach - Math.abs(dy);
      if (overlapX <= 0 || overlapY <= 0) continue;
      if (overlapX < overlapY) e.x += Math.sign(dx || 1) * overlapX;
      else e.y += Math.sign(dy || 1) * overlapY;
      e.x = clamp(e.x, e.r, FIELD_CM - e.r);
      e.y = clamp(e.y, e.r, FIELD_CM - e.r);
    }
  }

  /** A plain snapshot, for tests, the telemetry panel and watch.json playback. */
  snapshot() {
    return {
      kind: this.kind,
      pose: { ...this.pose },
      timeMs: this.timeMs,
      distanceTravelledCm: this.distanceTravelledCm,
      headingChangeDeg: this.headingChangeDeg,
      yawDeg: this.yawDeg(),
      distanceCm: this.distanceCm(),
      tile: this.tileUnderRobot(),
      motors: Object.fromEntries(
        [...this.motors].map(([n, m]) => [
          n,
          {
            power: m.power,
            ticks: Math.round(m.ticks),
            mode: m.mode,
            reversed: m.reversed,
            peakAbsPower: m.peakAbsPower,
          },
        ]),
      ),
      servos: Object.fromEntries([...this.servos].map(([n, s]) => [n, s.position])),
      elements: this.elements.map((e) => ({ ...e })),
      telemetry: this.telemetry.map((t) => ({ ...t })),
      trail: this.trail.map((p) => ({ ...p })),
      output: this.outputText(),
    };
  }
}

export type SimSnapshot = ReturnType<Simulation['snapshot']>;

function newMotor(mountInverted = false): MotorState {
  return {
    power: 0,
    reversed: false,
    mountInverted,
    mode: 'RUN_WITHOUT_ENCODER',
    zeroPower: 'BRAKE',
    ticks: 0,
    targetTicks: 0,
    velocity: null,
    peakAbsPower: 0,
  };
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Keeps an angle in (-180, 180], as the FTC IMU reports it. */
export function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

/** Signed shortest change from a to b. */
export function angleDelta(a: number, b: number): number {
  return normalizeDeg(b - a);
}

function rayCircle(
  ox: number, oy: number, dx: number, dy: number,
  cx: number, cy: number, r: number,
): number | null {
  const fx = ox - cx;
  const fy = oy - cy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  const disc = b * b - 4 * c;
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  const t1 = (-b - s) / 2;
  const t2 = (-b + s) / 2;
  if (t1 > 0) return t1;
  if (t2 > 0) return t2;
  return null;
}
