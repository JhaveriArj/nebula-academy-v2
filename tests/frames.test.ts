import { describe, it, expect } from 'vitest';
import { frameDue, frameIndex, FRAME_MS } from '../src/ui/frames';

describe('frameDue', () => {
  // A run that sleeps for 2000 ms: frames every 40 ms of robot time, then the final one.
  const times = [...Array.from({ length: 50 }, (_, i) => i * 40), 2000];

  it('holds the first frame until its robot time has passed', () => {
    expect(frameDue(times, 0, 0)).toBe(0);
    expect(frameDue(times, 0, 39)).toBe(0);
    expect(frameDue(times, 0, 40)).toBe(1);
  });

  it('is halfway through a two second sleep after one real second', () => {
    expect(times[frameDue(times, 0, 1000)]).toBe(1000);
  });

  it('reaches the last frame only when the whole run time has passed', () => {
    expect(frameDue(times, 0, 1999)).toBe(times.length - 2);
    expect(frameDue(times, 0, 2000)).toBe(times.length - 1);
    expect(frameDue(times, 0, 99999)).toBe(times.length - 1);
  });

  it('never goes backwards from the frame on screen', () => {
    expect(frameDue(times, 10, 0)).toBe(10);
  });
});

describe('frameIndex', () => {
  it('never goes negative when the rAF timestamp predates the start time', () => {
    expect(frameIndex(995, 1000, 10, false)).toBe(0);
    expect(frameIndex(995, 1000, 10, true)).toBe(0);
  });

  it('advances one frame per timestep', () => {
    expect(frameIndex(1000 + FRAME_MS * 3, 1000, 10, false)).toBe(3);
  });

  it('holds the last frame when not looping', () => {
    expect(frameIndex(1000 + FRAME_MS * 50, 1000, 10, false)).toBe(9);
  });

  it('wraps when looping', () => {
    expect(frameIndex(1000 + FRAME_MS * 12, 1000, 10, true)).toBe(2);
  });

  it('is safe with no frames', () => {
    expect(frameIndex(5000, 1000, 0, true)).toBe(0);
  });
});
