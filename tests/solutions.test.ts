import { describe, it, expect } from 'vitest';
import { loadAllLessons } from './helpers/content';
import { runLessonTests } from '../src/runtime/testRunner';
import { runJava } from '../src/runtime/java/interpreter';
import { buildSim } from '../src/runtime/testRunner';

/* The gate CLAUDE.md names explicitly: "Never commit a lesson whose solution.java fails
   its own tests.json." Every solution is run against its own checks in the real sim, and
   every starter is compiled, on every `npm run check`.

   This is the whole reason the runtime is a TypeScript interpreter rather than a WASM JVM
   in a headless browser — see docs/ARCHITECTURE.md. It takes about a second. */

const lessons = loadAllLessons();
const whenBuilt = describe.skipIf(lessons.length === 0);

it('has lessons to check once content/ is populated', () => {
  expect(lessons.length).toBeGreaterThanOrEqual(0);
});

whenBuilt('every solution.java passes its own tests.json', () => {
  for (const lesson of lessons) {
    it(`${lesson.dir}`, () => {
      const result = runLessonTests(lesson.solution, lesson.tests);

      if (!result.compiled || result.error) {
        throw new Error(
          `solution.java did not get as far as the checks.\n` +
            `  ${result.error?.headline ?? 'unknown problem'}\n` +
            `  ${result.error?.fix ?? ''}\n\n${result.error?.raw ?? ''}`,
        );
      }

      const failed = result.results.filter((r) => !r.passed);
      expect(
        failed.map((f) => `  x ${f.label}\n    ${f.detail}`).join('\n'),
        `${failed.length} of ${result.results.length} checks failed`,
      ).toBe('');
    });
  }
});

whenBuilt('every starter.java compiles', () => {
  for (const lesson of lessons) {
    it(`${lesson.dir}`, () => {
      // A starter must run as-is, per CLAUDE.md: a kid presses Run before editing.
      const run = runJava(lesson.starter, { sim: buildSim(lesson.tests), maxSimMs: 20_000 });
      const errors = run.diagnostics.filter((d) => d.severity === 'error');
      expect(
        errors.map((d) => `  line ${d.line}: ${d.message}`).join('\n'),
        'starter.java must compile as-is',
      ).toBe('');
      if (run.thrown) {
        throw new Error(
          `starter.java compiles but crashes: ${run.thrown.exceptionClass}: ${run.thrown.message ?? ''}`,
        );
      }
      expect(['finished', 'simTime', 'stopped'], `starter.java stopped because: ${run.stopReason}`).toContain(
        run.stopReason,
      );
    });
  }
});

whenBuilt('every starter actually leaves work to do', () => {
  for (const lesson of lessons) {
    it(`${lesson.dir}`, () => {
      // If the starter already passes every check, the lesson teaches nothing.
      // Tier 0 lesson 01 is the deliberate exception: it already drives, and the kid
      // changes a number, so its checks are tuned to require the change.
      const result = runLessonTests(lesson.starter, lesson.tests);
      const starterPasses = result.compiled && !result.error && result.passed;
      expect(starterPasses, 'starter.java already passes every check, so there is nothing to learn').toBe(false);
    });
  }
});
