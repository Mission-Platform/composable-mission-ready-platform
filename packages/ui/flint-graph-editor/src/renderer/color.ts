import {
  C2D_NODE_STROKE_DARK,
  C2D_NODE_STROKE_LIGHT,
  C2D_PIN_FILL_DARK,
  C2D_PIN_FILL_LIGHT,
  CATEGORY_RGBA_DARK,
  CATEGORY_RGBA_LIGHT,
  GL_NODE_BORDER_DARK,
  GL_NODE_BORDER_LIGHT,
  GPU_EDGE_STYLES_DARK,
  GPU_EDGE_STYLES_LIGHT,
  GPU_NODE_STYLES_DARK,
  GPU_NODE_STYLES_LIGHT,
  GPU_PIN_STYLES_DARK,
  GPU_PIN_STYLES_LIGHT,
  PORT_TYPE_RGBA_DARK,
  PORT_TYPE_RGBA_LIGHT,
} from './constants';

const DEFAULT_CATEGORY_DARK: [number, number, number, number] = [0.545, 0.58, 0.62, 1];
const DEFAULT_CATEGORY_LIGHT: [number, number, number, number] = [0.341, 0.376, 0.416, 1];

/**
 * Resolves node status key from integer flags.
 */
function resolveNodeStatusKey(isTrapped: number, isActive: number, isSelected: number): string {
  if (isTrapped) return 'trapped';
  if (isActive) return 'active';
  if (isSelected) return 'selected';
  return 'default';
}

/**
 * Resolves node category key or meta category default.
 */
function resolveCategoryKey(category?: string, isMeta?: boolean): string {
  if (isMeta) return 'math';
  return category ?? '';
}

/**
 * Maps a graph node category to an RGBA color tuple adapted to light or dark themes.
 */
export function getCategoryRgba(category?: string, isMeta?: boolean, isDark = true): [number, number, number, number] {
  const table = isDark ? CATEGORY_RGBA_DARK : CATEGORY_RGBA_LIGHT;
  const key = resolveCategoryKey(category, isMeta);
  const color = table[key];
  if (color) return [...color];
  return isDark ? DEFAULT_CATEGORY_DARK : DEFAULT_CATEGORY_LIGHT;
}

/**
 * Maps a port data type to an RGBA color tuple adapted to light or dark themes.
 */
export function getPortTypeRgba(type?: string | unknown, isDark = true): [number, number, number, number] {
  const table = isDark ? PORT_TYPE_RGBA_DARK : PORT_TYPE_RGBA_LIGHT;
  const typeStr = typeof type === 'string' ? type : '';
  const color = table[typeStr];
  return color ? [...color] : isDark ? [0.788, 0.82, 0.851, 1] : [0.141, 0.161, 0.184, 1];
}

/**
 * Expands short 3-hex and 6-hex strings to full 8-hex representations.
 */
export function expandShortHex(hex: string): string {
  if (hex.length === 3) {
    return `${[...hex].map((c) => `${c}${c}`).join('')}ff`;
  }
  if (hex.length === 6) {
    return `${hex}ff`;
  }
  return hex;
}

/**
 * Parses hexadecimal color strings (#rgb, #rrggbb, #rrggbbaa) into normalized RGBA tuples.
 */
export function parseHexColor(hexStr: string): [number, number, number, number] | undefined {
  const hex = expandShortHex(hexStr.slice(1));
  if (!/^[\da-f]{8}$/i.test(hex)) return undefined;
  return [
    Number.parseInt(hex.slice(0, 2), 16) / 255,
    Number.parseInt(hex.slice(2, 4), 16) / 255,
    Number.parseInt(hex.slice(4, 6), 16) / 255,
    Number.parseInt(hex.slice(6, 8), 16) / 255,
  ];
}

/**
 * Extracts and normalizes channel numbers from regular expression match.
 */
function parseRgbChannelsFromMatch(match: RegExpMatchArray): [number, number, number, number] {
  const [_, r = '0', g = '0', b = '0', a = '1'] = match;
  return [
    Number.parseInt(r, 10) / 255,
    Number.parseInt(g, 10) / 255,
    Number.parseInt(b, 10) / 255,
    Number.parseFloat(a),
  ];
}

/**
 * Parses functional rgb() and rgba() color strings into normalized RGBA tuples.
 */
export function parseRgbColor(rgbStr: string): [number, number, number, number] | undefined {
  const match = rgbStr.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (!match) return undefined;
  return parseRgbChannelsFromMatch(match);
}

/**
 * Parses arbitrary CSS color hex, rgb, or rgba strings to normalized 0..1 RGBA float tuples.
 */
