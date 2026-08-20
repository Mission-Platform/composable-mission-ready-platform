import {
  primitiveTypes,
  renderForgeWebScriptDocumentation,
  type ForgeWebScriptEnumDeclaration,
  type ForgeWebScriptExpression,
  type ForgeWebScriptFunction,
  type ForgeWebScriptGenericParameter,
  type ForgeWebScriptInterfaceDeclaration,
  type ForgeWebScriptInterfaceFunction,
  type ForgeWebScriptModule,
  type ForgeWebScriptPrimitiveType,
  type ForgeWebScriptSourceSpan,
  type ForgeWebScriptStructDeclaration,
  type ForgeWebScriptStatement,
  type ForgeWebScriptToken,
  type ForgeWebScriptTypeName,
} from '@mission-platform/forge-web-script';

import { rangeFromOffsets, rangeFromSpan } from './positions.js';

import type { ForgeWebScriptCallable, ForgeWebScriptSymbol, ForgeWebScriptTokenClassification } from './types.js';

export interface ForgeWebScriptSymbolIndex {
  readonly symbols: readonly ForgeWebScriptSymbol[];
  readonly callables: ReadonlyMap<string, ForgeWebScriptCallable>;
}

export function buildSymbolIndex(
  source: string,
  module: ForgeWebScriptModule | undefined,
  tokens: readonly ForgeWebScriptTokenClassification[],
): ForgeWebScriptSymbolIndex {
  if (module === undefined) return { symbols: [], callables: new Map() };
  const rawTokens = tokens.flatMap((token) => (token.token === undefined ? [] : [token.token]));
  const symbols: ForgeWebScriptSymbol[] = [];
  const callables = new Map<string, ForgeWebScriptCallable>();
  const moduleToken = rawTokens.find(
    (token) => token.text === 'module' && token.span.start >= module.span.start && token.span.end <= module.span.end,
  );
  const moduleNameToken = moduleToken === undefined ? undefined : nextIdentifier(rawTokens, moduleToken);
  symbols.push({
    name: module.name,
    kind: 'module',
    range: moduleNameToken === undefined ? rangeFromSpan(source, module.span) : tokenRange(source, moduleNameToken),
    detail: `module ${module.name}`,
  });
  for (const imported of module.sourceImports) {
    const aliasToken = findToken(rawTokens, imported.alias, imported.span.start, imported.span.end);
    symbols.push({
      name: imported.alias,
      kind: 'capability',
      range: aliasToken === undefined ? rangeFromSpan(source, imported.span) : tokenRange(source, aliasToken),
      detail: `${imported.source} as ${imported.alias}`,
    });
  }
  for (const imported of module.imports) {
    const aliasToken = findToken(rawTokens, imported.alias, imported.span.start, imported.span.end);
    const callable = {
      parameters: imported.parameters.map((parameter) => renderTypeName(parameter.type)),
      result: renderTypeName(imported.result),
    } satisfies ForgeWebScriptCallable;
    callables.set(imported.alias, callable);
    symbols.push({
      name: imported.alias,
      kind: 'capability',
      range: aliasToken === undefined ? rangeFromSpan(source, imported.span) : tokenRange(source, aliasToken),
      detail: `${imported.capability} as ${signature(imported.alias, callable)}`,
      callable,
    });
    addTypeSymbol(symbols, source, imported.result);
    for (const parameter of imported.parameters) addTypeSymbol(symbols, source, parameter.type);
  }
  for (const declaration of module.structs) addStructSymbols(source, declaration, rawTokens, symbols);
  for (const declaration of module.enums) addEnumSymbols(source, declaration, rawTokens, symbols);
  for (const declaration of module.interfaces) addInterfaceSymbols(source, declaration, rawTokens, symbols);
  for (const declaration of module.functions) {
    const callable = {
      parameters: declaration.parameters.map((parameter) => renderTypeName(parameter.type)),
      result: renderTypeName(declaration.result),
      ...(declaration.documentation === undefined
        ? {}
        : { documentation: renderForgeWebScriptDocumentation(declaration.documentation) }),
    } satisfies ForgeWebScriptCallable;
    callables.set(declaration.name, callable);
    const functionToken = findToken(rawTokens, declaration.name, declaration.span.start, declaration.span.end);
    symbols.push({
      name: declaration.name,
      kind: 'function',
      range: functionToken === undefined ? rangeFromSpan(source, declaration.span) : tokenRange(source, functionToken),
      detail: `${declaration.exported ? 'export ' : ''}${signature(declaration.name, callable)}`,
      callable,
      scopeRange: rangeFromSpan(source, declaration.span),
      declarationRange: rangeFromSpan(source, declaration.span),
    });
    addGenericParameterSymbols(
      source,
      declaration.genericParameters,
      rawTokens,
      symbols,
      declaration.name,
      declaration.span,
    );
    addTypeSymbol(symbols, source, declaration.result);
    for (const parameter of declaration.parameters) {
      const parameterToken = findToken(rawTokens, parameter.name, declaration.span.start, declaration.span.end);
      symbols.push({
        name: parameter.name,
        kind: 'parameter',
        range:
          parameterToken === undefined ? rangeFromSpan(source, parameter.span) : tokenRange(source, parameterToken),
        detail: `parameter ${parameter.name}: ${parameter.type.name}`,
        type: parameter.type.name,
        containerName: declaration.name,
        scopeRange: rangeFromSpan(source, declaration.span),
      });
      addTypeSymbol(symbols, source, parameter.type);
    }
    addStatementSymbols(source, declaration, declaration.body, rawTokens, symbols, declaration.span);
  }
  return { symbols, callables };
}

