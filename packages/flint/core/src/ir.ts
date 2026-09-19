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

export type FlintCollectionOperation = 'array-iter' | 'iterator-next' | 'array-length';

export interface FlintIrLiteralExpression {
  readonly kind: 'literal';
  readonly value: boolean | number | string;
  readonly type: FlintPrimitiveType;
  readonly span: FlintSourceSpan;
}

export interface FlintIrIdentifierExpression {
  readonly kind: 'identifier';
  readonly name: string;
  readonly span: FlintSourceSpan;
}

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

export interface FlintIrBinaryExpression {
  readonly kind: 'binary';
  readonly operator: FlintBinaryOperator;
  readonly left: FlintIrExpression;
  readonly right: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

export interface FlintIrUnaryExpression {
  readonly kind: 'unary';
  readonly operator: '!' | '-';
  readonly operand: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

export interface FlintIrFunctionValueExpression {
  readonly kind: 'function-value';
  readonly name: string;
  readonly span: FlintSourceSpan;
}

export interface FlintIrStructValueExpression {
  readonly kind: 'struct-value';
  readonly type: FlintTypeName;
  readonly fields: Readonly<Record<string, FlintIrExpression>>;
  readonly span: FlintSourceSpan;
}

export interface FlintIrEnumValueExpression {
  readonly kind: 'enum-value';
  readonly type: FlintTypeName;
  readonly variant: string;
  readonly arguments: readonly FlintIrExpression[];
  readonly span: FlintSourceSpan;
}

export interface FlintIrMatchArm {
  readonly kind: 'match-arm';
  readonly pattern: FlintPattern;
  readonly value: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

export interface FlintIrMatchExpression {
  readonly kind: 'match';
  readonly value: FlintIrExpression;
  readonly arms: readonly FlintIrMatchArm[];
  readonly span: FlintSourceSpan;
}

export interface FlintIrArrayLiteralExpression {
  readonly kind: 'array-literal' | 'vector-literal';
  readonly elements: readonly FlintIrExpression[];
  readonly type: FlintTypeName;
  readonly span: FlintSourceSpan;
}

export interface FlintIrIndexExpression {
  readonly kind: 'index';
  readonly receiver: FlintIrExpression;
  readonly index: FlintIrExpression;
  readonly boundsCheck?: 'required' | 'proven-safe';
  readonly span: FlintSourceSpan;
}

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

export interface FlintIrLetStatement {
  readonly kind: 'let';
  readonly name: string;
  readonly type: FlintTypeName;
  readonly value: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

export interface FlintIrAssignmentStatement {
  readonly kind: 'assignment';
  readonly name: string;
  readonly value: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

export interface FlintIrReturnStatement {
  readonly kind: 'return';
  readonly value?: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

export interface FlintIrExpressionStatement {
  readonly kind: 'expression-statement';
  readonly expression: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

export interface FlintIrIfStatement {
  readonly kind: 'if';
  readonly condition: FlintIrExpression;
  readonly consequent: readonly FlintIrStatement[];
  readonly alternate?: readonly FlintIrStatement[];
  readonly conditionalHint?: 'likely' | 'unlikely';
  readonly span: FlintSourceSpan;
}

export interface FlintIrWhileStatement {
  readonly kind: 'while';
  readonly condition: FlintIrExpression;
  readonly body: readonly FlintIrStatement[];
  readonly span: FlintSourceSpan;
}

export interface FlintIrDoWhileStatement {
  readonly kind: 'do-while';
  readonly body: readonly FlintIrStatement[];
  readonly condition: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

export interface FlintIrYieldStatement {
  readonly kind: 'yield';
  readonly value: FlintIrExpression;
  readonly span: FlintSourceSpan;
}

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

export interface FlintIrMatchStatement {
  readonly kind: 'match-statement';
  readonly value: FlintIrExpression;
  readonly arms: readonly FlintIrMatchArm[];
  readonly span: FlintSourceSpan;
}

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

export type FlintIrPurity = 'pure' | 'effectful' | 'unknown';

export interface FlintIrFunctionAnalysis {
  readonly purity: FlintIrPurity;
  readonly calls: readonly string[];
  readonly tailCallable: boolean;
  readonly iteratorBoundedLength?: number;
}

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

export interface FlintIrCounts {
  readonly functions: number;
  readonly statements: number;
  readonly expressions: number;
}

function lowerAstExpression(expression: FlintExpression): FlintIrExpression {
  if (expression === undefined) throw new Error('Cannot lower an absent expression.');
  if (expression.kind === 'literal' || expression.kind === 'identifier') return expression;
  if (expression.kind === 'call') {
    const dot = expression.callee.lastIndexOf('.');
    const receiver = dot > 0 ? expression.callee.slice(0, dot) : undefined;
    const method = dot > 0 ? expression.callee.slice(dot + 1) : undefined;
    const collectionOperation =
      method === 'iter'
        ? 'array-iter'
        : method === 'next'
          ? 'iterator-next'
          : method === 'length'
            ? 'array-length'
            : undefined;
    const standardLibrary =
      FLINT_REGEX_FUNCTION_MAP.get(expression.callee)?.operation ??
      FLINT_STRING_FUNCTION_MAP.get(expression.callee)?.operation ??
      FLINT_MEMORY_FUNCTION_MAP.get(expression.callee)?.operation;
    return {
      ...expression,
      arguments: [
        ...(receiver === undefined ? [] : [{ kind: 'identifier' as const, name: receiver, span: expression.span }]),
        ...expression.arguments.map((argument) => lowerAstExpression(argument)),
      ],
      ...(collectionOperation === undefined
        ? standardLibrary === undefined
          ? {}
          : { standardLibrary }
        : { standardLibrary: collectionOperation }),
    };
  }
  if (expression.kind === 'function-value') return expression;
  if (expression.kind === 'struct-value')
    return {
      ...expression,
      fields: Object.fromEntries(
        Object.entries(expression.fields).map(([name, value]) => [name, lowerAstExpression(value)]),
      ),
    };
  if (expression.kind === 'enum-value')
    return { ...expression, arguments: expression.arguments.map((argument) => lowerAstExpression(argument)) };
  if (expression.kind === 'match')
    return {
      ...expression,
      value: lowerAstExpression(expression.value),
      arms: expression.arms.map((arm) => ({ ...arm, value: lowerAstExpression(arm.value) })),
    };
  if (expression.kind === 'array-literal' || expression.kind === 'vector-literal')
    return { ...expression, elements: expression.elements.map((element) => lowerAstExpression(element)) };
  if (expression.kind === 'index')
    return {
      ...expression,
      receiver: lowerAstExpression(expression.receiver),
      index: lowerAstExpression(expression.index),
    };
  if (expression.kind === 'unary') return { ...expression, operand: lowerAstExpression(expression.operand) };
  return { ...expression, left: lowerAstExpression(expression.left), right: lowerAstExpression(expression.right) };
}

function staticallyBoundedIteratorYields(statements: readonly FlintStatement[]): number | undefined {
  let yields = 0;
  for (const statement of statements) {
    if (statement.kind !== 'yield') return undefined;
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

function lowerStatements(
  statements: readonly FlintStatement[],
  stateAllocator: { value: number } = { value: 0 },
  boundedIterators: ReadonlyMap<string, number> = new Map(),
): readonly FlintIrStatement[] {
  return statements.map((statement) => {
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
      case 'if': {
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
      case 'switch': {
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
      case 'while': {
        return {
          ...statement,
          condition: lowerAstExpression(statement.condition),
          body: lowerStatements(statement.body, stateAllocator, boundedIterators),
        };
      }
      case 'for': {
        throw new Error(`Imperative '${statement.kind}' cannot be lowered into Flint IR.`);
      }
      case 'do-while': {
        return {
          ...statement,
          body: lowerStatements(statement.body, stateAllocator, boundedIterators),
          condition: lowerAstExpression(statement.condition),
        };
      }
      case 'match-statement': {
        return {
          ...statement,
          value: lowerAstExpression(statement.value),
          arms: statement.arms.map((arm) => ({ ...arm, value: lowerAstExpression(arm.value) })),
        };
      }
      case 'yield': {
        return { ...statement, value: lowerAstExpression(statement.value) };
      }
      case 'iterator-loop': {
        const iteratorState = stateAllocator.value++;
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
    }
  });
}

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

export function countFlintIr(module: FlintIrModule): FlintIrCounts {
  let statements = 0;
  let expressions = 0;
  const countExpression = (expression: FlintIrExpression): void => {
    expressions += 1;
    switch (expression.kind) {
      case 'call': {
        for (const argument of expression.arguments) countExpression(argument);
        break;
      }
      case 'unary': {
        countExpression(expression.operand);
        break;
      }
      case 'binary': {
        countExpression(expression.left);
        countExpression(expression.right);

        break;
      }
      case 'struct-value': {
        for (const value of Object.values(expression.fields)) countExpression(value);
        break;
      }
      case 'enum-value': {
        for (const value of expression.arguments) countExpression(value);
        break;
      }
      case 'array-literal':
      case 'vector-literal': {
        for (const value of expression.elements) countExpression(value);
        break;
      }
      case 'index': {
        countExpression(expression.receiver);
        countExpression(expression.index);
        break;
      }
      case 'match': {
        countExpression(expression.value);
        for (const arm of expression.arms) countExpression(arm.value);
        break;
      }
      // No default
    }
  };
  const countStatements = (items: readonly FlintIrStatement[]): void => {
    for (const statement of items) {
      statements += 1;
      if (statement.kind === 'let') countExpression(statement.value);
      else if (statement.kind === 'assignment') countExpression(statement.value);
      else if (statement.kind === 'return' && statement.value !== undefined) countExpression(statement.value);
      else
        switch (statement.kind) {
          case 'expression-statement': {
            countExpression(statement.expression);
            break;
          }
          case 'if': {
            countExpression(statement.condition);
            countStatements(statement.consequent);
            if (statement.alternate !== undefined) countStatements(statement.alternate);

            break;
          }
          case 'while':
          case 'do-while': {
            countExpression(statement.condition);
            countStatements(statement.body);
            break;
          }
          case 'match-statement': {
            countExpression(statement.value);
            for (const arm of statement.arms) countExpression(arm.value);
            break;
          }
          case 'yield': {
            countExpression(statement.value);
            break;
          }
          case 'iterator-loop': {
            countExpression(statement.iterator);
            countStatements(statement.body);
            break;
          }
          // No default
        }
    }
  };
  for (const declaration of module.functions) countStatements(declaration.body);
  return { functions: module.functions.length, statements, expressions };
}

export function lowerFlintIrToModule(module: FlintIrModule): FlintModule {
  return {
    ...module,
    functions: module.functions.map((declaration) => ({
      ...declaration,
      body: declaration.body as readonly FlintStatement[],
    })),
  };
}