export function parseColorToRgba(
  colorStr?: string,
  defaultRgba: [number, number, number, number] = [0.35, 0.65, 1, 1],
): [number, number, number, number] {
  const str = colorStr?.trim();
  const parsed = str ? (str.startsWith('#') ? parseHexColor(str) : parseRgbColor(str)) : undefined;
  return parsed ?? defaultRgba;
}

const GPU_FILL_DARK = { r: 0.14, g: 0.16, b: 0.22, a: 0.95 };
const GPU_FILL_LIGHT = { r: 1, g: 1, b: 1, a: 0.98 };

/**
 * Computes WebGPU node instance fill and border styling tuples.
 */
export function computeWebGpuNodeGlowAndBorder(
  isSelected: number,
  isActive: number,
  isTrapped: number,
  isDark: boolean,
) {
  const table = isDark ? GPU_NODE_STYLES_DARK : GPU_NODE_STYLES_LIGHT;
  const key = resolveNodeStatusKey(isTrapped, isActive, isSelected);
  const nodeStyle = table[key] ?? table.default;
  const fill = isDark ? GPU_FILL_DARK : GPU_FILL_LIGHT;

  return {
    glowR: nodeStyle.glow[0],
    glowG: nodeStyle.glow[1],
    glowB: nodeStyle.glow[2],
    glowA: nodeStyle.glow[3],
    fillR: fill.r,
    fillG: fill.g,
    fillB: fill.b,
    fillA: fill.a,
    borderR: nodeStyle.border[0],
    borderG: nodeStyle.border[1],
    borderB: nodeStyle.border[2],
    borderA: nodeStyle.border[3],
    borderWidth: nodeStyle.width,
  };
}

/**
 * Computes WebGPU edge instance color channels and cable stroke width.
 */
export function computeWebGpuEdgeColorAndWidth(isSelected: number, isActive: number, isDark: boolean) {
  const table = isDark ? GPU_EDGE_STYLES_DARK : GPU_EDGE_STYLES_LIGHT;
  const key = isSelected ? 'selected' : isActive ? 'active' : 'default';
  const edgeStyle = table[key] ?? table.default;
  return {
    colorR: edgeStyle.color[0],
    colorG: edgeStyle.color[1],
    colorB: edgeStyle.color[2],
    colorA: edgeStyle.color[3],
    widthVal: edgeStyle.width,
  };
}

/**
 * Computes WebGPU pin instance color and halo glow attributes.
 */
export function computeWebGpuPinColorAndWidth(isHovered: number, isActive: number, isDark: boolean) {
  const table = isDark ? GPU_PIN_STYLES_DARK : GPU_PIN_STYLES_LIGHT;
  const key = isHovered ? 'hovered' : isActive ? 'active' : 'default';
  const pinStyle = table[key] ?? table.default;
  return {
    fillR: pinStyle.fill[0],
    fillG: pinStyle.fill[1],
    fillB: pinStyle.fill[2],
    fillA: pinStyle.fill[3],
    borderR: pinStyle.border[0],
    borderG: pinStyle.border[1],
    borderB: pinStyle.border[2],
    borderA: pinStyle.border[3],
    borderWidth: pinStyle.borderWidth,
    glowR: pinStyle.glow[0],
    glowG: pinStyle.glow[1],
    glowB: pinStyle.glow[2],
    glowA: pinStyle.glow[3],
  };
}

/**
 * Computes WebGL node border RGB color channels.
 */
export function computeGlNodeBorder(isSelected: number, isActive: number, isTrapped: number, isDark: boolean) {
  const table = isDark ? GL_NODE_BORDER_DARK : GL_NODE_BORDER_LIGHT;
  const key = resolveNodeStatusKey(isTrapped, isActive, isSelected);
  const borderTuple = table[key] ?? table.default;
  return { br: borderTuple[0], bg: borderTuple[1], bb: borderTuple[2] };
}

/**
 * Computes 2D Canvas node stroke styling properties.
 */
export function computeC2dNodeStroke(isSelected: number, isActive: number, isTrapped: number, isDark: boolean) {
  const table = isDark ? C2D_NODE_STROKE_DARK : C2D_NODE_STROKE_LIGHT;
  const key = resolveNodeStatusKey(isTrapped, isActive, isSelected);
  return table[key] ?? table.default;
}

/**
 * Computes 2D Canvas pin circle fill color string.
 */
export function computeC2dPinFill(isHovered: number, isActive: number, isDark: boolean): string {
  const table = isDark ? C2D_PIN_FILL_DARK : C2D_PIN_FILL_LIGHT;
  const key = isHovered ? 'hovered' : isActive ? 'active' : 'default';
  return table[key] ?? table.default;
}
