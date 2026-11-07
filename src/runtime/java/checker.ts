import type * as A from './ast';
import { diag, type Diagnostic } from './diagnostics';
import { PRIMITIVE_TYPES } from './values';
import { findNativeClass, nativeFields, nativeMethods, nativeExtends } from '../../ftc-mock/registry';
import { STRING_METHODS } from '../../ftc-mock/javalang';
import { typeKey } from './interpreter';

/* A conservative resolver and type checker.

   javac reports an unknown name before running anything, and Tier 0 lessons 02 and 03
   are built entirely on a kid reading that message. So misspellings have to be caught
   here, not at the moment the line happens to execute.

   The rule this file follows without exception: when it cannot work a type out, it
   returns UNKNOWN and says nothing. A false "cannot find symbol" on correct code would
   teach a kid to distrust the compiler, which is far worse than missing a real error
   that the interpreter will report a moment later anyway. */

const UNKNOWN = '?';

const BUILTIN_TYPES = new Set([
  'String', 'Object', 'CharSequence', 'Class', 'Integer', 'Double', 'Boolean',
  'Character', 'Long', 'Float', 'Number', 'Math', 'System', 'Exception',
  'RuntimeException', 'IllegalArgumentException', 'InterruptedException', 'Throwable',
]);

interface Scope {
  vars: Map<string, string>;
  parent: Scope | null;
}

const lookup = (scope: Scope | null, name: string): string | undefined => {
  let s = scope;
  while (s) {
    const t = s.vars.get(name);
    if (t !== undefined) return t;
    s = s.parent;
  }
  return undefined;
};

export function check(unit: A.CompilationUnit): Diagnostic[] {
  return new Checker(unit).run();
}

class Checker {
  private out: Diagnostic[] = [];
  private classes = new Map<string, A.TypeDecl>();
  /** Simple names brought in by imports, so `DcMotor` is known from its import. */
  private imported = new Set<string>();

  constructor(private unit: A.CompilationUnit) {
    for (const t of unit.types) this.register(t);
    for (const i of unit.imports) {
      const tail = i.name.split('.').pop();
      if (tail && tail !== '*') this.imported.add(tail);
    }
  }

  private register(t: A.TypeDecl): void {
    this.classes.set(t.name, t);
    for (const n of t.nested) this.register(n);
  }

  run(): Diagnostic[] {
    for (const t of this.classes.values()) this.checkType(t);
    return this.out.slice(0, 12);
  }

  private report(
    code: Parameters<typeof diag>[0],
    message: string,
    at: A.Span,
    extra: Partial<Diagnostic> = {},
  ): void {
    if (this.out.some((d) => d.line === at.line && d.column === at.column)) return;
    this.out.push(diag(code, message, { line: at.line, column: at.column, length: at.length }, extra));
  }

  /* --------------------------------------------------------------- types */

  private isKnownType(name: string): boolean {
    const simple = name.split('.').pop() ?? name;
    return (
      PRIMITIVE_TYPES.has(simple) ||
      simple === 'var' ||
      BUILTIN_TYPES.has(simple) ||
      this.classes.has(simple) ||
      this.imported.has(simple) ||
      findNativeClass(name) !== undefined ||
      findNativeClass(simple) !== undefined
    );
  }

  private checkTypeRef(t: A.TypeRef, where: string): void {
    if (!this.isKnownType(t.name)) {
      this.report('cant.resolve', 'cannot find symbol', t, {
        symbol: t.name,
        detail: [`  symbol:   class ${t.name}`, `  location: ${where}`],
      });
    }
    for (const a of t.args) this.checkTypeRef(a, where);
  }

