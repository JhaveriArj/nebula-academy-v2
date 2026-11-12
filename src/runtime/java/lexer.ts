import { diag, type Diagnostic } from './diagnostics';

export type TokenKind =
  | 'ident'
  | 'keyword'
  | 'int'
  | 'long'
  | 'double'
  | 'float'
  | 'char'
  | 'string'
  | 'op'
  | 'eof';

export interface Token {
  kind: TokenKind;
  /** Source text for idents/keywords/ops; decoded value for literals. */
  text: string;
  /** Decoded literal value. */
  value?: string | number | boolean | null;
  line: number;
  column: number;
  length: number;
}

export const KEYWORDS = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const',
  'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float',
  'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native',
  'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp',
  'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void',
  'volatile', 'while', 'var', 'record', 'sealed', 'permits', 'yield',
  // literals are keywords for our purposes; the parser turns them into values
  'true', 'false', 'null',
]);

/* Longest first so that >>>= beats >>> beats >> beats >. */
const OPERATORS = [
  '>>>=', '<<=', '>>=', '>>>', '...', '->', '::',
  '++', '--', '&&', '||', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=',
  '<<', '>>',
  '+', '-', '*', '/', '%', '=', '<', '>', '!', '~', '?', ':', '&', '|', '^',
  '(', ')', '{', '}', '[', ']', ';', ',', '.', '@',
];

