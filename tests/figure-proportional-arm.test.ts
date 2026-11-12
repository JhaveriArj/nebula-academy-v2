import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  powerFor, stepArm, settle, isSettled, errorOf, startState, stepKp, ticksOf,
  MAX_DEG_PER_S, TICKS_PER_DEG, MAX_POWER, MIN_POWER, CLOSE_ENOUGH, DEFAULT_KP, KP_STEPS, TARGETS, SWING_DEG,
  type ArmState,
} from '../src/figures/proportional-arm.figure';
import { ARM_MAX_TICKS, ARM_MIN_TICKS, ARM_TICKS_PER_S } from '../src/sim/simulation';

/* The proportional arm (src/figures/proportional-arm.figure.ts): its readout is what a kid
   reads, so its rules must be the lesson's and its speed the simulator's, and its loop must
   always settle and always end, even with huge time steps. */

const LESSON = join(__dirname, '..', 'content/tiers/5-deep-space/03-proportional-control');
const solution = readFileSync(join(LESSON, 'solution.java'), 'utf8');

/** Runs at 60 frames a second for `seconds`, tracking the furthest the arm got and how often
    the error changed sign. */
function trace(s: ArmState, seconds: number) {
  let peak = s.angle, crossings = 0, sign = Math.sign(errorOf(s)), settledAt: number | null = null;
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    s = stepArm(s, 1 / 60);
    peak = Math.max(peak, s.angle);
    const now = Math.sign(errorOf(s));
    if (now !== 0 && now !== sign) { crossings++; sign = now; }
    if (settledAt === null && isSettled(s)) settledAt = (i + 1) / 60;
  }
  return { s, peak, crossings, settledAt };
}

describe('proportional arm: the numbers', () => {
  it('uses the lesson\'s kP, target, clamp, minimum and stop band', () => {
    expect(solution).toContain(`double kP = ${DEFAULT_KP};`);
    expect(solution).toContain(`double target = ${TARGETS.middle};`);
    expect(solution).toContain(`power > ${MAX_POWER}`);
    expect(solution).toContain(`power < ${MIN_POWER}`);
    expect(solution).toContain(`Math.abs(error) < ${CLOSE_ENOUGH.toFixed(1)}`);
  });

  it('offers the kP values the lesson\'s Boost asks for', () => {
    expect(KP_STEPS).toContain(0.05);
    expect(KP_STEPS).toContain(0.002);
    expect(KP_STEPS).toContain(DEFAULT_KP);
  });

  it('moves at the simulator armMotor\'s speed: 1200 ticks over the swing, 900 a second', () => {
    expect(ARM_MAX_TICKS - ARM_MIN_TICKS).toBe(1200);
    expect(ARM_TICKS_PER_S).toBe(900);
    expect(TICKS_PER_DEG).toBeCloseTo(1200 / 180, 6);
    expect(MAX_DEG_PER_S).toBeCloseTo(135, 6);
    expect(ticksOf(SWING_DEG)).toBe(ARM_MAX_TICKS);
  });
});

describe('proportional arm: powerFor follows the lesson\'s loop', () => {
  it('is error times kP in the middle', () => {
    expect(powerFor(20, 0.012)).toBeCloseTo(0.24, 9);
    expect(powerFor(-20, 0.012)).toBeCloseTo(-0.24, 9);
  });
  it('holds inside -0.4 and 0.4: 90 times 0.012 asks for more', () => {
    expect(powerFor(90, 0.012)).toBe(0.4);
    expect(powerFor(-90, 0.012)).toBe(-0.4);
  });
  it('never drops under 0.08 outside the stop band', () => {
    expect(powerFor(3, 0.012)).toBe(0.08);
    expect(powerFor(-3, 0.012)).toBe(-0.08);
  });
  it('gives no power within 1 degree', () => {
    expect(powerFor(0.99, 0.1)).toBe(0);
    expect(powerFor(-0.5, 0.1)).toBe(0);
    expect(powerFor(Number.NaN, 0.1)).toBe(0);
  });
});

