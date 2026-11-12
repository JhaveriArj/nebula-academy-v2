import { describe, it, expect } from 'vitest';
import {
  IDLE, LOOP_MS, LOOPS_PER_S, PEGS, canPress, press, stepOpMode, loopRuns, msOfLoop, seconds,
  type OpModeState, type DsKey,
} from '../src/figures/opmode-lifecycle.figure';
import { TICK_MS } from '../src/sim/simulation';

/* The OpMode bench (src/figures/opmode-lifecycle.figure.ts): its readout is what a kid reads, so
   its model has to run init() and loop() the way the simulator does. */

const run = (s: OpModeState, secondsToRun: number, dt = 1 / 60) => {
  for (let i = 0; i < Math.round(secondsToRun / dt); i++) s = stepOpMode(s, dt);
  return s;
};
const started = () => press(press(IDLE, 'INIT'), 'START');

describe('OpMode bench', () => {
  it('runs loop() once per simulator step: 20 ms, 50 times a second, 50 pegs a turn', () => {
    expect(LOOP_MS).toBe(TICK_MS);
    expect(LOOP_MS).toBe(20);
    expect(LOOPS_PER_S).toBe(50);
    expect(PEGS).toBe(50);
  });

  it('offers only the keys a Driver Station offers', () => {
    const keys: DsKey[] = ['INIT', 'START', 'STOP'];
    const offered = (s: OpModeState) => keys.filter((k) => canPress(s, k));
    expect(offered(IDLE)).toEqual(['INIT']);
    expect(offered(press(IDLE, 'INIT'))).toEqual(['START', 'STOP']);
    expect(offered(started())).toEqual(['STOP']);
    expect(offered(press(started(), 'STOP'))).toEqual(['INIT']);
  });

  it('ignores a key that is not offered', () => {
    expect(press(IDLE, 'START')).toBe(IDLE);
    expect(press(IDLE, 'STOP')).toBe(IDLE);
    const s = started();
    expect(press(s, 'INIT')).toBe(s);
  });

  it('runs init() once at INIT and no loop() before START', () => {
    const s = press(IDLE, 'INIT');
    expect(s.initRuns).toBe(1);
    expect(loopRuns(s)).toBe(0);
    const waited = run(s, 5);
    expect(loopRuns(waited)).toBe(0);
    expect(seconds(waited)).toBe(0);
  });

  it('runs the first loop() the moment START is pressed, then one every 20 ms', () => {
    let s = started();
    expect(loopRuns(s)).toBe(1);
    s = stepOpMode(s, 0.019);
    expect(loopRuns(s)).toBe(1);
    s = stepOpMode(s, 0.002);
    expect(loopRuns(s)).toBe(2);
  });

  it('reaches the 50th loop() at 980 ms, as the simulator does', () => {
    expect(msOfLoop(50)).toBe(980);
    expect(loopRuns(stepOpMode(started(), 0.979))).toBe(49);
    expect(loopRuns(run(started(), 0.98, 0.02))).toBe(50);
  });

  it('runs loop() about 50 times a second while init() stays at one', () => {
    const s = run(started(), 3);
    expect(loopRuns(s)).toBeGreaterThanOrEqual(149);
    expect(loopRuns(s)).toBeLessThanOrEqual(151);
    expect(s.initRuns).toBe(1);
  });

  it('freezes the count at STOP', () => {
    const s = press(run(started(), 2), 'STOP');
    const count = loopRuns(s);
    expect(s.phase).toBe('stopped');
    expect(loopRuns(run(s, 5))).toBe(count);
  });

  it('runs no loop() when STOP comes straight after INIT', () => {
    const s = press(press(IDLE, 'INIT'), 'STOP');
    expect(s.phase).toBe('stopped');
    expect(loopRuns(s)).toBe(0);
  });

  it('starts a fresh run on INIT after STOP, with init() at one again', () => {
    const s = press(press(run(started(), 2), 'STOP'), 'INIT');
    expect(s.phase).toBe('init');
    expect(s.initRuns).toBe(1);
    expect(loopRuns(s)).toBe(0);
  });

  it('takes long, odd or broken steps safely', () => {
    const s = started();
    expect(loopRuns(stepOpMode(s, 60))).toBe(3001);
    expect(stepOpMode(s, -1)).toBe(s);
    expect(stepOpMode(s, Number.NaN)).toBe(s);
    expect(stepOpMode(s, Number.POSITIVE_INFINITY)).toBe(s);
  });
});
