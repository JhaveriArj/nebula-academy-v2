import { describe, it, expect } from 'vitest';
import { normalise, mergeProgress } from '../src/progress/store';
import { pathway } from '../src/content/loader';

const firstLesson = pathway.tiers[0]!.lessons[0]!.id;

describe('modeChosen', () => {
  it('is false for a brand-new file, so the home page asks their age', () => {
    expect(normalise({}).modeChosen).toBe(false);
  });

  it('is kept when the file says so', () => {
    expect(normalise({ mode: 'explorer', modeChosen: true }).modeChosen).toBe(true);
  });

  it('counts an older file with a passed lesson as already chosen', () => {
    const file = normalise({ mode: 'builder', lessons: { [firstLesson]: { passed: true, passedAt: null, mode: 'builder' } } });
    expect(file.modeChosen).toBe(true);
  });

  it('does not count a lesson that was opened but not passed', () => {
    const file = normalise({ lessons: { [firstLesson]: { passed: false, passedAt: null, mode: 'builder' } } });
    expect(file.modeChosen).toBe(false);
  });
});

describe('appearance', () => {
  it('defaults to auto, which follows the device', () => {
    expect(normalise({}).appearance).toBe('auto');
  });

  it('keeps light and dark, and ignores anything else', () => {
    expect(normalise({ appearance: 'dark' }).appearance).toBe('dark');
    expect(normalise({ appearance: 'light' }).appearance).toBe('light');
    expect(normalise({ appearance: 'purple' }).appearance).toBe('auto');
  });
});

describe('loading a progress file', () => {
  const [a, b, c] = pathway.tiers[0]!.lessons.map((l) => l.id);
  const pass = (at: string) => ({ passed: true, passedAt: at, mode: 'builder' as const });

  it('keeps a lesson passed here since the file was saved', () => {
    const here = normalise({ lessons: { [a!]: pass('2026-11-01T10:00:00Z'), [b!]: pass('2026-11-05T10:00:00Z') }, drafts: { [b!]: 'home code' } });
    const file = normalise({ lessons: { [a!]: pass('2026-11-01T10:00:00Z') } });
    const merged = mergeProgress(here, file);
    expect(merged.lessons[b!]?.passed).toBe(true);
    expect(merged.drafts[b!]).toBe('home code');
  });

  it('adds the passes the file has, and keeps the earlier date of a lesson passed in both', () => {
    const here = normalise({ lessons: { [a!]: pass('2026-11-03T10:00:00Z') } });
    const file = normalise({ lessons: { [a!]: pass('2026-11-01T10:00:00Z'), [c!]: pass('2026-11-02T10:00:00Z') } });
    const merged = mergeProgress(here, file);
    expect(merged.lessons[a!]?.passedAt).toBe('2026-11-01T10:00:00Z');
    expect(merged.lessons[c!]?.passed).toBe(true);
  });

  it("uses the file's code for a lesson it has", () => {
    const merged = mergeProgress(normalise({ drafts: { [a!]: 'old' } }), normalise({ drafts: { [a!]: 'from the file' } }));
    expect(merged.drafts[a!]).toBe('from the file');
  });

  it('never turns a passed lesson back into an unpassed one', () => {
    const here = normalise({ lessons: { [a!]: pass('2026-11-03T10:00:00Z') } });
    const file = normalise({ lessons: { [a!]: { passed: false, passedAt: null, mode: 'builder' } } });
    expect(mergeProgress(here, file).lessons[a!]?.passed).toBe(true);
  });
});