function addStructSymbols(
  source: string,
  declaration: ForgeWebScriptStructDeclaration,
  tokens: readonly ForgeWebScriptToken[],
  symbols: ForgeWebScriptSymbol[],
): void {
  addAggregateTypeSymbol(source, declaration.name, declaration.genericParameters, declaration.span, tokens, symbols);
  addGenericParameterSymbols(
    source,
    declaration.genericParameters,
    tokens,
    symbols,
    declaration.name,
    declaration.span,
  );
  for (const field of declaration.fields) {
    const fieldToken = findToken(tokens, field.name, field.span.start, field.span.end);
    symbols.push({
      name: field.name,
      kind: 'type',
      range: fieldToken === undefined ? rangeFromSpan(source, field.span) : tokenRange(source, fieldToken),
      detail: `field ${field.name}: ${renderTypeName(field.type)}`,
      type: renderTypeName(field.type),
      containerName: declaration.name,
      scopeRange: rangeFromSpan(source, declaration.span),
    });
    addTypeSymbol(symbols, source, field.type);
  }
}

function addEnumSymbols(
  source: string,
  declaration: ForgeWebScriptEnumDeclaration,
  tokens: readonly ForgeWebScriptToken[],
  symbols: ForgeWebScriptSymbol[],
): void {
  addAggregateTypeSymbol(source, declaration.name, declaration.genericParameters, declaration.span, tokens, symbols);
  addGenericParameterSymbols(
    source,
    declaration.genericParameters,
    tokens,
    symbols,
    declaration.name,
    declaration.span,
  );
  for (const variant of declaration.variants) {
    const variantToken = findToken(tokens, variant.name, variant.span.start, variant.span.end);
    symbols.push({
      name: variant.name,
      kind: 'type',
      range: variantToken === undefined ? rangeFromSpan(source, variant.span) : tokenRange(source, variantToken),
      detail: `variant ${variant.name}${variant.fields.length === 0 ? '' : `(${variant.fields.map((field) => renderTypeName(field.type)).join(', ')})`}`,
      containerName: declaration.name,
      scopeRange: rangeFromSpan(source, declaration.span),
    });
    for (const field of variant.fields) {
      const fieldToken = findToken(tokens, field.name, field.span.start, field.span.end);
      symbols.push({
        name: field.name,
        kind: 'parameter',
        range: fieldToken === undefined ? rangeFromSpan(source, field.span) : tokenRange(source, fieldToken),
        detail: `parameter ${field.name}: ${renderTypeName(field.type)}`,
        type: renderTypeName(field.type),
        containerName: variant.name,
        scopeRange: rangeFromSpan(source, variant.span),
      });
      addTypeSymbol(symbols, source, field.type);
    }
  }
}

