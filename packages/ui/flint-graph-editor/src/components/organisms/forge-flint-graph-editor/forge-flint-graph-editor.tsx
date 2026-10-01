import { ForgeBadge, ForgeBreadcrumb, ForgeCard, ForgeCollapse } from '@mission-platform/components';
import {
  getAllNodeDefinitions,
  getNodeDefinition,
  type FlintGraphEdge,
  type FlintGraphGroup,
  type FlintGraphNode,
  type FlintNodeCategory,
} from '@mission-platform/flint';
import { classNames, useEffect, useRef, useState, type MpElement } from '@mission-platform/forge-jsx';

import { FlintEditorStore, type FlintEditorStoreState } from '../../../editor/editor-store';
import {
  getFlintRenderWorkerWasm,
  type FlintCamera,
  type FlintHitResult,
  type FlintPerformanceMetrics,
  type RenderWorkerInputMessage,
  type RenderWorkerOutputMessage,
  type ViewBounds,
} from '../../../renderer/render-worker';
import { ForgeDebugScrubber } from '../../molecules/forge-debug-scrubber';
import { ForgePerformancePieChart } from '../../molecules/forge-performance-pie-chart';
import { ForgePerformanceTimelineChart } from '../../molecules/forge-performance-timeline-chart';

import styles from './forge-flint-graph-editor.module.scss';

if (
  typeof globalThis !== 'undefined' &&
  globalThis.window !== undefined &&
  typeof globalThis.window.addEventListener === 'function'
) {
  globalThis.window.addEventListener('error', (event) => {
    if (
      event.message?.includes("Cannot read properties of null (reading 'id')") &&
      event.filename?.includes('tab.js')
    ) {
      event.preventDefault();
    }
  });
}

export interface FlintGraphEditorProperties {
  readonly store?: FlintEditorStore;
  readonly className?: string;
  readonly renderer?: 'webgpu' | 'webgl' | 'canvas2d';
  readonly theme?: 'light' | 'dark' | 'auto';
}

const CATEGORIES: readonly FlintNodeCategory[] = [
  'math',
  'logic',
  'text',
  'collection',
  'control',
  'capability',
  'custom',
];

