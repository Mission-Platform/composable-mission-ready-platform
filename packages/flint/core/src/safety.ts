import {
  flintDefaultPassingMode,
  isFlintPodType,
  type FlintExpression,
  type FlintFunction,
  type FlintModule,
  type FlintStatement,
  type FlintTypeName,
} from './ast.js';
import { createDiagnostic, type FlintDiagnostic, type FlintSourceSpan } from './diagnostics.js';

/**
 * Represents a local variable or parameter binding in the safety analysis environment.
 */
interface Binding {
  /** Inferred or declared type of the bound value. */
  readonly type: FlintTypeName;
  /** Whether the binding was declared mutable (e.g. `let mut`). */
  readonly mutable: boolean;
  /** Lexical region depth: 0 for parameters (caller region), >= 1 for locals. */
  readonly depth: number;
}

/**
 * Shared safety context threaded through statement and expression checks.
 */
interface SafetyContext {
  /** Source file name used when creating diagnostics. */
  readonly fileName: string;
  /** Enclosing module AST. */
  readonly module: FlintModule;
  /** Known functions declared in the module, keyed by name. */
  readonly functions: ReadonlyMap<string, FlintFunction>;
  /** Diagnostics accumulator array. */
  readonly diagnostics: FlintDiagnostic[];
  /** In-scope bindings mapped by variable identifier. */
  readonly locals: Map<string, Binding>;
  /** Current lexical region nesting depth. */
  readonly depth: number;
  /** Whether the enclosing function is an iterator generator. */
  readonly iterable: boolean;
}

/**
 * Performs source-level checks that cannot be represented by the legacy type strings.
 *
 * @param module - Module AST to validate.
 * @param fileName - File name used for diagnostics.
 * @param diagnostics - Accumulator for error diagnostics.
 */
export function checkFlintSafety(module: FlintModule, fileName: string, diagnostics: FlintDiagnostic[]): void {
  const functions = new Map(module.functions.map((declaration) => [declaration.name, declaration]));
  for (const declaration of module.functions) {
    const locals = new Map<string, Binding>();
    for (const parameter of declaration.parameters)
      locals.set(parameter.name, { type: parameter.type, mutable: parameter.mutable === true, depth: 0 });
    const context: SafetyContext = {
      fileName,
      module,
      functions,
      diagnostics,
      locals,
      // Parameters belong to the caller's region; function locals belong to
      // the function region and therefore cannot be returned by reference.
      depth: 1,
      iterable: declaration.iterable === true,
    };
    for (const statement of declaration.body) checkStatement(statement, context, declaration.result);
  }
}

/**
 * Checks a statement for memory safety, borrow lifetimes, and region escape rules.
 *
 * @param statement - Statement AST node to check.
 * @param context - Enclosing safety analysis context.
 * @param result - Declared return type of the enclosing function.
 */
function checkStatement(statement: FlintStatement, context: SafetyContext, result: FlintTypeName): void {
  if (checkBindingOrActionStatement(statement, context, result)) return;
  checkControlFlowStatement(statement, context, result);
}

/**
 * Checks linear statements: bindings, assignments, returns, yields, and expression statements.
 *
 * @param statement - Statement AST node to check.
 * @param context - Enclosing safety analysis context.
 * @param result - Declared return type of the enclosing function.
 * @returns True if handled, false otherwise.
 */
function checkBindingOrActionStatement(
  statement: FlintStatement,
  context: SafetyContext,
  result: FlintTypeName,
): boolean {
  switch (statement.kind) {
    case 'let': {
      checkLetStatement(statement, context);
      return true;
    }
    case 'assignment': {
      checkAssignmentStatement(statement, context);
      return true;
    }
    case 'return': {
      checkReturnStatement(statement, context, result);
      return true;
    }
    case 'yield': {
      checkYieldStatement(statement, context);
      return true;
    }
    case 'expression-statement': {
      checkExpression(statement.expression, context);
      return true;
    }
    default: {
      return false;
    }
  }
}

/**
 * Checks control flow statements: if, loops, switch, and match statements.
 *
 * @param statement - Statement AST node to check.
 * @param context - Enclosing safety analysis context.
 * @param result - Declared return type of the enclosing function.
 */
