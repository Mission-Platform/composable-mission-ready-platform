import {
  forgeWebScriptTypeNameToString,
  type ForgeWebScriptExpression,
  type ForgeWebScriptModule,
  type ForgeWebScriptSourceSpan,
  type ForgeWebScriptStatement,
} from '@mission-platform/forge-web-script';

import { positionAtOffset, rangeFromSpan } from './positions.js';

import type {
  ForgeWebScriptCodeLens,
  ForgeWebScriptDocumentSymbol,
  ForgeWebScriptFoldingRange,
  ForgeWebScriptInlayHint,
  ForgeWebScriptInlineValue,
  ForgeWebScriptRange,
  ForgeWebScriptSymbol,
} from './types.js';

export function codeLensesForgeWebScript(
  module: ForgeWebScriptModule | undefined,
  symbols: readonly ForgeWebScriptSymbol[],
  referenceCount: (symbol: ForgeWebScriptSymbol) => number,
): readonly ForgeWebScriptCodeLens[] {
  if (module === undefined) return [];
  const declarationNames = new Set([
    ...module.functions.map((declaration) => declaration.name),
    ...module.structs.map((declaration) => declaration.name),
    ...module.enums.map((declaration) => declaration.name),
    ...module.interfaces.map((declaration) => declaration.name),
  ]);
  const declarations = symbols.filter(
    (symbol) =>
      (symbol.kind === 'function' || symbol.kind === 'type') &&
      symbol.containerName === undefined &&
      declarationNames.has(symbol.name) &&
      symbol.declarationRange !== undefined &&
      symbol.range.endOffset > symbol.range.startOffset,
  );
  return declarations
    .map((symbol) => {
      const count = referenceCount(symbol);
      return {
        range: symbol.range,
        kind: 'references' as const,
        title: `${count} reference${count === 1 ? '' : 's'}`,
        symbolName: symbol.name,
        symbolKind: symbol.kind,
        referenceCount: count,
      };
    })
    .toSorted(compareCodeLenses);
}

export function foldingRangesForgeWebScript(
  source: string,
  module: ForgeWebScriptModule | undefined,
): readonly ForgeWebScriptFoldingRange[] {
  if (module === undefined) return [];
  const ranges: ForgeWebScriptFoldingRange[] = [];
  const add = (span: ForgeWebScriptSourceSpan, kind: ForgeWebScriptFoldingRangeKind): void => {
    const range = rangeFromSpan(source, span);
    if (range.start.line === range.end.line || range.endOffset <= range.startOffset) return;
    if (
      ranges.some(
        (candidate) =>
          candidate.range.startOffset === range.startOffset && candidate.range.endOffset === range.endOffset,
      )
    )
      return;
    ranges.push({ range, kind });
  };

  add(module.span, 'module');
  for (const declaration of module.structs) add(declaration.span, 'declaration');
  for (const declaration of module.enums) {
    add(declaration.span, 'declaration');
    for (const variant of declaration.variants) add(variant.span, 'region');
  }
  for (const declaration of module.interfaces) {
    add(declaration.span, 'declaration');
    for (const method of declaration.functions) add(method.span, 'declaration');
  }
  for (const declaration of module.functions) {
    add(declaration.span, 'declaration');
    collectStatementFolds(declaration.body, add);
  }
  return ranges.toSorted(compareFoldingRanges);
}

export function inlineValuesForgeWebScript(
  source: string,
  module: ForgeWebScriptModule | undefined,
  symbols: readonly ForgeWebScriptSymbol[],
  requestedRange?: ForgeWebScriptRange,
): readonly ForgeWebScriptInlineValue[] {
  if (module === undefined) return [];
  const values: ForgeWebScriptInlineValue[] = [];
  const locals = symbols.filter((symbol) => symbol.kind === 'local');
  for (const declaration of module.functions) {
    collectInlineValues(source, declaration.body, locals, requestedRange, values);
  }
  return values.toSorted(
    (left, right) =>
      left.range.startOffset - right.range.startOffset || left.variableName.localeCompare(right.variableName),
  );
}

