import { describe, it, expect } from 'vitest';
import { normalise } from '../src/progress/store';
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