function checkControlFlowStatement(statement: FlintStatement, context: SafetyContext, result: FlintTypeName): void {
  switch (statement.kind) {
    case 'if': {
      checkIfStatement(statement, context, result);
      break;
    }
    case 'while':
    case 'do-while': {
      checkLoopStatement(statement, context, result);
      break;
    }
    case 'for': {
      checkForStatement(statement, context, result);
      break;
    }
    case 'iterator-loop': {
      checkIteratorLoopStatement(statement, context, result);
      break;
    }
    case 'switch': {
      checkSwitchStatement(statement, context, result);
      break;
    }
    case 'match-statement': {
      checkMatchStatement(statement, context, result);
      break;
    }
    default: {
      break;
    }
  }
}

/**
 * Checks a let declaration and registers the new binding in the local environment.
 *
 * @param statement - Let statement node.
 * @param context - Safety context.
 */
function checkLetStatement(statement: Extract<FlintStatement, { kind: 'let' }>, context: SafetyContext): void {
  checkExpression(statement.value, context);
  context.locals.set(statement.name, {
    type: statement.type,
    mutable: statement.mutable === true,
    depth: context.depth,
  });
}

/**
 * Checks an assignment statement for mutability violations.
 *
 * @param statement - Assignment statement node.
 * @param context - Safety context.
 */
function checkAssignmentStatement(
  statement: Extract<FlintStatement, { kind: 'assignment' }>,
  context: SafetyContext,
): void {
  checkExpression(statement.value, context);
  if (statement.index !== undefined) checkExpression(statement.index, context);
  const binding = context.locals.get(statement.name);
  if (binding === undefined) return;
  const canMutatePointee = statement.index !== undefined && binding.type.referenceMode === 'mut-ref';
  if (!binding.mutable && !canMutatePointee)
    addDiagnostic(
      context,
      'FLINT-SAFE-001',
      `Cannot mutate immutable binding '${statement.name}'; declare it with 'let mut' or use an explicit '&mut' reference.`,
      statement.span,
      "Prefix the local with 'mut' when rebinding or use '&mut T' for a mutable borrow.",
    );
}

/**
 * Checks a return statement for expression safety and region escape.
 *
 * @param statement - Return statement node.
 * @param context - Safety context.
 * @param result - Function return type.
 */
function checkReturnStatement(
  statement: Extract<FlintStatement, { kind: 'return' }>,
  context: SafetyContext,
  result: FlintTypeName,
): void {
  if (statement.value !== undefined) {
    checkExpression(statement.value, context);
    checkEscape(statement.value, result, context);
  }
}

/**
 * Checks a yield statement for suspension boundary escape violations.
 *
 * @param statement - Yield statement node.
 * @param context - Safety context.
 */
function checkYieldStatement(statement: Extract<FlintStatement, { kind: 'yield' }>, context: SafetyContext): void {
  checkExpression(statement.value, context);
  if (context.iterable && statement.value.kind === 'identifier') {
    const binding = context.locals.get(statement.value.name);
    if (
      binding !== undefined &&
      !isFlintPodType(binding.type, context.module) &&
      binding.type.ownership !== 'owned' &&
      binding.type.ownership !== 'shared'
    )
      addDiagnostic(
        context,
        'FLINT-SAFE-004',
        `Value '${statement.value.name}' cannot cross an iterator suspension as a region borrow.`,
        statement.value.span,
        'Return an owned/shared value or make the suspension boundary explicit.',
      );
  }
}

/**
 * Checks an if statement and its conditional branches in scoped environments.
 *
 * @param statement - If statement node.
 * @param context - Safety context.
 * @param result - Function return type.
 */
function checkIfStatement(
  statement: Extract<FlintStatement, { kind: 'if' }>,
  context: SafetyContext,
  result: FlintTypeName,
): void {
  checkExpression(statement.condition, context);
  checkScopedStatements(statement.consequent, context, result);
  if (statement.alternate !== undefined) checkScopedStatements(statement.alternate, context, result);
}

/**
 * Checks while and do-while loops in scoped environments.
 *
 * @param statement - While or do-while statement node.
 * @param context - Safety context.
 * @param result - Function return type.
 */
function checkLoopStatement(
  statement: Extract<FlintStatement, { kind: 'while' | 'do-while' }>,
  context: SafetyContext,
  result: FlintTypeName,
): void {
  checkExpression(statement.condition, context);
  checkScopedStatements(statement.body, context, result);
}

/**
 * Checks a for loop and its optional initializer/update statements.
 *
 * @param statement - For statement node.
 * @param context - Safety context.
 * @param result - Function return type.
 */