  private checkType(t: A.TypeDecl): void {
    const where = `class ${t.name}`;
    if (t.superclass) this.checkTypeRef(t.superclass, where);
    for (const i of t.interfaces) this.checkTypeRef(i, where);

    const statics: Scope = { vars: new Map(), parent: null };
    const instance: Scope = { vars: new Map(), parent: statics };

    // Fields of this class and every user superclass.
    for (const cls of this.userChain(t)) {
      for (const f of cls.decl.fields) {
        (f.modifiers.includes('static') ? statics : instance).vars.set(f.name, typeKey(f.type));
      }
      if (cls.decl.kind === 'enum') {
        for (const c of cls.decl.enumConstants) statics.vars.set(c.name, cls.decl.name);
      }
    }
    // Fields inherited from the mocked SDK: hardwareMap, telemetry, gamepad1, gamepad2.
    for (const f of this.inheritedNativeFields(t)) instance.vars.set(f.name, f.type);

    for (const f of t.fields) {
      this.checkTypeRef(f.type, where);
      if (f.init) {
        const got = this.infer(f.init, f.modifiers.includes('static') ? statics : instance, t);
        this.checkAssignable(got, typeKey(f.type), f.init);
      }
    }

    for (const m of [...t.methods, ...t.constructors]) {
      if (m.returnType) this.checkTypeRef(m.returnType, where);
      const scope: Scope = {
        vars: new Map(),
        parent: m.modifiers.includes('static') ? statics : instance,
      };
      for (const p of m.params) {
        this.checkTypeRef(p.type, where);
        scope.vars.set(p.name, typeKey(p.type));
      }
      if (m.body) {
        this.checkBlock(m.body, scope, t);
        const rt = m.returnType ? typeKey(m.returnType) : 'void';
        if (rt !== 'void' && !alwaysReturns(m.body)) {
          this.report('missing.ret.stmt', 'missing return statement', {
            line: m.body.line + countLines(m.body),
            column: 1,
            length: 1,
          });
        }
      }
    }
  }

  private userChain(t: A.TypeDecl): { decl: A.TypeDecl }[] {
    const out: { decl: A.TypeDecl }[] = [];
    let cur: A.TypeDecl | undefined = t;
    const seen = new Set<string>();
    while (cur && !seen.has(cur.name)) {
      seen.add(cur.name);
      out.push({ decl: cur });
      cur = cur.superclass ? this.classes.get(cur.superclass.name) : undefined;
    }
    return out;
  }

  /** The first native ancestor's fields, reached through any user classes between. */
  private inheritedNativeFields(t: A.TypeDecl) {
    const chain = this.userChain(t);
    const last = chain[chain.length - 1]!.decl;
    const sup = last.superclass?.name;
    if (!sup || this.classes.has(sup)) return [];
    const native = findNativeClass(sup);
    return native ? nativeFields(native) : [];
  }

  private nativeAncestor(t: A.TypeDecl) {
    const chain = this.userChain(t);
    const last = chain[chain.length - 1]!.decl;
    const sup = last.superclass?.name;
    if (!sup || this.classes.has(sup)) return undefined;
    return findNativeClass(sup);
  }

  /* ---------------------------------------------------------- statements */

  private checkBlock(b: A.Block, parent: Scope, cls: A.TypeDecl): void {
    const scope: Scope = { vars: new Map(), parent };
    for (const s of b.stmts) this.checkStmt(s, scope, cls);
  }

  private checkStmt(s: A.Stmt, scope: Scope, cls: A.TypeDecl): void {
    switch (s.t) {
      case 'block':
        this.checkBlock(s, scope, cls);
        return;
      case 'empty':
      case 'break':
      case 'continue':
      case 'localType':
        return;
      case 'localVar': {
        this.checkTypeRef(s.type, `class ${cls.name}`);
        for (const d of s.decls) {
          const declared = typeKey(s.type) + '[]'.repeat(d.dims);
          if (d.init) {
            const got = this.infer(d.init, scope, cls);
            if (declared !== 'var') this.checkAssignable(got, declared, d.init);
            scope.vars.set(d.name, declared === 'var' ? got : declared);
          } else {
            scope.vars.set(d.name, declared);
          }
        }
        return;
      }
      case 'expr':
        this.infer(s.expr, scope, cls);
        return;
      case 'if':
        this.infer(s.cond, scope, cls);
        this.checkStmt(s.then, { vars: new Map(), parent: scope }, cls);
        if (s.otherwise) this.checkStmt(s.otherwise, { vars: new Map(), parent: scope }, cls);
        return;
      case 'while':
      case 'doWhile':
        this.infer(s.cond, scope, cls);
        this.checkStmt(s.body, { vars: new Map(), parent: scope }, cls);
        return;
      case 'for': {
        const inner: Scope = { vars: new Map(), parent: scope };
        for (const i of s.init) this.checkStmt(i, inner, cls);
        if (s.cond) this.infer(s.cond, inner, cls);
        for (const u of s.update) this.infer(u, inner, cls);
        this.checkStmt(s.body, { vars: new Map(), parent: inner }, cls);
        return;
      }
      case 'forEach': {
        this.checkTypeRef(s.varType, `class ${cls.name}`);
        this.infer(s.iterable, scope, cls);
        const inner: Scope = { vars: new Map(), parent: scope };
        inner.vars.set(s.varName, typeKey(s.varType));
        this.checkStmt(s.body, inner, cls);
        return;
      }
      case 'return':
        if (s.value) this.infer(s.value, scope, cls);
        return;
      case 'throw':
        this.infer(s.value, scope, cls);
        return;
      case 'switch': {
        const subject = this.infer(s.subject, scope, cls);
        const inner: Scope = { vars: new Map(), parent: scope };
        // `case DRIVE:` names an enum constant, not a variable in scope.
        const enumDecl = this.classes.get(subject);
        const enumNames = new Set(
          enumDecl?.kind === 'enum'
            ? enumDecl.enumConstants.map((c) => c.name)
            : (findNativeClass(subject)?.enumConstants ?? []),
        );
        for (const c of s.cases) {
          for (const label of c.labels) {
            if (label.t === 'name' && enumNames.has(label.name)) continue;
            this.infer(label, inner, cls);
          }
          for (const st of c.stmts) this.checkStmt(st, inner, cls);
        }
        return;
      }
    }
  }

