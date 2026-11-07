import type { Diagnostic, JavaThrow } from './java/diagnostics';
import type { RunStopReason } from './java/interpreter';
import type { CheckResult, TestSpec } from './testRunner';
import type { SimSnapshot } from '../sim/simulation';
import type { FriendlyError } from './errorTranslator';

/* What crosses the worker boundary. Everything here has to survive structured cloning,
   so results carry a plain SimSnapshot rather than the Simulation itself. */

export interface RunRequest {
  kind: 'run';
  source: string;
  spec: TestSpec;
}

export interface CheckRequest {
  kind: 'check';
  source: string;
  spec: TestSpec;
}

export type WorkerRequest = RunRequest | CheckRequest;

/** Streamed while the program runs, so the field view animates live. */
export interface FrameMessage {
  kind: 'frame';
  snapshot: SimSnapshot;
}

export interface RunOutcome {
  diagnostics: Diagnostic[];
  thrown: JavaThrow | null;
  stopReason: RunStopReason;
  stopLine: number;
  entry: string | null;
  snapshot: SimSnapshot;
  /** Already translated, because the translator needs the source. */
  error: FriendlyError | null;
}

export interface CheckOutcome {
  compiled: boolean;
  error: FriendlyError | null;
  results: CheckResult[];
  passed: boolean;
  snapshot: SimSnapshot;
}

export interface RunDoneMessage {
  kind: 'runDone';
  outcome: RunOutcome;
}

export interface CheckDoneMessage {
  kind: 'checkDone';
  outcome: CheckOutcome;
}

export interface CrashMessage {
  kind: 'crash';
  message: string;
}

export type WorkerResponse = FrameMessage | RunDoneMessage | CheckDoneMessage | CrashMessage;

/** How often to post a frame while running, in sim ticks. 2 ticks is 40 ms, so 25 fps. */
export const FRAME_EVERY_TICKS = 2;
