import type { ForgeWebScriptSourceSpan } from './diagnostics.js';

export type ForgeWebScriptPrimitiveType =
  'bool' | 'bytes' | 'f32' | 'f64' | 'i32' | 'i64' | 'string' | 'u32' | 'u64' | 'unit';

export type ForgeWebScriptOwnership = 'borrowed' | 'owned' | 'shared';

/** Source-level mutability of a binding. Bindings are immutable by default. */
export type ForgeWebScriptMutability = 'immutable' | 'mutable';

/** A reference is immutable unless `&mut` is written explicitly. */
export type ForgeWebScriptReferenceMode = 'value' | 'ref' | 'mut-ref';

/** ABI passing mode derived from the recursive POD classification. */
export type ForgeWebScriptPassingMode = 'value' | 'immutable-reference' | 'mutable-reference';

export interface ForgeWebScriptGenericParameter {
  readonly kind: 'generic-parameter';
  readonly name: string;
  readonly bounds: readonly string[];
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptTypeName {
  readonly kind: 'type-name';
  /** The ABI-compatible primitive carrier. Non-primitive names use reference. */
  readonly name: ForgeWebScriptPrimitiveType;
  /** A declared aggregate or generic parameter, when this is not primitive. */
  readonly reference?: string;
  readonly arguments?: readonly ForgeWebScriptTypeName[];
  /** Fixed arrays carry their length in the type, while vectors omit it. */
  readonly length?: number;
  readonly ownership?: ForgeWebScriptOwnership;
  /** Explicit `&T` / `&mut T`; omitted means the safe default for this type. */
  readonly referenceMode?: Exclude<ForgeWebScriptReferenceMode, 'value'>;
  readonly span: ForgeWebScriptSourceSpan;
}

export function forgeWebScriptTypeNameToString(type: ForgeWebScriptTypeName): string {
  const name = type.reference ?? type.name;
  const generic =
    type.arguments === undefined || type.arguments.length === 0
      ? name
      : `${name}<${type.arguments.map(forgeWebScriptTypeNameToString).join(', ')}>`;
  const qualified =
    type.referenceMode === undefined ? generic : `&${type.referenceMode === 'mut-ref' ? 'mut ' : ''}${generic}`;
  return type.length === undefined ? qualified : `${qualified}[${type.length}]`;
}

const podPrimitives = new Set<ForgeWebScriptPrimitiveType>(['bool', 'f32', 'f64', 'i32', 'i64', 'u32', 'u64', 'unit']);

/**
 * Classifies a type without relying on its ABI carrier. Strings, bytes, and
 * collections are handles even though some of them use scalar carriers.
 * Recursive aggregate walks are cycle-safe and conservatively classify
 * unresolved generic/cyclic values as non-POD.
 */
export function isForgeWebScriptPodType(
  type: ForgeWebScriptTypeName,
  module?: Pick<ForgeWebScriptModule, 'structs' | 'enums'>,
  visiting = new Set<string>(),
): boolean {
  if (type.referenceMode !== undefined || type.ownership !== undefined) return false;
  const name = type.reference ?? type.name;
  if (podPrimitives.has(type.name) && type.reference === undefined) return true;
  if (name === 'Array' || name === 'Vector' || name === 'Iterable' || name === 'Iterator' || name === 'Fn')
    return false;
  if (name === 'Option' || name === 'Result' || name === 'iterResult')
    return (type.arguments ?? []).every((argument) => isForgeWebScriptPodType(argument, module, visiting));
  if (module === undefined) return false;
  const key = forgeWebScriptTypeNameToString(type);
  if (visiting.has(key)) return false;
  const nextVisiting = new Set(visiting).add(key);
  const struct = module.structs.find((declaration) => declaration.name === name);
  if (struct !== undefined)
    return struct.fields.every(
      (field) => field.ownership === undefined && isForgeWebScriptPodType(field.type, module, nextVisiting),
    );
  const enumeration = module.enums.find((declaration) => declaration.name === name);
  return (
    enumeration !== undefined &&
    enumeration.variants.every((variant) =>
      variant.fields.every(
        (field) => field.type.ownership === undefined && isForgeWebScriptPodType(field.type, module, nextVisiting),
      ),
    )
  );
}

export function forgeWebScriptDefaultPassingMode(
  type: ForgeWebScriptTypeName,
  module?: Pick<ForgeWebScriptModule, 'structs' | 'enums'>,
): ForgeWebScriptPassingMode {
  if (type.referenceMode === 'mut-ref') return 'mutable-reference';
  if (type.referenceMode === 'ref') return 'immutable-reference';
  return isForgeWebScriptPodType(type, module) ? 'value' : 'immutable-reference';
}

export interface ForgeWebScriptParameter {
  readonly kind: 'parameter';
  readonly name: string;
  readonly type: ForgeWebScriptTypeName;
  /** Explicit `mut` on a parameter controls rebinding; pointee mutation uses `&mut`. */
  readonly mutable?: true;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptDocumentation {
  readonly description: string;
  readonly tags: readonly ForgeWebScriptDocumentationTag[];
}

export interface ForgeWebScriptDocumentationTag {
  readonly name: string;
  readonly subject?: string;
  readonly text: string;
}

export interface ForgeWebScriptCapabilityImport {
  readonly kind: 'capability-import';
  readonly capability: string;
  readonly alias: string;
  readonly parameters: readonly ForgeWebScriptParameter[];
  readonly result: ForgeWebScriptTypeName;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptSourceModuleImport {
  readonly kind: 'source-module-import';
  readonly source: string;
  readonly alias: string;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptFunction {
  readonly kind: 'function';
  readonly name: string;
  readonly exported: boolean;
  /** Iterator functions lower to JavaScript-compatible iterator boundaries. */
  readonly iterable?: boolean;
  /** Controls release inlining without changing source-level semantics. */
  readonly inlinePolicy?: 'always' | 'noinline';
  readonly documentation?: ForgeWebScriptDocumentation;
  readonly genericParameters: readonly ForgeWebScriptGenericParameter[];
  readonly parameters: readonly ForgeWebScriptParameter[];
  readonly result: ForgeWebScriptTypeName;
  readonly body: readonly ForgeWebScriptStatement[];
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptStructField {
  readonly kind: 'struct-field';
  readonly name: string;
  readonly type: ForgeWebScriptTypeName;
  readonly ownership?: ForgeWebScriptOwnership;
  readonly documentation?: ForgeWebScriptDocumentation;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptStructDeclaration {
  readonly kind: 'struct';
  readonly name: string;
  readonly documentation?: ForgeWebScriptDocumentation;
  readonly genericParameters: readonly ForgeWebScriptGenericParameter[];
  readonly fields: readonly ForgeWebScriptStructField[];
  readonly immutable: true;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptEnumVariant {
  readonly kind: 'enum-variant';
  readonly name: string;
  readonly fields: readonly ForgeWebScriptParameter[];
  readonly tag: number;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptEnumDeclaration {
  readonly kind: 'enum';
  readonly name: string;
  readonly exported: boolean;
  readonly documentation?: ForgeWebScriptDocumentation;
  readonly genericParameters: readonly ForgeWebScriptGenericParameter[];
  readonly variants: readonly ForgeWebScriptEnumVariant[];
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptInterfaceFunction {
  readonly kind: 'interface-function';
  readonly name: string;
  readonly documentation?: ForgeWebScriptDocumentation;
  readonly genericParameters: readonly ForgeWebScriptGenericParameter[];
  readonly parameters: readonly ForgeWebScriptParameter[];
  readonly result: ForgeWebScriptTypeName;
  readonly span: ForgeWebScriptSourceSpan;
}

/** A compile-time structural contract; it has no runtime representation. */
export interface ForgeWebScriptInterfaceDeclaration {
  readonly kind: 'interface';
  readonly name: string;
  readonly documentation?: ForgeWebScriptDocumentation;
  readonly genericParameters: readonly ForgeWebScriptGenericParameter[];
  readonly functions: readonly ForgeWebScriptInterfaceFunction[];
  readonly span: ForgeWebScriptSourceSpan;
}

export type ForgeWebScriptBinaryOperator =
  '!=' | '%' | '&&' | '*' | '+' | '-' | '/' | '<' | '<=' | '==' | '>' | '>=' | '||';

export interface ForgeWebScriptLiteralExpression {
  readonly kind: 'literal';
  readonly value: boolean | number | string;
  readonly type: ForgeWebScriptPrimitiveType;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIdentifierExpression {
  readonly kind: 'identifier';
  readonly name: string;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptCallExpression {
  readonly kind: 'call';
  readonly callee: string;
  readonly arguments: readonly ForgeWebScriptExpression[];
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptBinaryExpression {
  readonly kind: 'binary';
  readonly operator: ForgeWebScriptBinaryOperator;
  readonly left: ForgeWebScriptExpression;
  readonly right: ForgeWebScriptExpression;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptUnaryExpression {
  readonly kind: 'unary';
  readonly operator: '!' | '-';
  readonly operand: ForgeWebScriptExpression;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptFunctionValueExpression {
  readonly kind: 'function-value';
  readonly name: string;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptStructValueExpression {
  readonly kind: 'struct-value';
  readonly type: ForgeWebScriptTypeName;
  readonly fields: Readonly<Record<string, ForgeWebScriptExpression>>;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptEnumValueExpression {
  readonly kind: 'enum-value';
  readonly type: ForgeWebScriptTypeName;
  readonly variant: string;
  readonly arguments: readonly ForgeWebScriptExpression[];
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptArrayLiteralExpression {
  readonly kind: 'array-literal';
  readonly elements: readonly ForgeWebScriptExpression[];
  readonly type: ForgeWebScriptTypeName;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptVectorLiteralExpression {
  readonly kind: 'vector-literal';
  readonly elements: readonly ForgeWebScriptExpression[];
  readonly type: ForgeWebScriptTypeName;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIndexExpression {
  readonly kind: 'index';
  readonly receiver: ForgeWebScriptExpression;
  readonly index: ForgeWebScriptExpression;
  readonly span: ForgeWebScriptSourceSpan;
}

export type ForgeWebScriptPattern =
  | { readonly kind: 'wildcard'; readonly span: ForgeWebScriptSourceSpan }
  | { readonly kind: 'literal'; readonly value: boolean | number | string; readonly span: ForgeWebScriptSourceSpan }
  | {
      readonly kind: 'variant';
      readonly name: string;
      readonly bindings: readonly string[];
      readonly span: ForgeWebScriptSourceSpan;
    };

export interface ForgeWebScriptMatchArm {
  readonly kind: 'match-arm';
  readonly pattern: ForgeWebScriptPattern;
  readonly value: ForgeWebScriptExpression;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptMatchExpression {
  readonly kind: 'match';
  readonly value: ForgeWebScriptExpression;
  readonly arms: readonly ForgeWebScriptMatchArm[];
  readonly span: ForgeWebScriptSourceSpan;
}

export type ForgeWebScriptExpression =
  | ForgeWebScriptBinaryExpression
  | ForgeWebScriptCallExpression
  | ForgeWebScriptIdentifierExpression
  | ForgeWebScriptLiteralExpression
  | ForgeWebScriptFunctionValueExpression
  | ForgeWebScriptStructValueExpression
  | ForgeWebScriptEnumValueExpression
  | ForgeWebScriptArrayLiteralExpression
  | ForgeWebScriptVectorLiteralExpression
  | ForgeWebScriptIndexExpression
  | ForgeWebScriptMatchExpression
  | ForgeWebScriptUnaryExpression;

export interface ForgeWebScriptLetStatement {
  readonly kind: 'let';
  readonly name: string;
  readonly type: ForgeWebScriptTypeName;
  /** Locals are immutable unless declared as `let mut`. */
  readonly mutable?: true;
  readonly value: ForgeWebScriptExpression;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptAssignmentStatement {
  readonly kind: 'assignment';
  readonly name: string;
  readonly value: ForgeWebScriptExpression;
  readonly index?: ForgeWebScriptExpression;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptReturnStatement {
  readonly kind: 'return';
  readonly value?: ForgeWebScriptExpression;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptExpressionStatement {
  readonly kind: 'expression-statement';
  readonly expression: ForgeWebScriptExpression;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIfStatement {
  readonly kind: 'if';
  readonly condition: ForgeWebScriptExpression;
  readonly consequent: readonly ForgeWebScriptStatement[];
  readonly alternate?: readonly ForgeWebScriptStatement[];
  readonly conditionalHint?: 'likely' | 'unlikely';
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptWhileStatement {
  readonly kind: 'while';
  readonly condition: ForgeWebScriptExpression;
  readonly body: readonly ForgeWebScriptStatement[];
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptForStatement {
  readonly kind: 'for';
  readonly initializer?: ForgeWebScriptStatement;
  readonly condition: ForgeWebScriptExpression;
  readonly update?: ForgeWebScriptStatement;
  readonly body: readonly ForgeWebScriptStatement[];
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptDoWhileStatement {
  readonly kind: 'do-while';
  readonly body: readonly ForgeWebScriptStatement[];
  readonly condition: ForgeWebScriptExpression;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptYieldStatement {
  readonly kind: 'yield';
  readonly value: ForgeWebScriptExpression;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIteratorLoopStatement {
  readonly kind: 'iterator-loop';
  readonly binding: string;
  readonly iterator: ForgeWebScriptExpression;
  readonly body: readonly ForgeWebScriptStatement[];
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptMatchStatement {
  readonly kind: 'match-statement';
  readonly value: ForgeWebScriptExpression;
  readonly arms: readonly ForgeWebScriptMatchArm[];
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptSwitchCase {
  readonly kind: 'switch-case';
  /** Integer literals are retained as numbers; enum variants as their names. */
  readonly value: number | string;
  readonly body: readonly ForgeWebScriptStatement[];
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptSwitchStatement {
  readonly kind: 'switch';
  readonly value: ForgeWebScriptExpression;
  readonly cases: readonly ForgeWebScriptSwitchCase[];
  readonly defaultCase?: readonly ForgeWebScriptStatement[];
  readonly span: ForgeWebScriptSourceSpan;
}

export type ForgeWebScriptStatement =
  | ForgeWebScriptExpressionStatement
  | ForgeWebScriptAssignmentStatement
  | ForgeWebScriptIfStatement
  | ForgeWebScriptLetStatement
  | ForgeWebScriptMatchStatement
  | ForgeWebScriptSwitchStatement
  | ForgeWebScriptReturnStatement
  | ForgeWebScriptForStatement
  | ForgeWebScriptDoWhileStatement
  | ForgeWebScriptWhileStatement
  | ForgeWebScriptYieldStatement
  | ForgeWebScriptIteratorLoopStatement;

export interface ForgeWebScriptModule {
  readonly kind: 'module';
  /** The canonical identity derived from the source file ID. */
  readonly name: string;
  readonly imports: readonly ForgeWebScriptCapabilityImport[];
  readonly sourceImports: readonly ForgeWebScriptSourceModuleImport[];
  readonly structs: readonly ForgeWebScriptStructDeclaration[];
  readonly enums: readonly ForgeWebScriptEnumDeclaration[];
  readonly interfaces: readonly ForgeWebScriptInterfaceDeclaration[];
  readonly functions: readonly ForgeWebScriptFunction[];
  readonly span: ForgeWebScriptSourceSpan;
}
