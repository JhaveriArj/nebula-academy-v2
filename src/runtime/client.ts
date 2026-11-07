import { checkProgram, runProgram } from './engine';
import type { CheckOutcome, RunOutcome, WorkerRequest, WorkerResponse } from './messages';
import type { TestSpec } from './testRunner';
import type { SimSnapshot } from '../sim/simulation';

/* The main thread's view of the engine.

   Everything goes through a Web Worker so that a loop which never finishes can be
   terminated without touching the page or the kid's code. If workers are unavailable the
   same functions run in-process, which is slower to interrupt but never wrong. */

export interface RunHandle<T> {
  /** Resolves when the program finishes, is stopped, or hits a guard rail. */
  done: Promise<T>;
  /** Terminates the worker. The promise rejects with StoppedByUser. */
  stop(): void;
}

export class StoppedByUser extends Error {
  constructor() {
    super('stopped');
    this.name = 'StoppedByUser';
  }
}

let workersAvailable = typeof Worker !== 'undefined';

function spawn(): Worker | null {
  if (!workersAvailable) return null;
  try {
    return new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  } catch {
    // An older browser, or a CSP that forbids module workers. Fall back for good.
    workersAvailable = false;
    return null;
  }
}

function send<T>(
  request: WorkerRequest,
  pick: (message: WorkerResponse) => T | undefined,
  onFrame: ((snapshot: SimSnapshot) => void) | undefined,
  inProcess: () => T,
): RunHandle<T> {
  const worker = spawn();

  if (!worker) {
    return { done: Promise.resolve().then(inProcess), stop: () => {} };
  }

  let stopped = false;
  const done = new Promise<T>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.kind === 'frame') {
        onFrame?.(message.snapshot);
        return;
      }
      if (message.kind === 'crash') {
        worker.terminate();
        reject(new Error(message.message));
        return;
      }
      const value = pick(message);
      if (value !== undefined) {
        worker.terminate();
        resolve(value);
      }
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || 'the runner stopped unexpectedly'));
    };
    worker.postMessage(request);
  });

  return {
    done,
    stop: () => {
      if (stopped) return;
      stopped = true;
      worker.terminate();
    },
  };
}

/** Runs a program, streaming the robot's state so the field view animates. */
export function run(
  source: string,
  spec: TestSpec,
  onFrame?: (snapshot: SimSnapshot) => void,
): RunHandle<RunOutcome> {
  return send<RunOutcome>(
    { kind: 'run', source, spec },
    (m) => (m.kind === 'runDone' ? m.outcome : undefined),
    onFrame,
    () => runProgram(source, spec, onFrame),
  );
}

/** Runs a lesson's checks. Deterministic, so no frames are streamed. */
export function check(source: string, spec: TestSpec): RunHandle<CheckOutcome> {
  return send<CheckOutcome>(
    { kind: 'check', source, spec },
    (m) => (m.kind === 'checkDone' ? m.outcome : undefined),
    undefined,
    () => checkProgram(source, spec),
  );
}
