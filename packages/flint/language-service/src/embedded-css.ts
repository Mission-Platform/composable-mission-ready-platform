import { parseFlint } from '@mission-platform/flint-parser';

import { offsetAtPosition, positionAtOffset, rangeFromOffsets } from './positions.js';

import type { FlintCompletion, FlintDocument, FlintHover, FlintLanguageDiagnostic, FlintTextEdit } from './types.js';

/** Stable virtual CSS document extracted from a component style region. */
export interface FlintEmbeddedCssDocument {
  readonly uri: string;
  readonly version: number;
  readonly text: string;
  /** UTF-16 offset of the virtual document's first character in the source. */
  readonly sourceStart: number;
}

const CSS_PROPERTIES = [
  'align-items',
  'background',
  'background-color',
  'border',
  'border-radius',
  'color',
  'display',
  'flex',
  'flex-direction',
  'flex-wrap',
  'font-family',
  'font-size',
  'font-weight',
  'gap',
  'grid-template-columns',
  'height',
  'justify-content',
  'line-height',
  'margin',
  'max-width',
  'min-height',
  'opacity',
  'padding',
  'position',
  'text-align',
  'text-decoration',
  'transform',
  'width',
  'z-index',
] as const;

const CSS_VALUES = [
  'auto',
  'block',
  'center',
  'column',
  'flex',
  'grid',
  'hidden',
  'inherit',
  'inline-flex',
  'none',
  'relative',
  'row',
  'space-between',
  'transparent',
] as const;

/** Extracts the parser-owned style region as a stable virtual CSS document. */
export function extractEmbeddedCss(document: FlintDocument): FlintEmbeddedCssDocument | undefined {
  const parsed = parseFlint(document.text, document.fileName ?? document.uri);
  const region = parsed.component?.regions.find(({ region: kind }) => kind === 'style');
  if (region === undefined) return undefined;
  return {
    uri: `${document.uri}#style`,
    version: document.version,
    text: region.content,
    sourceStart: region.contentSpan.start,
  };
}

/** Returns the style document when a source position belongs to its content. */
export function isEmbeddedCssPosition(
  document: FlintDocument,
  position: { readonly line: number; readonly character: number },
): FlintEmbeddedCssDocument | undefined {
  const css = extractEmbeddedCss(document);
  if (css === undefined) return undefined;
  const sourceOffset = offsetAtPosition(document.text, position);
  return sourceOffset >= css.sourceStart && sourceOffset <= css.sourceStart + css.text.length ? css : undefined;
}

function localWordRange(
  css: FlintEmbeddedCssDocument,
  localOffset: number,
): { readonly start: number; readonly end: number } {
  const before = css.text.slice(0, localOffset);
  const after = css.text.slice(localOffset);
  const start = localOffset - (/[\w-]+$/u.exec(before)?.[0].length ?? 0);
  const end = localOffset + (/^[\w-]+/u.exec(after)?.[0].length ?? 0);
  return { start, end };
}

function isDeclarationContext(css: FlintEmbeddedCssDocument, localOffset: number): boolean {
  const before = css.text.slice(0, localOffset);
  const lastOpen = before.lastIndexOf('{');
  const lastClose = before.lastIndexOf('}');
  if (lastOpen <= lastClose) return false;
  const declarationText = before.slice(lastOpen + 1);
  return declarationText.lastIndexOf(':') <= declarationText.lastIndexOf(';');
}

/** Provides CSS property/value completions mapped to the original Flint document. */
export function completeEmbeddedCss(
  document: FlintDocument,
  position: { readonly line: number; readonly character: number },
): readonly FlintCompletion[] {
  const css = isEmbeddedCssPosition(document, position);
  if (css === undefined) return [];
  const sourceOffset = offsetAtPosition(document.text, position);
  const localOffset = sourceOffset - css.sourceStart;
  const word = localWordRange(css, localOffset);
  const prefix = css.text.slice(word.start, localOffset).toLowerCase();
  const declarationContext = isDeclarationContext(css, localOffset);
  const labels = declarationContext ? CSS_PROPERTIES : CSS_VALUES;
  return labels
    .filter((label) => label.startsWith(prefix))
    .map((label) => ({
      label,
      kind: declarationContext ? 'keyword' : 'value',
      detail: 'CSS',
      range: rangeFromOffsets(document.text, css.sourceStart + word.start, css.sourceStart + word.end),
    }));
}

