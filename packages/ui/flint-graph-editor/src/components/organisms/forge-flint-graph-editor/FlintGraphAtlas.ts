export const GLYPH_CHARS_BY_IDX: readonly string[] = [
  ' ',
  '!',
  '"',
  '#',
  '$',
  '%',
  '&',
  "'",
  '(',
  ')',
  '*',
  '+',
  ',',
  '-',
  '.',
  '/',
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  ':',
  ';',
  '<',
  '=',
  '>',
  '?',
  '@',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
  '[',
  '\\',
  ']',
  '^',
  '_',
  '`',
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
  '{',
  '|',
  '}',
  '~',
  '←',
  '↑',
  '→',
  '↓',
  '↔',
  '↕',
  '↵',
  '⇐',
  '⇑',
  '⇒',
  '⇓',
  '⇔',
  '■',
  '□',
  '▲',
  '△',
  '▼',
  '▽',
  '◆',
  '◇',
  '○',
  '●',
  '★',
  '☆',
  '✓',
  '✗',
  '⚡',
  '©',
  '®',
  'µ',
  '²',
  '³',
  'α',
  'β',
  'γ',
  'δ',
  'λ',
  'μ',
  'π',
  'σ',
  'ω',
  'Δ',
  'Ω',
  'θ',
  'ä',
  'ö',
  'ü',
  'é',
  'è',
  'ê',
  'á',
  'í',
  'ó',
  'ú',
  'ñ',
  'ç',
  'ß',
];

export interface HoveredGlyphInfo {
  readonly index: number;
  readonly char: string;
  readonly codeHex: string;
  readonly codeDec: number;
  readonly advance: number;
  readonly vertAdvance: number;
  readonly width: number;
  readonly height: number;
  readonly horiBearingX: number;
  readonly horiBearingY: number;
  readonly rightBearing: number;
  readonly ascent: number;
  readonly descent: number;
  readonly linegap: number;
  readonly internalLeading: number;
  readonly externalLeading: number;
  readonly bboxMinX: number;
  readonly bboxMaxX: number;
  readonly bboxMinY: number;
  readonly bboxMaxY: number;
  readonly cellX: number;
  readonly cellY: number;
  readonly cellW: number;
  readonly cellH: number;
}

export function renderAtlasCrisp(rawBytes: Uint8ClampedArray, outData: Uint8ClampedArray, atlasSize: number): void {
  const pixelCount = atlasSize * atlasSize;
  for (let index = 0; index < pixelCount; index++) {
    const rawDist = rawBytes[index * 4] ?? 0;
    const alpha = rawDist > 128 ? 255 : 0;
    outData[index * 4] = 255;
    outData[index * 4 + 1] = 255;
    outData[index * 4 + 2] = 255;
    outData[index * 4 + 3] = alpha;
  }
}

export function renderAtlasRaw(rawBytes: Uint8ClampedArray, outData: Uint8ClampedArray, atlasSize: number): void {
  const pixelCount = atlasSize * atlasSize;
  for (let index = 0; index < pixelCount; index++) {
    const val = rawBytes[index * 4] ?? 0;
    outData[index * 4] = val;
    outData[index * 4 + 1] = val;
    outData[index * 4 + 2] = val;
    outData[index * 4 + 3] = 255;
  }
}

export function renderAtlasGrid(
  context: CanvasRenderingContext2D,
  table: Uint32Array,
  tableBase: number,
  highlightIndex?: number,
): void {
  context.strokeStyle = 'rgba(88, 166, 255, 0.4)';
  context.lineWidth = 1;

  for (let index = 0; index < GLYPH_CHARS_BY_IDX.length; index++) {
    const offset = tableBase + index * 8;
    const u0 = table[offset] ?? 0;
    const v0 = table[offset + 1] ?? 0;
    const u1 = table[offset + 2] ?? 0;
    const v1 = table[offset + 3] ?? 0;

    const cellX = u0;
    const cellY = v0;
    const cellW = u1 - u0;
    const cellH = v1 - v0;

    if (cellW > 0 && cellH > 0) {
      if (index === highlightIndex) {
        context.strokeStyle = '#f78166';
        context.fillStyle = 'rgba(247, 129, 102, 0.2)';
        context.fillRect(cellX, cellY, cellW, cellH);
        context.strokeRect(cellX, cellY, cellW, cellH);
        context.strokeStyle = 'rgba(88, 166, 255, 0.4)';
      } else {
        context.strokeRect(cellX, cellY, cellW, cellH);
      }
    }
  }
}

export function findSpriteSheetCellAtPoint(
  table: Uint32Array,
  tableBase: number,
  atlasX: number,
  atlasY: number,
): { foundIndex: number; foundX: number; foundY: number; foundW: number; foundH: number } | undefined {
  for (let index = 0; index < GLYPH_CHARS_BY_IDX.length; index++) {
    const offset = tableBase + index * 8;
    const u0 = table[offset] ?? 0;
    const v0 = table[offset + 1] ?? 0;
    const u1 = table[offset + 2] ?? 0;
    const v1 = table[offset + 3] ?? 0;

    const cellX = u0;
    const cellY = v0;
    const cellW = u1 - u0;
    const cellH = v1 - v0;

    if (atlasX >= cellX && atlasX <= cellX + cellW && atlasY >= cellY && atlasY <= cellY + cellH) {
      return { foundIndex: index, foundX: cellX, foundY: cellY, foundW: cellW, foundH: cellH };
    }
  }
  return undefined;
}

export function resolveGlyphDetails(
  index: number,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number,
): HoveredGlyphInfo {
  const char = GLYPH_CHARS_BY_IDX[index] ?? '?';
  const codeDec = char.codePointAt(0) ?? 0;
  const codeHex = `0x${codeDec.toString(16).toUpperCase().padStart(4, '0')}`;

  return {
    index,
    char,
    codeHex,
    codeDec,
    advance: cellW,
    vertAdvance: cellH,
    width: cellW,
    height: cellH,
    horiBearingX: 0,
    horiBearingY: cellH,
    rightBearing: 0,
    ascent: cellH,
    descent: 0,
    linegap: 2,
    internalLeading: 0,
    externalLeading: 0,
    bboxMinX: 0,
    bboxMaxX: cellW,
    bboxMinY: 0,
    bboxMaxY: cellH,
    cellX,
    cellY,
    cellW,
    cellH,
  };
}
