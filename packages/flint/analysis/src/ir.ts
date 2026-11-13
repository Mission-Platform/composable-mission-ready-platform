import {
  flintTypeNameToString,
  type FlintBinaryOperator,
  type FlintCapabilityImport,
  type FlintExpression,
  type FlintFunction,
  type FlintMarkupBlockExpression,
  type FlintModule,
  type FlintObjectExpression,
  type FlintOwnership,
  type FlintParameter,
  type FlintPattern,
  type FlintPrimitiveType,
  type FlintSourceModuleImport,
  type FlintSourceSpan,
  type FlintStatement,
  type FlintTypeName,
} from "@mission-platform/flint-ast";

/** Checked guest-linear-memory operations reserved by the compiler. */
export type FlintMemoryOperation =
  | "memory-alloc"
  | "memory-dealloc"
  | "memory-realloc"
  | "memory-load-u32"
  | "memory-store-u32"
  | "memory-load-u8"
  | "memory-store-u8"
  | "memory-load-f64"
  | "memory-store-f64"
  | "f64-from-u32";

/** Compiler-owned deterministic string and byte operations. */
export type FlintStringOperation =
  | "string-concat"
  | "string-length"
  | "string-byte-at"
  | "string-starts-with"
  | "string-slice"
  | "string-to-i32"
  | "bytes-length"
  | "bytes-length-u32"
  | "bytes-byte-at"
  | "bytes-byte-at-u32"
  | "bytes-slice";

/** Standard library regex operations supported by compiler lowering. */
export type FlintRegexOperation =
  | "full-match"
  | "prefix-match"
  | "search"
  | "full-capture-start"
  | "full-capture-end"
  | "prefix-capture-start"
  | "prefix-capture-end"
  | "search-capture-start"
  | "search-capture-end";

export const FLINT_STRING_FUNCTION_MAP = new Map<
  string,
  { operation: FlintStringOperation }
>([
  ["string_concat", { operation: "string-concat" }],
  ["string_length", { operation: "string-length" }],
  ["string_byte_at", { operation: "string-byte-at" }],
  ["string_starts_with", { operation: "string-starts-with" }],
  ["string_slice", { operation: "string-slice" }],
  ["string_to_i32", { operation: "string-to-i32" }],
  ["bytes_length", { operation: "bytes-length" }],
  ["bytes_length_u32", { operation: "bytes-length-u32" }],
  ["bytes_byte_at", { operation: "bytes-byte-at" }],
  ["bytes_byte_at_u32", { operation: "bytes-byte-at-u32" }],
  ["bytes_slice", { operation: "bytes-slice" }],
]);

export const FLINT_REGEX_FUNCTION_MAP = new Map<
  string,
  { operation: FlintRegexOperation }
>([
  ["regex_full_match", { operation: "full-match" }],
  ["regex_prefix_match", { operation: "prefix-match" }],
  ["regex_search", { operation: "search" }],
  ["regex_full_capture_start", { operation: "full-capture-start" }],
  ["regex_full_capture_end", { operation: "full-capture-end" }],
  ["regex_prefix_capture_start", { operation: "prefix-capture-start" }],
  ["regex_prefix_capture_end", { operation: "prefix-capture-end" }],
  ["regex_search_capture_start", { operation: "search-capture-start" }],
  ["regex_search_capture_end", { operation: "search-capture-end" }],
]);

export const FLINT_MEMORY_FUNCTION_MAP = new Map<
  string,
  { operation: FlintMemoryOperation }
>([
  ["memory_alloc", { operation: "memory-alloc" }],
  ["memory_dealloc", { operation: "memory-dealloc" }],
  ["memory_realloc", { operation: "memory-realloc" }],
  ["memory_load_u32", { operation: "memory-load-u32" }],
  ["memory_store_u32", { operation: "memory-store-u32" }],
  ["memory_load_u8", { operation: "memory-load-u8" }],
  ["memory_store_u8", { operation: "memory-store-u8" }],
  ["memory_load_f64", { operation: "memory-load-f64" }],
  ["memory_store_f64", { operation: "memory-store-f64" }],
  ["f64_from_u32", { operation: "f64-from-u32" }],
  ["malloc", { operation: "memory-alloc" }],
  ["free", { operation: "memory-dealloc" }],
]);

export const DEFAULT_C_ALLOCATOR_BRIDGE = "fws_alloc";

