/// <reference lib="webworker" />
import { checkProgram, runProgram } from './engine';
import type { WorkerRequest, WorkerResponse } from './messages';

/* Runs a LinearOpMode, or a lesson's checks, off the main thread.

   The reason this exists is the one in docs/ARCHITECTURE.md: a kid's `while` loop will
   not finish, and the page has to survive that. The main thread terminates this worker
   and the editor contents are untouched. A TeleOp does not come here — see
   startTeleOp in interpreter.ts for why. */

const post = (message: WorkerResponse) => self.postMessage(message);

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
    if (request.kind === 'run') {
      const outcome = runProgram(request.source, request.spec, (snapshot) =>
        post({ kind: 'frame', snapshot }),
      );
      post({ kind: 'runDone', outcome });
      return;
    }
    const outcome = checkProgram(request.source, request.spec);
    post({ kind: 'checkDone', outcome });
  } catch (e) {
    post({ kind: 'crash', message: e instanceof Error ? e.message : String(e) });
  }
};
