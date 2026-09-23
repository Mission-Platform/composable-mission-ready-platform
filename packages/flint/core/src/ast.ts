import type { FlintSourceSpan } from './diagnostics.js';

/** C scalar primitive types supported by Flint C interoperability layer. */
export type FlintCPrimitiveType =
  | 'u8'
  | 'i8'
  | 'c_char'
  | 'c_uchar'
  | 'c_short'
  | 'c_ushort'
  | 'c_int'
  | 'c_uint'
  | 'c_long'
  | 'c_ulong'
  | 'c_longlong'
  | 'c_ulonglong'
  | 'c_size'
  | 'c_ssize'
  | 'c_float'
  | 'c_double'
  | 'c_void';

/** Primitive scalar and carrier types supported by Flint. */
export type FlintPrimitiveType =
  'bool' | 'bytes' | 'f32' | 'f64' | 'i32' | 'i64' | 'string' | 'u32' | 'u64' | 'unit' | FlintCPrimitiveType;

/** Memory ownership classification for pointer and aggregate values. */
export type FlintOwnership = 'borrowed' | 'owned' | 'shared';

/** Source-level mutability of a binding. Bindings are immutable by default. */
export type FlintMutability = 'immutable' | 'mutable';

/** A reference is immutable unless `&mut` is written explicitly. */
export type FlintReferenceMode = 'value' | 'ref' | 'mut-ref';

/** ABI passing mode derived from the recursive POD classification. */
export type FlintPassingMode = 'value' | 'immutable-reference' | 'mutable-reference';

/** Generic type parameter declared on a function, struct, or interface. */
export interface FlintGenericParameter {
  readonly kind: 'generic-parameter';
  readonly name: string;
  readonly bounds: readonly string[];
  readonly span: FlintSourceSpan;
}

/** AST node describing a primitive, generic, aggregate, or reference type. */
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
 * Converts a Flint type name node into its canonical string representation.
 *
 * @param type - Type name node to stringify.
 * @returns Human-readable type string.
 */
// skipcq: JS-R1005
export function flintTypeNameToString(type: FlintTypeName): string {
  const name = type.reference ?? type.name;
  const generic =
    type.arguments === undefined || type.arguments.length === 0
      ? name
      : `${name}<${type.arguments.map((argument) => flintTypeNameToString(argument)).join(', ')}>`;
  const qualified =
    type.referenceMode === undefined ? generic : `&${type.referenceMode === 'mut-ref' ? 'mut ' : ''}${generic}`;
  return type.length === undefined ? qualified : `${qualified}[${type.length}]`;
}

const podPrimitives = new Set<FlintPrimitiveType>([
  'bool',
  'f32',
  'f64',
  'i32',
  'i64',
  'u32',
  'u64',
  'unit',
  'u8',
  'i8',
  'c_char',
  'c_uchar',
  'c_short',
  'c_ushort',
  'c_int',
  'c_uint',
  'c_long',
  'c_ulong',
  'c_longlong',
  'c_ulonglong',
  'c_size',
  'c_ssize',
  'c_float',
  'c_double',
  'c_void',
]);
const NON_POD_TYPE_NAMES = new Set(['Array', 'Vector', 'Iterable', 'Iterator', 'Fn']);
const CONTAINER_POD_TYPE_NAMES = new Set(['Option', 'Result', 'iterResult']);
const C_POINTER_TYPE_NAMES = new Set(['CPtr', 'MutCPtr', 'COpaquePtr']);

/**
 * Checks if a struct definition represents Plain Old Data.
 *
 * @param structName - Name of the struct to inspect.
 * @param module - Module declarations container.
 * @param visiting - Cycle detection set.
 * @returns True if all fields are POD.
 */
function isStructPodType(
  structName: string,
  module: Pick<FlintModule, 'structs' | 'enums'>,
  visiting: Set<string>,
): boolean {
  const struct = module.structs.find((declaration) => declaration.name === structName);
  if (struct === undefined) return false;
  return struct.fields.every((field) => field.ownership === undefined && isFlintPodType(field.type, module, visiting));
}

/**
 * Checks if an enum definition represents Plain Old Data.
 *
 * @param enumName - Name of the enum to inspect.
 * @param module - Module declarations container.
 * @param visiting - Cycle detection set.
 * @returns True if all variant fields are POD.
 */