export function inlayHintsForgeWebScript(
  source: string,
  module: ForgeWebScriptModule | undefined,
  requestedRange?: ForgeWebScriptRange,
): readonly ForgeWebScriptInlayHint[] {
  if (module === undefined) return [];
  const hints: ForgeWebScriptInlayHint[] = [];
  const add = (hint: ForgeWebScriptInlayHint, offset: number): void => {
    if (requestedRange !== undefined && (offset < requestedRange.startOffset || offset > requestedRange.endOffset))
      return;
    if (
      hints.some(
        (candidate) =>
          candidate.position.line === hint.position.line &&
          candidate.position.character === hint.position.character &&
          candidate.label === hint.label,
      )
    )
      return;
    hints.push(hint);
  };
  const callables = new Map<
    string,
    { readonly parameters: readonly string[]; readonly result: string; readonly names: readonly string[] }
  >();
  for (const declaration of module.functions) {
    callables.set(declaration.name, {
      parameters: declaration.parameters.map((parameter) => forgeWebScriptTypeNameToString(parameter.type)),
      result: forgeWebScriptTypeNameToString(declaration.result),
      names: declaration.parameters.map((parameter) => parameter.name),
    });
  }
  for (const imported of module.imports) {
    callables.set(imported.alias, {
      parameters: imported.parameters.map((parameter) => forgeWebScriptTypeNameToString(parameter.type)),
      result: forgeWebScriptTypeNameToString(imported.result),
      names: imported.parameters.map((parameter) => parameter.name),
    });
  }
  for (const declaration of module.functions) collectInlayExpressions(source, declaration.body, callables, add);
  return hints.toSorted(
    (left, right) =>
      left.position.line - right.position.line ||
      left.position.character - right.position.character ||
      left.label.localeCompare(right.label),
  );
}

export function documentSymbolsForgeWebScript(
  source: string,
  module: ForgeWebScriptModule | undefined,
  symbols: readonly ForgeWebScriptSymbol[],
): readonly ForgeWebScriptDocumentSymbol[] {
  if (module === undefined) return [];
  const moduleSymbol = symbols.find((symbol) => symbol.kind === 'module');
  const roots = symbols.filter((symbol) => {
    if (symbol.kind === 'module' || symbol.containerName !== undefined) return false;
    if (symbol.kind === 'function')
      return module.functions.some(
        (declaration) => declaration.name === symbol.name && contains(declaration.span, symbol.range.startOffset),
      );
    if (symbol.kind === 'type')
      return [...module.structs, ...module.enums, ...module.interfaces].some(
        (declaration) => declaration.name === symbol.name && contains(declaration.span, symbol.range.startOffset),
      );
    return symbol.kind === 'capability';
  });
  const result = roots.map((symbol) => makeDocumentSymbol(symbol, symbols));
  if (moduleSymbol === undefined) return result.toSorted(compareDocumentSymbols);
  return [
    {
      ...makeDocumentSymbol(moduleSymbol, symbols),
      range: rangeFromSpan(source, module.span),
      children: result.toSorted(compareDocumentSymbols),
    },
  ];
}

function makeDocumentSymbol(
  symbol: ForgeWebScriptSymbol,
  symbols: readonly ForgeWebScriptSymbol[],
): ForgeWebScriptDocumentSymbol {
  const declarationRange = symbol.declarationRange ?? symbol.scopeRange ?? symbol.range;
  const children = symbols
    .filter(
      (candidate) =>
        candidate.containerName === symbol.name &&
        candidate.range.startOffset >= declarationRange.startOffset &&
        candidate.range.endOffset <= declarationRange.endOffset,
    )
    .map((candidate) => makeDocumentSymbol(candidate, symbols))
    .toSorted(compareDocumentSymbols);
  return {
    name: symbol.name,
    kind: symbol.kind,
    range: declarationRange,
    selectionRange: symbol.range,
    detail: symbol.detail,
    children,
  };
}

