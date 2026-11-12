import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  START, LIMIT, LIMITS, DRIVE_MS, TURN_MS, PASS_SECONDS, MAX_PASSES, CORNERS, SQUARE,
  startLoop, nextPass, runLoop, checkHolds, isDone, passesFor, shownToward, readoutOf, robotPose, pointerAt,
  type LoopState,
} from '../src/figures/loop-counter.figure';

/* The loop counter figure (src/figures/loop-counter.figure.ts) is a picture of the for loop in
   Tier 1's loops lesson, so its model has to count exactly the way Java does, with the lesson's
   own numbers. */

const LESSON = join(__dirname, '..', 'content/tiers/1-orbit/07-loops');

describe('loop counter: the lesson numbers', () => {
  it('matches the loop and timings in the lesson solution', () => {
    const solution = readFileSync(join(LESSON, 'solution.java'), 'utf8');
    expect(solution).toContain(`for (int side = ${START}; side <= ${LIMIT}; side++)`);
    expect(solution).toContain(`sleep(${DRIVE_MS});`);
    expect(solution).toContain(`sleep(${TURN_MS});`);
    expect(PASS_SECONDS).toBeCloseTo(1.785, 3);
  });

  it('is embedded in the lesson', () => {
    expect(readFileSync(join(LESSON, 'lesson.md'), 'utf8')).toMatch(/^:::figure loop-counter$/m);
  });
});

describe('loop counter: the model counts like Java', () => {
  const javaPasses = (limit: number) => { let n = 0; for (let side = 1; side <= limit; side++) n++; return n; };

  it('runs the body four times for side <= 4 and leaves side at 5', () => {
    const end = runLoop(startLoop(4));
    expect(end).toEqual({ side: 5, limit: 4, passes: 4 });
    expect(checkHolds(end)).toBe(false);
    expect(isDone(end)).toBe(true);
  });

  it('agrees with a real for loop for every limit button, and for 0', () => {
    for (const limit of [...LIMITS, 0, 1]) {
      expect(runLoop(startLoop(limit)).passes).toBe(javaPasses(limit));
      expect(passesFor(limit)).toBe(javaPasses(limit));
    }
  });

  it('checks before every pass and steps after it', () => {
    let s: LoopState = startLoop(3);
    const seen: Array<[number, boolean]> = [];
    while (!isDone(s)) { seen.push([s.side, checkHolds(s)]); s = nextPass(s); }
    seen.push([s.side, checkHolds(s)]);
    expect(seen).toEqual([[1, true], [2, true], [3, true], [4, false]]);
  });

  it('does nothing on a pass after the loop is over', () => {
    const end = runLoop(startLoop(4));
    expect(nextPass(end)).toBe(end);
  });

  it('always stops, even with a limit that would take forever', () => {
    const end = runLoop(startLoop(Number.MAX_SAFE_INTEGER));
    expect(end.passes).toBe(MAX_PASSES);
    expect(isDone(end)).toBe(true);
  });
});

describe('loop counter: the drawing follows the model', () => {
  it('moves at the robot speed and never passes the target', () => {
    expect(shownToward(0, 4, PASS_SECONDS / 2)).toBeCloseTo(0.5, 6);
    expect(shownToward(3.9, 4, 1)).toBe(4);
  });

  it('lands on the target in one long step, as under reduced motion or a background tab', () => {
    expect(shownToward(0, 6, 1e9)).toBe(6);
    expect(shownToward(0, 6, Infinity)).toBe(6);
    expect(shownToward(0, 6, NaN)).toBe(6);
    expect(shownToward(5, 0, 1 / 60)).toBe(0); // after Reset it jumps back
  });

  it('drives one side and turns one corner each pass, and four passes close the square', () => {
    expect(robotPose(0)).toEqual({ x: CORNERS[0]![0], y: CORNERS[0]![1], heading: 0 });
    const one = robotPose(1);
    expect(Math.hypot(one.x - CORNERS[0]![0], one.y - CORNERS[0]![1])).toBeCloseTo(SQUARE, 6);
    expect(one.heading).toBe(90);
    const four = robotPose(4);
    expect([four.x, four.y]).toEqual(CORNERS[0]);
    expect(four.heading).toBe(360);
    expect(robotPose(6).heading).toBe(540);
  });

  it('clicks the pointer up at the end of each pass, not the start', () => {
    expect(pointerAt(0)).toBe(1);
    expect(pointerAt(0.5)).toBe(1);
    expect(pointerAt(1)).toBe(2);
    expect(pointerAt(4)).toBe(5);
  });

  it('says what the corner shows: counter, check and passes', () => {
    expect(readoutOf(4, 0)).toBe('side 1 · 1 <= 4 true · 0 passes');
    expect(readoutOf(4, 1.5)).toBe('side 2 · 2 <= 4 true · 1 pass');
    expect(readoutOf(4, 4)).toBe('side 5 · 5 <= 4 false · 4 passes');
    expect(readoutOf(6, 6)).toBe('side 7 · 7 <= 6 false · 6 passes');
  });
});
