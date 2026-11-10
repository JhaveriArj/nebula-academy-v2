import { describe, it, expect } from 'vitest';
import { HERO_JAVA, HERO_SPEC, HERO_CHECKS, HERO_LINES, FIRST_LINE, LESSON_ONE_CHECKS, demoStateAt, RUN_MS } from '../src/ui/heroDemo';
import { playWatch } from '../src/sim/watch';
import { runLessonTests } from '../src/runtime/testRunner';
import { runProgram } from '../src/runtime/engine';
import { missingImports } from '../src/runtime/java/imports';
import { FRAME_MS } from '../src/ui/frames';
import { loadAllLessons } from './helpers/content';

/* The home page plays a script, not the interpreter, so it stays light. These tests make
   sure the script shows what the Java it prints would really do. */

describe('the home page demo', () => {
  it('shows lines that are really in the file, at the line numbers it prints', () => {
    const file = HERO_JAVA.split('\n');
    HERO_LINES.forEach((line, i) => {
      expect(file[FIRST_LINE - 1 + i]?.trim()).toBe(line.trim());
    });
  });

  it('is Java that compiles with its imports and passes the checks the hero shows as passed', () => {
    expect(missingImports(HERO_JAVA)).toEqual([]);
    const result = runLessonTests(HERO_JAVA, HERO_CHECKS);
    expect(result.error?.headline ?? null).toBeNull();
    expect(result.results.filter((r) => !r.passed).map((r) => `${r.label}: ${r.detail}`)).toEqual([]);
  });

  it('ends where the interpreter ends', () => {
    const real = runProgram(HERO_JAVA, HERO_CHECKS).snapshot.pose;
    const scripted = playWatch(HERO_SPEC).at(-1)!.snapshot.pose;
    expect(Math.hypot(real.x - scripted.x, real.y - scripted.y)).toBeLessThan(5);
  });

  it('uses the Tier 0 checkpoint\'s check labels and lesson 1\'s, word for word', () => {
    const lessons = loadAllLessons();
    const labels = (dir: string) => lessons.find((l) => l.dir.endsWith(dir))!.tests.checks.map((c) => c.label);
    for (const c of HERO_CHECKS.checks) expect(labels('04-checkpoint-square')).toContain(c.label);
    expect(labels('01-hello-robot')).toEqual([...LESSON_ONE_CHECKS]);
  });

  it('highlights the block that is running, then nothing once the robot stops', () => {
    expect(demoStateAt(0)).toMatchObject({ side: 1, lines: [1, 2, 3], done: false });
    expect(demoStateAt(1600 / FRAME_MS)).toMatchObject({ side: 1, lines: [4, 5, 6] });
    expect(demoStateAt(2400 / FRAME_MS)).toMatchObject({ side: 2, lines: [1, 2, 3] });
    expect(demoStateAt(RUN_MS / FRAME_MS)).toMatchObject({ lines: [], done: true });
  });
});