function addInterfaceSymbols(
  source: string,
  declaration: ForgeWebScriptInterfaceDeclaration,
  tokens: readonly ForgeWebScriptToken[],
  symbols: ForgeWebScriptSymbol[],
): void {
  addAggregateTypeSymbol(source, declaration.name, declaration.genericParameters, declaration.span, tokens, symbols);
  addGenericParameterSymbols(
    source,
    declaration.genericParameters,
    tokens,
    symbols,
    declaration.name,
    declaration.span,
  );
  for (const method of declaration.functions) addInterfaceFunctionSymbols(source, declaration, method, tokens, symbols);
}

function addInterfaceFunctionSymbols(
  source: string,
  declaration: ForgeWebScriptInterfaceDeclaration,
  method: ForgeWebScriptInterfaceFunction,
  tokens: readonly ForgeWebScriptToken[],
  symbols: ForgeWebScriptSymbol[],
): void {
  const callable = {
    parameters: method.parameters.map((parameter) => renderTypeName(parameter.type)),
    result: renderTypeName(method.result),
  } satisfies ForgeWebScriptCallable;
  const methodToken = findToken(tokens, method.name, method.span.start, method.span.end);
  symbols.push({
    name: method.name,
    kind: 'function',
    range: methodToken === undefined ? rangeFromSpan(source, method.span) : tokenRange(source, methodToken),
    detail: signature(method.name, callable),
    callable,
    containerName: declaration.name,
    scopeRange: rangeFromSpan(source, declaration.span),
  });
  addGenericParameterSymbols(source, method.genericParameters, tokens, symbols, method.name, method.span);
  for (const parameter of method.parameters) addTypeSymbol(symbols, source, parameter.type);
  addTypeSymbol(symbols, source, method.result);
}

function addAggregateTypeSymbol(
  source: string,
  name: string,
  genericParameters: readonly ForgeWebScriptGenericParameter[],
  span: ForgeWebScriptSourceSpan,
  tokens: readonly ForgeWebScriptToken[],
  symbols: ForgeWebScriptSymbol[],
): void {
  const nameToken = findToken(tokens, name, span.start, span.end);
  symbols.push({
    name,
    kind: 'type',
    range: nameToken === undefined ? rangeFromSpan(source, span) : tokenRange(source, nameToken),
    detail: `Forge Web Script type ${name}${genericSuffix(genericParameters)}`,
    declarationRange: rangeFromSpan(source, span),
  });
}

function addGenericParameterSymbols(
  source: string,
  parameters: readonly ForgeWebScriptGenericParameter[],
  tokens: readonly ForgeWebScriptToken[],
  symbols: ForgeWebScriptSymbol[],
  containerName: string,
  scope: ForgeWebScriptSourceSpan,
): void {
  for (const parameter of parameters) {
    const parameterToken = findToken(tokens, parameter.name, parameter.span.start, parameter.span.end);
    symbols.push({
      name: parameter.name,
      kind: 'type',
      range: parameterToken === undefined ? rangeFromSpan(source, parameter.span) : tokenRange(source, parameterToken),
      detail: `generic parameter ${parameter.name}${parameter.bounds.length === 0 ? '' : `: ${parameter.bounds.join(' + ')}`}`,
      type: parameter.name,
      containerName,
      scopeRange: rangeFromSpan(source, scope),
    });
  }
}

function genericSuffix(parameters: readonly ForgeWebScriptGenericParameter[]): string {
  return parameters.length === 0
    ? ''
    : `<${parameters.map((parameter) => `${parameter.name}${parameter.bounds.length === 0 ? '' : `: ${parameter.bounds.join(' + ')}`}`).join(', ')}>`;
}

