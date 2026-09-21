import { FLINT_REGEX_FUNCTIONS, FLINT_STRING_FUNCTIONS, primitiveTypes } from '@mission-platform/flint';

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
  while (start > 0 && /[A-Za-z0-9_]/u.test(source[start - 1] ?? '')) start -= 1;
  let end = bounded;
  while (end < source.length && /[A-Za-z0-9_]/u.test(source[end] ?? '')) end += 1;
  if (start === end || !/[A-Za-z_]/u.test(source[start] ?? '')) return undefined;
  return { text: source.slice(start, end), start, end };
}
