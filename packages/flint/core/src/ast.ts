import type { FlintSourceSpan } from './diagnostics.js';

export type FlintPrimitiveType = 'bool' | 'bytes' | 'f32' | 'f64' | 'i32' | 'i64' | 'string' | 'u32' | 'u64' | 'unit';

export type FlintOwnership = 'borrowed' | 'owned' | 'shared';

/** Source-level mutability of a binding. Bindings are immutable by default. */
export type FlintMutability = 'immutable' | 'mutable';

/** A reference is immutable unless `&mut` is written explicitly. */
export type FlintReferenceMode = 'value' | 'ref' | 'mut-ref';

/** ABI passing mode derived from the recursive POD classification. */
export type FlintPassingMode = 'value' | 'immutable-reference' | 'mutable-reference';

export interface FlintGenericParameter {
  readonly kind: 'generic-parameter';
  readonly name: string;
  readonly bounds: readonly string[];
  readonly span: FlintSourceSpan;
}

export interface FlintTypeName {
  readonly kind: 'type-name';
  /** The ABI-compatible primitive carrier. Non-primitive names use reference. */
  readonly name: FlintPrimitiveType;
  /** A declared aggregate or generic parameter, when this is not primitive. */
  readonly reference?: string;
  readonly arguments?: readonly FlintTypeName[];
  /** Fixed arrays carry their length in the type, while vectors omit it. */
  readonly length?: number;
  readonly ownership?: FlintOwnership;
  /** Explicit `&T` / `&mut T`; omitted means the safe default for this type. */
  readonly referenceMode?: Exclude<FlintReferenceMode, 'value'>;
  readonly span: FlintSourceSpan;
}

/**
 * Serializes a FlintTypeName descriptor to its canonical source code representation.
 *
 * @param type Flint type name structure.
 * @returns Serialized type string (e.g. `i32`, `&mut String`, `[i32; 4]`).
 */
export function flintTypeNameToString(type: FlintTypeName): string {
  const name = type.reference ?? type.name;
  let text = name;
  if (type.arguments !== undefined && type.arguments.length > 0) {
    const renderedArguments = type.arguments.map((argument) => flintTypeNameToString(argument)).join(', ');
    text = `${name}<${renderedArguments}>`;
  }
  if (type.referenceMode === 'mut-ref') text = `&mut ${text}`;
  else if (type.referenceMode === 'ref') text = `&${text}`;
  if (type.length !== undefined) text = `${text}[${type.length}]`;
  return text;
}

const podPrimitives = new Set<FlintPrimitiveType>(['bool', 'f32', 'f64', 'i32', 'i64', 'u32', 'u64', 'unit']);

/**
 * Classifies a type without relying on its ABI carrier. Strings, bytes, and
 * collections are handles even though some of them use scalar carriers.
 * Recursive aggregate walks are cycle-safe and conservatively classify
 * unresolved generic/cyclic values as non-POD.
 */
export function isFlintPodType(
  type: FlintTypeName,
  module?: Pick<FlintModule, 'structs' | 'enums'>,
  visiting = new Set<string>(),
): boolean {
  if (type.referenceMode !== undefined || type.ownership !== undefined) return false;
  const name = type.reference ?? type.name;
  if (podPrimitives.has(type.name) && type.reference === undefined) return true;
  if (name === 'Array' || name === 'Vector' || name === 'Iterable' || name === 'Iterator' || name === 'Fn')
    return false;
  if (name === 'Option' || name === 'Result' || name === 'iterResult')
    return (type.arguments ?? []).every((argument) => isFlintPodType(argument, module, visiting));
  if (module === undefined) return false;
  const key = flintTypeNameToString(type);
  if (visiting.has(key)) return false;
  const nextVisiting = new Set(visiting).add(key);
  const struct = module.structs.find((declaration) => declaration.name === name);
  if (struct !== undefined)
    return struct.fields.every(
      (field) => field.ownership === undefined && isFlintPodType(field.type, module, nextVisiting),
    );
  const enumeration = module.enums.find((declaration) => declaration.name === name);
  return (
    enumeration !== undefined &&
    enumeration.variants.every((variant) =>
      variant.fields.every(
        (field) => field.type.ownership === undefined && isFlintPodType(field.type, module, nextVisiting),
      ),
    )
  );
}