function isEnumPodType(
  enumName: string,
  module: Pick<FlintModule, 'structs' | 'enums'>,
  visiting: Set<string>,
): boolean {
  const enumeration = module.enums.find((declaration) => declaration.name === enumName);
  if (enumeration === undefined) return false;
  return enumeration.variants.every((variant) =>
    variant.fields.every((field) => field.type.ownership === undefined && isFlintPodType(field.type, module, visiting)),
  );
}

/**
 * Checks if a type node has explicit reference mode or ownership qualifiers.
 *
 * @param type - Type name AST node to inspect.
 * @returns True if referenceMode or ownership is defined.
 */
function hasReferenceOrOwnership(type: FlintTypeName): boolean {
  return type.referenceMode !== undefined || type.ownership !== undefined;
}

/**
 * Checks if a standard container type represents Plain Old Data.
 *
 * @param type - Container type name AST node.
 * @param module - Module declarations container.
 * @param visiting - Cycle detection set.
 * @returns True if all type arguments are POD.
 */
function isContainerPodType(
  type: FlintTypeName,
  module?: Pick<FlintModule, 'structs' | 'enums'>,
  visiting = new Set<string>(),
): boolean {
  const typeArguments = type.arguments;
  if (typeArguments === undefined) return true;
  return typeArguments.every((argument) => isFlintPodType(argument, module, visiting));
}

/**
 * Checks if a user-defined struct or enum type represents Plain Old Data.
 *
 * @param type - Type name AST node.
 * @param name - Resolved name of the user-defined type.
 * @param module - Module declarations container.
 * @param visiting - Cycle detection set for recursive types.
 * @returns True if the user-defined type is POD.
 */
function isUserDefinedPodType(
  type: FlintTypeName,
  name: string,
  module: Pick<FlintModule, 'structs' | 'enums'>,
  visiting: Set<string>,
): boolean {
  const key = flintTypeNameToString(type);
  if (visiting.has(key)) return false;
  const nextVisiting = new Set(visiting).add(key);
  return isStructPodType(name, module, nextVisiting) || isEnumPodType(name, module, nextVisiting);
}

/**
 * Classifies a type without relying on its ABI carrier. Strings, bytes, and
 * collections are handles even though some of them use scalar carriers.
 * Recursive aggregate walks are cycle-safe and conservatively classify
 * unresolved generic/cyclic values as non-POD.
 *
 * @param type - Type name AST node to test.
 * @param module - Optional module declarations to resolve user types.
 * @param visiting - Cycle detection set for recursive types.
 * @returns True if the type qualifies as Plain Old Data.
 */
// skipcq: JS-R1005
export function isFlintPodType(
  type: FlintTypeName,
  module?: Pick<FlintModule, 'structs' | 'enums'>,
  visiting = new Set<string>(),
): boolean {
  if (hasReferenceOrOwnership(type)) return false;
  if (type.reference === undefined && podPrimitives.has(type.name)) return true;
  const name = type.reference ?? type.name;
  if (C_POINTER_TYPE_NAMES.has(name)) return true;
  if (NON_POD_TYPE_NAMES.has(name)) return false;
  if (CONTAINER_POD_TYPE_NAMES.has(name)) {
    return isContainerPodType(type, module, visiting);
  }
  if (module === undefined) return false;
  return isUserDefinedPodType(type, name, module, visiting);
}

/**
 * Determines default passing mode for a type based on POD status and reference mode.
 *
 * @param type - Type name to evaluate.
 * @param module - Module declarations container.
 * @returns Appropriate passing mode ('value', 'immutable-reference', or 'mutable-reference').
 */
export function flintDefaultPassingMode(
  type: FlintTypeName,
  module?: Pick<FlintModule, 'structs' | 'enums'>,
): FlintPassingMode {
  if (type.referenceMode === 'mut-ref') return 'mutable-reference';
  if (type.referenceMode === 'ref') return 'immutable-reference';
  return isFlintPodType(type, module) ? 'value' : 'immutable-reference';
}