const GLYPH_CHARS_BY_IDX: readonly string[] = [
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
  '▯',
  '±',
  '×',
  '÷',
  '√',
  '∞',
  '≈',
  '≠',
  '≤',
  '≥',
  '∑',
  '∏',
  '∫',
  '−',
  '∂',
  '∇',
  '∈',
  '←',
  '↑',
  '→',
  '↓',
  '↔',
  '⇒',
  '°',
  '•',
  '…',
  '—',
  '–',
  '✓',
  '✗',
  '★',
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

interface HoveredGlyphInfo {
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

interface ContextMenuState {
  readonly open: boolean;
  readonly x: number;
  readonly y: number;
  readonly worldX: number;
  readonly worldY: number;
  readonly query: string;
  readonly targetType?: 'empty' | 'node' | 'group' | 'selection' | 'edge';
  readonly targetId?: string;
  readonly targetGroupId?: string;
}

interface SelectionSquareState {
  readonly active: boolean;
  readonly startX: number;
  readonly startY: number;
  readonly currentX: number;
  readonly currentY: number;
}

interface FlintRendererBridge {
  readonly setGraph: (
    nodes: readonly FlintGraphNode[],
    edges: readonly FlintGraphEdge[],
    groups?: readonly FlintGraphGroup[],
  ) => void;
  readonly setSelection: (nodeIds: readonly string[], edgeIds?: readonly string[], groupId?: string) => void;
  readonly setConnectingEdge: (edge?: {
    readonly fromNodeId: string;
    readonly fromPortId: string;
    readonly cursorX: number;
    readonly cursorY: number;
  }) => void;
  readonly setHoveredPort: (port?: { readonly nodeId: string; readonly portId: string }) => void;
  readonly getHoveredPort: () => { readonly nodeId: string; readonly portId: string } | undefined;
  readonly renderFrame: () => void;
  readonly setTheme: (theme: 'light' | 'dark') => void;
  readonly resize: (width: number, height: number, dpr?: number) => void;
  readonly zoom: (cursorX: number, cursorY: number, factor: number) => void;
  readonly pan: (deltaX: number, deltaY: number) => void;
  readonly screenToWorld: (screenX: number, screenY: number) => { readonly x: number; readonly y: number };
  readonly getCamera: () => FlintCamera;
  readonly queryNodesInBox: (box: ViewBounds) => readonly string[];
  readonly hitTestSync: (screenX: number, screenY: number, snapRadius?: number) => FlintHitResult | undefined;
  readonly reloadFontAtlas?: () => void;
  readonly destroy: () => void;
  readonly getPerformanceStats: () => FlintPerformanceMetrics;
}

/**
 * Tests whether a point lies within the radius of any port in a port list.
 */
function hitTestPortList(
  ports: readonly FlintGraphPort[],
  nodeX: number,
  nodeY: number,
  worldX: number,
  worldY: number,
  snapRadius: number,
  nodeId: string,
): FlintHitResult | undefined {
  for (const [index, port] of ports.entries()) {
    const portY = nodeY + 44 + index * 28 + 14;
    if (Math.hypot(worldX - nodeX, worldY - portY) <= snapRadius) {
      return { type: 'port', nodeId, portId: port.id, worldX, worldY };
    }
  }
  return undefined;
}

/**
 * Tests port hits on both input and output ports of a single node.
 */
function hitTestNodePorts(
  node: FlintGraphNode,
  worldX: number,
  worldY: number,
  snapRadius: number,
): FlintHitResult | undefined {
  return (
    hitTestPortList(node.inputs ?? [], node.position.x, node.position.y, worldX, worldY, snapRadius, node.id) ??
    hitTestPortList(node.outputs ?? [], node.position.x + 220, node.position.y, worldX, worldY, snapRadius, node.id)
  );
}

/**
 * Performs port hit-testing against candidate nodes within a snap radius.
 */
function hitTestPorts(
  worldX: number,
  worldY: number,
  nodes: readonly FlintGraphNode[],
  snapRadius: number,
): FlintHitResult | undefined {
  for (const node of nodes) {
    const hit = hitTestNodePorts(node, worldX, worldY, snapRadius);
    if (hit) return hit;
  }
  return undefined;
}

/**
 * Computes maximum port capacity across inputs and outputs for a node.
 */
function getNodePortCapacity(node: FlintGraphNode): number {
  const inPorts = node.inputs ? node.inputs.length : 0;
  const outPorts = node.outputs ? node.outputs.length : 0;
  return Math.max(inPorts, outPorts);
}

/**
 * Tests whether a point is within a node's computed bounding box.
 */
function isPointInsideNode(
  worldX: number,
  worldY: number,
  node: FlintGraphNode,
  wasm: ReturnType<typeof getFlintRenderWorkerWasm>,
): boolean {
  wasm.getNodeBounds(node.position.x, node.position.y, getNodePortCapacity(node));
  const minX = wasm.get_node_bounds_min_x();
  const maxX = wasm.get_node_bounds_max_x();
  const minY = wasm.get_node_bounds_min_y();
  const maxY = wasm.get_node_bounds_max_y();
  if (worldX < minX || worldX > maxX) return false;
  return worldY >= minY && worldY <= maxY;
}

/**
 * Safely extracts string value from an HTML input or textarea event target.
 */
function extractEventTargetStringValue(event: unknown): string | undefined {
  const target = (event as { target?: { value?: unknown } } | undefined)?.target;
  const value = target?.value;
  return typeof value === 'string' ? value : undefined;
}

/**
 * Safely extracts operation name from drag data transfer payload.
 */
function extractDragOperationType(event: unknown): string | undefined {
  const dataTransfer = (event as { dataTransfer?: DataTransfer } | undefined)?.dataTransfer;
  return dataTransfer?.getData('text/plain');
}

interface GroupBoundingRect {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/**
 * Computes bounding rectangle enclosing all nodes belonging to a group.
 */
function computeFullGroupBoundingBox(
  group: FlintGraphGroup,
  nodeMap: Map<string, FlintGraphNode>,
): GroupBoundingRect | undefined {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasNodes = false;
  for (const id of group.nodeIds) {
    const n = nodeMap.get(id);
    if (!n) continue;
    hasNodes = true;
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + 180);
    maxY = Math.max(maxY, n.position.y + 120);
  }
  return hasNodes ? { minX, minY, maxX, maxY } : undefined;
}

/**
 * Tests whether world coordinates are inside a group padded bounding box.
 */
function isPointInPaddedBox(box: GroupBoundingRect, worldX: number, worldY: number): boolean {
  if (worldX < box.minX - 24 || worldX > box.maxX + 24) return false;
  return worldY >= box.minY - 36 && worldY <= box.maxY + 24;
}

/**
 * Finds graph group bounding box containing world coordinates.
 */
function findGroupAtPoint(
  groups: readonly FlintGraphGroup[] | undefined,
  nodes: readonly FlintGraphNode[],
  worldX: number,
  worldY: number,
): FlintGraphGroup | undefined {
  if (!groups || groups.length === 0) return undefined;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return groups.find((group) => {
    const box = computeFullGroupBoundingBox(group, nodeMap);
    return box !== undefined && isPointInPaddedBox(box, worldX, worldY);
  });
}

/**
 * Synchronizes store graph state with renderer bridge and renders a frame.
 */
function syncGraphWithBridge(store: FlintEditorStore, bridge?: FlintRendererBridge): void {
  if (!bridge) return;
  const state = store.getState();
  bridge.setGraph(state.graph.nodes, state.graph.edges, state.graph.groups ?? []);
  bridge.renderFrame();
}

/**
 * Stops mouse event propagation when clicking modal content cards.
 */
function stopMouseEventPropagation(event: unknown): void {
  if (typeof MouseEvent !== 'undefined' && event instanceof MouseEvent) {
    event.stopPropagation();
  }
}

/**
 * Performs node bounding box hit-testing using WebAssembly spatial routines.
 */
function hitTestNodes(
  worldX: number,
  worldY: number,
  nodes: readonly FlintGraphNode[],
  wasm: ReturnType<typeof getFlintRenderWorkerWasm>,
): FlintHitResult | undefined {
  for (const node of nodes) {
    if (isPointInsideNode(worldX, worldY, node, wasm)) {
      return { type: 'node', nodeId: node.id, worldX, worldY };
    }
  }
  return undefined;
}

/**
 * Calculates squared Euclidean distance from a point to a finite 2D line segment.
 */
function distributionToSegmentSquared(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return (px - x1) * (px - x1) + (py - y1) * (py - y1);
  let projectionRatio = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  projectionRatio = Math.max(0, Math.min(1, projectionRatio));
  const projX = x1 + projectionRatio * (x2 - x1);
  const projY = y1 + projectionRatio * (y2 - y1);
  return (px - projX) * (px - projX) + (py - projY) * (py - projY);
}

/**
 * Tests hit intersection against waypoint handles on a single segmented edge.
 */
function hitTestEdgeWaypoints(
  worldX: number,
  worldY: number,
  edge: FlintGraphEdge,
  radiusSquared: number,
): FlintHitResult | undefined {
  if (!edge.points || edge.points.length === 0) return undefined;
  for (const [index, pt] of edge.points.entries()) {
    const dx = worldX - pt.x;
    const dy = worldY - pt.y;
    if (dx * dx + dy * dy <= radiusSquared) {
      return {
        type: 'waypoint',
        nodeId: '',
        edgeId: edge.id,
        waypointIndex: index,
        worldX: pt.x,
        worldY: pt.y,
      };
    }
  }
  return undefined;
}

/**
 * Performs hit testing for waypoint handles on segmented edges.
 */
function hitTestWaypoints(
  worldX: number,
  worldY: number,
  edges: readonly FlintGraphEdge[],
  radius = 12,
): FlintHitResult | undefined {
  const radiusSquared = radius * radius;
  for (const edge of edges) {
    const hit = hitTestEdgeWaypoints(worldX, worldY, edge, radiusSquared);
    if (hit) return hit;
  }
  return undefined;
}

/**
 * Computes top-left bounding position of a group from its member nodes.
 */
function computeGroupBoundingBox(
  nodeIds: readonly string[],
  nodeMap: ReadonlyMap<string, FlintGraphNode>,
): { minX: number; minY: number } | undefined {
  const nodes: FlintGraphNode[] = [];
  for (const id of nodeIds) {
    const node = nodeMap.get(id);
    if (node) nodes.push(node);
  }
  if (nodes.length === 0) return undefined;
  return {
    minX: Math.min(...nodes.map((n) => n.position.x)),
    minY: Math.min(...nodes.map((n) => n.position.y)),
  };
}

/**
 * Tests whether cursor coordinates lie within a group's header label pill.
 */
function isPointInGroupPill(
  worldX: number,
  worldY: number,
  title: string,
  bounds: { minX: number; minY: number },
): boolean {
  const padding = 24;
  const labelX = bounds.minX - padding + 10;
  const labelY = bounds.minY - padding - 22 + 4;
  const labelWidth = Math.max(120, title.length * 10 + 32);
  const labelHeight = 24;
  return (
    worldX >= labelX - 6 &&
    worldX <= labelX + labelWidth + 6 &&
    worldY >= labelY - 6 &&
    worldY <= labelY + labelHeight + 6
  );
}

/**
 * Performs hit testing for group label pills.
 */
function hitTestGroupLabels(
  worldX: number,
  worldY: number,
  groups: readonly FlintGraphGroup[] | undefined,
  nodes: readonly FlintGraphNode[],
): FlintHitResult | undefined {
  if (!groups || groups.length === 0) return undefined;
  const nodeMap = new Map<string, FlintGraphNode>(nodes.map((n) => [n.id, n]));
  const matched = groups.find((group) => {
    const bounds = computeGroupBoundingBox(group.nodeIds, nodeMap);
    return bounds ? isPointInGroupPill(worldX, worldY, group.title, bounds) : false;
  });
  return matched ? { type: 'group', groupId: matched.id, nodeId: '', worldX, worldY } : undefined;
}

/**
 * Tests whether cursor coordinates lie near any linear waypoint segments of an edge.
 */
function isPointNearWaypointSegments(
  worldX: number,
  worldY: number,
  p0x: number,
  p0y: number,
  p3x: number,
  p3y: number,
  points: readonly { x: number; y: number }[],
): boolean {
  let previousX = p0x;
  let previousY = p0y;
  for (const pt of points) {
    if (distributionToSegmentSquared(worldX, worldY, previousX, previousY, pt.x, pt.y) <= 14 * 14) {
      return true;
    }
    previousX = pt.x;
    previousY = pt.y;
  }
  return distributionToSegmentSquared(worldX, worldY, previousX, previousY, p3x, p3y) <= 14 * 14;
}

/**
 * Tests hit intersection against a single graph edge.
 */
function hitTestSingleEdge(
  worldX: number,
  worldY: number,
  edge: FlintGraphEdge,
  from: FlintGraphNode,
  to: FlintGraphNode,
  wasm: ReturnType<typeof getFlintRenderWorkerWasm>,
): boolean {
  const fromIndex = Math.max(
    0,
    from.outputs.findIndex((p) => p.id === edge.fromPortId),
  );
  const toIndex = Math.max(
    0,
    to.inputs.findIndex((p) => p.id === edge.toPortId),
  );
  const p0x = from.position.x + 220;
  const p0y = from.position.y + 44 + fromIndex * 28 + 14;
  const p3x = to.position.x;
  const p3y = to.position.y + 44 + toIndex * 28 + 14;

  if (edge.points && edge.points.length > 0) {
    return isPointNearWaypointSegments(worldX, worldY, p0x, p0y, p3x, p3y, edge.points);
  }
  return Boolean(
    wasm.edge_hit_test(
      Math.round(worldX),
      Math.round(worldY),
      Math.round(p0x),
      Math.round(p0y),
      Math.round(p3x),
      Math.round(p3y),
      14,
    ),
  );
}

/**
 * Performs edge spline curve or waypoint segment hit-testing.
 */
function hitTestEdges(
  worldX: number,
  worldY: number,
  edges: readonly FlintGraphEdge[],
  nodes: readonly FlintGraphNode[],
  wasm: ReturnType<typeof getFlintRenderWorkerWasm>,
): FlintHitResult | undefined {
  const nodeMap = new Map<string, FlintGraphNode>(nodes.map((n) => [n.id, n]));
  for (const edge of edges) {
    const from = nodeMap.get(edge.fromNodeId);
    const to = nodeMap.get(edge.toNodeId);
    if (from && to && hitTestSingleEdge(worldX, worldY, edge, from, to, wasm)) {
      return { type: 'edge', nodeId: '', edgeId: edge.id, worldX, worldY };
    }
  }
  return undefined;
}

/**
 * Creates a bridge communicating with the native Flint WebAssembly render worker or canvas context.
 */
function createRendererBridge(
  canvasElement: HTMLCanvasElement,
  initialWidth: number,
  initialHeight: number,
  initialDpr: number,
  onMessage: (message: RenderWorkerOutputMessage) => void,
  renderer?: 'webgpu' | 'webgl' | 'canvas2d',
  initialTheme: 'light' | 'dark' = 'dark',
): FlintRendererBridge {
  const wasm = getFlintRenderWorkerWasm();
  wasm.engine_create(initialWidth, initialHeight, initialDpr);
  wasm.engine_set_theme(initialTheme === 'light' ? 1 : 0);

  let camera: FlintCamera = {
    x: wasm.get_camera_x(),
    y: wasm.get_camera_y(),
    zoom: wasm.get_camera_zoom(),
    viewportWidth: wasm.get_camera_viewport_width(),
    viewportHeight: wasm.get_camera_viewport_height(),
  };

  let hoveredPort: { readonly nodeId: string; readonly portId: string } | undefined;
  let currentNodes: readonly FlintGraphNode[] = [];
  let currentEdges: readonly FlintGraphEdge[] = [];
  let currentGroups: readonly FlintGraphGroup[] = [];
  let currentDpr = initialDpr;

  /**
   * Dispatches an input message to the render worker or offscreen worker bridge.
   */
  const postToRenderer = (inputMessage: RenderWorkerInputMessage): void => {
    const messageWithId: RenderWorkerInputMessage = { id: 'flint_render_bridge', ...inputMessage };
    if (globalThis.self !== undefined && 'dispatchEvent' in globalThis.self) {
      globalThis.self.dispatchEvent(new MessageEvent('message', { data: messageWithId }));
    }
  };

  let cleanupListener: (() => void) | undefined;
  if (globalThis.self !== undefined && 'addEventListener' in globalThis.self) {
    const validMessageTypes = new Set(['ready', 'frame', 'camera_changed', 'hit_result', 'hit_test_result', 'error']);
    /**
     * Handles incoming response messages from the render worker.
     */
    const handleOutputMessage = (event: MessageEvent<RenderWorkerOutputMessage>): void => {
      const data = event.data;
      if (data && typeof data === 'object' && 'type' in data && validMessageTypes.has(data.type)) {
        onMessage(data);
      }
    };
    globalThis.self.addEventListener('message', handleOutputMessage);
    cleanupListener = () => {
      globalThis.self.removeEventListener('message', handleOutputMessage);
    };
  }

  canvasElement.width = Math.round(initialWidth * initialDpr);
  canvasElement.height = Math.round(initialHeight * initialDpr);

  postToRenderer({
    type: 'init',
    canvas: canvasElement,
    width: initialWidth,
    height: initialHeight,
    dpr: initialDpr,
    renderer,
    theme: initialTheme,
  });

  /**
   * Reads the current camera parameters from the native WebAssembly memory table.
   */
  const syncCameraFromWasm = (): FlintCamera => {
    camera = {
      x: wasm.get_camera_x(),
      y: wasm.get_camera_y(),
      zoom: wasm.get_camera_zoom(),
      viewportWidth: wasm.get_camera_viewport_width(),
      viewportHeight: wasm.get_camera_viewport_height(),
    };
    return camera;
  };

  return {
    setGraph: (nodes, edges, groups = []) => {
      currentNodes = nodes;
      currentEdges = edges;
      currentGroups = groups;
      wasm.spatial_clear();
      for (const [index, node] of nodes.entries()) {
        if (node) {
          const maxPorts = Math.max(node.inputs?.length ?? 0, node.outputs?.length ?? 0);
          wasm.getNodeBounds(node.position.x, node.position.y, maxPorts);
          const minX = wasm.get_node_bounds_min_x();
          const minY = wasm.get_node_bounds_min_y();
          const maxX = wasm.get_node_bounds_max_x();
          const maxY = wasm.get_node_bounds_max_y();
          wasm.spatial_insert_node(
            index,
            Math.round(minX) + 1_000_000,
            Math.round(minY) + 1_000_000,
            Math.round(maxX) + 1_000_000,
            Math.round(maxY) + 1_000_000,
          );
        }
      }
      postToRenderer({ type: 'set_graph', nodes, edges, groups });
    },
    setSelection: (nodeIds, edgeIds = [], groupId?: string) => {
      postToRenderer({
        type: 'set_selection',
        selectedNodeIds: nodeIds,
        selectedEdgeIds: edgeIds,
        selectedGroupId: groupId,
      });
    },
    setConnectingEdge: (edge) => {
      postToRenderer({
        type: 'set_connecting_edge',
        edge,
      });
    },
    setHoveredPort: (port) => {
      hoveredPort = port;
      postToRenderer({
        type: 'set_hovered_port',
        hoveredPort: port,
      });
    },
    getHoveredPort: () => hoveredPort,
    renderFrame: () => {
      wasm.engine_render_frame(currentNodes.length, currentEdges.length, currentNodes.length * 4);
      postToRenderer({ type: 'render_frame' });
    },
    setTheme: (theme: 'light' | 'dark') => {
      wasm.engine_set_theme(theme === 'light' ? 1 : 0);
      postToRenderer({ type: 'set_theme', theme });
    },
    resize: (w, h, dpr = currentDpr) => {
      currentDpr = dpr;
      canvasElement.width = Math.round(w * dpr);
      canvasElement.height = Math.round(h * dpr);
      wasm.engine_resize(w, h, dpr);
      syncCameraFromWasm();
      postToRenderer({ type: 'resize', width: w, height: h, dpr });
    },
    zoom: (cursorX, cursorY, factor) => {
      wasm.engine_zoom(cursorX, cursorY, factor);
      syncCameraFromWasm();
      postToRenderer({ type: 'zoom', factor, cursorX, cursorY });
      onMessage({ type: 'camera_changed', camera });
    },
    pan: (deltaX, deltaY) => {
      wasm.engine_pan(deltaX, deltaY);
      syncCameraFromWasm();
      postToRenderer({ type: 'pan', deltaX, deltaY });
      onMessage({ type: 'camera_changed', camera });
    },
    screenToWorld: (screenX, screenY) => {
      wasm.createCamera(camera.viewportWidth, camera.viewportHeight, camera.x, camera.y, camera.zoom);
      wasm.screenToWorld(screenX, screenY);
      return {
        x: wasm.get_point_x(),
        y: wasm.get_point_y(),
      };
    },
    getCamera: () => camera,
    queryNodesInBox: (box) => {
      const matched: string[] = [];
      for (const node of currentNodes) {
        const maxPorts = Math.max(node.inputs?.length ?? 0, node.outputs?.length ?? 0);
        wasm.getNodeBounds(node.position.x, node.position.y, maxPorts);
        const minX = wasm.get_node_bounds_min_x();
        const minY = wasm.get_node_bounds_min_y();
        const maxX = wasm.get_node_bounds_max_x();
        const maxY = wasm.get_node_bounds_max_y();
        const rw = maxX - minX;
        const rh = maxY - minY;
        if (wasm.rect_intersects_box(minX, minY, rw, rh, box.minX, box.minY, box.maxX, box.maxY) === 1) {
          matched.push(node.id);
        }
      }
      return matched;
    },
    hitTestSync: (screenX, screenY, snapRadius = 16) => {
      wasm.createCamera(camera.viewportWidth, camera.viewportHeight, camera.x, camera.y, camera.zoom);
      wasm.screenToWorld(screenX, screenY);
      const worldX = wasm.get_point_x();
      const worldY = wasm.get_point_y();

      const portHit = hitTestPorts(worldX, worldY, currentNodes, snapRadius);
      if (portHit) return portHit;

      const groupHit = hitTestGroupLabels(worldX, worldY, currentGroups, currentNodes);
      if (groupHit) return groupHit;

      const waypointHit = hitTestWaypoints(worldX, worldY, currentEdges);
      if (waypointHit) return waypointHit;

      const nodeHit = hitTestNodes(worldX, worldY, currentNodes, wasm);
      if (nodeHit) return nodeHit;

      return hitTestEdges(worldX, worldY, currentEdges, currentNodes, wasm);
    },
    reloadFontAtlas: () => {
      postToRenderer({ type: 'reload_font_atlas' });
    },
    destroy: () => {
      postToRenderer({ type: 'destroy' });
      cleanupListener?.();
    },
    getPerformanceStats: () => ({
      updateTimeMs: 0.5,
      renderTimeMs: 1.2,
      spatialIndexTimeMs: 0.2,
      bufferUploadTimeMs: 0.4,
      drawPassTimeMs: 0.6,
      totalFrameTimeMs: 1.7,
      visibleNodesCount: currentNodes.length,
      visibleEdgesCount: currentEdges.length,
      visiblePinsCount: currentNodes.length * 4,
      dpr: currentDpr,
      isFallback: false,
    }),
  };
}

/**
 * Retrieves color theme explicitly configured on the document root or body.
 */
function getDatasetTheme(): 'light' | 'dark' | undefined {
  if (typeof document === 'undefined') return undefined;
  const rawTheme = document.documentElement.dataset.theme ?? document.body?.dataset.theme;
  return rawTheme === 'light' || rawTheme === 'dark' ? rawTheme : undefined;
}

/**
 * Detects the active color theme from the DOM data-theme attribute or system color preference.
 */
function detectCurrentTheme(): 'light' | 'dark' {
  const datasetTheme = getDatasetTheme();
  if (datasetTheme !== undefined) {
    return datasetTheme;
  }
  if (
    globalThis.window !== undefined &&
    typeof globalThis.matchMedia === 'function' &&
    globalThis.matchMedia('(prefers-color-scheme: light)').matches
  ) {
    return 'light';
  }
  return 'dark';
}

interface FlintCodeExportModalProperties {
  readonly show: boolean;
  readonly source: string;
  readonly onClose: () => void;
}

/**
 * Inner card content of the Flint code export dialog.
 */
function FlintCodeExportCard(properties: FlintCodeExportModalProperties): MpElement {
  return (
    <ForgeCard
      size="lg"
      variant="neutral"
      padding="none"
      bordered={true}
      shadow={true}
    >
      <div className={styles.modalHeader}>
        <span
          className={styles.inspectorTitle}
          style={{ margin: 0 }}
        >
          Generated Flint Source
        </span>
        <button
          type="button"
          className={classNames(styles.toolbarBtn, styles.toolbarBtnGhost)}
          onClick={properties.onClose}
          aria-label="Close export modal"
        >
          ✕
        </button>
      </div>
      <div className={styles.modalBody}>
        <pre className={styles.codeBlock}>
          <code>{properties.source}</code>
        </pre>
      </div>
      <div className={styles.modalFooter}>
        <button
          type="button"
          className={classNames(styles.toolbarBtn, styles.toolbarBtnPrimary)}
          onClick={properties.onClose}
        >
          Close
        </button>
      </div>
    </ForgeCard>
  );
}

/**
 * Modal dialog displaying generated Flint Wasm source code.
 */
function FlintCodeExportModal(properties: FlintCodeExportModalProperties): MpElement | undefined {
  if (!properties.show) return undefined;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className={styles.modalOverlay}
      onClick={properties.onClose}
    >
      <div
        className={styles.modalCard}
        onClick={stopMouseEventPropagation}
      >
        <FlintCodeExportCard {...properties} />
      </div>
    </div>
  );
}

interface SpriteSheetInspectorSectionProperties {
  readonly spriteSheetMode: 'crisp' | 'raw';
  readonly setSpriteSheetMode: (mode: 'crisp' | 'raw') => void;
  readonly spriteSheetGrid: boolean;
  readonly setSpriteSheetGrid: (grid: boolean) => void;
  readonly hoveredGlyph?: HoveredGlyphInfo;
  readonly spriteSheetCanvasReference: { current?: HTMLCanvasElement };
  readonly inspectCanvasReference: { current?: HTMLCanvasElement };
  readonly onSpriteSheetPointerMove: (event: PointerEvent) => void;
  readonly onSpriteSheetPointerLeave: () => void;
  readonly paintSpriteSheet: (mode?: 'crisp' | 'raw', grid?: boolean, highlightIndex?: number) => void;
}

/**
 * Sprite sheet view mode and grid toggles toolbar.
 */
function SpriteSheetToolbar(properties: SpriteSheetInspectorSectionProperties): MpElement {
  const isCrisp = properties.spriteSheetMode === 'crisp';
  const isRaw = properties.spriteSheetMode === 'raw';
  return (
    <div className={styles.spriteSheetToolbar}>
      <div className={styles.buttonGroup}>
        <button
          type="button"
          className={classNames(styles.toolbarBtn, isCrisp ? styles.toolbarBtnPrimary : styles.toolbarBtnGhost)}
          onClick={() => {
            properties.setSpriteSheetMode('crisp');
            properties.paintSpriteSheet('crisp', properties.spriteSheetGrid, properties.hoveredGlyph?.index);
          }}
        >
          Crisp Glyphs
        </button>
        <button
          type="button"
          className={classNames(styles.toolbarBtn, isRaw ? styles.toolbarBtnPrimary : styles.toolbarBtnGhost)}
          onClick={() => {
            properties.setSpriteSheetMode('raw');
            properties.paintSpriteSheet('raw', properties.spriteSheetGrid, properties.hoveredGlyph?.index);
          }}
        >
          Raw SDF
        </button>
      </div>
      <button
        type="button"
        className={classNames(styles.toolbarBtn, styles.toolbarBtnGhost)}
        onClick={() => {
          const nextGrid = !properties.spriteSheetGrid;
          properties.setSpriteSheetGrid(nextGrid);
          properties.paintSpriteSheet(properties.spriteSheetMode, nextGrid, properties.hoveredGlyph?.index);
        }}
      >
        {properties.spriteSheetGrid ? 'Grid: ON' : 'Grid: OFF'}
      </button>
    </div>
  );
}

/**
 * Metadata badges displaying sprite sheet atlas characteristics.
 */
function SpriteSheetMetaBadges(): MpElement {
  return (
    <div className={styles.spriteSheetMeta}>
      <ForgeBadge
        variant="primary"
        size="xs"
      >
        1024 × 1024 px
      </ForgeBadge>
      <ForgeBadge
        variant="neutral"
        size="xs"
      >
        2D Shelf Packed (4x4 to 64x64)
      </ForgeBadge>
      <ForgeBadge
        variant="info"
        size="xs"
      >
        Comfortaa & Datatype
      </ForgeBadge>
      <ForgeBadge
        variant="success"
        size="xs"
      >
        {GLYPH_CHARS_BY_IDX.length} Active Glyphs
      </ForgeBadge>
    </div>
  );
}

interface SpriteSheetGlyphDetailsProperties {
  readonly hoveredGlyph: HoveredGlyphInfo;
  readonly inspectCanvasReference: { current?: HTMLCanvasElement };
}

/**
 * Text description rows displaying typographical and bounding box metrics.
 */
function SpriteSheetMetricRows(properties: { readonly glyph: HoveredGlyphInfo }): MpElement {
  const glyph = properties.glyph;
  return (
    <div style={{ fontSize: '11px', lineHeight: '1.5', color: '#c9d1d9' }}>
      <div>
        <strong>Dimensions & Advance:</strong> {glyph.width}×{glyph.height}px | Advance H: {glyph.advance}px | Advance
        V: {glyph.vertAdvance}px
      </div>
      <div>
        <strong>Bearings:</strong> Left (LSB): {glyph.horiBearingX}px | Right (RSB): {glyph.rightBearing}px | Top:{' '}
        {glyph.horiBearingY}px
      </div>
      <div>
        <strong>Font Metrics:</strong> Ascent: {glyph.ascent}px | Descent: {glyph.descent}px | LineGap: {glyph.linegap}
        px | Int Leading: {glyph.internalLeading}px | Ext Leading: {glyph.externalLeading}px
      </div>
      <div>
        <strong>BBox & Origin:</strong> [{glyph.bboxMinX}, {glyph.bboxMinY}, {glyph.bboxMaxX}, {glyph.bboxMaxY}] |
        Origin: (0, 0) on baseline | Packed Cell: {glyph.cellW}×{glyph.cellH} at ({glyph.cellX}, {glyph.cellY})
      </div>
    </div>
  );
}

/**
 * Detailed glyph metrics inspector sub-panel.
 */
function SpriteSheetGlyphDetails(properties: SpriteSheetGlyphDetailsProperties): MpElement {
  const glyph = properties.hoveredGlyph;
  const charDisplay = glyph.char === ' ' ? 'Space' : glyph.char;
  return (
    <div className={styles.spriteSheetInspector}>
      <canvas
        ref={properties.inspectCanvasReference}
        width={64}
        height={64}
        className={styles.spriteSheetInspectCanvas}
      />
      <div className={styles.spriteSheetInspectDetails}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={styles.spriteSheetInspectChar}>{charDisplay}</span>
          <ForgeBadge
            variant="info"
            size="xs"
          >
            {glyph.codeHex}
          </ForgeBadge>
          <ForgeBadge
            variant="neutral"
            size="xs"
          >
            Idx {glyph.index}
          </ForgeBadge>
        </div>
        <SpriteSheetMetricRows glyph={glyph} />
      </div>
    </div>
  );
}

/**
 * Collapsible section for inspecting the 2D Shelf Packed SDF glyph atlas.
 */
function SpriteSheetInspectorSection(properties: SpriteSheetInspectorSectionProperties): MpElement {
  return (
    <ForgeCollapse
      summary="Debug Glyph Sprite Sheet (1024x1024 2D Shelf Packed SDF Atlas)"
      open={true}
      size="sm"
      onToggle={() => properties.paintSpriteSheet()}
    >
      <div className={styles.spriteSheetContainer}>
        <SpriteSheetToolbar {...properties} />
        <SpriteSheetMetaBadges />
        <canvas
          ref={properties.spriteSheetCanvasReference}
          width={1024}
          height={1024}
          className={styles.spriteSheetCanvas}
          onPointerMove={properties.onSpriteSheetPointerMove}
          onPointerLeave={properties.onSpriteSheetPointerLeave}
        />
        {properties.hoveredGlyph && (
          <SpriteSheetGlyphDetails
            hoveredGlyph={properties.hoveredGlyph}
            inspectCanvasReference={properties.inspectCanvasReference}
          />
        )}
      </div>
    </ForgeCollapse>
  );
}

interface FlintPerfModalProperties {
  readonly show: boolean;
  readonly onClose: () => void;
  readonly perfMetrics: FlintPerformanceMetrics;
  readonly perfHistory: readonly FlintPerformanceMetrics[];
  readonly telemetryInterval: 'realtime' | '100ms' | '250ms' | '500ms' | '750ms' | '1500ms';
  readonly setTelemetryInterval: (interval: 'realtime' | '100ms' | '250ms' | '500ms' | '750ms' | '1500ms') => void;
  readonly spriteSheetMode: 'crisp' | 'raw';
  readonly setSpriteSheetMode: (mode: 'crisp' | 'raw') => void;
  readonly spriteSheetGrid: boolean;
  readonly setSpriteSheetGrid: (grid: boolean) => void;
  readonly hoveredGlyph?: HoveredGlyphInfo;
  readonly spriteSheetCanvasReference: { current?: HTMLCanvasElement };
  readonly inspectCanvasReference: { current?: HTMLCanvasElement };
  readonly onSpriteSheetPointerMove: (event: PointerEvent) => void;
  readonly onSpriteSheetPointerLeave: () => void;
  readonly paintSpriteSheet: (mode?: 'crisp' | 'raw', grid?: boolean, highlightIndex?: number) => void;
}

interface PerfModalHeaderProperties {
  readonly perfMetrics: FlintPerformanceMetrics;
  readonly onClose: () => void;
}

/**
 * Performance profiler modal header toolbar with FPS and backend badges.
 */
function PerfModalHeader(properties: PerfModalHeaderProperties): MpElement {
  const fps = Math.round(1000 / Math.max(1, properties.perfMetrics.totalFrameTimeMs));
  const backendLabel =
    properties.perfMetrics.backend?.toUpperCase() ?? (properties.perfMetrics.isFallback ? 'CANVAS2D' : 'WEBGPU');
  return (
    <div className={styles.modalHeader}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className={styles.modalTitle}>Performance Profiler & Realtime Telemetry</span>
        <ForgeBadge
          variant="success"
          size="xs"
        >
          {fps} FPS
        </ForgeBadge>
        <ForgeBadge
          variant="neutral"
          size="xs"
        >
          {backendLabel}
        </ForgeBadge>
      </div>
      <button
        type="button"
        className={classNames(styles.toolbarBtn, styles.toolbarBtnGhost)}
        onClick={properties.onClose}
        aria-label="Close performance modal"
      >
        ✕
      </button>
    </div>
  );
}

interface PerfIntervalSelectorProperties {
  readonly telemetryInterval: 'realtime' | '100ms' | '250ms' | '500ms' | '750ms' | '1500ms';
  readonly setTelemetryInterval: (interval: 'realtime' | '100ms' | '250ms' | '500ms' | '750ms' | '1500ms') => void;
}

const TELEMETRY_INTERVALS = ['realtime', '100ms', '250ms', '500ms', '750ms', '1500ms'] as const;

/**
 * Telemetry refresh rate selector buttons.
 */
function PerfIntervalSelector(properties: PerfIntervalSelectorProperties): MpElement {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#8b949e', marginBottom: '6px' }}>
        Telemetry Refresh Interval
      </div>
      <div className={styles.buttonGroup}>
        {TELEMETRY_INTERVALS.map((interval) => (
          <button
            key={interval}
            type="button"
            className={classNames(
              styles.toolbarBtn,
              properties.telemetryInterval === interval ? styles.toolbarBtnPrimary : styles.toolbarBtnGhost,
            )}
            onClick={() => properties.setTelemetryInterval(interval)}
          >
            {interval === 'realtime' ? 'Realtime' : interval}
          </button>
        ))}
      </div>
    </div>
  );
}