  /* --------------------------------------------------------- expressions */

  private infer(e: A.Expr, scope: Scope, cls: A.TypeDecl): string {
    switch (e.t) {
      case 'literal':
        switch (e.kind) {
          case 'int': return 'int';
          case 'long': return 'long';
          case 'double': return 'double';
          case 'float': return 'float';
          case 'char': return 'char';
          case 'boolean': return 'boolean';
          case 'string': return 'String';
          case 'null': return UNKNOWN;
        }
        return UNKNOWN;

      case 'this':
      case 'super':
        return cls.name;

      case 'name': {
        const t = lookup(scope, e.name);
        if (t !== undefined) return t;
        if (this.isKnownType(e.name)) return UNKNOWN; // a class used as a qualifier
        this.report('cant.resolve', 'cannot find symbol', e, {
          symbol: e.name,
          detail: [`  symbol:   variable ${e.name}`, `  location: class ${cls.name}`],
        });
        return UNKNOWN;
      }

      case 'classLit':
        return 'Class';

      case 'cast':
        this.checkTypeRef(e.type, `class ${cls.name}`);
        this.infer(e.operand, scope, cls);
        return typeKey(e.type);

      case 'instanceOf':
        this.infer(e.operand, scope, cls);
        return 'boolean';

      case 'ternary': {
        this.infer(e.cond, scope, cls);
        const a = this.infer(e.then, scope, cls);
        const b = this.infer(e.otherwise, scope, cls);
        return a === b ? a : UNKNOWN;
      }

      case 'unary': {
        const t = this.infer(e.operand, scope, cls);
        return e.op === '!' ? 'boolean' : t;
      }

      case 'prefix':
      case 'postfix':
        return this.infer(e.operand, scope, cls);

      case 'binary': {
        const a = this.infer(e.left, scope, cls);
        const b = this.infer(e.right, scope, cls);
        if (['==', '!=', '<', '>', '<=', '>=', '&&', '||'].includes(e.op)) return 'boolean';
        if (e.op === '+' && (a === 'String' || b === 'String')) return 'String';
        return promoteStatic(a, b);
      }

      case 'assign': {
        const target = this.infer(e.target, scope, cls);
        const value = this.infer(e.value, scope, cls);
        if (e.op === '=') this.checkAssignable(value, target, e.value);
        return target;
      }

      case 'index': {
        const t = this.infer(e.target, scope, cls);
        this.infer(e.index, scope, cls);
        return t.endsWith('[]') ? t.slice(0, -2) : UNKNOWN;
      }

      case 'arrayInit':
        for (const i of e.items) this.infer(i, scope, cls);
        return UNKNOWN;

      case 'newArray':
        this.checkTypeRef(e.type, `class ${cls.name}`);
        for (const s of e.sizes) this.infer(s, scope, cls);
        if (e.init) for (const i of e.init.items) this.infer(i, scope, cls);
        return typeKey(e.type) + '[]'.repeat(e.sizes.length + e.extraDims);

      case 'new': {
        this.checkTypeRef(e.type, `class ${cls.name}`);
        for (const a of e.args) this.infer(a, scope, cls);
        return typeKey(e.type);
      }

      case 'field':
        return this.inferField(e, scope, cls);

      case 'call':
        return this.inferCall(e, scope, cls);
    }
  }

