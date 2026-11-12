import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { lockedRegionFrom, lockFilterFor, replaceAllSpec } from '../src/ui/components/editor';
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

/* Reset, Undo and "Put it in the editor" replace the whole text, which always touches the
   locked first line. They used to be filtered out in Explorer, so the buttons did nothing. */
describe('replacing the code past an Explorer lock', () => {
  const start = 'line 1\nline 2\nline 3\nline 4\n';
  const locked = () => EditorState.create({ doc: start, extensions: lockFilterFor({ prefix: 2, suffix: 0 }) });

  it('lets the code replace everything', () => {
    const next = locked().update(replaceAllSpec(locked(), 'new 1\nnew 2\n')).state;
    expect(next.doc.toString()).toBe('new 1\nnew 2\n');
  });

  it('still stops a kid editing a locked line', () => {
    let warned = false;
    const state = EditorState.create({ doc: start, extensions: lockFilterFor({ prefix: 2, suffix: 0 }, () => { warned = true; }) });
    const next = state.update({ changes: { from: 0, to: 4, insert: 'oops' } }).state;
    expect(next.doc.toString()).toBe(start);
    expect(warned).toBe(true);
  });

  it('still lets a kid edit an open line', () => {
    const state = locked();
    const at = state.doc.line(3).from;
    expect(state.update({ changes: { from: at, insert: 'x' } }).state.doc.line(3).text).toBe('xline 3');
  });
});
