import { countForgeWebScriptIr } from '../ir.js';

import type { ForgeWebScriptFrontendResult } from '../contracts.js';
import type { ForgeWebScriptIrExpression, ForgeWebScriptIrStatement, ForgeWebScriptIrModule } from '../ir.js';
import type { ForgeWebScriptAnalysisFacts } from './contracts.js';

function hasLoop(statements: readonly ForgeWebScriptIrStatement[]): boolean {
  return statements.some((statement) => {
    if (statement.kind === 'while' || statement.kind === 'do-while' || statement.kind === 'iterator-loop') return true;
    if (statement.kind === 'if')
      return hasLoop(statement.consequent) || (statement.alternate !== undefined && hasLoop(statement.alternate));
    if (statement.kind === 'switch')
      return (
        statement.cases.some(({ body }) => hasLoop(body)) ||
        (statement.defaultCase !== undefined && hasLoop(statement.defaultCase))
      );
    if (statement.kind === 'match-statement')
      return statement.arms.some(({ value }) => value.kind === 'call' && value.callee === 'loop');
    return false;
  });
}

function loopCount(statements: readonly ForgeWebScriptIrStatement[]): number {
  let count = 0;
  for (const statement of statements) {
    if (statement.kind === 'while' || statement.kind === 'do-while' || statement.kind === 'iterator-loop') count += 1;
    if (statement.kind === 'if')
      count +=
        loopCount(statement.consequent) + (statement.alternate === undefined ? 0 : loopCount(statement.alternate));
    if (statement.kind === 'switch') for (const arm of statement.cases) count += loopCount(arm.body);
    if (statement.kind === 'switch' && statement.defaultCase !== undefined) count += loopCount(statement.defaultCase);
  }
  return count;
}

function constants(module: ForgeWebScriptIrModule, functionName: string): Readonly<Record<string, number>> {
  const result: Record<string, number> = {};
  const locals: Record<string, number> = {};
  const evaluate = (expression: ForgeWebScriptIrExpression): number | undefined => {
    if (expression.kind === 'literal' && typeof expression.value === 'number') return expression.value;
    if (expression.kind === 'identifier') return locals[expression.name];
    if (expression.kind !== 'binary') return undefined;
    const left = evaluate(expression.left);
    const right = evaluate(expression.right);
    if (left === undefined || right === undefined) return undefined;
    if (expression.operator === '+') return left + right;
    if (expression.operator === '-') return left - right;
    if (expression.operator === '*') return left * right;
    if (expression.operator === '/' && right !== 0) return left / right;
    if (expression.operator === '%' && right !== 0) return left % right;
    return undefined;
  };
  const visit = (expression: ForgeWebScriptIrExpression): void => {
    if (expression.kind === 'literal' && typeof expression.value === 'number')
      result[`literal:${Object.keys(result).length}`] = expression.value;
    if (expression.kind === 'call') for (const argument of expression.arguments) visit(argument);
    if (expression.kind === 'binary') {
      visit(expression.left);
      visit(expression.right);
    }
    if (expression.kind === 'unary') visit(expression.operand);
    if (expression.kind === 'index') {
      visit(expression.receiver);
      visit(expression.index);
    }
  };
  const declaration = module.functions.find(({ name }) => name === functionName);
  for (const statement of declaration?.body ?? []) {
    if (statement.kind === 'let') {
      visit(statement.value);
      const value = evaluate(statement.value);
      if (value !== undefined) {
        locals[statement.name] = value;
        result[statement.name] = value;
      }
    }
    if (statement.kind === 'assignment') {
      visit(statement.value);
      const value = evaluate(statement.value);
      if (value === undefined) {delete locals[statement.name];} else {
        locals[statement.name] = value;
        result[statement.name] = value;
      }
    }
    if (statement.kind === 'return' && statement.value !== undefined) visit(statement.value);
  }
  return result;
}

export function createForgeWebScriptAnalysisFacts(frontend: ForgeWebScriptFrontendResult): ForgeWebScriptAnalysisFacts {
  const ir = frontend.ir;
  if (ir === undefined) {
    return { callGraph: [], controlFlow: [], types: [], ownership: [], ranges: [], capabilities: [], resources: [] };
  }
  const callGraph = ir.functions.map((declaration) => ({
    functionName: declaration.name,
    calls: declaration.analysis?.calls ?? [],
    span: declaration.span,
  }));
  const controlFlow = ir.functions.map((declaration) => {
    const counts = countForgeWebScriptIr({ ...ir, functions: [declaration] });
    return {
      functionName: declaration.name,
      statementCount: counts.statements,
      expressionCount: counts.expressions,
      hasLoop: hasLoop(declaration.body),
      span: declaration.span,
    };
  });
  const types = ir.functions.map((declaration) => ({
    functionName: declaration.name,
    parameters: declaration.parameters.map(({ type }) => type.name),
    result: declaration.result.name,
  }));
  const ownership = ir.functions.map((declaration) => ({
    functionName: declaration.name,
    ownedParameters: declaration.parameters.filter(({ type }) => type.ownership === 'owned').map(({ name }) => name),
    borrowedParameters: declaration.parameters
      .filter(({ type }) => type.ownership === 'borrowed')
      .map(({ name }) => name),
    sharedParameters: declaration.parameters.filter(({ type }) => type.ownership === 'shared').map(({ name }) => name),
  }));
  const ranges = ir.functions.map(({ name }) => ({ functionName: name, knownConstants: constants(ir, name) }));
  const capabilities = ir.imports.map(({ capability, alias }) => ({
    capability,
    imports: [alias],
    source: frontend.links.sourceImports?.find(({ source }) => source === capability),
  }));
  const resources = controlFlow.map(({ functionName, statementCount, expressionCount }) => ({
    functionName,
    estimatedStatements: statementCount,
    estimatedExpressions: expressionCount,
    loopCount: loopCount(ir.functions.find(({ name }) => name === functionName)?.body ?? []),
  }));
  return { callGraph, controlFlow, types, ownership, ranges, capabilities, resources };
}