  private inferField(e: A.FieldAccess, scope: Scope, cls: A.TypeDecl): string {
    if (e.name === 'length') {
      const t = this.infer(e.target, scope, cls);
      if (t.endsWith('[]')) return 'int';
      if (t === UNKNOWN) return UNKNOWN;
    }

    // Static access through a class name, including nested names like DcMotor.RunMode.
    const dotted = flattenDotted(e);
    if (dotted) {
      const owner = dotted.slice(0, -1).join('.');
      const member = dotted[dotted.length - 1]!;
      if (!lookup(scope, dotted[0]!)) {
        const native = findNativeClass(owner);
        if (native) {
          if (native.enumConstants?.includes(member)) return native.simple;
          const f = nativeFields(native).find((x) => x.name === member);
          if (f) return f.type;
          // A nested type name used as a qualifier, e.g. DcMotor.RunMode in a declaration.
          if (findNativeClass(`${owner}.${member}`)) return UNKNOWN;
          return UNKNOWN;
        }
        const user = this.classes.get(owner);
        if (user) {
          const f = user.fields.find((x) => x.name === member);
          if (f) return typeKey(f.type);
          if (user.kind === 'enum' && user.enumConstants.some((c) => c.name === member)) return user.name;
          this.report('cant.resolve', 'cannot find symbol', e, {
            symbol: member,
            detail: [`  symbol:   variable ${member}`, `  location: class ${owner}`],
          });
          return UNKNOWN;
        }
      }
    }

    const targetType = this.infer(e.target, scope, cls);
    if (targetType === UNKNOWN) return UNKNOWN;
    if (targetType.endsWith('[]')) return e.name === 'length' ? 'int' : UNKNOWN;

    const user = this.classes.get(targetType);
    if (user) {
      for (const c of this.userChain(user)) {
        const f = c.decl.fields.find((x) => x.name === e.name);
        if (f) return typeKey(f.type);
      }
      const inherited = this.inheritedNativeFields(user).find((f) => f.name === e.name);
      if (inherited) return inherited.type;
      this.report('cant.resolve', 'cannot find symbol', e, {
        symbol: e.name,
        detail: [`  symbol:   variable ${e.name}`, `  location: class ${targetType}`],
      });
      return UNKNOWN;
    }

    const native = findNativeClass(targetType);
    if (native) {
      const f = nativeFields(native).find((x) => x.name === e.name);
      if (f) return f.type;
      if (native.enumConstants?.includes(e.name)) return native.simple;
      this.report('cant.resolve', 'cannot find symbol', e, {
        symbol: e.name,
        detail: [`  symbol:   variable ${e.name}`, `  location: class ${native.simple}`],
      });
      return UNKNOWN;
    }

    return UNKNOWN;
  }

