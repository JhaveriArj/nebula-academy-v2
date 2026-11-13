import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  programOf, advance, enter, isDone, isSleeping, cmAfter, READY, READ_MS, SLEEPS, TRACK_CM, FULL_POWER_CM_S,
  type RunState,
} from '../src/figures/program-reader.figure';
import { Simulation } from '../src/sim/simulation';

/* The program reader (src/figures/program-reader.figure.ts) shows the Tier 0 "break it" program
   running line by line. Its listing, its numbers and its robot must match the lesson and the
   simulator, since a kid reads them as the truth. */

const STARTER = readFileSync(join(__dirname, '..', 'content/tiers/0-launchpad/02-run-and-break-it/starter.java'), 'utf8').split('\n');

describe('program reader: same program as the lesson', () => {
  it('lists the lines that run, with the line numbers of starter.java', () => {
    for (const line of programOf(1000)) expect(STARTER[line.n - 1]!.trim(), `line ${line.n}`).toBe(line.code);
  });

  it('skips nothing that runs: every statement from waitForStart to the stop is listed', () => {
    // The telemetry lines after the stop are where the kid writes down the line numbers; they
    // move nothing, so the card ends when the robot stops.
    const stop = STARTER.findIndex((t) => t.trim() === 'rightDrive.setPower(0);') + 1;
    const body = STARTER.map((text, i) => ({ n: i + 1, text: text.trim() }))
      .filter(({ n, text }) => n >= 15 && n <= stop && text.endsWith(';'));
    expect(body.map((l) => l.n)).toEqual(programOf(1000).map((l) => l.n));
  });

  it('uses the simulator speed: full power on both wheels is 100 cm a second', () => {
    const sim = new Simulation({ robot: 'tank', start: { x: 182.88, y: 30.48, headingDeg: 0 } });
    sim.setMotorPower('leftDrive', 1);
    sim.setMotorPower('rightDrive', 1);
    sim.advance(1000);
    expect(sim.distanceTravelledCm).toBeCloseTo(FULL_POWER_CM_S, 1);
  });
});

describe('program reader: the model', () => {
  const program = programOf(1000);

  it('drives 100 cm with sleep(1000) and 200 cm with sleep(2000)', () => {
    expect(cmAfter(1000)).toBeCloseTo(100, 6);
    expect(cmAfter(2000)).toBeCloseTo(200, 6);
    expect(TRACK_CM).toBe(200);
    expect(Math.max(...SLEEPS.map(cmAfter))).toBeLessThanOrEqual(TRACK_CM);
  });

  it('runs top to bottom, one line at a time', () => {
    const seen: number[] = [];
    let s: RunState = READY;
    for (let i = 0; i < 2000 && !isDone(program, s); i++) {
      s = advance(program, s, 1000 / 60, true);
      if (seen[seen.length - 1] !== s.line) seen.push(s.line);
    }
    expect(seen).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('only sleep makes time pass, and the robot only moves while it sleeps', () => {
    let s: RunState = READY;
    for (let i = 0; i < 4; i++) s = advance(program, s, READ_MS, true);
    // Lines 15 to 24 have run and line 25 has just started: power on, clock still at 0.
    expect(program[s.line]!.n).toBe(25);
    expect(s.left).toBe(1);
    expect(s.right).toBe(1);
    expect(s.ms).toBe(0);
    expect(s.cm).toBe(0);
    s = advance(program, s, READ_MS + 400, true);
    expect(isSleeping(program, s)).toBe(true);
    expect(s.ms).toBeCloseTo(400, 6);
    expect(s.cm).toBeCloseTo(40, 6);
  });

  it('stops the robot when both powers go back to 0', () => {
    const s = advance(program, READY, Infinity, true);
    expect(isDone(program, s)).toBe(true);
    expect([s.left, s.right]).toEqual([0, 0]);
    expect(s.ms).toBe(1000);
    expect(advance(program, s, 5000, true)).toEqual(s);
  });

  it('Next line runs one line and waits; a sleep plays out and then waits', () => {
    let s = enter(program, READY);
    expect(advance(program, s, 10_000, false)).toEqual(s);
    for (let i = 0; i < 5; i++) s = enter(program, s);
    expect(program[s.line]!.ms).toBe(1000);
    s = advance(program, s, 10_000, false);
    expect(isSleeping(program, s)).toBe(false);
    expect(program[s.line]!.ms).toBe(1000);
    expect(s.cm).toBeCloseTo(100, 6);
  });

  it('always returns, even for endless or odd time steps', () => {
    for (const wall of [Infinity, 1e12, 1e-9, 0, -5, Number.NaN]) {
      for (const auto of [true, false]) {
        const s = advance(programOf(2000), READY, wall, auto);
        expect(Number.isFinite(s.cm)).toBe(true);
      }
    }
  });

  it('gives the same answer for long steps and short ones', () => {
    let fine: RunState = READY;
    for (let i = 0; i < 1000 && !isDone(program, fine); i++) fine = advance(program, fine, 1000 / 30, true);
    const coarse = advance(program, advance(program, READY, 2500, true), 2500, true);
    expect(fine.cm).toBeCloseTo(coarse.cm, 6);
    expect(fine.ms).toBe(coarse.ms);
  });
});
