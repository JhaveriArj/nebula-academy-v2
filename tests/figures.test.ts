import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stepBench, cmOf, isBusy, MAX_TICKS, MAX_TICKS_PER_S, type BenchState } from '../src/figures/encoder-bench.figure';
import { TICKS_PER_CM, TICKS_PER_REV } from '../src/sim/simulation';

/* Figures (src/figures/): every one a lesson names exists, and the encoder bench's model tells
   the truth, since its readout is what a kid reads. */

const ROOT = join(__dirname, '..');
const figureFiles = readdirSync(join(ROOT, 'src/figures')).filter((f) => f.endsWith('.figure.ts')).map((f) => f.replace('.figure.ts', ''));

function lessonFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? lessonFiles(join(dir, e.name)) : e.name.endsWith('.md') ? [join(dir, e.name)] : []);
}

describe('figure slots in content', () => {
  const used = lessonFiles(join(ROOT, 'content')).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(/^:::figure\s+(\S+)\s*$/gm)].map((m) => ({ file, id: m[1]! })));

  it('names only figures that exist', () => {
    for (const { file, id } of used) expect(figureFiles, `${file} asks for ${id}`).toContain(id);
  });
});

describe('encoder bench', () => {
  const run = (s: BenchState, seconds: number) => {
    for (let i = 0; i < Math.round(seconds * 60); i++) s = stepBench(s, 1 / 60);
    return s;
  };

  it('uses the simulator constants: 537.7 ticks a turn, 17.8 a centimetre', () => {
    expect(TICKS_PER_REV).toBe(537.7);
    expect(TICKS_PER_CM).toBeCloseTo(17.83, 2);
    expect(cmOf(TICKS_PER_REV)).toBeCloseTo(30.16, 1);
  });

  it('turns at 312 rpm at full power', () => {
    expect(MAX_TICKS_PER_S).toBeCloseTo(2796, 0);
    const s = run({ ticks: 0, power: 1, target: null }, 0.1);
    expect(s.ticks).toBeCloseTo(279.6, -1);
  });

  it('drives to a RUN_TO_POSITION target and stops by itself', () => {
    const target = Math.round(20 * TICKS_PER_CM);
    const s = run({ ticks: 0, power: 0.5, target }, 3);
    expect(isBusy(s)).toBe(false);
    expect(s.ticks).toBe(target);
    expect(s.power).toBe(0);
    expect(cmOf(s.ticks)).toBeCloseTo(20, 0);
  });

  it('settles even with long steps, as under reduced motion', () => {
    let s: BenchState = { ticks: 0, power: 0.5, target: 356 };
    for (let i = 0; i < 100 && isBusy(s); i++) s = stepBench(s, 1 / 30);
    expect(isBusy(s)).toBe(false);
    expect(s.ticks).toBe(356);
  });

  it('drives backwards to a lower target', () => {
    const s = run({ ticks: 500, power: 0.5, target: 100 }, 3);
    expect(s.ticks).toBe(100);
  });

  it('stalls at the end stops instead of running off the ruler', () => {
    expect(run({ ticks: 0, power: -0.5, target: null }, 1).ticks).toBe(0);
    expect(run({ ticks: MAX_TICKS - 10, power: 1, target: null }, 1).ticks).toBe(MAX_TICKS);
  });
});
