import { lex } from './lexer';

/* Finds the brace a kid actually got wrong, so a syntax error can point at it.

   javac reports an unbalanced brace wherever it finally gave up, which is often many
   lines away: an extra } on line 20 surfaces as "<identifier> expected" on line 24, and a
   missing } surfaces at the end of the file. Counting braces says which kind of problem it
   is; indentation says where. A } that sits deeper than the { it closes is the stray one,
   and a { whose } sits shallower than it is the one that never closed. When indentation
   gives no clue, the unmatched brace itself is the answer. */

export interface BraceProblem {
  kind: 'extra' | 'missing';
  line: number;
  column: number;
}

interface Brace {
  line: number;
  column: number;
  indent: number;
}

export function findBraceProblem(source: string): BraceProblem | null {
  const { tokens } = lex(source);
  const lines = source.split('\n');
  const indentOf = (line: number) => {
    const text = lines[line - 1] ?? '';
    let width = 0;
    for (const c of text) {
      if (c === ' ') width += 1;
      else if (c === '\t') width += 4;
      else break;
    }
    return width;
  };

  const open: Brace[] = [];
  const pairs: { open: Brace; close: Brace }[] = [];
  let strayClose: Brace | null = null;
  let opens = 0;
  let closes = 0;

  for (const t of tokens) {
    if (t.kind !== 'op') continue;
    const b = { line: t.line, column: t.column, indent: indentOf(t.line) };
    if (t.text === '{') {
      opens++;
      open.push(b);
    } else if (t.text === '}') {
      closes++;
      const o = open.pop();
      if (o) pairs.push({ open: o, close: b });
      else strayClose ??= b;
    }
  }

  // A pair on one line, like `if (x) { y(); }`, says nothing about indentation.
  const multiLine = pairs.filter((p) => p.open.line !== p.close.line);

  if (closes > opens) {
    const tooDeep = multiLine.find((p) => p.close.indent > p.open.indent);
    const at = tooDeep?.close ?? strayClose;
    return at ? { kind: 'extra', line: at.line, column: at.column } : null;
  }

  if (opens > closes) {
    const tooShallow = multiLine.find((p) => p.close.indent < p.open.indent);
    // Otherwise the outermost { left over: usually the class, when the last } went.
    const at = tooShallow?.open ?? open[0];
    return at ? { kind: 'missing', line: at.line, column: at.column } : null;
  }

  return null;
}
