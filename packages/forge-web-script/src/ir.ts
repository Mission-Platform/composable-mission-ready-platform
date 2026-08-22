import { createForgeWebScriptIteratorBoundaryDescriptor } from './generics.js';
import { FORGE_WEB_SCRIPT_REGEX_FUNCTION_MAP, type ForgeWebScriptRegexOperation } from './stdlib/regex.js';
import { FORGE_WEB_SCRIPT_STRING_FUNCTION_MAP, type ForgeWebScriptStringOperation } from './stdlib/string.js';
import { FORGE_WEB_SCRIPT_MEMORY_FUNCTION_MAP, type ForgeWebScriptMemoryOperation } from './stdlib/memory.js';

import type {
  ForgeWebScriptBinaryOperator,
  ForgeWebScriptExpression,
  ForgeWebScriptPrimitiveType,
  ForgeWebScriptSourceModuleImport,
  ForgeWebScriptStatement,
  ForgeWebScriptTypeName,
  ForgeWebScriptCapabilityImport,
  ForgeWebScriptFunction,
  ForgeWebScriptModule,
  ForgeWebScriptParameter,
  ForgeWebScriptPattern,
} from './ast.js';
import type { ForgeWebScriptSourceSpan } from './diagnostics.js';
import type { ForgeWebScriptIteratorBoundaryDescriptor } from './manifest.js';

export type ForgeWebScriptCollectionOperation = 'array-iter' | 'iterator-next' | 'array-length';