function addStatementSymbols(
  source: string,
  declaration: ForgeWebScriptFunction,
  statements: readonly ForgeWebScriptStatement[],
  tokens: readonly ForgeWebScriptToken[],
  symbols: ForgeWebScriptSymbol[],
  scope: ForgeWebScriptSourceSpan,
): void {
  for (const statement of statements) {
    if (statement.kind === 'let') {
      const nameToken = findToken(tokens, statement.name, statement.span.start, statement.span.end);
      symbols.push({
        name: statement.name,
        kind: 'local',
        range: nameToken === undefined ? rangeFromSpan(source, statement.span) : tokenRange(source, nameToken),
        detail: `local ${statement.name}: ${renderTypeName(statement.type)}`,
        type: renderTypeName(statement.type),
        containerName: declaration.name,
        scopeRange: rangeFromSpan(source, scope),
      });
      addTypeSymbol(symbols, source, statement.type);
      addExpressionSymbols(source, declaration, statement.value, tokens, symbols, scope);
    }
    if (statement.kind === 'if') {
      addExpressionSymbols(source, declaration, statement.condition, tokens, symbols, scope);
      addStatementSymbols(
        source,
        declaration,
        statement.consequent,
        tokens,
        symbols,
        blockScope(statement.consequent, tokens, statement.span),
      );
      if (statement.alternate !== undefined)
        addStatementSymbols(
          source,
          declaration,
          statement.alternate,
          tokens,
          symbols,
          blockScope(statement.alternate, tokens, statement.span),
        );
    }
    if (statement.kind === 'while' || statement.kind === 'do-while') {
      addExpressionSymbols(source, declaration, statement.condition, tokens, symbols, scope);
      addStatementSymbols(
        source,
        declaration,
        statement.body,
        tokens,
        symbols,
        blockScope(statement.body, tokens, statement.span),
      );
    }
    if (statement.kind === 'iterator-loop') {
      const bindingToken = findToken(tokens, statement.binding, statement.span.start, statement.span.end);
      symbols.push({
        name: statement.binding,
        kind: 'local',
        range: bindingToken === undefined ? rangeFromSpan(source, statement.span) : tokenRange(source, bindingToken),
        detail: `iterator binding ${statement.binding}`,
        containerName: declaration.name,
        scopeRange: rangeFromSpan(source, blockScope(statement.body, tokens, statement.span)),
      });
      addExpressionSymbols(source, declaration, statement.iterator, tokens, symbols, scope);
      addStatementSymbols(
        source,
        declaration,
        statement.body,
        tokens,
        symbols,
        blockScope(statement.body, tokens, statement.span),
      );
    }
    if (statement.kind === 'match-statement') {
      addExpressionSymbols(source, declaration, statement.value, tokens, symbols, scope);
      for (const arm of statement.arms) {
        addPatternSymbols(source, declaration, arm.pattern, arm.span, tokens, symbols);
        addExpressionSymbols(source, declaration, arm.value, tokens, symbols, arm.span);
      }
    }
    if (statement.kind === 'return' && statement.value !== undefined)
      addExpressionSymbols(source, declaration, statement.value, tokens, symbols, scope);
    if (statement.kind === 'expression-statement')
      addExpressionSymbols(source, declaration, statement.expression, tokens, symbols, scope);
    if (statement.kind === 'assignment')
      addExpressionSymbols(source, declaration, statement.value, tokens, symbols, scope);
  }
}

function addExpressionSymbols(
  source: string,
  declaration: ForgeWebScriptFunction,
  expression: ForgeWebScriptExpression,
  tokens: readonly ForgeWebScriptToken[],
  symbols: ForgeWebScriptSymbol[],
  scope: ForgeWebScriptSourceSpan,
): void {
  switch (expression.kind) {
    case 'binary': {
      addExpressionSymbols(source, declaration, expression.left, tokens, symbols, scope);
      addExpressionSymbols(source, declaration, expression.right, tokens, symbols, scope);
      break;
    }
    case 'unary': {
      addExpressionSymbols(source, declaration, expression.operand, tokens, symbols, scope);
      break;
    }
    case 'call': {
      for (const argument of expression.arguments)
        addExpressionSymbols(source, declaration, argument, tokens, symbols, scope);
      break;
    }
    case 'struct-value': {
      for (const value of Object.values(expression.fields))
        addExpressionSymbols(source, declaration, value, tokens, symbols, scope);
      break;
    }
    case 'enum-value': {
      for (const argument of expression.arguments)
        addExpressionSymbols(source, declaration, argument, tokens, symbols, scope);
      break;
    }
    case 'match': {
      addExpressionSymbols(source, declaration, expression.value, tokens, symbols, scope);
      for (const arm of expression.arms) {
        addPatternSymbols(source, declaration, arm.pattern, arm.span, tokens, symbols);
        addExpressionSymbols(source, declaration, arm.value, tokens, symbols, arm.span);
      }
      break;
    }
  }
}

