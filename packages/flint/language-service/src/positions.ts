import type { FlintPosition, FlintRange } from './types.js';
import type { FlintSourceSpan } from '@mission-platform/flint';

/** Converts a 0-based character offset into line and character coordinates. */
export function positionAtOffset(source: string, offset: number): FlintPosition {
  const boundedOffset = Math.max(0, Math.min(offset, source.length));
  let line = 0;
  let lineStart = 0;
  for (let index = 0; index < boundedOffset; index += 1) {
    if (source[index] === '\n') {
      line += 1;
      lineStart = index + 1;
    }
  }
  return { line, character: boundedOffset - lineStart };
}

/** Converts line and character coordinates into a 0-based character offset. */
// skipcq: JS-R1005
export function offsetAtPosition(source: string, position: FlintPosition): number {
  const wantedLine = Math.max(0, position.line);
  const wantedCharacter = Math.max(0, position.character);
  let line = 0;
  let lineStart = 0;
  for (let index = 0; index < source.length && line < wantedLine; index += 1) {
    if (source[index] === '\n') {
      line += 1;
      lineStart = index + 1;
    }
  }
  if (line < wantedLine) return source.length;
  const nextLine = source.indexOf('\n', lineStart);
  const lineEnd = nextLine === -1 ? source.length : nextLine;
  return Math.min(lineStart + wantedCharacter, lineEnd);
}

/** Converts a 1-based FlintSourceSpan into a 0-based FlintRange. */
export function rangeFromSpan(source: string, span: FlintSourceSpan): FlintRange {
  return {
    start: positionAtOffset(source, span.start),
    end: positionAtOffset(source, span.end),
    startOffset: span.start,
    endOffset: span.end,
  };
}

/** Constructs a FlintRange from start and end character offsets. */
export function rangeFromOffsets(source: string, start: number, end: number): FlintRange {
  return {
    start: positionAtOffset(source, start),
    end: positionAtOffset(source, end),
    startOffset: start,
    endOffset: end,
  };
}

/**
 * Evaluates whether an offset falls within a range.
 *
 * @param range - Target range.
 * @param offset - Character offset.
 * @returns True if offset is within range boundaries.
 */
export function containsOffset(range: FlintRange, offset: number): boolean {
  return range.startOffset <= offset && offset <= range.endOffset;
}