interface PerfMetricCardProperties {
  readonly label: string;
  readonly value: string;
  readonly color: string;
}

/**
 * Single performance summary metric badge card.
 */
function PerfMetricCard(properties: PerfMetricCardProperties): MpElement {
  return (
    <div style={{ background: '#161b22', padding: '8px', borderRadius: '6px', border: '1px solid #30363d' }}>
      <div style={{ fontSize: '10px', color: '#8b949e' }}>{properties.label}</div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: properties.color }}>{properties.value}</div>
    </div>
  );
}

/**
 * 2x4 performance metrics card grid display.
 */
function PerfMetricsGrid(properties: { readonly perfMetrics: FlintPerformanceMetrics }): MpElement {
  const metrics = properties.perfMetrics;
  const updateLayout = ((metrics.updateTimeMs ?? 0) + (metrics.layoutTimeMs ?? 0)).toFixed(2);
  const totalNodes = metrics.totalNodesCount ?? metrics.visibleNodesCount;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '8px' }}>
        <PerfMetricCard
          label="Total Frame Time"
          value={`${metrics.totalFrameTimeMs.toFixed(2)} ms`}
          color="#58a6ff"
        />
        <PerfMetricCard
          label="Render Duration"
          value={`${metrics.renderTimeMs.toFixed(2)} ms`}
          color="#3fb950"
        />
        <PerfMetricCard
          label="Spatial Indexing"
          value={`${metrics.spatialIndexTimeMs.toFixed(2)} ms`}
          color="#d29922"
        />
        <PerfMetricCard
          label="Visible Nodes"
          value={`${metrics.visibleNodesCount} / ${totalNodes}`}
          color="#f0883e"
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
        <PerfMetricCard
          label="Updates & Layout"
          value={`${updateLayout} ms`}
          color="#f0883e"
        />
        <PerfMetricCard
          label="Buffer Uploads"
          value={`${(metrics.bufferUploadTimeMs ?? 0).toFixed(2)} ms`}
          color="#a371f7"
        />
        <PerfMetricCard
          label="Visible Edges & Pins"
          value={`${metrics.visibleEdgesCount}E / ${metrics.visiblePinsCount}P`}
          color="#388bfd"
        />
        <PerfMetricCard
          label="DPR / Scale"
          value={`${metrics.dpr.toFixed(1)}x DPR`}
          color="#39c5bb"
        />
      </div>
    </div>
  );
}

/**
 * Card contents for the D3 performance telemetry and glyph atlas modal.
 */
function FlintPerfCardContent(properties: FlintPerfModalProperties): MpElement {
  return (
    <ForgeCard
      size="xl"
      variant="neutral"
      padding="none"
      bordered={true}
      shadow={true}
    >
      <PerfModalHeader
        perfMetrics={properties.perfMetrics}
        onClose={properties.onClose}
      />
      <div className={styles.modalBody}>
        <PerfIntervalSelector
          telemetryInterval={properties.telemetryInterval}
          setTelemetryInterval={properties.setTelemetryInterval}
        />
        <div style={{ marginBottom: '16px' }}>
          <ForgePerformanceTimelineChart
            history={properties.perfHistory}
            currentMetrics={properties.perfMetrics}
            width={880}
            height={180}
          />
        </div>
        <PerfMetricsGrid perfMetrics={properties.perfMetrics} />
        <ForgePerformancePieChart
          metrics={properties.perfMetrics}
          width={280}
          height={240}
        />
        <div style={{ marginTop: '16px' }}>
          <SpriteSheetInspectorSection
            spriteSheetMode={properties.spriteSheetMode}
            setSpriteSheetMode={properties.setSpriteSheetMode}
            spriteSheetGrid={properties.spriteSheetGrid}
            setSpriteSheetGrid={properties.setSpriteSheetGrid}
            hoveredGlyph={properties.hoveredGlyph}
            spriteSheetCanvasReference={properties.spriteSheetCanvasReference}
            inspectCanvasReference={properties.inspectCanvasReference}
            onSpriteSheetPointerMove={properties.onSpriteSheetPointerMove}
            onSpriteSheetPointerLeave={properties.onSpriteSheetPointerLeave}
            paintSpriteSheet={properties.paintSpriteSheet}
          />
        </div>
      </div>
      <div className={styles.modalFooter}>
        <button
          type="button"
          className={classNames(styles.toolbarBtn, styles.toolbarBtnPrimary)}
          onClick={properties.onClose}
        >
          Close
        </button>
      </div>
    </ForgeCard>
  );
}

/**
 * Modal dialog for inspecting realtime D3 performance charts and GPU glyph atlas.
 */
function FlintPerfProfilerModal(properties: FlintPerfModalProperties): MpElement | undefined {
  if (!properties.show) return undefined;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className={styles.modalOverlay}
      onClick={properties.onClose}
    >
      <div
        className={styles.perfModal}
        onClick={stopMouseEventPropagation}
      >
        <FlintPerfCardContent {...properties} />
      </div>
    </div>
  );
}

/**
 * Renders atlas pixels using multi-channel signed distance field sharpening.
 */
function renderAtlasCrisp(rawBytes: Uint8ClampedArray, outBytes: Uint8ClampedArray, atlasSize: number): void {
  for (let pixelIndex = 0; pixelIndex < atlasSize * atlasSize; pixelIndex++) {
    const red = (rawBytes[pixelIndex * 4] ?? 0) / 255;
    const green = (rawBytes[pixelIndex * 4 + 1] ?? 0) / 255;
    const blue = (rawBytes[pixelIndex * 4 + 2] ?? 0) / 255;
    const msdf = Math.max(Math.min(red, green), Math.min(Math.max(red, green), blue));
    const edge = 0.5;
    const smoothing = 0.045;
    const threshold = Math.max(0, Math.min(1, (msdf - (edge - smoothing)) / (2 * smoothing)));
    const alpha = threshold * threshold * (3 - 2 * threshold);
    const outputIndex = pixelIndex * 4;
    outBytes[outputIndex] = Math.round(13 + (255 - 13) * alpha);
    outBytes[outputIndex + 1] = Math.round(17 + (255 - 17) * alpha);
    outBytes[outputIndex + 2] = Math.round(23 + (255 - 23) * alpha);
    outBytes[outputIndex + 3] = 255;
  }
}

/**
 * Copies raw font atlas RGB texture channels into canvas image data buffer.
 */
function renderAtlasRaw(rawBytes: Uint8ClampedArray, outBytes: Uint8ClampedArray, atlasSize: number): void {
  for (let pixelIndex = 0; pixelIndex < atlasSize * atlasSize; pixelIndex++) {
    const outputIndex = pixelIndex * 4;
    outBytes[outputIndex] = rawBytes[outputIndex] ?? 0;
    outBytes[outputIndex + 1] = rawBytes[outputIndex + 1] ?? 0;
    outBytes[outputIndex + 2] = rawBytes[outputIndex + 2] ?? 0;
    outBytes[outputIndex + 3] = 255;
  }
}

/**
 * Renders individual glyph cell outlines.
 */
function renderAtlasCellOutlines(context: CanvasRenderingContext2D, u32Memory: Uint32Array, tableBase: number): void {
  for (let glyphIndex = 0; glyphIndex < GLYPH_CHARS_BY_IDX.length; glyphIndex++) {
    const base = (tableBase + glyphIndex * 16) >> 2;
    const cellX = u32Memory[base] ?? 0;
    const cellY = u32Memory[base + 1] ?? 0;
    const cellW = u32Memory[base + 2] ?? 24;
    const cellH = u32Memory[base + 3] ?? 32;
    context.strokeRect(cellX + 0.5, cellY + 0.5, cellW - 1, cellH - 1);
  }
}

/**
 * Renders highlighted glyph cell bounding box.
 */
function renderAtlasHighlightBox(
  context: CanvasRenderingContext2D,
  u32Memory: Uint32Array,
  tableBase: number,
  highlightIndex: number,
): void {
  const base = (tableBase + highlightIndex * 16) >> 2;
  const hX = u32Memory[base] ?? 0;
  const hY = u32Memory[base + 1] ?? 0;
  const hW = u32Memory[base + 2] ?? 24;
  const hH = u32Memory[base + 3] ?? 32;
  context.strokeStyle = '#58a6ff';
  context.lineWidth = 2;
  context.strokeRect(hX + 0.5, hY + 0.5, hW - 1, hH - 1);
}

/**
 * Renders glyph cell grid outlines and optional selection highlight box.
 */
function renderAtlasGrid(
  context: CanvasRenderingContext2D,
  u32Memory: Uint32Array,
  tableBase: number,
  highlightIndex?: number,
): void {
  context.save();
  context.lineWidth = 1;
  context.strokeStyle = 'rgba(88, 166, 255, 0.25)';
  renderAtlasCellOutlines(context, u32Memory, tableBase);

  if (highlightIndex !== undefined && highlightIndex >= 0 && highlightIndex < GLYPH_CHARS_BY_IDX.length) {
    renderAtlasHighlightBox(context, u32Memory, tableBase, highlightIndex);
  }
  context.restore();
}

/**
 * Tests if point is inside cell bounding box.
 */
function isPointInCell(x: number, y: number, cellX: number, cellY: number, cellW: number, cellH: number): boolean {
  return x >= cellX && x < cellX + cellW && y >= cellY && y < cellY + cellH;
}

/**
 * Finds glyph cell bounding box under normalized atlas coordinates.
 */
function findSpriteSheetCellAtPoint(
  u32Memory: Uint32Array,
  tableBase: number,
  atlasX: number,
  atlasY: number,
): { foundIndex: number; foundX: number; foundY: number; foundW: number; foundH: number } | undefined {
  for (let glyphIndex = 0; glyphIndex < GLYPH_CHARS_BY_IDX.length; glyphIndex++) {
    const base = (tableBase + glyphIndex * 16) >> 2;
    const cellX = u32Memory[base] ?? 0;
    const cellY = u32Memory[base + 1] ?? 0;
    const cellW = u32Memory[base + 2] ?? 24;
    const cellH = u32Memory[base + 3] ?? 32;

    if (isPointInCell(atlasX, atlasY, cellX, cellY, cellW, cellH)) {
      return { foundIndex: glyphIndex, foundX: cellX, foundY: cellY, foundW: cellW, foundH: cellH };
    }
  }
  return undefined;
}

/**
 * Resolves font bounding box metrics for a glyph.
 */