/** Provides concise CSS property/value hover documentation in source coordinates. */
export function hoverEmbeddedCss(
  document: FlintDocument,
  position: { readonly line: number; readonly character: number },
): FlintHover | undefined {
  const css = isEmbeddedCssPosition(document, position);
  if (css === undefined) return undefined;
  const sourceOffset = offsetAtPosition(document.text, position);
  const localOffset = sourceOffset - css.sourceStart;
  const word = localWordRange(css, localOffset);
  const value = css.text.slice(word.start, word.end);
  const isProperty = CSS_PROPERTIES.includes(value as (typeof CSS_PROPERTIES)[number]);
  const isValue = CSS_VALUES.includes(value as (typeof CSS_VALUES)[number]);
  if (value.length === 0 || (!isProperty && !isValue && !value.startsWith('--'))) return undefined;
  return {
    range: rangeFromOffsets(document.text, css.sourceStart + word.start, css.sourceStart + word.end),
    contents: [isProperty ? `CSS property: ${value}` : `CSS value: ${value}`],
  };
}

function sourceSpanFor(document: FlintDocument, start: number, end: number) {
  const range = rangeFromOffsets(document.text, start, end);
  return {
    start,
    end,
    line: range.start.line + 1,
    column: range.start.character + 1,
    endLine: range.end.line + 1,
    endColumn: range.end.character + 1,
  };
}

/** Reports unmatched CSS braces while retaining original document coordinates. */
export function diagnoseEmbeddedCss(document: FlintDocument): readonly FlintLanguageDiagnostic[] {
  const css = extractEmbeddedCss(document);
  if (css === undefined) return [];
  const diagnostics: FlintLanguageDiagnostic[] = [];
  const stack: number[] = [];
  for (let index = 0; index < css.text.length; index += 1) {
    if (css.text[index] === '{') stack.push(index);
    if (css.text[index] === '}') {
      const localStart = stack.pop();
      if (localStart === undefined) {
        const start = css.sourceStart + index;
        diagnostics.push({
          code: 'CSS-001',
          severity: 'error',
          phase: 'parse',
          message: 'Unexpected closing brace in CSS.',
          fileName: document.fileName ?? document.uri,
          sourceSpan: sourceSpanFor(document, start, start + 1),
          range: rangeFromOffsets(document.text, start, start + 1),
        });
      }
    }
  }
  for (const localStart of stack) {
    const start = css.sourceStart + localStart;
    diagnostics.push({
      code: 'CSS-001',
      severity: 'error',
      phase: 'parse',
      message: 'Unclosed brace in CSS.',
      fileName: document.fileName ?? document.uri,
      sourceSpan: sourceSpanFor(document, start, start + 1),
      range: rangeFromOffsets(document.text, start, start + 1),
    });
  }
  return diagnostics;
}

/** Maps an edit returned by a CSS provider from virtual CSS to source coordinates. */
export function mapEmbeddedCssEdit(
  document: FlintDocument,
  edit: { readonly range: { readonly start: number; readonly end: number }; readonly newText: string },
): FlintTextEdit | undefined {
  const css = extractEmbeddedCss(document);
  if (css === undefined || edit.range.start < 0 || edit.range.end > css.text.length) return undefined;
  return {
    range: rangeFromOffsets(document.text, css.sourceStart + edit.range.start, css.sourceStart + edit.range.end),
    newText: edit.newText,
  };
}

/** Converts a virtual CSS offset to an original source position. */
export function embeddedCssPositionAt(document: FlintDocument, localOffset: number) {
  const css = extractEmbeddedCss(document);
  return css === undefined ? undefined : positionAtOffset(document.text, css.sourceStart + localOffset);
}
