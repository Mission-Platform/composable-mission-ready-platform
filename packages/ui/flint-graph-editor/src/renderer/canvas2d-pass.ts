import { evaluateCubicBezier, getNodeBounds } from './camera';
import { computeC2dNodeStroke, computeC2dPinFill, getCategoryRgba, getPortTypeRgba, parseColorToRgba } from './color';
import { NODE_HEADER_HEIGHT, NODE_WIDTH, PORT_ROW_HEIGHT } from './constants';

import type { FlintRenderWorkerWasmExports } from './types';
import type { RenderWorkerState } from './worker-state';
import type { FlintGraphEdge, FlintGraphNode } from '@mission-platform/flint';

/**
 * Initializes standard 2D canvas context as a fallback rendering pipeline.
 */
export function init2dBackend(state: RenderWorkerState, targetCanvas: OffscreenCanvas | HTMLCanvasElement): boolean {
  try {
    const ctx = targetCanvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    if (ctx) {
      state.canvas2dCtx = ctx;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Renders minor grid vertical lines onto 2D canvas context.
 */
function render2dMinorVerticalGrid(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
): void {
  for (let x = Math.floor(minX / 24) * 24; x <= Math.ceil(maxX / 24) * 24; x += 24) {
    if (x % 120 !== 0) {
      ctx.moveTo(x, minY);
      ctx.lineTo(x, maxY);
    }
  }
}

/**
 * Renders minor grid horizontal lines onto 2D canvas context.
 */
function render2dMinorHorizontalGrid(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  minY: number,
  maxY: number,
  minX: number,
  maxX: number,
): void {
  for (let y = Math.floor(minY / 24) * 24; y <= Math.ceil(maxY / 24) * 24; y += 24) {
    if (y % 120 !== 0) {
      ctx.moveTo(minX, y);
      ctx.lineTo(maxX, y);
    }
  }
}

/**
 * Renders minor grid lines onto 2D canvas context.
 */
function render2dMinorGridLines(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  isDark: boolean,
): void {
  ctx.strokeStyle = isDark ? 'rgba(56, 64, 82, 0.25)' : 'rgba(140, 155, 175, 0.25)';
  ctx.beginPath();
  render2dMinorVerticalGrid(ctx, minX, maxX, minY, maxY);
  render2dMinorHorizontalGrid(ctx, minY, maxY, minX, maxX);
  ctx.stroke();
}

/**
 * Renders major grid lines onto 2D canvas context.
 */
function render2dMajorGridLines(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  isDark: boolean,
): void {
  ctx.strokeStyle = isDark ? 'rgba(89, 102, 128, 0.35)' : 'rgba(100, 120, 145, 0.45)';
  ctx.beginPath();
  for (let x = Math.floor(minX / 120) * 120; x <= Math.ceil(maxX / 120) * 120; x += 120) {
    ctx.moveTo(x, minY);
    ctx.lineTo(x, maxY);
  }
  for (let y = Math.floor(minY / 120) * 120; y <= Math.ceil(maxY / 120) * 120; y += 120) {
    ctx.moveTo(minX, y);
    ctx.lineTo(maxX, y);
  }
  ctx.stroke();
}

/**
 * Renders background grid lines onto the 2D canvas context.
 */
export function render2dGridPass(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  zoomVal: number,
  isDark: boolean,
): void {
  ctx.lineWidth = 1 / zoomVal;
  if (zoomVal > 0.4) {
    render2dMinorGridLines(ctx, minX, minY, maxX, maxY, isDark);
  }
  render2dMajorGridLines(ctx, minX, minY, maxX, maxY, isDark);
}

interface GroupBoundingBox2d {
  readonly gx: number;
  readonly gy: number;
  readonly gw: number;
  readonly gh: number;
}

/**
 * Computes bounding rectangle enclosing nodes inside a 2D group.
 */
function computeGroupBounds2d(groupNodes: readonly FlintGraphNode[]): GroupBoundingBox2d {
  let gMinX = Number.POSITIVE_INFINITY;
  let gMinY = Number.POSITIVE_INFINITY;
  let gMaxX = Number.NEGATIVE_INFINITY;
  let gMaxY = Number.NEGATIVE_INFINITY;

  for (const node of groupNodes) {
    const bounds = getNodeBounds(node);
    gMinX = Math.min(gMinX, bounds.minX);
    gMaxX = Math.max(gMaxX, bounds.maxX);
    gMinY = Math.min(gMinY, bounds.minY);
    gMaxY = Math.max(gMaxY, bounds.maxY);
  }

  const padding = 24;
  return {
    gx: gMinX - padding,
    gy: gMinY - padding - 22,
    gw: gMaxX - gMinX + padding * 2,
    gh: gMaxY - gMinY + padding * 2 + 22,
  };
}

/**
 * Helper to draw a rounded rectangle on 2D context.
 */
function draw2dRoundRect(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number | number[] = 0,
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.rect(x, y, w, h);
  }
}

/**
 * Computes theme-adaptive RGB string for 2D group.
 */
function get2dGroupRgbString(color?: string, isDark = true): string {
  const defaultBorder: [number, number, number, number] = isDark ? [0.35, 0.65, 1, 1] : [0.035, 0.412, 0.855, 1];
  const parsed = parseColorToRgba(color, defaultBorder);
  return `${Math.round(parsed[0] * 255)}, ${Math.round(parsed[1] * 255)}, ${Math.round(parsed[2] * 255)}`;
}

/**
 * Computes theme-adaptive background and border colors for 2D group.
 */
function get2dGroupColors(group: { color?: string; backgroundColor?: string }, isDark: boolean) {
  const rgb = get2dGroupRgbString(group.color, isDark);
  const bgAlpha = isDark ? 0.12 : 0.08;
  const borderAlpha = isDark ? 0.7 : 0.6;
  return {
    bg: group.backgroundColor ?? `rgba(${rgb}, ${bgAlpha})`,
    border: group.color ?? `rgba(${rgb}, ${borderAlpha})`,
  };
}

/**
 * Renders 2D group header title badge.
 */
function render2dGroupTitle(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  title: string,
  gx: number,
  gy: number,
  groupBorder: string,
  isSelected: boolean,
  zoomVal: number,
): void {
  ctx.fillStyle = groupBorder;
  ctx.font = 'bold 12px "Comfortaa", -apple-system, sans-serif';
  const labelW = ctx.measureText(title).width;
  draw2dRoundRect(ctx, gx + 10, gy + 4, labelW + 16, 20, 4);
  ctx.fill();
  if (isSelected) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 / zoomVal;
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillText(title, gx + 18, gy + 18);
}

/**
 * Renders an individual group bounding box and label on 2D canvas.
 */
function render2dSingleGroup(
  state: RenderWorkerState,
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  group: FlintGraphEdge extends never ? never : { id: string; title: string; color?: string; backgroundColor?: string },
  box: GroupBoundingBox2d,
  zoomVal: number,
  isDark: boolean,
): void {
  const isSelectedGroup = state.selectedGroupId === group.id;
  const { gx, gy, gw, gh } = box;
  const colors = get2dGroupColors(group, isDark);

  ctx.save();
  ctx.fillStyle = colors.bg;
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = (isSelectedGroup ? 3.5 : 2) / zoomVal;
  if (isSelectedGroup) {
    ctx.shadowColor = colors.border;
    ctx.shadowBlur = 12;
  }
  ctx.setLineDash(isSelectedGroup ? [] : [8, 4]);
  draw2dRoundRect(ctx, gx, gy, gw, gh, 12);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);

  render2dGroupTitle(ctx, group.title, gx, gy, colors.border, isSelectedGroup, zoomVal);
  ctx.restore();
}

/**
 * Determines whether bounding box lies completely outside current viewport.
 */
function isBoxOutsideViewport(
  box: GroupBoundingBox2d,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): boolean {
  if (box.gx + box.gw < minX || box.gx > maxX) return true;
  return box.gy + box.gh < minY || box.gy > maxY;
}

/**
 * Renders node group bounding boxes, titles, and borders on 2D canvas.
 */
export function render2dGroupPass(
  state: RenderWorkerState,
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  zoomVal: number,
  isDark: boolean,
): void {
  for (const group of state.groups) {
    const groupNodes = state.nodes.filter((node) => group.nodeIds.includes(node.id));
    if (groupNodes.length === 0) continue;
    const box = computeGroupBounds2d(groupNodes);
    if (isBoxOutsideViewport(box, minX, minY, maxX, maxY)) continue;
    render2dSingleGroup(state, ctx, group, box, zoomVal, isDark);
  }
}

/**
 * Traces a single waypoint curve segment.
 */
function trace2dWaypointSegment(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  prev: { x: number; y: number },
  pt: { x: number; y: number },
): void {
  const midX = (prev.x + pt.x) / 2;
  ctx.bezierCurveTo(midX, prev.y, midX, pt.y, pt.x, pt.y);
}

/**
 * Traces waypoint segments through quadratic/cubic Bezier links.
 */
function trace2dWaypoints(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  points: readonly { x: number; y: number }[],
  p0x: number,
  p0y: number,
  p3x: number,
  p3y: number,
): void {
  let prev = { x: p0x, y: p0y };
  for (const pt of points) {
    trace2dWaypointSegment(ctx, prev, pt);
    prev = pt;
  }
  trace2dWaypointSegment(ctx, prev, { x: p3x, y: p3y });
}

/**
 * Traces spline path through waypoints or cubic Bezier controls.
 */
function trace2dSplinePath(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  edge: FlintGraphEdge,
  p0x: number,
  p0y: number,
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  p3x: number,
  p3y: number,
): void {
  ctx.beginPath();
  ctx.moveTo(p0x, p0y);
  if (edge.points && edge.points.length > 0) {
    trace2dWaypoints(ctx, edge.points, p0x, p0y, p3x, p3y);
  } else {
    ctx.bezierCurveTo(p1x, p1y, p2x, p2y, p3x, p3y);
  }
  ctx.stroke();
}

interface C2dEdgeStyle {
  readonly strokeStyle: string;
  readonly lineWidth: number;
  readonly shadowColor: string;
  readonly shadowBlur: number;
}

const C2D_EDGE_SELECTED_DARK = {
  strokeStyle: '#79c0ff',
  shadowColor: 'rgba(88, 166, 255, 0.9)',
  widthMult: 4.5,
  shadowBlur: 10,
};
const C2D_EDGE_SELECTED_LIGHT = {
  strokeStyle: '#0969da',
  shadowColor: 'rgba(9, 105, 218, 0.7)',
  widthMult: 4.5,
  shadowBlur: 10,
};
const C2D_EDGE_PULSE_DARK = {
  strokeStyle: '#3fb950',
  shadowColor: 'rgba(63, 185, 80, 0.9)',
  widthMult: 4,
  shadowBlur: 10,
};
const C2D_EDGE_PULSE_LIGHT = {
  strokeStyle: '#1a7f37',
  shadowColor: 'rgba(26, 127, 55, 0.7)',
  widthMult: 4,
  shadowBlur: 10,
};
const C2D_EDGE_DEFAULT_DARK = {
  strokeStyle: '#58a6ff',
  shadowColor: 'rgba(88, 166, 255, 0.35)',
  widthMult: 3.2,
  shadowBlur: 4,
};
const C2D_EDGE_DEFAULT_LIGHT = {
  strokeStyle: '#0550ae',
  shadowColor: 'rgba(9, 105, 218, 0.25)',
  widthMult: 3.2,
  shadowBlur: 4,
};

const C2D_EDGE_TABLE_DARK = {
  selected: C2D_EDGE_SELECTED_DARK,
  pulse: C2D_EDGE_PULSE_DARK,
  default: C2D_EDGE_DEFAULT_DARK,
};

const C2D_EDGE_TABLE_LIGHT = {
  selected: C2D_EDGE_SELECTED_LIGHT,
  pulse: C2D_EDGE_PULSE_LIGHT,
  default: C2D_EDGE_DEFAULT_LIGHT,
};

/**
 * Resolves edge style key from selection and pulse states.
 */
function resolveEdgeStyleKey(isSelected: boolean, isPulseActive: boolean): 'selected' | 'pulse' | 'default' {
  if (isSelected) return 'selected';
  if (isPulseActive) return 'pulse';
  return 'default';
}

/**
 * Computes 2D canvas edge stroke styling.
 */
function get2dEdgeStyle(isSelected: boolean, isPulseActive: boolean, isDark: boolean, zoomVal: number): C2dEdgeStyle {
  const table = isDark ? C2D_EDGE_TABLE_DARK : C2D_EDGE_TABLE_LIGHT;
  const key = resolveEdgeStyleKey(isSelected, isPulseActive);
  const conf = table[key];
  return {
    strokeStyle: conf.strokeStyle,
    lineWidth: conf.widthMult / zoomVal,
    shadowColor: conf.shadowColor,
    shadowBlur: conf.shadowBlur,
  };
}

/**
 * Renders waypoint circles for multi-segment edges.
 */
function render2dWaypointDots(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  points: readonly { x: number; y: number }[],
  zoomVal: number,
  isSelected: boolean,
  isDark: boolean,
): void {
  for (const pt of points) {
    ctx.fillStyle = isSelected ? '#58a6ff' : '#ffffff';
    ctx.strokeStyle = isDark ? '#0d1117' : '#30363d';
    ctx.lineWidth = 2 / zoomVal;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 6 / zoomVal, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

/**
 * Renders direction indicator arrow on edge spline.
 */
function render2dEdgeArrow(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  arrowX: number,
  arrowY: number,
  zoomVal: number,
  isSelected: boolean,
  isDark: boolean,
): void {
  ctx.fillStyle = isSelected ? '#ffffff' : isDark ? '#79c0ff' : '#0969da';
  ctx.beginPath();
  ctx.moveTo(arrowX - 4 / zoomVal, arrowY - 4 / zoomVal);
  ctx.lineTo(arrowX + 4 / zoomVal, arrowY);
  ctx.lineTo(arrowX - 4 / zoomVal, arrowY + 4 / zoomVal);
  ctx.fill();
}

/**
 * Computes arrow position on edge curve.
 */
function resolveEdgeArrowPosition(
  edge: FlintGraphEdge,
  p0x: number,
  p0y: number,
  p3x: number,
  p3y: number,
): { arrowX: number; arrowY: number } {
  const firstPt = edge.points?.[0];
  if (firstPt) {
    return { arrowX: firstPt.x, arrowY: firstPt.y };
  }
  return { arrowX: (p0x + p3x) / 2, arrowY: (p0y + p3y) / 2 };
}

/**
 * Renders waypoint dots and direction indicator arrow.
 */
function render2dEdgeDecorations(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  edge: FlintGraphEdge,
  p0x: number,
  p0y: number,
  p3x: number,
  p3y: number,
  zoomVal: number,
  isSelected: boolean,
  isDark: boolean,
): void {
  ctx.fillStyle = isSelected ? '#79c0ff' : isDark ? '#58a6ff' : '#0969da';
  ctx.beginPath();
  ctx.arc(p0x, p0y, 4 / zoomVal, 0, Math.PI * 2);
  ctx.arc(p3x, p3y, 4 / zoomVal, 0, Math.PI * 2);
  ctx.fill();

  if (edge.points && edge.points.length > 0) {
    render2dWaypointDots(ctx, edge.points, zoomVal, isSelected, isDark);
  }

  const { arrowX, arrowY } = resolveEdgeArrowPosition(edge, p0x, p0y, p3x, p3y);
  render2dEdgeArrow(ctx, arrowX, arrowY, zoomVal, isSelected, isDark);
}

/**
 * Renders waypoints and spline curves for a single edge on 2D canvas.
 */
export function render2dEdgeCurve(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  edge: FlintGraphEdge,
  p0x: number,
  p0y: number,
  p3x: number,
  p3y: number,
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  zoomVal: number,
  isDark: boolean,
  isSelected: boolean,
  isPulseActive: boolean,
): void {
  ctx.save();
  ctx.strokeStyle = isDark ? 'rgba(5, 10, 15, 0.85)' : 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = (isSelected ? 6.5 : 5) / zoomVal;
  trace2dSplinePath(ctx, edge, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y);

  const style = get2dEdgeStyle(isSelected, isPulseActive, isDark, zoomVal);
  ctx.strokeStyle = style.strokeStyle;
  ctx.lineWidth = style.lineWidth;
  ctx.shadowColor = style.shadowColor;
  ctx.shadowBlur = style.shadowBlur;
  trace2dSplinePath(ctx, edge, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y);

  render2dEdgeDecorations(ctx, edge, p0x, p0y, p3x, p3y, zoomVal, isSelected, isDark);
}

/**
 * Renders pulse execution dot along 2D canvas cubic bezier curve.
 */
function render2dEdgePulse(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  p0x: number,
  p0y: number,
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  p3x: number,
  p3y: number,
  pulseOffset: number,
  zoomVal: number,
  isDark: boolean,
  wasmEngine: FlintRenderWorkerWasmExports,
): void {
  const pulseProgress = Math.max(0, Math.min(1, pulseOffset));
  const tPermille = Math.round(pulseProgress * 1000);
  const pulseX = wasmEngine.bezier_point_1d(
    Math.round(p0x),
    Math.round(p1x),
    Math.round(p2x),
    Math.round(p3x),
    tPermille,
  );
  const pulseY = wasmEngine.bezier_point_1d(
    Math.round(p0y),
    Math.round(p1y),
    Math.round(p2y),
    Math.round(p3y),
    tPermille,
  );
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = isDark ? '#58a6ff' : '#0969da';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(pulseX, pulseY, 6 / zoomVal, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Determines whether edge bounding endpoints lie completely outside viewport.
 */
function isEdgeOutsideViewport(
  p0x: number,
  p0y: number,
  p3x: number,
  p3y: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): boolean {
  if (Math.max(p0x, p3x) < minX || Math.min(p0x, p3x) > maxX) return true;
  return Math.max(p0y, p3y) < minY || Math.min(p0y, p3y) > maxY;
}

/**
 * Resolves source and target endpoint coordinates for an edge.
 */
function resolveEdgeEndpoints(
  fromNode: FlintGraphNode,
  toNode: FlintGraphNode,
  edge: FlintGraphEdge,
): { p0x: number; p0y: number; p3x: number; p3y: number } {
  const fromPortIndex = Math.max(
    0,
    (fromNode.outputs ?? []).findIndex((p) => p.id === edge.fromPortId),
  );
  const toPortIndex = Math.max(
    0,
    (toNode.inputs ?? []).findIndex((p) => p.id === edge.toPortId),
  );
  return {
    p0x: fromNode.position.x + NODE_WIDTH,
    p0y: fromNode.position.y + NODE_HEADER_HEIGHT + fromPortIndex * PORT_ROW_HEIGHT + 14,
    p3x: toNode.position.x,
    p3y: toNode.position.y + NODE_HEADER_HEIGHT + toPortIndex * PORT_ROW_HEIGHT + 14,
  };
}

/**
 * Renders edge connection cables and execution flow pulses on 2D canvas.
 */
export function render2dEdgePass(
  state: RenderWorkerState,
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  zoomVal: number,
  isDark: boolean,
  nodeMap: Map<string, FlintGraphNode>,
  wasmEngine: FlintRenderWorkerWasmExports,
): void {
  for (const edge of state.edges) {
    const fromNode = nodeMap.get(edge.fromNodeId);
    const toNode = nodeMap.get(edge.toNodeId);
    if (!fromNode || !toNode) continue;

    const { p0x, p0y, p3x, p3y } = resolveEdgeEndpoints(fromNode, toNode, edge);
    if (isEdgeOutsideViewport(p0x, p0y, p3x, p3y, minX, minY, maxX, maxY)) continue;

    const dx = wasmEngine.bezier_control_dx(Math.round(p0x), Math.round(p3x));
    const p1x = p0x + dx;
    const p1y = p0y;
    const p2x = p3x - dx;
    const p2y = p3y;

    const pulseOffset = state.edgePulses.get(edge.id);
    const isPulseActive = pulseOffset !== undefined;
    const isSelected = state.selectedEdgeIds.has(edge.id);

    render2dEdgeCurve(ctx, edge, p0x, p0y, p3x, p3y, p1x, p1y, p2x, p2y, zoomVal, isDark, isSelected, isPulseActive);

    if (pulseOffset !== undefined) {
      render2dEdgePulse(ctx, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, pulseOffset, zoomVal, isDark, wasmEngine);
    }
    ctx.restore();
  }
}

/**
 * Computes origin coordinates for connecting edge cable.
 */
function get2dConnectingEdgeSource(fromNode: FlintGraphNode, fromPortId?: string): { p0x: number; p0y: number } {
  const outIdx = (fromNode.outputs ?? []).findIndex((p) => p.id === fromPortId);
  if (outIdx !== -1) {
    return {
      p0x: fromNode.position.x + NODE_WIDTH,
      p0y: fromNode.position.y + NODE_HEADER_HEIGHT + outIdx * PORT_ROW_HEIGHT + 14,
    };
  }
  const inIdx = Math.max(
    0,
    (fromNode.inputs ?? []).findIndex((p) => p.id === fromPortId),
  );
  return {
    p0x: fromNode.position.x,
    p0y: fromNode.position.y + NODE_HEADER_HEIGHT + inIdx * PORT_ROW_HEIGHT + 14,
  };
}

/**
 * Resolves node port offset for in-flight connection target snapping.
 */
function resolveNodePortOffset(node: FlintGraphNode, portId: string): { x: number; y: number } | undefined {
  const inIndex = (node.inputs ?? []).findIndex((p) => p.id === portId);
  if (inIndex !== -1) {
    return {
      x: node.position.x,
      y: node.position.y + NODE_HEADER_HEIGHT + inIndex * PORT_ROW_HEIGHT + 14,
    };
  }
  const outIndex = (node.outputs ?? []).findIndex((p) => p.id === portId);
  if (outIndex !== -1) {
    return {
      x: node.position.x + NODE_WIDTH,
      y: node.position.y + NODE_HEADER_HEIGHT + outIndex * PORT_ROW_HEIGHT + 14,
    };
  }
  return undefined;
}

/**
 * Computes target coordinates and snap status for connecting edge cable.
 */
function get2dConnectingEdgeTarget(
  hoveredPort: { nodeId: string; portId: string } | undefined,
  nodeMap: Map<string, FlintGraphNode>,
  cursor: { x: number; y: number },
): { p3x: number; p3y: number; isSnapped: boolean } {
  if (!hoveredPort) return { p3x: cursor.x, p3y: cursor.y, isSnapped: false };
  const targetNode = nodeMap.get(hoveredPort.nodeId);
  if (!targetNode) return { p3x: cursor.x, p3y: cursor.y, isSnapped: false };

  const offset = resolveNodePortOffset(targetNode, hoveredPort.portId);
  if (offset) {
    return { p3x: offset.x, p3y: offset.y, isSnapped: true };
  }
  return { p3x: cursor.x, p3y: cursor.y, isSnapped: false };
}

/**
 * Renders in-flight cable Bezier curve with dashed styling.
 */
function render2dConnectingSpline(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  p0x: number,
  p0y: number,
  p3x: number,
  p3y: number,
  dx: number,
  isSnapped: boolean,
  isDark: boolean,
  zoomVal: number,
): void {
  ctx.strokeStyle = isSnapped
    ? 'rgba(63, 185, 80, 0.45)'
    : isDark
      ? 'rgba(88, 166, 255, 0.45)'
      : 'rgba(9, 105, 218, 0.35)';
  ctx.lineWidth = 6 / zoomVal;
  ctx.beginPath();
  ctx.moveTo(p0x, p0y);
  ctx.bezierCurveTo(p0x + dx, p0y, p3x - dx, p3y, p3x, p3y);
  ctx.stroke();

  ctx.strokeStyle = isSnapped ? '#3fb950' : isDark ? '#58a6ff' : '#0969da';
  ctx.lineWidth = 3.5 / zoomVal;
  ctx.setLineDash([8 / zoomVal, 4 / zoomVal]);
  ctx.beginPath();
  ctx.moveTo(p0x, p0y);
  ctx.bezierCurveTo(p0x + dx, p0y, p3x - dx, p3y, p3x, p3y);
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * Renders source and target endpoint circles for in-flight connecting cable.
 */
function renderConnectingEdgeEndpoints(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  p0x: number,
  p0y: number,
  p3x: number,
  p3y: number,
  isSnapped: boolean,
  isDark: boolean,
  zoomVal: number,
): void {
  ctx.fillStyle = isDark ? '#58a6ff' : '#0969da';
  ctx.beginPath();
  ctx.arc(p0x, p0y, 5 / zoomVal, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isSnapped ? '#3fb950' : isDark ? '#79c0ff' : '#218bff';
  ctx.beginPath();
  ctx.arc(p3x, p3y, (isSnapped ? 8 : 6) / zoomVal, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isDark ? '#ffffff' : '#0d1117';
  ctx.lineWidth = 2 / zoomVal;
  ctx.stroke();
}

/**
 * Renders interactive in-flight wire connection cable on 2D canvas.
 */
export function render2dConnectingEdgePass(
  state: RenderWorkerState,
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  zoomVal: number,
  isDark: boolean,
  nodeMap: Map<string, FlintGraphNode>,
): void {
  if (!state.connectingEdge) return;
  const fromNode = nodeMap.get(state.connectingEdge.fromNodeId);
  if (!fromNode) return;

  const { p0x, p0y } = get2dConnectingEdgeSource(fromNode, state.connectingEdge.fromPortId);
  const { p3x, p3y, isSnapped } = get2dConnectingEdgeTarget(state.hoveredPort, nodeMap, {
    x: state.connectingEdge.cursorX,
    y: state.connectingEdge.cursorY,
  });

  const dx = Math.max(Math.abs(p3x - p0x) * 0.5, 40);

  ctx.save();
  render2dConnectingSpline(ctx, p0x, p0y, p3x, p3y, dx, isSnapped, isDark, zoomVal);
  renderConnectingEdgeEndpoints(ctx, p0x, p0y, p3x, p3y, isSnapped, isDark, zoomVal);
  ctx.restore();
}

/**
 * Renders a single 2D port pin circle and halo.
 */
function render2dPinCircle(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  portColor: string,
  isHovered: boolean,
  isDark: boolean,
  zoomVal: number,
): void {
  ctx.save();
  ctx.fillStyle = isDark ? '#161b22' : '#f0f2f5';
  ctx.strokeStyle = portColor;
  ctx.lineWidth = (isHovered ? 2.5 : 1.5) / zoomVal;
  ctx.beginPath();
  ctx.arc(px, py, 5 / zoomVal, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isHovered ? '#ffffff' : portColor;
  ctx.beginPath();
  ctx.arc(px, py, 2.5 / zoomVal, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Renders input port pins and names for a 2D canvas node.
 */
function render2dInputPins(
  state: RenderWorkerState,
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: FlintGraphNode,
  x: number,
  y: number,
  zoomVal: number,
  isDark: boolean,
): void {
  for (const [idx, port] of (node.inputs ?? []).entries()) {
    const portY = y + NODE_HEADER_HEIGHT + idx * PORT_ROW_HEIGHT + 14;
    const isHovered = state.hoveredPort?.nodeId === node.id && state.hoveredPort.portId === port.id;
    const portRgb = getPortTypeRgba(port.type, isDark);
    const portColor = `rgba(${Math.round(portRgb[0] * 255)},${Math.round(portRgb[1] * 255)},${Math.round(portRgb[2] * 255)},${portRgb[3]})`;

    render2dPinCircle(ctx, x, portY, portColor, isHovered, isDark, zoomVal);
    ctx.fillStyle = isDark ? '#c9d1d9' : '#24292f';
    ctx.fillText(port.name, x + 12, portY + 4);
  }
}

/**
 * Renders output port pins and names for a 2D canvas node.
 */
function render2dOutputPins(
  state: RenderWorkerState,
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: FlintGraphNode,
  x: number,
  y: number,
  nodeWidth: number,
  zoomVal: number,
  isDark: boolean,
): void {
  for (const [idx, port] of (node.outputs ?? []).entries()) {
    const portY = y + NODE_HEADER_HEIGHT + idx * PORT_ROW_HEIGHT + 14;
    const isHovered = state.hoveredPort?.nodeId === node.id && state.hoveredPort.portId === port.id;
    const portRgb = getPortTypeRgba(port.type, isDark);
    const portColor = `rgba(${Math.round(portRgb[0] * 255)},${Math.round(portRgb[1] * 255)},${Math.round(portRgb[2] * 255)},${portRgb[3]})`;

    render2dPinCircle(ctx, x + nodeWidth, portY, portColor, isHovered, isDark, zoomVal);
    ctx.fillStyle = isDark ? '#c9d1d9' : '#24292f';
    const labelWidth = ctx.measureText(port.name).width;
    ctx.fillText(port.name, x + nodeWidth - labelWidth - 12, portY + 4);
  }
}

/**
 * Renders input and output port pins and labels for a single 2D node.
 */
export function render2dNodePins(
  state: RenderWorkerState,
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: FlintGraphNode,
  x: number,
  y: number,
  nodeWidth: number,
  zoomVal: number,
  isDark: boolean,
): void {
  ctx.font = '11px "Comfortaa", -apple-system, sans-serif';
  render2dInputPins(state, ctx, node, x, y, zoomVal, isDark);
  render2dOutputPins(state, ctx, node, x, y, nodeWidth, zoomVal, isDark);
}

const C2D_HEADER_BG_DARK: Readonly<Record<string, string>> = {
  trapped: '#3d1417',
  active: '#143d22',
  meta: '#0d2847',
  default: '#161b22',
};

const C2D_HEADER_BG_LIGHT: Readonly<Record<string, string>> = {
  trapped: '#fee2e2',
  active: '#dcfce7',
  meta: '#e1ecf7',
  default: '#f0f2f5',
};

/**
 * Resolves node header background color for 2D canvas based on execution and theme state.
 */
function getC2dNodeHeaderBg(isTrapped: boolean, isActive: boolean, isMeta: boolean, isDark: boolean): string {
  const table = isDark ? C2D_HEADER_BG_DARK : C2D_HEADER_BG_LIGHT;
  if (isTrapped) return table.trapped;
  if (isActive) return table.active;
  if (isMeta) return table.meta;
  return table.default;
}

/**
 * Resolves node category text label.
 */
function resolveNodeCategoryLabel(node: FlintGraphNode, isMeta: boolean): string {
  if (isMeta) {
    return `META (${node.metaSubgraph?.nodes.length ?? 0})`;
  }
  return (node.category || 'OPERATION').toUpperCase();
}

/**
 * Renders node title, category, and operation text labels.
 */
function render2dNodeHeaderLabels(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: FlintGraphNode,
  x: number,
  y: number,
  nodeWidth: number,
  isDark: boolean,
  isMeta: boolean,
): void {
  ctx.fillStyle = isDark ? '#f0f6fc' : '#1f2328';
  ctx.font = 'bold 12px "Comfortaa", -apple-system, sans-serif';
  ctx.fillText(node.title, x + 10, y + 17);

  ctx.fillStyle = isMeta ? (isDark ? '#58a6ff' : '#0969da') : isDark ? '#8b949e' : '#57606a';
  ctx.font = '10px "Datatype", monospace';
  const catText = resolveNodeCategoryLabel(node, isMeta);
  const catWidth = ctx.measureText(catText).width;
  ctx.fillText(catText, x + nodeWidth - catWidth - 10, y + 17);

  ctx.fillStyle = isDark ? '#8b949e' : '#57606a';
  ctx.font = '9px "Datatype", monospace';
  ctx.fillText(node.operation, x + 10, y + 28);
}

/**
 * Renders 2D canvas node header bar, category strip, and typography labels.
 */
function render2dNodeHeader(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: FlintGraphNode,
  x: number,
  y: number,
  nodeWidth: number,
  zoomVal: number,
  isDark: boolean,
  isTrapped: boolean,
  isActive: boolean,
  isMeta: boolean,
): void {
  draw2dRoundRect(ctx, x, y, nodeWidth, NODE_HEADER_HEIGHT, [8, 8, 0, 0]);
  ctx.fillStyle = getC2dNodeHeaderBg(isTrapped, isActive, isMeta, isDark);
  ctx.fill();

  const catColor = getCategoryRgba(node.category, isMeta, isDark);
  ctx.fillStyle = `rgba(${Math.round(catColor[0] * 255)},${Math.round(catColor[1] * 255)},${Math.round(catColor[2] * 255)},${catColor[3]})`;
  ctx.fillRect(x + 1, y + 1, nodeWidth - 2, 4);

  ctx.strokeStyle = isDark ? 'rgba(48, 54, 61, 0.8)' : 'rgba(208, 215, 222, 0.8)';
  ctx.lineWidth = 1 / zoomVal;
  ctx.beginPath();
  ctx.moveTo(x + 1, y + NODE_HEADER_HEIGHT);
  ctx.lineTo(x + nodeWidth - 1, y + NODE_HEADER_HEIGHT);
  ctx.stroke();

  render2dNodeHeaderLabels(ctx, node, x, y, nodeWidth, isDark, isMeta);
}

const C2D_SHADOW_DARK = {
  trapped: { color: '#f85149', blur: 14 },
  active: { color: '#3fb950', blur: 14 },
  selected: { color: '#58a6ff', blur: 10 },
};

const C2D_SHADOW_LIGHT = {
  trapped: { color: '#cf222e', blur: 14 },
  active: { color: '#1a7f37', blur: 14 },
  selected: { color: '#0969da', blur: 10 },
};

/**
 * Resolves node shadow state key.
 */
function resolveNodeShadowKey(
  isTrapped: boolean,
  isActive: boolean,
  isSelected: boolean,
): 'trapped' | 'active' | 'selected' | undefined {
  if (isTrapped) return 'trapped';
  if (isActive) return 'active';
  if (isSelected) return 'selected';
  return undefined;
}

/**
 * Sets up 2D canvas node box shadow based on selection and trace state.
 */
function apply2dNodeShadow(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  isTrapped: boolean,
  isActive: boolean,
  isSelected: boolean,
  isDark: boolean,
): void {
  const key = resolveNodeShadowKey(isTrapped, isActive, isSelected);
  if (!key) return;
  const table = isDark ? C2D_SHADOW_DARK : C2D_SHADOW_LIGHT;
  const config = table[key];
  ctx.shadowColor = config.color;
  ctx.shadowBlur = config.blur;
}

/**
 * Resolves 2D node card background fill color.
 */
function get2dNodeFill(isMeta: boolean, isDark: boolean): string {
  if (isDark) return isMeta ? '#161e2e' : '#21262d';
  return isMeta ? '#f0f4f8' : '#ffffff';
}

/**
 * Resolves 2D node stroke outline width.
 */
function get2dNodeStrokeWidth(isTrapped: boolean, isActive: boolean, isSelected: boolean): number {
  if (isTrapped || isActive) return 2.5;
  if (isSelected) return 2;
  return 1;
}

/**
 * Renders node property value preview string.
 */
function render2dNodeProperties(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: FlintGraphNode,
  x: number,
  y: number,
  nodeHeight: number,
  isDark: boolean,
): void {
  if (!node.properties) return;
  const propKeys = Object.keys(node.properties);
  if (propKeys.length === 0) return;
  const firstVal = String(node.properties[propKeys[0]]);
  ctx.fillStyle = isDark ? '#58a6ff' : '#0969da';
  ctx.font = '10px "Datatype", monospace';
  ctx.fillText(`= ${firstVal}`, x + 10, y + nodeHeight - 8);
}

/**
 * Renders an individual node card, header, categories, and port pins on 2D canvas.
 */
export function render2dSingleNode(
  state: RenderWorkerState,
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: FlintGraphNode,
  zoomVal: number,
  isDark: boolean,
): void {
  const bounds = getNodeBounds(node);
  const nodeWidth = bounds.maxX - bounds.minX;
  const nodeHeight = bounds.maxY - bounds.minY;
  const x = bounds.minX;
  const y = bounds.minY;

  const isSelected = state.selectedNodeIds.has(node.id);
  const isActive = state.activeNodeIds.has(node.id);
  const isTrapped = state.trappedNodeId === node.id;
  const isMeta = node.metaSubgraph !== undefined || node.operation === 'meta';

  ctx.save();
  apply2dNodeShadow(ctx, isTrapped, isActive, isSelected, isDark);

  ctx.fillStyle = get2dNodeFill(isMeta, isDark);
  const nodeStroke = computeC2dNodeStroke(isSelected ? 1 : 0, isActive ? 1 : 0, isTrapped ? 1 : 0, isDark);
  ctx.strokeStyle = nodeStroke.strokeStyle;
  ctx.lineWidth = get2dNodeStrokeWidth(isTrapped, isActive, isSelected) / zoomVal;

  draw2dRoundRect(ctx, x, y, nodeWidth, nodeHeight, 8);
  ctx.fill();
  ctx.stroke();

  render2dNodeHeader(ctx, node, x, y, nodeWidth, zoomVal, isDark, isTrapped, isActive, isMeta);
  render2dNodePins(state, ctx, node, x, y, nodeWidth, zoomVal, isDark);
  render2dNodeProperties(ctx, node, x, y, nodeHeight, isDark);

  ctx.restore();
}

/**
 * Determines whether node bounding box lies completely outside current viewport.
 */
function isNodeOutsideViewport(
  x: number,
  y: number,
  w: number,
  h: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): boolean {
  if (x + w < minX || x > maxX) return true;
  return y + h < minY || y > maxY;
}

/**
 * Renders nodes intersecting with the visible viewport bounds.
 */
function render2dVisibleNodes(
  state: RenderWorkerState,
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  zoomVal: number,
  isDark: boolean,
): void {
  for (const node of state.nodes) {
    const bounds = getNodeBounds(node);
    const nodeWidth = bounds.maxX - bounds.minX;
    const nodeHeight = bounds.maxY - bounds.minY;
    if (isNodeOutsideViewport(bounds.minX, bounds.minY, nodeWidth, nodeHeight, minX, minY, maxX, maxY)) continue;
    render2dSingleNode(state, ctx, node, zoomVal, isDark);
  }
}

/**
 * Configures canvas 2D matrix transformation for camera translation and zoom.
 */
function setup2dCameraTransform(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  state: RenderWorkerState,
  wasm: FlintRenderWorkerWasmExports,
  isDark: boolean,
): { minX: number; minY: number; maxX: number; maxY: number; zoomVal: number } {
  ctx.save();
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  ctx.fillStyle = isDark ? '#0b1219' : '#f5f6f8';
  ctx.fillRect(0, 0, state.width, state.height);

  ctx.translate(state.width / 2, state.height / 2);
  const zoomVal = wasm.get_camera_zoom();
  const camX = wasm.get_camera_x();
  const camY = wasm.get_camera_y();
  ctx.scale(zoomVal, zoomVal);
  ctx.translate(-camX, -camY);

  wasm.getViewportBounds(100);
  return {
    minX: wasm.get_bounds_min_x(),
    minY: wasm.get_bounds_min_y(),
    maxX: wasm.get_bounds_max_x(),
    maxY: wasm.get_bounds_max_y(),
    zoomVal,
  };
}

/**
 * Updates frame timing performance stats for 2D canvas backend.
 */
function record2dFrameStats(state: RenderWorkerState, t0: number): void {
  const tEnd = typeof performance === 'undefined' ? 0 : performance.now();
  const frameTime = t0 > 0 && tEnd > 0 ? tEnd - t0 : 1.7;
  state.performanceStats = {
    ...state.performanceStats,
    renderTimeMs: Math.round(frameTime * 100) / 100,
    totalFrameTimeMs: Math.round((frameTime + 0.5) * 100) / 100,
    visibleNodesCount: state.nodes.length,
    visibleEdgesCount: state.edges.length,
    visiblePinsCount: state.nodes.length * 4,
    isFallback: true,
    backend: 'canvas2d',
  };
}

/**
 * Renders the complete node graph using the 2D canvas context and native Flint geometry projections.
 */
export function render2dFrame(state: RenderWorkerState): void {
  if (!state.canvas2dCtx || !state.wasm) return;
  const ctx = state.canvas2dCtx;
  const isDark = state.currentTheme !== 'light';
  const t0 = typeof performance === 'undefined' ? 0 : performance.now();

  const bounds = setup2dCameraTransform(ctx, state, state.wasm, isDark);
  const { minX, minY, maxX, maxY, zoomVal } = bounds;

  render2dGridPass(ctx, minX, minY, maxX, maxY, zoomVal, isDark);
  render2dGroupPass(state, ctx, minX, minY, maxX, maxY, zoomVal, isDark);

  const nodeMap = new Map<string, FlintGraphNode>(state.nodes.map((n) => [n.id, n]));
  render2dEdgePass(state, ctx, minX, minY, maxX, maxY, zoomVal, isDark, nodeMap, state.wasm);
  render2dConnectingEdgePass(state, ctx, zoomVal, isDark, nodeMap);
  render2dVisibleNodes(state, ctx, minX, minY, maxX, maxY, zoomVal, isDark);

  ctx.restore();
  record2dFrameStats(state, t0);
}

/**
 * Computes 2D canvas edge stroke color string.
 */
export function getC2dEdgeColor(isSelected: number, isDark: boolean): string {
  if (isSelected) {
    return isDark ? '#58a6ff' : '#0969da';
  }
  return isDark ? 'rgba(139, 148, 158, 0.6)' : 'rgba(87, 96, 106, 0.6)';
}

/**
 * Renders pulse execution dot along 2D canvas cubic bezier curve.
 */
export function drawC2dPulseDot(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  p0x: number,
  p0y: number,
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  p3x: number,
  p3y: number,
  pulseOffsetPermille: number,
  isDark: boolean,
): void {
  const progressRatio = pulseOffsetPermille / 1000;
  const bezierX = evaluateCubicBezier(p0x, p1x, p2x, p3x, progressRatio);
  const bezierY = evaluateCubicBezier(p0y, p1y, p2y, p3y, progressRatio);
  ctx.fillStyle = isDark ? '#79c0ff' : '#0969da';
  ctx.beginPath();
  ctx.arc(bezierX, bezierY, 4, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Creates Canvas 2D WebAssembly host capabilities object.
 */
export function createCanvas2dCapabilities(state: RenderWorkerState): WebAssembly.Imports {
  return {
    'canvas2d.render_begin': {
      c2d_render_begin: (w: number, h: number, dprVal: number, camX: number, camY: number, zoomVal: number) => {
        if (!state.canvas2dCtx) return;
        const ctx = state.canvas2dCtx;
        const isDark = state.currentTheme !== 'light';
        ctx.save();
        ctx.setTransform(dprVal, 0, 0, dprVal, 0, 0);
        ctx.fillStyle = isDark ? '#0b1219' : '#f5f6f8';
        ctx.fillRect(0, 0, w, h);
        ctx.translate(w / 2, h / 2);
        ctx.scale(zoomVal, zoomVal);
        ctx.translate(-camX, -camY);
      },
    },
    'canvas2d.render_grid': {
      c2d_render_grid: (minX: number, minY: number, maxX: number, maxY: number, zoomVal: number) => {
        if (!state.canvas2dCtx) return;
        const isDark = state.currentTheme !== 'light';
        render2dGridPass(state.canvas2dCtx, minX, minY, maxX, maxY, zoomVal, isDark);
      },
    },
    'canvas2d.draw_edge': {
      c2d_draw_edge: (
        p0x: number,
        p0y: number,
        p1x: number,
        p1y: number,
        p2x: number,
        p2y: number,
        p3x: number,
        p3y: number,
        isSelected: number,
        isActive: number,
        pulseOffsetPermille: number,
      ) => {
        if (!state.canvas2dCtx) return;
        const ctx = state.canvas2dCtx;
        const isDark = state.currentTheme !== 'light';
        ctx.save();
        ctx.strokeStyle = getC2dEdgeColor(isSelected, isDark);
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(p0x, p0y);
        ctx.bezierCurveTo(p1x, p1y, p2x, p2y, p3x, p3y);
        ctx.stroke();

        if (isActive && pulseOffsetPermille > 0) {
          drawC2dPulseDot(ctx, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, pulseOffsetPermille, isDark);
        }
        ctx.restore();
      },
    },
    'canvas2d.draw_node': {
      c2d_draw_node: (
        x: number,
        y: number,
        w: number,
        h: number,
        isSelected: number,
        isActive: number,
        isTrapped: number,
      ) => {
        if (!state.canvas2dCtx) return;
        const ctx = state.canvas2dCtx;
        const isDark = state.currentTheme !== 'light';
        ctx.save();
        ctx.fillStyle = isDark ? '#21262d' : '#ffffff';
        const nodeStroke = computeC2dNodeStroke(isSelected, isActive, isTrapped, isDark);
        ctx.strokeStyle = nodeStroke.strokeStyle;
        ctx.lineWidth = nodeStroke.lineWidth;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, w, h, 8);
        } else {
          ctx.rect(x, y, w, h);
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      },
    },
    'canvas2d.draw_pin': {
      c2d_draw_pin: (x: number, y: number, radius: number, isHovered: number, isActive: number) => {
        if (!state.canvas2dCtx) return;
        const ctx = state.canvas2dCtx;
        const isDark = state.currentTheme !== 'light';
        ctx.save();
        ctx.fillStyle = computeC2dPinFill(isHovered, isActive, isDark);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      },
    },
    'canvas2d.render_end': {
      c2d_render_end: () => {
        if (!state.canvas2dCtx) return;
        state.canvas2dCtx.restore();
      },
    },
    'canvas2d.render_frame': {
      canvas2d_render_frame: () => {
        render2dFrame(state);
      },
    },
  };
}
