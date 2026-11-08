import { describe, it, expect } from 'vitest';
import { frameIndex, FRAME_MS } from '../src/ui/frames';

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