function collectStatementFolds(
  statements: readonly ForgeWebScriptStatement[],
  add: (span: ForgeWebScriptSourceSpan, kind: ForgeWebScriptFoldingRangeKind) => void,
): void {
  for (const statement of statements) {
    switch (statement.kind) {
      case 'if': {
        add(statement.span, 'region');
        collectStatementFolds(statement.consequent, add);
        if (statement.alternate !== undefined) collectStatementFolds(statement.alternate, add);
        break;
      }
      case 'while':
      case 'do-while':
      case 'for':
      case 'iterator-loop': {
        add(statement.span, 'region');
        collectStatementFolds(statement.body, add);
        break;
      }
      case 'match-statement': {
        add(statement.span, 'region');
        for (const arm of statement.arms) add(arm.span, 'region');
        break;
      }
      case 'switch': {
        add(statement.span, 'region');
        for (const switchCase of statement.cases) {
          add(switchCase.span, 'region');
          collectStatementFolds(switchCase.body, add);
        }
        if (statement.defaultCase !== undefined) collectStatementFolds(statement.defaultCase, add);
        break;
      }
      default: {
        break;
      }
    }
  }
}

function collectInlineValues(
  source: string,
  statements: readonly ForgeWebScriptStatement[],
  locals: readonly ForgeWebScriptSymbol[],
  requestedRange: ForgeWebScriptRange | undefined,
  values: ForgeWebScriptInlineValue[],
): void {
  for (const statement of statements) {
    if (statement.kind === 'let' && statement.value.kind === 'literal') {
      const symbol = locals.find(
        (candidate) =>
          candidate.name === statement.name &&
          candidate.range.startOffset >= statement.span.start &&
          candidate.range.startOffset <= statement.span.end,
      );
      const range = symbol?.range ?? rangeFromSpan(source, statement.span);
      if (requestedRange === undefined || rangesOverlap(range, requestedRange)) {
        values.push({
          range,
          variableName: statement.name,
          text: source.slice(statement.value.span.start, statement.value.span.end),
          type: forgeWebScriptTypeNameToString(statement.type),
        });
      }
    }
    switch (statement.kind) {
      case 'if': {
        collectInlineValues(source, statement.consequent, locals, requestedRange, values);
        if (statement.alternate !== undefined)
          collectInlineValues(source, statement.alternate, locals, requestedRange, values);
        break;
      }
      case 'while':
      case 'do-while':
      case 'for':
      case 'iterator-loop': {
        collectInlineValues(source, statement.body, locals, requestedRange, values);
        break;
      }
      case 'switch': {
        for (const switchCase of statement.cases)
          collectInlineValues(source, switchCase.body, locals, requestedRange, values);
        if (statement.defaultCase !== undefined)
          collectInlineValues(source, statement.defaultCase, locals, requestedRange, values);
        break;
      }
      default: {
        break;
      }
    }
  }
}

function collectInlayExpressions(
  source: string,
  statements: readonly ForgeWebScriptStatement[],
  callables: ReadonlyMap<
    string,
    { readonly parameters: readonly string[]; readonly result: string; readonly names: readonly string[] }
  >,
  add: (hint: ForgeWebScriptInlayHint, offset: number) => void,
): void {
  for (const statement of statements) {
    if (statement.kind === 'let') collectInlayExpression(source, statement.value, callables, add);
    else if (statement.kind === 'assignment') {
      collectInlayExpression(source, statement.value, callables, add);
      if (statement.index !== undefined) collectInlayExpression(source, statement.index, callables, add);
    } else if (statement.kind === 'return' && statement.value !== undefined)
      collectInlayExpression(source, statement.value, callables, add);
    else
      switch (statement.kind) {
        case 'yield': {
          collectInlayExpression(source, statement.value, callables, add);
          break;
        }
        case 'expression-statement': {
          collectInlayExpression(source, statement.expression, callables, add);
          break;
        }
        case 'if': {
          collectInlayExpression(source, statement.condition, callables, add);
          collectInlayExpressions(source, statement.consequent, callables, add);
          if (statement.alternate !== undefined) collectInlayExpressions(source, statement.alternate, callables, add);

          break;
        }
        case 'while':
        case 'do-while':
        case 'for': {
          collectInlayExpression(source, statement.condition, callables, add);
          collectInlayExpressions(source, statement.body, callables, add);

          break;
        }
        case 'iterator-loop': {
          collectInlayExpression(source, statement.iterator, callables, add);
          collectInlayExpressions(source, statement.body, callables, add);

          break;
        }
        case 'match-statement': {
          collectInlayExpression(source, statement.value, callables, add);
          for (const arm of statement.arms) collectInlayExpression(source, arm.value, callables, add);

          break;
        }
        case 'switch': {
          collectInlayExpression(source, statement.value, callables, add);
          for (const switchCase of statement.cases) collectInlayExpressions(source, switchCase.body, callables, add);
          if (statement.defaultCase !== undefined)
            collectInlayExpressions(source, statement.defaultCase, callables, add);

          break;
        }
        // No default
      }
  }
}