function checkForStatement(
  statement: Extract<FlintStatement, { kind: 'for' }>,
  context: SafetyContext,
  result: FlintTypeName,
): void {
  if (statement.initializer !== undefined) checkStatement(statement.initializer, context, result);
  checkExpression(statement.condition, context);
  checkScopedStatements(statement.body, context, result);
  if (statement.update !== undefined) checkStatement(statement.update, context, result);
}

/**
 * Checks an iterator loop and introduces the loop binding into scope.
 *
 * @param statement - Iterator-loop statement node.
 * @param context - Safety context.
 * @param result - Function return type.
 */
function checkIteratorLoopStatement(
  statement: Extract<FlintStatement, { kind: 'iterator-loop' }>,
  context: SafetyContext,
  result: FlintTypeName,
): void {
  checkExpression(statement.iterator, context);
  checkScopedStatements(statement.body, context, result, [
    [
      statement.binding,
      { type: { kind: 'type-name', name: 'unit', span: statement.span }, mutable: false, depth: context.depth + 1 },
    ],
  ]);
}

/**
 * Checks a switch statement and all branch arm bodies.
 *
 * @param statement - Switch statement node.
 * @param context - Safety context.
 * @param result - Function return type.
 */
function checkSwitchStatement(
  statement: Extract<FlintStatement, { kind: 'switch' }>,
  context: SafetyContext,
  result: FlintTypeName,
): void {
  checkExpression(statement.value, context);
  for (const arm of statement.cases) checkScopedStatements(arm.body, context, result);
  if (statement.defaultCase !== undefined) checkScopedStatements(statement.defaultCase, context, result);
}

/**
 * Checks a match statement and all arm expressions in scoped environments.
 *
 * @param statement - Match statement node.
 * @param context - Safety context.
 * @param result - Function return type.
 */
function checkMatchStatement(
  statement: Extract<FlintStatement, { kind: 'match-statement' }>,
  context: SafetyContext,
  result: FlintTypeName,
): void {
  checkExpression(statement.value, context);
  for (const arm of statement.arms)
    checkScopedStatements(
      [
        {
          kind: 'expression-statement',
          expression: arm.value,
          span: arm.span,
        },
      ],
      context,
      result,
    );
}

/**
 * Type-checks nested statements inside a cloned child safety scope.
 *
 * @param statements - List of statements in the inner block.
 * @param parent - Enclosing safety context.
 * @param result - Declared return type of the enclosing function.
 * @param additions - Optional additional scoped bindings introduced by the block.
 */
function checkScopedStatements(
  statements: readonly FlintStatement[],
  parent: SafetyContext,
  result: FlintTypeName,
  additions: readonly (readonly [string, Binding])[] = [],
): void {
  const context: SafetyContext = { ...parent, depth: parent.depth + 1, locals: new Map(parent.locals) };
  for (const [name, binding] of additions) context.locals.set(name, binding);
  for (const statement of statements) checkStatement(statement, context, result);
}

/**
 * Recursively inspects an expression for borrow safety and multiple-mutable borrow conflicts.
 *
 * @param expression - Expression AST node to check.
 * @param context - Enclosing safety analysis context.
 */
function checkExpression(expression: FlintExpression, context: SafetyContext): void {
  if (expression.kind === 'call') {
    checkCallExpression(expression, context);
    return;
  }
  if (checkOperatorExpression(expression, context)) return;
  checkCollectionOrAggregateExpression(expression, context);
}

/**
 * Checks a call expression's arguments and reference borrow exclusivity.
 *
 * @param expression - Call expression node.
 * @param context - Safety context.
 */
function checkCallExpression(expression: Extract<FlintExpression, { kind: 'call' }>, context: SafetyContext): void {
  for (const argument of expression.arguments) checkExpression(argument, context);
  const declaration = context.functions.get(expression.callee);
  if (declaration === undefined) return;
  const mutableArguments = new Set<string>();
  for (const [index, parameter] of declaration.parameters.entries())
    checkCallParameterBorrow(index, parameter, expression, context, mutableArguments);
}

/**
 * Verifies that a call argument passed by reference satisfies mutability and uniqueness rules.
 *
 * @param index - Zero-based parameter position.
 * @param parameter - Function parameter declaration.
 * @param expression - Enclosing call expression node.
 * @param context - Safety context.
 * @param mutableArguments - Set tracking bindings already borrowed mutably in this call.
 */