/** Formal parameter declaration on a function signature or enum variant. */
export interface FlintParameter {
  readonly kind: 'parameter';
  readonly name: string;
  readonly type: FlintTypeName;
  /** Explicit `mut` on a parameter controls rebinding; pointee mutation uses `&mut`. */
  readonly mutable?: true;
  readonly span: FlintSourceSpan;
}

/** Structured documentation comment attached to an AST declaration. */
export interface FlintDocumentation {
  readonly description: string;
  readonly tags: readonly FlintDocumentationTag[];
}

/** Individual documentation tag associated with a declaration. */
export interface FlintDocumentationTag {
  readonly name: string;
  readonly subject?: string;
  readonly text: string;
}

/** Capability import declaration binding a host capability to a local alias. */
export interface FlintCapabilityImport {
  readonly kind: 'capability-import';
  readonly capability: string;
  readonly alias: string;
  readonly parameters: readonly FlintParameter[];
  readonly result: FlintTypeName;
  readonly span: FlintSourceSpan;
}

/** Source module import statement binding an external module alias. */
export interface FlintSourceModuleImport {
  readonly kind: 'source-module-import';
  readonly source: string;
  readonly alias: string;
  readonly span: FlintSourceSpan;
}

/** Function declaration AST node with parameters, return type, and body. */
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

/** Individual field declaration within a struct. */
export interface FlintStructField {
  readonly kind: 'struct-field';
  readonly name: string;
  readonly type: FlintTypeName;
  readonly ownership?: FlintOwnership;
  readonly documentation?: FlintDocumentation;
  readonly span: FlintSourceSpan;
}

/** Struct representation modes and layout directives. */
export type FlintStructRepr =
  | { readonly kind: 'c' }
  | { readonly kind: 'packed'; readonly alignment: number }
  | { readonly kind: 'align'; readonly alignment: number }
  | { readonly kind: 'flint' };

/** User-defined immutable struct declaration AST node. */
export interface FlintStructDeclaration {
  readonly kind: 'struct';
  readonly name: string;
  /** Records use the same source representation but cross the host ABI as values. */
  readonly record?: true;
  /**
   * Explicit C ABI struct layout (deprecated, use repr?.kind === 'c').
   * @deprecated Use `repr?.kind === 'c'`.
   */
  readonly c_struct?: boolean;
  /** Explicit representation attributes (e.g. #[repr(C)], #[repr(packed(N))], #[repr(align(N))]). */
  readonly repr?: FlintStructRepr;
  /** Packed struct alignment clamp (from #[repr(packed(N))]). */
  readonly packed?: number;
  /** Elevated alignment (from #[repr(align(N))]). */
  readonly align?: number;
  readonly documentation?: FlintDocumentation;
  readonly genericParameters: readonly FlintGenericParameter[];
  readonly fields: readonly FlintStructField[];
  readonly immutable: true;
  readonly span: FlintSourceSpan;
}

/** Individual variant definition within an algebraic enum. */
export interface FlintEnumVariant {
  readonly kind: 'enum-variant';
  readonly name: string;
  readonly fields: readonly FlintParameter[];
  readonly tag: number;
  readonly span: FlintSourceSpan;
}

/** Algebraic enumeration declaration AST node. */
export interface FlintEnumDeclaration {
  readonly kind: 'enum';
  readonly name: string;
  readonly exported: boolean;
  readonly documentation?: FlintDocumentation;
  readonly genericParameters: readonly FlintGenericParameter[];
  readonly variants: readonly FlintEnumVariant[];
  readonly span: FlintSourceSpan;
}

/** Method signature contract declared within an interface. */
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

/** Supported binary operators for arithmetic, comparison, and boolean logic. */
export type FlintBinaryOperator = '!=' | '%' | '&&' | '*' | '+' | '-' | '/' | '<' | '<=' | '==' | '>' | '>=' | '||';

/** Literal expression representing a boolean, number, or string value. */
export interface FlintLiteralExpression {
  readonly kind: 'literal';
  readonly value: boolean | number | string;
  readonly type: FlintPrimitiveType;
  readonly span: FlintSourceSpan;
}

/** Identifier reference expression. */
export interface FlintIdentifierExpression {
  readonly kind: 'identifier';
  readonly name: string;
  readonly span: FlintSourceSpan;
}