export interface ForgeWebScriptIrLiteralExpression {
  readonly kind: 'literal';
  readonly value: boolean | number | string;
  readonly type: ForgeWebScriptPrimitiveType;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIrIdentifierExpression {
  readonly kind: 'identifier';
  readonly name: string;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIrCallExpression {
  readonly kind: 'call';
  readonly callee: string;
  readonly arguments: readonly ForgeWebScriptIrExpression[];
  /** Set only for compiler-owned calls; these never become ABI imports. */
  readonly standardLibrary?:
    | ForgeWebScriptRegexOperation
    | ForgeWebScriptStringOperation
    | ForgeWebScriptMemoryOperation
    | ForgeWebScriptCollectionOperation;
  /** Set by tail-position analysis; it is a hint, never a semantic requirement. */
  readonly tailPosition?: boolean;
  /** The source function which supplied this expression after a safe inline. */
  readonly inlinedFrom?: string;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIrBinaryExpression {
  readonly kind: 'binary';
  readonly operator: ForgeWebScriptBinaryOperator;
  readonly left: ForgeWebScriptIrExpression;
  readonly right: ForgeWebScriptIrExpression;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIrUnaryExpression {
  readonly kind: 'unary';
  readonly operator: '!' | '-';
  readonly operand: ForgeWebScriptIrExpression;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIrFunctionValueExpression {
  readonly kind: 'function-value';
  readonly name: string;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIrStructValueExpression {
  readonly kind: 'struct-value';
  readonly type: ForgeWebScriptTypeName;
  readonly fields: Readonly<Record<string, ForgeWebScriptIrExpression>>;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIrEnumValueExpression {
  readonly kind: 'enum-value';
  readonly type: ForgeWebScriptTypeName;
  readonly variant: string;
  readonly arguments: readonly ForgeWebScriptIrExpression[];
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIrMatchArm {
  readonly kind: 'match-arm';
  readonly pattern: ForgeWebScriptPattern;
  readonly value: ForgeWebScriptIrExpression;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIrMatchExpression {
  readonly kind: 'match';
  readonly value: ForgeWebScriptIrExpression;
  readonly arms: readonly ForgeWebScriptIrMatchArm[];
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIrArrayLiteralExpression {
  readonly kind: 'array-literal' | 'vector-literal';
  readonly elements: readonly ForgeWebScriptIrExpression[];
  readonly type: ForgeWebScriptTypeName;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIrIndexExpression {
  readonly kind: 'index';
  readonly receiver: ForgeWebScriptIrExpression;
  readonly index: ForgeWebScriptIrExpression;
  readonly span: ForgeWebScriptSourceSpan;
}

export type ForgeWebScriptIrExpression =
  | ForgeWebScriptIrBinaryExpression
  | ForgeWebScriptIrCallExpression
  | ForgeWebScriptIrIdentifierExpression
  | ForgeWebScriptIrLiteralExpression
  | ForgeWebScriptIrFunctionValueExpression
  | ForgeWebScriptIrStructValueExpression
  | ForgeWebScriptIrEnumValueExpression
  | ForgeWebScriptIrMatchExpression
  | ForgeWebScriptIrUnaryExpression
  | ForgeWebScriptIrArrayLiteralExpression
  | ForgeWebScriptIrIndexExpression;

export interface ForgeWebScriptIrLetStatement {
  readonly kind: 'let';
  readonly name: string;
  readonly type: ForgeWebScriptTypeName;
  readonly value: ForgeWebScriptIrExpression;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIrAssignmentStatement {
  readonly kind: 'assignment';
  readonly name: string;
  readonly value: ForgeWebScriptIrExpression;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIrReturnStatement {
  readonly kind: 'return';
  readonly value?: ForgeWebScriptIrExpression;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIrExpressionStatement {
  readonly kind: 'expression-statement';
  readonly expression: ForgeWebScriptIrExpression;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIrIfStatement {
  readonly kind: 'if';
  readonly condition: ForgeWebScriptIrExpression;
  readonly consequent: readonly ForgeWebScriptIrStatement[];
  readonly alternate?: readonly ForgeWebScriptIrStatement[];
  readonly conditionalHint?: 'likely' | 'unlikely';
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIrWhileStatement {
  readonly kind: 'while';
  readonly condition: ForgeWebScriptIrExpression;
  readonly body: readonly ForgeWebScriptIrStatement[];
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIrDoWhileStatement {
  readonly kind: 'do-while';
  readonly body: readonly ForgeWebScriptIrStatement[];
  readonly condition: ForgeWebScriptIrExpression;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIrYieldStatement {
  readonly kind: 'yield';
  readonly value: ForgeWebScriptIrExpression;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIrIteratorLoopStatement {
  readonly kind: 'iterator-loop';
  readonly binding: string;
  readonly iterator: ForgeWebScriptIrExpression;
  readonly body: readonly ForgeWebScriptIrStatement[];
  /** Resumption state assigned deterministically within the containing function. */
  readonly state: number;
  /** A bound proven by frontend/static analysis, if one exists. */
  readonly boundedLength?: number;
  readonly suspensionSpan: ForgeWebScriptSourceSpan;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIrMatchStatement {
  readonly kind: 'match-statement';
  readonly value: ForgeWebScriptIrExpression;
  readonly arms: readonly ForgeWebScriptIrMatchArm[];
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIrSwitchStatement {
  readonly kind: 'switch';
  readonly value: ForgeWebScriptIrExpression;
  readonly cases: readonly {
    readonly kind: 'switch-case';
    readonly value: number | string;
    readonly body: readonly ForgeWebScriptIrStatement[];
    readonly span: ForgeWebScriptSourceSpan;
  }[];
  readonly defaultCase?: readonly ForgeWebScriptIrStatement[];
  readonly span: ForgeWebScriptSourceSpan;
}

export type ForgeWebScriptIrStatement =
  | ForgeWebScriptIrExpressionStatement
  | ForgeWebScriptIrAssignmentStatement
  | ForgeWebScriptIrIfStatement
  | ForgeWebScriptIrWhileStatement
  | ForgeWebScriptIrDoWhileStatement
  | ForgeWebScriptIrLetStatement
  | ForgeWebScriptIrReturnStatement
  | ForgeWebScriptIrMatchStatement
  | ForgeWebScriptIrSwitchStatement
  | ForgeWebScriptIrYieldStatement
  | ForgeWebScriptIrIteratorLoopStatement;

export type ForgeWebScriptIrPurity = 'pure' | 'effectful' | 'unknown';

export interface ForgeWebScriptIrFunctionAnalysis {
  readonly purity: ForgeWebScriptIrPurity;
  readonly calls: readonly string[];
  readonly tailCallable: boolean;
  readonly iteratorBoundedLength?: number;
}

export interface ForgeWebScriptIrFunction {
  readonly kind: 'function';
  readonly name: string;
  readonly exported: boolean;
  readonly iterable?: ForgeWebScriptFunction['iterable'];
  readonly inlinePolicy?: ForgeWebScriptFunction['inlinePolicy'];
  /** Source documentation is analysis metadata and is not part of executable contracts. */
  readonly documentation?: ForgeWebScriptFunction['documentation'];
  readonly genericParameters: ForgeWebScriptFunction['genericParameters'];
  readonly parameters: readonly ForgeWebScriptParameter[];
  readonly result: ForgeWebScriptTypeName;
  readonly body: readonly ForgeWebScriptIrStatement[];
  readonly analysis?: ForgeWebScriptIrFunctionAnalysis;
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIrModule {
  readonly kind: 'module';
  readonly name: string;
  readonly imports: readonly ForgeWebScriptCapabilityImport[];
  readonly sourceImports: readonly ForgeWebScriptSourceModuleImport[];
  readonly structs: ForgeWebScriptModule['structs'];
  readonly enums: ForgeWebScriptModule['enums'];
  readonly interfaces: ForgeWebScriptModule['interfaces'];
  readonly functions: readonly ForgeWebScriptIrFunction[];
  /** Iterator export boundaries derived from iterable functions for backend/JS adapters. */
  readonly iteratorDescriptors?: readonly ForgeWebScriptIteratorBoundaryDescriptor[];
  readonly span: ForgeWebScriptSourceSpan;
}

export interface ForgeWebScriptIrCounts {
  readonly functions: number;
  readonly statements: number;
  readonly expressions: number;
}

function lowerAstExpression(expression: ForgeWebScriptExpression): ForgeWebScriptIrExpression {
  if (expression === undefined) throw new Error('Cannot lower an absent expression.');
  if (expression.kind === 'literal' || expression.kind === 'identifier') return expression;
  if (expression.kind === 'call') {
    const dot = expression.callee.lastIndexOf('.');
    const receiver = dot > 0 ? expression.callee.slice(0, dot) : undefined;
    const method = dot > 0 ? expression.callee.slice(dot + 1) : undefined;
    const collectionOperation = method === 'iter' ? 'array-iter' : method === 'next' ? 'iterator-next' : method === 'length' ? 'array-length' : undefined;
    const standardLibrary =
      FORGE_WEB_SCRIPT_REGEX_FUNCTION_MAP.get(expression.callee)?.operation ??
      FORGE_WEB_SCRIPT_STRING_FUNCTION_MAP.get(expression.callee)?.operation ??
      FORGE_WEB_SCRIPT_MEMORY_FUNCTION_MAP.get(expression.callee)?.operation;
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
    return { ...expression, receiver: lowerAstExpression(expression.receiver), index: lowerAstExpression(expression.index) };
  if (expression.kind === 'unary') return { ...expression, operand: lowerAstExpression(expression.operand) };
  return { ...expression, left: lowerAstExpression(expression.left), right: lowerAstExpression(expression.right) };
}

function staticallyBoundedIteratorYields(statements: readonly ForgeWebScriptStatement[]): number | undefined {
  let yields = 0;
  for (const statement of statements) {
    if (statement.kind !== 'yield') return undefined;
    yields += 1;
  }
  return yields;
}

function iteratorBounds(module: ForgeWebScriptModule): ReadonlyMap<string, number> {
  return new Map(
    module.functions.flatMap((declaration) => {
      if (declaration.iterable !== true) return [];
      const bound = staticallyBoundedIteratorYields(declaration.body);
      return bound === undefined ? [] : [[declaration.name, bound] as const];
    }),
  );
}

function lowerStatements(
  statements: readonly ForgeWebScriptStatement[],
  stateAllocator: { value: number } = { value: 0 },
  boundedIterators: ReadonlyMap<string, number> = new Map(),
): readonly ForgeWebScriptIrStatement[] {
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
        throw new Error(`Imperative '${statement.kind}' cannot be lowered into Forge Web Script IR.`);
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
      case 'yield':
        return { ...statement, value: lowerAstExpression(statement.value) };
      case 'iterator-loop': {
        const iteratorState = stateAllocator.value++;
        const boundedLength = statement.iterator.kind === 'call' && statement.iterator.arguments.length === 0
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

function iteratorDescriptors(module: ForgeWebScriptModule): readonly ForgeWebScriptIteratorBoundaryDescriptor[] {
  return module.functions.flatMap((declaration) => {
    if (!declaration.iterable || declaration.result.arguments?.[0] === undefined) return [];
    return [
      createForgeWebScriptIteratorBoundaryDescriptor(
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

export function lowerForgeWebScriptToIr(module: ForgeWebScriptModule): ForgeWebScriptIrModule {
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

export function countForgeWebScriptIr(module: ForgeWebScriptIrModule): ForgeWebScriptIrCounts {
  let statements = 0;
  let expressions = 0;
  const countExpression = (expression: ForgeWebScriptIrExpression): void => {
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
  const countStatements = (items: readonly ForgeWebScriptIrStatement[]): void => {
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

export function lowerForgeWebScriptIrToModule(module: ForgeWebScriptIrModule): ForgeWebScriptModule {
  return {
    ...module,
    functions: module.functions.map((declaration) => ({
      ...declaration,
      body: declaration.body as readonly ForgeWebScriptStatement[],
    })),
  };
}
