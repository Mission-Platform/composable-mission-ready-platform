import { primitiveTypes } from '@mission-platform/flint-parser';
import { FLINT_REGEX_FUNCTIONS, FLINT_STRING_FUNCTIONS } from '@mission-platform/flint-types';

import { offsetAtPosition, rangeFromOffsets } from './positions.js';

import type { FlintCompletion, FlintPosition, FlintSymbol, FlintWorkspaceOptions } from './types.js';

const keywords = [
  'as',
  'capability',
  'case',
  'comptime',
  'derive',
  'do',
  'else',
  'enum',
  'export',
  'fn',
  'if',
  'import',
  'interface',
  'let',
  'macro',
  'match',
  'return',
  'struct',
  'iter',
  'loop',
  'while',
  'yield',
  'inline',
  'noinline',
  'likely',
  'unlikely',
];

const outcomeTypes = ['Iterable', 'Iterator', 'Option', 'Result', 'iterResult', 'TypeInfo', 'FieldInfo'];

const metaFunctions = [
  { name: 'size_of', parameters: ['type: string'], result: 'u32' },
  { name: 'align_of', parameters: ['type: string'], result: 'u32' },
  { name: 'offset_of', parameters: ['type: string', 'field: string'], result: 'u32' },
  { name: 'fields_of', parameters: ['type: string'], result: 'FieldInfo[]' },
  { name: 'type_info', parameters: ['type: string'], result: 'TypeInfo' },
];

const htmlTags = ['div', 'button', 'img', 'input', 'label', 'main', 'section', 'span', 'svg', 'Slot'];
const htmlAttributes = ['class', 'id', 'role', 'style', 'value', 'disabled', 'checked', 'onClick', 'onInput'];
const cssProperties = [
  'color',
  'background-color',
  'display',
  'font-size',
  'margin',
  'padding',
  'border-radius',
  'content',
  'inherits',
  'initial-value',
  'syntax',
];
const cssValues = ['block', 'flex', 'grid', 'inline', 'none', 'red', 'transparent', 'inherit', 'initial', 'unset'];

/**
 * Computes autocomplete suggestions at the given document position.
 *
 * @param document - Target document.
 * @param position - Cursor position.
 * @param symbols - Visible document and workspace symbols.
 * @returns Array of completion items.
 */
