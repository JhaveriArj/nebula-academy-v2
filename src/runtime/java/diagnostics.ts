/* javac-shaped diagnostics.
   Every message here is worded the way the real compiler words it, because
   src/runtime/errorTranslator.ts turns these into kid-friendly text and keeps the
   original visible behind "Show the real error". If we invent our own wording, the
   real error we show a Tier 5 kid stops matching what Android Studio will say. */

export type Severity = 'error' | 'warning';

export interface Diagnostic {
  severity: Severity;
  /** Stable key for errorTranslator.ts to switch on. Mirrors javac's resource keys. */
  code: DiagnosticCode;
  /** javac-style one-line text, e.g. "cannot find symbol". */
  message: string;
  /** javac-style detail lines, e.g. ["  symbol:   variable powr", "  location: class Drive"]. */
  detail?: string[];
  line: number;
  column: number;
  length: number;
  /** The identifier at fault, when there is one. The translator suggests spellings from it. */
  symbol?: string;
  expected?: string;
  found?: string;
}

export type DiagnosticCode =
  | 'expected'
  | 'illegal.start.of.expression'
  | 'illegal.start.of.type'
  | 'premature.eof'
  | 'class.expected'
  | 'unclosed.string.literal'
  | 'unclosed.comment'
  | 'illegal.char'
  | 'cant.resolve'
  | 'cant.resolve.location'
  | 'cant.resolve.method'
  | 'incompatible.types'
  | 'prob.found.req'
  | 'operator.cant.be.applied'
  | 'already.defined'
  | 'missing.ret.stmt'
  | 'arg.length.mismatch'
  | 'non.static.cant.be.ref'
  | 'var.might.not.have.been.initialized'
  | 'unsupported.feature'
  | 'no.main.method'
  | 'abstract.cant.be.instantiated';

export interface Span {
  line: number;
  column: number;
  length: number;
}

export function diag(
  code: DiagnosticCode,
  message: string,
  span: Span,
  extra: Partial<Diagnostic> = {},
): Diagnostic {
  return { severity: 'error', code, message, ...span, ...extra };
}

/** Thrown when compilation cannot continue. Carries everything found so far. */
export class CompileFailure extends Error {
  constructor(readonly diagnostics: Diagnostic[]) {
    super(diagnostics[0]?.message ?? 'compilation failed');
    this.name = 'CompileFailure';
  }
}

/** A Java exception reaching the top of the program, or one of our guard rails. */
export interface JavaThrow {
  /** Simple name as java would print it, e.g. "ArithmeticException". */
  exceptionClass: string;
  message: string | null;
  line: number;
  /** Innermost first: "at Drive.turn(Drive.java:14)". */
  stack: string[];
}

export class JavaRuntimeError extends Error {
  constructor(readonly thrown: JavaThrow) {
    super(`${thrown.exceptionClass}${thrown.message ? ': ' + thrown.message : ''}`);
    this.name = 'JavaRuntimeError';
  }
}

/** The 10 s / step-budget guard. Separate from JavaRuntimeError: it is not the kid's bug
    in the usual sense, and the lesson UI offers a different fix for it. */
export class ExecutionLimit extends Error {
  constructor(
    readonly reason: 'time' | 'steps' | 'stopped',
    readonly line: number,
    readonly javaStack: string[] = [],
  ) {
    super(`execution stopped (${reason})`);
    this.name = 'ExecutionLimit';
  }
}

/** Renders a diagnostic the way javac prints it, for the "Show the real error" toggle. */
export function formatDiagnostic(d: Diagnostic, fileName = 'Main.java', source?: string): string {
  const out = [`${fileName}:${d.line}: ${d.severity}: ${d.message}`];
  if (source) {
    const text = source.split('\n')[d.line - 1] ?? '';
    out.push(text);
    out.push(' '.repeat(Math.max(0, d.column - 1)) + '^');
  }
  for (const line of d.detail ?? []) out.push(line);
  return out.join('\n');
}
