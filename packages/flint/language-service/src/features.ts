import {
  flintTypeNameToString,
  type FlintExpression,
  type FlintImportTypeEnvironment,
  type FlintModule,
  type FlintSourceSpan,
  type FlintStatement,
} from '@mission-platform/flint';

import { positionAtOffset, rangeFromSpan } from './positions.js';

import type {
  FlintCodeLens,
  FlintDocumentSymbol,
  FlintFoldingRange,
  FlintInlayHint,
  FlintInlineValue,
  FlintRange,
  FlintSymbol,
} from './types.js';

/** Computes actionable code lens commands for Flint functions and modules. */
export function codeLensesFlint(
  module: FlintModule | undefined,
  symbols: readonly FlintSymbol[],
  referenceCount: (symbol: FlintSymbol) => number,
): readonly FlintCodeLens[] {
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

/** Computes syntax folding ranges for functions, control flow blocks, and imports. */
export function foldingRangesFlint(source: string, module: FlintModule | undefined): readonly FlintFoldingRange[] {
  if (module === undefined) return [];
  const ranges: FlintFoldingRange[] = [];
  const add = (span: FlintSourceSpan, kind: FlintFoldingRangeKind): void => {
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

/** Computes inline variable evaluation ranges for debugger display. */
export function inlineValuesFlint(
  source: string,
  module: FlintModule | undefined,
  symbols: readonly FlintSymbol[],
  requestedRange?: FlintRange,
): readonly FlintInlineValue[] {
  if (module === undefined) return [];
  const values: FlintInlineValue[] = [];
  const locals = symbols.filter((symbol) => symbol.kind === 'local');
  for (const declaration of module.functions) {
    collectInlineValues(source, declaration.body, locals, requestedRange, values);
  }
  return values.toSorted(
    (left, right) =>
      left.range.startOffset - right.range.startOffset || left.variableName.localeCompare(right.variableName),
  );
}

/** Computes parameter and type inlay hints within the visible range. */
export function inlayHintsFlint(
  source: string,
  module: FlintModule | undefined,
  requestedRange?: FlintRange,
  importTypeEnvironment?: FlintImportTypeEnvironment,
): readonly FlintInlayHint[] {
  if (module === undefined) return [];
  const hints: FlintInlayHint[] = [];
  const add = (hint: FlintInlayHint, offset: number): void => {
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
  for (const imported of importTypeEnvironment?.externalFunctions ?? []) {
    callables.set(imported.name, {
      parameters: imported.parameters.map((parameter) => flintTypeNameToString(parameter.type)),
      result: flintTypeNameToString(imported.result),
      names: imported.parameters.map((parameter) => parameter.name),
    });
  }
  for (const declaration of module.functions) {
    callables.set(declaration.name, {
      parameters: declaration.parameters.map((parameter) => flintTypeNameToString(parameter.type)),
      result: flintTypeNameToString(declaration.result),
      names: declaration.parameters.map((parameter) => parameter.name),
    });
  }
  for (const imported of module.imports) {
    callables.set(imported.alias, {
      parameters: imported.parameters.map((parameter) => flintTypeNameToString(parameter.type)),
      result: flintTypeNameToString(imported.result),
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

/** Constructs the hierarchical document symbol tree for outline views. */
export function documentSymbolsFlint(
  source: string,
  module: FlintModule | undefined,
  symbols: readonly FlintSymbol[],
): readonly FlintDocumentSymbol[] {
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

/** Helper factory creating a FlintDocumentSymbol with selection range. */
function makeDocumentSymbol(symbol: FlintSymbol, symbols: readonly FlintSymbol[]): FlintDocumentSymbol {
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

/** Traverses IR statements collecting block folding ranges. */
function collectStatementFolds(
  statements: readonly FlintStatement[],
  add: (span: FlintSourceSpan, kind: FlintFoldingRangeKind) => void,
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

/** Collects variable binding ranges suitable for inline debug evaluation. */
function collectInlineValues(
  source: string,
  statements: readonly FlintStatement[],
  locals: readonly FlintSymbol[],
  requestedRange: FlintRange | undefined,
  values: FlintInlineValue[],
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
          type: flintTypeNameToString(statement.type),
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

/** Traverses statements collecting expressions requiring inlay hint evaluation. */
function collectInlayExpressions(
  source: string,
  statements: readonly FlintStatement[],
  callables: ReadonlyMap<
    string,
    { readonly parameters: readonly string[]; readonly result: string; readonly names: readonly string[] }
  >,
  add: (hint: FlintInlayHint, offset: number) => void,
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

/** Inspects an expression for call argument and let binding inlay hints. */
function collectInlayExpression(
  source: string,
  expression: FlintExpression,
  callables: ReadonlyMap<
    string,
    { readonly parameters: readonly string[]; readonly result: string; readonly names: readonly string[] }
  >,
  add: (hint: FlintInlayHint, offset: number) => void,
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

/** Determines whether two ranges intersect. */
function rangesOverlap(left: FlintRange, right: FlintRange): boolean {
  return left.startOffset <= right.endOffset && right.startOffset <= left.endOffset;
}

/** Determines whether an outer range contains an inner range. */
function contains(span: FlintSourceSpan, offset: number): boolean {
  return span.start <= offset && offset <= span.end;
}

/** Sort comparator for ordering code lenses by position. */
function compareCodeLenses(left: FlintCodeLens, right: FlintCodeLens): number {
  return left.range.startOffset - right.range.startOffset || left.symbolName.localeCompare(right.symbolName);
}

/** Sort comparator for ordering folding ranges by start line. */
function compareFoldingRanges(left: FlintFoldingRange, right: FlintFoldingRange): number {
  return (
    left.range.startOffset - right.range.startOffset ||
    right.range.endOffset - left.range.endOffset ||
    left.kind.localeCompare(right.kind)
  );
}

/** Sort comparator for ordering document symbols by source position. */
function compareDocumentSymbols(left: FlintDocumentSymbol, right: FlintDocumentSymbol): number {
  return left.selectionRange.startOffset - right.selectionRange.startOffset || left.name.localeCompare(right.name);
}

/** Category of syntax folding range (comment, imports, region, etc.). */
type FlintFoldingRangeKind = FlintFoldingRange['kind'];