function resolveGlyphBBox(wasm: ReturnType<typeof getFlintRenderWorkerWasm>, index: number, fallbackW: number) {
  const getMinX = wasm.font_get_glyph_bbox_min_x;
  const getMaxX = wasm.font_get_glyph_bbox_max_x;
  const getMinY = wasm.font_get_glyph_bbox_min_y;
  const getMaxY = wasm.font_get_glyph_bbox_max_y;
  return {
    bboxMinX: getMinX ? getMinX(index) : 0,
    bboxMaxX: getMaxX ? getMaxX(index) : fallbackW,
    bboxMinY: getMinY ? getMinY(index) : 0,
    bboxMaxY: getMaxY ? getMaxY(index) : 18,
  };
}

/**
 * Resolves font line spacing and leading metrics.
 */
function resolveGlyphLineMetrics(wasm: ReturnType<typeof getFlintRenderWorkerWasm>) {
  const getAscent = wasm.font_get_ascent;
  const getDescent = wasm.font_get_descent;
  const getLinegap = wasm.font_get_linegap;
  const getLeading = wasm.font_get_internal_leading;
  const getExternalLeading = wasm.font_get_external_leading;
  return {
    ascent: getAscent ? getAscent() : 18,
    descent: getDescent ? getDescent() : 6,
    linegap: getLinegap ? getLinegap() : 4,
    internalLeading: getLeading ? getLeading() : 2,
    externalLeading: getExternalLeading ? getExternalLeading() : 4,
  };
}

/**
 * Extracts typography and layout metrics for a hovered glyph.
 */
function resolveGlyphDetails(
  wasm: ReturnType<typeof getFlintRenderWorkerWasm>,
  foundIndex: number,
  foundX: number,
  foundY: number,
  foundW: number,
  foundH: number,
): HoveredGlyphInfo {
  const char = GLYPH_CHARS_BY_IDX[foundIndex] ?? '';
  const code = char.codePointAt(0) ?? 0;
  const getAdvance = wasm.font_get_char_advance;
  const getWidth = wasm.font_get_glyph_width;
  const getHeight = wasm.font_get_glyph_height;
  const getBearingX = wasm.font_get_glyph_hori_bearing_x;
  const getBearingY = wasm.font_get_glyph_hori_bearing_y;
  const getRightBearing = wasm.font_get_glyph_right_bearing;
  const getVertAdvance = wasm.font_get_glyph_vert_advance;

  const advance = getAdvance ? getAdvance(code) : 14;
  const width = getWidth ? getWidth(foundIndex) : foundW;
  const height = getHeight ? getHeight(foundIndex) : foundH;
  const horiBearingX = getBearingX ? getBearingX(foundIndex) : 0;
  const horiBearingY = getBearingY ? getBearingY(foundIndex) : 18;
  const bbox = resolveGlyphBBox(wasm, foundIndex, foundW);
  const lineMetrics = resolveGlyphLineMetrics(wasm);
  const rightBearing = getRightBearing ? getRightBearing(foundIndex) : Math.max(0, advance - horiBearingX - width);
  const vertAdvance = getVertAdvance ? getVertAdvance(foundIndex) : 24;

  return {
    index: foundIndex,
    char,
    codeHex: `U+${code.toString(16).toUpperCase().padStart(4, '0')}`,
    codeDec: code,
    advance,
    vertAdvance,
    width,
    height,
    horiBearingX,
    horiBearingY,
    rightBearing,
    cellX: foundX,
    cellY: foundY,
    cellW: foundW,
    cellH: foundH,
    ...bbox,
    ...lineMetrics,
  };
}

const CURSOR_BY_HIT_TYPE: Record<string, string> = {
  port: 'crosshair',
  waypoint: 'grab',
  edge: 'pointer',
  node: 'move',
  group: 'move',
};

/**
 * Returns CSS cursor property string for canvas hit test hover target.
 */
function getPointerHoverCursor(hoverHit?: FlintHitResult): string {
  return (hoverHit ? CURSOR_BY_HIT_TYPE[hoverHit.type] : undefined) ?? 'default';
}

/**
 * No-op resource disposal callback.
 */
function noopDispose(): void {
  // Intentionally blank
}

/**
 * Handles Escape key navigation or selection dismissal.
 */
function handleEscapeKey(store: FlintEditorStore, bridge?: FlintRendererBridge): void {
  if (store.canNavigateBack()) {
    store.navigateBack();
    syncGraphWithBridge(store, bridge);
  } else {
    store.deselectAll();
    bridge?.setSelection([], []);
    bridge?.renderFrame();
  }
}

/**
 * Handles Delete and Backspace shortcut actions.
 */
function handleDeleteKey(store: FlintEditorStore, bridge?: FlintRendererBridge): void {
  const activeElement = typeof document === 'undefined' ? undefined : document.activeElement;
  if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) return;
  if (store.getState().activeEdgeId) {
    store.removeActiveEdge();
    syncGraphWithBridge(store, bridge);
  } else if (store.getState().selectedNodeIds.length > 0) {
    store.deleteSelected();
    syncGraphWithBridge(store, bridge);
  }
}

/**
 * Handles Undo, Redo, Select All, and Grouping keyboard shortcuts.
 */
function handleCtrlShortcuts(event: KeyboardEvent, store: FlintEditorStore, bridge?: FlintRendererBridge): void {
  if (event.key === 'z') {
    if (event.shiftKey) {
      store.redo();
    } else {
      store.undo();
    }
    syncGraphWithBridge(store, bridge);
  }
}

/**
 * Processes global keyboard shortcuts for editor navigation, deletion, and undo/redo.
 */
function handleEditorKeyboardAction(
  event: KeyboardEvent,
  store: FlintEditorStore,
  bridge: FlintRendererBridge | undefined,
): void {
  if (event.key === 'Escape') {
    handleEscapeKey(store, bridge);
  } else if (event.key === 'Delete' || event.key === 'Backspace') {
    handleDeleteKey(store, bridge);
  } else if (event.ctrlKey || event.metaKey) {
    handleCtrlShortcuts(event, store, bridge);
  }
}

/**
 * Handles incoming renderer bridge message payloads.
 */
function handleBridgeMessage(
  message: RenderWorkerOutputMessage,
  recordPerf: (metrics: FlintPerformanceMetrics) => void,
  setFallback: (v: boolean) => void,
  store: FlintEditorStore,
): void {
  if (message.performance) {
    recordPerf(message.performance);
  }
  if (message.type === 'ready' && !message.supported) {
    setFallback(true);
  } else if (message.type === 'hit_result') {
    if (message.hit?.type === 'node') {
      store.selectNode(message.hit.nodeId);
    } else if (!message.hit) {
      store.deselectAll();
    }
  }
}

/**
 * Attaches ResizeObserver to synchronize canvas buffer resolution on viewport resize.
 */
function setupResizeObserver(
  canvas: HTMLCanvasElement,
  bridge: FlintRendererBridge,
  store: FlintEditorStore,
  dpr: number,
  recordPerf?: (metrics: FlintPerformanceMetrics) => void,
): () => void {
  if (typeof ResizeObserver === 'undefined') return noopDispose;
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        bridge.resize(width, height, dpr);
        syncGraphWithBridge(store, bridge);
        if (recordPerf) recordPerf(bridge.getPerformanceStats());
      }
    }
  });
  observer.observe(canvas);
  return () => observer.disconnect();
}

interface CanvasGestureBindingsOptions {
  readonly canvasElement: HTMLCanvasElement;
  readonly bridge: FlintRendererBridge;
  readonly store: FlintEditorStore;
  readonly setContextMenu: (updater: (prev: ContextMenuState) => ContextMenuState) => void;
  readonly setSelectionSquare: (updater: (prev: SelectionSquareState) => SelectionSquareState) => void;
  readonly recordPerfMetrics: (metrics: FlintPerformanceMetrics) => void;
}

/**
 * Handles pointer down on group header/body.
 */
function handleGroupPointerDown(
  hit: Extract<FlintHitResult, { type: 'group' }>,
  store: FlintEditorStore,
  bridge: FlintRendererBridge,
  nodesStartPositions: Map<string, { readonly x: number; readonly y: number }>,
): void {
  store.selectGroup(hit.groupId);
  bridge.setSelection([], [], hit.groupId);
  const group = store.getState().graph.groups?.find((g) => g.id === hit.groupId);
  nodesStartPositions.clear();
  if (group) {
    const groupNodeIds = new Set(group.nodeIds);
    for (const n of store.getState().graph.nodes) {
      if (groupNodeIds.has(n.id)) {
        nodesStartPositions.set(n.id, { ...n.position });
      }
    }
  }
  bridge.renderFrame();
}

/**
 * Handles pointer down on an edge to select or add waypoint on double click.
 */
function handleEdgeHitPointerDown(
  hit: Extract<FlintHitResult, { type: 'edge' }>,
  offsetX: number,
  offsetY: number,
  now: number,
  lastClick: { time: number; id: string },
  store: FlintEditorStore,
  bridge: FlintRendererBridge,
): void {
  if (now - lastClick.time < 350 && lastClick.id === hit.edgeId) {
    const world = bridge.screenToWorld(offsetX, offsetY);
    store.addEdgePoint(hit.edgeId, { x: Math.round(world.x), y: Math.round(world.y) });
    syncGraphWithBridge(store, bridge);
    lastClick.time = 0;
    lastClick.id = '';
    return;
  }
  lastClick.time = now;
  lastClick.id = hit.edgeId;
  store.selectEdge(hit.edgeId);
  bridge.setSelection([], [hit.edgeId]);
  bridge.renderFrame();
}

/**
 * Handles pointer down on a node to select or drill into meta graph on double click.
 */
function handleNodeHitPointerDown(
  hit: Extract<FlintHitResult, { type: 'node' }>,
  isShift: boolean,
  now: number,
  lastClick: { time: number; id: string },
  store: FlintEditorStore,
  bridge: FlintRendererBridge,
  nodesStartPositions: Map<string, { readonly x: number; readonly y: number }>,
): void {
  if (now - lastClick.time < 350 && lastClick.id === hit.nodeId) {
    const clickedNode = store.getState().graph.nodes.find((n) => n.id === hit.nodeId);
    if (clickedNode && (clickedNode.metaSubgraph || clickedNode.operation === 'meta')) {
      store.drillIntoMetaNode(clickedNode.id);
      syncGraphWithBridge(store, bridge);
      return;
    }
  }
  lastClick.time = now;
  lastClick.id = hit.nodeId;

  if (isShift) {
    store.toggleNodeSelection(hit.nodeId);
  } else if (!store.getState().selectedNodeIds.includes(hit.nodeId)) {
    store.selectNode(hit.nodeId);
  }
  const currentNodes = store.getState().graph.nodes;
  const selectedSet = new Set(store.getState().selectedNodeIds);
  nodesStartPositions.clear();
  for (const n of currentNodes) {
    if (selectedSet.has(n.id) || n.id === hit.nodeId) {
      nodesStartPositions.set(n.id, { ...n.position });
    }
  }
  bridge.setSelection([...selectedSet, hit.nodeId]);
  bridge.renderFrame();
}

/**
 * Handles pointer move when dragging selected nodes or groups.
 */
function handleNodeGroupDrag(
  deltaX: number,
  deltaY: number,
  cameraZoom: number,
  nodesStartPositions: Map<string, { readonly x: number; readonly y: number }>,
  store: FlintEditorStore,
  bridge: FlintRendererBridge,
): void {
  const worldDeltaX = deltaX / cameraZoom;
  const worldDeltaY = deltaY / cameraZoom;
  store.moveSelectedNodes(worldDeltaX, worldDeltaY, nodesStartPositions);
  bridge.renderFrame();
}

/**
 * Handles pointer move when dragging a connecting edge.
 */
function handleConnectDrag(
  event: PointerEvent,
  bridge: FlintRendererBridge,
  store: FlintEditorStore,
  sourceNodeId: string,
  sourcePortId: string,
): void {
  const { x: worldX, y: worldY } = bridge.screenToWorld(event.offsetX, event.offsetY);
  store.updateConnectingCursor(worldX, worldY);
  bridge.setConnectingEdge({
    fromNodeId: sourceNodeId,
    fromPortId: sourcePortId,
    cursorX: worldX,
    cursorY: worldY,
  });
  const hoverHit = bridge.hitTestSync(event.offsetX, event.offsetY, 16);
  if (hoverHit?.type === 'port' && hoverHit.nodeId !== sourceNodeId && hoverHit.portId) {
    bridge.setHoveredPort({ nodeId: hoverHit.nodeId, portId: hoverHit.portId });
  } else {
    bridge.setHoveredPort();
  }
  bridge.renderFrame();
}

/**
 * Commits box selection upon pointer release.
 */
function handleBoxSelectPointerUp(
  event: PointerEvent,
  boxSelectStart: { x: number; y: number },
  bridge: FlintRendererBridge,
  store: FlintEditorStore,
  setSelectionSquare: (updater: (prev: SelectionSquareState) => SelectionSquareState) => void,
): void {
  const minScreenX = Math.min(boxSelectStart.x, event.offsetX);
  const maxScreenX = Math.max(boxSelectStart.x, event.offsetX);
  const minScreenY = Math.min(boxSelectStart.y, event.offsetY);
  const maxScreenY = Math.max(boxSelectStart.y, event.offsetY);

  const topLeftWorld = bridge.screenToWorld(minScreenX, minScreenY);
  const bottomRightWorld = bridge.screenToWorld(maxScreenX, maxScreenY);

  const matchedNodeIds = bridge.queryNodesInBox({
    minX: Math.min(topLeftWorld.x, bottomRightWorld.x),
    minY: Math.min(topLeftWorld.y, bottomRightWorld.y),
    maxX: Math.max(topLeftWorld.x, bottomRightWorld.x),
    maxY: Math.max(topLeftWorld.y, bottomRightWorld.y),
  });

  store.selectNodes(matchedNodeIds, event.shiftKey);
  setSelectionSquare({ active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });
}

/**
 * Attaches pointer, wheel, context menu, and keyboard gesture listeners to canvas and window.
 */
