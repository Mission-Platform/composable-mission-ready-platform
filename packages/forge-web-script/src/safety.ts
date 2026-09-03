import {
  forgeWebScriptDefaultPassingMode,
  isForgeWebScriptPodType,
  type ForgeWebScriptExpression,
  type ForgeWebScriptFunction,
  type ForgeWebScriptModule,
  type ForgeWebScriptStatement,
  type ForgeWebScriptTypeName,
} from './ast.js';
import { createDiagnostic, type ForgeWebScriptDiagnostic } from './diagnostics.js';

interface Binding {
  readonly type: ForgeWebScriptTypeName;
  readonly mutable: boolean;
  readonly depth: number;
}

interface SafetyContext {
  readonly fileName: string;
  readonly module: ForgeWebScriptModule;
  readonly functions: ReadonlyMap<string, ForgeWebScriptFunction>;
  readonly diagnostics: ForgeWebScriptDiagnostic[];
  readonly locals: Map<string, Binding>;
  readonly depth: number;
  readonly iterable: boolean;
}

/** Performs source-level checks that cannot be represented by the legacy type strings. */
export function checkForgeWebScriptSafety(
  module: ForgeWebScriptModule,
  fileName: string,
  diagnostics: ForgeWebScriptDiagnostic[],
): void {
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

function checkStatement(
  statement: ForgeWebScriptStatement,
  context: SafetyContext,
  result: ForgeWebScriptTypeName,
): void {
  switch (statement.kind) {
    case 'let': {
      checkExpression(statement.value, context);
      context.locals.set(statement.name, {
        type: statement.type,
        mutable: statement.mutable === true,
        depth: context.depth,
      });
      return;
    }
    case 'assignment': {
      checkExpression(statement.value, context);
      if (statement.index !== undefined) checkExpression(statement.index, context);
      const binding = context.locals.get(statement.name);
      if (binding === undefined) return;
      const canMutatePointee = statement.index !== undefined && binding.type.referenceMode === 'mut-ref';
      if (!binding.mutable && !canMutatePointee)
        addDiagnostic(
          context,
          'FWS-SAFE-001',
          `Cannot mutate immutable binding '${statement.name}'; declare it with 'let mut' or use an explicit '&mut' reference.`,
          statement.span,
          "Prefix the local with 'mut' when rebinding or use '&mut T' for a mutable borrow.",
        );
      return;
    }
    case 'return': {
      if (statement.value !== undefined) {
        checkExpression(statement.value, context);
        checkEscape(statement.value, result, context);
      }
      return;
    }
    case 'yield': {
      checkExpression(statement.value, context);
      if (context.iterable && statement.value.kind === 'identifier') {
        const binding = context.locals.get(statement.value.name);
        if (
          binding !== undefined &&
          !isForgeWebScriptPodType(binding.type, context.module) &&
          binding.type.ownership !== 'owned' &&
          binding.type.ownership !== 'shared'
        )
          addDiagnostic(
            context,
            'FWS-SAFE-004',
            `Value '${statement.value.name}' cannot cross an iterator suspension as a region borrow.`,
            statement.value.span,
            'Return an owned/shared value or make the suspension boundary explicit.',
          );
      }
      return;
    }
    case 'expression-statement': {
      checkExpression(statement.expression, context);
      return;
    }
    case 'if': {
      checkExpression(statement.condition, context);
      checkScopedStatements(statement.consequent, context, result);
      if (statement.alternate !== undefined) checkScopedStatements(statement.alternate, context, result);
      return;
    }
    case 'while':
    case 'do-while': {
      checkExpression(statement.condition, context);
      checkScopedStatements(statement.body, context, result);
      return;
    }
    case 'for': {
      if (statement.initializer !== undefined) checkStatement(statement.initializer, context, result);
      checkExpression(statement.condition, context);
      checkScopedStatements(statement.body, context, result);
      if (statement.update !== undefined) checkStatement(statement.update, context, result);
      return;
    }
    case 'iterator-loop': {
      checkExpression(statement.iterator, context);
      checkScopedStatements(statement.body, context, result, [
        [
          statement.binding,
          { type: { kind: 'type-name', name: 'unit', span: statement.span }, mutable: false, depth: context.depth + 1 },
        ],
      ]);
      return;
    }
    case 'switch': {
      checkExpression(statement.value, context);
      for (const arm of statement.cases) checkScopedStatements(arm.body, context, result);
      if (statement.defaultCase !== undefined) checkScopedStatements(statement.defaultCase, context, result);
      return;
    }
    case 'match-statement': {
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
      return;
    }
  }
}

function checkScopedStatements(
  statements: readonly ForgeWebScriptStatement[],
  parent: SafetyContext,
  result: ForgeWebScriptTypeName,
  additions: readonly (readonly [string, Binding])[] = [],
): void {
  const context: SafetyContext = { ...parent, depth: parent.depth + 1, locals: new Map(parent.locals) };
  for (const [name, binding] of additions) context.locals.set(name, binding);
  for (const statement of statements) checkStatement(statement, context, result);
}

function checkExpression(expression: ForgeWebScriptExpression, context: SafetyContext): void {
  switch (expression.kind) {
    case 'call': {
      for (const argument of expression.arguments) checkExpression(argument, context);
      const declaration = context.functions.get(expression.callee);
      if (declaration === undefined) return;
      const mutableArguments = new Set<string>();
      for (const [index, parameter] of declaration.parameters.entries()) {
        const mode = parameter.type.referenceMode;
        if (mode !== 'ref' && mode !== 'mut-ref') continue;
        const argument = expression.arguments[index];
        if (argument?.kind !== 'identifier') {
          addDiagnostic(
            context,
            'FWS-SAFE-002',
            `Argument ${index + 1} of '${expression.callee}' must be a named value for an explicit reference.`,
            expression.span,
          );
          continue;
        }
        const binding = context.locals.get(argument.name);
        if (binding === undefined) continue;
        if (mode === 'mut-ref') {
          if (!binding.mutable && binding.type.referenceMode !== 'mut-ref')
            addDiagnostic(
              context,
              'FWS-SAFE-003',
              `Cannot mutably borrow immutable binding '${argument.name}'.`,
              argument.span,
              "Declare it with 'let mut'.",
            );
          if (mutableArguments.has(argument.name))
            addDiagnostic(
              context,
              'FWS-SAFE-005',
              `Binding '${argument.name}' is passed through more than one mutable reference.`,
              argument.span,
              'Pass disjoint bindings to conflicting mutable references.',
            );
          mutableArguments.add(argument.name);
        }
      }
      return;
    }
    case 'binary': {
      checkExpression(expression.left, context);
      checkExpression(expression.right, context);
      return;
    }
    case 'unary': {
      checkExpression(expression.operand, context);
      return;
    }
    case 'index': {
      checkExpression(expression.receiver, context);
      checkExpression(expression.index, context);
      return;
    }
    case 'array-literal':
    case 'vector-literal': {
      for (const element of expression.elements) checkExpression(element, context);
      return;
    }
    case 'struct-value': {
      for (const value of Object.values(expression.fields)) checkExpression(value, context);
      return;
    }
    case 'enum-value': {
      for (const argument of expression.arguments) checkExpression(argument, context);
      return;
    }
    case 'match': {
      checkExpression(expression.value, context);
      for (const arm of expression.arms) checkExpression(arm.value, context);
      return;
    }
    default: {
      return;
    }
  }
}

/**
 * True when the function result would leave as a non-owning handle/reference.
 * Owned/shared results and POD-by-value results are not escape hazards.
 */
function isNonOwningEscapeResult(result: ForgeWebScriptTypeName, context: SafetyContext): boolean {
  if (result.ownership === 'owned' || result.ownership === 'shared') return false;
  if (result.referenceMode === 'ref' || result.referenceMode === 'mut-ref') return true;
  // Unresolved generics stay unknown: only concrete non-POD handles/aggregates
  // are treated as region-escape results until monomorphization proves otherwise.
  const passing = forgeWebScriptDefaultPassingMode(result, context.module);
  if (passing !== 'immutable-reference' && passing !== 'mutable-reference') return false;
  return (
    result.reference === 'Array' ||
    result.reference === 'Vector' ||
    result.name === 'bytes' ||
    result.name === 'string' ||
    context.module.structs.some(({ name, record }) => name === result.reference && record !== true) ||
    context.module.enums.some(({ name }) => name === result.reference)
  );
}

type EscapeClassification = { readonly allowed: true } | { readonly allowed: false; readonly message: string };

/**
 * Classifies whether a returned expression is already safe to cross the callee
 * boundary, or is a region-managed value that still needs an explicit
 * owned/shared (or promotion) boundary. Equivalent syntactic forms must agree.
 */
function classifyReturnedValue(expression: ForgeWebScriptExpression, context: SafetyContext): EscapeClassification {
  switch (expression.kind) {
    case 'identifier': {
      const binding = context.locals.get(expression.name);
      // Unknown names are reported by the type checker.
      if (binding === undefined) return { allowed: true };
      // Parameters live in the caller region.
      if (binding.depth === 0) return { allowed: true };
      if (binding.type.ownership === 'owned' || binding.type.ownership === 'shared') return { allowed: true };
      if (isForgeWebScriptPodType(binding.type, context.module)) return { allowed: true };
      return {
        allowed: false,
        message: `Region value '${expression.name}' cannot escape its enclosing scope.`,
      };
    }
    case 'literal': {
      // Scalar literals are POD; string literals are static ABI data, not region handles.
      return { allowed: true };
    }
    case 'vector-literal': {
      return {
        allowed: false,
        message: 'Region-managed value cannot escape its enclosing scope without an explicit owned/shared boundary.',
      };
    }
    case 'array-literal': {
      if (isForgeWebScriptPodType(expression.type, context.module)) return { allowed: true };
      return {
        allowed: false,
        message: 'Region-managed value cannot escape its enclosing scope without an explicit owned/shared boundary.',
      };
    }
    case 'struct-value': {
      if (
        context.module.structs.some(
          ({ name, record }) =>
            record === true && (name === expression.type.name || name === expression.type.reference),
        )
      )
        return { allowed: true };
      if (expression.type.ownership === 'owned' || expression.type.ownership === 'shared') return { allowed: true };
      if (isForgeWebScriptPodType(expression.type, context.module)) return { allowed: true };
      return {
        allowed: false,
        message: 'Region-managed value cannot escape its enclosing scope without an explicit owned/shared boundary.',
      };
    }
    case 'enum-value': {
      if (expression.type.ownership === 'owned' || expression.type.ownership === 'shared') return { allowed: true };
      if (isForgeWebScriptPodType(expression.type, context.module)) return { allowed: true };
      return {
        allowed: false,
        message: 'Region-managed value cannot escape its enclosing scope without an explicit owned/shared boundary.',
      };
    }
    case 'call': {
      const declaration = context.functions.get(expression.callee);
      if (declaration === undefined) {
        // External/capability/stdlib results cross an ABI boundary; ownership is
        // not yet modeled on those signatures, so do not invent a region escape.
        return { allowed: true };
      }
      if (declaration.result.ownership === 'owned' || declaration.result.ownership === 'shared')
        return { allowed: true };
      if (declaration.result.referenceMode === undefined && isForgeWebScriptPodType(declaration.result, context.module))
        return { allowed: true };
      return {
        allowed: false,
        message: `Non-POD result of '${expression.callee}' cannot escape as a region-managed value without an explicit owned/shared boundary.`,
      };
    }
    case 'index': {
      // Indexing yields a projection of the receiver; inherit its classification.
      return classifyReturnedValue(expression.receiver, context);
    }
    case 'match': {
      for (const arm of expression.arms) {
        const classification = classifyReturnedValue(arm.value, context);
        if (!classification.allowed) return classification;
      }
      return { allowed: true };
    }
    case 'binary':
    case 'unary':
    case 'function-value': {
      return { allowed: true };
    }
    default: {
      return {
        allowed: false,
        message: 'Region-managed value cannot escape its enclosing scope without an explicit owned/shared boundary.',
      };
    }
  }
}

function checkEscape(
  expression: ForgeWebScriptExpression,
  result: ForgeWebScriptTypeName,
  context: SafetyContext,
): void {
  // Explicit ownership on the result type is an ownership-transfer boundary.
  if (result.ownership === 'owned' || result.ownership === 'shared') return;
  // POD-by-value results never require region/ARC transfer.
  if (result.referenceMode === undefined && isForgeWebScriptPodType(result, context.module)) return;
  // Only non-owning handle/reference results can form a region escape.
  if (!isNonOwningEscapeResult(result, context)) return;

  const classification = classifyReturnedValue(expression, context);
  if (classification.allowed) return;

  addDiagnostic(
    context,
    'FWS-SAFE-006',
    classification.message,
    expression.span,
    'Use an explicit owned/shared value or promotion boundary before returning it.',
  );
}

function addDiagnostic(
  context: SafetyContext,
  code: string,
  message: string,
  span: {
    readonly start: number;
    readonly end: number;
    readonly line: number;
    readonly column: number;
    readonly endLine: number;
    readonly endColumn: number;
  },
  hint?: string,
): void {
  context.diagnostics.push(createDiagnostic(context.fileName, 'type-check', code, message, span, 'error', hint));
}