describe('proportional arm: how it moves', () => {
  it('starts at 0 heading for 90 with kP 0.012', () => {
    expect(startState()).toEqual({ angle: 0, speed: 0, target: 90, kP: 0.012 });
  });

  it('eases in with the lesson\'s kP: lands within a degree and barely passes it', () => {
    const { s, peak, settledAt } = trace(startState(), 8);
    expect(isSettled(s)).toBe(true);
    expect(Math.abs(errorOf(s))).toBeLessThan(CLOSE_ENOUGH);
    expect(peak).toBeLessThan(92);
    expect(settledAt).not.toBeNull();
    expect(settledAt!).toBeLessThan(5);
  });

  it('pushes hard far away and eases off close in', () => {
    let s = startState();
    s = stepArm(s, 0.6);
    const early = Math.abs(powerFor(errorOf(s), s.kP));
    for (let i = 0; i < 600 && Math.abs(errorOf(s)) > 6; i++) s = stepArm(s, 1 / 60);
    const late = Math.abs(powerFor(errorOf(s), s.kP));
    expect(early).toBe(MAX_POWER);
    expect(late).toBeLessThan(early);
  });

  it('a big kP swings past and wobbles, but still settles', () => {
    const calm = trace(startState(), 10);
    const wild = trace({ ...startState(), kP: 0.1 }, 10);
    expect(wild.peak).toBeGreaterThan(calm.peak + 1.5);
    expect(wild.crossings).toBeGreaterThanOrEqual(2);
    expect(isSettled(wild.s)).toBe(true);
  });

  it('a small kP crawls', () => {
    const calm = trace(startState(), 15);
    const slow = trace({ ...startState(), kP: 0.002 }, 15);
    expect(slow.settledAt!).toBeGreaterThan(calm.settledAt! + 1.5);
  });

  it('stays on the scale: 0 to 180 degrees', () => {
    for (const kP of KP_STEPS) {
      for (const target of [0, 180]) {
        let s: ArmState = { angle: 90, speed: 0, target, kP };
        for (let i = 0; i < 600; i++) { s = stepArm(s, 1 / 60); expect(s.angle).toBeGreaterThanOrEqual(0); expect(s.angle).toBeLessThanOrEqual(180); }
      }
    }
  });
});

describe('proportional arm: always ends', () => {
  it('settles for every target and kP, from either end', () => {
    for (const kP of KP_STEPS) {
      for (const target of Object.values(TARGETS)) {
        for (const angle of [0, 180]) {
          const s = settle({ angle, speed: 0, target, kP });
          expect(isSettled(s), `kP ${kP} from ${angle} to ${target}`).toBe(true);
          expect(Math.abs(errorOf(s))).toBeLessThan(CLOSE_ENOUGH);
        }
      }
    }
  });

  it('is stable with huge or broken time steps, as under reduced motion or a stalled tab', () => {
    for (const kP of KP_STEPS) {
      for (const dt of [0.5, 1, 5, 1e6]) {
        let s: ArmState = { ...startState(), kP };
        for (let i = 0; i < 20 && !isSettled(s); i++) s = stepArm(s, dt);
        expect(Number.isFinite(s.angle)).toBe(true);
        expect(s.angle).toBeGreaterThanOrEqual(0);
        expect(s.angle).toBeLessThanOrEqual(180);
        expect(isSettled(s), `kP ${kP} dt ${dt}`).toBe(true);
      }
    }
    const s = startState();
    for (const dt of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) expect(stepArm(s, dt)).toEqual(s);
  });

  it('steps kP inside its list', () => {
    expect(stepKp(DEFAULT_KP, 1)).toBe(0.025);
    expect(stepKp(DEFAULT_KP, -1)).toBe(0.006);
    expect(stepKp(KP_STEPS[0], -1)).toBe(KP_STEPS[0]);
    expect(stepKp(KP_STEPS[KP_STEPS.length - 1]!, 1)).toBe(KP_STEPS[KP_STEPS.length - 1]);
  });
});
