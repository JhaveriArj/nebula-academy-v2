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

/** Which frame of a kid's own run to show `elapsedMs` after it began to play: the newest one
    whose robot time has come. `times` are the frames' sim times, in order; `from` is the frame
    on screen now, so the search never goes backwards. This is what makes sleep(2000) take two
    real seconds on the field. */
export function frameDue(times: readonly number[], from: number, elapsedMs: number): number {
  let index = Math.max(0, Math.min(from, times.length - 1));
  while (index < times.length - 1 && times[index + 1]! <= elapsedMs) index++;
  return index;
}
