import { describe, it, expect } from 'vitest';
import {
  motionOf, stepPose, drive, wheelCmS, readoutOf, turnDegS, nextPower,
  PRESETS, POWER, MOUNT_INVERTED, type Powers, type Pose,
} from '../src/figures/mecanum-strafe.figure';
import { Simulation, MECANUM_MOTORS, TICK_MS } from '../src/sim/simulation';
import { FIELD_CM } from '../src/sim/field';

/* The mecanum figure's readout and motion are what a kid compares with the simulator, so they
   have to be the simulator's own numbers: run both side by side and compare. */

const MIDDLE = { x: FIELD_CM / 2, y: FIELD_CM / 2, headingDeg: 0 };

/** Runs the real simulator for some ticks from the middle of the field. */
function simRun(p: Powers, ticks: number) {
  const sim = new Simulation({ robot: 'mecanum', start: MIDDLE, withElements: false });
  for (const m of MECANUM_MOTORS) sim.setMotorPower(m, p[m]);
  for (let i = 0; i < ticks; i++) sim.step();
  return { x: sim.pose.x - MIDDLE.x, y: sim.pose.y - MIDDLE.y, headingDeg: sim.pose.headingDeg };
}

function expectMotion(m: { forward: number; strafe: number; omega: number }, forward: number, strafe: number, omega: number) {
  expect(m.forward).toBeCloseTo(forward, 9);
  expect(m.strafe).toBeCloseTo(strafe, 9);
  expect(m.omega).toBeCloseTo(omega, 9);
}

const figRun = (p: Powers, ticks: number): Pose => drive({ x: 0, y: 0, headingDeg: 0 }, p, (ticks * TICK_MS) / 1000);

const cases: Record<string, Powers> = {
  ...PRESETS,
  'frontLeft alone': { frontLeft: 0.5, frontRight: 0, backLeft: 0, backRight: 0 },
  'frontLeft and backRight': { frontLeft: 0.5, frontRight: 0, backLeft: 0, backRight: 0.5 },
  'all four +0.5': { frontLeft: 0.5, frontRight: 0.5, backLeft: 0.5, backRight: 0.5 },
  'mixed': { frontLeft: -0.5, frontRight: 0.5, backLeft: 0, backRight: 0.5 },
};

describe('mecanum strafe figure', () => {
  it('moves the robot exactly as the simulator does, for every button and more', () => {
    for (const [name, p] of Object.entries(cases)) {
      const ticks = 25; // half a second: never reaches a wall on the field or on the figure's square
      const sim = simRun(p, ticks);
      const fig = figRun(p, ticks);
      expect(fig.x, `${name} x`).toBeCloseTo(sim.x, 6);
      expect(fig.y, `${name} y`).toBeCloseTo(sim.y, 6);
      expect(fig.headingDeg, `${name} heading`).toBeCloseTo(sim.headingDeg, 6);
    }
  });

  it('mirrors the right-hand motors like the simulator does', () => {
    const sim = new Simulation({ robot: 'mecanum' });
    for (const m of MECANUM_MOTORS) expect(MOUNT_INVERTED.includes(m), m).toBe(sim.motor(m)!.mountInverted);
    expect(wheelCmS('frontRight', 0.5)).toBe(-60);
    expect(wheelCmS('frontLeft', 0.5)).toBe(60);
  });

  it('drives forwards at 60 cm/s and slides at 85 percent of that', () => {
    expectMotion(motionOf(PRESETS.Forward), 60, 0, 0);
    const right = motionOf(PRESETS['Strafe right']);
    expect(right.forward).toBeCloseTo(0, 9);
    expect(right.strafe).toBeCloseTo(51, 9);
    expect(right.omega).toBeCloseTo(0, 9);
    expect(motionOf(PRESETS['Strafe left']).strafe).toBeCloseTo(-51, 9);
    expect(turnDegS(motionOf(PRESETS.Turn))).toBeCloseTo(-85.94, 1); // clockwise: a right turn
    expectMotion(motionOf(PRESETS.Stop), 0, 0, 0);
  });

  it('spins, as the next lesson shows, when all four get +0.5 with nothing reversed', () => {
    expect(PRESETS.Turn).toEqual({ frontLeft: POWER, frontRight: POWER, backLeft: POWER, backRight: POWER });
    expect(PRESETS.Forward.frontRight).toBe(-POWER);
    expect(PRESETS.Forward.backRight).toBe(-POWER);
  });

  it('takes a step the same size as one simulator tick', () => {
    const one = stepPose({ x: 0, y: 0, headingDeg: 0 }, motionOf(PRESETS.Forward), TICK_MS / 1000);
    expect(one.y).toBeCloseTo(1.2, 9); // 60 cm/s for 20 ms
    expect(one.x).toBeCloseTo(0, 9);
  });

  it('always finishes a drive, however long it is asked to run', () => {
    expect(drive({ x: 0, y: 0, headingDeg: 0 }, PRESETS.Turn, 1e9).x).toBeCloseTo(0, 9);
    expect(drive({ x: 1, y: 2, headingDeg: 3 }, PRESETS.Forward, -1)).toEqual({ x: 1, y: 2, headingDeg: 3 });
  });

  it('reads out in the simulator units', () => {
    expect(readoutOf(motionOf(PRESETS.Forward))).toBe('fwd 60 · right 0 cm/s · turn 0°/s');
    expect(readoutOf(motionOf(PRESETS['Strafe left']))).toBe('fwd 0 · left 51 cm/s · turn 0°/s');
    expect(readoutOf(motionOf(PRESETS.Turn))).toBe('fwd 0 · right 0 cm/s · turn right 86°/s');
  });

  it('steps a motor button through 0.5, -0.5 and 0', () => {
    expect(nextPower(0)).toBe(0.5);
    expect(nextPower(0.5)).toBe(-0.5);
    expect(nextPower(-0.5)).toBe(0);
  });
});