/**
 * Computes the default argument passing mode (value, ref, or mut-ref) for a given type.
 *
 * @param type Flint type name.
 * @param module Optional module providing struct and enum definitions.
 * @returns Default passing mode convention.
 */
export function flintDefaultPassingMode(
  type: FlintTypeName,
  module?: Pick<FlintModule, 'structs' | 'enums'>,
): FlintPassingMode {
  if (type.referenceMode === 'mut-ref') return 'mutable-reference';
  if (type.referenceMode === 'ref') return 'immutable-reference';
  return isFlintPodType(type, module) ? 'value' : 'immutable-reference';
}

export interface FlintParameter {
  readonly kind: 'parameter';
  readonly name: string;
  readonly type: FlintTypeName;
  /** Explicit `mut` on a parameter controls rebinding; pointee mutation uses `&mut`. */
  readonly mutable?: true;
  readonly span: FlintSourceSpan;
}

export interface FlintDocumentation {
  readonly description: string;
  readonly tags: readonly FlintDocumentationTag[];
}

export interface FlintDocumentationTag {
  readonly name: string;
  readonly subject?: string;
  readonly text: string;
}

export interface FlintCapabilityImport {
  readonly kind: 'capability-import';
  readonly capability: string;
  readonly alias: string;
  readonly parameters: readonly FlintParameter[];
  readonly result: FlintTypeName;
  readonly span: FlintSourceSpan;
}

export interface FlintSourceModuleImport {
  readonly kind: 'source-module-import';
  readonly source: string;
  readonly alias: string;
  readonly span: FlintSourceSpan;
}

export interface FlintFunction {
  readonly kind: 'function';
  readonly name: string;
  readonly exported: boolean;
  /** Iterator functions lower to JavaScript-compatible iterator boundaries. */
  readonly iterable?: boolean;
  /** Controls release inlining without changing source-level semantics. */
  readonly inlinePolicy?: 'always' | 'noinline';
  readonly documentation?: FlintDocumentation;
  readonly genericParameters: readonly FlintGenericParameter[];
  readonly parameters: readonly FlintParameter[];
  readonly result: FlintTypeName;
  readonly body: readonly FlintStatement[];
  readonly span: FlintSourceSpan;
}

export interface FlintStructField {
  readonly kind: 'struct-field';
  readonly name: string;
  readonly type: FlintTypeName;
  readonly ownership?: FlintOwnership;
  readonly documentation?: FlintDocumentation;
  readonly span: FlintSourceSpan;
}

export interface FlintStructDeclaration {
  readonly kind: 'struct';
  readonly name: string;
  /** Records use the same source representation but cross the host ABI as values. */
  readonly record?: true;
  readonly documentation?: FlintDocumentation;
  readonly genericParameters: readonly FlintGenericParameter[];
  readonly fields: readonly FlintStructField[];
  readonly immutable: true;
  readonly span: FlintSourceSpan;
}

export interface FlintEnumVariant {
  readonly kind: 'enum-variant';
  readonly name: string;
  readonly fields: readonly FlintParameter[];
  readonly tag: number;
  readonly span: FlintSourceSpan;
}

export interface FlintEnumDeclaration {
  readonly kind: 'enum';
  readonly name: string;
  readonly exported: boolean;
  readonly documentation?: FlintDocumentation;
  readonly genericParameters: readonly FlintGenericParameter[];
  readonly variants: readonly FlintEnumVariant[];
  readonly span: FlintSourceSpan;
}

export interface FlintInterfaceFunction {
  readonly kind: 'interface-function';
  readonly name: string;
  readonly documentation?: FlintDocumentation;
  readonly genericParameters: readonly FlintGenericParameter[];
  readonly parameters: readonly FlintParameter[];
  readonly result: FlintTypeName;
  readonly span: FlintSourceSpan;
}