function collectInlayExpression(
  source: string,
  expression: ForgeWebScriptExpression,
  callables: ReadonlyMap<
    string,
    { readonly parameters: readonly string[]; readonly result: string; readonly names: readonly string[] }
  >,
  add: (hint: ForgeWebScriptInlayHint, offset: number) => void,
): void {
  switch (expression.kind) {
    case 'call': {
      const callable = callables.get(expression.callee);
      if (callable === undefined) {
        for (const argument of expression.arguments) collectInlayExpression(source, argument, callables, add);
      } else {
        for (const [index, argument] of expression.arguments.entries()) {
          const name = callable.names[index];
          if (name !== undefined)
            add(
              {
                position: positionAtOffset(source, argument.span.start),
                label: `${name}:`,
                kind: 'parameter',
                paddingRight: true,
              },
              argument.span.start,
            );
          collectInlayExpression(source, argument, callables, add);
        }
        if (callable.result !== 'unit')
          add(
            {
              position: positionAtOffset(source, expression.span.end),
              label: `: ${callable.result}`,
              kind: 'type',
              paddingLeft: true,
            },
            expression.span.end,
          );
      }

      break;
    }
    case 'binary': {
      collectInlayExpression(source, expression.left, callables, add);
      collectInlayExpression(source, expression.right, callables, add);

      break;
    }
    case 'unary': {
      collectInlayExpression(source, expression.operand, callables, add);
      break;
    }
    case 'index': {
      collectInlayExpression(source, expression.receiver, callables, add);
      collectInlayExpression(source, expression.index, callables, add);

      break;
    }
    case 'array-literal':
    case 'vector-literal': {
      for (const element of expression.elements) collectInlayExpression(source, element, callables, add);

      break;
    }
    case 'struct-value': {
      for (const value of Object.values(expression.fields)) collectInlayExpression(source, value, callables, add);

      break;
    }
    case 'enum-value': {
      for (const argument of expression.arguments) collectInlayExpression(source, argument, callables, add);

      break;
    }
    case 'match': {
      collectInlayExpression(source, expression.value, callables, add);
      for (const arm of expression.arms) collectInlayExpression(source, arm.value, callables, add);

      break;
    }
    // No default
  }
}

function rangesOverlap(left: ForgeWebScriptRange, right: ForgeWebScriptRange): boolean {
  return left.startOffset <= right.endOffset && right.startOffset <= left.endOffset;
}

function contains(span: ForgeWebScriptSourceSpan, offset: number): boolean {
  return span.start <= offset && offset <= span.end;
}

function compareCodeLenses(left: ForgeWebScriptCodeLens, right: ForgeWebScriptCodeLens): number {
  return left.range.startOffset - right.range.startOffset || left.symbolName.localeCompare(right.symbolName);
}

function compareFoldingRanges(left: ForgeWebScriptFoldingRange, right: ForgeWebScriptFoldingRange): number {
  return (
    left.range.startOffset - right.range.startOffset ||
    right.range.endOffset - left.range.endOffset ||
    left.kind.localeCompare(right.kind)
  );
}

function compareDocumentSymbols(left: ForgeWebScriptDocumentSymbol, right: ForgeWebScriptDocumentSymbol): number {
  return left.selectionRange.startOffset - right.selectionRange.startOffset || left.name.localeCompare(right.name);
}

type ForgeWebScriptFoldingRangeKind = ForgeWebScriptFoldingRange['kind'];