/** Function or capability call expression. */
export interface FlintCallExpression {
  readonly kind: 'call';
  readonly callee: string;
  readonly arguments: readonly FlintExpression[];
  readonly span: FlintSourceSpan;
}

/** Binary operation expression. */
export interface FlintBinaryExpression {
  readonly kind: 'binary';
  readonly operator: FlintBinaryOperator;
  readonly left: FlintExpression;
  readonly right: FlintExpression;
  readonly span: FlintSourceSpan;
}

/** Unary operation expression. */
export interface FlintUnaryExpression {
  readonly kind: 'unary';
  readonly operator: '!' | '-' | '*' | '&' | '&mut';
  readonly operand: FlintExpression;
  readonly span: FlintSourceSpan;
}

/** First-class function value reference expression. */
export interface FlintFunctionValueExpression {
  readonly kind: 'function-value';
  readonly name: string;
  readonly span: FlintSourceSpan;
}

/** Struct instantiation expression with named field values. */
export interface FlintStructValueExpression {
  readonly kind: 'struct-value';
  readonly type: FlintTypeName;
  readonly fields: Readonly<Record<string, FlintExpression>>;
  readonly span: FlintSourceSpan;
}

/** Enum variant instantiation expression. */
export interface FlintEnumValueExpression {
  readonly kind: 'enum-value';
  readonly type: FlintTypeName;
  readonly variant: string;
  readonly arguments: readonly FlintExpression[];
  readonly span: FlintSourceSpan;
}

/** Fixed-size array literal expression. */
export interface FlintArrayLiteralExpression {
  readonly kind: 'array-literal';
  readonly elements: readonly FlintExpression[];
  readonly type: FlintTypeName;
  readonly span: FlintSourceSpan;
}

/** Dynamically growable vector literal expression. */
export interface FlintVectorLiteralExpression {
  readonly kind: 'vector-literal';
  readonly elements: readonly FlintExpression[];
  readonly type: FlintTypeName;
  readonly span: FlintSourceSpan;
}

/** Indexed element access expression. */
export interface FlintIndexExpression {
  readonly kind: 'index';
  readonly receiver: FlintExpression;
  readonly index: FlintExpression;
  readonly span: FlintSourceSpan;
}

/** Pattern matching pattern: wildcard, literal value, or enum variant. */
export type FlintPattern =
  | { readonly kind: 'wildcard'; readonly span: FlintSourceSpan }
  | { readonly kind: 'literal'; readonly value: boolean | number | string; readonly span: FlintSourceSpan }
  | {
      readonly kind: 'variant';
      readonly name: string;
      readonly bindings: readonly string[];
      readonly span: FlintSourceSpan;
    };

/** Single branch within a match expression or match statement. */
export interface FlintMatchArm {
  readonly kind: 'match-arm';
  readonly pattern: FlintPattern;
  readonly value: FlintExpression;
  readonly span: FlintSourceSpan;
}

/** Pattern matching expression returning the evaluated value of the matched arm. */
export interface FlintMatchExpression {
  readonly kind: 'match';
  readonly value: FlintExpression;
  readonly arms: readonly FlintMatchArm[];
  readonly span: FlintSourceSpan;
}

/** Union of all expression AST nodes in Flint. */
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

/** Variable binding declaration statement. */
export interface FlintLetStatement {
  readonly kind: 'let';
  readonly name: string;
  readonly type: FlintTypeName;
  /** Locals are immutable unless declared as `let mut`. */
  readonly mutable?: true;
  readonly value: FlintExpression;
  readonly span: FlintSourceSpan;
}

/** Variable or index assignment mutation statement. */
export interface FlintAssignmentStatement {
  readonly kind: 'assignment';
  readonly name: string;
  readonly value: FlintExpression;
  readonly index?: FlintExpression;
  readonly span: FlintSourceSpan;
}

/** Function return statement with optional return value. */
export interface FlintReturnStatement {
  readonly kind: 'return';
  readonly value?: FlintExpression;
  readonly span: FlintSourceSpan;
}

/** Solitary expression evaluated as a statement. */
export interface FlintExpressionStatement {
  readonly kind: 'expression-statement';
  readonly expression: FlintExpression;
  readonly span: FlintSourceSpan;
}

