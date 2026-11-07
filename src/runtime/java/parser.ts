import { lex, type Token } from './lexer';
import { diag, CompileFailure, type Diagnostic, type DiagnosticCode } from './diagnostics';
import type * as A from './ast';

const MODIFIERS = new Set([
  'public', 'private', 'protected', 'static', 'final', 'abstract', 'native',
  'synchronized', 'transient', 'volatile', 'strictfp', 'default', 'sealed',
]);

const PRIMITIVES = new Set(['int', 'double', 'boolean', 'char', 'long', 'float', 'short', 'byte', 'void']);

const ERROR_NAME = '<error>';

const ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=', '>>>=']);

/** Signals "stop parsing, the file is too broken to continue". */
class Bail extends Error {}

const MAX_DIAGNOSTICS = 12;
/* Recovery can report the same spot repeatedly while making no progress. This is the
   hard stop that guarantees parsing always terminates, however broken the input. */
const MAX_ERROR_ATTEMPTS = 60;

export interface ParseResult {
  unit: A.CompilationUnit;
  diagnostics: Diagnostic[];
}

export function parse(source: string): ParseResult {
  const lexed = lex(source);
  const p = new Parser(lexed.tokens, lexed.diagnostics);
  const unit = p.parseCompilationUnit();
  return { unit, diagnostics: p.diagnostics };
}

export function parseOrThrow(source: string): A.CompilationUnit {
  const { unit, diagnostics } = parse(source);
  if (diagnostics.some((d) => d.severity === 'error')) throw new CompileFailure(diagnostics);
  return unit;
}

/** Flattens a name/field-access chain back into a dotted type name, for `Foo.Bar.class`. */
function exprToTypeName(e: A.Expr): string | null {
  if (e.t === 'name') return e.name;
  if (e.t === 'field') {
    const left = exprToTypeName(e.target);
    return left === null ? null : `${left}.${e.name}`;
  }
  return null;
}

class Parser {
  private i = 0;
  private errorAttempts = 0;

  constructor(
    private tokens: Token[],
    readonly diagnostics: Diagnostic[],
  ) {}

