import { primitiveTypes } from '@mission-platform/flint-parser';
import { FLINT_REGEX_FUNCTIONS, FLINT_STRING_FUNCTIONS } from '@mission-platform/flint-types';

import { containsOffset, offsetAtPosition, rangeFromOffsets } from './positions.js';

import type { FlintCallable, FlintHover, FlintPosition, FlintSymbol, FlintWorkspaceOptions } from './types.js';

/**
 * Computes hover documentation for the token under the cursor.
 *
 * @param document - Target document.
 * @param position - Cursor position.
 * @param symbols - Visible document symbols.
 * @returns Hover documentation or undefined.
 */
// skipcq: JS-R1005
export function hoverFlint(
  source: string,
  position: FlintPosition,
  symbols: readonly FlintSymbol[],
  options: FlintWorkspaceOptions,
): FlintHover | undefined {
  const offset = offsetAtPosition(source, position);
  const token = identifierAt(source, offset);
  if (token === undefined) return undefined;
  const cssProperty = cssPropertyAt(source, token.start);
  if (cssProperty !== undefined) {
    return {
      range: rangeFromOffsets(source, token.start, token.end),
      contents: [`CSS property ${cssProperty}: compile-time companion style declaration.`],
    };
  }
  const cssSelector = cssSelectorAt(source, token.end);
  if (cssSelector !== undefined) {
    return {
      range: rangeFromOffsets(source, token.start, token.end),
      contents: [`CSS class selector .${cssSelector}: local CSS-module class.`],
    };
  }
  if (cssClassMapMemberAt(source, token.end) !== undefined) {
    return {
      range: rangeFromOffsets(source, token.start, token.end),
      contents: [`CSS module class-map member ${token.text}.`],
    };
  }
  const htmlContext = htmlTokenContext(source, token.start);
  if (htmlContext !== undefined) {
    return {
      range: rangeFromOffsets(source, token.start, token.end),
      contents: [htmlContext.kind === 'tag' ? `HTML element <${token.text}>.` : `HTML attribute ${token.text}.`],
    };
  }
  const direct = symbols
    .filter((symbol) => containsOffset(symbol.range, offset) && symbol.name === token.text)
    .toSorted((left, right) => left.range.endOffset - right.range.endOffset)[0];
  if (direct !== undefined)
    return {
      range: rangeFromOffsets(source, token.start, token.end),
      contents: callableContents(direct.detail, direct.callable),
    };
  const local = symbols
    .filter(
      // skipcq: JS-R1005
      (symbol) =>
        (symbol.kind === 'local' || symbol.kind === 'parameter') &&
        symbol.name === token.text &&
        symbol.range.startOffset <= offset &&
        (symbol.scopeRange === undefined || containsOffset(symbol.scopeRange, offset)) &&
        symbol.containerName !== undefined,
    )
    .toSorted((left, right) => right.range.startOffset - left.range.startOffset)[0];
  if (local !== undefined) return { range: rangeFromOffsets(source, token.start, token.end), contents: [local.detail] };
  const callableSymbol = symbols.find(
    (symbol) => (symbol.kind === 'function' || symbol.kind === 'capability') && symbol.name === token.text,
  );
  const callable = callableSymbol?.callable;
  if (callable !== undefined)
    return {
      range: rangeFromOffsets(source, token.start, token.end),
      contents: callableContents(`${token.text}(${callable.parameters.join(', ')}): ${callable.result}`, callable),
    };
  if (
    primitiveTypes.has(token.text as never) ||
    ['Iterable', 'Iterator', 'Option', 'Result', 'iterResult'].includes(token.text)
  )
    return {
      range: rangeFromOffsets(source, token.start, token.end),
      contents: [
        primitiveTypes.has(token.text as never)
          ? `primitive type ${token.text}`
          : `generic type ${token.text}${token.text === 'iterResult' ? '<T, E>' : '<T>'}`,
      ],
    };
  const signature = options.capabilitySignatures?.get(token.text);
  if (signature !== undefined)
    return {
      range: rangeFromOffsets(source, token.start, token.end),
      contents: callableContents(
        `capability ${token.text}(${signature.parameters.join(', ')}): ${signature.result}`,
        signature,
      ),
    };
  const metaDocs: Record<string, string> = {
    size_of: 'size_of<T>(): u32 - Compile-time byte size of type T on target ABI.',
    align_of: 'align_of<T>(): u32 - Compile-time byte alignment of type T on target ABI.',
    offset_of: 'offset_of<T>(field: string): u32 - Compile-time byte offset of a named field in type T.',
    fields_of: 'fields_of<T>(): FieldInfo[] - List of field metadata for aggregate type T.',
    type_info: 'type_info<T>(): TypeInfo - Complete type layout and field introspection descriptor.',
    comptime: 'comptime { ... } - Compile-time constant expression or static assertion block.',
    derive: 'derive MacroName(...) - Declares a custom derive macro transformation.',
    macro: 'macro MacroName(...) - Declares a hygienic procedural/declarative AST macro.',
  };
  if (metaDocs[token.text] !== undefined) {
    return {
      range: rangeFromOffsets(source, token.start, token.end),
      contents: [metaDocs[token.text]!],
    };
  }

  const standardLibrary = FLINT_STRING_FUNCTIONS.find((declaration) => declaration.name === token.text);
  const regexStandardLibrary = FLINT_REGEX_FUNCTIONS.find((declaration) => declaration.name === token.text);
  const standardLibraryDeclaration = standardLibrary ?? regexStandardLibrary;
  if (standardLibraryDeclaration !== undefined)
    return {
      range: rangeFromOffsets(source, token.start, token.end),
      contents: [
        `${standardLibraryDeclaration.name}(${standardLibraryDeclaration.parameters.join(', ')}): ${standardLibraryDeclaration.result}`,
      ],
    };
  return undefined;
}

