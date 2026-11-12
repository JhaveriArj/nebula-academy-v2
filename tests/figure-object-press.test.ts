import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  build, changeSeconds, selectNext, nextSeconds, readoutOf, buildLine, changeLine, ramDrop, isFormed,
  slideShare, startOf, follow, EMPTY, PLANS, MAX_OBJECTS, SECONDS_CHOICES, STROKE_S, IMPACT_S, DONE_S, NEXT_GAP_S,
  type PressState,
} from '../src/figures/object-press.figure';

/* The object press (src/figures/object-press.figure.ts): one class, many objects, each with its
   own fields. Its model is what the readout and the line under the buttons say, so it has to
   match the lesson and keep every object's fields apart. */

const solution = readFileSync(join(__dirname, '../content/tiers/2-docking/05-making-an-object/solution.java'), 'utf8');

describe('object press: the model', () => {
  it("builds the lesson's two plans, with the same values as solution.java", () => {
    const s = build(build(EMPTY));
    expect(s.objects.map(buildLine)).toEqual([
      'MissionPlan square = new MissionPlan("Square", 4, 1.0);',
      'MissionPlan triangle = new MissionPlan("Triangle", 3, 1.4);',
    ]);
    for (const line of s.objects.map(buildLine)) expect(solution).toContain(line);
  });

  it('selects each new object and stops at three', () => {
    let s: PressState = EMPTY;
    for (let i = 0; i < 5; i++) s = build(s);
    expect(s.objects).toHaveLength(MAX_OBJECTS);
    expect(s.selected).toBe(MAX_OBJECTS - 1);
  });

  it('gives every object its own copy of the fields', () => {
    let s = build(build(build(EMPTY))); // square, triangle, square2: square2 equals square
    expect(s.objects[2]).toEqual({ ...s.objects[0], variable: 'square2' });
    s = changeSeconds(s);
    expect(s.objects[2]!.sideSeconds).toBe(1.4);
    expect(s.objects[0]!.sideSeconds).toBe(1.0);
    expect(s.objects[1]!.sideSeconds).toBe(1.4);
    expect(PLANS[0]!.sideSeconds).toBe(1.0); // the blueprint's values never change
    expect(changeLine(s.objects[2]!)).toBe('square2.sideSeconds = 1.4;');
  });

  it('steps sideSeconds through the choices and wraps', () => {
    expect(SECONDS_CHOICES).toEqual([0.5, 1.0, 1.4, 2.0]);
    expect([0.5, 1.0, 1.4, 2.0].map(nextSeconds)).toEqual([1.0, 1.4, 2.0, 0.5]);
  });

  it('cycles the selection and does nothing with no objects', () => {
    expect(selectNext(EMPTY)).toBe(EMPTY);
    expect(changeSeconds(EMPTY)).toBe(EMPTY);
    const s = build(build(EMPTY));
    expect(selectNext(s).selected).toBe(0);
    expect(selectNext(selectNext(s)).selected).toBe(1);
  });

  it('reads out the count, the selected object and its fields', () => {
    expect(readoutOf(EMPTY)).toBe('0 objects');
    expect(readoutOf(build(EMPTY))).toBe('1 object · square · 4 sides · 1.0 s');
    expect(readoutOf(build(build(EMPTY)))).toBe('2 objects · triangle · 3 sides · 1.4 s');
    // While the die is still coming down, the new object does not exist yet.
    expect(readoutOf(build(build(EMPTY)), 1)).toBe('1 object · building triangle');
    expect(readoutOf(build(EMPTY), 0)).toBe('0 objects · building square');
  });
});

describe('object press: motion', () => {
  it('brings the die down, forms the part on impact, then slides it away', () => {
    expect(ramDrop(-1)).toBe(0);
    expect(ramDrop(IMPACT_S)).toBe(1);
    expect(ramDrop(STROKE_S)).toBe(0);
    expect(isFormed(IMPACT_S - 0.01)).toBe(false);
    expect(isFormed(IMPACT_S)).toBe(true);
    expect(slideShare(STROKE_S)).toBe(0);
    expect(slideShare(DONE_S)).toBe(1);
    expect(slideShare(Infinity)).toBe(1);
    expect(ramDrop(Infinity)).toBe(0);
    expect(ramDrop(NaN)).toBe(0);
  });

  it('waits for the part before to clear the die', () => {
    expect(startOf(5, null)).toBe(5);
    expect(startOf(5, 4.9)).toBeCloseTo(4.9 + NEXT_GAP_S);
    expect(startOf(9, 4.9)).toBe(9);
  });

  it('eases a slider to its value and lands exactly, even with huge steps', () => {
    let v = 0.5;
    let frames = 0;
    while (v !== 2.0 && frames < 1000) { v = follow(v, 2.0, 1 / 60); frames++; }
    expect(v).toBe(2.0);
    expect(frames).toBeLessThan(120);
    expect(follow(0.5, 2.0, 1000)).toBe(2.0);
    expect(follow(0.5, 2.0, -1)).toBe(0.5);
  });
});