  private inferCall(e: A.CallExpr, scope: Scope, cls: A.TypeDecl): string {
    for (const a of e.args) this.infer(a, scope, cls);

    if (!e.target) {
      if (e.name === 'this' || e.name === 'super') return UNKNOWN;
      // A method on this class or a user superclass.
      for (const c of this.userChain(cls)) {
        const hits = c.decl.methods.filter((m) => m.name === e.name);
        if (hits.length) return this.arity(hits, e, c.decl.name);
      }
      // A method inherited from the mocked SDK, e.g. sleep() inside a LinearOpMode.
      const native = this.nativeAncestor(cls);
      if (native) {
        const hits = nativeMethods(native).filter((m) => m.name === e.name);
        if (hits.length) return hits[0]!.returns;
      }
      this.report('cant.resolve', 'cannot find symbol', e, {
        symbol: e.name,
        detail: [
          `  symbol:   method ${e.name}(${e.args.length ? '...' : ''})`,
          `  location: class ${cls.name}`,
        ],
      });
      return UNKNOWN;
    }

    // Static call through a class name.
    if (e.target.t === 'name' && !lookup(scope, e.target.name)) {
      const user = this.classes.get(e.target.name);
      if (user) {
        const hits = user.methods.filter((m) => m.name === e.name);
        if (hits.length) return this.arity(hits, e, user.name);
        if (user.kind === 'enum' && (e.name === 'values' || e.name === 'valueOf')) {
          return e.name === 'values' ? `${user.name}[]` : user.name;
        }
      }
      const native = findNativeClass(e.target.name);
      if (native) {
        const hits = nativeMethods(native).filter((m) => m.name === e.name);
        if (hits.length) return hits[0]!.returns;
        if (this.isKnownType(e.target.name) && !user) {
          this.report('cant.resolve.method', 'cannot find symbol', e, {
            symbol: e.name,
            detail: [`  symbol:   method ${e.name}(...)`, `  location: class ${native.simple}`],
          });
          return UNKNOWN;
        }
      }
    }

    const targetType = this.infer(e.target, scope, cls);
    if (targetType === UNKNOWN) return UNKNOWN;

    if (targetType === 'String') {
      const overloads = STRING_METHODS[e.name];
      if (overloads?.length) return overloads[0]!.returns;
      this.report('cant.resolve.method', 'cannot find symbol', e, {
        symbol: e.name,
        detail: [`  symbol:   method ${e.name}(...)`, '  location: class String'],
      });
      return UNKNOWN;
    }

    const user = this.classes.get(targetType);
    if (user) {
      for (const c of this.userChain(user)) {
        const hits = c.decl.methods.filter((m) => m.name === e.name);
        if (hits.length) return this.arity(hits, e, c.decl.name);
      }
      const native = this.nativeAncestor(user);
      if (native) {
        const hits = nativeMethods(native).filter((m) => m.name === e.name);
        if (hits.length) return hits[0]!.returns;
      }
      if (user.kind === 'enum' && ['name', 'ordinal', 'toString', 'compareTo', 'equals'].includes(e.name)) {
        return e.name === 'ordinal' || e.name === 'compareTo' ? 'int' : e.name === 'equals' ? 'boolean' : 'String';
      }
      this.report('cant.resolve.method', 'cannot find symbol', e, {
        symbol: e.name,
        detail: [`  symbol:   method ${e.name}(...)`, `  location: class ${targetType}`],
      });
      return UNKNOWN;
    }

    const native = findNativeClass(targetType);
    if (native) {
      const hits = nativeMethods(native).filter((m) => m.name === e.name);
      if (hits.length) return this.arity2(hits, e, native.simple);
      if (native.enumConstants && ['name', 'ordinal', 'toString', 'equals'].includes(e.name)) return UNKNOWN;
      this.report('cant.resolve.method', 'cannot find symbol', e, {
        symbol: e.name,
        detail: [`  symbol:   method ${e.name}(...)`, `  location: ${kindWord(native.kind)} ${native.simple}`],
      });
      return UNKNOWN;
    }

    return UNKNOWN;
  }

  /** Reports a wrong number of arguments to a user method and returns its type. */
  private arity(hits: A.MethodDecl[], e: A.CallExpr, owner: string): string {
    const fits = hits.filter(
      (m) => m.params.length === e.args.length || m.params.some((p) => p.varargs),
    );
    if (!fits.length) {
      const one = hits[0]!;
      this.report(
        'arg.length.mismatch',
        `method ${e.name} in class ${owner} cannot be applied to given types`,
        e,
        {
          symbol: e.name,
          detail: [
            `  required: ${one.params.map((p) => typeKey(p.type)).join(',') || 'no arguments'}`,
            `  found:    ${e.args.length} argument${e.args.length === 1 ? '' : 's'}`,
            '  reason: actual and formal argument lists differ in length',
          ],
        },
      );
      return one.returnType ? typeKey(one.returnType) : 'void';
    }
    return fits[0]!.returnType ? typeKey(fits[0]!.returnType) : 'void';
  }

  /** The same, for a mocked SDK method. */
  private arity2(hits: ReturnType<typeof nativeMethods>, e: A.CallExpr, owner: string): string {
    const fits = hits.filter((m) => m.params.length === e.args.length || m.varargs);
    if (!fits.length) {
      const one = hits[0]!;
      this.report(
        'arg.length.mismatch',
        `method ${e.name} in class ${owner} cannot be applied to given types`,
        e,
        {
          symbol: e.name,
          detail: [
            `  required: ${one.params.join(',') || 'no arguments'}`,
            `  found:    ${e.args.length} argument${e.args.length === 1 ? '' : 's'}`,
            '  reason: actual and formal argument lists differ in length',
          ],
        },
      );
      return one.returns;
    }
    return fits[0]!.returns;
  }

  /* ------------------------------------------------------------ assignment */