export interface FlintIteratorBoundaryDescriptor {
  readonly id: string;
  readonly generic: string;
  readonly elementType: string;
  readonly nextFunction: string;
  readonly representation: "descriptor-boundary";
  readonly ownership: FlintOwnership;
}

export function createFlintIteratorBoundaryDescriptor(
  generic: string,
  elementType: FlintTypeName,
  nextFunction: string,
  ownership: FlintOwnership = "borrowed",
): FlintIteratorBoundaryDescriptor {
  return {
    id: `${generic}<${flintTypeNameToString(elementType)}>`,
    generic,
    elementType: flintTypeNameToString(elementType),
    nextFunction,
    representation: "descriptor-boundary",
    ownership,
  };
}

/**
 * Built-in collection operations emitted for high-level collection primitives.
 */
export type FlintCollectionOperation =
  "array-iter" | "iterator-next" | "array-length";

/**
 * Low-level intermediate representation for a literal scalar value.
 */
export interface FlintIrLiteralExpression {
  readonly kind: "literal";
  readonly value: boolean | number | string;
  readonly type: FlintPrimitiveType;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for an identifier variable reference.
 */
export interface FlintIrIdentifierExpression {
  readonly kind: "identifier";
  readonly name: string;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for a function call or collection intrinsic invocation.
 */
export interface FlintIrCallExpression {
  readonly kind: "call";
  readonly callee: string;
  readonly arguments: readonly FlintIrExpression[];
  /** Set only for compiler-owned calls; these never become ABI imports. */
  readonly standardLibrary?:
    | FlintRegexOperation
    | FlintStringOperation
    | FlintMemoryOperation
    | FlintCollectionOperation;
  /** Set by tail-position analysis; it is a hint, never a semantic requirement. */
  readonly tailPosition?: boolean;
  /** The source function which supplied this expression after a safe inline. */
  readonly inlinedFrom?: string;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for a binary operator evaluation.
 */
export interface FlintIrBinaryExpression {
  readonly kind: "binary";
  readonly operator: FlintBinaryOperator;
  readonly left: FlintIrExpression;
  readonly right: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for a unary negation or inversion.
 */
export interface FlintIrUnaryExpression {
  readonly kind: "unary";
  readonly operator: "!" | "-" | "*" | "&" | "&mut" | "?";
  readonly operand: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for a first-class function pointer value.
 */
export interface FlintIrFunctionValueExpression {
  readonly kind: "function-value";
  readonly name: string;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for instantiating an aggregate struct value.
 */
export interface FlintIrStructValueExpression {
  readonly kind: "struct-value";
  readonly type: FlintTypeName;
  readonly fields: Readonly<Record<string, FlintIrExpression>>;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for constructing a tagged enum variant.
 */
export interface FlintIrEnumValueExpression {
  readonly kind: "enum-value";
  readonly type: FlintTypeName;
  readonly variant: string;
  readonly arguments: readonly FlintIrExpression[];
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for an individual match case arm.
 */
export interface FlintIrMatchArm {
  readonly kind: "match-arm";
  readonly pattern: FlintPattern;
  readonly value: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for a pattern-matching expression.
 */
export interface FlintIrMatchExpression {
  readonly kind: "match";
  readonly value: FlintIrExpression;
  readonly arms: readonly FlintIrMatchArm[];
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for an array or vector literal.
 */
export interface FlintIrArrayLiteralExpression {
  readonly kind: "array-literal" | "vector-literal";
  readonly elements: readonly FlintIrExpression[];
  readonly type: FlintTypeName;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for array or vector indexing.
 */
export interface FlintIrIndexExpression {
  readonly kind: "index";
  readonly receiver: FlintIrExpression;
  readonly index: FlintIrExpression;
  readonly boundsCheck?: "required" | "proven-safe";
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for embedded markup block expressions.
 */
export type FlintIrMarkupBlockExpression = FlintMarkupBlockExpression;

/** Lowered object payload used by markup slot attributes. */
export interface FlintIrObjectExpression {
  readonly kind: "object";
  readonly fields: Readonly<Record<string, FlintIrExpression>>;
  readonly span: FlintObjectExpression["span"];
}

/**
 * Discriminated union of all intermediate representation expression node kinds.
 */
export type FlintIrExpression =
  | FlintIrBinaryExpression
  | FlintIrCallExpression
  | FlintIrIdentifierExpression
  | FlintIrLiteralExpression
  | FlintIrFunctionValueExpression
  | FlintIrStructValueExpression
  | FlintIrEnumValueExpression
  | FlintIrMatchExpression
  | FlintIrUnaryExpression
  | FlintIrArrayLiteralExpression
  | FlintIrIndexExpression
  | FlintIrMarkupBlockExpression
  | FlintIrObjectExpression;

/**
 * Low-level intermediate representation for a local variable binding declaration.
 */
export interface FlintIrLetStatement {
  readonly kind: "let";
  readonly name: string;
  readonly type: FlintTypeName;
  readonly value: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for a variable or index assignment.
 */
export interface FlintIrAssignmentStatement {
  readonly kind: "assignment";
  readonly name: string;
  readonly index?: FlintIrExpression;
  readonly value: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for a return statement.
 */
export interface FlintIrReturnStatement {
  readonly kind: "return";
  readonly value?: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for an expression evaluated for side effects.
 */
export interface FlintIrExpressionStatement {
  readonly kind: "expression-statement";
  readonly expression: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for conditional branching.
 */
export interface FlintIrIfStatement {
  readonly kind: "if";
  readonly condition: FlintIrExpression;
  readonly consequent: readonly FlintIrStatement[];
  readonly alternate?: readonly FlintIrStatement[];
  readonly conditionalHint?: "likely" | "unlikely";
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for a while loop.
 */
export interface FlintIrWhileStatement {
  readonly kind: "while";
  readonly condition: FlintIrExpression;
  readonly body: readonly FlintIrStatement[];
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for a do-while loop.
 */
export interface FlintIrDoWhileStatement {
  readonly kind: "do-while";
  readonly body: readonly FlintIrStatement[];
  readonly condition: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for generator yielding.
 */
export interface FlintIrYieldStatement {
  readonly kind: "yield";
  readonly value: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for stateful iterator iteration loops.
 */
export interface FlintIrIteratorLoopStatement {
  readonly kind: "iterator-loop";
  readonly binding: string;
  readonly iterator: FlintIrExpression;
  readonly body: readonly FlintIrStatement[];
  /** Resumption state assigned deterministically within the containing function. */
  readonly state: number;
  /** A bound proven by frontend/static analysis, if one exists. */
  readonly boundedLength?: number;
  readonly suspensionSpan: FlintSourceSpan;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for a statement-level match construct.
 */
export interface FlintIrMatchStatement {
  readonly kind: "match-statement";
  readonly value: FlintIrExpression;
  readonly arms: readonly FlintIrMatchArm[];
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for a switch branch statement.
 */
export interface FlintIrSwitchStatement {
  readonly kind: "switch";
  readonly value: FlintIrExpression;
  readonly cases: readonly {
    readonly kind: "switch-case";
    readonly value: number | string;
    readonly body: readonly FlintIrStatement[];
    readonly span: FlintSourceSpan;
  }[];
  readonly defaultCase?: readonly FlintIrStatement[];
  readonly span: FlintSourceSpan;
}

/**
 * Discriminated union of all intermediate representation statement node kinds.
 */
export type FlintIrStatement =
  | FlintIrExpressionStatement
  | FlintIrAssignmentStatement
  | FlintIrIfStatement
  | FlintIrWhileStatement
  | FlintIrDoWhileStatement
  | FlintIrLetStatement
  | FlintIrReturnStatement
  | FlintIrMatchStatement
  | FlintIrSwitchStatement
  | FlintIrYieldStatement
  | FlintIrIteratorLoopStatement;

/**
 * Purity classification for intermediate representation functions.
 */
export type FlintIrPurity = "pure" | "effectful" | "unknown";

/**
 * Static analysis metadata recorded for intermediate representation functions.
 */
export interface FlintIrFunctionAnalysis {
  readonly purity: FlintIrPurity;
  readonly calls: readonly string[];
  readonly tailCallable: boolean;
  readonly iteratorBoundedLength?: number;
}

/**
 * Low-level intermediate representation of a compiled function.
 */
export interface FlintIrFunction {
  readonly kind: "function";
  readonly name: string;
  readonly exported: boolean;
  readonly iterable?: FlintFunction["iterable"];
  readonly inlinePolicy?: FlintFunction["inlinePolicy"];
  /** Source documentation is analysis metadata and is not part of executable contracts. */
  readonly documentation?: FlintFunction["documentation"];
  readonly genericParameters: FlintFunction["genericParameters"];
  readonly parameters: readonly FlintParameter[];
  readonly result: FlintTypeName;
  readonly body: readonly FlintIrStatement[];
  readonly analysis?: FlintIrFunctionAnalysis;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation of a compiled module.
 */
export interface FlintIrModule {
  readonly kind: "module";
  readonly name: string;
  readonly imports: readonly FlintCapabilityImport[];
  readonly sourceImports: readonly FlintSourceModuleImport[];
  readonly structs: FlintModule["structs"];
  readonly enums: FlintModule["enums"];
  readonly interfaces: FlintModule["interfaces"];
  readonly functions: readonly FlintIrFunction[];
  /** Iterator export boundaries derived from iterable functions for backend/JS adapters. */
  readonly iteratorDescriptors?: readonly FlintIteratorBoundaryDescriptor[];
  readonly span: FlintSourceSpan;
}

/**
 * Statistical counts of structural elements present within an intermediate representation module.
 */
export interface FlintIrCounts {
  readonly functions: number;
  readonly statements: number;
  readonly expressions: number;
}

function resolveCollectionOperation(
  method?: string,
): FlintCollectionOperation | undefined {
  if (method === "iter") return "array-iter";
  if (method === "next") return "iterator-next";
  if (method === "length") return "array-length";
  return undefined;
}

function resolveStdlibOperation(
  callee: string,
):
  | FlintRegexOperation
  | FlintStringOperation
  | FlintMemoryOperation
  | undefined {
  return (
    FLINT_REGEX_FUNCTION_MAP.get(callee)?.operation ??
    FLINT_STRING_FUNCTION_MAP.get(callee)?.operation ??
    FLINT_MEMORY_FUNCTION_MAP.get(callee)?.operation
  );
}

// skipcq: JS-R1005
function lowerCallExpression(
  expression: Extract<FlintExpression, { kind: "call" }>,
): FlintIrCallExpression {
  const dot = expression.callee.lastIndexOf(".");
  const receiver = dot > 0 ? expression.callee.slice(0, dot) : undefined;
  const method = dot > 0 ? expression.callee.slice(dot + 1) : undefined;
  const collectionOperation = resolveCollectionOperation(method);
  const standardLibrary =
    collectionOperation ?? resolveStdlibOperation(expression.callee);
  return {
    ...expression,
    arguments: [
      ...(receiver === undefined
        ? []
        : [
            {
              kind: "identifier" as const,
              name: receiver,
              span: expression.span,
            },
          ]),
      ...expression.arguments.map((argument) => lowerAstExpression(argument)),
    ],
    ...(standardLibrary === undefined ? {} : { standardLibrary }),
  };
}

function lowerCompoundExpression(
  expression: Extract<
    FlintExpression,
    { kind: "struct-value" | "enum-value" | "match" }
  >,
): FlintIrExpression {
  if (expression.kind === "struct-value") {
    return {
      ...expression,
      fields: Object.fromEntries(
        Object.entries(expression.fields).map(([name, value]) => [
          name,
          lowerAstExpression(value),
        ]),
      ),
    };
  }
  if (expression.kind === "enum-value") {
    return {
      ...expression,
      arguments: expression.arguments.map((argument) =>
        lowerAstExpression(argument),
      ),
    };
  }
  return {
    ...expression,
    value: lowerAstExpression(expression.value),
    arms: expression.arms.map((arm) => ({
      ...arm,
      value: lowerAstExpression(arm.value),
    })),
  };
}

function lowerCollectionExpression(
  expression: Extract<
    FlintExpression,
    { kind: "array-literal" | "vector-literal" | "index" }
  >,
): FlintIrExpression {
  if (expression.kind === "index") {
    return {
      ...expression,
      receiver: lowerAstExpression(expression.receiver),
      index: lowerAstExpression(expression.index),
    };
  }
  return {
    ...expression,
    elements: expression.elements.map((element) => lowerAstExpression(element)),
  };
}

function isPrimitiveOrFunctionValue(
  expression: FlintExpression,
): expression is Extract<
  FlintExpression,
  { kind: "literal" | "identifier" | "function-value" }
> {
  return (
    expression.kind === "literal" ||
    expression.kind === "identifier" ||
    expression.kind === "function-value"
  );
}

function isCompoundAstExpression(
  expression: FlintExpression,
): expression is Extract<
  FlintExpression,
  { kind: "struct-value" | "enum-value" | "match" }
> {
  return (
    expression.kind === "struct-value" ||
    expression.kind === "enum-value" ||
    expression.kind === "match"
  );
}

function isCollectionAstExpression(
  expression: FlintExpression,
): expression is Extract<
  FlintExpression,
  { kind: "array-literal" | "vector-literal" | "index" }
> {
  return (
    expression.kind === "array-literal" ||
    expression.kind === "vector-literal" ||
    expression.kind === "index"
  );
}

// skipcq: JS-R1005
function lowerAstExpression(expression: FlintExpression): FlintIrExpression {
  if (expression === undefined)
    throw new Error("Cannot lower an absent expression.");
  if (expression.kind === "comptime-expression")
    return lowerAstExpression(expression.expression);
  if (isPrimitiveOrFunctionValue(expression)) return expression;
  if (expression.kind === "markup-block") return expression;
  if (expression.kind === "object") {
    return {
      ...expression,
      fields: Object.fromEntries(
        Object.entries(expression.fields).map(([name, value]) => [
          name,
          lowerAstExpression(value),
        ]),
      ),
    };
  }
  if (expression.kind === "call") return lowerCallExpression(expression);
  if (isCompoundAstExpression(expression))
    return lowerCompoundExpression(expression);
  if (isCollectionAstExpression(expression))
    return lowerCollectionExpression(expression);
  if (expression.kind === "unary")
    return { ...expression, operand: lowerAstExpression(expression.operand) };
  if (expression.kind === "binary") {
    return {
      ...expression,
      left: lowerAstExpression(expression.left),
      right: lowerAstExpression(expression.right),
    };
  }
  const exhaustiveCheck: never = expression;
  throw new Error(
    `Unhandled expression kind: ${(exhaustiveCheck as { kind?: string }).kind}`,
  );
}

function staticallyBoundedIteratorYields(
  statements: readonly FlintStatement[],
): number | undefined {
  let yields = 0;
  for (const statement of statements) {
    if (statement.kind !== "yield") return undefined;
    yields += 1;
  }
  return yields;
}

function iteratorBounds(module: FlintModule): ReadonlyMap<string, number> {
  return new Map(
    module.functions.flatMap((declaration) => {
      if (declaration.iterable !== true) return [];
      const bound = staticallyBoundedIteratorYields(declaration.body);
      return bound === undefined ? [] : [[declaration.name, bound] as const];
    }),
  );
}

// skipcq: JS-R1005
function lowerLinearStatement(
  statement: Extract<
    FlintStatement,
    { kind: "let" | "assignment" | "return" | "expression-statement" | "yield" }
  >,
): FlintIrStatement {
  switch (statement.kind) {
    case "let": {
      return { ...statement, value: lowerAstExpression(statement.value) };
    }
    case "return": {
      return {
        kind: "return",
        span: statement.span,
        ...(statement.value === undefined
          ? {}
          : { value: lowerAstExpression(statement.value) }),
      };
    }
    case "assignment": {
      return {
        kind: "assignment",
        name: statement.name,
        span: statement.span,
        ...(statement.index === undefined
          ? {}
          : { index: lowerAstExpression(statement.index) }),
        value: lowerAstExpression(statement.value),
      };
    }
    case "expression-statement": {
      return {
        ...statement,
        expression: lowerAstExpression(statement.expression),
      };
    }
    case "yield": {
      return { ...statement, value: lowerAstExpression(statement.value) };
    }
    default: {
      const exhaustiveCheck: never = statement;
      throw new Error(
        `Unexpected linear statement kind: ${(exhaustiveCheck as { kind?: string }).kind}`,
      );
    }
  }
}

// skipcq: JS-R1005
function lowerBranchStatement(
  statement: Extract<
    FlintStatement,
    { kind: "if" | "switch" | "match-statement" }
  >,
  stateAllocator: { value: number },
  boundedIterators: ReadonlyMap<string, number>,
): FlintIrStatement {
  if (statement.kind === "if") {
    return {
      kind: "if" as const,
      condition: lowerAstExpression(statement.condition),
      consequent: lowerStatements(
        statement.consequent,
        stateAllocator,
        boundedIterators,
      ),
      ...(statement.alternate === undefined
        ? {}
        : {
            alternate: lowerStatements(
              statement.alternate,
              stateAllocator,
              boundedIterators,
            ),
          }),
      ...(statement.conditionalHint === undefined
        ? {}
        : { conditionalHint: statement.conditionalHint }),
      span: statement.span,
    };
  }
  if (statement.kind === "match-statement") {
    return {
      ...statement,
      value: lowerAstExpression(statement.value),
      arms: statement.arms.map((arm) => ({
        ...arm,
        value: lowerAstExpression(arm.value),
      })),
    };
  }
  const common = {
    kind: "switch" as const,
    value: lowerAstExpression(statement.value),
    cases: statement.cases.map((arm) => ({
      ...arm,
      body: lowerStatements(arm.body, stateAllocator, boundedIterators),
    })),
    span: statement.span,
  };
  return statement.defaultCase === undefined
    ? common
    : {
        ...common,
        defaultCase: lowerStatements(
          statement.defaultCase,
          stateAllocator,
          boundedIterators,
        ),
      };
}

// skipcq: JS-R1005
function lowerLoopStatement(
  statement: Extract<
    FlintStatement,
    { kind: "while" | "do-while" | "for" | "iterator-loop" }
  >,
  stateAllocator: { value: number },
  boundedIterators: ReadonlyMap<string, number>,
): FlintIrStatement {
  if (statement.kind === "for") {
    throw new Error(
      `Imperative '${statement.kind}' cannot be lowered into Flint IR.`,
    );
  }
  if (statement.kind === "while") {
    return {
      ...statement,
      condition: lowerAstExpression(statement.condition),
      body: lowerStatements(statement.body, stateAllocator, boundedIterators),
    };
  }
  if (statement.kind === "do-while") {
    return {
      ...statement,
      body: lowerStatements(statement.body, stateAllocator, boundedIterators),
      condition: lowerAstExpression(statement.condition),
    };
  }
  const iteratorState = stateAllocator.value;
  stateAllocator.value += 1;
  const boundedLength =
    statement.iterator.kind === "call" &&
    statement.iterator.arguments.length === 0
      ? boundedIterators.get(statement.iterator.callee)
      : undefined;
  return {
    ...statement,
    iterator: lowerAstExpression(statement.iterator),
    body: lowerStatements(statement.body, stateAllocator, boundedIterators),
    state: iteratorState,
    ...(boundedLength === undefined ? {} : { boundedLength }),
    suspensionSpan: statement.span,
  };
}

function isLinearStatement(
  statement: FlintStatement,
): statement is Extract<
  FlintStatement,
  { kind: "let" | "assignment" | "return" | "expression-statement" | "yield" }
> {
  const kind = statement.kind;
  return (
    kind === "let" ||
    kind === "assignment" ||
    kind === "return" ||
    kind === "expression-statement" ||
    kind === "yield"
  );
}

function isBranchStatement(
  statement: FlintStatement,
): statement is Extract<
  FlintStatement,
  { kind: "if" | "switch" | "match-statement" }
> {
  const kind = statement.kind;
  return kind === "if" || kind === "switch" || kind === "match-statement";
}

function lowerStatement(
  statement: FlintStatement,
  stateAllocator: { value: number },
  boundedIterators: ReadonlyMap<string, number>,
): FlintIrStatement {
  if (statement.kind === "comptime-statement") {
    const lowered = lowerStatements(
      statement.body,
      stateAllocator,
      boundedIterators,
    );
    return (
      lowered[0] ?? {
        kind: "expression-statement",
        expression: {
          kind: "literal",
          value: 0,
          type: "i32",
          span: statement.span,
        },
        span: statement.span,
      }
    );
  }
  if (isLinearStatement(statement)) {
    return lowerLinearStatement(statement);
  }
  if (isBranchStatement(statement)) {
    return lowerBranchStatement(statement, stateAllocator, boundedIterators);
  }
  return lowerLoopStatement(statement, stateAllocator, boundedIterators);
}

function lowerStatements(
  statements: readonly FlintStatement[],
  stateAllocator: { value: number } = { value: 0 },
  boundedIterators: ReadonlyMap<string, number> = new Map(),
): readonly FlintIrStatement[] {
  return statements.flatMap((statement) => {
    if (statement.kind === "comptime-statement") {
      return lowerStatements(statement.body, stateAllocator, boundedIterators);
    }
    return [lowerStatement(statement, stateAllocator, boundedIterators)];
  });
}

function iteratorDescriptors(
  module: FlintModule,
): readonly FlintIteratorBoundaryDescriptor[] {
  return module.functions.flatMap((declaration) => {
    if (
      !declaration.iterable ||
      declaration.result.arguments?.[0] === undefined
    )
      return [];
    return [
      createFlintIteratorBoundaryDescriptor(
        declaration.result.reference ?? declaration.result.name,
        declaration.result.arguments[0],
        `${declaration.name}.next`,
        declaration.result.ownership,
      ),
    ].map((descriptor) => ({
      ...descriptor,
      id: declaration.name,
    }));
  });
}

export function lowerFlintToIr(module: FlintModule): FlintIrModule {
  const boundedIterators = iteratorBounds(module);
  return {
    ...module,
    functions: module.functions.map((declaration) => ({
      ...declaration,
      body: lowerStatements(declaration.body, { value: 0 }, boundedIterators),
    })),
    iteratorDescriptors: iteratorDescriptors(module),
  };
}

function countStructValueExpression(
  expression: Extract<FlintIrExpression, { kind: "struct-value" }>,
  countExpression: (child: FlintIrExpression) => void,
): void {
  for (const value of Object.values(expression.fields)) countExpression(value);
}

function countEnumValueExpression(
  expression: Extract<FlintIrExpression, { kind: "enum-value" }>,
  countExpression: (child: FlintIrExpression) => void,
): void {
  for (const value of expression.arguments) countExpression(value);
}

function countMatchExpression(
  expression: Extract<FlintIrExpression, { kind: "match" }>,
  countExpression: (child: FlintIrExpression) => void,
): void {
  countExpression(expression.value);
  for (const arm of expression.arms) countExpression(arm.value);
}

function countArrayOrVectorExpression(
  expression: Extract<
    FlintIrExpression,
    { kind: "array-literal" | "vector-literal" }
  >,
  countExpression: (child: FlintIrExpression) => void,
): void {
  for (const value of expression.elements) countExpression(value);
}

function isCollectionOrMatchExpression(
  expression: FlintIrExpression,
): expression is Extract<
  FlintIrExpression,
  {
    kind:
      | "struct-value"
      | "enum-value"
      | "array-literal"
      | "vector-literal"
      | "match";
  }
> {
  const kind = expression.kind;
  return (
    kind === "struct-value" ||
    kind === "enum-value" ||
    kind === "array-literal" ||
    kind === "vector-literal" ||
    kind === "match"
  );
}

// skipcq: JS-R1005
function countCollectionOrMatchExpression(
  expression: Extract<
    FlintIrExpression,
    {
      kind:
        | "struct-value"
        | "enum-value"
        | "array-literal"
        | "vector-literal"
        | "match";
    }
  >,
  countExpression: (child: FlintIrExpression) => void,
): void {
  switch (expression.kind) {
    case "struct-value": {
      countStructValueExpression(expression, countExpression);
      break;
    }
    case "enum-value": {
      countEnumValueExpression(expression, countExpression);
      break;
    }
    case "match": {
      countMatchExpression(expression, countExpression);
      break;
    }
    case "array-literal":
    case "vector-literal": {
      countArrayOrVectorExpression(expression, countExpression);
      break;
    }
    default: {
      break;
    }
  }
}

function countCallExpression(
  expression: Extract<FlintIrExpression, { kind: "call" }>,
  countExpression: (child: FlintIrExpression) => void,
): void {
  for (const argument of expression.arguments) countExpression(argument);
}

function countBinaryOrIndexExpression(
  expression: Extract<FlintIrExpression, { kind: "binary" | "index" }>,
  countExpression: (child: FlintIrExpression) => void,
): void {
  if (expression.kind === "binary") {
    countExpression(expression.left);
    countExpression(expression.right);
  } else {
    countExpression(expression.receiver);
    countExpression(expression.index);
  }
}

// skipcq: JS-R1005
function countCompositeExpression(
  expression: FlintIrExpression,
  countExpression: (child: FlintIrExpression) => void,
): void {
  if (isCollectionOrMatchExpression(expression)) {
    countCollectionOrMatchExpression(expression, countExpression);
    return;
  }
  switch (expression.kind) {
    case "call": {
      countCallExpression(expression, countExpression);
      break;
    }
    case "unary": {
      countExpression(expression.operand);
      break;
    }
    case "binary":
    case "index": {
      countBinaryOrIndexExpression(expression, countExpression);
      break;
    }
    default: {
      break;
    }
  }
}

// skipcq: JS-R1005
function countBranchStatement(
  statement: Extract<
    FlintIrStatement,
    { kind: "if" | "switch" | "match-statement" }
  >,
  countExpression: (expression: FlintIrExpression) => void,
  countStatements: (statements: readonly FlintIrStatement[]) => void,
): void {
  if (statement.kind === "if") {
    countExpression(statement.condition);
    countStatements(statement.consequent);
    if (statement.alternate !== undefined) countStatements(statement.alternate);
  } else if (statement.kind === "switch") {
    countExpression(statement.value);
    for (const arm of statement.cases) countStatements(arm.body);
    if (statement.defaultCase !== undefined)
      countStatements(statement.defaultCase);
  } else {
    countExpression(statement.value);
    for (const arm of statement.arms) countExpression(arm.value);
  }
}

function countLoopStatement(
  statement: Extract<
    FlintIrStatement,
    { kind: "while" | "do-while" | "iterator-loop" }
  >,
  countExpression: (expression: FlintIrExpression) => void,
  countStatements: (statements: readonly FlintIrStatement[]) => void,
): void {
  if (statement.kind === "iterator-loop") {
    countExpression(statement.iterator);
    countStatements(statement.body);
  } else {
    countExpression(statement.condition);
    countStatements(statement.body);
  }
}

// skipcq: JS-R1005
function countLinearStatement(
  statement: Extract<
    FlintIrStatement,
    { kind: "let" | "assignment" | "return" | "expression-statement" | "yield" }
  >,
  countExpression: (expression: FlintIrExpression) => void,
): void {
  switch (statement.kind) {
    case "let":
    case "yield": {
      countExpression(statement.value);
      break;
    }
    case "assignment": {
      if (statement.index !== undefined) countExpression(statement.index);
      countExpression(statement.value);
      break;
    }
    case "return": {
      if (statement.value !== undefined) countExpression(statement.value);
      break;
    }
    case "expression-statement": {
      countExpression(statement.expression);
      break;
    }
    default: {
      break;
    }
  }
}

function isLinearIrStatement(
  statement: FlintIrStatement,
): statement is Extract<
  FlintIrStatement,
  { kind: "let" | "assignment" | "return" | "expression-statement" | "yield" }
> {
  return isLinearStatement(statement as unknown as FlintStatement);
}

function isBranchIrStatement(
  statement: FlintIrStatement,
): statement is Extract<
  FlintIrStatement,
  { kind: "if" | "switch" | "match-statement" }
> {
  const kind = statement.kind;
  return kind === "if" || kind === "switch" || kind === "match-statement";
}

export function countFlintIr(module: FlintIrModule): FlintIrCounts {
  let statements = 0;
  let expressions = 0;
  const countExpression = (expression: FlintIrExpression): void => {
    expressions += 1;
    countCompositeExpression(expression, countExpression);
  };
  const countStatements = (items: readonly FlintIrStatement[]): void => {
    for (const statement of items) {
      statements += 1;
      if (isLinearIrStatement(statement)) {
        countLinearStatement(statement, countExpression);
      } else if (isBranchIrStatement(statement)) {
        countBranchStatement(statement, countExpression, countStatements);
      } else {
        countLoopStatement(statement, countExpression, countStatements);
      }
    }
  };
  for (const declaration of module.functions) countStatements(declaration.body);
  return { functions: module.functions.length, statements, expressions };
}

function assertIsAstStatements(
  value: unknown,
): asserts value is readonly FlintStatement[] {
  if (!Array.isArray(value)) {
    throw new TypeError("Expected an array of statements.");
  }
}

function toAstStatements(
  statements: readonly FlintIrStatement[],
): readonly FlintStatement[] {
  const candidate: unknown = statements;
  assertIsAstStatements(candidate);
  return candidate;
}

export function lowerFlintIrToModule(module: FlintIrModule): FlintModule {
  return {
    ...module,
    functions: module.functions.map((declaration) => ({
      ...declaration,
      body: toAstStatements(declaration.body),
    })),
  };
}
