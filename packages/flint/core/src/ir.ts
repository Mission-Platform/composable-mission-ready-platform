import { createFlintIteratorBoundaryDescriptor } from './generics.js';
import { FLINT_MEMORY_FUNCTION_MAP, type FlintMemoryOperation } from './stdlib/memory.js';
import { FLINT_REGEX_FUNCTION_MAP, type FlintRegexOperation } from './stdlib/regex.js';
import { FLINT_STRING_FUNCTION_MAP, type FlintStringOperation } from './stdlib/string.js';

import type {
  FlintBinaryOperator,
  FlintExpression,
  FlintPrimitiveType,
  FlintSourceModuleImport,
  FlintStatement,
  FlintTypeName,
  FlintCapabilityImport,
  FlintFunction,
  FlintModule,
  FlintParameter,
  FlintPattern,
} from './ast.js';
import type { FlintSourceSpan } from './diagnostics.js';
import type { FlintIteratorBoundaryDescriptor } from './manifest.js';

/**
 * Built-in collection operations emitted for high-level collection primitives.
 */
export type FlintCollectionOperation = 'array-iter' | 'iterator-next' | 'array-length';

/**
 * Low-level intermediate representation for a literal scalar value.
 */
export interface FlintIrLiteralExpression {
  readonly kind: 'literal';
  readonly value: boolean | number | string;
  readonly type: FlintPrimitiveType;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for an identifier variable reference.
 */
export interface FlintIrIdentifierExpression {
  readonly kind: 'identifier';
  readonly name: string;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for a function call or collection intrinsic invocation.
 */
export interface FlintIrCallExpression {
  readonly kind: 'call';
  readonly callee: string;
  readonly arguments: readonly FlintIrExpression[];
  /** Set only for compiler-owned calls; these never become ABI imports. */
  readonly standardLibrary?:
    FlintRegexOperation | FlintStringOperation | FlintMemoryOperation | FlintCollectionOperation;
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
  readonly kind: 'binary';
  readonly operator: FlintBinaryOperator;
  readonly left: FlintIrExpression;
  readonly right: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for a unary negation or inversion.
 */
export interface FlintIrUnaryExpression {
  readonly kind: 'unary';
  readonly operator: '!' | '-';
  readonly operand: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for a first-class function pointer value.
 */
export interface FlintIrFunctionValueExpression {
  readonly kind: 'function-value';
  readonly name: string;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for instantiating an aggregate struct value.
 */
export interface FlintIrStructValueExpression {
  readonly kind: 'struct-value';
  readonly type: FlintTypeName;
  readonly fields: Readonly<Record<string, FlintIrExpression>>;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for constructing a tagged enum variant.
 */
export interface FlintIrEnumValueExpression {
  readonly kind: 'enum-value';
  readonly type: FlintTypeName;
  readonly variant: string;
  readonly arguments: readonly FlintIrExpression[];
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for an individual match case arm.
 */
export interface FlintIrMatchArm {
  readonly kind: 'match-arm';
  readonly pattern: FlintPattern;
  readonly value: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for a pattern-matching expression.
 */
export interface FlintIrMatchExpression {
  readonly kind: 'match';
  readonly value: FlintIrExpression;
  readonly arms: readonly FlintIrMatchArm[];
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for an array or vector literal.
 */
export interface FlintIrArrayLiteralExpression {
  readonly kind: 'array-literal' | 'vector-literal';
  readonly elements: readonly FlintIrExpression[];
  readonly type: FlintTypeName;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for array or vector indexing.
 */
export interface FlintIrIndexExpression {
  readonly kind: 'index';
  readonly receiver: FlintIrExpression;
  readonly index: FlintIrExpression;
  readonly boundsCheck?: 'required' | 'proven-safe';
  readonly span: FlintSourceSpan;
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
  | FlintIrIndexExpression;

/**
 * Low-level intermediate representation for a local variable binding declaration.
 */
export interface FlintIrLetStatement {
  readonly kind: 'let';
  readonly name: string;
  readonly type: FlintTypeName;
  readonly value: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for a variable or index assignment.
 */
export interface FlintIrAssignmentStatement {
  readonly kind: 'assignment';
  readonly name: string;
  readonly index?: FlintIrExpression;
  readonly value: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for a return statement.
 */
export interface FlintIrReturnStatement {
  readonly kind: 'return';
  readonly value?: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for an expression evaluated for side effects.
 */
export interface FlintIrExpressionStatement {
  readonly kind: 'expression-statement';
  readonly expression: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for conditional branching.
 */
export interface FlintIrIfStatement {
  readonly kind: 'if';
  readonly condition: FlintIrExpression;
  readonly consequent: readonly FlintIrStatement[];
  readonly alternate?: readonly FlintIrStatement[];
  readonly conditionalHint?: 'likely' | 'unlikely';
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for a while loop.
 */
export interface FlintIrWhileStatement {
  readonly kind: 'while';
  readonly condition: FlintIrExpression;
  readonly body: readonly FlintIrStatement[];
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for a do-while loop.
 */
export interface FlintIrDoWhileStatement {
  readonly kind: 'do-while';
  readonly body: readonly FlintIrStatement[];
  readonly condition: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for generator yielding.
 */
export interface FlintIrYieldStatement {
  readonly kind: 'yield';
  readonly value: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for stateful iterator iteration loops.
 */
export interface FlintIrIteratorLoopStatement {
  readonly kind: 'iterator-loop';
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
  readonly kind: 'match-statement';
  readonly value: FlintIrExpression;
  readonly arms: readonly FlintIrMatchArm[];
  readonly span: FlintSourceSpan;
}

/**
 * Low-level intermediate representation for a switch branch statement.
 */
export interface FlintIrSwitchStatement {
  readonly kind: 'switch';
  readonly value: FlintIrExpression;
  readonly cases: readonly {
    readonly kind: 'switch-case';
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
export type FlintIrPurity = 'pure' | 'effectful' | 'unknown';

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
  readonly kind: 'function';
  readonly name: string;
  readonly exported: boolean;
  readonly iterable?: FlintFunction['iterable'];
  readonly inlinePolicy?: FlintFunction['inlinePolicy'];
  /** Source documentation is analysis metadata and is not part of executable contracts. */
  readonly documentation?: FlintFunction['documentation'];
  readonly genericParameters: FlintFunction['genericParameters'];
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
  readonly kind: 'module';
  readonly name: string;
  readonly imports: readonly FlintCapabilityImport[];
  readonly sourceImports: readonly FlintSourceModuleImport[];
  readonly structs: FlintModule['structs'];
  readonly enums: FlintModule['enums'];
  readonly interfaces: FlintModule['interfaces'];
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

/**
 * Identifies built-in collection method operations from the method identifier name.
 *
 * @param method - Trailing identifier name in a method call expression.
 * @returns Recognized FlintCollectionOperation, or undefined.
 */
function resolveCollectionOperation(method?: string): FlintCollectionOperation | undefined {
  if (method === 'iter') return 'array-iter';
  if (method === 'next') return 'iterator-next';
  if (method === 'length') return 'array-length';
  return undefined;
}

/**
 * Resolves standard library operations from known string, regex, or memory registries.
 *
 * @param callee - Canonical callee name.
 * @returns Resolved operation identifier, or undefined if not a standard library primitive.
 */
function resolveStdlibOperation(
  callee: string,
): FlintRegexOperation | FlintStringOperation | FlintMemoryOperation | undefined {
  return (
    FLINT_REGEX_FUNCTION_MAP.get(callee)?.operation ??
    FLINT_STRING_FUNCTION_MAP.get(callee)?.operation ??
    FLINT_MEMORY_FUNCTION_MAP.get(callee)?.operation
  );
}

/**
 * Lowers a function call expression and resolves any standard library or collection intrinsic mappings.
 *
 * @param expression - AST call expression node.
 * @returns Lowered IR call expression node.
 */
function lowerCallExpression(expression: Extract<FlintExpression, { kind: 'call' }>): FlintIrCallExpression {
  const dot = expression.callee.lastIndexOf('.');
  const receiver = dot > 0 ? expression.callee.slice(0, dot) : undefined;
  const method = dot > 0 ? expression.callee.slice(dot + 1) : undefined;
  const collectionOperation = resolveCollectionOperation(method);
  const standardLibrary = collectionOperation ?? resolveStdlibOperation(expression.callee);
  return {
    ...expression,
    arguments: [
      ...(receiver === undefined ? [] : [{ kind: 'identifier' as const, name: receiver, span: expression.span }]),
      ...expression.arguments.map((argument) => lowerAstExpression(argument)),
    ],
    ...(standardLibrary === undefined ? {} : { standardLibrary }),
  };
}

/**
 * Lowers compound aggregate expressions (struct, enum, match) into intermediate representation.
 *
 * @param expression - AST compound expression node.
 * @returns Lowered IR expression node.
 */
function lowerCompoundExpression(
  expression: Extract<FlintExpression, { kind: 'struct-value' | 'enum-value' | 'match' }>,
): FlintIrExpression {
  if (expression.kind === 'struct-value') {
    return {
      ...expression,
      fields: Object.fromEntries(
        Object.entries(expression.fields).map(([name, value]) => [name, lowerAstExpression(value)]),
      ),
    };
  }
  if (expression.kind === 'enum-value') {
    return {
      ...expression,
      arguments: expression.arguments.map((argument) => lowerAstExpression(argument)),
    };
  }
  return {
    ...expression,
    value: lowerAstExpression(expression.value),
    arms: expression.arms.map((arm) => ({ ...arm, value: lowerAstExpression(arm.value) })),
  };
}

/**
 * Lowers collection-related expressions (array literal, vector literal, index) into intermediate representation.
 *
 * @param expression - AST collection expression node.
 * @returns Lowered IR expression node.
 */
function lowerCollectionExpression(
  expression: Extract<FlintExpression, { kind: 'array-literal' | 'vector-literal' | 'index' }>,
): FlintIrExpression {
  if (expression.kind === 'index') {
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

/**
 * Checks whether an expression is a leaf literal, identifier, or function pointer.
 *
 * @param expression - Candidate AST expression node.
 * @returns True if expression is literal, identifier, or function-value.
 */
function isPrimitiveOrFunctionValue(
  expression: FlintExpression,
): expression is Extract<FlintExpression, { kind: 'literal' | 'identifier' | 'function-value' }> {
  return expression.kind === 'literal' || expression.kind === 'identifier' || expression.kind === 'function-value';
}

/**
 * Checks whether an expression is a compound aggregate value or match expression.
 *
 * @param expression - Candidate AST expression node.
 * @returns True if expression is struct-value, enum-value, or match.
 */
function isCompoundAstExpression(
  expression: FlintExpression,
): expression is Extract<FlintExpression, { kind: 'struct-value' | 'enum-value' | 'match' }> {
  return expression.kind === 'struct-value' || expression.kind === 'enum-value' || expression.kind === 'match';
}

/**
 * Checks whether an expression is a collection literal or index operation.
 *
 * @param expression - Candidate AST expression node.
 * @returns True if expression is array-literal, vector-literal, or index.
 */
function isCollectionAstExpression(
  expression: FlintExpression,
): expression is Extract<FlintExpression, { kind: 'array-literal' | 'vector-literal' | 'index' }> {
  return expression.kind === 'array-literal' || expression.kind === 'vector-literal' || expression.kind === 'index';
}

/**
 * Recursively lowers an AST expression into intermediate representation.
 *
 * @param expression - AST expression to lower.
 * @returns Lowered IR expression node.
 * @throws {Error} If expression is undefined.
 */
function lowerAstExpression(expression: FlintExpression): FlintIrExpression {
  if (expression === undefined) throw new Error('Cannot lower an absent expression.');
  if (isPrimitiveOrFunctionValue(expression)) return expression;
  if (expression.kind === 'call') return lowerCallExpression(expression);
  if (isCompoundAstExpression(expression)) return lowerCompoundExpression(expression);
  if (isCollectionAstExpression(expression)) return lowerCollectionExpression(expression);
  if (expression.kind === 'unary') return { ...expression, operand: lowerAstExpression(expression.operand) };
  return { ...expression, left: lowerAstExpression(expression.left), right: lowerAstExpression(expression.right) };
}

/**
 * Inspects a statement body to determine if all statements are yield statements with a static bound.
 *
 * @param statements - Sequence of AST statements in an iterable function body.
 * @returns Number of yield statements if statically bounded, or undefined.
 */
function staticallyBoundedIteratorYields(statements: readonly FlintStatement[]): number | undefined {
  let yields = 0;
  for (const statement of statements) {
    if (statement.kind !== 'yield') return undefined;
    yields += 1;
  }
  return yields;
}

/**
 * Builds a lookup map of statically bounded iterable functions in a module.
 *
 * @param module - Module AST to analyze.
 * @returns Map of function names to known yield counts.
 */
function iteratorBounds(module: FlintModule): ReadonlyMap<string, number> {
  return new Map(
    module.functions.flatMap((declaration) => {
      if (declaration.iterable !== true) return [];
      const bound = staticallyBoundedIteratorYields(declaration.body);
      return bound === undefined ? [] : [[declaration.name, bound] as const];
    }),
  );
}

/**
 * Lowers a simple linear statement into intermediate representation.
 *
 * @param statement - Let, assignment, return, expression, or yield AST statement.
 * @returns Lowered IR statement node.
 */
function lowerLinearStatement(
  statement: Extract<FlintStatement, { kind: 'let' | 'assignment' | 'return' | 'expression-statement' | 'yield' }>,
): FlintIrStatement {
  switch (statement.kind) {
    case 'let': {
      return { ...statement, value: lowerAstExpression(statement.value) };
    }
    case 'return': {
      return {
        ...statement,
        ...(statement.value === undefined ? {} : { value: lowerAstExpression(statement.value) }),
      };
    }
    case 'assignment': {
      return {
        ...statement,
        ...(statement.index === undefined ? {} : { index: lowerAstExpression(statement.index) }),
        value: lowerAstExpression(statement.value),
      };
    }
    case 'expression-statement': {
      return { ...statement, expression: lowerAstExpression(statement.expression) };
    }
    case 'yield': {
      return { ...statement, value: lowerAstExpression(statement.value) };
    }
    default: {
      const exhaustiveCheck: never = statement;
      throw new Error(`Unexpected linear statement kind: ${(exhaustiveCheck as { kind?: string }).kind}`);
    }
  }
}

/**
 * Lowers a branching statement (if, switch, match) into intermediate representation.
 *
 * @param statement - Branching statement AST node.
 * @param stateAllocator - Counter allocating state numbers for nested iterator loops.
 * @param boundedIterators - Map of statically proven iterator yield bounds.
 * @returns Lowered IR statement node.
 */
function lowerBranchStatement(
  statement: Extract<FlintStatement, { kind: 'if' | 'switch' | 'match-statement' }>,
  stateAllocator: { value: number },
  boundedIterators: ReadonlyMap<string, number>,
): FlintIrStatement {
  if (statement.kind === 'if') {
    return {
      kind: 'if' as const,
      condition: lowerAstExpression(statement.condition),
      consequent: lowerStatements(statement.consequent, stateAllocator, boundedIterators),
      ...(statement.alternate === undefined
        ? {}
        : { alternate: lowerStatements(statement.alternate, stateAllocator, boundedIterators) }),
      ...(statement.conditionalHint === undefined ? {} : { conditionalHint: statement.conditionalHint }),
      span: statement.span,
    };
  }
  if (statement.kind === 'match-statement') {
    return {
      ...statement,
      value: lowerAstExpression(statement.value),
      arms: statement.arms.map((arm) => ({ ...arm, value: lowerAstExpression(arm.value) })),
    };
  }
  const common = {
    kind: 'switch' as const,
    value: lowerAstExpression(statement.value),
    cases: statement.cases.map((arm) => ({
      ...arm,
      body: lowerStatements(arm.body, stateAllocator, boundedIterators),
    })),
    span: statement.span,
  };
  return statement.defaultCase === undefined
    ? common
    : { ...common, defaultCase: lowerStatements(statement.defaultCase, stateAllocator, boundedIterators) };
}

/**
 * Lowers a loop statement (while, do-while, iterator-loop) into intermediate representation.
 *
 * @param statement - Loop statement AST node.
 * @param stateAllocator - Counter allocating state numbers for nested iterator loops.
 * @param boundedIterators - Map of statically proven iterator yield bounds.
 * @returns Lowered IR statement node.
 */
function lowerLoopStatement(
  statement: Extract<FlintStatement, { kind: 'while' | 'do-while' | 'for' | 'iterator-loop' }>,
  stateAllocator: { value: number },
  boundedIterators: ReadonlyMap<string, number>,
): FlintIrStatement {
  if (statement.kind === 'for') {
    throw new Error(`Imperative '${statement.kind}' cannot be lowered into Flint IR.`);
  }
  if (statement.kind === 'while') {
    return {
      ...statement,
      condition: lowerAstExpression(statement.condition),
      body: lowerStatements(statement.body, stateAllocator, boundedIterators),
    };
  }
  if (statement.kind === 'do-while') {
    return {
      ...statement,
      body: lowerStatements(statement.body, stateAllocator, boundedIterators),
      condition: lowerAstExpression(statement.condition),
    };
  }
  const iteratorState = stateAllocator.value;
  stateAllocator.value += 1;
  const boundedLength =
    statement.iterator.kind === 'call' && statement.iterator.arguments.length === 0
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

/**
 * Identifies linear statements that do not introduce control-flow branching or loops.
 *
 * @param statement - Candidate AST statement.
 * @returns True if statement is let, assignment, return, expression, or yield.
 */
function isLinearStatement(
  statement: FlintStatement,
): statement is Extract<FlintStatement, { kind: 'let' | 'assignment' | 'return' | 'expression-statement' | 'yield' }> {
  const k = statement.kind;
  return k === 'let' || k === 'assignment' || k === 'return' || k === 'expression-statement' || k === 'yield';
}

/**
 * Identifies branching control-flow statements.
 *
 * @param statement - Candidate AST statement.
 * @returns True if statement is if, switch, or match.
 */
function isBranchStatement(
  statement: FlintStatement,
): statement is Extract<FlintStatement, { kind: 'if' | 'switch' | 'match-statement' }> {
  const k = statement.kind;
  return k === 'if' || k === 'switch' || k === 'match-statement';
}

/**
 * Lowers an individual AST statement into intermediate representation.
 *
 * @param statement - AST statement to lower.
 * @param stateAllocator - Counter allocating state numbers for nested iterator loops.
 * @param boundedIterators - Map of statically proven iterator yield bounds.
 * @returns Lowered IR statement node.
 */
function lowerStatement(
  statement: FlintStatement,
  stateAllocator: { value: number },
  boundedIterators: ReadonlyMap<string, number>,
): FlintIrStatement {
  if (isLinearStatement(statement)) {
    return lowerLinearStatement(statement);
  }
  if (isBranchStatement(statement)) {
    return lowerBranchStatement(statement, stateAllocator, boundedIterators);
  }
  return lowerLoopStatement(statement, stateAllocator, boundedIterators);
}

/**
 * Lowers a sequence of AST statements into intermediate representation statements.
 *
 * @param statements - Sequence of statements to lower.
 * @param stateAllocator - Counter allocating state numbers for nested iterator loops.
 * @param boundedIterators - Map of statically proven iterator yield bounds.
 * @returns Sequence of lowered IR statements.
 */
function lowerStatements(
  statements: readonly FlintStatement[],
  stateAllocator: { value: number } = { value: 0 },
  boundedIterators: ReadonlyMap<string, number> = new Map(),
): readonly FlintIrStatement[] {
  return statements.map((statement) => lowerStatement(statement, stateAllocator, boundedIterators));
}

/**
 * Derives iterator boundary descriptors from all iterable functions in a module.
 *
 * @param module - Compiled module AST.
 * @returns Collection of iterator boundary descriptors.
 */
function iteratorDescriptors(module: FlintModule): readonly FlintIteratorBoundaryDescriptor[] {
  return module.functions.flatMap((declaration) => {
    if (!declaration.iterable || declaration.result.arguments?.[0] === undefined) return [];
    return [
      createFlintIteratorBoundaryDescriptor(
        declaration.result.reference ?? declaration.result.name,
        declaration.result.arguments[0],
        `${declaration.name}.next`,
        declaration.result.ownership,
      ),
    ].map((descriptor) => ({
      ...descriptor,
      // Preserve the factory export name for JS adapter wiring.
      id: declaration.name,
    }));
  });
}

/**
 * Lowers a complete Flint module AST into an intermediate representation module.
 *
 * @param module - Source module AST.
 * @returns Lowered IR module structure.
 */
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

/**
 * Visits the field values of a struct-value expression.
 *
 * @param expression - IR struct-value expression node.
 * @param countExpression - Expression counter callback.
 */
function countStructValueExpression(
  expression: Extract<FlintIrExpression, { kind: 'struct-value' }>,
  countExpression: (child: FlintIrExpression) => void,
): void {
  for (const value of Object.values(expression.fields)) countExpression(value);
}

/**
 * Visits the constructor arguments of an enum-value expression.
 *
 * @param expression - IR enum-value expression node.
 * @param countExpression - Expression counter callback.
 */
function countEnumValueExpression(
  expression: Extract<FlintIrExpression, { kind: 'enum-value' }>,
  countExpression: (child: FlintIrExpression) => void,
): void {
  for (const value of expression.arguments) countExpression(value);
}

/**
 * Visits the scrutinee and arm values of a match expression.
 *
 * @param expression - IR match expression node.
 * @param countExpression - Expression counter callback.
 */
function countMatchExpression(
  expression: Extract<FlintIrExpression, { kind: 'match' }>,
  countExpression: (child: FlintIrExpression) => void,
): void {
  countExpression(expression.value);
  for (const arm of expression.arms) countExpression(arm.value);
}

/**
 * Visits the elements of an array-literal or vector-literal expression.
 *
 * @param expression - IR array-literal or vector-literal expression node.
 * @param countExpression - Expression counter callback.
 */
function countArrayOrVectorExpression(
  expression: Extract<FlintIrExpression, { kind: 'array-literal' | 'vector-literal' }>,
  countExpression: (child: FlintIrExpression) => void,
): void {
  for (const value of expression.elements) countExpression(value);
}

/**
 * Identifies aggregate, collection, and match expressions requiring nested expression visitation.
 *
 * @param expression - Candidate IR expression.
 * @returns True if expression is struct-value, enum-value, array-literal, vector-literal, or match.
 */
function isCollectionOrMatchExpression(
  expression: FlintIrExpression,
): expression is Extract<
  FlintIrExpression,
  { kind: 'struct-value' | 'enum-value' | 'array-literal' | 'vector-literal' | 'match' }
> {
  const kind = expression.kind;
  return (
    kind === 'struct-value' ||
    kind === 'enum-value' ||
    kind === 'array-literal' ||
    kind === 'vector-literal' ||
    kind === 'match'
  );
}

/**
 * Visits nested expressions in aggregate, collection, and match expressions.
 *
 * @param expression - Compound expression node.
 * @param countExpression - Expression counter callback.
 */
function countCollectionOrMatchExpression(
  expression: Extract<
    FlintIrExpression,
    { kind: 'struct-value' | 'enum-value' | 'array-literal' | 'vector-literal' | 'match' }
  >,
  countExpression: (child: FlintIrExpression) => void,
): void {
  switch (expression.kind) {
    case 'struct-value': {
      countStructValueExpression(expression, countExpression);
      break;
    }
    case 'enum-value': {
      countEnumValueExpression(expression, countExpression);
      break;
    }
    case 'match': {
      countMatchExpression(expression, countExpression);
      break;
    }
    case 'array-literal':
    case 'vector-literal': {
      countArrayOrVectorExpression(expression, countExpression);
      break;
    }
    default: {
      break;
    }
  }
}

/**
 * Visits arguments within a call expression.
 *
 * @param expression - IR call expression node.
 * @param countExpression - Expression counter callback.
 */
function countCallExpression(
  expression: Extract<FlintIrExpression, { kind: 'call' }>,
  countExpression: (child: FlintIrExpression) => void,
): void {
  for (const argument of expression.arguments) countExpression(argument);
}

/**
 * Visits operands in binary and index expressions.
 *
 * @param expression - IR binary or index expression node.
 * @param countExpression - Expression counter callback.
 */
function countBinaryOrIndexExpression(
  expression: Extract<FlintIrExpression, { kind: 'binary' | 'index' }>,
  countExpression: (child: FlintIrExpression) => void,
): void {
  if (expression.kind === 'binary') {
    countExpression(expression.left);
    countExpression(expression.right);
  } else {
    countExpression(expression.receiver);
    countExpression(expression.index);
  }
}

/**
 * Recursively visits all sub-expressions within a composite IR expression.
 *
 * @param expression - IR expression node to inspect.
 * @param countExpression - Recursive visitor callback.
 */
function countCompositeExpression(
  expression: FlintIrExpression,
  countExpression: (child: FlintIrExpression) => void,
): void {
  if (isCollectionOrMatchExpression(expression)) {
    countCollectionOrMatchExpression(expression, countExpression);
    return;
  }
  switch (expression.kind) {
    case 'call': {
      countCallExpression(expression, countExpression);
      break;
    }
    case 'unary': {
      countExpression(expression.operand);
      break;
    }
    case 'binary':
    case 'index': {
      countBinaryOrIndexExpression(expression, countExpression);
      break;
    }
    default: {
      break;
    }
  }
}

/**
 * Visits branching statements (if, switch, match-statement) to count sub-expressions and statements.
 *
 * @param statement - Branching statement node.
 * @param countExpression - Expression counter callback.
 * @param countStatements - Recursive statement counter callback.
 */
function countBranchStatement(
  statement: Extract<FlintIrStatement, { kind: 'if' | 'switch' | 'match-statement' }>,
  countExpression: (expression: FlintIrExpression) => void,
  countStatements: (statements: readonly FlintIrStatement[]) => void,
): void {
  if (statement.kind === 'if') {
    countExpression(statement.condition);
    countStatements(statement.consequent);
    if (statement.alternate !== undefined) countStatements(statement.alternate);
  } else if (statement.kind === 'switch') {
    countExpression(statement.value);
    for (const arm of statement.cases) countStatements(arm.body);
    if (statement.defaultCase !== undefined) countStatements(statement.defaultCase);
  } else {
    countExpression(statement.value);
    for (const arm of statement.arms) countExpression(arm.value);
  }
}

/**
 * Visits loop statements (while, do-while, iterator-loop) to count sub-expressions and statements.
 *
 * @param statement - Loop statement node.
 * @param countExpression - Expression counter callback.
 * @param countStatements - Recursive statement counter callback.
 */
function countLoopStatement(
  statement: Extract<FlintIrStatement, { kind: 'while' | 'do-while' | 'iterator-loop' }>,
  countExpression: (expression: FlintIrExpression) => void,
  countStatements: (statements: readonly FlintIrStatement[]) => void,
): void {
  if (statement.kind === 'iterator-loop') {
    countExpression(statement.iterator);
    countStatements(statement.body);
  } else {
    countExpression(statement.condition);
    countStatements(statement.body);
  }
}

/**
 * Visits linear statements (let, assignment, return, expression, yield) to count sub-expressions.
 *
 * @param statement - Linear statement node.
 * @param countExpression - Expression counter callback.
 */
function countLinearStatement(
  statement: Extract<FlintIrStatement, { kind: 'let' | 'assignment' | 'return' | 'expression-statement' | 'yield' }>,
  countExpression: (expression: FlintIrExpression) => void,
): void {
  switch (statement.kind) {
    case 'let':
    case 'yield': {
      countExpression(statement.value);
      break;
    }
    case 'assignment': {
      if (statement.index !== undefined) countExpression(statement.index);
      countExpression(statement.value);
      break;
    }
    case 'return': {
      if (statement.value !== undefined) countExpression(statement.value);
      break;
    }
    case 'expression-statement': {
      countExpression(statement.expression);
      break;
    }
    default: {
      break;
    }
  }
}

/**
 * Identifies IR linear statements that do not introduce control-flow branching or loops.
 *
 * @param statement - Candidate IR statement.
 * @returns True if statement is let, assignment, return, expression, or yield.
 */
function isLinearIrStatement(
  statement: FlintIrStatement,
): statement is Extract<
  FlintIrStatement,
  { kind: 'let' | 'assignment' | 'return' | 'expression-statement' | 'yield' }
> {
  const kind = statement.kind;
  return (
    kind === 'let' || kind === 'assignment' || kind === 'return' || kind === 'expression-statement' || kind === 'yield'
  );
}

/**
 * Identifies IR branching control-flow statements.
 *
 * @param statement - Candidate IR statement.
 * @returns True if statement is if, switch, or match-statement.
 */
function isBranchIrStatement(
  statement: FlintIrStatement,
): statement is Extract<FlintIrStatement, { kind: 'if' | 'switch' | 'match-statement' }> {
  const kind = statement.kind;
  return kind === 'if' || kind === 'switch' || kind === 'match-statement';
}

/**
 * Traverses an IR module to count the total number of functions, statements, and expressions.
 *
 * @param module - Lowered IR module to inspect.
 * @returns Total counts of functions, statements, and expressions.
 */
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

/**
 * Type assertion validating that IR statement sequence is structurally compatible with AST statement array.
 *
 * @param value - Candidate statement array.
 * @throws {TypeError} If value is not an array.
 */
function assertIsAstStatements(value: unknown): asserts value is readonly FlintStatement[] {
  if (!Array.isArray(value)) {
    throw new TypeError('Expected an array of statements.');
  }
}

/**
 * Converts an intermediate representation statement list into AST statements for AST-level consumers.
 *
 * @param statements - Sequence of IR statements.
 * @returns Equivalent AST statement sequence.
 */
function toAstStatements(statements: readonly FlintIrStatement[]): readonly FlintStatement[] {
  const candidate: unknown = statements;
  assertIsAstStatements(candidate);
  return candidate;
}

/**
 * Reconstructs a FlintModule AST from an intermediate representation module.
 *
 * @param module - Compiled IR module.
 * @returns Converted FlintModule.
 */
export function lowerFlintIrToModule(module: FlintIrModule): FlintModule {
  return {
    ...module,
    functions: module.functions.map((declaration) => ({
      ...declaration,
      body: toAstStatements(declaration.body),
    })),
  };
}