const isDigit = (c: string) => c >= '0' && c <= '9';
const isIdentStart = (c: string) =>
  (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_' || c === '$';
const isIdentPart = (c: string) => isIdentStart(c) || isDigit(c);

export interface LexResult {
  tokens: Token[];
  diagnostics: Diagnostic[];
}

/** Tokenizes Java source. Collects recoverable problems rather than throwing, so the
    parser can report several errors from one Run instead of only the first. */
export function lex(source: string): LexResult {
  const tokens: Token[] = [];
  const diagnostics: Diagnostic[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  const here = (length = 1) => ({ line, column: col, length });

  const advance = (n = 1) => {
    for (let k = 0; k < n; k++) {
      if (source[i] === '\n') {
        line++;
        col = 1;
      } else {
        col++;
      }
      i++;
    }
  };

  const push = (kind: TokenKind, text: string, span: { line: number; column: number; length: number }, value?: Token['value']) => {
    const t: Token = { kind, text, ...span };
    if (value !== undefined) t.value = value;
    tokens.push(t);
  };

  while (i < source.length) {
    const c = source[i]!;

    // whitespace
    if (c === ' ' || c === '\t' || c === '\r' || c === '\n' || c === '\f') {
      advance();
      continue;
    }

    // comments
    if (c === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') advance();
      continue;
    }
    if (c === '/' && source[i + 1] === '*') {
      const start = here(2);
      advance(2);
      let closed = false;
      while (i < source.length) {
        if (source[i] === '*' && source[i + 1] === '/') {
          advance(2);
          closed = true;
          break;
        }
        advance();
      }
      if (!closed) diagnostics.push(diag('unclosed.comment', 'unclosed comment', start));
      continue;
    }

    // identifiers and keywords
    if (isIdentStart(c)) {
      const start = { line, column: col, length: 0 };
      let text = '';
      while (i < source.length && isIdentPart(source[i]!)) {
        text += source[i];
        advance();
      }
      start.length = text.length;
      push(KEYWORDS.has(text) ? 'keyword' : 'ident', text, start);
      continue;
    }

    // numbers
    if (isDigit(c) || (c === '.' && isDigit(source[i + 1] ?? ''))) {
      const start = { line, column: col, length: 0 };
      let text = '';
      let isFloating = false;
      let radix = 10;

      if (c === '0' && (source[i + 1] === 'x' || source[i + 1] === 'X')) {
        radix = 16;
        text += source[i]! + source[i + 1]!;
        advance(2);
        while (i < source.length && /[0-9a-fA-F_]/.test(source[i]!)) {
          text += source[i];
          advance();
        }
      } else if (c === '0' && (source[i + 1] === 'b' || source[i + 1] === 'B')) {
        radix = 2;
        text += source[i]! + source[i + 1]!;
        advance(2);
        while (i < source.length && /[01_]/.test(source[i]!)) {
          text += source[i];
          advance();
        }
      } else {
        while (i < source.length && /[0-9_]/.test(source[i]!)) {
          text += source[i];
          advance();
        }
        if (source[i] === '.' && isDigit(source[i + 1] ?? '')) {
          isFloating = true;
          text += '.';
          advance();
          while (i < source.length && /[0-9_]/.test(source[i]!)) {
            text += source[i];
            advance();
          }
        } else if (source[i] === '.' && !isIdentStart(source[i + 1] ?? '')) {
          // "1." is a valid double literal
          isFloating = true;
          text += '.';
          advance();
        }
        if (source[i] === 'e' || source[i] === 'E') {
          isFloating = true;
          text += source[i];
          advance();
          if (source[i] === '+' || source[i] === '-') {
            text += source[i];
            advance();
          }
          while (i < source.length && isDigit(source[i]!)) {
            text += source[i];
            advance();
          }
        }
      }

      let kind: TokenKind = isFloating ? 'double' : 'int';
      const suffix = source[i];
      if (suffix === 'd' || suffix === 'D') {
        kind = 'double';
        advance();
      } else if (suffix === 'f' || suffix === 'F') {
        kind = 'float';
        advance();
      } else if (suffix === 'l' || suffix === 'L') {
        kind = 'long';
        advance();
      }

      start.length = Math.max(1, text.length);
      const clean = text.replace(/_/g, '');
      const value =
        radix === 10 ? Number(clean) : parseInt(clean.slice(2), radix);
      push(kind, text, start, value);
      continue;
    }

    // char literal
    if (c === "'") {
      const start = { line, column: col, length: 0 };
      advance();
      let value = '';
      if (source[i] === '\\') {
        advance();
        value = unescape(source[i] ?? '');
        advance();
      } else {
        value = source[i] ?? '';
        advance();
      }
      if (source[i] === "'") advance();
      else diagnostics.push(diag('unclosed.string.literal', 'unclosed character literal', start));
      start.length = 3;
      push('char', value, start, value);
      continue;
    }

    // string literal
    if (c === '"') {
      const start = { line, column: col, length: 0 };
      advance();
      let value = '';
      let raw = '"';
      let closed = false;
      while (i < source.length) {
        const ch = source[i]!;
        if (ch === '\n') break;
        if (ch === '\\') {
          raw += ch;
          advance();
          const esc = source[i] ?? '';
          raw += esc;
          value += unescape(esc);
          advance();
          continue;
        }
        raw += ch;
        advance();
        if (ch === '"') {
          closed = true;
          break;
        }
        value += ch;
      }
      start.length = raw.length;
      if (!closed) {
        diagnostics.push(diag('unclosed.string.literal', 'unclosed string literal', start));
      }
      push('string', raw, start, value);
      continue;
    }

    // operators and punctuation
    const op = OPERATORS.find((o) => source.startsWith(o, i));
    if (op) {
      const start = { line, column: col, length: op.length };
      advance(op.length);
      push('op', op, start);
      continue;
    }

    diagnostics.push(
      diag('illegal.char', `illegal character: '${c}'`, here(1), { symbol: c }),
    );
    advance();
  }

  push('eof', '', { line, column: col, length: 0 });
  return { tokens, diagnostics };
}

function unescape(c: string): string {
  switch (c) {
    case 'n': return '\n';
    case 't': return '\t';
    case 'r': return '\r';
    case 'b': return '\b';
    case 'f': return '\f';
    case '0': return '\0';
    case 's': return ' ';
    case '\\': return '\\';
    case "'": return "'";
    case '"': return '"';
    default: return c;
  }
}