/** Conditional branching statement with optional alternate branch. */
export interface FlintIfStatement {
  readonly kind: 'if';
  readonly condition: FlintExpression;
  readonly consequent: readonly FlintStatement[];
  readonly alternate?: readonly FlintStatement[];
  readonly conditionalHint?: 'likely' | 'unlikely';
  readonly span: FlintSourceSpan;
}

/** While loop statement executing while condition holds true. */
export interface FlintWhileStatement {
  readonly kind: 'while';
  readonly condition: FlintExpression;
  readonly body: readonly FlintStatement[];
  readonly span: FlintSourceSpan;
}

/** Classic for loop statement with initializer, condition, update, and body. */
export interface FlintForStatement {
  readonly kind: 'for';
  readonly initializer?: FlintStatement;
  readonly condition: FlintExpression;
  readonly update?: FlintStatement;
  readonly body: readonly FlintStatement[];
  readonly span: FlintSourceSpan;
}

/** Do-while loop statement executing body at least once. */
export interface FlintDoWhileStatement {
  readonly kind: 'do-while';
  readonly body: readonly FlintStatement[];
  readonly condition: FlintExpression;
  readonly span: FlintSourceSpan;
}

/** Iterator yield statement producing a value. */
export interface FlintYieldStatement {
  readonly kind: 'yield';
  readonly value: FlintExpression;
  readonly span: FlintSourceSpan;
}

/** For-in iterator loop statement over an iterable expression. */
export interface FlintIteratorLoopStatement {
  readonly kind: 'iterator-loop';
  readonly binding: string;
  readonly iterator: FlintExpression;
  readonly body: readonly FlintStatement[];
  readonly span: FlintSourceSpan;
}

/** Pattern matching statement executing matched branch body. */
export interface FlintMatchStatement {
  readonly kind: 'match-statement';
  readonly value: FlintExpression;
  readonly arms: readonly FlintMatchArm[];
  readonly span: FlintSourceSpan;
}

/** Individual case branch within a switch statement. */
export interface FlintSwitchCase {
  readonly kind: 'switch-case';
  /** Integer literals are retained as numbers; enum variants as their names. */
  readonly value: number | string;
  readonly body: readonly FlintStatement[];
  readonly span: FlintSourceSpan;
}

/** Multi-way switch statement branching on an integral or variant value. */
export interface FlintSwitchStatement {
  readonly kind: 'switch';
  readonly value: FlintExpression;
  readonly cases: readonly FlintSwitchCase[];
  readonly defaultCase?: readonly FlintStatement[];
  readonly span: FlintSourceSpan;
}

/** Union of all statement AST nodes in Flint. */
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

/** Parameter for a foreign C function declaration. */
export interface FlintForeignFunctionParameter {
  readonly name: string;
  readonly type: FlintTypeName;
  readonly span: FlintSourceSpan;
}

/** Function declaration within a foreign capability block. */
export interface FlintForeignFunctionDeclaration {
  readonly kind: 'foreign-function';
  readonly name: string;
  readonly parameters: readonly FlintForeignFunctionParameter[];
  readonly result: FlintTypeName;
  readonly documentation?: FlintDocumentation;
  readonly span: FlintSourceSpan;
}

/** Foreign capability block binding an external native C or Rust library. */
export interface FlintForeignCapabilityDeclaration {
  readonly kind: 'foreign-capability';
  readonly abi: 'C';
  readonly library: string;
  readonly callingConvention: 'wasm-c-abi';
  readonly memoryModel?: 'shared' | 'multi-memory-segregated';
  readonly functions: readonly FlintForeignFunctionDeclaration[];
  readonly span: FlintSourceSpan;
}

/** Opaque foreign type declaration (handle for opaque C pointers). */
export interface FlintOpaqueForeignTypeDeclaration {
  readonly kind: 'opaque-foreign-type';
  readonly name: string;
  readonly span: FlintSourceSpan;
}

/** Complete source module AST node containing declarations and imports. */
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
  readonly foreignCapabilities?: readonly FlintForeignCapabilityDeclaration[];
  readonly opaqueForeignTypes?: readonly FlintOpaqueForeignTypeDeclaration[];
  readonly span: FlintSourceSpan;
}