// skipcq: JS-R1005
export function completeFlint(
  source: string,
  position: FlintPosition,
  symbols: readonly FlintSymbol[],
  options: FlintWorkspaceOptions,
): readonly FlintCompletion[] {
  const offset = offsetAtPosition(source, position);
  const prefixMatch = /[A-Za-z_][A-Za-z0-9_]*$/u.exec(source.slice(0, offset));
  const prefix = prefixMatch?.[0] ?? '';
  const start = offset - prefix.length;
  const range = rangeFromOffsets(source, start, offset);
  const items = new Map<string, FlintCompletion>();
  // skipcq: JS-D1001
  const add = (item: Omit<FlintCompletion, 'range'>): void => {
    if (!item.label.startsWith(prefix)) return;
    items.set(item.label, { ...item, range });
  };
  const beforeCursor = source.slice(0, offset);
  const inCss = isInsideCss(source, offset);
  if (inCss) {
    const cssPrefix = /[A-Za-z-]*$/u.exec(beforeCursor)?.[0] ?? '';
    const cssStart = offset - cssPrefix.length;
    const cssRange = rangeFromOffsets(source, cssStart, offset);
    const currentLine = beforeCursor.slice(
      Math.max(beforeCursor.lastIndexOf('\n'), beforeCursor.lastIndexOf('\r')) + 1,
    );
    const inValue = currentLine.lastIndexOf(':') > currentLine.lastIndexOf(';');
    for (const property of cssProperties) add({ label: property, kind: 'value', detail: 'CSS property' });
    if (inValue) {
      for (const value of cssValues) {
        if (!value.startsWith(cssPrefix)) continue;
        items.set(value, { label: value, kind: 'value', detail: 'CSS value', range: cssRange });
      }
    }
    for (const className of cssClassNames(source.slice(0, offset))) {
      if (!className.startsWith(cssPrefix)) continue;
      items.set(className, { label: className, kind: 'value', detail: 'CSS class selector', range: cssRange });
    }
  }
  const classMapMember = /styles(?:\s*\[\s*["'][^"']+["']\s*\])+\s*\[\s*["']?([A-Za-z_-]*)$/u.exec(beforeCursor);
  if (classMapMember !== null) {
    const memberPrefix = classMapMember[1] ?? '';
    const memberRange = rangeFromOffsets(source, offset - memberPrefix.length, offset);
    for (const className of cssClassNames(source)) {
      if (!className.startsWith(memberPrefix)) continue;
      items.set(className, {
        label: className,
        kind: 'value',
        detail: 'nested CSS class-map member',
        range: memberRange,
      });
    }
  }
  if (isInsideHtml(source, offset)) {
    for (const tag of htmlTags) add({ label: tag, kind: 'keyword', detail: 'HTML tag' });
    if (/<[A-Za-z][\w:-]*\s+[A-Za-z-]*$/u.test(beforeCursor.slice(beforeCursor.lastIndexOf('<')))) {
      for (const attribute of htmlAttributes) add({ label: attribute, kind: 'value', detail: 'HTML attribute' });
    }
  }
  for (const keyword of keywords) add({ label: keyword, kind: 'keyword', detail: 'Flint keyword' });
  for (const type of primitiveTypes) add({ label: type, kind: 'type', detail: 'Flint v1 primitive type' });
  for (const type of outcomeTypes) add({ label: type, kind: 'type', detail: 'Flint v1 generic outcome type' });
  for (const declaration of FLINT_STRING_FUNCTIONS)
    add({
      label: declaration.name,
      kind: 'function',
      detail: callableDetail(declaration.name, declaration.parameters, declaration.result),
    });
  for (const declaration of FLINT_REGEX_FUNCTIONS)
    add({
      label: declaration.name,
      kind: 'function',
      detail: callableDetail(declaration.name, declaration.parameters, declaration.result),
    });
  for (const declaration of metaFunctions)
    add({
      label: declaration.name,
      kind: 'function',
      detail: callableDetail(declaration.name, declaration.parameters, declaration.result),
    });
  for (const symbol of visibleSymbols(symbols, offset)) {
    if (symbol.name === 'any' || symbol.name === 'unknown') continue;
    const kind =
      symbol.kind === 'function'
        ? 'function'
        : symbol.kind === 'capability'
          ? 'capability'
          : symbol.kind === 'type'
            ? 'type'
            : 'declaration';
    add({ label: symbol.name, kind, detail: symbol.detail, documentation: symbol.callable?.documentation });
  }
  const capabilityNames = new Set([
    ...(options.capabilityNames ?? []),
    ...(options.requestedCapabilities ?? []),
    ...(options.capabilitySignatures?.keys() ?? []),
  ]);
  for (const capability of capabilityNames) {
    const signature = options.capabilitySignatures?.get(capability);
    add({
      label: capability,
      kind: 'capability',
      detail:
        signature === undefined
          ? 'workspace capability'
          : `capability (${signature.parameters.join(', ')}): ${signature.result}`,
      documentation: signature?.documentation,
    });
  }
  if (classMapMember !== null) {
    const memberPrefix = classMapMember[1] ?? '';
    const memberRange = rangeFromOffsets(source, offset - memberPrefix.length, offset);
    for (const className of cssClassNames(source)) {
      if (!className.startsWith(memberPrefix)) continue;
      items.set(className, {
        label: className,
        kind: 'value',
        detail: 'nested CSS class-map member',
        range: memberRange,
      });
    }
  }
  return [...items.values()].toSorted((left, right) => left.label.localeCompare(right.label));
}

function isInsideCss(source: string, offset: number): boolean {
  const before = source.slice(0, offset);
  const marker = Math.max(before.lastIndexOf('css!'), before.lastIndexOf('<style>'));
  if (marker < 0) return false;
  const open = source.indexOf('{', marker);
  if (open < 0 || open >= offset) return false;
  let depth = 0;
  for (const character of source.slice(open, offset)) {
    if (character === '{') depth += 1;
    if (character === '}') depth -= 1;
  }
  return depth > 0;
}

function isInsideHtml(source: string, offset: number): boolean {
  const before = source.slice(0, offset);
  const marker = Math.max(before.lastIndexOf('html!'), before.lastIndexOf('<template>'));
  if (marker < 0) return false;
  const open = before.lastIndexOf('<');
  const close = before.lastIndexOf('>');
  if (open <= Math.max(close, marker)) return false;
  return /^<\/?[A-Za-z]?[\w:-]*\s*[A-Za-z-]*$/u.test(before.slice(open));
}

function cssClassNames(source: string): readonly string[] {
  return [...source.matchAll(/\.([A-Za-z_][\w-]*)/gu)]
    .map((match) => match[1])
    .filter((name): name is string => name !== undefined);
}

/** Formats parameter signatures and return types into a callable detail string. */
function callableDetail(name: string, parameters: readonly string[], result: string): string {
  return `${name}(${parameters.join(', ')}): ${result}`;
}

/** Filters symbols visible at the requested offset based on declaration spans. */
function visibleSymbols(symbols: readonly FlintSymbol[], offset: number): readonly FlintSymbol[] {
  const functionAtCursor = symbols.find(
    (symbol) =>
      symbol.kind === 'function' &&
      symbol.scopeRange !== undefined &&
      symbol.scopeRange.startOffset <= offset &&
      symbol.scopeRange.endOffset >= offset,
  )?.name;

  // skipcq: JS-D1001, JS-R1005
  const isInScope = (symbol: FlintSymbol): boolean => {
    if (symbol.kind !== 'local' && symbol.kind !== 'parameter' && symbol.kind !== 'type') return true;
    if (symbol.scopeRange === undefined) return true;
    return symbol.scopeRange.startOffset <= offset && symbol.scopeRange.endOffset >= offset;
  };

  return symbols.filter(
    // skipcq: JS-R1005
    (symbol) =>
      isInScope(symbol) &&
      ((symbol.kind !== 'local' && symbol.kind !== 'parameter' && symbol.kind !== 'type') ||
        symbol.range.startOffset <= offset) &&
      (symbol.containerName === undefined ||
        symbol.containerName === functionAtCursor ||
        (symbol.kind !== 'local' && symbol.kind !== 'parameter' && symbol.kind !== 'type')),
  );
}
