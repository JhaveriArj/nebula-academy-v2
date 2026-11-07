import { describe, it, expect } from 'vitest';
import { lockedRegionFrom } from '../src/ui/components/editor';
import { loadAllLessons } from './helpers/content';

/* Explorer mode must lock what the frontmatter says and leave the TODO editable. Getting
   this wrong either traps a kid with nothing to edit or lets them break the boilerplate,
   and neither shows up in the lesson's own checks. */
describe('Explorer locked regions', () => {
  it('turns a prefix range into a prefix lock', () => {
    expect(lockedRegionFrom([[1, 19]], 27)).toEqual({ prefix: 19, suffix: 0 });
  });

  it('turns a trailing range into a suffix lock, allowing for the trailing newline', () => {
    expect(lockedRegionFrom([[1, 19], [22, 26]], 27)).toEqual({ prefix: 19, suffix: 6 });
  });

  it('never locks the whole document, because there would be nothing to do', () => {
    const region = lockedRegionFrom([[1, 10], [2, 10]], 10);
    expect(region.prefix + region.suffix).toBeLessThan(10);
  });

  it('leaves every TODO line editable in every lesson', () => {
    for (const lesson of loadAllLessons()) {
      const lines = lesson.starter.split('\n');
      const region = lockedRegionFrom(lesson.frontmatter.explorerLockedRanges, lines.length);
      const lastEditable = lines.length - region.suffix;
      lines.forEach((text, i) => {
        if (!/\/\/\s*TODO/.test(text)) return;
        const line = i + 1;
        expect(line, `${lesson.dir} line ${line} is a TODO inside the locked prefix`).toBeGreaterThan(region.prefix);
        expect(line, `${lesson.dir} line ${line} is a TODO inside the locked suffix`).toBeLessThanOrEqual(lastEditable);
      });
    }
  });

  it('always leaves at least one line editable in every lesson', () => {
    for (const lesson of loadAllLessons()) {
      const lines = lesson.starter.split('\n').length;
      const region = lockedRegionFrom(lesson.frontmatter.explorerLockedRanges, lines);
      expect(region.prefix + region.suffix, `${lesson.dir} locks everything`).toBeLessThan(lines);
    }
  });
});