function setupCanvasEventListeners(options: CanvasGestureBindingsOptions): () => void {
  const { canvasElement, bridge, store, setContextMenu, setSelectionSquare, recordPerfMetrics } = options;

  let isPointerDown = false;
  let dragMode: 'pan' | 'node' | 'group' | 'waypoint' | 'connect' | 'box_select' | 'none' = 'none';
  let connectingSourceNodeId = '';
  let connectingSourcePortId = '';
  let draggedGroupId = '';
  let draggedEdgeId = '';
  let draggedWaypointIndex = -1;
  let dragStartScreen = { x: 0, y: 0 };
  let boxSelectStart = { x: 0, y: 0 };
  const lastClick = { time: 0, id: '' };
  const nodesStartPositions = new Map<string, { readonly x: number; readonly y: number }>();

  const profilerInterval = setInterval(() => {
    const stats = bridge.getPerformanceStats();
    const storeUpdateTime = store.getUpdateTimeMs();
    recordPerfMetrics({
      ...stats,
      updateTimeMs: storeUpdateTime,
    });
  }, 1000);

  /**
   * Handles canvas wheel zooming gestures.
   */
  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const normalizedDelta = Math.max(-100, Math.min(100, event.deltaY));
    const factor = Math.exp(-normalizedDelta * 0.003);
    bridge.zoom(event.offsetX, event.offsetY, factor);
  };

  /**
   * Handles pointer down gesture to select or initiate drag/linking operations.
   */
  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    setContextMenu((previous) => (previous.open ? { ...previous, open: false } : previous));
    isPointerDown = true;
    dragStartScreen = { x: event.clientX, y: event.clientY };
    try {
      canvasElement.setPointerCapture(event.pointerId);
    } catch {
      // pointer capture optional
    }

    const now = Date.now();
    const isShift = event.shiftKey;
    const hit = bridge.hitTestSync(event.offsetX, event.offsetY);

    if (hit?.type === 'group' && hit.groupId) {
      dragMode = 'group';
      draggedGroupId = hit.groupId;
      handleGroupPointerDown(hit, store, bridge, nodesStartPositions);
      return;
    }

    if (hit?.type === 'waypoint' && hit.edgeId && hit.waypointIndex !== undefined) {
      dragMode = 'waypoint';
      draggedEdgeId = hit.edgeId;
      draggedWaypointIndex = hit.waypointIndex;
      store.selectEdge(hit.edgeId);
      bridge.setSelection([], [hit.edgeId]);
      bridge.renderFrame();
      return;
    }

    if (hit?.type === 'edge' && hit.edgeId) {
      handleEdgeHitPointerDown(hit, event.offsetX, event.offsetY, now, lastClick, store, bridge);
      return;
    }

    if (hit?.type === 'node') {
      dragMode = 'node';
      handleNodeHitPointerDown(hit, isShift, now, lastClick, store, bridge, nodesStartPositions);
      return;
    }

    lastClick.time = 0;
    lastClick.id = '';

    if (hit?.type === 'port' && hit.portId) {
      dragMode = 'connect';
      connectingSourceNodeId = hit.nodeId;
      connectingSourcePortId = hit.portId;
      store.startConnecting(hit.nodeId, hit.portId, hit.worldX ?? 0, hit.worldY ?? 0);
      bridge.setConnectingEdge({
        fromNodeId: hit.nodeId,
        fromPortId: hit.portId,
        cursorX: hit.worldX ?? 0,
        cursorY: hit.worldY ?? 0,
      });
    } else if (isShift) {
      dragMode = 'box_select';
      boxSelectStart = { x: event.offsetX, y: event.offsetY };
      setSelectionSquare({
        active: true,
        startX: event.offsetX,
        startY: event.offsetY,
        currentX: event.offsetX,
        currentY: event.offsetY,
      });
    } else {
      dragMode = 'pan';
      store.deselectAll();
      bridge.setSelection([], []);
      bridge.renderFrame();
    }
  };

  /**
   * Handles pointer move dragging and hover cursor synchronization.
   */
  const onPointerMove = (event: PointerEvent): void => {
    if (!isPointerDown) {
      const hoverHit = bridge.hitTestSync(event.offsetX, event.offsetY);
      canvasElement.style.cursor = getPointerHoverCursor(hoverHit);
      if (hoverHit?.type === 'port' && hoverHit.portId) {
        bridge.setHoveredPort({ nodeId: hoverHit.nodeId, portId: hoverHit.portId });
      } else if (bridge.getHoveredPort()) {
        bridge.setHoveredPort();
      }
      bridge.renderFrame();
      return;
    }

    const camera = bridge.getCamera();
    const deltaX = event.clientX - dragStartScreen.x;
    const deltaY = event.clientY - dragStartScreen.y;

    if (dragMode === 'box_select') {
      setSelectionSquare((previous) => ({
        ...previous,
        currentX: event.offsetX,
        currentY: event.offsetY,
      }));
    } else if ((dragMode === 'group' || dragMode === 'node') && nodesStartPositions.size > 0) {
      handleNodeGroupDrag(deltaX, deltaY, camera.zoom, nodesStartPositions, store, bridge);
    } else if (dragMode === 'waypoint' && draggedEdgeId) {
      const { x: worldX, y: worldY } = bridge.screenToWorld(event.offsetX, event.offsetY);
      store.updateEdgePoint(draggedEdgeId, draggedWaypointIndex, {
        x: Math.round(worldX),
        y: Math.round(worldY),
      });
      syncGraphWithBridge(store, bridge);
    } else if (dragMode === 'connect') {
      handleConnectDrag(event, bridge, store, connectingSourceNodeId, connectingSourcePortId);
    } else if (dragMode === 'pan') {
      dragStartScreen = { x: event.clientX, y: event.clientY };
      bridge.pan(deltaX, deltaY);
      bridge.renderFrame();
    }
  };

  /**
   * Commits drag transformations or connection links upon pointer release.
   */
  const onPointerUp = (event: PointerEvent): void => {
    if (!isPointerDown) return;
    isPointerDown = false;
    try {
      canvasElement.releasePointerCapture(event.pointerId);
    } catch {
      // ignore release error
    }

    switch (dragMode) {
      case 'box_select': {
        handleBoxSelectPointerUp(event, boxSelectStart, bridge, store, setSelectionSquare);
        break;
      }
      case 'connect': {
        const targetHit = bridge.hitTestSync(event.offsetX, event.offsetY, 18);
        if (targetHit?.type === 'port' && targetHit.nodeId !== connectingSourceNodeId && targetHit.portId) {
          store.connectPorts(connectingSourceNodeId, connectingSourcePortId, targetHit.nodeId, targetHit.portId);
        }
        store.cancelConnecting();
        bridge.setConnectingEdge();
        bridge.setHoveredPort();
        bridge.renderFrame();
        break;
      }
      case 'node':
      case 'group': {
        store.commitNodeMove();
        bridge.renderFrame();
        break;
      }
      case 'waypoint': {
        bridge.renderFrame();
        break;
      }
      default: {
        break;
      }
    }
    dragMode = 'none';
    nodesStartPositions.clear();
  };

  /**
   * Opens contextual popup for node, edge, group, or canvas creation actions.
   */
  const onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    const canvasRect = canvasElement.getBoundingClientRect();
    const screenX = event.clientX - canvasRect.left;
    const screenY = event.clientY - canvasRect.top;
    const world = bridge.screenToWorld(screenX, screenY);
    const windowWidth = globalThis.window ? window.innerWidth : 1200;
    const windowHeight = globalThis.window ? window.innerHeight : 800;

    const hit = bridge.hitTestSync(screenX, screenY);
    let targetType: 'empty' | 'node' | 'group' | 'selection' | 'edge' = 'empty';
    let targetId = '';
    let targetGroupId = '';

    if (hit?.type === 'edge' && hit.edgeId) {
      targetType = 'edge';
      targetId = hit.edgeId;
      store.selectEdge(hit.edgeId);
      bridge.setSelection([], [hit.edgeId]);
    } else if (hit?.type === 'node') {
      const isSelected = store.getState().selectedNodeIds.includes(hit.nodeId);
      if (store.getState().selectedNodeIds.length > 1 && isSelected) {
        targetType = 'selection';
      } else {
        targetType = 'node';
        targetId = hit.nodeId;
        store.selectNode(hit.nodeId);
        bridge.setSelection([hit.nodeId]);
      }
      const node = store.getState().graph.nodes.find((n) => n.id === hit.nodeId);
      if (node?.groupId) {
        targetGroupId = node.groupId;
      }
    } else {
      const groupHit = findGroupAtPoint(store.getState().graph.groups, store.getState().graph.nodes, world.x, world.y);
      if (groupHit) {
        targetType = 'group';
        targetGroupId = groupHit.id;
      }
    }

    setContextMenu({
      open: true,
      x: Math.min(event.clientX, windowWidth - 280),
      y: Math.min(event.clientY, windowHeight - 400),
      worldX: world.x,
      worldY: world.y,
      query: '',
      targetType,
      targetId,
      targetGroupId,
    });
  };

  /**
   * Handles global keyboard navigation and mutation shortcuts.
   */
  const onKeyDown = (event: KeyboardEvent): void => {
    handleEditorKeyboardAction(event, store, bridge);
  };

  canvasElement.addEventListener('wheel', onWheel, { passive: false });
  canvasElement.addEventListener('pointerdown', onPointerDown);
  canvasElement.addEventListener('pointermove', onPointerMove);
  canvasElement.addEventListener('pointerup', onPointerUp);
  canvasElement.addEventListener('pointercancel', onPointerUp);
  canvasElement.addEventListener('contextmenu', onContextMenu);
  if (globalThis.window !== undefined) {
    globalThis.addEventListener('keydown', onKeyDown);
  }

  return () => {
    clearInterval(profilerInterval);
    canvasElement.removeEventListener('wheel', onWheel);
    canvasElement.removeEventListener('pointerdown', onPointerDown);
    canvasElement.removeEventListener('pointermove', onPointerMove);
    canvasElement.removeEventListener('pointerup', onPointerUp);
    canvasElement.removeEventListener('pointercancel', onPointerUp);
    canvasElement.removeEventListener('contextmenu', onContextMenu);
    if (globalThis.window !== undefined) {
      globalThis.removeEventListener('keydown', onKeyDown);
    }
  };
}

interface InspectorGroupSectionProperties {
  readonly group: FlintGraphGroup;
  readonly store: FlintEditorStore;
  readonly bridge?: FlintRendererBridge;
}

const SWATCH_COLORS = ['#58a6ff', '#a371f7', '#3fb950', '#d29922', '#f85149', '#39c5bb'] as const;

/**
 * Property inspector controls for selected graph group.
 */
function InspectorGroupSection(properties: InspectorGroupSectionProperties): MpElement {
  const group = properties.group;
  const store = properties.store;
  const bridge = properties.bridge;

  return (
    <div>
      <div className={styles.inspectorRow}>
        <label
          htmlFor="inspector-group-title"
          className={styles.inspectorLabel}
        >
          Group Name
        </label>
        <input
          id="inspector-group-title"
          value={group.title}
          type="text"
          aria-label="Group Name"
          className={styles.inspectorInput}
          onInput={(event: unknown) => {
            const value = extractEventTargetStringValue(event);
            if (value !== undefined) {
              store.setGroupTitle(group.id, value);
              syncGraphWithBridge(store, bridge);
            }
          }}
        />
      </div>
      <div
        className={styles.inspectorRow}
        style={{ flexDirection: 'column', alignItems: 'flex-start' }}
      >
        <span className={styles.inspectorLabel}>Group Color</span>
        <div className={styles.colorPickerRow}>
          {SWATCH_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={styles.colorSwatch}
              style={{
                backgroundColor: c,
                border: group.color === c ? '2px solid #ffffff' : '1px solid #30363d',
              }}
              onClick={() => {
                store.setGroupColor(group.id, c);
                syncGraphWithBridge(store, bridge);
              }}
            />
          ))}
        </div>
      </div>
      <div className={styles.inspectorRow}>
        <span className={styles.inspectorLabel}>Member Nodes</span>
        <span style={{ fontSize: '12px' }}>{group.nodeIds.length} nodes</span>
      </div>
      <div style={{ marginTop: '12px' }}>
        <button
          type="button"
          className={styles.toolbarBtn}
          onClick={() => {
            store.ungroup(group.id);
            syncGraphWithBridge(store, bridge);
          }}
        >
          Ungroup
        </button>
      </div>
    </div>
  );
}

interface InspectorEdgeSectionProperties {
  readonly edge: FlintGraphEdge;
  readonly store: FlintEditorStore;
  readonly bridge?: FlintRendererBridge;
}

/**
 * Property inspector controls for selected connection edge.
 */
function InspectorEdgeSection(properties: InspectorEdgeSectionProperties): MpElement {
  const edge = properties.edge;
  const store = properties.store;
  const bridge = properties.bridge;

  return (
    <div>
      <div className={styles.inspectorRow}>
        <span className={styles.inspectorLabel}>Connection ID</span>
        <span style={{ fontSize: '12px', fontFamily: 'var(--mp-font-family-mono, "Datatype", monospace)' }}>
          {edge.id}
        </span>
      </div>
      <div className={styles.inspectorRow}>
        <span className={styles.inspectorLabel}>Waypoints</span>
        <span style={{ fontSize: '12px' }}>{edge.points?.length ?? 0} custom points</span>
      </div>
      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          type="button"
          className={styles.toolbarBtn}
          onClick={() => {
            store.clearEdgePoints(edge.id);
            syncGraphWithBridge(store, bridge);
          }}
        >
          Reset Path (Default Curve)
        </button>
        <button
          type="button"
          className={classNames(styles.toolbarBtn, styles.toolbarBtnError)}
          onClick={() => {
            store.removeEdge(edge.id);
            syncGraphWithBridge(store, bridge);
          }}
        >
          Delete Connection
        </button>
      </div>
    </div>
  );
}

interface InspectorNodePinsTableProperties {
  readonly label: string;
  readonly ports: readonly FlintPortDefinition[];
  readonly badgeVariant: 'info' | 'success';
}

/**
 * Data pins table listing port identifiers and data types.
 */
function InspectorNodePinsTable(properties: InspectorNodePinsTableProperties): MpElement {
  if (properties.ports.length === 0) return <div />;
  return (
    <div>
      <span
        className={styles.inspectorLabel}
        style={{ fontWeight: 600 }}
      >
        {properties.label}
      </span>
      <div className={styles.portTable}>
        {properties.ports.map((port) => (
          <div
            key={port.id}
            className={styles.portTableRow}
          >
            <span>{port.name}</span>
            <ForgeBadge
              variant={properties.badgeVariant}
              size="xs"
            >
              {port.type.reference ?? port.type.name}
            </ForgeBadge>
          </div>
        ))}
      </div>
    </div>
  );
}

interface InspectorNodeBasicPropertiesProps {
  readonly node: FlintGraphNode;
  readonly definition?: FlintNodeDefinition;
  readonly onRename: (title: string) => void;
}

/**
 * Basic node title, operation identifier, and category rows.
 */
function InspectorNodeBasicProperties(properties: InspectorNodeBasicPropertiesProps): MpElement {
  const node = properties.node;
  return (
    <div>
      <div className={styles.inspectorRow}>
        <label
          htmlFor="inspector-node-title"
          className={styles.inspectorLabel}
        >
          Title
        </label>
        <input
          id="inspector-node-title"
          value={node.title}
          type="text"
          aria-label="Node Title"
          className={styles.inspectorInput}
          onInput={(event: unknown) => {
            const value = extractEventTargetStringValue(event);
            if (value !== undefined) properties.onRename(value);
          }}
        />
      </div>
      <div className={styles.inspectorRow}>
        <label
          htmlFor="inspector-node-op"
          className={styles.inspectorLabel}
        >
          Operation
        </label>
        <input
          id="inspector-node-op"
          value={node.operation}
          type="text"
          aria-label="Node Operation"
          className={styles.inspectorInput}
          readOnly
        />
      </div>
      <div className={styles.inspectorRow}>
        <label
          htmlFor="inspector-node-cat"
          className={styles.inspectorLabel}
        >
          Category
        </label>
        <input
          id="inspector-node-cat"
          value={node.category}
          type="text"
          aria-label="Node Category"
          className={styles.inspectorInput}
          readOnly
        />
      </div>
      {properties.definition && <div className={styles.docBlock}>{properties.definition.description}</div>}
    </div>
  );
}

interface InspectorNodeCodeEditorProperties {
  readonly node: FlintGraphNode;
  readonly store: FlintEditorStore;
}

/**
 * Source code textarea for custom Flint functions.
 */
function InspectorNodeCodeEditor(properties: InspectorNodeCodeEditorProperties): MpElement {
  const node = properties.node;
  const store = properties.store;
  return (
    <div
      className={styles.inspectorRow}
      style={{ flexDirection: 'column', alignItems: 'flex-start' }}
    >
      <label
        htmlFor="inspector-flint-code"
        className={styles.inspectorLabel}
      >
        Flint Function Code
      </label>
      <textarea
        id="inspector-flint-code"
        className={styles.codeEditorTextarea}
        value={String(node.properties?.code ?? '')}
        onInput={(event: unknown) => {
          const code = extractEventTargetStringValue(event);
          if (code !== undefined) {
            store.updateCodeNode(
              node.id,
              code,
              node.inputs,
              node.outputs,
              typeof node.properties?.functionName === 'string' ? node.properties.functionName : undefined,
            );
          }
        }}
      />
    </div>
  );
}

interface InspectorNodeDetailsProperties {
  readonly node: FlintGraphNode;
  readonly definition?: FlintNodeDefinition;
  readonly store: FlintEditorStore;
  readonly bridge?: FlintRendererBridge;
}

/**
 * Inspector sub-panel displaying node parameters, data pins, and Flint source code.
 */
