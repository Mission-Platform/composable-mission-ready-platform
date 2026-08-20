import type { ForgeWebScriptPosition, ForgeWebScriptRange } from './types.js';
import type { ForgeWebScriptSourceSpan } from '@mission-platform/forge-web-script';

export function positionAtOffset(source: string, offset: number): ForgeWebScriptPosition {
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

export function offsetAtPosition(source: string, position: ForgeWebScriptPosition): number {
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

export function rangeFromSpan(source: string, span: ForgeWebScriptSourceSpan): ForgeWebScriptRange {
  return {
    start: positionAtOffset(source, span.start),
    end: positionAtOffset(source, span.end),
    startOffset: span.start,
    endOffset: span.end,
  };
}

export function rangeFromOffsets(source: string, start: number, end: number): ForgeWebScriptRange {
  return {
    start: positionAtOffset(source, start),
    end: positionAtOffset(source, end),
    startOffset: start,
    endOffset: end,
  };
}

export function containsOffset(range: ForgeWebScriptRange, offset: number): boolean {
  return range.startOffset <= offset && offset <= range.endOffset;
}
