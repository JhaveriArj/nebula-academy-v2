import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { runJava } from '../src/runtime/java/interpreter';
import { translateDiagnostic } from '../src/runtime/errorTranslator';
import { findBraceProblem } from '../src/runtime/java/braces';
import { Simulation } from '../src/sim/simulation';

/* An unbalanced brace is reported where the kid made the mistake, not where javac gave up. */

const starter = readFileSync('content/tiers/0-launchpad/02-run-and-break-it/starter.java', 'utf8');
const lines = starter.split('\n');
const lineOf = (src: string, text: string) => src.split('\n').findIndex((l) => l.includes(text)) + 1;

function friendly(src: string) {
  const run = runJava(src, { sim: new Simulation({ robot: 'tank' }) });
  const first = run.diagnostics.find((d) => d.severity === 'error');
  expect(first, 'the edited program should not compile').toBeDefined();
  return translateDiagnostic(first!, src);
}

describe('brace problems', () => {
  it('points at an extra } typed at the end of a line', () => {
    const edited = [...lines];
    const at = lineOf(starter, 'int speed = 1;') + 1;
    edited[at - 1] = '        leftDrive.setPower(0); }';
    const src = edited.join('\n');
    const e = friendly(src);
    expect(e.line).toBe(at);
    expect(e.headline).toBe(`Line ${at} has an extra } that the robot did not expect.`);
    // The real error stays behind the toggle, named after the public class.
    expect(e.raw).toMatch(/^BreakItOnPurpose\.java:\d+: error:/);
  });

  it('points at the class { when the last } is deleted', () => {
    const edited = [...lines];
    edited.splice(edited.lastIndexOf('}'), 1);
    const e = friendly(edited.join('\n'));
    expect(e.line).toBe(lineOf(starter, 'public class BreakItOnPurpose'));
    expect(e.headline).toMatch(/never gets its closing \}/);
    expect(e.raw).toMatch(/reached end of file while parsing/);
  });

  it('points at the block that never closed, not the end of the file', () => {
    const src = `public class Drive {
    void go() {
        if (true) {
            int x = 1;

        int y = 2;
    }
}`;
    expect(findBraceProblem(src)).toEqual({ kind: 'missing', line: 3, column: 19 });
  });

  it('treats a } with no { on its line as the extra one when indentation agrees', () => {
    const src = `public class Drive {
    void go() {
        while (true)
            int x = 1;
        }
    }
}`;
    expect(findBraceProblem(src)?.kind).toBe('extra');
    expect(findBraceProblem(src)?.line).toBe(5);
  });

  it('ignores braces inside text and comments, and balanced code', () => {
    expect(findBraceProblem(`class A { String s = "}}"; /* { */ void f() { if (x) { y(); } } }`)).toBeNull();
  });

  it('leaves other syntax errors alone', () => {
    const edited = [...lines];
    const at = lineOf(starter, 'int speed = 1;');
    edited[at - 1] = '        int speed = 1';
    expect(friendly(edited.join('\n')).headline).toBe(`Line ${at} needs a semicolon at the end.`);
  });
});