/** A compile-time structural contract; it has no runtime representation. */
export interface FlintInterfaceDeclaration {
  readonly kind: 'interface';
  readonly name: string;
  readonly documentation?: FlintDocumentation;
  readonly genericParameters: readonly FlintGenericParameter[];
  readonly functions: readonly FlintInterfaceFunction[];
  readonly span: FlintSourceSpan;
}

export type FlintBinaryOperator = '!=' | '%' | '&&' | '*' | '+' | '-' | '/' | '<' | '<=' | '==' | '>' | '>=' | '||';

export interface FlintLiteralExpression {
  readonly kind: 'literal';
  readonly value: boolean | number | string;
  readonly type: FlintPrimitiveType;
  readonly span: FlintSourceSpan;
}

export interface FlintIdentifierExpression {
  readonly kind: 'identifier';
  readonly name: string;
  readonly span: FlintSourceSpan;
}

export interface FlintCallExpression {
  readonly kind: 'call';
  readonly callee: string;
  readonly arguments: readonly FlintExpression[];
  readonly span: FlintSourceSpan;
}

export interface FlintBinaryExpression {
  readonly kind: 'binary';
  readonly operator: FlintBinaryOperator;
  readonly left: FlintExpression;
  readonly right: FlintExpression;
  readonly span: FlintSourceSpan;
}

export interface FlintUnaryExpression {
  readonly kind: 'unary';
  readonly operator: '!' | '-';
  readonly operand: FlintExpression;
  readonly span: FlintSourceSpan;
}

export interface FlintFunctionValueExpression {
  readonly kind: 'function-value';
  readonly name: string;
  readonly span: FlintSourceSpan;
}

export interface FlintStructValueExpression {
  readonly kind: 'struct-value';
  readonly type: FlintTypeName;
  readonly fields: Readonly<Record<string, FlintExpression>>;
  readonly span: FlintSourceSpan;
}

export interface FlintEnumValueExpression {
  readonly kind: 'enum-value';
  readonly type: FlintTypeName;
  readonly variant: string;
  readonly arguments: readonly FlintExpression[];
  readonly span: FlintSourceSpan;
}

export interface FlintArrayLiteralExpression {
  readonly kind: 'array-literal';
  readonly elements: readonly FlintExpression[];
  readonly type: FlintTypeName;
  readonly span: FlintSourceSpan;
}

export interface FlintVectorLiteralExpression {
  readonly kind: 'vector-literal';
  readonly elements: readonly FlintExpression[];
  readonly type: FlintTypeName;
  readonly span: FlintSourceSpan;
}

export interface FlintIndexExpression {
  readonly kind: 'index';
  readonly receiver: FlintExpression;
  readonly index: FlintExpression;
  readonly span: FlintSourceSpan;
}

export type FlintPattern =
  | { readonly kind: 'wildcard'; readonly span: FlintSourceSpan }
  | { readonly kind: 'literal'; readonly value: boolean | number | string; readonly span: FlintSourceSpan }
  | {
      readonly kind: 'variant';
      readonly name: string;
      readonly bindings: readonly string[];
      readonly span: FlintSourceSpan;
    };

export interface FlintMatchArm {
  readonly kind: 'match-arm';
  readonly pattern: FlintPattern;
  readonly value: FlintExpression;
  readonly span: FlintSourceSpan;
}

export interface FlintMatchExpression {
  readonly kind: 'match';
  readonly value: FlintExpression;
  readonly arms: readonly FlintMatchArm[];
  readonly span: FlintSourceSpan;
}

export type FlintExpression =
  | FlintBinaryExpression
  | FlintCallExpression
  | FlintIdentifierExpression
  | FlintLiteralExpression
  | FlintFunctionValueExpression
  | FlintStructValueExpression
  | FlintEnumValueExpression
  | FlintArrayLiteralExpression
  | FlintVectorLiteralExpression
  | FlintIndexExpression
  | FlintMatchExpression
  | FlintUnaryExpression;