function checkCallParameterBorrow(
  index: number,
  parameter: FlintFunction['parameters'][number],
  expression: Extract<FlintExpression, { kind: 'call' }>,
  context: SafetyContext,
  mutableArguments: Set<string>,
): void {
  const mode = parameter.type.referenceMode;
  if (mode !== 'ref' && mode !== 'mut-ref') return;
  const argument = expression.arguments[index];
  if (argument?.kind !== 'identifier') {
    addDiagnostic(
      context,
      'FLINT-SAFE-002',
      `Argument ${index + 1} of '${expression.callee}' must be a named value for an explicit reference.`,
      expression.span,
    );
    return;
  }
  const binding = context.locals.get(argument.name);
  if (binding === undefined) return;
  if (mode === 'mut-ref') checkMutableBorrowRules(argument, binding, context, mutableArguments);
}

/**
 * Enforces mutability requirement and aliasing rejection for a mutable reference borrow.
 *
 * @param argument - Identifier expression being passed.
 * @param binding - Binding definition of the passed variable.
 * @param context - Safety context.
 * @param mutableArguments - Set tracking bindings already borrowed mutably in this call.
 */
function checkMutableBorrowRules(
  argument: Extract<FlintExpression, { kind: 'identifier' }>,
  binding: Binding,
  context: SafetyContext,
  mutableArguments: Set<string>,
): void {
  if (!binding.mutable && binding.type.referenceMode !== 'mut-ref')
    addDiagnostic(
      context,
      'FLINT-SAFE-003',
      `Cannot mutably borrow immutable binding '${argument.name}'.`,
      argument.span,
      "Declare it with 'let mut'.",
    );
  if (mutableArguments.has(argument.name))
    addDiagnostic(
      context,
      'FLINT-SAFE-005',
      `Binding '${argument.name}' is passed through more than one mutable reference.`,
      argument.span,
      'Pass disjoint bindings to conflicting mutable references.',
    );
  mutableArguments.add(argument.name);
}

/**
 * Checks binary, unary, and index operator expressions recursively.
 *
 * @param expression - Expression AST node.
 * @param context - Safety context.
 * @returns True if handled, false otherwise.
 */
function checkOperatorExpression(expression: FlintExpression, context: SafetyContext): boolean {
  if (expression.kind === 'binary') {
    checkExpression(expression.left, context);
    checkExpression(expression.right, context);
    return true;
  }
  if (expression.kind === 'unary') {
    checkExpression(expression.operand, context);
    return true;
  }
  if (expression.kind === 'index') {
    checkExpression(expression.receiver, context);
    checkExpression(expression.index, context);
    return true;
  }
  return false;
}

/**
 * Checks a match expression and all arm bodies recursively.
 *
 * @param expression - Match expression node.
 * @param context - Safety context.
 */
function checkMatchExpression(expression: Extract<FlintExpression, { kind: 'match' }>, context: SafetyContext): void {
  checkExpression(expression.value, context);
  for (const arm of expression.arms) checkExpression(arm.value, context);
}

/**
 * Checks collection, aggregate, and match sub-expressions recursively.
 *
 * @param expression - Expression AST node.
 * @param context - Safety context.
 */
function checkCollectionOrAggregateExpression(expression: FlintExpression, context: SafetyContext): void {
  switch (expression.kind) {
    case 'array-literal':
    case 'vector-literal': {
      for (const element of expression.elements) checkExpression(element, context);
      break;
    }
    case 'struct-value': {
      for (const value of Object.values(expression.fields)) checkExpression(value, context);
      break;
    }
    case 'enum-value': {
      for (const argument of expression.arguments) checkExpression(argument, context);
      break;
    }
    case 'match': {
      checkMatchExpression(expression, context);
      break;
    }
    default: {
      break;
    }
  }
}

/**
 * Determines whether a type represents a built-in non-owning handle (Array, Vector, bytes, string).
 *
 * @param result - Type name node.
 * @returns True if the type name corresponds to a built-in reference type.
 */
function isBuiltInNonOwningHandle(result: FlintTypeName): boolean {
  return (
    result.reference === 'Array' || result.reference === 'Vector' || result.name === 'bytes' || result.name === 'string'
  );
}

/**
 * Determines whether a type represents a user-defined non-owning class struct or enum.
 *
 * @param result - Type name node.
 * @param module - Enclosing module AST.
 * @returns True if the type references a non-record struct or an enum.
 */
function isUserDefinedNonOwningHandle(result: FlintTypeName, module: FlintModule): boolean {
  if (result.reference === undefined) return false;
  const isClassStruct = module.structs.some(({ name, record }) => name === result.reference && record !== true);
  return isClassStruct || module.enums.some(({ name }) => name === result.reference);
}