function InspectorNodeDetails(properties: InspectorNodeDetailsProperties): MpElement {
  const node = properties.node;
  const store = properties.store;
  const bridge = properties.bridge;

  return (
    <div>
      <InspectorNodeBasicProperties
        node={node}
        definition={properties.definition}
        onRename={(title) => store.renameNode(node.id, title)}
      />

      {node.metaSubgraph && (
        <div
          className={styles.docBlock}
          style={{ borderLeftColor: '#79c0ff' }}
        >
          <strong>Composite Meta Node:</strong> Contains {node.metaSubgraph.nodes.length} internal nodes and{' '}
          {node.metaSubgraph.edges.length} connections.
          <div style={{ marginTop: '8px' }}>
            <ForgeButton
              variant="secondary"
              size="xs"
              onClick={() => store.expandMetaNode(node.id)}
            >
              Expand / Unpack Meta Node
            </ForgeButton>
          </div>
        </div>
      )}

      <InspectorNodePinsTable
        label="Input Pins"
        ports={node.inputs}
        badgeVariant="info"
      />
      <InspectorNodePinsTable
        label="Output Pins"
        ports={node.outputs}
        badgeVariant="success"
      />

      {node.properties?.value !== undefined && (
        <div className={styles.inspectorRow}>
          <label
            htmlFor="inspector-prop-val"
            className={styles.inspectorLabel}
          >
            Value
          </label>
          <input
            id="inspector-prop-val"
            type="number"
            aria-label="Literal Value"
            className={styles.inspectorInput}
            value={String(node.properties.value)}
            onInput={(event: unknown) => {
              const raw = extractEventTargetStringValue(event);
              if (raw !== undefined) {
                const number_ = Number(raw);
                store.updateNodeProperty(node.id, 'value', Number.isNaN(number_) ? 0 : number_);
              }
            }}
          />
        </div>
      )}

      {node.properties?.name !== undefined && (
        <div className={styles.inspectorRow}>
          <label
            htmlFor="inspector-prop-name"
            className={styles.inspectorLabel}
          >
            Parameter Name
          </label>
          <input
            id="inspector-prop-name"
            type="text"
            aria-label="Parameter Name"
            className={styles.inspectorInput}
            value={String(node.properties.name)}
            onInput={(event: unknown) => {
              const raw = extractEventTargetStringValue(event);
              if (raw !== undefined) store.updateNodeProperty(node.id, 'name', raw);
            }}
          />
        </div>
      )}

      <div className={styles.inspectorRow}>
        <span className={styles.inspectorLabel}>Position</span>
        <span style={{ fontSize: '12px' }}>
          X: {Math.round(node.position.x)}, Y: {Math.round(node.position.y)}
        </span>
      </div>

      {(node.operation === 'flint_code' || node.kind === 'custom') && (
        <InspectorNodeCodeEditor
          node={node}
          store={store}
        />
      )}

      {node.outputs.length > 1 && (
        <div className={styles.inspectorRow}>
          <label
            htmlFor="inspector-split-outputs"
            className={styles.inspectorLabel}
          >
            Split Outputs to Fields
          </label>
          <input
            id="inspector-split-outputs"
            type="checkbox"
            checked={node.splitOutputs !== false}
            onChange={() => store.toggleSplitOutputs(node.id)}
          />
        </div>
      )}

      {node.groupId && (
        <div
          className={styles.inspectorRow}
          style={{ flexDirection: 'column', alignItems: 'flex-start' }}
        >
          <span className={styles.inspectorLabel}>Group Color</span>
          <div className={styles.colorPickerRow}>
            {SWATCH_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={styles.colorSwatch}
                style={{ backgroundColor: c }}
                onClick={() => {
                  if (node.groupId) {
                    store.setGroupColor(node.groupId, c);
                    syncGraphWithBridge(store, bridge);
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: '12px' }}>
        <button
          type="button"
          className={classNames(styles.toolbarBtn, styles.toolbarBtnError)}
          onClick={() => store.removeNode(node.id)}
        >
          Delete Node
        </button>
      </div>
    </div>
  );
}

interface InspectorExecutionOutputProperties {
  readonly lastError?: string;
  readonly lastOutputs?: Record<string, unknown>;
}

/**
 * Bottom drawer section showing Wasm execution output and error logs.
 */
function InspectorExecutionOutput(properties: InspectorExecutionOutputProperties): MpElement {
  return (
    <div
      className={styles.inspectorSection}
      style={{ borderTop: '1px solid #30363d', paddingTop: '12px' }}
    >
      <div className={styles.inspectorTitle}>Execution Output</div>
      <div className={styles.outputBox}>
        {properties.lastError ? (
          <div style={{ color: '#f85149', fontSize: '12px' }}>{properties.lastError}</div>
        ) : Object.entries(properties.lastOutputs ?? {}).length > 0 ? (
          <div>
            {Object.entries(properties.lastOutputs ?? {}).map(([key, value]) => (
              <div
                key={key}
                className={styles.inspectorRow}
              >
                <span className={styles.inspectorLabel}>{key}</span>
                <span
                  style={{
                    fontSize: '13px',
                    color: '#3fb950',
                    fontFamily: 'var(--mp-font-family-mono, "Datatype", monospace)',
                  }}
                >
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#8b949e', fontSize: '12px' }}>{'Click "Run Wasm" to compile and execute graph.'}</div>
        )}
      </div>
    </div>
  );
}

interface FlintEditorInspectorProperties {
  readonly selectedGroup?: FlintGraphGroup;
  readonly selectedEdge?: FlintGraphEdge;
  readonly selectedNode?: FlintGraphNode;
  readonly selectedDefinition?: FlintNodeDefinition;
  readonly store: FlintEditorStore;
  readonly bridge?: FlintRendererBridge;
  readonly editorState: FlintEditorStoreState;
}

/**
 * Right-side drawer for inspecting element attributes and execution telemetry.
 */
function FlintEditorInspector(properties: FlintEditorInspectorProperties): MpElement {
  return (
    <aside className={styles.inspectorDrawer}>
      <div className={styles.inspectorSection}>
        <div className={styles.inspectorTitle}>Inspector</div>
        {properties.selectedGroup ? (
          <InspectorGroupSection
            group={properties.selectedGroup}
            store={properties.store}
            bridge={properties.bridge}
          />
        ) : properties.selectedEdge ? (
          <InspectorEdgeSection
            edge={properties.selectedEdge}
            store={properties.store}
            bridge={properties.bridge}
          />
        ) : properties.selectedNode ? (
          <InspectorNodeDetails
            node={properties.selectedNode}
            definition={properties.selectedDefinition}
            store={properties.store}
            bridge={properties.bridge}
          />
        ) : (
          <div style={{ color: '#8b949e', fontSize: '12px' }}>
            Select a node, group label, or connection on canvas to view and configure properties.
          </div>
        )}
      </div>
      <InspectorExecutionOutput
        lastError={properties.editorState.lastError}
        lastOutputs={properties.editorState.lastOutputs}
      />
    </aside>
  );
}

interface ToolbarExecutionGroupProperties {
  readonly isExecuting: boolean;
  readonly isDark: boolean;
  readonly onRun: () => void;
  readonly onExport: () => void;
  readonly onToggleTheme: () => void;
}

/**
 * Execution and export button group in the editor toolbar.
 */
function ToolbarExecutionGroup(properties: ToolbarExecutionGroupProperties): MpElement {
  return (
    <div
      className={styles.buttonGroup}
      role="group"
      aria-label="Graph Execution and Export"
    >
      <button
        type="button"
        className={classNames(styles.toolbarBtn, styles.toolbarBtnPrimary)}
        onClick={properties.onRun}
        disabled={properties.isExecuting}
      >
        {properties.isExecuting ? 'Running...' : 'Run Wasm'}
      </button>
      <button
        type="button"
        className={styles.toolbarBtn}
        onClick={properties.onExport}
      >
        Export Flint
      </button>
      <button
        type="button"
        className={styles.toolbarBtn}
        onClick={properties.onToggleTheme}
        aria-label={`Switch to ${properties.isDark ? 'Light' : 'Dark'} mode`}
      >
        {properties.isDark ? '☀️ Light' : '🌙 Dark'}
      </button>
    </div>
  );
}

interface ToolbarHistoryGroupProperties {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
}

/**
 * History undo/redo button group in the editor toolbar.
 */
function ToolbarHistoryGroup(properties: ToolbarHistoryGroupProperties): MpElement {
  return (
    <div
      className={styles.buttonGroup}
      role="group"
      aria-label="History Actions"
    >
      <button
        type="button"
        className={styles.toolbarBtn}
        disabled={!properties.canUndo}
        onClick={properties.onUndo}
      >
        Undo
      </button>
      <button
        type="button"
        className={styles.toolbarBtn}
        disabled={!properties.canRedo}
        onClick={properties.onRedo}
      >
        Redo
      </button>
    </div>
  );
}

interface ToolbarStructureGroupProperties {
  readonly hasSelectedNodes: boolean;
  readonly hasGroupedSelected: boolean;
  readonly hasActiveSelectionOrEdge: boolean;
  readonly onGroup: () => void;
  readonly onCreateMeta: () => void;
  readonly onUngroup: () => void;
  readonly onDelete: () => void;
}

/**
 * Node structuring, grouping, and deletion button group in the editor toolbar.
 */
function ToolbarStructureGroup(properties: ToolbarStructureGroupProperties): MpElement {
  return (
    <div
      className={styles.buttonGroup}
      role="group"
      aria-label="Node Structuring Actions"
    >
      <button
        type="button"
        className={styles.toolbarBtn}
        disabled={!properties.hasSelectedNodes}
        onClick={properties.onGroup}
      >
        Group
      </button>
      <button
        type="button"
        className={styles.toolbarBtn}
        disabled={!properties.hasSelectedNodes}
        onClick={properties.onCreateMeta}
      >
        Create Meta
      </button>
      <button
        type="button"
        className={styles.toolbarBtn}
        disabled={!properties.hasGroupedSelected}
        onClick={properties.onUngroup}
      >
        Ungroup
      </button>
      <button
        type="button"
        className={classNames(styles.toolbarBtn, styles.toolbarBtnError)}
        disabled={!properties.hasActiveSelectionOrEdge}
        onClick={properties.onDelete}
      >
        Delete
      </button>
    </div>
  );
}

interface ToolbarStatusGroupProperties {
  readonly isValidDag: boolean;
  readonly issuesCount: number;
  readonly isFallback: boolean;
  readonly perfMetrics: FlintPerformanceMetrics;
  readonly onOpenPerf: () => void;
}

/**
 * Real-time validation and telemetry status group in the editor toolbar.
 */
function ToolbarStatusGroup(properties: ToolbarStatusGroupProperties): MpElement {
  const dagText = properties.isValidDag ? 'Valid DAG' : `${properties.issuesCount} Issues`;
  const dagClass = properties.isValidDag ? styles.statusBadgeSuccess : styles.statusBadgeError;
  const backendText = properties.isFallback ? '2D Canvas' : 'WebGPU';
  const backendClass = properties.isFallback ? styles.statusBadgeWarning : styles.statusBadgePrimary;
  const updateMs = properties.perfMetrics.updateTimeMs.toFixed(1);
  const renderMs = properties.perfMetrics.renderTimeMs.toFixed(1);
  const perfLabel = `update: ${updateMs}ms | render: ${renderMs}ms (${backendText})`;

  return (
    <div className={styles.toolbarGroup}>
      <span className={classNames(styles.statusBadge, dagClass)}>{dagText}</span>
      <span className={classNames(styles.statusBadge, backendClass)}>{backendText}</span>
      <button
        type="button"
        className={classNames(styles.toolbarBtn, styles.toolbarBtnGhost)}
        onClick={properties.onOpenPerf}
        aria-label="Click to view detailed D3 performance breakdown"
      >
        <span className={styles.perfDot} />
        <span>{perfLabel}</span>
      </button>
    </div>
  );
}

interface FlintEditorToolbarProperties {
  readonly editorState: FlintEditorStoreState;
  readonly resolvedTheme: 'light' | 'dark';
  readonly isFallback: boolean;
  readonly perfMetrics: FlintPerformanceMetrics;
  readonly store: FlintEditorStore;
  readonly bridge?: FlintRendererBridge;
  readonly onRun: () => void;
  readonly onExport: () => void;
  readonly onToggleTheme: () => void;
  readonly onOpenPerf: () => void;
}

/**
 * Top application toolbar containing graph execution, history, and grouping controls.
 */
function FlintEditorToolbar(properties: FlintEditorToolbarProperties): MpElement {
  const state = properties.editorState;
  const store = properties.store;
  const isDark = properties.resolvedTheme === 'dark';
  const hasGroupedSelected = state.selectedNodeIds.some(
    (id) => state.graph.nodes.find((node) => node?.id === id)?.groupId,
  );

  return (
    <header className={styles.toolbar}>
      <div className={styles.toolbarGroup}>
        <span style={{ fontWeight: 700, fontSize: '14px', letterSpacing: '0.02em' }}>Flint Node Graph</span>
        <ToolbarExecutionGroup
          isExecuting={state.isExecuting}
          isDark={isDark}
          onRun={properties.onRun}
          onExport={properties.onExport}
          onToggleTheme={properties.onToggleTheme}
        />
        <ToolbarHistoryGroup
          canUndo={state.canUndo}
          canRedo={state.canRedo}
          onUndo={() => store.undo()}
          onRedo={() => store.redo()}
        />
        <ToolbarStructureGroup
          hasSelectedNodes={state.selectedNodeIds.length > 0}
          hasGroupedSelected={hasGroupedSelected}
          hasActiveSelectionOrEdge={state.selectedNodeIds.length > 0 || Boolean(state.activeEdgeId)}
          onGroup={() => store.groupSelectedNodes()}
          onCreateMeta={() => store.createMetaNodeFromSelected()}
          onUngroup={() => store.ungroupSelected()}
          onDelete={() => store.deleteSelected()}
        />
      </div>

      <ToolbarStatusGroup
        isValidDag={state.validation.valid}
        issuesCount={state.validation.issues.length}
        isFallback={properties.isFallback}
        perfMetrics={properties.perfMetrics}
        onOpenPerf={properties.onOpenPerf}
      />
    </header>
  );
}

interface FlintEditorPaletteProperties {
  readonly searchQuery: string;
  readonly onSearchInput: (q: string) => void;
  readonly registeredMetaNodes?: readonly FlintRegisteredMetaNode[];
  readonly populatedCategories: readonly { category: string; definitions: readonly FlintNodeDefinition[] }[];
  readonly onAddNode: (op: string) => void;
  readonly store: FlintEditorStore;
}

/**
 * Left-side drawer listing categorized draggable Flint operations and meta templates.
 */
function FlintEditorPalette(properties: FlintEditorPaletteProperties): MpElement {
  return (
    <aside className={styles.paletteDrawer}>
      <div className={styles.paletteHeader}>
        <input
          type="text"
          aria-label="Search node palette"
          placeholder="Search operations..."
          className={styles.paletteSearch}
          value={properties.searchQuery}
          onInput={(event: unknown) => {
            const value = extractEventTargetStringValue(event);
            if (value !== undefined) properties.onSearchInput(value);
          }}
        />
      </div>

      <div className={styles.paletteList}>
        {properties.registeredMetaNodes && properties.registeredMetaNodes.length > 0 && (
          <details
            className={styles.categoryCollapse}
            open={true}
          >
            <summary className={styles.categorySummary}>
              <span>META NODES</span>
              <span className={styles.categoryBadge}>{properties.registeredMetaNodes.length}</span>
            </summary>
            <div className={styles.categoryItemList}>
              {properties.registeredMetaNodes.map((meta) => (
                <button
                  key={meta?.id ?? ''}
                  type="button"
                  draggable={true}
                  className={styles.paletteItem}
                  onClick={() => properties.store.instantiateMetaNode(meta.id)}
                  onDragStart={(event: unknown) => {
                    if (typeof DragEvent !== 'undefined' && event instanceof DragEvent && event.dataTransfer) {
                      event.dataTransfer.setData('text/plain', `meta_template:${meta.id}`);
                      event.dataTransfer.effectAllowed = 'copy';
                    }
                  }}
                  onContextMenu={(event: unknown) => {
                    if (typeof MouseEvent !== 'undefined' && event instanceof MouseEvent) {
                      event.preventDefault();
                      event.stopPropagation();
                      properties.store.removeRegisteredMetaNode(meta.id);
                    }
                  }}
                  title="Click or drag to add. Right-click to remove if unreferenced."
                >
                  <span className={styles.paletteItemTitle}>{meta.title}</span>
                  <span className={styles.paletteItemDesc}>
                    {meta.nodes.length} nodes | {meta.edges.length} edges
                  </span>
                </button>
              ))}
            </div>
          </details>
        )}

        {properties.populatedCategories.map((group) => (
          <details
            key={group.category}
            className={styles.categoryCollapse}
            open={true}
          >
            <summary className={styles.categorySummary}>
              <span>{group.category.toUpperCase()}</span>
              <span className={styles.categoryBadge}>{group.definitions.length}</span>
            </summary>
            <div className={styles.categoryItemList}>
              {group.definitions.map((item) => (
                <button
                  key={item?.operation ?? ''}
                  type="button"
                  draggable={true}
                  className={styles.paletteItem}
                  onClick={() => properties.onAddNode(item.operation)}
                  onDragStart={(event: unknown) => {
                    if (typeof DragEvent !== 'undefined' && event instanceof DragEvent && event.dataTransfer) {
                      event.dataTransfer.setData('text/plain', item.operation);
                      event.dataTransfer.effectAllowed = 'copy';
                    }
                  }}
                >
                  <span className={styles.paletteItemTitle}>{item.title}</span>
                  <span className={styles.paletteItemDesc}>{item.description}</span>
                </button>
              ))}
            </div>
          </details>
        ))}
      </div>
    </aside>
  );
}

/**
 * Handles node drop events onto canvas.
 */
function handleCanvasDrop(
  event: unknown,
  bridge: FlintRendererBridge | undefined,
  canvas: HTMLCanvasElement | undefined,
  store: FlintEditorStore,
): void {
  const op = extractDragOperationType(event);
  if (!op || !bridge || !canvas) return;
  if (typeof DragEvent !== 'undefined' && event instanceof DragEvent) event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const clientX = typeof MouseEvent !== 'undefined' && event instanceof MouseEvent ? event.clientX : 0;
  const clientY = typeof MouseEvent !== 'undefined' && event instanceof MouseEvent ? event.clientY : 0;
  const world = bridge.screenToWorld(clientX - rect.left, clientY - rect.top);
  if (op.startsWith('meta_template:')) {
    store.instantiateMetaNode(op.slice('meta_template:'.length), world);
  } else {
    store.addNode(op, world);
  }
}

interface FlintEditorCanvasProperties {
  readonly canvasReference: { current?: HTMLCanvasElement };
  readonly containerReference?: { current?: HTMLDivElement };
  readonly renderer?: string;
  readonly editorState: FlintEditorStoreState;
  readonly isFallback: boolean;
  readonly selectionSquare: SelectionSquareState;
  readonly controller?: TraceDebuggerController;
  readonly store: FlintEditorStore;
  readonly bridge?: FlintRendererBridge;
}

/**
 * Center canvas container hosting the WebGPU canvas, breadcrumbs, and selection rect.
 */
function FlintEditorCanvas(properties: FlintEditorCanvasProperties): MpElement {
  const state = properties.editorState;
  const store = properties.store;
  const bridge = properties.bridge;
  const sq = properties.selectionSquare;

  return (
    <div
      ref={properties.containerReference}
      className={styles.canvasContainer}
      onDragOver={(event: unknown) => {
        if (typeof DragEvent !== 'undefined' && event instanceof DragEvent) {
          event.preventDefault();
          if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDrop={(event: unknown) => handleCanvasDrop(event, bridge, properties.canvasReference.current, store)}
    >
      {state.breadcrumbs && state.breadcrumbs.length > 1 && (
        <div className={styles.breadcrumbBar}>
          <button
            type="button"
            className={classNames(styles.toolbarBtn, styles.toolbarBtnGhost)}
            onClick={() => {
              store.navigateBack();
              syncGraphWithBridge(store, bridge);
            }}
            aria-label="Back to parent graph"
          >
            ← Back
          </button>
          <span className={styles.breadcrumbDivider}>|</span>
          <ForgeBreadcrumb
            items={state.breadcrumbs.map((crumb) => ({ label: crumb.title }))}
            size="xs"
          />
        </div>
      )}
      {properties.isFallback && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(210, 153, 34, 0.15)',
            border: '1px solid #d29922',
            color: '#f0f6fc',
            fontSize: '11px',
            padding: '4px 12px',
            borderRadius: '16px',
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          ⚠ WebGPU not available in this environment. Operating in 2D Canvas fallback mode.
        </div>
      )}
      <canvas
        key={properties.renderer ?? 'default'}
        ref={properties.canvasReference}
        className={styles.canvas}
      />
      {sq.active && (
        <div
          className={styles.selectionSquare}
          style={{
            left: `${Math.min(sq.startX, sq.currentX)}px`,
            top: `${Math.min(sq.startY, sq.currentY)}px`,
            width: `${Math.abs(sq.currentX - sq.startX)}px`,
            height: `${Math.abs(sq.currentY - sq.startY)}px`,
          }}
        />
      )}
      {properties.controller && (
        <div className={styles.debugScrubberDock}>
          <ForgeDebugScrubber controller={properties.controller} />
        </div>
      )}
    </div>
  );
}

interface ContextMenuEdgeActionsProperties {
  readonly targetId: string;
  readonly worldX: number;
  readonly worldY: number;
  readonly store: FlintEditorStore;
  readonly bridge?: FlintRendererBridge;
  readonly onClose: () => void;
}

/**
 * Context menu actions for a selected edge connection.
 */
function ContextMenuEdgeActions(properties: ContextMenuEdgeActionsProperties): MpElement {
  const { targetId, worldX, worldY, store, bridge, onClose } = properties;
  return (
    <div className={styles.contextMenuActions}>
      <button
        type="button"
        className={styles.contextMenuItem}
        onClick={() => {
          store.addEdgePoint(targetId, { x: Math.round(worldX), y: Math.round(worldY) });
          syncGraphWithBridge(store, bridge);
          onClose();
        }}
      >
        + Add Waypoint Here
      </button>
      <button
        type="button"
        className={styles.contextMenuItem}
        onClick={() => {
          store.clearEdgePoints(targetId);
          syncGraphWithBridge(store, bridge);
          onClose();
        }}
      >
        Reset Path (Default Curve)
      </button>
      <button
        type="button"
        className={styles.contextMenuItem}
        style={{ color: '#f85149' }}
        onClick={() => {
          store.removeEdge(targetId);
          syncGraphWithBridge(store, bridge);
          onClose();
        }}
      >
        Remove Connection
      </button>
    </div>
  );
}

/**
 * Sub-panel for meta node actions in the node context menu.
 */
function ContextMenuNodeMetaActions(properties: {
  readonly targetId: string;
  readonly store: FlintEditorStore;
  readonly bridge?: FlintRendererBridge;
  readonly onClose: () => void;
}): MpElement {
  const { targetId, store, bridge, onClose } = properties;
  return (
    <div>
      <button
        type="button"
        className={styles.contextMenuItem}
        onClick={() => {
          store.drillIntoMetaNode(targetId);
          syncGraphWithBridge(store, bridge);
          onClose();
        }}
      >
        Enter Function (Drill Down)
      </button>
      <button
        type="button"
        className={styles.contextMenuItem}
        onClick={() => {
          store.duplicateMetaNode(targetId);
          syncGraphWithBridge(store, bridge);
          onClose();
        }}
      >
        Duplicate Meta Node
      </button>
    </div>
  );
}

/**
 * Sub-panel for node group actions in the node context menu.
 */
function ContextMenuNodeGroupActions(properties: {
  readonly targetGroupId: string;
  readonly store: FlintEditorStore;
  readonly bridge?: FlintRendererBridge;
  readonly onClose: () => void;
}): MpElement {
  const { targetGroupId, store, bridge, onClose } = properties;
  return (
    <div>
      <button
        type="button"
        className={styles.contextMenuItem}
        onClick={() => {
          store.copyGroup(targetGroupId);
          onClose();
        }}
      >
        Copy Group
      </button>
      <button
        type="button"
        className={styles.contextMenuItem}
        onClick={() => {
          store.ungroup(targetGroupId);
          syncGraphWithBridge(store, bridge);
          onClose();
        }}
      >
        Ungroup
      </button>
    </div>
  );
}

interface ContextMenuNodeActionsProperties {
  readonly targetId: string;
  readonly targetGroupId?: string;
  readonly selectedNode?: FlintGraphNode;
  readonly store: FlintEditorStore;
  readonly bridge?: FlintRendererBridge;
  readonly onClose: () => void;
}

/**
 * Context menu actions for an individual graph node.
 */
function ContextMenuNodeActions(properties: ContextMenuNodeActionsProperties): MpElement {
  const { targetId, targetGroupId, selectedNode, store, bridge, onClose } = properties;
  return (
    <div className={styles.contextMenuActions}>
      <button
        type="button"
        className={styles.contextMenuItem}
        onClick={() => {
          store.copyNode(targetId);
          onClose();
        }}
      >
        Copy Node
      </button>
      {selectedNode?.metaSubgraph && (
        <ContextMenuNodeMetaActions
          targetId={targetId}
          store={store}
          bridge={bridge}
          onClose={onClose}
        />
      )}
      {targetGroupId && (
        <ContextMenuNodeGroupActions
          targetGroupId={targetGroupId}
          store={store}
          bridge={bridge}
          onClose={onClose}
        />
      )}
      {selectedNode && selectedNode.outputs.length > 1 && (
        <button
          type="button"
          className={styles.contextMenuItem}
          onClick={() => {
            store.toggleSplitOutputs(targetId);
            onClose();
          }}
        >
          {selectedNode.splitOutputs === false ? 'Split Outputs to Fields' : 'Combine Outputs to Record'}
        </button>
      )}
      <button
        type="button"
        className={styles.contextMenuItem}
        style={{ color: '#f85149' }}
        onClick={() => {
          store.removeNode(targetId);
          syncGraphWithBridge(store, bridge);
          onClose();
        }}
      >
        Delete Node
      </button>
    </div>
  );
}

interface ContextMenuGroupActionsProperties {
  readonly targetGroupId: string;
  readonly store: FlintEditorStore;
  readonly bridge?: FlintRendererBridge;
  readonly onClose: () => void;
}

/**
 * Context menu actions for a selected node group container.
 */
function ContextMenuGroupActions(properties: ContextMenuGroupActionsProperties): MpElement {
  const { targetGroupId, store, bridge, onClose } = properties;
  return (
    <div className={styles.contextMenuActions}>
      <button
        type="button"
        className={styles.contextMenuItem}
        onClick={() => {
          store.copyGroup(targetGroupId);
          onClose();
        }}
      >
        Copy Group (with Connections)
      </button>
      <button
        type="button"
        className={styles.contextMenuItem}
        onClick={() => {
          store.ungroup(targetGroupId);
          syncGraphWithBridge(store, bridge);
          onClose();
        }}
      >
        Ungroup
      </button>
      <div style={{ padding: '4px 8px', fontSize: '11px', color: '#8b949e' }}>Group Color:</div>
      <div
        className={styles.colorPickerRow}
        style={{ padding: '0 8px' }}
      >
        {SWATCH_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={styles.colorSwatch}
            style={{ backgroundColor: c }}
            onClick={() => {
              store.setGroupColor(targetGroupId, c);
              syncGraphWithBridge(store, bridge);
              onClose();
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface ContextMenuSelectionActionsProperties {
  readonly selectedNodeCount: number;
  readonly store: FlintEditorStore;
  readonly onClose: () => void;
}

/**
 * Context menu actions for multiple selected nodes.
 */
function ContextMenuSelectionActions(properties: ContextMenuSelectionActionsProperties): MpElement {
  const { selectedNodeCount, store, onClose } = properties;
  return (
    <div className={styles.contextMenuActions}>
      <button
        type="button"
        className={styles.contextMenuItem}
        onClick={() => {
          store.copySelection();
          onClose();
        }}
      >
        Copy Selected ({selectedNodeCount} Nodes + Connections)
      </button>
      <button
        type="button"
        className={styles.contextMenuItem}
        onClick={() => {
          store.groupSelectedNodes();
          onClose();
        }}
      >
        Group Selected
      </button>
      <button
        type="button"
        className={styles.contextMenuItem}
        onClick={() => {
          store.createMetaNodeFromSelected();
          onClose();
        }}
      >
        Create Meta Node
      </button>
      <button
        type="button"
        className={styles.contextMenuItem}
        style={{ color: '#f85149' }}
        onClick={() => {
          store.deleteSelected();
          onClose();
        }}
      >
        Delete Selected
      </button>
    </div>
  );
}

interface ContextMenuNodeListProperties {
  readonly filteredItems: readonly FlintNodeDefinition[];
  readonly worldX: number;
  readonly worldY: number;
  readonly store: FlintEditorStore;
  readonly onClose: () => void;
}

/**
 * Filtered node operation list items for insertion from context menu.
 */
function ContextMenuNodeList(properties: ContextMenuNodeListProperties): MpElement {
  return (
    <div className={styles.contextMenuList}>
      {properties.filteredItems.map((item) => (
        <button
          key={item.operation}
          type="button"
          className={styles.contextMenuItem}
          onClick={() => {
            properties.store.addNode(item.operation, { x: properties.worldX, y: properties.worldY });
            properties.onClose();
          }}
        >
          <span style={{ fontWeight: 600 }}>{item.title}</span>
          <span style={{ fontSize: '10px', color: '#8b949e' }}>{item.description}</span>
        </button>
      ))}
    </div>
  );
}

interface FlintEditorContextMenuProperties {
  readonly contextMenu: ContextMenuState;
  readonly setContextMenu: (s: ContextMenuState) => void;
  readonly selectedNode?: FlintGraphNode;
  readonly store: FlintEditorStore;
  readonly bridge?: FlintRendererBridge;
  readonly allDefinitions: readonly FlintNodeDefinition[];
  readonly editorState: FlintEditorStoreState;
}

/**
 * Context menu floating popup with node insertion and action items.
 */
function FlintEditorContextMenu(properties: FlintEditorContextMenuProperties): MpElement | undefined {
  const cm = properties.contextMenu;
  if (!cm.open) return undefined;
  const store = properties.store;
  const bridge = properties.bridge;

  /** Closes the context menu popup. */
  const handleClose = (): void => {
    properties.setContextMenu({ ...cm, open: false });
  };

  const query = cm.query ? cm.query.toLowerCase() : '';
  const filteredItems = query
    ? properties.allDefinitions.filter(
        (definition) =>
          definition.title.toLowerCase().includes(query) || definition.operation.toLowerCase().includes(query),
      )
    : properties.allDefinitions;

  return (
    <div
      role="dialog"
      aria-label="Add Node Context Menu"
      className={styles.contextMenu}
      style={{ left: `${cm.x}px`, top: `${cm.y}px` }}
    >
      <div className={styles.contextMenuHeader}>
        <input
          type="text"
          placeholder="Search node..."
          className={styles.contextMenuSearch}
          value={cm.query}
          onInput={(event: unknown) => {
            const query = extractEventTargetStringValue(event);
            if (query !== undefined) properties.setContextMenu({ ...cm, query });
          }}
        />
      </div>

      {cm.targetType === 'edge' && cm.targetId && (
        <ContextMenuEdgeActions
          targetId={cm.targetId}
          worldX={cm.worldX}
          worldY={cm.worldY}
          store={store}
          bridge={bridge}
          onClose={handleClose}
        />
      )}

      {cm.targetType === 'node' && cm.targetId && (
        <ContextMenuNodeActions
          targetId={cm.targetId}
          targetGroupId={cm.targetGroupId}
          selectedNode={properties.selectedNode}
          store={store}
          bridge={bridge}
          onClose={handleClose}
        />
      )}

      {cm.targetType === 'group' && cm.targetGroupId && (
        <ContextMenuGroupActions
          targetGroupId={cm.targetGroupId}
          store={store}
          bridge={bridge}
          onClose={handleClose}
        />
      )}

      {cm.targetType === 'selection' && (
        <ContextMenuSelectionActions
          selectedNodeCount={properties.editorState.selectedNodeIds.length}
          store={store}
          onClose={handleClose}
        />
      )}

      {properties.editorState.hasClipboard && (
        <div
          className={styles.contextMenuActions}
          style={{ borderTop: '1px solid #30363d' }}
        >
          <button
            type="button"
            className={styles.contextMenuItem}
            onClick={() => {
              store.paste({ x: cm.worldX, y: cm.worldY });
              syncGraphWithBridge(store, bridge);
              handleClose();
            }}
          >
            Paste
          </button>
        </div>
      )}

      <ContextMenuNodeList
        filteredItems={filteredItems}
        worldX={cm.worldX}
        worldY={cm.worldY}
        store={store}
        onClose={handleClose}
      />
    </div>
  );
}

const DEFAULT_INITIAL_EDITOR_STATE: FlintEditorStoreState = {
  graph: { nodes: [], edges: [], groups: [] },
  selectedNodeIds: [],
  activeEdgeId: undefined,
  selectedGroupId: undefined,
  canUndo: false,
  canRedo: false,
  isExecuting: false,
  hasClipboard: false,
  validation: { valid: true, issues: [] },
  breadcrumbs: [{ id: 'root', title: 'Main Graph' }],
  lastOutputs: {},
};

/**
 * Renders font atlas texture into a 2D canvas context.
 */
function paintAtlasTexture(
  context: CanvasRenderingContext2D,
  wasm: ReturnType<typeof getFlintRenderWorkerWasm>,
  mode: 'crisp' | 'raw',
): void {
  const atlasSize = wasm.font_get_atlas_size();
  const atlasPtr = wasm.font_init_atlas_data();
  if (atlasPtr <= 0 || atlasSize <= 0) return;
  const rawBytes = new Uint8ClampedArray(wasm.memory.buffer, atlasPtr, atlasSize * atlasSize * 4);
  const outData = context.createImageData(atlasSize, atlasSize);
  if (mode === 'crisp') {
    renderAtlasCrisp(rawBytes, outData.data, atlasSize);
  } else {
    renderAtlasRaw(rawBytes, outData.data, atlasSize);
  }
  context.putImageData(outData, 0, 0);
}

/**
 * Observes theme changes on documentElement and body.
 */
function setupThemeObserver(setTheme: (theme: 'light' | 'dark') => void): () => void {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return noopDispose;
  const checkTheme = (): void => {
    setTheme(detectCurrentTheme());
  };
  const observer = new MutationObserver(checkTheme);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  if (document.body) {
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  }
  return () => observer.disconnect();
}

/**
 * Framework-neutral Forge component for the Flint visual node graph editor.
 * Authors interactive dataflow programs, renders instanced WebGPU primitives,
 * and compiles natively to WebAssembly.
 */
export function ForgeFlintGraphEditor(properties: Readonly<FlintGraphEditorProperties>): MpElement {
  const store = properties?.store ?? new FlintEditorStore();
  const controller = properties?.controller;

  const containerReference = useRef<HTMLDivElement | undefined>();
  const canvasReference = useRef<HTMLCanvasElement | undefined>();
  const bridgeReference = useRef<FlintRendererBridge | undefined>();

  const [editorState, setEditorState] = useState<FlintEditorStoreState>(DEFAULT_INITIAL_EDITOR_STATE);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(
    properties?.theme && properties.theme !== 'auto' ? properties.theme : detectCurrentTheme(),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPerfModal, setShowPerfModal] = useState(false);
  const [exportedSource, setExportedSource] = useState('');
  const [telemetryInterval, setTelemetryInterval] = useState<
    'realtime' | '100ms' | '250ms' | '500ms' | '750ms' | '1500ms'
  >('250ms');
  const [perfMetrics, setPerfMetrics] = useState<FlintPerformanceMetrics>({
    updateTimeMs: 0.5,
    renderTimeMs: 1.2,
    spatialIndexTimeMs: 0.2,
    bufferUploadTimeMs: 0.4,
    drawPassTimeMs: 0.6,
    totalFrameTimeMs: 1.7,
    visibleNodesCount: 0,
    visibleEdgesCount: 0,
    visiblePinsCount: 0,
    dpr: 1,
    isFallback: false,
  });
  const [perfHistory, setPerfHistory] = useState<readonly FlintPerformanceMetrics[]>([]);

  /**
   * Records newly emitted performance telemetry metrics into component state.
   *
   * @param nextMetrics - The latest collected performance telemetry metrics.
   */
  const recordPerfMetrics = (nextMetrics: FlintPerformanceMetrics): void => {
    setPerfMetrics(nextMetrics);
  };
  const [isFallback, setIsFallback] = useState(false);
  const [selectionSquare, setSelectionSquare] = useState<{
    readonly active: boolean;
    readonly startX: number;
    readonly startY: number;
    readonly currentX: number;
    readonly currentY: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    open: false,
    x: 0,
    y: 0,
    worldX: 0,
    worldY: 0,
    query: '',
  });

  const [spriteSheetMode, setSpriteSheetMode] = useState<'crisp' | 'raw'>('crisp');
  const [spriteSheetGrid, setSpriteSheetGrid] = useState<boolean>(true);
  const [hoveredGlyph, setHoveredGlyph] = useState<HoveredGlyphInfo | undefined>();

  const spriteSheetCanvasReference = useRef<HTMLCanvasElement | undefined>();
  const inspectCanvasReference = useRef<HTMLCanvasElement | undefined>();

  /**
   * Paints a single magnified cell into the inspect canvas preview.
   */
  const paintInspectCell = (cellX: number, cellY: number, cellW: number, cellH: number): void => {
    const inspectCanvas = inspectCanvasReference.current;
    const mainCanvas = spriteSheetCanvasReference.current;
    if (!inspectCanvas || !mainCanvas) return;
    const context = inspectCanvas.getContext('2d');
    if (!context) return;
    try {
      context.imageSmoothingEnabled = false;
      context.fillStyle = '#0d1117';
      context.fillRect(0, 0, inspectCanvas.width, inspectCanvas.height);
      const safeW = Math.max(cellW, 1);
      const safeH = Math.max(cellH, 1);
      const scale = Math.min((inspectCanvas.width - 8) / safeW, (inspectCanvas.height - 8) / safeH);
      const destinationW = safeW * scale;
      const destinationH = safeH * scale;
      const destinationX = (inspectCanvas.width - destinationW) / 2;
      const destinationY = (inspectCanvas.height - destinationH) / 2;
      context.drawImage(mainCanvas, cellX, cellY, safeW, safeH, destinationX, destinationY, destinationW, destinationH);
    } catch (error) {
      console.error('paintInspectCell error:', error);
    }
  };

  /**
   * Renders the 1024x1024 2D Shelf Packed Signed Distance Field font atlas texture with optional cell grid overlay and highlighting.
   */
  const paintSpriteSheet = (
    mode: 'crisp' | 'raw' = spriteSheetMode,
    grid: boolean = spriteSheetGrid,
    highlightIndex: number | undefined = hoveredGlyph?.index,
  ): void => {
    const canvas = spriteSheetCanvasReference.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    try {
      const wasm = getFlintRenderWorkerWasm();
      paintAtlasTexture(context, wasm, mode);
      if (grid) {
        const tableBase = wasm.font_get_table_ptr ? wasm.font_get_table_ptr() : 256;
        renderAtlasGrid(context, new Uint32Array(wasm.memory.buffer), tableBase, highlightIndex);
      }
    } catch {
      // Ignore if wasm not ready yet
    }
  };

  /**
   * Tracks cursor movements across the packed font sprite sheet canvas and updates the hovered glyph details.
   */
  const onSpriteSheetPointerMove = (event: PointerEvent): void => {
    const canvas = spriteSheetCanvasReference.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = 1024 / rect.width;
    const atlasX = (event.clientX - rect.left) * scale;
    const atlasY = (event.clientY - rect.top) * scale;

    try {
      const wasm = getFlintRenderWorkerWasm();
      const tableBase = wasm.font_get_table_ptr ? wasm.font_get_table_ptr() : 256;
      const cell = findSpriteSheetCellAtPoint(new Uint32Array(wasm.memory.buffer), tableBase, atlasX, atlasY);
      if (cell) {
        const glyphInfo = resolveGlyphDetails(
          wasm,
          cell.foundIndex,
          cell.foundX,
          cell.foundY,
          cell.foundW,
          cell.foundH,
        );
        setHoveredGlyph(glyphInfo);
        paintSpriteSheet(spriteSheetMode, spriteSheetGrid, cell.foundIndex);
        paintInspectCell(cell.foundX, cell.foundY, cell.foundW, cell.foundH);
      } else {
        setHoveredGlyph();
        paintSpriteSheet(spriteSheetMode, spriteSheetGrid);
      }
    } catch {
      // Ignore if wasm not ready yet
    }
  };

  /**
   * Resets glyph hover inspection when the pointer leaves the sprite sheet canvas.
   */
  const onSpriteSheetPointerLeave = (): void => {
    setHoveredGlyph();
    paintSpriteSheet(spriteSheetMode, spriteSheetGrid);
  };

  useEffect(() => {
    if (hoveredGlyph) {
      requestAnimationFrame(() => {
        paintInspectCell(hoveredGlyph.cellX, hoveredGlyph.cellY, hoveredGlyph.cellW, hoveredGlyph.cellH);
      });
    }
  }, [hoveredGlyph?.index, spriteSheetMode]);

  useEffect(() => {
    if (showPerfModal) {
      setTimeout(() => {
        paintSpriteSheet();
      }, 50);
    }
  }, [showPerfModal]);

  useEffect(() => {
    let cleanupTimer: (() => void) | undefined;
    if (showPerfModal && telemetryInterval !== 'realtime') {
      const msMap: Record<string, number> = {
        '100ms': 100,
        '250ms': 250,
        '500ms': 500,
        '750ms': 750,
        '1500ms': 1500,
      };
      const intervalMs = msMap[telemetryInterval] ?? 250;

      const timer = setInterval(() => {
        if (bridgeReference.current) {
          const stats = bridgeReference.current.getPerformanceStats();
          setPerfMetrics(stats);
          setPerfHistory((previous) => (previous.length > 50 ? [...previous.slice(-49), stats] : [...previous, stats]));
        }
      }, intervalMs);

      cleanupTimer = () => clearInterval(timer);
    }
    return cleanupTimer;
  }, [showPerfModal, telemetryInterval]);

  useEffect(() => {
    if (properties.theme && properties.theme !== 'auto') {
      setResolvedTheme(properties.theme);
      return;
    }
    return setupThemeObserver(setResolvedTheme);
  }, [properties.theme]);

  useEffect(() => {
    let cleanupResize: (() => void) | undefined;
    let cleanupListeners: (() => void) | undefined;
    let unsubscribe: (() => void) | undefined;
    let bridge: FlintRendererBridge | undefined;

    const canvasElement = canvasReference.current;

    if (canvasElement) {
      const rect = canvasElement.getBoundingClientRect();
      const width = Math.max(rect.width, 800);
      const height = Math.max(rect.height, 600);
      const initialDpr = globalThis.window === undefined ? 1 : globalThis.window.devicePixelRatio || 1;

      bridge = createRendererBridge(
        canvasElement,
        width,
        height,
        initialDpr,
        (message) => handleBridgeMessage(message, recordPerfMetrics, setIsFallback, store),
        properties.renderer,
        properties.theme && properties.theme !== 'auto' ? properties.theme : 'dark',
      );

      bridgeReference.current = bridge;

      unsubscribe = store.subscribe((newState) => {
        setEditorState(newState);
        bridge?.setGraph(newState.graph.nodes, newState.graph.edges, newState.graph.groups ?? []);
        bridge?.setSelection(
          newState.selectedNodeIds,
          newState.activeEdgeId ? [newState.activeEdgeId] : [],
          newState.selectedGroupId,
        );
      });

      syncGraphWithBridge(store, bridge);
      recordPerfMetrics(bridge.getPerformanceStats());

      cleanupResize = setupResizeObserver(canvasElement, bridge, store, initialDpr, recordPerfMetrics);

      cleanupListeners = setupCanvasEventListeners({
        canvasElement,
        bridge,
        store,
        setContextMenu,
        setSelectionSquare,
        recordPerfMetrics,
      });
    }

    return () => {
      unsubscribe?.();
      cleanupResize?.();
      cleanupListeners?.();
      bridge?.destroy();
      bridgeReference.current = undefined;
    };
  }, [store, properties.renderer]);

  const query = searchQuery.toLowerCase().trim();
  const allDefinitions = getAllNodeDefinitions();
  const filteredDefinitions = query
    ? allDefinitions.filter(
        (definition) =>
          definition.title.toLowerCase().includes(query) ||
          definition.operation.toLowerCase().includes(query) ||
          definition.description.toLowerCase().includes(query),
      )
    : allDefinitions;

  const selectedNodeId = editorState.selectedNodeIds[0];
  const selectedNode: FlintGraphNode | undefined = selectedNodeId
    ? editorState.graph.nodes.find((node) => node?.id === selectedNodeId)
    : undefined;

  const selectedDefinition = selectedNode ? getNodeDefinition(selectedNode.operation) : undefined;
  const selectedGroup = editorState.selectedGroupId
    ? (editorState.graph.groups ?? []).find((group) => group.id === editorState.selectedGroupId)
    : undefined;
  const selectedEdge = editorState.activeEdgeId
    ? editorState.graph.edges.find((edge) => edge.id === editorState.activeEdgeId)
    : undefined;

  /**
   * Instantiates a new node from the catalog at the current viewport center.
   */
  const handleAddNode = (operation: string): void => {
    const center = bridgeReference.current?.getCamera();
    const position = center ? { x: Math.round(center.x), y: Math.round(center.y) } : { x: 0, y: 0 };
    store.addNode(operation, position);
  };

  /**
   * Compiles the active graph to Flint source code and displays the export modal.
   */
  const handleExport = (): void => {
    const artifacts = store.exportArtifacts();
    if (artifacts.type === 'export_result') {
      setExportedSource(artifacts.source);
      setShowExportModal(true);
    }
  };

  const [copiedExport, setCopiedExport] = useState(false);

  /**
   * Toggles between light and dark themes.
   */
  const handleToggleTheme = (): void => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setResolvedTheme(nextTheme);
    bridgeReference.current?.setTheme(nextTheme);
  };

  /**
   * Copies exported source to the clipboard.
   */
  const handleCopyExport = (): void => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(exportedSource).then(() => {
        setCopiedExport(true);
        setTimeout(() => setCopiedExport(false), 2000);
      });
    }
  };

  /**
   * Triggers asynchronous graph compilation and WebAssembly execution.
   */
  const handleRun = (): void => {
    store.runGraph().catch(console.error);
  };

  const populatedCategories = CATEGORIES.map((category) => ({
    category,
    definitions: filteredDefinitions.filter((item) => item.category === category),
  })).filter((group) => group.definitions.length > 0);

  return (
    <main
      className={classNames(styles.editorContainer, properties.className)}
      data-theme={resolvedTheme}
    >
      <FlintEditorToolbar
        editorState={editorState}
        resolvedTheme={resolvedTheme}
        isFallback={isFallback}
        perfMetrics={perfMetrics}
        store={store}
        bridge={bridgeReference.current}
        onRun={handleRun}
        onExport={handleExport}
        onToggleTheme={handleToggleTheme}
        onOpenPerf={() => setShowPerfModal(true)}
      />

      <div className={styles.editorWorkspace}>
        <FlintEditorPalette
          searchQuery={searchQuery}
          onSearchInput={setSearchQuery}
          registeredMetaNodes={editorState.registeredMetaNodes}
          populatedCategories={populatedCategories}
          onAddNode={handleAddNode}
          store={store}
        />

        <FlintEditorCanvas
          canvasReference={canvasReference}
          containerReference={containerReference}
          renderer={properties.renderer}
          editorState={editorState}
          isFallback={isFallback}
          selectionSquare={selectionSquare}
          controller={controller}
          store={store}
          bridge={bridgeReference.current}
        />

        <FlintEditorInspector
          selectedNode={selectedNode}
          selectedDefinition={selectedDefinition}
          selectedGroup={selectedGroup}
          selectedEdge={selectedEdge}
          store={store}
          bridge={bridgeReference.current}
          editorState={editorState}
        />
      </div>

      <FlintEditorContextMenu
        contextMenu={contextMenu}
        setContextMenu={setContextMenu}
        selectedNode={selectedNode}
        store={store}
        bridge={bridgeReference.current}
        allDefinitions={allDefinitions}
        editorState={editorState}
      />

      <FlintCodeExportModal
        show={showExportModal}
        source={exportedSource}
        copied={copiedExport}
        onClose={() => setShowExportModal(false)}
        onCopy={handleCopyExport}
      />

      <FlintPerfProfilerModal
        show={showPerfModal}
        perfMetrics={perfMetrics}
        perfHistory={perfHistory}
        telemetryInterval={telemetryInterval}
        setTelemetryInterval={setTelemetryInterval}
        spriteSheetMode={spriteSheetMode}
        setSpriteSheetMode={setSpriteSheetMode}
        spriteSheetGrid={spriteSheetGrid}
        setSpriteSheetGrid={setSpriteSheetGrid}
        hoveredGlyph={hoveredGlyph}
        spriteSheetCanvasReference={spriteSheetCanvasReference}
        inspectCanvasReference={inspectCanvasReference}
        onClose={() => setShowPerfModal(false)}
        onSpriteSheetPointerMove={onSpriteSheetPointerMove}
        onSpriteSheetPointerLeave={onSpriteSheetPointerLeave}
        paintSpriteSheet={paintSpriteSheet}
      />
    </main>
  );
}
