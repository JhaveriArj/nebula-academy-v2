/* The AST for the Java subset documented in docs/ARCHITECTURE.md.
   Every node carries a span so diagnostics and the error translator can point at a line. */

export interface Span {
  line: number;
  column: number;
  length: number;
}

export interface TypeRef extends Span {
  /** Possibly dotted: "DcMotor", "DcMotor.RunMode", "com.qualcomm.robotcore.hardware.DcMotor". */
  name: string;
  /** Array depth. `int[][]` is dims 2. */
  dims: number;
  /** Generic arguments, kept only so `Class<DcMotor>` parses; see ARCHITECTURE.md. */
  args: TypeRef[];
}

export interface Annotation extends Span {
  name: string;
  args: { name: string | null; value: Expr }[];
}

export interface ImportDecl extends Span {
  name: string;
  isStatic: boolean;
  wildcard: boolean;
}

export interface Param extends Span {
  name: string;
  type: TypeRef;
  varargs: boolean;
}

export interface FieldDecl extends Span {
  name: string;
  type: TypeRef;
  modifiers: string[];
  annotations: Annotation[];
  init: Expr | null;
}

export interface MethodDecl extends Span {
  name: string;
  /** null means this is a constructor. */
  returnType: TypeRef | null;
  params: Param[];
  modifiers: string[];
  annotations: Annotation[];
  /** null means abstract or an interface method. */
  body: Block | null;
}

export interface EnumConstant extends Span {
  name: string;
  args: Expr[];
}

export type TypeDeclKind = 'class' | 'interface' | 'enum';

export interface TypeDecl extends Span {
  kind: TypeDeclKind;
  name: string;
  modifiers: string[];
  annotations: Annotation[];
  superclass: TypeRef | null;
  interfaces: TypeRef[];
  fields: FieldDecl[];
  methods: MethodDecl[];
  constructors: MethodDecl[];
  enumConstants: EnumConstant[];
  nested: TypeDecl[];
}

export interface CompilationUnit {
  packageName: string | null;
  imports: ImportDecl[];
  types: TypeDecl[];
}

/* ---------------------------------------------------------------- statements */

export interface Block extends Span {
  t: 'block';
  stmts: Stmt[];
}

export interface LocalVarDecl extends Span {
  t: 'localVar';
  type: TypeRef;
  /** `int a = 1, b = 2;` is one statement with two declarators. */
  decls: { name: string; dims: number; init: Expr | null; span: Span }[];
  modifiers: string[];
}

export interface ExprStmt extends Span { t: 'expr'; expr: Expr }
export interface IfStmt extends Span { t: 'if'; cond: Expr; then: Stmt; otherwise: Stmt | null }
export interface WhileStmt extends Span { t: 'while'; cond: Expr; body: Stmt }
export interface DoWhileStmt extends Span { t: 'doWhile'; cond: Expr; body: Stmt }
export interface ForStmt extends Span {
  t: 'for';
  init: Stmt[];
  cond: Expr | null;
  update: Expr[];
  body: Stmt;
}
export interface ForEachStmt extends Span {
  t: 'forEach';
  varType: TypeRef;
  varName: string;
  iterable: Expr;
  body: Stmt;
}
export interface ReturnStmt extends Span { t: 'return'; value: Expr | null }
export interface BreakStmt extends Span { t: 'break'; label: string | null }
export interface ContinueStmt extends Span { t: 'continue'; label: string | null }
export interface ThrowStmt extends Span { t: 'throw'; value: Expr }
export interface EmptyStmt extends Span { t: 'empty' }
export interface SwitchCase extends Span {
  /** Empty labels means `default:`. */
  labels: Expr[];
  stmts: Stmt[];
  /** True for the arrow form `case A -> ...`, which does not fall through. */
  arrow: boolean;
}
export interface SwitchStmt extends Span { t: 'switch'; subject: Expr; cases: SwitchCase[] }
export interface LocalTypeStmt extends Span { t: 'localType'; decl: TypeDecl }

export type Stmt =
  | Block
  | LocalVarDecl
  | ExprStmt
  | IfStmt
  | WhileStmt
  | DoWhileStmt
  | ForStmt
  | ForEachStmt
  | ReturnStmt
  | BreakStmt
  | ContinueStmt
  | ThrowStmt
  | EmptyStmt
  | SwitchStmt
  | LocalTypeStmt;

/* --------------------------------------------------------------- expressions */

export type LiteralKind = 'int' | 'long' | 'double' | 'float' | 'char' | 'string' | 'boolean' | 'null';

export interface Literal extends Span {
  t: 'literal';
  kind: LiteralKind;
  value: string | number | boolean | null;
  /** The source text, so the editor can underline exactly what was typed. */
  raw: string;
}

export interface NameExpr extends Span { t: 'name'; name: string }
export interface ThisExpr extends Span { t: 'this' }
export interface SuperExpr extends Span { t: 'super' }
export interface FieldAccess extends Span { t: 'field'; target: Expr; name: string }
export interface ArrayAccess extends Span { t: 'index'; target: Expr; index: Expr }
export interface CallExpr extends Span {
  t: 'call';
  /** null for an unqualified call like `drive(3)`. */
  target: Expr | null;
  name: string;
  args: Expr[];
}
export interface NewExpr extends Span { t: 'new'; type: TypeRef; args: Expr[] }
export interface NewArrayExpr extends Span {
  t: 'newArray';
  type: TypeRef;
  /** `new int[3][4]` -> two sizes. */
  sizes: Expr[];
  extraDims: number;
  init: ArrayInitExpr | null;
}
export interface ArrayInitExpr extends Span { t: 'arrayInit'; items: Expr[] }
export interface UnaryExpr extends Span { t: 'unary'; op: string; operand: Expr }
export interface PrefixExpr extends Span { t: 'prefix'; op: '++' | '--'; operand: Expr }
export interface PostfixExpr extends Span { t: 'postfix'; op: '++' | '--'; operand: Expr }
export interface BinaryExpr extends Span { t: 'binary'; op: string; left: Expr; right: Expr }
export interface AssignExpr extends Span { t: 'assign'; op: string; target: Expr; value: Expr }
export interface TernaryExpr extends Span { t: 'ternary'; cond: Expr; then: Expr; otherwise: Expr }
export interface CastExpr extends Span { t: 'cast'; type: TypeRef; operand: Expr }
export interface InstanceOfExpr extends Span { t: 'instanceOf'; operand: Expr; type: TypeRef }
export interface ClassLitExpr extends Span { t: 'classLit'; type: TypeRef }

export type Expr =
  | Literal
  | NameExpr
  | ThisExpr
  | SuperExpr
  | FieldAccess
  | ArrayAccess
  | CallExpr
  | NewExpr
  | NewArrayExpr
  | ArrayInitExpr
  | UnaryExpr
  | PrefixExpr
  | PostfixExpr
  | BinaryExpr
  | AssignExpr
  | TernaryExpr
  | CastExpr
  | InstanceOfExpr
  | ClassLitExpr;

