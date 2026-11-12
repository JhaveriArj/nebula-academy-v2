import { runJava } from './java/interpreter';
import { buildSim, firstProblem, runLessonTests, scriptedInput, type TestSpec } from './testRunner';
import { FRAME_EVERY_TICKS, type CheckOutcome, type RunOutcome } from './messages';
import type { SimSnapshot } from '../sim/simulation';

/* The engine, free of any worker or DOM assumption, so the same code runs inside the
   Web Worker and on the main thread when a worker is unavailable. */

export function runProgram(
  source: string,
  spec: TestSpec,
  onFrame?: (snapshot: SimSnapshot) => void,
): RunOutcome {
  const sim = buildSim(spec);
  const applyInput = scriptedInput(spec);
  let ticks = 0;

  const run = runJava(source, {
    sim,
    ...(spec.teleOpForMs !== undefined ? { teleOpForMs: spec.teleOpForMs } : {}),
    ...(spec.maxSimMs !== undefined ? { maxSimMs: spec.maxSimMs } : {}),
    onTick: (s) => {
      applyInput(s);
      if (onFrame && ticks++ % FRAME_EVERY_TICKS === 0) onFrame(s.snapshot());
    },
  });

  const error = firstProblem(run, sim, source);

  return {
    diagnostics: run.diagnostics,
    thrown: run.thrown,
    stopReason: run.stopReason,
    stopLine: run.stopLine,
    entry: run.entry,
    snapshot: sim.snapshot(),
    error,
  };
}

export function checkProgram(source: string, spec: TestSpec): CheckOutcome {
  const result = runLessonTests(source, spec);
  return {
    compiled: result.compiled,
    error: result.error,
    results: result.results,
    passed: result.passed,
    snapshot: result.sim.snapshot(),
  };
}