  private checkAssignable(from: string, to: string, at: A.Span): void {
    if (from === UNKNOWN || to === UNKNOWN || !to || to === 'var' || to === 'Object') return;
    if (from === to) return;
    if (assignable(from, to)) return;
    // Only speak up when both sides are types we are sure about.
    if (!this.isKnownType(from) || !this.isKnownType(to)) return;
    if (!PRIMITIVE_TYPES.has(from) && !PRIMITIVE_TYPES.has(to) && from !== 'String' && to !== 'String') {
      // Two reference types: let the class hierarchy decide, and stay quiet unless clear.
      if (this.referenceCompatible(from, to)) return;
    }
    this.report(
      'incompatible.types',
      `incompatible types: ${from} cannot be converted to ${to}`,
      at,
      { found: from, expected: to },
    );
  }

  private referenceCompatible(from: string, to: string): boolean {
    if (from === to) return true;
    const user = this.classes.get(from);
    if (user) {
      for (const c of this.userChain(user)) {
        if (c.decl.name === to) return true;
        if (c.decl.interfaces.some((i) => i.name === to)) return true;
      }
      const native = this.nativeAncestor(user);
      if (native && nativeExtends(native.simple, to)) return true;
      return false;
    }
    if (findNativeClass(from) && findNativeClass(to)) return nativeExtends(from, to);
    return true; // unknown shape: stay quiet
  }
}

/* ------------------------------------------------------------- utilities */

const WIDENS: Record<string, string[]> = {
  byte: ['short', 'int', 'long', 'float', 'double'],
  short: ['int', 'long', 'float', 'double'],
  char: ['int', 'long', 'float', 'double'],
  int: ['long', 'float', 'double'],
  long: ['float', 'double'],
  float: ['double'],
};

function assignable(from: string, to: string): boolean {
  if (from === to) return true;
  if (WIDENS[from]?.includes(to)) return true;
  if (to === 'Object') return true;
  // Everything boxes to its wrapper.
  const box: Record<string, string> = {
    int: 'Integer', double: 'Double', boolean: 'Boolean', char: 'Character',
    long: 'Long', float: 'Float',
  };
  if (box[from] === to) return true;
  if (box[to] === from) return true;
  return false;
}

function promoteStatic(a: string, b: string): string {
  if (a === UNKNOWN || b === UNKNOWN) return UNKNOWN;
  for (const t of ['double', 'float', 'long']) if (a === t || b === t) return t;
  if (['int', 'char', 'short', 'byte'].includes(a) && ['int', 'char', 'short', 'byte'].includes(b)) return 'int';
  return UNKNOWN;
}

/** Conservative: only true when every path provably returns or throws. */
export function alwaysReturns(s: A.Stmt): boolean {
  switch (s.t) {
    case 'return':
    case 'throw':
      return true;
    case 'block':
      return s.stmts.some(alwaysReturns);
    case 'if':
      return s.otherwise !== null && alwaysReturns(s.then) && alwaysReturns(s.otherwise);
    case 'while':
      return s.cond.t === 'literal' && s.cond.value === true;
    case 'doWhile':
      return alwaysReturns(s.body);
    case 'for':
      return s.cond === null;
    case 'switch':
      return s.cases.length > 0 && s.cases.some((c) => !c.labels.length) && s.cases.every((c) => c.stmts.some(alwaysReturns));
    default:
      return false;
  }
}

function countLines(b: A.Block): number {
  let max = 0;
  const walk = (s: A.Stmt): void => {
    max = Math.max(max, s.line - b.line);
    if (s.t === 'block') s.stmts.forEach(walk);
    else if (s.t === 'if') {
      walk(s.then);
      if (s.otherwise) walk(s.otherwise);
    } else if (s.t === 'while' || s.t === 'doWhile' || s.t === 'for' || s.t === 'forEach') walk(s.body);
    else if (s.t === 'switch') s.cases.forEach((c) => c.stmts.forEach(walk));
  };
  b.stmts.forEach(walk);
  return max + 1;
}

function flattenDotted(expr: A.Expr): string[] | null {
  const parts: string[] = [];
  let cur: A.Expr = expr;
  for (;;) {
    if (cur.t === 'field') {
      parts.unshift(cur.name);
      cur = cur.target;
      continue;
    }
    if (cur.t === 'name') {
      parts.unshift(cur.name);
      return parts.length > 1 ? parts : null;
    }
    return null;
  }
}

const kindWord = (k: string) => (k === 'interface' ? 'interface' : k === 'enum' ? 'enum' : 'class');