export interface FlintLetStatement {
  readonly kind: 'let';
  readonly name: string;
  readonly type: FlintTypeName;
  /** Locals are immutable unless declared as `let mut`. */
  readonly mutable?: true;
  readonly value: FlintExpression;
  readonly span: FlintSourceSpan;
}

export interface FlintAssignmentStatement {
  readonly kind: 'assignment';
  readonly name: string;
  readonly value: FlintExpression;
  readonly index?: FlintExpression;
  readonly span: FlintSourceSpan;
}

export interface FlintReturnStatement {
  readonly kind: 'return';
  readonly value?: FlintExpression;
  readonly span: FlintSourceSpan;
}

export interface FlintExpressionStatement {
  readonly kind: 'expression-statement';
  readonly expression: FlintExpression;
  readonly span: FlintSourceSpan;
}

export interface FlintIfStatement {
  readonly kind: 'if';
  readonly condition: FlintExpression;
  readonly consequent: readonly FlintStatement[];
  readonly alternate?: readonly FlintStatement[];
  readonly conditionalHint?: 'likely' | 'unlikely';
  readonly span: FlintSourceSpan;
}

export interface FlintWhileStatement {
  readonly kind: 'while';
  readonly condition: FlintExpression;
  readonly body: readonly FlintStatement[];
  readonly span: FlintSourceSpan;
}

export interface FlintForStatement {
  readonly kind: 'for';
  readonly initializer?: FlintStatement;
  readonly condition: FlintExpression;
  readonly update?: FlintStatement;
  readonly body: readonly FlintStatement[];
  readonly span: FlintSourceSpan;
}

export interface FlintDoWhileStatement {
  readonly kind: 'do-while';
  readonly body: readonly FlintStatement[];
  readonly condition: FlintExpression;
  readonly span: FlintSourceSpan;
}

export interface FlintYieldStatement {
  readonly kind: 'yield';
  readonly value: FlintExpression;
  readonly span: FlintSourceSpan;
}

export interface FlintIteratorLoopStatement {
  readonly kind: 'iterator-loop';
  readonly binding: string;
  readonly iterator: FlintExpression;
  readonly body: readonly FlintStatement[];
  readonly span: FlintSourceSpan;
}

export interface FlintMatchStatement {
  readonly kind: 'match-statement';
  readonly value: FlintExpression;
  readonly arms: readonly FlintMatchArm[];
  readonly span: FlintSourceSpan;
}

export interface FlintSwitchCase {
  readonly kind: 'switch-case';
  /** Integer literals are retained as numbers; enum variants as their names. */
  readonly value: number | string;
  readonly body: readonly FlintStatement[];
  readonly span: FlintSourceSpan;
}

export interface FlintSwitchStatement {
  readonly kind: 'switch';
  readonly value: FlintExpression;
  readonly cases: readonly FlintSwitchCase[];
  readonly defaultCase?: readonly FlintStatement[];
  readonly span: FlintSourceSpan;
}

export type FlintStatement =
  | FlintExpressionStatement
  | FlintAssignmentStatement
  | FlintIfStatement
  | FlintLetStatement
  | FlintMatchStatement
  | FlintSwitchStatement
  | FlintReturnStatement
  | FlintForStatement
  | FlintDoWhileStatement
  | FlintWhileStatement
  | FlintYieldStatement
  | FlintIteratorLoopStatement;

export interface FlintModule {
  readonly kind: 'module';
  /** The canonical identity derived from the source file ID. */
  readonly name: string;
  readonly imports: readonly FlintCapabilityImport[];
  readonly sourceImports: readonly FlintSourceModuleImport[];
  readonly structs: readonly FlintStructDeclaration[];
  readonly enums: readonly FlintEnumDeclaration[];
  readonly interfaces: readonly FlintInterfaceDeclaration[];
  readonly functions: readonly FlintFunction[];
  readonly span: FlintSourceSpan;
}