/**
 * True when the function result would leave as a non-owning handle/reference.
 * Owned/shared results and POD-by-value results are not escape hazards.
 *
 * @param result - Type name of the result.
 * @param context - Safety context.
 * @returns True if the result represents a non-owning escape hazard.
 */
function isNonOwningEscapeResult(result: FlintTypeName, context: SafetyContext): boolean {
  if (result.ownership === 'owned' || result.ownership === 'shared') return false;
  if (result.referenceMode === 'ref' || result.referenceMode === 'mut-ref') return true;
  // Unresolved generics stay unknown: only concrete non-POD handles/aggregates
  // are treated as region-escape results until monomorphization proves otherwise.
  const passing = flintDefaultPassingMode(result, context.module);
  if (passing !== 'immutable-reference' && passing !== 'mutable-reference') return false;
  return isBuiltInNonOwningHandle(result) || isUserDefinedNonOwningHandle(result, context.module);
}

/**
 * Result classification indicating whether a returned value is permitted to cross scope boundaries.
 */
type EscapeClassification = { readonly allowed: true } | { readonly allowed: false; readonly message: string };

/**
 * Classifies whether a returned identifier can safely escape its enclosing scope.
 *
 * @param expression - Identifier expression.
 * @param context - Safety context.
 * @returns Escape classification result.
 */
function classifyReturnedIdentifier(
  expression: Extract<FlintExpression, { kind: 'identifier' }>,
  context: SafetyContext,
): EscapeClassification {
  const binding = context.locals.get(expression.name);
  // Unknown names are reported by the type checker.
  if (binding === undefined) return { allowed: true };
  // Parameters live in the caller region.
  if (binding.depth === 0) return { allowed: true };
  if (binding.type.ownership === 'owned' || binding.type.ownership === 'shared') return { allowed: true };
  if (isFlintPodType(binding.type, context.module)) return { allowed: true };
  return {
    allowed: false,
    message: `Region value '${expression.name}' cannot escape its enclosing scope.`,
  };
}

/**
 * Classifies whether a returned struct or enum value can safely escape.
 *
 * @param expression - Struct or enum value expression.
 * @param context - Safety context.
 * @returns Escape classification result.
 */
function classifyReturnedStructOrEnumValue(
  expression: Extract<FlintExpression, { kind: 'struct-value' | 'enum-value' }>,
  context: SafetyContext,
): EscapeClassification {
  if (expression.kind === 'struct-value') {
    const isRecordStruct = context.module.structs.some(
      ({ name, record }) => record === true && (name === expression.type.name || name === expression.type.reference),
    );
    if (isRecordStruct) return { allowed: true };
  }
  if (expression.type.ownership === 'owned' || expression.type.ownership === 'shared') return { allowed: true };
  if (isFlintPodType(expression.type, context.module)) return { allowed: true };
  return {
    allowed: false,
    message: 'Region-managed value cannot escape its enclosing scope without an explicit owned/shared boundary.',
  };
}

/**
 * Classifies whether a returned collection literal (vector or array) can safely escape.
 *
 * @param expression - Array or vector literal expression.
 * @param context - Safety context.
 * @returns Escape classification result.
 */
function classifyReturnedCollectionLiteral(
  expression: Extract<FlintExpression, { kind: 'array-literal' | 'vector-literal' }>,
  context: SafetyContext,
): EscapeClassification {
  if (expression.kind === 'array-literal' && isFlintPodType(expression.type, context.module)) return { allowed: true };
  return {
    allowed: false,
    message: 'Region-managed value cannot escape its enclosing scope without an explicit owned/shared boundary.',
  };
}

/**
 * Classifies whether a returned function call result can safely escape.
 *
 * @param expression - Call expression.
 * @param context - Safety context.
 * @returns Escape classification result.
 */
function classifyReturnedCall(
  expression: Extract<FlintExpression, { kind: 'call' }>,
  context: SafetyContext,
): EscapeClassification {
  const declaration = context.functions.get(expression.callee);
  if (declaration === undefined) {
    // External/capability/stdlib results cross an ABI boundary; ownership is
    // not yet modeled on those signatures, so do not invent a region escape.
    return { allowed: true };
  }
  if (declaration.result.ownership === 'owned' || declaration.result.ownership === 'shared') return { allowed: true };
  if (declaration.result.referenceMode === undefined && isFlintPodType(declaration.result, context.module))
    return { allowed: true };
  return {
    allowed: false,
    message: `Non-POD result of '${expression.callee}' cannot escape as a region-managed value without an explicit owned/shared boundary.`,
  };
}

