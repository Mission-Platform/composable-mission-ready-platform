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
  for (let x = Math.floor(minX / 24) * 24; x <= Math.ceil(maxX / 24) * 24; x += 24) {
    if (x % 120 !== 0) {
      ctx.moveTo(x, minY);
      ctx.lineTo(x, maxY);
    }
  }
  for (let y = Math.floor(minY / 24) * 24; y <= Math.ceil(maxY / 24) * 24; y += 24) {
    if (y % 120 !== 0) {
      ctx.moveTo(minX, y);
      ctx.lineTo(maxX, y);
    }
  }
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
    if (bounds.minX < gMinX) gMinX = bounds.minX;
    if (bounds.maxX > gMaxX) gMaxX = bounds.maxX;
    if (bounds.minY < gMinY) gMinY = bounds.minY;
    if (bounds.maxY > gMaxY) gMaxY = bounds.maxY;
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
  ctx.save();
  const defaultBorder: [number, number, number, number] = isDark ? [0.35, 0.65, 1, 1] : [0.035, 0.412, 0.855, 1];
  const parsedColor = parseColorToRgba(group.color, defaultBorder);
  const groupBg =
    group.backgroundColor ??
    `rgba(${Math.round(parsedColor[0] * 255)}, ${Math.round(parsedColor[1] * 255)}, ${Math.round(parsedColor[2] * 255)}, ${isDark ? 0.12 : 0.08})`;
  const groupBorder =
    group.color ??
    `rgba(${Math.round(parsedColor[0] * 255)}, ${Math.round(parsedColor[1] * 255)}, ${Math.round(parsedColor[2] * 255)}, ${isDark ? 0.7 : 0.6})`;
  ctx.fillStyle = groupBg;
  ctx.strokeStyle = groupBorder;
  ctx.lineWidth = (isSelectedGroup ? 3.5 : 2) / zoomVal;
  if (isSelectedGroup) {
    ctx.shadowColor = groupBorder;
    ctx.shadowBlur = 12;
  }
  ctx.setLineDash(isSelectedGroup ? [] : [8, 4]);
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(gx, gy, gw, gh, 12);
  } else {
    ctx.rect(gx, gy, gw, gh);
  }
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = groupBorder;
  ctx.font = 'bold 12px "Comfortaa", -apple-system, sans-serif';
  const labelW = ctx.measureText(group.title).width;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(gx + 10, gy + 4, labelW + 16, 20, 4);
  } else {
    ctx.rect(gx + 10, gy + 4, labelW + 16, 20);
  }
  ctx.fill();
  if (isSelectedGroup) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 / zoomVal;
    ctx.stroke();
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillText(group.title, gx + 18, gy + 18);
  ctx.restore();
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
    if (box.gx + box.gw < minX || box.gx > maxX || box.gy + box.gh < minY || box.gy > maxY) {
      continue;
    }
    render2dSingleGroup(state, ctx, group, box, zoomVal, isDark);
  }
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
  const hasWaypoints = edge.points && edge.points.length > 0;
  if (hasWaypoints && edge.points) {
    for (let i = 0; i < edge.points.length; i++) {
      const pt = edge.points[i];
      if (pt) {
        const prev = i === 0 ? { x: p0x, y: p0y } : edge.points[i - 1];
        if (prev) {
          const midX = (prev.x + pt.x) / 2;
          ctx.bezierCurveTo(midX, prev.y, midX, pt.y, pt.x, pt.y);
        }
      }
    }
    const lastPt = edge.points.at(-1);
    if (lastPt) {
      const midX = (lastPt.x + p3x) / 2;
      ctx.bezierCurveTo(midX, lastPt.y, midX, p3y, p3x, p3y);
    }
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

/**
 * Computes 2D canvas edge stroke styling.
 */
function get2dEdgeStyle(isSelected: boolean, isPulseActive: boolean, isDark: boolean, zoomVal: number): C2dEdgeStyle {
  if (isSelected) {
    return {
      strokeStyle: isDark ? '#79c0ff' : '#0969da',
      lineWidth: 4.5 / zoomVal,
      shadowColor: isDark ? 'rgba(88, 166, 255, 0.9)' : 'rgba(9, 105, 218, 0.7)',
      shadowBlur: 10,
    };
  }
  if (isPulseActive) {
    return {
      strokeStyle: isDark ? '#3fb950' : '#1a7f37',
      lineWidth: 4 / zoomVal,
      shadowColor: isDark ? 'rgba(63, 185, 80, 0.9)' : 'rgba(26, 127, 55, 0.7)',
      shadowBlur: 10,
    };
  }
  return {
    strokeStyle: isDark ? '#58a6ff' : '#0550ae',
    lineWidth: 3.2 / zoomVal,
    shadowColor: isDark ? 'rgba(88, 166, 255, 0.35)' : 'rgba(9, 105, 218, 0.25)',
    shadowBlur: 4,
  };
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
    for (const pt of edge.points) {
      ctx.fillStyle = isSelected ? '#58a6ff' : '#ffffff';
      ctx.strokeStyle = isDark ? '#0d1117' : '#30363d';
      ctx.lineWidth = 2 / zoomVal;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6 / zoomVal, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  const arrowX = edge.points && edge.points.length > 0 ? (edge.points[0]?.x ?? (p0x + p3x) / 2) : (p0x + p3x) / 2;
  const arrowY = edge.points && edge.points.length > 0 ? (edge.points[0]?.y ?? (p0y + p3y) / 2) : (p0y + p3y) / 2;
  ctx.fillStyle = isSelected ? '#ffffff' : isDark ? '#79c0ff' : '#0969da';
  ctx.beginPath();
  ctx.moveTo(arrowX - 4 / zoomVal, arrowY - 4 / zoomVal);
  ctx.lineTo(arrowX + 4 / zoomVal, arrowY);
  ctx.lineTo(arrowX - 4 / zoomVal, arrowY + 4 / zoomVal);
  ctx.fill();
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

    const fromPortIndex = Math.max(
      0,
      (fromNode.outputs ?? []).findIndex((p) => p.id === edge.fromPortId),
    );
    const toPortIndex = Math.max(
      0,
      (toNode.inputs ?? []).findIndex((p) => p.id === edge.toPortId),
    );

    const p0x = fromNode.position.x + NODE_WIDTH;
    const p0y = fromNode.position.y + NODE_HEADER_HEIGHT + fromPortIndex * PORT_ROW_HEIGHT + 14;
    const p3x = toNode.position.x;
    const p3y = toNode.position.y + NODE_HEADER_HEIGHT + toPortIndex * PORT_ROW_HEIGHT + 14;

    if (
      Math.max(p0x, p3x) < minX ||
      Math.min(p0x, p3x) > maxX ||
      Math.max(p0y, p3y) < minY ||
      Math.min(p0y, p3y) > maxY
    ) {
      continue;
    }

    const dx = wasmEngine.bezier_control_dx(Math.round(p0x), Math.round(p3x));
    const p1x = p0x + dx;
    const p1y = p0y;
    const p2x = p3x - dx;
    const p2y = p3y;

    const pulseOffset = state.edgePulses.get(edge.id);
    const isPulseActive = pulseOffset !== undefined;
    const isSelected = state.selectedEdgeIds.has(edge.id);

    render2dEdgeCurve(ctx, edge, p0x, p0y, p3x, p3y, p1x, p1y, p2x, p2y, zoomVal, isDark, isSelected, isPulseActive);

    if (isPulseActive && pulseOffset !== undefined) {
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
    ctx.restore();
  }
}

/**
 * Computes origin coordinates for connecting edge cable.
 */
function get2dConnectingEdgeSource(fromNode: FlintGraphNode, fromPortId?: string): { p0x: number; p0y: number } {
  const outIdx = (fromNode.outputs ?? []).findIndex((p) => p.id === fromPortId);
  const inIdx = (fromNode.inputs ?? []).findIndex((p) => p.id === fromPortId);
  if (outIdx !== -1) {
    return {
      p0x: fromNode.position.x + NODE_WIDTH,
      p0y: fromNode.position.y + NODE_HEADER_HEIGHT + outIdx * PORT_ROW_HEIGHT + 14,
    };
  }
  if (inIdx !== -1) {
    return {
      p0x: fromNode.position.x,
      p0y: fromNode.position.y + NODE_HEADER_HEIGHT + inIdx * PORT_ROW_HEIGHT + 14,
    };
  }
  return {
    p0x: fromNode.position.x + NODE_WIDTH,
    p0y: fromNode.position.y + NODE_HEADER_HEIGHT + 14,
  };
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

  const tInIdx = (targetNode.inputs ?? []).findIndex((p) => p.id === hoveredPort.portId);
  if (tInIdx !== -1) {
    return {
      p3x: targetNode.position.x,
      p3y: targetNode.position.y + NODE_HEADER_HEIGHT + tInIdx * PORT_ROW_HEIGHT + 14,
      isSnapped: true,
    };
  }
  const tOutIdx = (targetNode.outputs ?? []).findIndex((p) => p.id === hoveredPort.portId);
  if (tOutIdx !== -1) {
    return {
      p3x: targetNode.position.x + NODE_WIDTH,
      p3y: targetNode.position.y + NODE_HEADER_HEIGHT + tOutIdx * PORT_ROW_HEIGHT + 14,
      isSnapped: true,
    };
  }
  return { p3x: cursor.x, p3y: cursor.y, isSnapped: false };
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

    ctx.save();
    ctx.fillStyle = isDark ? '#161b22' : '#f0f2f5';
    ctx.strokeStyle = portColor;
    ctx.lineWidth = (isHovered ? 2.5 : 1.5) / zoomVal;
    ctx.beginPath();
    ctx.arc(x, portY, 5 / zoomVal, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isHovered ? '#ffffff' : portColor;
    ctx.beginPath();
    ctx.arc(x, portY, 2.5 / zoomVal, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

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

    ctx.save();
    ctx.fillStyle = isDark ? '#161b22' : '#f0f2f5';
    ctx.strokeStyle = portColor;
    ctx.lineWidth = (isHovered ? 2.5 : 1.5) / zoomVal;
    ctx.beginPath();
    ctx.arc(x + nodeWidth, portY, 5 / zoomVal, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isHovered ? '#ffffff' : portColor;
    ctx.beginPath();
    ctx.arc(x + nodeWidth, portY, 2.5 / zoomVal, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

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

function getC2dNodeHeaderBg(isTrapped: boolean, isActive: boolean, isMeta: boolean, isDark: boolean): string {
  const table = isDark ? C2D_HEADER_BG_DARK : C2D_HEADER_BG_LIGHT;
  if (isTrapped) return table.trapped;
  if (isActive) return table.active;
  if (isMeta) return table.meta;
  return table.default;
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
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, nodeWidth, NODE_HEADER_HEIGHT, [8, 8, 0, 0]);
  } else {
    ctx.rect(x, y, nodeWidth, NODE_HEADER_HEIGHT);
  }
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

  ctx.fillStyle = isDark ? '#f0f6fc' : '#1f2328';
  ctx.font = 'bold 12px "Comfortaa", -apple-system, sans-serif';
  ctx.fillText(node.title, x + 10, y + 17);

  ctx.fillStyle = isMeta ? (isDark ? '#58a6ff' : '#0969da') : isDark ? '#8b949e' : '#57606a';
  ctx.font = '10px "Datatype", monospace';
  const catText = isMeta
    ? `META (${node.metaSubgraph?.nodes.length ?? 0})`
    : (node.category || 'OPERATION').toUpperCase();
  const catWidth = ctx.measureText(catText).width;
  ctx.fillText(catText, x + nodeWidth - catWidth - 10, y + 17);

  ctx.fillStyle = isDark ? '#8b949e' : '#57606a';
  ctx.font = '9px "Datatype", monospace';
  ctx.fillText(node.operation, x + 10, y + 28);
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
  if (isTrapped) {
    ctx.shadowColor = isDark ? '#f85149' : '#cf222e';
    ctx.shadowBlur = 14;
  } else if (isActive) {
    ctx.shadowColor = isDark ? '#3fb950' : '#1a7f37';
    ctx.shadowBlur = 14;
  } else if (isSelected) {
    ctx.shadowColor = isDark ? '#58a6ff' : '#0969da';
    ctx.shadowBlur = 10;
  }

  ctx.fillStyle = isDark ? (isMeta ? '#161e2e' : '#21262d') : isMeta ? '#f0f4f8' : '#ffffff';
  const nodeStroke = computeC2dNodeStroke(isSelected ? 1 : 0, isActive ? 1 : 0, isTrapped ? 1 : 0, isDark);
  ctx.strokeStyle = nodeStroke.strokeStyle;
  ctx.lineWidth = (isTrapped || isActive ? 2.5 : isSelected ? 2 : 1) / zoomVal;

  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, nodeWidth, nodeHeight, 8);
  } else {
    ctx.rect(x, y, nodeWidth, nodeHeight);
  }
  ctx.fill();
  ctx.stroke();

  render2dNodeHeader(ctx, node, x, y, nodeWidth, zoomVal, isDark, isTrapped, isActive, isMeta);
  render2dNodePins(state, ctx, node, x, y, nodeWidth, zoomVal, isDark);

  if (node.properties && Object.keys(node.properties).length > 0) {
    const propKeys = Object.keys(node.properties);
    const firstVal = String(node.properties[propKeys[0]]);
    ctx.fillStyle = isDark ? '#58a6ff' : '#0969da';
    ctx.font = '10px "Datatype", monospace';
    ctx.fillText(`= ${firstVal}`, x + 10, y + nodeHeight - 8);
  }

  ctx.restore();
}

/**
 * Renders the complete node graph using the 2D canvas context and native Flint geometry projections.
 */
export function render2dFrame(state: RenderWorkerState): void {
  if (!state.canvas2dCtx || !state.wasm) return;
  const ctx = state.canvas2dCtx;
  const isDark = state.currentTheme !== 'light';
  const t0 = typeof performance === 'undefined' ? 0 : performance.now();
  ctx.save();
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  ctx.fillStyle = isDark ? '#0b1219' : '#f5f6f8';
  ctx.fillRect(0, 0, state.width, state.height);

  ctx.translate(state.width / 2, state.height / 2);
  const zoomVal = state.wasm.get_camera_zoom();
  const camX = state.wasm.get_camera_x();
  const camY = state.wasm.get_camera_y();
  ctx.scale(zoomVal, zoomVal);
  ctx.translate(-camX, -camY);

  state.wasm.getViewportBounds(100);
  const minX = state.wasm.get_bounds_min_x();
  const minY = state.wasm.get_bounds_min_y();
  const maxX = state.wasm.get_bounds_max_x();
  const maxY = state.wasm.get_bounds_max_y();

  render2dGridPass(ctx, minX, minY, maxX, maxY, zoomVal, isDark);
  render2dGroupPass(state, ctx, minX, minY, maxX, maxY, zoomVal, isDark);

  const nodeMap = new Map<string, FlintGraphNode>(state.nodes.map((n) => [n.id, n]));
  render2dEdgePass(state, ctx, minX, minY, maxX, maxY, zoomVal, isDark, nodeMap, state.wasm);
  render2dConnectingEdgePass(state, ctx, zoomVal, isDark, nodeMap);

  for (const node of state.nodes) {
    const bounds = getNodeBounds(node);
    const nodeWidth = bounds.maxX - bounds.minX;
    const nodeHeight = bounds.maxY - bounds.minY;
    const x = bounds.minX;
    const y = bounds.minY;

    if (x + nodeWidth < minX || x > maxX || y + nodeHeight < minY || y > maxY) continue;
    render2dSingleNode(state, ctx, node, zoomVal, isDark);
  }

  ctx.restore();

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