function cssPropertyAt(source: string, offset: number): string | undefined {
  const before = source.slice(0, offset);
  if (!isInsideCss(source, offset)) return undefined;
  const lineStart = Math.max(before.lastIndexOf('{'), before.lastIndexOf(';'));
  const colon = source.indexOf(':', offset);
  const nextOpen = source.indexOf('{', offset);
  return colon >= offset && (nextOpen < 0 || colon < nextOpen) && (lineStart < 0 || lineStart < offset)
    ? source.slice(offset, colon).trim()
    : undefined;
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

function cssSelectorAt(source: string, offset: number): string | undefined {
  if (!isInsideCss(source, offset)) return undefined;
  const before = source.slice(0, offset);
  const match = /\.([A-Za-z_][\w-]*)$/u.exec(before);
  return match?.[1];
}

function cssClassMapMemberAt(source: string, offset: number): string | undefined {
  const before = source.slice(0, offset);
  const access = /styles(?:\s*\[\s*["'][^"']+["']\s*\])+\s*\[\s*["']([A-Za-z_][\w-]*)$/u.exec(before);
  return access?.[1];
}

function htmlTokenContext(source: string, offset: number): { readonly kind: 'tag' | 'attribute' } | undefined {
  const before = source.slice(0, offset);
  const open = before.lastIndexOf('<');
  if (open <= before.lastIndexOf('>')) return undefined;
  const fragment = before.slice(open);
  if (/^<\/?[A-Za-z][\w:-]*$/u.test(fragment)) return { kind: 'tag' };
  if (/^<[A-Za-z][\w:-]*\s+[A-Za-z-]*$/u.test(fragment)) return { kind: 'attribute' };
  return undefined;
}

/** Formats Markdown documentation contents for a callable symbol. */
function callableContents(detail: string, callable: FlintCallable | undefined): readonly string[] {
  return callable?.documentation === undefined ? [detail] : [detail, callable.documentation];
}

/** Extracts the identifier token at the given character offset. */
// skipcq: JS-R1005
function identifierAt(
  source: string,
  offset: number,
): { readonly text: string; readonly start: number; readonly end: number } | undefined {
  const bounded = Math.min(offset, source.length);
  let start = bounded;
  while (start > 0 && /[A-Za-z0-9_-]/u.test(source[start - 1] ?? '')) start -= 1;
  let end = bounded;
  while (end < source.length && /[A-Za-z0-9_-]/u.test(source[end] ?? '')) end += 1;
  if (start === end || !/[A-Za-z_]/u.test(source[start] ?? '')) return undefined;
  return { text: source.slice(start, end), start, end };
}