/**
 * Classifies whether all arms of a match expression can safely escape.
 *
 * @param expression - Match expression.
 * @param context - Safety context.
 * @returns Escape classification result.
 */
function classifyReturnedMatch(
  expression: Extract<FlintExpression, { kind: 'match' }>,
  context: SafetyContext,
): EscapeClassification {
  for (const arm of expression.arms) {
    const classification = classifyReturnedValue(arm.value, context);
    if (!classification.allowed) return classification;
  }
  return { allowed: true };
}

/**
 * Classifies whether a primary or literal expression can safely escape.
 *
 * @param expression - Expression AST node.
 * @param context - Safety context.
 * @returns Escape classification result, or undefined if not a primary/literal expression.
 */
function classifyReturnedPrimary(
  expression: FlintExpression,
  context: SafetyContext,
): EscapeClassification | undefined {
  if (expression.kind === 'identifier') return classifyReturnedIdentifier(expression, context);
  if (
    expression.kind === 'literal' ||
    expression.kind === 'binary' ||
    expression.kind === 'unary' ||
    expression.kind === 'function-value'
  )
    return { allowed: true };
  return undefined;
}

/**
 * Classifies whether an aggregate expression can safely escape.
 *
 * @param expression - Expression AST node.
 * @param context - Safety context.
 * @returns Escape classification result, or undefined if not an aggregate expression.
 */
function classifyReturnedAggregate(
  expression: FlintExpression,
  context: SafetyContext,
): EscapeClassification | undefined {
  if (expression.kind === 'array-literal' || expression.kind === 'vector-literal')
    return classifyReturnedCollectionLiteral(expression, context);
  if (expression.kind === 'struct-value' || expression.kind === 'enum-value')
    return classifyReturnedStructOrEnumValue(expression, context);
  return undefined;
}

/**
 * Classifies whether a returned expression is already safe to cross the callee
 * boundary, or is a region-managed value that still needs an explicit
 * owned/shared (or promotion) boundary. Equivalent syntactic forms must agree.
 *
 * @param expression - Expression being returned.
 * @param context - Safety context.
 * @returns Escape classification result.
 */
function classifyReturnedValue(expression: FlintExpression, context: SafetyContext): EscapeClassification {
  const primary = classifyReturnedPrimary(expression, context);
  if (primary !== undefined) return primary;

  const aggregate = classifyReturnedAggregate(expression, context);
  if (aggregate !== undefined) return aggregate;

  if (expression.kind === 'call') return classifyReturnedCall(expression, context);
  if (expression.kind === 'index') return classifyReturnedValue(expression.receiver, context);
  if (expression.kind === 'match') return classifyReturnedMatch(expression, context);

  return {
    allowed: false,
    message: 'Region-managed value cannot escape its enclosing scope without an explicit owned/shared boundary.',
  };
}

/**
 * Verifies that a returned expression does not leak a local region borrow into caller scope.
 *
 * @param expression - Return value expression.
 * @param result - Function return type declaration.
 * @param context - Enclosing safety analysis context.
 */
function checkEscape(expression: FlintExpression, result: FlintTypeName, context: SafetyContext): void {
  // Explicit ownership on the result type is an ownership-transfer boundary.
  if (result.ownership === 'owned' || result.ownership === 'shared') return;
  // POD-by-value results never require region/ARC transfer.
  if (result.referenceMode === undefined && isFlintPodType(result, context.module)) return;
  // Only non-owning handle/reference results can form a region escape.
  if (!isNonOwningEscapeResult(result, context)) return;

  const classification = classifyReturnedValue(expression, context);
  if (classification.allowed) return;

  addDiagnostic(
    context,
    'FLINT-SAFE-006',
    classification.message,
    expression.span,
    'Use an explicit owned/shared value or promotion boundary before returning it.',
  );
}

/**
 * Appends a safety error diagnostic to the context diagnostic collector.
 *
 * @param context - Enclosing safety analysis context.
 * @param code - Diagnostic error code.
 * @param message - Diagnostic explanation message.
 * @param span - Source span where the violation occurred.
 * @param hint - Optional actionable suggestion for remediation.
 */
function addDiagnostic(
  context: SafetyContext,
  code: string,
  message: string,
  span: FlintSourceSpan,
  hint?: string,
): void {
  context.diagnostics.push(createDiagnostic(context.fileName, 'type-check', code, message, span, 'error', hint));
}