  /* ---------------------------------------------------------------- plumbing */

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.i + offset, this.tokens.length - 1)]!;
  }

  private get cur(): Token {
    return this.peek(0);
  }

  private next(): Token {
    const t = this.cur;
    if (this.i < this.tokens.length - 1) this.i++;
    return t;
  }

  private atEof(): boolean {
    return this.cur.kind === 'eof';
  }

  private isOp(text: string, offset = 0): boolean {
    const t = this.peek(offset);
    return t.kind === 'op' && t.text === text;
  }

  private isKeyword(text: string, offset = 0): boolean {
    const t = this.peek(offset);
    return t.kind === 'keyword' && t.text === text;
  }

  private eatOp(text: string): boolean {
    if (this.isOp(text)) {
      this.next();
      return true;
    }
    return false;
  }

  private eatKeyword(text: string): boolean {
    if (this.isKeyword(text)) {
      this.next();
      return true;
    }
    return false;
  }

  private span(t: Token = this.cur): A.Span {
    return { line: t.line, column: t.column, length: Math.max(1, t.length) };
  }

  /** javac points "';' expected" at the character after the previous token, not at the
      next token, which is why a missing semicolon underlines the end of the right line. */
  private spanAfterPrevious(): A.Span {
    const prev = this.tokens[Math.max(0, this.i - 1)]!;
    return { line: prev.line, column: prev.column + Math.max(1, prev.length), length: 1 };
  }

  private error(code: DiagnosticCode, message: string, span: A.Span, extra: Partial<Diagnostic> = {}): void {
    // Never stack two errors on one spot; javac does not either, and a kid should not
    // see the same mistake reported four ways.
    const dup = this.diagnostics.some((d) => d.line === span.line && d.column === span.column);
    if (!dup) this.diagnostics.push(diag(code, message, span, extra));
    // Count every attempt, including the deduped ones. Counting only what we keep
    // lets a recovery loop spin forever without ever reaching the cap.
    this.errorAttempts++;
    if (this.diagnostics.length >= MAX_DIAGNOSTICS || this.errorAttempts >= MAX_ERROR_ATTEMPTS) {
      throw new Bail();
    }
  }

  private expectOp(text: string): void {
    if (this.eatOp(text)) return;
    if (this.atEof()) {
      this.error('premature.eof', 'reached end of file while parsing', this.span());
      throw new Bail();
    }
    this.error('expected', `'${text}' expected`, text === ';' ? this.spanAfterPrevious() : this.span());
  }

  private expectSemi(): void {
    if (this.eatOp(';')) return;
    this.error('expected', "';' expected", this.spanAfterPrevious());
    // Recover: assume it was there.
  }

  private expectIdent(what = '<identifier>'): string {
    if (this.cur.kind === 'ident') return this.next().text;
    // Contextual keywords Java lets you use as names in our subset.
    if (this.cur.kind === 'keyword' && ['var', 'record', 'yield', 'permits', 'sealed'].includes(this.cur.text)) {
      return this.next().text;
    }
    this.error('expected', `${what} expected`, this.spanAfterPrevious());
    // Consume the offending token unless it is a structural one we need to stay
    // anchored on. Without this, callers in a do/while loop never make progress.
    if (!(this.cur.kind === 'op' && [';', '}', ')', ']', ','].includes(this.cur.text)) && !this.atEof()) {
      this.next();
    }
    return ERROR_NAME;
  }

  /** `>>` has to become `>` + `>` when it closes nested generics. */
  private splitGt(): void {
    const t = this.cur;
    if (t.kind === 'op' && (t.text === '>>' || t.text === '>>>' || t.text === '>=' || t.text === '>>=')) {
      const rest = t.text.slice(1);
      this.tokens.splice(
        this.i,
        1,
        { kind: 'op', text: '>', line: t.line, column: t.column, length: 1 },
        { kind: 'op', text: rest, line: t.line, column: t.column + 1, length: rest.length },
      );
    }
  }

  private save(): number {
    return this.i;
  }

  private restore(mark: number): void {
    this.i = mark;
  }

  /* -------------------------------------------------------- compilation unit */

  parseCompilationUnit(): A.CompilationUnit {
    const unit: A.CompilationUnit = { packageName: null, imports: [], types: [] };
    try {
      if (this.isKeyword('package')) {
        this.next();
        unit.packageName = this.parseQualifiedName();
        this.expectSemi();
      }
      while (this.isKeyword('import')) {
        const start = this.cur;
        this.next();
        const isStatic = this.eatKeyword('static');
        let name = this.parseQualifiedName();
        let wildcard = false;
        if (this.isOp('.') && this.isOp('*', 1)) {
          this.next();
          this.next();
          wildcard = true;
        } else if (name.endsWith('.*')) {
          name = name.slice(0, -2);
          wildcard = true;
        }
        this.expectSemi();
        unit.imports.push({ ...this.span(start), name, isStatic, wildcard });
      }
      while (!this.atEof()) {
        if (this.eatOp(';')) continue;
        const decl = this.parseTypeDecl();
        if (decl) unit.types.push(decl);
        else break;
      }
    } catch (e) {
      if (!(e instanceof Bail)) throw e;
    }
    return unit;
  }

  private parseQualifiedName(): string {
    let name = this.expectIdent();
    while (this.isOp('.') && (this.peek(1).kind === 'ident' || this.isOp('*', 1))) {
      this.next();
      if (this.isOp('*')) {
        this.next();
        return name + '.*';
      }
      name += '.' + this.next().text;
    }
    return name;
  }

  private parseAnnotations(): A.Annotation[] {
    const out: A.Annotation[] = [];
    while (this.isOp('@')) {
      const start = this.cur;
      this.next();
      const name = this.parseQualifiedName();
      const args: A.Annotation['args'] = [];
      if (this.eatOp('(')) {
        if (!this.isOp(')')) {
          do {
            if (this.cur.kind === 'ident' && this.isOp('=', 1)) {
              const key = this.next().text;
              this.next();
              args.push({ name: key, value: this.parseExpression() });
            } else {
              args.push({ name: null, value: this.parseExpression() });
            }
          } while (this.eatOp(','));
        }
        this.expectOp(')');
      }
      out.push({ ...this.span(start), name, args });
    }
    return out;
  }

  private parseModifiers(): string[] {
    const mods: string[] = [];
    while (this.cur.kind === 'keyword' && MODIFIERS.has(this.cur.text)) mods.push(this.next().text);
    return mods;
  }

  private parseTypeDecl(): A.TypeDecl | null {
    const annotations = this.parseAnnotations();
    const modifiers = this.parseModifiers();
    const more = this.parseAnnotations();
    annotations.push(...more);
    modifiers.push(...this.parseModifiers());

    const start = this.cur;
    let kind: A.TypeDeclKind;
    if (this.eatKeyword('class')) kind = 'class';
    else if (this.eatKeyword('interface')) kind = 'interface';
    else if (this.eatKeyword('enum')) kind = 'enum';
    else if (this.isKeyword('record')) {
      this.error(
        'unsupported.feature',
        "Nebula's Java doesn't know records yet. A plain class with fields does the same job.",
        this.span(),
      );
      throw new Bail();
    } else {
      this.error('class.expected', 'class, interface, or enum expected', this.span());
      throw new Bail();
    }

    const name = this.expectIdent();
    this.skipTypeParameters();

    let superclass: A.TypeRef | null = null;
    const interfaces: A.TypeRef[] = [];
    if (this.eatKeyword('extends')) {
      if (kind === 'interface') {
        do {
          interfaces.push(this.parseTypeRef());
        } while (this.eatOp(','));
      } else {
        superclass = this.parseTypeRef();
      }
    }
    if (this.eatKeyword('implements')) {
      do {
        interfaces.push(this.parseTypeRef());
      } while (this.eatOp(','));
    }

    const decl: A.TypeDecl = {
      ...this.span(start),
      kind,
      name,
      modifiers,
      annotations,
      superclass,
      interfaces,
      fields: [],
      methods: [],
      constructors: [],
      enumConstants: [],
      nested: [],
    };

    this.expectOp('{');

    if (kind === 'enum') {
      while (!this.isOp('}') && !this.isOp(';') && !this.atEof()) {
        this.parseAnnotations();
        const cStart = this.cur;
        const cName = this.expectIdent();
        const args: A.Expr[] = [];
        if (this.eatOp('(')) {
          if (!this.isOp(')')) {
            do {
              args.push(this.parseExpression());
            } while (this.eatOp(','));
          }
          this.expectOp(')');
        }
        if (this.isOp('{')) {
          this.error(
            'unsupported.feature',
            "Nebula's Java doesn't know enum constants with their own bodies yet.",
            this.span(),
          );
          this.skipBalancedBraces();
        }
        decl.enumConstants.push({ ...this.span(cStart), name: cName, args });
        if (!this.eatOp(',')) break;
      }
      this.eatOp(';');
    }

    while (!this.isOp('}') && !this.atEof()) {
      this.parseMember(decl);
    }
    this.expectOp('}');
    return decl;
  }

  private skipTypeParameters(): void {
    if (!this.isOp('<')) return;
    let depth = 0;
    do {
      this.splitGt();
      if (this.isOp('<')) depth++;
      else if (this.isOp('>')) depth--;
      this.next();
    } while (depth > 0 && !this.atEof());
  }

  private skipBalancedBraces(): void {
    if (!this.isOp('{')) return;
    let depth = 0;
    do {
      if (this.isOp('{')) depth++;
      else if (this.isOp('}')) depth--;
      this.next();
    } while (depth > 0 && !this.atEof());
  }

  private parseMember(owner: A.TypeDecl): void {
    if (this.eatOp(';')) return;

    const annotations = this.parseAnnotations();
    const modifiers = this.parseModifiers();
    annotations.push(...this.parseAnnotations());
    modifiers.push(...this.parseModifiers());

    if (this.isKeyword('class') || this.isKeyword('interface') || this.isKeyword('enum')) {
      // parseTypeDecl re-reads annotations and modifiers and tolerates finding none,
      // which is exactly the state we are in having just consumed them.
      const nested = this.parseTypeDecl();
      if (nested) owner.nested.push(nested);
      return;
    }

    if (this.isOp('{')) {
      this.error(
        'unsupported.feature',
        "Nebula's Java doesn't run initializer blocks yet. Put this code in the constructor.",
        this.span(),
      );
      this.skipBalancedBraces();
      return;
    }

    if (this.isOp('<')) this.skipTypeParameters();

    const start = this.cur;

    // Constructor: the owner's name followed directly by '('.
    if (this.cur.kind === 'ident' && this.cur.text === owner.name && this.isOp('(', 1)) {
      this.next();
      const params = this.parseParams();
      this.skipThrows();
      const body = this.isOp('{') ? this.parseBlock() : (this.expectSemi(), null);
      owner.constructors.push({
        ...this.span(start),
        name: owner.name,
        returnType: null,
        params,
        modifiers,
        annotations,
        body,
      });
      return;
    }

    const type = this.parseTypeRef();
    const nameTok = this.cur;
    const name = this.expectIdent();

    if (this.isOp('(')) {
      const params = this.parseParams();
      this.skipThrows();
      let body: A.Block | null = null;
      if (this.isOp('{')) body = this.parseBlock();
      else this.expectSemi();
      owner.methods.push({
        ...this.span(nameTok),
        name,
        returnType: type,
        params,
        modifiers,
        annotations,
        body,
      });
      return;
    }

    // Field, possibly several on one line.
    let first = true;
    let fieldName = name;
    for (;;) {
      if (!first) fieldName = this.expectIdent();
      if (fieldName === ERROR_NAME) break;
      let dims = 0;
      while (this.isOp('[')) {
        this.next();
        this.expectOp(']');
        dims++;
      }
      let init: A.Expr | null = null;
      if (this.eatOp('=')) init = this.isOp('{') ? this.parseArrayInit() : this.parseExpression();
      owner.fields.push({
        ...this.span(nameTok),
        name: fieldName,
        type: dims ? { ...type, dims: type.dims + dims } : type,
        modifiers,
        annotations,
        init,
      });
      first = false;
      if (!this.eatOp(',')) break;
    }
    this.expectSemi();
  }

  private skipThrows(): void {
    if (this.eatKeyword('throws')) {
      do {
        this.parseTypeRef();
      } while (this.eatOp(','));
    }
  }

  private parseParams(): A.Param[] {
    this.expectOp('(');
    const params: A.Param[] = [];
    if (!this.isOp(')')) {
      do {
        this.parseAnnotations();
        this.parseModifiers();
        const type = this.parseTypeRef();
        const varargs = this.eatOp('...');
        const tok = this.cur;
        const name = this.expectIdent();
        let dims = 0;
        while (this.isOp('[')) {
          this.next();
          this.expectOp(']');
          dims++;
        }
        params.push({
          ...this.span(tok),
          name,
          type: { ...type, dims: type.dims + dims + (varargs ? 1 : 0) },
          varargs,
        });
      } while (this.eatOp(','));
    }
    this.expectOp(')');
    return params;
  }

  private parseTypeRef(): A.TypeRef {
    const start = this.cur;
    let name: string;
    if (this.cur.kind === 'keyword' && PRIMITIVES.has(this.cur.text)) {
      name = this.next().text;
    } else {
      name = this.expectIdent('<type>');
      while (this.isOp('.') && this.peek(1).kind === 'ident') {
        this.next();
        name += '.' + this.next().text;
      }
    }
    const args: A.TypeRef[] = [];
    if (this.isOp('<')) {
      this.next();
      if (!this.isOp('>')) {
        do {
          this.splitGt();
          if (this.isOp('?')) {
            this.next();
            if (this.eatKeyword('extends') || this.eatKeyword('super')) this.parseTypeRef();
            args.push({ ...this.span(start), name: 'Object', dims: 0, args: [] });
          } else {
            args.push(this.parseTypeRef());
          }
          this.splitGt();
        } while (this.eatOp(','));
      }
      this.splitGt();
      this.expectOp('>');
    }
    let dims = 0;
    while (this.isOp('[') && this.isOp(']', 1)) {
      this.next();
      this.next();
      dims++;
    }
    return { ...this.span(start), name, dims, args };
  }

  /* ------------------------------------------------------------- statements */

  private parseBlock(): A.Block {
    const start = this.cur;
    this.expectOp('{');
    const stmts: A.Stmt[] = [];
    while (!this.isOp('}') && !this.atEof()) {
      const before = this.i;
      try {
        stmts.push(this.parseStatement());
      } catch (e) {
        if (e instanceof Bail) throw e;
        throw e;
      }
      if (this.i === before) this.synchronize();
    }
    if (this.atEof()) {
      this.error('premature.eof', 'reached end of file while parsing', this.span());
      throw new Bail();
    }
    this.expectOp('}');
    return { ...this.span(start), t: 'block', stmts };
  }

  /** Skip forward to somewhere a new statement plausibly begins. */
  private synchronize(): void {
    let depth = 0;
    while (!this.atEof()) {
      if (this.isOp('{')) depth++;
      if (this.isOp('}')) {
        if (depth === 0) return;
        depth--;
      }
      if (this.isOp(';') && depth === 0) {
        this.next();
        return;
      }
      this.next();
    }
  }

  private parseStatement(): A.Stmt {
    const start = this.cur;

    if (this.isOp('{')) return this.parseBlock();
    if (this.eatOp(';')) return { ...this.span(start), t: 'empty' };

    if (this.isKeyword('if')) {
      this.next();
      this.expectOp('(');
      const cond = this.parseExpression();
      this.expectOp(')');
      const then = this.parseStatement();
      let otherwise: A.Stmt | null = null;
      if (this.eatKeyword('else')) otherwise = this.parseStatement();
      return { ...this.span(start), t: 'if', cond, then, otherwise };
    }

    if (this.isKeyword('while')) {
      this.next();
      this.expectOp('(');
      const cond = this.parseExpression();
      this.expectOp(')');
      const body = this.parseStatement();
      return { ...this.span(start), t: 'while', cond, body };
    }

    if (this.isKeyword('do')) {
      this.next();
      const body = this.parseStatement();
      if (!this.eatKeyword('while')) this.error('expected', "'while' expected", this.span());
      this.expectOp('(');
      const cond = this.parseExpression();
      this.expectOp(')');
      this.expectSemi();
      return { ...this.span(start), t: 'doWhile', cond, body };
    }

    if (this.isKeyword('for')) return this.parseFor();

    if (this.isKeyword('return')) {
      this.next();
      const value = this.isOp(';') ? null : this.parseExpression();
      this.expectSemi();
      return { ...this.span(start), t: 'return', value };
    }

    if (this.isKeyword('break')) {
      this.next();
      const label = this.cur.kind === 'ident' ? this.next().text : null;
      this.expectSemi();
      return { ...this.span(start), t: 'break', label };
    }

    if (this.isKeyword('continue')) {
      this.next();
      const label = this.cur.kind === 'ident' ? this.next().text : null;
      this.expectSemi();
      return { ...this.span(start), t: 'continue', label };
    }

    if (this.isKeyword('throw')) {
      this.next();
      const value = this.parseExpression();
      this.expectSemi();
      return { ...this.span(start), t: 'throw', value };
    }

    if (this.isKeyword('switch')) return this.parseSwitch();

    if (this.isKeyword('try')) {
      this.error(
        'unsupported.feature',
        "Nebula's Java doesn't know try/catch yet. For this lesson, check the value with an if instead.",
        this.span(),
      );
      throw new Bail();
    }

    if (this.isKeyword('class') || this.isKeyword('enum') || this.isKeyword('interface')) {
      const decl = this.parseTypeDecl();
      if (!decl) throw new Bail();
      return { ...this.span(start), t: 'localType', decl };
    }

    if (this.isKeyword('synchronized') || this.isKeyword('assert')) {
      this.error('unsupported.feature', `Nebula's Java doesn't know '${this.cur.text}' yet.`, this.span());
      throw new Bail();
    }

    // Local variable declaration or an expression statement.
    const asDecl = this.tryParseLocalVarDecl();
    if (asDecl) return asDecl;

    const expr = this.parseExpression();
    this.expectSemi();
    return { ...this.span(start), t: 'expr', expr };
  }

  /** Speculative: `Foo bar = ...` and `int[] xs;` are declarations, `foo(bar)` is not. */
  private tryParseLocalVarDecl(): A.LocalVarDecl | null {
    const mark = this.save();
    const start = this.cur;
    const before = this.diagnostics.length;
    try {
      const modifiers = this.parseModifiers();
      if (
        this.cur.kind !== 'ident' &&
        !(this.cur.kind === 'keyword' && (PRIMITIVES.has(this.cur.text) || this.cur.text === 'var'))
      ) {
        this.restore(mark);
        return null;
      }
      const type =
        this.isKeyword('var')
          ? (this.next(), { ...this.span(start), name: 'var', dims: 0, args: [] as A.TypeRef[] })
          : this.parseTypeRef();
      if (this.cur.kind !== 'ident') {
        this.restore(mark);
        this.diagnostics.length = before;
        return null;
      }
      const decls: A.LocalVarDecl['decls'] = [];
      do {
        const tok = this.cur;
        const name = this.expectIdent();
        if (name === ERROR_NAME) break;
        let dims = 0;
        while (this.isOp('[') && this.isOp(']', 1)) {
          this.next();
          this.next();
          dims++;
        }
        let init: A.Expr | null = null;
        if (this.eatOp('=')) init = this.isOp('{') ? this.parseArrayInit() : this.parseExpression();
        decls.push({ name, dims, init, span: this.span(tok) });
      } while (this.eatOp(','));
      this.expectSemi();
      return { ...this.span(start), t: 'localVar', type, decls, modifiers };
    } catch (e) {
      if (e instanceof Bail) throw e;
      this.restore(mark);
      this.diagnostics.length = before;
      return null;
    }
  }

  private parseFor(): A.Stmt {
    const start = this.cur;
    this.next();
    this.expectOp('(');

    // Enhanced for: `for (Type name : iterable)`.
    const mark = this.save();
    const before = this.diagnostics.length;
    try {
      this.parseModifiers();
      const varType = this.parseTypeRef();
      if (this.cur.kind === 'ident' && this.isOp(':', 1)) {
        const varName = this.next().text;
        this.next();
        const iterable = this.parseExpression();
        this.expectOp(')');
        const body = this.parseStatement();
        return { ...this.span(start), t: 'forEach', varType, varName, iterable, body };
      }
    } catch (e) {
      if (e instanceof Bail) throw e;
    }
    this.restore(mark);
    this.diagnostics.length = before;

    const init: A.Stmt[] = [];
    if (!this.isOp(';')) {
      const decl = this.tryParseLocalVarDecl();
      if (decl) {
        init.push(decl);
      } else {
        do {
          const e = this.parseExpression();
          init.push({ ...this.span(start), t: 'expr', expr: e });
        } while (this.eatOp(','));
        this.expectSemi();
      }
    } else {
      this.next();
    }

    const cond = this.isOp(';') ? null : this.parseExpression();
    this.expectSemi();

    const update: A.Expr[] = [];
    if (!this.isOp(')')) {
      do {
        update.push(this.parseExpression());
      } while (this.eatOp(','));
    }
    this.expectOp(')');
    const body = this.parseStatement();
    return { ...this.span(start), t: 'for', init, cond, update, body };
  }

  private parseSwitch(): A.Stmt {
    const start = this.cur;
    this.next();
    this.expectOp('(');
    const subject = this.parseExpression();
    this.expectOp(')');
    this.expectOp('{');
    const cases: A.SwitchCase[] = [];
    while (!this.isOp('}') && !this.atEof()) {
      const cStart = this.cur;
      const labels: A.Expr[] = [];
      let isDefault = false;
      if (this.eatKeyword('default')) {
        isDefault = true;
      } else if (this.eatKeyword('case')) {
        do {
          labels.push(this.parseTernary());
        } while (this.eatOp(','));
      } else {
        this.error('expected', "'case', 'default', or '}' expected", this.span());
        throw new Bail();
      }
      const arrow = this.isOp('->');
      if (arrow) this.next();
      else this.expectOp(':');

      const stmts: A.Stmt[] = [];
      if (arrow) {
        stmts.push(this.parseStatement());
      } else {
        while (
          !this.isOp('}') &&
          !this.isKeyword('case') &&
          !this.isKeyword('default') &&
          !this.atEof()
        ) {
          const before = this.i;
          stmts.push(this.parseStatement());
          if (this.i === before) this.synchronize();
        }
      }
      cases.push({ ...this.span(cStart), labels: isDefault ? [] : labels, stmts, arrow });
    }
    this.expectOp('}');
    return { ...this.span(start), t: 'switch', subject, cases };
  }

  /* ------------------------------------------------------------ expressions */

  parseExpression(): A.Expr {
    return this.parseAssignment();
  }

  private parseAssignment(): A.Expr {
    const left = this.parseTernary();
    if (this.cur.kind === 'op' && ASSIGN_OPS.has(this.cur.text)) {
      const op = this.next().text;
      const value = this.parseAssignment();
      return { line: left.line, column: left.column, length: left.length, t: 'assign', op, target: left, value };
    }
    return left;
  }

  private parseTernary(): A.Expr {
    const cond = this.parseBinary(0);
    if (this.eatOp('?')) {
      const then = this.parseAssignment();
      this.expectOp(':');
      const otherwise = this.parseAssignment();
      return { line: cond.line, column: cond.column, length: cond.length, t: 'ternary', cond, then, otherwise };
    }
    return cond;
  }

  /* Lowest to highest. `instanceof` sits with the relational operators. */
  private static readonly LEVELS: string[][] = [
    ['||'],
    ['&&'],
    ['|'],
    ['^'],
    ['&'],
    ['==', '!='],
    ['<', '>', '<=', '>=', 'instanceof'],
    ['<<', '>>', '>>>'],
    ['+', '-'],
    ['*', '/', '%'],
  ];

  private parseBinary(level: number): A.Expr {
    if (level >= Parser.LEVELS.length) return this.parseUnary();
    const ops = Parser.LEVELS[level]!;
    let left = this.parseBinary(level + 1);
    for (;;) {
      if (ops.includes('instanceof') && this.isKeyword('instanceof')) {
        this.next();
        const type = this.parseTypeRef();
        if (this.cur.kind === 'ident') this.next(); // pattern variable, parsed and ignored
        left = { line: left.line, column: left.column, length: left.length, t: 'instanceOf', operand: left, type };
        continue;
      }
      const t = this.cur;
      if (t.kind !== 'op' || !ops.includes(t.text)) break;
      // Do not eat the '>' that closes a generic argument list.
      this.next();
      const right = this.parseBinary(level + 1);
      left = { line: left.line, column: left.column, length: left.length, t: 'binary', op: t.text, left, right };
    }
    return left;
  }

  private parseUnary(): A.Expr {
    const start = this.cur;

    if (this.isOp('+') || this.isOp('-') || this.isOp('!') || this.isOp('~')) {
      const op = this.next().text;
      const operand = this.parseUnary();
      return { ...this.span(start), t: 'unary', op, operand };
    }
    if (this.isOp('++') || this.isOp('--')) {
      const op = this.next().text as '++' | '--';
      const operand = this.parseUnary();
      return { ...this.span(start), t: 'prefix', op, operand };
    }
    if (this.isOp('(') && this.looksLikeCast()) {
      this.next();
      const type = this.parseTypeRef();
      this.expectOp(')');
      const operand = this.parseUnary();
      return { ...this.span(start), t: 'cast', type, operand };
    }
    return this.parsePostfix();
  }

  private looksLikeCast(): boolean {
    const mark = this.save();
    const before = this.diagnostics.length;
    try {
      this.next(); // '('
      if (this.cur.kind === 'keyword' && PRIMITIVES.has(this.cur.text)) {
        this.parseTypeRef();
        const ok = this.isOp(')');
        this.restore(mark);
        return ok;
      }
      if (this.cur.kind !== 'ident') {
        this.restore(mark);
        return false;
      }
      this.parseTypeRef();
      if (!this.isOp(')')) {
        this.restore(mark);
        return false;
      }
      this.next(); // ')'
      // `(Name) x`, `(Name) this`, `(Name) new ...`, `(Name) (y)` are casts.
      // `(a) + b` and `(a) . b` are not.
      const t = this.cur;
      const isCast =
        t.kind === 'ident' ||
        t.kind === 'string' ||
        t.kind === 'char' ||
        (t.kind === 'keyword' && ['this', 'new', 'true', 'false', 'null'].includes(t.text)) ||
        (t.kind === 'op' && (t.text === '(' || t.text === '!' || t.text === '~'));
      this.restore(mark);
      return isCast;
    } catch (e) {
      if (e instanceof Bail) {
        this.restore(mark);
        this.diagnostics.length = before;
        return false;
      }
      this.restore(mark);
      this.diagnostics.length = before;
      return false;
    }
  }

  private parsePostfix(): A.Expr {
    let expr = this.parsePrimary();
    for (;;) {
      if (this.isOp('.')) {
        // `.class` is handled in parsePrimary via the type path; here it is a member.
        this.next();
        if (this.isKeyword('class')) {
          // `DcMotor.class` — the only generic token the subset needs, used by
          // hardwareMap.get(DcMotor.class, "name") in every Tier 3+ lesson.
          const kw = this.next();
          const name = exprToTypeName(expr);
          if (name === null) {
            this.error('illegal.start.of.expression', 'illegal start of expression', this.span(kw));
            throw new Bail();
          }
          expr = {
            line: expr.line,
            column: expr.column,
            length: expr.length,
            t: 'classLit',
            type: { line: expr.line, column: expr.column, length: expr.length, name, dims: 0, args: [] },
          };
          continue;
        }
        if (this.isKeyword('this')) {
          this.error(
            'unsupported.feature',
            "Nebula's Java doesn't know Outer.this yet. Pass the value in as a parameter instead.",
            this.span(),
          );
          throw new Bail();
        }
        if (this.isKeyword('new')) {
          this.error('unsupported.feature', "Nebula's Java doesn't know inner-class creation yet.", this.span());
          throw new Bail();
        }
        if (this.isOp('<')) this.skipTypeParameters();
        const nameTok = this.cur;
        const name = this.expectIdent();
        if (this.isOp('(')) {
          const args = this.parseArgs();
          expr = { line: expr.line, column: expr.column, length: expr.length, t: 'call', target: expr, name, args };
        } else {
          expr = {
            line: nameTok.line,
            column: nameTok.column,
            length: Math.max(1, nameTok.length),
            t: 'field',
            target: expr,
            name,
          };
        }
        continue;
      }
      if (this.isOp('[')) {
        this.next();
        const index = this.parseExpression();
        this.expectOp(']');
        expr = { line: expr.line, column: expr.column, length: expr.length, t: 'index', target: expr, index };
        continue;
      }
      if (this.isOp('++') || this.isOp('--')) {
        const op = this.next().text as '++' | '--';
        expr = { line: expr.line, column: expr.column, length: expr.length, t: 'postfix', op, operand: expr };
        continue;
      }
      if (this.isOp('->')) {
        this.error(
          'unsupported.feature',
          "Nebula's Java doesn't know lambdas yet. For this lesson, a plain method will do what you want.",
          this.span(),
        );
        throw new Bail();
      }
      return expr;
    }
  }

  private parseArgs(): A.Expr[] {
    this.expectOp('(');
    const args: A.Expr[] = [];
    if (!this.isOp(')')) {
      do {
        args.push(this.parseExpression());
      } while (this.eatOp(','));
    }
    this.expectOp(')');
    return args;
  }

  private parseArrayInit(): A.ArrayInitExpr {
    const start = this.cur;
    this.expectOp('{');
    const items: A.Expr[] = [];
    if (!this.isOp('}')) {
      do {
        if (this.isOp('}')) break; // trailing comma
        items.push(this.isOp('{') ? this.parseArrayInit() : this.parseExpression());
      } while (this.eatOp(','));
    }
    this.expectOp('}');
    return { ...this.span(start), t: 'arrayInit', items };
  }

  private parsePrimary(): A.Expr {
    const t = this.cur;
    const start = this.span(t);

    switch (t.kind) {
      case 'int':
      case 'long':
      case 'double':
      case 'float':
        this.next();
        return { ...start, t: 'literal', kind: t.kind, value: t.value as number, raw: t.text };
      case 'char':
        this.next();
        return { ...start, t: 'literal', kind: 'char', value: t.value as string, raw: `'${t.text}'` };
      case 'string':
        this.next();
        return { ...start, t: 'literal', kind: 'string', value: t.value as string, raw: t.text };
      case 'ident': {
        this.next();
        if (this.isOp('(')) {
          const args = this.parseArgs();
          return { ...start, t: 'call', target: null, name: t.text, args };
        }
        return { ...start, t: 'name', name: t.text };
      }
      case 'keyword':
        break;
      default:
        break;
    }

    if (t.kind === 'keyword') {
      switch (t.text) {
        case 'true':
        case 'false':
          this.next();
          return { ...start, t: 'literal', kind: 'boolean', value: t.text === 'true', raw: t.text };
        case 'null':
          this.next();
          return { ...start, t: 'literal', kind: 'null', value: null, raw: 'null' };
        case 'this':
          this.next();
          if (this.isOp('(')) {
            const args = this.parseArgs();
            return { ...start, t: 'call', target: null, name: 'this', args };
          }
          return { ...start, t: 'this' };
        case 'super':
          this.next();
          if (this.isOp('(')) {
            const args = this.parseArgs();
            return { ...start, t: 'call', target: null, name: 'super', args };
          }
          return { ...start, t: 'super' };
        case 'new':
          return this.parseNew();
        default:
          if (PRIMITIVES.has(t.text)) {
            // `int.class`, and the `double` in `(double) x` when it reaches here.
            const type = this.parseTypeRef();
            if (this.eatOp('.') && this.eatKeyword('class')) {
              return { ...start, t: 'classLit', type };
            }
            return { ...start, t: 'classLit', type };
          }
      }
    }

    if (this.isOp('(')) {
      this.next();
      const inner = this.parseExpression();
      this.expectOp(')');
      return inner;
    }

    if (this.atEof()) {
      this.error('premature.eof', 'reached end of file while parsing', start);
      throw new Bail();
    }

    this.error('illegal.start.of.expression', 'illegal start of expression', start);
    this.next();
    return { ...start, t: 'literal', kind: 'null', value: null, raw: '<error>' };
  }

  private parseNew(): A.Expr {
    const start = this.span(this.cur);
    this.next(); // 'new'
    const type = this.parseTypeRefNoDims();

    if (this.isOp('[')) {
      const sizes: A.Expr[] = [];
      let extraDims = 0;
      while (this.isOp('[')) {
        this.next();
        if (this.isOp(']')) {
          this.next();
          extraDims++;
        } else {
          sizes.push(this.parseExpression());
          this.expectOp(']');
        }
      }
      let init: A.ArrayInitExpr | null = null;
      if (this.isOp('{')) init = this.parseArrayInit();
      return { ...start, t: 'newArray', type, sizes, extraDims, init };
    }

    const args = this.parseArgs();
    if (this.isOp('{')) {
      this.error(
        'unsupported.feature',
        "Nebula's Java doesn't know anonymous classes yet. Make a named class instead.",
        this.span(),
      );
      throw new Bail();
    }
    return { ...start, t: 'new', type, args };
  }

  /** `new int[3]` must not let parseTypeRef swallow the `[3]`. */
  private parseTypeRefNoDims(): A.TypeRef {
    const start = this.cur;
    let name: string;
    if (this.cur.kind === 'keyword' && PRIMITIVES.has(this.cur.text)) {
      name = this.next().text;
    } else {
      name = this.expectIdent('<type>');
      while (this.isOp('.') && this.peek(1).kind === 'ident') {
        this.next();
        name += '.' + this.next().text;
      }
    }
    const args: A.TypeRef[] = [];
    if (this.isOp('<')) {
      this.next();
      if (!this.isOp('>')) {
        do {
          this.splitGt();
          args.push(this.parseTypeRef());
          this.splitGt();
        } while (this.eatOp(','));
      }
      this.splitGt();
      this.expectOp('>');
    }
    return { ...this.span(start), name, dims: 0, args };
  }
}
