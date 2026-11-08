/* Which recorded sim frame to show at a given animation time.

   requestAnimationFrame hands its callback the start time of the current frame, which can be
   a few milliseconds *before* a performance.now() taken just ahead of the request. Without a
   clamp the first index is -1, frames[-1] is undefined and the animation loop throws. */

/** Milliseconds per recorded frame: the sim's fixed timestep. */
export const FRAME_MS = 20;

export function frameIndex(now: number, startedAt: number, count: number, loop: boolean): number {
  if (count <= 0) return 0;
  const raw = Math.floor(Math.max(0, now - startedAt) / FRAME_MS);
  return loop ? raw % count : Math.min(count - 1, raw);
}