function addPatternSymbols(
  source: string,
  declaration: ForgeWebScriptFunction,
  pattern: { readonly kind: string; readonly bindings?: readonly string[] },
  scope: ForgeWebScriptSourceSpan,
  tokens: readonly ForgeWebScriptToken[],
  symbols: ForgeWebScriptSymbol[],
): void {
  for (const binding of pattern.bindings ?? []) {
    const bindingToken = findToken(tokens, binding, scope.start, scope.end);
    symbols.push({
      name: binding,
      kind: 'local',
      range: bindingToken === undefined ? rangeFromSpan(source, scope) : tokenRange(source, bindingToken),
      detail: `match binding ${binding}`,
      containerName: declaration.name,
      scopeRange: rangeFromSpan(source, scope),
    });
  }
}

function blockScope(
  statements: readonly ForgeWebScriptStatement[],
  tokens: readonly ForgeWebScriptToken[],
  fallback: ForgeWebScriptSourceSpan,
): ForgeWebScriptSourceSpan {
  const first = statements[0];
  const last = statements.at(-1);
  if (first === undefined || last === undefined) return fallback;
  const opening = tokens.findLast((token) => token.text === '{' && token.span.end <= first.span.start);
  const closing = tokens.find((token) => token.text === '}' && token.span.start >= last.span.end);
  if (opening === undefined || closing === undefined) return fallback;
  return {
    start: opening.span.start,
    end: closing.span.end,
    line: opening.span.line,
    column: opening.span.column,
    endLine: closing.span.endLine,
    endColumn: closing.span.endColumn,
  };
}

function addTypeSymbol(symbols: ForgeWebScriptSymbol[], source: string, type: ForgeWebScriptTypeName): void {
  const rendered = renderTypeName(type);
  if (!primitiveTypes.has(type.name as ForgeWebScriptPrimitiveType) && type.reference === undefined) return;
  symbols.push({
    name: rendered,
    kind: 'type',
    range: rangeFromSpan(source, type.span),
    detail: type.reference === undefined ? `primitive type ${rendered}` : `Forge Web Script type ${rendered}`,
  });
  for (const argument of type.arguments ?? []) addTypeSymbol(symbols, source, argument);
}

function renderTypeName(type: ForgeWebScriptTypeName): string {
  const name = type.reference ?? type.name;
  return type.arguments === undefined || type.arguments.length === 0
    ? name
    : `${name}<${type.arguments.map((argument) => renderTypeName(argument)).join(', ')}>`;
}

function findToken(
  tokens: readonly ForgeWebScriptToken[],
  text: string,
  start: number,
  end: number,
): ForgeWebScriptToken | undefined {
  return tokens.find(
    (token) => token.kind === 'identifier' && token.text === text && token.span.start >= start && token.span.end <= end,
  );
}

function nextIdentifier(
  tokens: readonly ForgeWebScriptToken[],
  token: ForgeWebScriptToken,
): ForgeWebScriptToken | undefined {
  const index = tokens.indexOf(token);
  return tokens.slice(index + 1).find((candidate) => candidate.kind === 'identifier');
}

function tokenRange(source: string, token: ForgeWebScriptToken) {
  return rangeFromOffsets(source, token.span.start, token.span.end);
}

function signature(name: string, callable: ForgeWebScriptCallable): string {
  return `${name}(${callable.parameters.join(', ')}): ${callable.result}`;
}

export function expressionName(expression: ForgeWebScriptExpression): string | undefined {
  return expression.kind === 'identifier'
    ? expression.name
    : expression.kind === 'call'
      ? expression.callee
      : undefined;
}
