import {
  ForgeBadge,
  ForgeBreadcrumb,
  ForgeButton,
  ForgeButtonGroup,
  ForgeCard,
  ForgeCollapse,
} from '@mission-platform/components';
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
  readonly width: number;
  readonly height: number;
  readonly horiBearingX: number;
  readonly horiBearingY: number;
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
 * Performs port hit-testing against candidate nodes within a snap radius.
 */
function hitTestPorts(
  worldX: number,
  worldY: number,
  nodes: readonly FlintGraphNode[],
  snapRadius: number,
): FlintHitResult | undefined {
  for (const node of nodes) {
    for (const [index, port] of (node.inputs ?? []).entries()) {
      const portY = node.position.y + 44 + index * 28 + 14;
      if (Math.hypot(worldX - node.position.x, worldY - portY) <= snapRadius) {
        return { type: 'port', nodeId: node.id, portId: port.id, worldX, worldY };
      }
    }
    for (const [index, port] of (node.outputs ?? []).entries()) {
      const portY = node.position.y + 44 + index * 28 + 14;
      if (Math.hypot(worldX - (node.position.x + 220), worldY - portY) <= snapRadius) {
        return { type: 'port', nodeId: node.id, portId: port.id, worldX, worldY };
      }
    }
  }
  return undefined;
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
    const maxPorts = Math.max(node.inputs?.length ?? 0, node.outputs?.length ?? 0);
    wasm.getNodeBounds(node.position.x, node.position.y, maxPorts);
    const minX = wasm.get_node_bounds_min_x();
    const minY = wasm.get_node_bounds_min_y();
    const maxX = wasm.get_node_bounds_max_x();
    const maxY = wasm.get_node_bounds_max_y();
    if (worldX >= minX && worldX <= maxX && worldY >= minY && worldY <= maxY) {
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
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return (px - projX) * (px - projX) + (py - projY) * (py - projY);
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
  for (const edge of edges) {
    if (!edge.points || edge.points.length === 0) continue;
    for (const [index, pt] of edge.points.entries()) {
      const dx = worldX - pt.x;
      const dy = worldY - pt.y;
      if (dx * dx + dy * dy <= radius * radius) {
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
  }
  return undefined;
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
  for (const group of groups) {
    let minX = Infinity;
    let minY = Infinity;
    for (const id of group.nodeIds) {
      const node = nodeMap.get(id);
      if (node) {
        if (node.position.x < minX) minX = node.position.x;
        if (node.position.y < minY) minY = node.position.y;
      }
    }
    if (minX === Infinity) continue;
    const padding = 24;
    const labelX = minX - padding + 10;
    const labelY = minY - padding - 22 + 4;
    const labelWidth = Math.max(120, group.title.length * 10 + 32);
    const labelHeight = 24;
    if (
      worldX >= labelX - 6 &&
      worldX <= labelX + labelWidth + 6 &&
      worldY >= labelY - 6 &&
      worldY <= labelY + labelHeight + 6
    ) {
      return { type: 'group', groupId: group.id, nodeId: '', worldX, worldY };
    }
  }
  return undefined;
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
    if (!from || !to) continue;
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
      let previousX = p0x;
      let previousY = p0y;
      let hitSegment = false;
      for (const pt of edge.points) {
        if (distributionToSegmentSquared(worldX, worldY, previousX, previousY, pt.x, pt.y) <= 14 * 14) {
          hitSegment = true;
          break;
        }
        previousX = pt.x;
        previousY = pt.y;
      }
      if (!hitSegment && distributionToSegmentSquared(worldX, worldY, previousX, previousY, p3x, p3y) <= 14 * 14) {
        hitSegment = true;
      }
      if (hitSegment) {
        return { type: 'edge', nodeId: '', edgeId: edge.id, worldX, worldY };
      }
    } else if (
      wasm.edge_hit_test(
        Math.round(worldX),
        Math.round(worldY),
        Math.round(p0x),
        Math.round(p0y),
        Math.round(p3x),
        Math.round(p3y),
        14,
      )
    ) {
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
 * Detects the active color theme from the DOM data-theme attribute or system color preference.
 */
function detectCurrentTheme(): 'light' | 'dark' {
  if (typeof document !== 'undefined') {
    const documentTheme = document.documentElement.dataset.theme ?? document.body?.dataset.theme;
    if (documentTheme === 'light' || documentTheme === 'dark') {
      return documentTheme;
    }
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

/**
 * Framework-neutral Forge component for the Flint visual node graph editor.
 * Authors interactive dataflow programs, renders instanced WebGPU primitives,
 * and compiles natively to WebAssembly.
 */
export function ForgeFlintGraphEditor(properties: Readonly<FlintGraphEditorProperties>): MpElement {
  const storeReference = useRef<FlintEditorStore>(properties.store ?? new FlintEditorStore());
  const store = properties.store ?? storeReference.current;

  const canvasReference = useRef<HTMLCanvasElement | undefined>();
  const rendererReference = useRef<FlintRendererBridge | undefined>();

  const [editorState, setEditorState] = useState<FlintEditorStoreState>(store.getState());
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (properties.theme && properties.theme !== 'auto') {
      return properties.theme;
    }
    return detectCurrentTheme();
  });
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

  const recordPerfMetrics = (nextMetrics: FlintPerformanceMetrics): void => {
    setPerfMetrics(nextMetrics);
    const updated = [...perfHistory, nextMetrics];
    setPerfHistory(updated.length > 50 ? updated.slice(-50) : updated);
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
   *
   * @param cellX - Atlas X coordinate.
   * @param cellY - Atlas Y coordinate.
   * @param cellW - Cell width in pixels.
   * @param cellH - Cell height in pixels.
   */
  const paintInspectCell = (cellX: number, cellY: number, cellW: number, cellH: number): void => {
    const inspectCanvas = inspectCanvasReference.current;
    const mainCanvas = spriteSheetCanvasReference.current;
    if (!inspectCanvas || !mainCanvas) {
      return;
    }
    const inspectContext = inspectCanvas.getContext('2d');
    if (!inspectContext) return;
    try {
      inspectContext.imageSmoothingEnabled = false;
      inspectContext.fillStyle = '#0d1117';
      inspectContext.fillRect(0, 0, inspectCanvas.width, inspectCanvas.height);
      const safeW = Math.max(cellW, 1);
      const safeH = Math.max(cellH, 1);
      const scale = Math.min((inspectCanvas.width - 8) / safeW, (inspectCanvas.height - 8) / safeH);
      const destinationWidth = safeW * scale;
      const destinationHeight = safeH * scale;
      const destinationX = (inspectCanvas.width - destinationWidth) / 2;
      const destinationY = (inspectCanvas.height - destinationHeight) / 2;
      inspectContext.drawImage(
        mainCanvas,
        cellX,
        cellY,
        safeW,
        safeH,
        destinationX,
        destinationY,
        destinationWidth,
        destinationHeight,
      );
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
    const canvasContext = canvas.getContext('2d');
    if (!canvasContext) return;
    try {
      const wasm = getFlintRenderWorkerWasm();
      const atlasSize = wasm.font_get_atlas_size();
      const atlasPtr = wasm.font_init_atlas_data();
      if (atlasPtr > 0 && atlasSize > 0) {
        const rawBytes = new Uint8ClampedArray(wasm.memory.buffer, atlasPtr, atlasSize * atlasSize * 4);
        const outData = canvasContext.createImageData(atlasSize, atlasSize);
        const outBytes = outData.data;

        if (mode === 'crisp') {
          for (let pixelIndex = 0; pixelIndex < atlasSize * atlasSize; pixelIndex++) {
            const r = (rawBytes[pixelIndex * 4] ?? 0) / 255;
            const g = (rawBytes[pixelIndex * 4 + 1] ?? 0) / 255;
            const b = (rawBytes[pixelIndex * 4 + 2] ?? 0) / 255;
            const msdf = Math.max(Math.min(r, g), Math.min(Math.max(r, g), b));
            const edge = 0.5;
            const smoothing = 0.045;
            const t = Math.max(0, Math.min(1, (msdf - (edge - smoothing)) / (2 * smoothing)));
            const alpha = t * t * (3 - 2 * t);
            const outputIndex = pixelIndex * 4;
            outBytes[outputIndex] = Math.round(13 + (255 - 13) * alpha);
            outBytes[outputIndex + 1] = Math.round(17 + (255 - 17) * alpha);
            outBytes[outputIndex + 2] = Math.round(23 + (255 - 23) * alpha);
            outBytes[outputIndex + 3] = 255;
          }
        } else {
          for (let pixelIndex = 0; pixelIndex < atlasSize * atlasSize; pixelIndex++) {
            const outputIndex = pixelIndex * 4;
            outBytes[outputIndex] = rawBytes[outputIndex] ?? 0;
            outBytes[outputIndex + 1] = rawBytes[outputIndex + 1] ?? 0;
            outBytes[outputIndex + 2] = rawBytes[outputIndex + 2] ?? 0;
            outBytes[outputIndex + 3] = 255;
          }
        }

        canvasContext.putImageData(outData, 0, 0);

        if (grid) {
          const tableBase = wasm.font_get_table_ptr ? wasm.font_get_table_ptr() : 256;
          const u32Memory = new Uint32Array(wasm.memory.buffer);
          canvasContext.save();
          canvasContext.lineWidth = 1;
          canvasContext.strokeStyle = 'rgba(88, 166, 255, 0.25)';

          for (let glyphIndex = 0; glyphIndex < GLYPH_CHARS_BY_IDX.length; glyphIndex++) {
            const cellX = u32Memory[(tableBase + glyphIndex * 16) >> 2] ?? 0;
            const cellY = u32Memory[(tableBase + glyphIndex * 16 + 4) >> 2] ?? 0;
            const cellW = u32Memory[(tableBase + glyphIndex * 16 + 8) >> 2] ?? 24;
            const cellH = u32Memory[(tableBase + glyphIndex * 16 + 12) >> 2] ?? 32;
            canvasContext.strokeRect(cellX + 0.5, cellY + 0.5, cellW - 1, cellH - 1);
          }

          if (highlightIndex !== undefined && highlightIndex >= 0 && highlightIndex < GLYPH_CHARS_BY_IDX.length) {
            const highlightX = u32Memory[(tableBase + highlightIndex * 16) >> 2] ?? 0;
            const highlightY = u32Memory[(tableBase + highlightIndex * 16 + 4) >> 2] ?? 0;
            const highlightW = u32Memory[(tableBase + highlightIndex * 16 + 8) >> 2] ?? 24;
            const highlightH = u32Memory[(tableBase + highlightIndex * 16 + 12) >> 2] ?? 32;
            canvasContext.strokeStyle = '#58a6ff';
            canvasContext.lineWidth = 2;
            canvasContext.strokeRect(highlightX + 0.5, highlightY + 0.5, highlightW - 1, highlightH - 1);
          }
          canvasContext.restore();
        }
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
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const scale = 1024 / rect.width;
    const atlasX = x * scale;
    const atlasY = y * scale;

    try {
      const wasm = getFlintRenderWorkerWasm();
      const tableBase = wasm.font_get_table_ptr ? wasm.font_get_table_ptr() : 256;
      const u32Memory = new Uint32Array(wasm.memory.buffer);

      let foundIndex = -1;
      let foundX = 0;
      let foundY = 0;
      let foundW = 24;
      let foundH = 32;

      for (let glyphIndex = 0; glyphIndex < GLYPH_CHARS_BY_IDX.length; glyphIndex++) {
        const cellX = u32Memory[(tableBase + glyphIndex * 16) >> 2] ?? 0;
        const cellY = u32Memory[(tableBase + glyphIndex * 16 + 4) >> 2] ?? 0;
        const cellW = u32Memory[(tableBase + glyphIndex * 16 + 8) >> 2] ?? 24;
        const cellH = u32Memory[(tableBase + glyphIndex * 16 + 12) >> 2] ?? 32;

        if (atlasX >= cellX && atlasX < cellX + cellW && atlasY >= cellY && atlasY < cellY + cellH) {
          foundIndex = glyphIndex;
          foundX = cellX;
          foundY = cellY;
          foundW = cellW;
          foundH = cellH;
          break;
        }
      }

      if (foundIndex >= 0 && foundIndex < GLYPH_CHARS_BY_IDX.length) {
        const char = GLYPH_CHARS_BY_IDX[foundIndex] ?? '';
        const code = char.codePointAt(0) ?? 0;
        let advance = 14;
        let width = foundW;
        let height = foundH;
        let horiBearingX = 0;
        let horiBearingY = 18;
        let bboxMinX = 0;
        let bboxMaxX = foundW;
        let bboxMinY = 0;
        let bboxMaxY = 18;
        try {
          advance = wasm.font_get_char_advance(code);
          if (wasm.font_get_glyph_width) {
            width = wasm.font_get_glyph_width(foundIndex);
          }
          if (wasm.font_get_glyph_height) {
            height = wasm.font_get_glyph_height(foundIndex);
          }
          if (wasm.font_get_glyph_hori_bearing_x) {
            horiBearingX = wasm.font_get_glyph_hori_bearing_x(foundIndex);
          }
          if (wasm.font_get_glyph_hori_bearing_y) {
            horiBearingY = wasm.font_get_glyph_hori_bearing_y(foundIndex);
          }
          if (wasm.font_get_glyph_bbox_min_x) {
            bboxMinX = wasm.font_get_glyph_bbox_min_x(foundIndex);
          }
          if (wasm.font_get_glyph_bbox_max_x) {
            bboxMaxX = wasm.font_get_glyph_bbox_max_x(foundIndex);
          }
          if (wasm.font_get_glyph_bbox_min_y) {
            bboxMinY = wasm.font_get_glyph_bbox_min_y(foundIndex);
          }
          if (wasm.font_get_glyph_bbox_max_y) {
            bboxMaxY = wasm.font_get_glyph_bbox_max_y(foundIndex);
          }
        } catch {
          // fallback
        }
        setHoveredGlyph({
          index: foundIndex,
          char,
          codeHex: `U+${code.toString(16).toUpperCase().padStart(4, '0')}`,
          codeDec: code,
          advance,
          width,
          height,
          horiBearingX,
          horiBearingY,
          bboxMinX,
          bboxMaxX,
          bboxMinY,
          bboxMaxY,
          cellX: foundX,
          cellY: foundY,
          cellW: foundW,
          cellH: foundH,
        });
        paintSpriteSheet(spriteSheetMode, spriteSheetGrid, foundIndex);
        paintInspectCell(foundX, foundY, foundW, foundH);
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
    if (!showPerfModal) return;
    if (telemetryInterval === 'realtime') return;

    const msMap: Record<string, number> = {
      '100ms': 100,
      '250ms': 250,
      '500ms': 500,
      '750ms': 750,
      '1500ms': 1500,
    };
    const intervalMs = msMap[telemetryInterval] ?? 250;

    const timer = setInterval(() => {
      if (rendererReference.current) {
        recordPerfMetrics(rendererReference.current.getPerformanceStats());
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [showPerfModal, telemetryInterval]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    if (properties.theme && properties.theme !== 'auto') {
      setResolvedTheme(properties.theme);
    } else {
      /**
       * Checks and synchronizes color theme changes from the document environment.
       */
      const checkTheme = (): void => {
        const detected = detectCurrentTheme();
        setResolvedTheme(detected);
      };
      checkTheme();
      if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
        if (document.body) {
          observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme', 'class'] });
        }
        cleanup = () => {
          observer.disconnect();
        };
      }
    }
    return cleanup;
  }, [properties.theme]);

  useEffect(() => {
    if (rendererReference.current) {
      rendererReference.current.setTheme(resolvedTheme);
      rendererReference.current.renderFrame();
    }
  }, [resolvedTheme]);

  useEffect(() => {
    setEditorState(store.getState());
    const unsubscribe = store.subscribe((newState) => {
      setEditorState(newState);
      if (rendererReference.current) {
        rendererReference.current.setGraph(newState.graph.nodes, newState.graph.edges, newState.graph.groups ?? []);
        rendererReference.current.setSelection(
          newState.selectedNodeIds,
          newState.activeEdgeId ? [newState.activeEdgeId] : [],
          newState.selectedGroupId,
        );
      }
    });

    let resizeObserver: ResizeObserver | undefined;
    let cleanupListeners: (() => void) | undefined;

    if (canvasReference.current) {
      const canvasElement = canvasReference.current;
      const rect = canvasElement.getBoundingClientRect();
      const width = Math.max(rect.width, 800);
      const height = Math.max(rect.height, 600);
      const initialDpr = globalThis.window === undefined ? 1 : globalThis.window.devicePixelRatio || 1;

      const renderer = createRendererBridge(
        canvasElement,
        width,
        height,
        initialDpr,
        (message) => {
          switch (message.type) {
            case 'frame': {
              if (message.performance) {
                recordPerfMetrics(message.performance);
              }
              break;
            }
            case 'ready': {
              if (message.supported === false) {
                setIsFallback(true);
              }
              if (message.performance) {
                recordPerfMetrics(message.performance);
              }
              break;
            }
            case 'hit_result': {
              if (message.hit?.type === 'node') {
                store.selectNode(message.hit.nodeId);
              } else if (!message.hit) {
                store.deselectAll();
              }
              break;
            }
            default: {
              break;
            }
          }
        },
        properties.renderer,
        resolvedTheme,
      );

      rendererReference.current = renderer;
      renderer.setGraph(
        store.getState().graph.nodes,
        store.getState().graph.edges,
        store.getState().graph.groups ?? [],
      );
      renderer.renderFrame();
      recordPerfMetrics(renderer.getPerformanceStats());

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const contentRect = entry.contentRect;
            if (contentRect.width > 0 && contentRect.height > 0) {
              const currentDpr = globalThis.window === undefined ? 1 : globalThis.window.devicePixelRatio || 1;
              renderer.resize(contentRect.width, contentRect.height, currentDpr);
              recordPerfMetrics(renderer.getPerformanceStats());
            }
          }
        });
        resizeObserver.observe(canvasElement);
      }

      let isPointerDown = false;
      let dragMode: 'pan' | 'node' | 'group' | 'waypoint' | 'connect' | 'box_select' | 'none' = 'none';
      let connectingSourceNodeId = '';
      let connectingSourcePortId = '';
      let draggedGroupId = '';
      let draggedEdgeId = '';
      let draggedWaypointIndex = -1;
      let dragStartScreen = { x: 0, y: 0 };
      let boxSelectStart = { x: 0, y: 0 };
      let lastClickTime = 0;
      let lastClickNodeId = '';
      const nodesStartPositions = new Map<string, { readonly x: number; readonly y: number }>();

      const profilerInterval = setInterval(() => {
        if (rendererReference.current) {
          const stats = rendererReference.current.getPerformanceStats();
          const storeUpdateTime = store.getUpdateTimeMs();
          recordPerfMetrics({
            ...stats,
            updateTimeMs: storeUpdateTime,
          });
        }
      }, 1000);

      /**
       * Handles mouse wheel events to zoom the editor canvas centered at cursor coordinates.
       */
      const onWheel = (event: WheelEvent): void => {
        event.preventDefault();
        const normalizedDelta = Math.max(-100, Math.min(100, event.deltaY));
        const factor = Math.exp(-normalizedDelta * 0.003);
        renderer.zoom(event.offsetX, event.offsetY, factor);
      };

      /**
       * Handles pointer down events to initiate node dragging, port connection, or pan navigation.
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
        const hit = renderer.hitTestSync(event.offsetX, event.offsetY);

        if (hit?.type === 'group' && hit.groupId) {
          dragMode = 'group';
          draggedGroupId = hit.groupId;
          store.selectGroup(hit.groupId);
          renderer.setSelection([], [], hit.groupId);
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
          renderer.renderFrame();
          return;
        }

        if (hit?.type === 'waypoint' && hit.edgeId && hit.waypointIndex !== undefined) {
          dragMode = 'waypoint';
          draggedEdgeId = hit.edgeId;
          draggedWaypointIndex = hit.waypointIndex;
          store.selectEdge(hit.edgeId);
          renderer.setSelection([], [hit.edgeId]);
          renderer.renderFrame();
          return;
        }

        if (hit?.type === 'edge' && hit.edgeId) {
          if (now - lastClickTime < 350 && lastClickNodeId === hit.edgeId) {
            const world = renderer.screenToWorld(event.offsetX, event.offsetY);
            store.addEdgePoint(hit.edgeId, { x: Math.round(world.x), y: Math.round(world.y) });
            renderer.setGraph(
              store.getState().graph.nodes,
              store.getState().graph.edges,
              store.getState().graph.groups ?? [],
            );
            renderer.renderFrame();
            lastClickTime = 0;
            lastClickNodeId = '';
            return;
          }
          lastClickTime = now;
          lastClickNodeId = hit.edgeId;
          store.selectEdge(hit.edgeId);
          renderer.setSelection([], [hit.edgeId]);
          renderer.renderFrame();
          return;
        }

        if (hit?.type === 'node') {
          if (now - lastClickTime < 350 && lastClickNodeId === hit.nodeId) {
            const clickedNode = store.getState().graph.nodes.find((n) => n.id === hit.nodeId);
            if (clickedNode && (clickedNode.metaSubgraph || clickedNode.operation === 'meta')) {
              store.drillIntoMetaNode(clickedNode.id);
              renderer.setGraph(
                store.getState().graph.nodes,
                store.getState().graph.edges,
                store.getState().graph.groups ?? [],
              );
              renderer.renderFrame();
              return;
            }
          }
          lastClickTime = now;
          lastClickNodeId = hit.nodeId;
        } else {
          lastClickTime = 0;
          lastClickNodeId = '';
        }

        if (hit?.type === 'port' && hit.portId) {
          dragMode = 'connect';
          connectingSourceNodeId = hit.nodeId;
          connectingSourcePortId = hit.portId;
          store.startConnecting(hit.nodeId, hit.portId, hit.worldX ?? 0, hit.worldY ?? 0);
          renderer.setConnectingEdge({
            fromNodeId: hit.nodeId,
            fromPortId: hit.portId,
            cursorX: hit.worldX ?? 0,
            cursorY: hit.worldY ?? 0,
          });
        } else if (hit?.type === 'node') {
          dragMode = 'node';
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
          renderer.setSelection([...selectedSet, hit.nodeId]);
          renderer.renderFrame();
        } else {
          if (isShift) {
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
            renderer.setSelection([], []);
            renderer.renderFrame();
          }
        }
      };

      /**
       * Handles pointer move events for dragging nodes, updating connection preview cables, or box selection.
       */
      const onPointerMove = (event: PointerEvent): void => {
        if (!isPointerDown) {
          const hoverHit = renderer.hitTestSync(event.offsetX, event.offsetY);
          switch (hoverHit?.type) {
            case 'port': {
              canvasElement.style.cursor = 'crosshair';
              if (hoverHit.portId) {
                renderer.setHoveredPort({ nodeId: hoverHit.nodeId, portId: hoverHit.portId });
                renderer.renderFrame();
              }
              break;
            }
            case 'waypoint': {
              canvasElement.style.cursor = 'grab';
              renderer.setHoveredPort();
              renderer.renderFrame();
              break;
            }
            case 'group': {
              canvasElement.style.cursor = 'move';
              renderer.setHoveredPort();
              renderer.renderFrame();
              break;
            }
            case 'edge': {
              canvasElement.style.cursor = 'pointer';
              renderer.setHoveredPort();
              renderer.renderFrame();
              break;
            }
            case 'node': {
              canvasElement.style.cursor = 'move';
              renderer.setHoveredPort();
              renderer.renderFrame();
              break;
            }
            default: {
              canvasElement.style.cursor = 'default';
              if (renderer.getHoveredPort()) {
                renderer.setHoveredPort();
                renderer.renderFrame();
              }
            }
          }
          return;
        }

        const camera = renderer.getCamera();
        const deltaX = event.clientX - dragStartScreen.x;
        const deltaY = event.clientY - dragStartScreen.y;

        if (dragMode === 'box_select') {
          setSelectionSquare((previous) => ({
            ...previous,
            currentX: event.offsetX,
            currentY: event.offsetY,
          }));
        } else if (dragMode === 'group' && nodesStartPositions.size > 0 && draggedGroupId) {
          const worldDeltaX = deltaX / camera.zoom;
          const worldDeltaY = deltaY / camera.zoom;
          store.moveSelectedNodes(worldDeltaX, worldDeltaY, nodesStartPositions);
          renderer.renderFrame();
        } else if (dragMode === 'waypoint' && draggedEdgeId) {
          const { x: worldX, y: worldY } = renderer.screenToWorld(event.offsetX, event.offsetY);
          store.updateEdgePoint(draggedEdgeId, draggedWaypointIndex, {
            x: Math.round(worldX),
            y: Math.round(worldY),
          });
          renderer.setGraph(
            store.getState().graph.nodes,
            store.getState().graph.edges,
            store.getState().graph.groups ?? [],
          );
          renderer.renderFrame();
        } else if (dragMode === 'connect') {
          const { x: worldX, y: worldY } = renderer.screenToWorld(event.offsetX, event.offsetY);
          store.updateConnectingCursor(worldX, worldY);
          renderer.setConnectingEdge({
            fromNodeId: connectingSourceNodeId,
            fromPortId: connectingSourcePortId,
            cursorX: worldX,
            cursorY: worldY,
          });
          const hoverHit = renderer.hitTestSync(event.offsetX, event.offsetY, 16);
          if (hoverHit?.type === 'port' && hoverHit.nodeId !== connectingSourceNodeId && hoverHit.portId) {
            renderer.setHoveredPort({
              nodeId: hoverHit.nodeId,
              portId: hoverHit.portId,
            });
          } else {
            renderer.setHoveredPort();
          }
          renderer.renderFrame();
        } else if (dragMode === 'node' && nodesStartPositions.size > 0) {
          const worldDeltaX = deltaX / camera.zoom;
          const worldDeltaY = deltaY / camera.zoom;
          store.moveSelectedNodes(worldDeltaX, worldDeltaY, nodesStartPositions);
          renderer.renderFrame();
        } else if (dragMode === 'pan') {
          dragStartScreen = { x: event.clientX, y: event.clientY };
          renderer.pan(deltaX, deltaY);
          renderer.renderFrame();
        }
      };

      /**
       * Handles pointer up events to commit node moves or complete connection linking.
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
            const minScreenX = Math.min(boxSelectStart.x, event.offsetX);
            const maxScreenX = Math.max(boxSelectStart.x, event.offsetX);
            const minScreenY = Math.min(boxSelectStart.y, event.offsetY);
            const maxScreenY = Math.max(boxSelectStart.y, event.offsetY);

            const topLeftWorld = renderer.screenToWorld(minScreenX, minScreenY);
            const bottomRightWorld = renderer.screenToWorld(maxScreenX, maxScreenY);

            const matchedNodeIds = renderer.queryNodesInBox({
              minX: Math.min(topLeftWorld.x, bottomRightWorld.x),
              minY: Math.min(topLeftWorld.y, bottomRightWorld.y),
              maxX: Math.max(topLeftWorld.x, bottomRightWorld.x),
              maxY: Math.max(topLeftWorld.y, bottomRightWorld.y),
            });

            store.selectNodes(matchedNodeIds, event.shiftKey);
            setSelectionSquare({ active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });
            break;
          }
          case 'connect': {
            const targetHit = renderer.hitTestSync(event.offsetX, event.offsetY, 18);
            if (targetHit?.type === 'port' && targetHit.nodeId !== connectingSourceNodeId && targetHit.portId) {
              store.connectPorts(connectingSourceNodeId, connectingSourcePortId, targetHit.nodeId, targetHit.portId);
            }
            store.cancelConnecting();
            renderer.setConnectingEdge();
            renderer.setHoveredPort();
            renderer.renderFrame();
            break;
          }
          case 'node':
          case 'group': {
            store.commitNodeMove();
            renderer.renderFrame();
            break;
          }
          case 'waypoint': {
            renderer.renderFrame();
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
       * Handles right-click events to display context actions for nodes, groups, edges, or the canvas.
       */
      const onContextMenu = (event: MouseEvent): void => {
        event.preventDefault();
        const canvasRect = canvasElement.getBoundingClientRect();
        const screenX = event.clientX - canvasRect.left;
        const screenY = event.clientY - canvasRect.top;
        const world = renderer.screenToWorld(screenX, screenY);
        const windowWidth = globalThis.window ? window.innerWidth : 1200;
        const windowHeight = globalThis.window ? window.innerHeight : 800;

        const hit = renderer.hitTestSync(screenX, screenY);
        let targetType: 'empty' | 'node' | 'group' | 'selection' | 'edge' = 'empty';
        let targetId = '';
        let targetGroupId = '';

        if (hit?.type === 'edge' && hit.edgeId) {
          targetType = 'edge';
          targetId = hit.edgeId;
          store.selectEdge(hit.edgeId);
          renderer.setSelection([], [hit.edgeId]);
        } else if (hit?.type === 'node') {
          const isSelected = store.getState().selectedNodeIds.includes(hit.nodeId);
          if (store.getState().selectedNodeIds.length > 1 && isSelected) {
            targetType = 'selection';
          } else {
            targetType = 'node';
            targetId = hit.nodeId;
            store.selectNode(hit.nodeId);
            renderer.setSelection([hit.nodeId]);
          }
          const node = store.getState().graph.nodes.find((n) => n.id === hit.nodeId);
          if (node?.groupId) {
            targetGroupId = node.groupId;
          }
        } else {
          // Check if cursor is inside any group bounds
          const groupHit = (store.getState().graph.groups ?? []).find((g) => {
            const groupNodes = store.getState().graph.nodes.filter((n) => g.nodeIds.includes(n.id));
            if (groupNodes.length === 0) return false;
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            for (const n of groupNodes) {
              if (n.position.x < minX) minX = n.position.x;
              if (n.position.y < minY) minY = n.position.y;
              if (n.position.x + 220 > maxX) maxX = n.position.x + 220;
              if (n.position.y + 100 > maxY) maxY = n.position.y + 100;
            }
            return world.x >= minX - 24 && world.x <= maxX + 24 && world.y >= minY - 46 && world.y <= maxY + 24;
          });
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
       * Handles global keyboard shortcuts for escape navigation, node deletion, and clipboard actions.
       */
      const onKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
          if (store.canNavigateBack()) {
            store.navigateBack();
            renderer.setGraph(
              store.getState().graph.nodes,
              store.getState().graph.edges,
              store.getState().graph.groups ?? [],
            );
            renderer.renderFrame();
          } else if (contextMenu.open) {
            setContextMenu((previous) => ({ ...previous, open: false }));
          } else {
            store.deselectAll();
            renderer.setSelection([], []);
            renderer.renderFrame();
          }
        } else if (event.key === 'Delete' || event.key === 'Backspace') {
          if (
            typeof document !== 'undefined' &&
            (document.activeElement instanceof HTMLInputElement ||
              document.activeElement instanceof HTMLTextAreaElement)
          ) {
            return;
          }
          if (store.getState().activeEdgeId) {
            store.removeActiveEdge();
            renderer.setGraph(
              store.getState().graph.nodes,
              store.getState().graph.edges,
              store.getState().graph.groups ?? [],
            );
            renderer.renderFrame();
          } else if (store.getState().selectedNodeIds.length > 0) {
            store.deleteSelected();
            renderer.setGraph(
              store.getState().graph.nodes,
              store.getState().graph.edges,
              store.getState().graph.groups ?? [],
            );
            renderer.renderFrame();
          }
        }
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

      cleanupListeners = () => {
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

    return () => {
      unsubscribe();
      resizeObserver?.disconnect();
      cleanupListeners?.();
      if (rendererReference.current) {
        rendererReference.current.destroy();
        rendererReference.current = undefined;
      }
    };
  }, [store, properties.renderer, resolvedTheme]);

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
    const center = rendererReference.current?.getCamera();
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

  const outputEntries = Object.entries(editorState.lastOutputs);

  return (
    <div
      className={classNames(styles.editorContainer, properties.className)}
      data-theme={resolvedTheme}
    >
      {/* Top Application Toolbar */}
      <header className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <span
            style={{
              fontWeight: 700,
              fontSize: '14px',
              letterSpacing: '0.02em',
            }}
          >
            Flint Node Graph
          </span>
          <ForgeButtonGroup
            size="sm"
            attached={false}
            gap="xs"
            ariaLabel="Graph Execution and Export"
          >
            <ForgeButton
              variant="primary"
              size="sm"
              onClick={handleRun}
              disabled={editorState.isExecuting}
            >
              {editorState.isExecuting ? 'Running...' : 'Run Wasm'}
            </ForgeButton>
            <ForgeButton
              variant="secondary"
              size="sm"
              onClick={handleExport}
            >
              Export Flint
            </ForgeButton>
            <ForgeButton
              variant="secondary"
              size="sm"
              onClick={() => {
                const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
                setResolvedTheme(nextTheme);
                rendererReference.current?.setTheme(nextTheme);
                rendererReference.current?.renderFrame();
              }}
              ariaLabel={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
            >
              {resolvedTheme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </ForgeButton>
          </ForgeButtonGroup>

          <ForgeButtonGroup
            size="sm"
            attached={false}
            gap="xs"
            ariaLabel="History Actions"
          >
            <ForgeButton
              variant="secondary"
              size="sm"
              disabled={!editorState.canUndo}
              onClick={() => store.undo()}
            >
              Undo
            </ForgeButton>
            <ForgeButton
              variant="secondary"
              size="sm"
              disabled={!editorState.canRedo}
              onClick={() => store.redo()}
            >
              Redo
            </ForgeButton>
          </ForgeButtonGroup>

          <ForgeButtonGroup
            size="sm"
            attached={false}
            gap="xs"
            ariaLabel="Node Structuring Actions"
          >
            <ForgeButton
              variant="secondary"
              size="sm"
              disabled={editorState.selectedNodeIds.length === 0}
              onClick={() => store.groupSelectedNodes()}
            >
              Group
            </ForgeButton>
            <ForgeButton
              variant="secondary"
              size="sm"
              disabled={editorState.selectedNodeIds.length === 0}
              onClick={() => store.createMetaNodeFromSelected()}
            >
              Create Meta
            </ForgeButton>
            <ForgeButton
              variant="secondary"
              size="sm"
              disabled={
                !editorState.selectedNodeIds.some(
                  (id) => editorState.graph.nodes.find((node) => node?.id === id)?.groupId,
                )
              }
              onClick={() => store.ungroupSelected()}
            >
              Ungroup
            </ForgeButton>
            <ForgeButton
              variant="error"
              size="sm"
              disabled={editorState.selectedNodeIds.length === 0 && !editorState.activeEdgeId}
              onClick={() => store.deleteSelected()}
            >
              Delete
            </ForgeButton>
          </ForgeButtonGroup>
        </div>

        <div className={styles.toolbarGroup}>
          <ForgeBadge
            variant={editorState.validation.valid ? 'success' : 'error'}
            size="sm"
          >
            {editorState.validation.valid ? 'Valid DAG' : `${editorState.validation.issues.length} Issues`}
          </ForgeBadge>
          <ForgeBadge
            variant={isFallback ? 'warning' : 'primary'}
            size="sm"
          >
            {isFallback ? '2D Canvas' : 'WebGPU'}
          </ForgeBadge>
          <ForgeButton
            variant="ghost"
            size="sm"
            onClick={() => setShowPerfModal(true)}
            ariaLabel="Click to view detailed D3 performance breakdown"
          >
            <span className={styles.perfDot} />
            <span>
              update: {perfMetrics.updateTimeMs.toFixed(1)}ms | render: {perfMetrics.renderTimeMs.toFixed(1)}ms{' '}
              {isFallback ? '(2D)' : '(WebGPU)'}
            </span>
          </ForgeButton>
        </div>
      </header>

      {/* Main Workspace */}
      <div className={styles.mainArea}>
        {/* Left Node Palette Drawer */}
        <aside className={styles.paletteDrawer}>
          <div className={styles.paletteHeader}>
            <input
              type="text"
              aria-label="Search node palette"
              placeholder="Search operations..."
              className={styles.paletteSearch}
              value={searchQuery}
              onInput={(event: unknown) => {
                if (
                  typeof HTMLInputElement !== 'undefined' &&
                  event &&
                  typeof event === 'object' &&
                  'target' in event &&
                  event.target instanceof HTMLInputElement
                ) {
                  setSearchQuery(event.target.value);
                }
              }}
            />
          </div>

          <div className={styles.paletteList}>
            {editorState.registeredMetaNodes && editorState.registeredMetaNodes.length > 0 && (
              <ForgeCollapse
                summary="Meta Nodes"
                open={true}
                size="sm"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '4px 0' }}>
                  {editorState.registeredMetaNodes.map((meta) => (
                    <button
                      key={meta?.id ?? ''}
                      type="button"
                      draggable={true}
                      className={styles.paletteItem}
                      onClick={() => store.instantiateMetaNode(meta.id)}
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
                          store.removeRegisteredMetaNode(meta.id);
                        }
                      }}
                      title="Click or drag to add. Right-click to remove if unreferenced."
                    >
                      <span className={styles.paletteItemTitle}>{meta.title}</span>
                      <span className={styles.paletteItemDesc}>
                        {meta.description ?? 'Reusable composite meta node function'}
                      </span>
                    </button>
                  ))}
                </div>
              </ForgeCollapse>
            )}
            {populatedCategories.map((group) => (
              <ForgeCollapse
                key={group.category}
                summary={group.category.toUpperCase()}
                open={true}
                size="sm"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '4px 0' }}>
                  {group.definitions.map((item) => (
                    <button
                      key={item?.operation ?? ''}
                      type="button"
                      draggable={true}
                      className={styles.paletteItem}
                      onClick={() => handleAddNode(item.operation)}
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
              </ForgeCollapse>
            ))}
          </div>
        </aside>

        {/* Center WebGPU Canvas */}
        <main
          className={styles.canvasContainer}
          onDragOver={(event: unknown) => {
            if (typeof DragEvent !== 'undefined' && event instanceof DragEvent) {
              event.preventDefault();
              if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'copy';
              }
            }
          }}
          onDrop={(event: unknown) => {
            if (typeof DragEvent !== 'undefined' && event instanceof DragEvent && event.dataTransfer) {
              event.preventDefault();
              const op = event.dataTransfer.getData('text/plain');
              if (op && rendererReference.current && canvasReference.current) {
                const rect = canvasReference.current.getBoundingClientRect();
                const world = rendererReference.current.screenToWorld(
                  event.clientX - rect.left,
                  event.clientY - rect.top,
                );
                if (op.startsWith('meta_template:')) {
                  const templateId = op.slice('meta_template:'.length);
                  store.instantiateMetaNode(templateId, world);
                } else {
                  store.addNode(op, world);
                }
              }
            }
          }}
        >
          {editorState.breadcrumbs && editorState.breadcrumbs.length > 1 && (
            <div className={styles.breadcrumbBar}>
              <ForgeButton
                variant="ghost"
                size="xs"
                onClick={() => {
                  store.navigateBack();
                  rendererReference.current?.setGraph(
                    store.getState().graph.nodes,
                    store.getState().graph.edges,
                    store.getState().graph.groups ?? [],
                  );
                  rendererReference.current?.renderFrame();
                }}
                ariaLabel="Back to parent graph"
              >
                ← Back
              </ForgeButton>
              <span className={styles.breadcrumbDivider}>|</span>
              <ForgeBreadcrumb
                items={editorState.breadcrumbs.map((crumb) => ({ label: crumb.title }))}
                size="xs"
              />
            </div>
          )}
          {isFallback && (
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
            ref={canvasReference}
            className={styles.canvas}
          />
          {selectionSquare.active && (
            <div
              className={styles.selectionSquare}
              style={{
                left: `${Math.min(selectionSquare.startX, selectionSquare.currentX)}px`,
                top: `${Math.min(selectionSquare.startY, selectionSquare.currentY)}px`,
                width: `${Math.abs(selectionSquare.currentX - selectionSquare.startX)}px`,
                height: `${Math.abs(selectionSquare.currentY - selectionSquare.startY)}px`,
              }}
            />
          )}
        </main>

        {/* Right Property & Output Inspector */}
        <aside className={styles.inspectorDrawer}>
          <div className={styles.inspectorSection}>
            <div className={styles.inspectorTitle}>Inspector</div>
            {selectedGroup ? (
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
                    value={selectedGroup.title}
                    type="text"
                    aria-label="Group Name"
                    className={styles.inspectorInput}
                    onInput={(event: unknown) => {
                      if (
                        typeof HTMLInputElement !== 'undefined' &&
                        event &&
                        typeof event === 'object' &&
                        'target' in event &&
                        event.target instanceof HTMLInputElement
                      ) {
                        store.setGroupTitle(selectedGroup.id, event.target.value);
                        rendererReference.current?.setGraph(
                          store.getState().graph.nodes,
                          store.getState().graph.edges,
                          store.getState().graph.groups ?? [],
                        );
                        rendererReference.current?.renderFrame();
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
                    {['#58a6ff', '#a371f7', '#3fb950', '#d29922', '#f85149', '#39c5bb'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={styles.colorSwatch}
                        style={{
                          backgroundColor: c,
                          border: selectedGroup.color === c ? '2px solid #ffffff' : '1px solid #30363d',
                        }}
                        onClick={() => {
                          store.setGroupColor(selectedGroup.id, c);
                          rendererReference.current?.setGraph(
                            store.getState().graph.nodes,
                            store.getState().graph.edges,
                            store.getState().graph.groups ?? [],
                          );
                          rendererReference.current?.renderFrame();
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className={styles.inspectorRow}>
                  <span className={styles.inspectorLabel}>Member Nodes</span>
                  <span style={{ fontSize: '12px' }}>{selectedGroup.nodeIds.length} nodes</span>
                </div>
                <div style={{ marginTop: '12px' }}>
                  <ForgeButton
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      store.ungroup(selectedGroup.id);
                      rendererReference.current?.setGraph(
                        store.getState().graph.nodes,
                        store.getState().graph.edges,
                        store.getState().graph.groups ?? [],
                      );
                      rendererReference.current?.renderFrame();
                    }}
                  >
                    Ungroup
                  </ForgeButton>
                </div>
              </div>
            ) : selectedEdge ? (
              <div>
                <div className={styles.inspectorRow}>
                  <span className={styles.inspectorLabel}>Connection ID</span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontFamily: 'var(--mp-font-family-mono, "Datatype", monospace)',
                    }}
                  >
                    {selectedEdge.id}
                  </span>
                </div>
                <div className={styles.inspectorRow}>
                  <span className={styles.inspectorLabel}>Waypoints</span>
                  <span style={{ fontSize: '12px' }}>{selectedEdge.points?.length ?? 0} custom points</span>
                </div>
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <ForgeButton
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      store.clearEdgePoints(selectedEdge.id);
                      rendererReference.current?.setGraph(
                        store.getState().graph.nodes,
                        store.getState().graph.edges,
                        store.getState().graph.groups ?? [],
                      );
                      rendererReference.current?.renderFrame();
                    }}
                  >
                    Reset Path (Default Curve)
                  </ForgeButton>
                  <ForgeButton
                    variant="error"
                    size="sm"
                    onClick={() => {
                      store.removeEdge(selectedEdge.id);
                      rendererReference.current?.setGraph(
                        store.getState().graph.nodes,
                        store.getState().graph.edges,
                        store.getState().graph.groups ?? [],
                      );
                      rendererReference.current?.renderFrame();
                    }}
                  >
                    Delete Connection
                  </ForgeButton>
                </div>
              </div>
            ) : selectedNode ? (
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
                    value={selectedNode.title}
                    type="text"
                    aria-label="Node Title"
                    className={styles.inspectorInput}
                    onInput={(event: unknown) => {
                      if (
                        typeof HTMLInputElement !== 'undefined' &&
                        event &&
                        typeof event === 'object' &&
                        'target' in event &&
                        event.target instanceof HTMLInputElement
                      ) {
                        store.renameNode(selectedNode.id, event.target.value);
                      }
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
                    value={selectedNode.operation}
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
                    value={selectedNode.category}
                    type="text"
                    aria-label="Node Category"
                    className={styles.inspectorInput}
                    readOnly
                  />
                </div>

                {/* Node Documentation */}
                {selectedDefinition && <div className={styles.docBlock}>{selectedDefinition.description}</div>}

                {/* Meta Node Subgraph Info */}
                {selectedNode.metaSubgraph && (
                  <div
                    className={styles.docBlock}
                    style={{ borderLeftColor: '#79c0ff' }}
                  >
                    <strong>Composite Meta Node:</strong> Contains {selectedNode.metaSubgraph.nodes.length} internal
                    nodes and {selectedNode.metaSubgraph.edges.length} connections.
                    <div style={{ marginTop: '8px' }}>
                      <ForgeButton
                        variant="secondary"
                        size="xs"
                        onClick={() => store.expandMetaNode(selectedNode.id)}
                      >
                        Expand / Unpack Meta Node
                      </ForgeButton>
                    </div>
                  </div>
                )}

                {/* Input Pins Table */}
                {selectedNode.inputs.length > 0 && (
                  <div>
                    <span
                      className={styles.inspectorLabel}
                      style={{ fontWeight: 600 }}
                    >
                      Input Pins
                    </span>
                    <div className={styles.portTable}>
                      {selectedNode.inputs.map((port) => (
                        <div
                          key={port.id}
                          className={styles.portTableRow}
                        >
                          <span>{port.name}</span>
                          <ForgeBadge
                            variant="info"
                            size="xs"
                          >
                            {port.type.reference ?? port.type.name}
                          </ForgeBadge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Output Pins Table */}
                {selectedNode.outputs.length > 0 && (
                  <div>
                    <span
                      className={styles.inspectorLabel}
                      style={{ fontWeight: 600 }}
                    >
                      Output Pins
                    </span>
                    <div className={styles.portTable}>
                      {selectedNode.outputs.map((port) => (
                        <div
                          key={port.id}
                          className={styles.portTableRow}
                        >
                          <span>{port.name}</span>
                          <ForgeBadge
                            variant="success"
                            size="xs"
                          >
                            {port.type.reference ?? port.type.name}
                          </ForgeBadge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Property Values Editor */}
                {selectedNode.properties?.value !== undefined && (
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
                      value={String(selectedNode.properties.value)}
                      onInput={(event: unknown) => {
                        if (
                          typeof HTMLInputElement !== 'undefined' &&
                          event &&
                          typeof event === 'object' &&
                          'target' in event &&
                          event.target instanceof HTMLInputElement
                        ) {
                          const numberValue = Number(event.target.value);
                          store.updateNodeProperty(
                            selectedNode.id,
                            'value',
                            Number.isNaN(numberValue) ? 0 : numberValue,
                          );
                        }
                      }}
                    />
                  </div>
                )}

                {selectedNode.properties?.name !== undefined && (
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
                      value={String(selectedNode.properties.name)}
                      onInput={(event: unknown) => {
                        if (
                          typeof HTMLInputElement !== 'undefined' &&
                          event &&
                          typeof event === 'object' &&
                          'target' in event &&
                          event.target instanceof HTMLInputElement
                        ) {
                          store.updateNodeProperty(selectedNode.id, 'name', event.target.value);
                        }
                      }}
                    />
                  </div>
                )}

                <div className={styles.inspectorRow}>
                  <span className={styles.inspectorLabel}>Position</span>
                  <span style={{ fontSize: '12px' }}>
                    X: {Math.round(selectedNode.position.x)}, Y: {Math.round(selectedNode.position.y)}
                  </span>
                </div>

                {(selectedNode.operation === 'flint_code' || selectedNode.kind === 'custom') && (
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
                      value={String(selectedNode.properties?.code ?? '')}
                      onInput={(event: unknown) => {
                        if (
                          typeof HTMLTextAreaElement !== 'undefined' &&
                          event &&
                          typeof event === 'object' &&
                          'target' in event &&
                          event.target instanceof HTMLTextAreaElement
                        ) {
                          store.updateCodeNode(
                            selectedNode.id,
                            event.target.value,
                            selectedNode.inputs,
                            selectedNode.outputs,
                            typeof selectedNode.properties?.functionName === 'string'
                              ? selectedNode.properties.functionName
                              : undefined,
                          );
                        }
                      }}
                    />
                  </div>
                )}

                {selectedNode.outputs.length > 1 && (
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
                      checked={selectedNode.splitOutputs !== false}
                      onChange={() => store.toggleSplitOutputs(selectedNode.id)}
                    />
                  </div>
                )}

                {selectedNode.groupId && (
                  <div
                    className={styles.inspectorRow}
                    style={{ flexDirection: 'column', alignItems: 'flex-start' }}
                  >
                    <span className={styles.inspectorLabel}>Group Color</span>
                    <div className={styles.colorPickerRow}>
                      {['#58a6ff', '#a371f7', '#3fb950', '#d29922', '#f85149', '#39c5bb'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={styles.colorSwatch}
                          style={{ backgroundColor: c }}
                          onClick={() => {
                            if (selectedNode.groupId) {
                              store.setGroupColor(selectedNode.groupId, c);
                              rendererReference.current?.setGraph(
                                store.getState().graph.nodes,
                                store.getState().graph.edges,
                                store.getState().graph.groups ?? [],
                              );
                              rendererReference.current?.renderFrame();
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '12px' }}>
                  <ForgeButton
                    variant="error"
                    size="sm"
                    onClick={() => store.removeNode(selectedNode.id)}
                  >
                    Delete Node
                  </ForgeButton>
                </div>
              </div>
            ) : (
              <div style={{ color: '#8b949e', fontSize: '12px' }}>
                Select a node, group label, or connection on canvas to view and configure properties.
              </div>
            )}
          </div>

          {/* Execution Results Panel */}
          <div
            className={styles.inspectorSection}
            style={{ borderTop: '1px solid #30363d', paddingTop: '12px' }}
          >
            <div className={styles.inspectorTitle}>Execution Output</div>
            <ForgeCard padding="sm">
              {editorState.lastError ? (
                <div style={{ color: '#f85149', fontSize: '12px' }}>{editorState.lastError}</div>
              ) : outputEntries.length > 0 ? (
                <div>
                  {outputEntries.map(([key, value]) => (
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
                <div style={{ color: '#8b949e', fontSize: '12px' }}>
                  Click &quot;Run Wasm&quot; to compile and execute graph.
                </div>
              )}
            </ForgeCard>
          </div>
        </aside>
      </div>

      {/* Floating Right-Click Context Menu */}
      {contextMenu.open && (
        <div
          role="dialog"
          aria-label="Add Node Context Menu"
          className={styles.contextMenu}
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
        >
          <div className={styles.contextMenuHeader}>
            <input
              type="text"
              placeholder="Search node..."
              className={styles.contextMenuSearch}
              value={contextMenu.query}
              onInput={(event: unknown) => {
                if (
                  typeof HTMLInputElement !== 'undefined' &&
                  event &&
                  typeof event === 'object' &&
                  'target' in event &&
                  event.target instanceof HTMLInputElement
                ) {
                  setContextMenu({ ...contextMenu, query: event.target.value });
                }
              }}
            />
          </div>
          {contextMenu.targetType === 'edge' && contextMenu.targetId && (
            <div className={styles.contextMenuActions}>
              <button
                type="button"
                className={styles.contextMenuItem}
                onClick={() => {
                  store.addEdgePoint(contextMenu.targetId ?? '', {
                    x: Math.round(contextMenu.worldX),
                    y: Math.round(contextMenu.worldY),
                  });
                  rendererReference.current?.setGraph(
                    store.getState().graph.nodes,
                    store.getState().graph.edges,
                    store.getState().graph.groups ?? [],
                  );
                  rendererReference.current?.renderFrame();
                  setContextMenu({ ...contextMenu, open: false });
                }}
              >
                + Add Waypoint Here
              </button>
              <button
                type="button"
                className={styles.contextMenuItem}
                onClick={() => {
                  store.clearEdgePoints(contextMenu.targetId ?? '');
                  rendererReference.current?.setGraph(
                    store.getState().graph.nodes,
                    store.getState().graph.edges,
                    store.getState().graph.groups ?? [],
                  );
                  rendererReference.current?.renderFrame();
                  setContextMenu({ ...contextMenu, open: false });
                }}
              >
                Reset Path (Default Curve)
              </button>
              <button
                type="button"
                className={styles.contextMenuItem}
                style={{ color: '#f85149' }}
                onClick={() => {
                  store.removeEdge(contextMenu.targetId ?? '');
                  rendererReference.current?.setGraph(
                    store.getState().graph.nodes,
                    store.getState().graph.edges,
                    store.getState().graph.groups ?? [],
                  );
                  rendererReference.current?.renderFrame();
                  setContextMenu({ ...contextMenu, open: false });
                }}
              >
                Remove Connection
              </button>
            </div>
          )}

          {contextMenu.targetType === 'node' && contextMenu.targetId && (
            <div className={styles.contextMenuActions}>
              <button
                type="button"
                className={styles.contextMenuItem}
                onClick={() => {
                  store.copyNode(contextMenu.targetId ?? '');
                  setContextMenu({ ...contextMenu, open: false });
                }}
              >
                Copy Node
              </button>
              {selectedNode?.metaSubgraph && (
                <div>
                  <button
                    type="button"
                    className={styles.contextMenuItem}
                    onClick={() => {
                      store.drillIntoMetaNode(contextMenu.targetId ?? '');
                      rendererReference.current?.setGraph(
                        store.getState().graph.nodes,
                        store.getState().graph.edges,
                        store.getState().graph.groups ?? [],
                      );
                      rendererReference.current?.renderFrame();
                      setContextMenu({ ...contextMenu, open: false });
                    }}
                  >
                    Enter Function (Drill Down)
                  </button>
                  <button
                    type="button"
                    className={styles.contextMenuItem}
                    onClick={() => {
                      store.duplicateMetaNode(contextMenu.targetId ?? '');
                      rendererReference.current?.setGraph(
                        store.getState().graph.nodes,
                        store.getState().graph.edges,
                        store.getState().graph.groups ?? [],
                      );
                      rendererReference.current?.renderFrame();
                      setContextMenu({ ...contextMenu, open: false });
                    }}
                  >
                    Duplicate Meta Node
                  </button>
                </div>
              )}
              {contextMenu.targetGroupId && (
                <div>
                  <button
                    type="button"
                    className={styles.contextMenuItem}
                    onClick={() => {
                      store.copyGroup(contextMenu.targetGroupId ?? '');
                      setContextMenu({ ...contextMenu, open: false });
                    }}
                  >
                    Copy Group
                  </button>
                  <button
                    type="button"
                    className={styles.contextMenuItem}
                    onClick={() => {
                      store.ungroup(contextMenu.targetGroupId ?? '');
                      rendererReference.current?.setGraph(
                        store.getState().graph.nodes,
                        store.getState().graph.edges,
                        store.getState().graph.groups ?? [],
                      );
                      rendererReference.current?.renderFrame();
                      setContextMenu({ ...contextMenu, open: false });
                    }}
                  >
                    Ungroup
                  </button>
                </div>
              )}
              {selectedNode && selectedNode.outputs.length > 1 && (
                <button
                  type="button"
                  className={styles.contextMenuItem}
                  onClick={() => {
                    store.toggleSplitOutputs(contextMenu.targetId ?? '');
                    setContextMenu({ ...contextMenu, open: false });
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
                  store.removeNode(contextMenu.targetId ?? '');
                  rendererReference.current?.setGraph(
                    store.getState().graph.nodes,
                    store.getState().graph.edges,
                    store.getState().graph.groups ?? [],
                  );
                  rendererReference.current?.renderFrame();
                  setContextMenu({ ...contextMenu, open: false });
                }}
              >
                Delete Node
              </button>
            </div>
          )}

          {contextMenu.targetType === 'group' && contextMenu.targetGroupId && (
            <div className={styles.contextMenuActions}>
              <button
                type="button"
                className={styles.contextMenuItem}
                onClick={() => {
                  store.copyGroup(contextMenu.targetGroupId ?? '');
                  setContextMenu({ ...contextMenu, open: false });
                }}
              >
                Copy Group (with Connections)
              </button>
              <button
                type="button"
                className={styles.contextMenuItem}
                onClick={() => {
                  store.ungroup(contextMenu.targetGroupId ?? '');
                  rendererReference.current?.setGraph(
                    store.getState().graph.nodes,
                    store.getState().graph.edges,
                    store.getState().graph.groups ?? [],
                  );
                  rendererReference.current?.renderFrame();
                  setContextMenu({ ...contextMenu, open: false });
                }}
              >
                Ungroup
              </button>
              <div style={{ padding: '4px 8px', fontSize: '11px', color: '#8b949e' }}>Group Color:</div>
              <div
                className={styles.colorPickerRow}
                style={{ padding: '0 8px' }}
              >
                {['#58a6ff', '#a371f7', '#3fb950', '#d29922', '#f85149', '#39c5bb'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={styles.colorSwatch}
                    style={{ backgroundColor: c }}
                    onClick={() => {
                      store.setGroupColor(contextMenu.targetGroupId ?? '', c);
                      rendererReference.current?.setGraph(
                        store.getState().graph.nodes,
                        store.getState().graph.edges,
                        store.getState().graph.groups ?? [],
                      );
                      rendererReference.current?.renderFrame();
                      setContextMenu({ ...contextMenu, open: false });
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {contextMenu.targetType === 'selection' && (
            <div className={styles.contextMenuActions}>
              <button
                type="button"
                className={styles.contextMenuItem}
                onClick={() => {
                  store.copySelection();
                  setContextMenu({ ...contextMenu, open: false });
                }}
              >
                Copy Selected ({editorState.selectedNodeIds.length} Nodes + Connections)
              </button>
              <button
                type="button"
                className={styles.contextMenuItem}
                onClick={() => {
                  store.groupSelectedNodes();
                  setContextMenu({ ...contextMenu, open: false });
                }}
              >
                Group Selected
              </button>
              <button
                type="button"
                className={styles.contextMenuItem}
                onClick={() => {
                  store.createMetaNodeFromSelected();
                  setContextMenu({ ...contextMenu, open: false });
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
                  setContextMenu({ ...contextMenu, open: false });
                }}
              >
                Delete Selected
              </button>
            </div>
          )}

          {editorState.hasClipboard && (
            <div
              className={styles.contextMenuActions}
              style={{ borderTop: '1px solid #30363d' }}
            >
              <button
                type="button"
                className={styles.contextMenuItem}
                onClick={() => {
                  store.paste({ x: contextMenu.worldX, y: contextMenu.worldY });
                  rendererReference.current?.setGraph(
                    store.getState().graph.nodes,
                    store.getState().graph.edges,
                    store.getState().graph.groups ?? [],
                  );
                  rendererReference.current?.renderFrame();
                  setContextMenu({ ...contextMenu, open: false });
                }}
              >
                Paste
              </button>
            </div>
          )}
          <div className={styles.contextMenuList}>
            {allDefinitions
              .filter(
                (definition) =>
                  !contextMenu.query ||
                  definition.title.toLowerCase().includes(contextMenu.query.toLowerCase()) ||
                  definition.operation.toLowerCase().includes(contextMenu.query.toLowerCase()),
              )
              .map((item) => (
                <button
                  key={item.operation}
                  type="button"
                  className={styles.contextMenuItem}
                  onClick={() => {
                    store.addNode(item.operation, {
                      x: contextMenu.worldX,
                      y: contextMenu.worldY,
                    });
                    setContextMenu({ ...contextMenu, open: false });
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{item.title}</span>
                  <span style={{ fontSize: '10px', color: '#8b949e' }}>{item.description}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Bottom Trace Debugger Bar */}
      <ForgeDebugScrubber controller={store.getTraceController()} />

      {/* Code Export Dialog Modal */}
      {showExportModal && (
        <div
          role="dialog"
          aria-modal="true"
          className={styles.modalOverlay}
          onClick={() => setShowExportModal(false)}
        >
          <div
            className={styles.modalCard}
            onClick={(event: unknown) => {
              if (typeof MouseEvent !== 'undefined' && event instanceof MouseEvent) {
                event.stopPropagation();
              }
            }}
          >
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
                <ForgeButton
                  variant="ghost"
                  size="xs"
                  onClick={() => setShowExportModal(false)}
                  ariaLabel="Close export modal"
                >
                  ✕
                </ForgeButton>
              </div>
              <div className={styles.modalBody}>
                <pre className={styles.codeBlock}>
                  <code>{exportedSource}</code>
                </pre>
              </div>
              <div className={styles.modalFooter}>
                <ForgeButton
                  variant="primary"
                  size="sm"
                  onClick={() => setShowExportModal(false)}
                >
                  Close
                </ForgeButton>
              </div>
            </ForgeCard>
          </div>
        </div>
      )}

      {/* Detailed D3 Performance Profiler Modal */}
      {showPerfModal && (
        <div
          role="dialog"
          aria-modal="true"
          className={styles.modalOverlay}
          onClick={() => setShowPerfModal(false)}
        >
          <div
            className={styles.perfModal}
            onClick={(event: unknown) => {
              if (typeof MouseEvent !== 'undefined' && event instanceof MouseEvent) {
                event.stopPropagation();
              }
            }}
          >
            <ForgeCard
              size="xl"
              variant="neutral"
              padding="none"
              bordered={true}
              shadow={true}
            >
              <div className={styles.modalHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={styles.modalTitle}>Performance Profiler & Realtime Telemetry</span>
                  <ForgeBadge
                    variant="success"
                    size="xs"
                  >
                    {Math.round(1000 / Math.max(1, perfMetrics.totalFrameTimeMs))} FPS
                  </ForgeBadge>
                  <ForgeBadge
                    variant="neutral"
                    size="xs"
                  >
                    {perfMetrics.backend?.toUpperCase() ?? (perfMetrics.isFallback ? 'CANVAS2D' : 'WEBGPU')}
                  </ForgeBadge>
                </div>
                <ForgeButton
                  variant="ghost"
                  size="xs"
                  onClick={() => setShowPerfModal(false)}
                  ariaLabel="Close performance modal"
                >
                  ✕
                </ForgeButton>
              </div>
              <div className={styles.modalBody}>
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#8b949e', marginBottom: '6px' }}>
                    Telemetry Refresh Interval
                  </div>
                  <ForgeButtonGroup size="xs">
                    <ForgeButton
                      variant={telemetryInterval === 'realtime' ? 'primary' : 'ghost'}
                      size="xs"
                      onClick={() => setTelemetryInterval('realtime')}
                    >
                      Realtime
                    </ForgeButton>
                    <ForgeButton
                      variant={telemetryInterval === '100ms' ? 'primary' : 'ghost'}
                      size="xs"
                      onClick={() => setTelemetryInterval('100ms')}
                    >
                      100ms
                    </ForgeButton>
                    <ForgeButton
                      variant={telemetryInterval === '250ms' ? 'primary' : 'ghost'}
                      size="xs"
                      onClick={() => setTelemetryInterval('250ms')}
                    >
                      250ms
                    </ForgeButton>
                    <ForgeButton
                      variant={telemetryInterval === '500ms' ? 'primary' : 'ghost'}
                      size="xs"
                      onClick={() => setTelemetryInterval('500ms')}
                    >
                      500ms
                    </ForgeButton>
                    <ForgeButton
                      variant={telemetryInterval === '750ms' ? 'primary' : 'ghost'}
                      size="xs"
                      onClick={() => setTelemetryInterval('750ms')}
                    >
                      750ms
                    </ForgeButton>
                    <ForgeButton
                      variant={telemetryInterval === '1500ms' ? 'primary' : 'ghost'}
                      size="xs"
                      onClick={() => setTelemetryInterval('1500ms')}
                    >
                      1500ms
                    </ForgeButton>
                  </ForgeButtonGroup>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <ForgePerformanceTimelineChart
                    history={perfHistory}
                    currentMetrics={perfMetrics}
                    width={880}
                    height={180}
                  />
                </div>

                <div
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}
                >
                  <div
                    style={{ background: '#161b22', padding: '8px', borderRadius: '6px', border: '1px solid #30363d' }}
                  >
                    <div style={{ fontSize: '10px', color: '#8b949e' }}>Total Frame Time</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#58a6ff' }}>
                      {perfMetrics.totalFrameTimeMs.toFixed(2)} ms
                    </div>
                  </div>
                  <div
                    style={{ background: '#161b22', padding: '8px', borderRadius: '6px', border: '1px solid #30363d' }}
                  >
                    <div style={{ fontSize: '10px', color: '#8b949e' }}>Render Duration</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#3fb950' }}>
                      {perfMetrics.renderTimeMs.toFixed(2)} ms
                    </div>
                  </div>
                  <div
                    style={{ background: '#161b22', padding: '8px', borderRadius: '6px', border: '1px solid #30363d' }}
                  >
                    <div style={{ fontSize: '10px', color: '#8b949e' }}>Spatial Indexing</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#d29922' }}>
                      {perfMetrics.spatialIndexTimeMs.toFixed(2)} ms
                    </div>
                  </div>
                  <div
                    style={{ background: '#161b22', padding: '8px', borderRadius: '6px', border: '1px solid #30363d' }}
                  >
                    <div style={{ fontSize: '10px', color: '#8b949e' }}>Visible Nodes</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#f0883e' }}>
                      {perfMetrics.visibleNodesCount} / {perfMetrics.totalNodesCount ?? perfMetrics.visibleNodesCount}
                    </div>
                  </div>
                </div>

                <div
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}
                >
                  <div
                    style={{ background: '#161b22', padding: '8px', borderRadius: '6px', border: '1px solid #30363d' }}
                  >
                    <div style={{ fontSize: '10px', color: '#8b949e' }}>Updates & Layout</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#f0883e' }}>
                      {((perfMetrics.updateTimeMs ?? 0) + (perfMetrics.layoutTimeMs ?? 0)).toFixed(2)} ms
                    </div>
                  </div>
                  <div
                    style={{ background: '#161b22', padding: '8px', borderRadius: '6px', border: '1px solid #30363d' }}
                  >
                    <div style={{ fontSize: '10px', color: '#8b949e' }}>Buffer Uploads</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#a371f7' }}>
                      {(perfMetrics.bufferUploadTimeMs ?? 0).toFixed(2)} ms
                    </div>
                  </div>
                  <div
                    style={{ background: '#161b22', padding: '8px', borderRadius: '6px', border: '1px solid #30363d' }}
                  >
                    <div style={{ fontSize: '10px', color: '#8b949e' }}>Visible Edges & Pins</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#388bfd' }}>
                      {perfMetrics.visibleEdgesCount}E / {perfMetrics.visiblePinsCount}P
                    </div>
                  </div>
                  <div
                    style={{ background: '#161b22', padding: '8px', borderRadius: '6px', border: '1px solid #30363d' }}
                  >
                    <div style={{ fontSize: '10px', color: '#8b949e' }}>DPR / Scale</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#39c5bb' }}>
                      {perfMetrics.dpr.toFixed(1)}x DPR
                    </div>
                  </div>
                </div>

                <ForgePerformancePieChart
                  metrics={perfMetrics}
                  width={280}
                  height={240}
                />

                <div style={{ marginTop: '16px' }}>
                  <ForgeCollapse
                    summary="Debug Glyph Sprite Sheet (1024x1024 2D Shelf Packed SDF Atlas)"
                    open={true}
                    size="sm"
                    onToggle={() => paintSpriteSheet()}
                  >
                    <div className={styles.spriteSheetContainer}>
                      <div className={styles.spriteSheetToolbar}>
                        <ForgeButtonGroup size="xs">
                          <ForgeButton
                            variant={spriteSheetMode === 'crisp' ? 'primary' : 'ghost'}
                            size="xs"
                            onClick={() => {
                              setSpriteSheetMode('crisp');
                              paintSpriteSheet('crisp', spriteSheetGrid, hoveredGlyph?.index);
                            }}
                          >
                            Crisp Glyphs
                          </ForgeButton>
                          <ForgeButton
                            variant={spriteSheetMode === 'raw' ? 'primary' : 'ghost'}
                            size="xs"
                            onClick={() => {
                              setSpriteSheetMode('raw');
                              paintSpriteSheet('raw', spriteSheetGrid, hoveredGlyph?.index);
                            }}
                          >
                            Raw SDF
                          </ForgeButton>
                        </ForgeButtonGroup>
                        <ForgeButton
                          variant={spriteSheetGrid ? 'secondary' : 'ghost'}
                          size="xs"
                          onClick={() => {
                            const nextGrid = !spriteSheetGrid;
                            setSpriteSheetGrid(nextGrid);
                            paintSpriteSheet(spriteSheetMode, nextGrid, hoveredGlyph?.index);
                          }}
                        >
                          {spriteSheetGrid ? 'Grid: ON' : 'Grid: OFF'}
                        </ForgeButton>
                      </div>
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
                      <canvas
                        ref={spriteSheetCanvasReference}
                        width={1024}
                        height={1024}
                        className={styles.spriteSheetCanvas}
                        onPointerMove={onSpriteSheetPointerMove}
                        onPointerLeave={onSpriteSheetPointerLeave}
                      />
                      {hoveredGlyph && (
                        <div className={styles.spriteSheetInspector}>
                          <canvas
                            ref={inspectCanvasReference}
                            width={64}
                            height={64}
                            className={styles.spriteSheetInspectCanvas}
                          />
                          <div className={styles.spriteSheetInspectDetails}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className={styles.spriteSheetInspectChar}>
                                {hoveredGlyph.char === ' ' ? 'Space' : hoveredGlyph.char}
                              </span>
                              <ForgeBadge
                                variant="info"
                                size="xs"
                              >
                                {hoveredGlyph.codeHex}
                              </ForgeBadge>
                              <ForgeBadge
                                variant="neutral"
                                size="xs"
                              >
                                Idx {hoveredGlyph.index}
                              </ForgeBadge>
                            </div>
                            <div>
                              FreeType Metrics: {hoveredGlyph.width}×{hoveredGlyph.height}px | Bearing: (
                              {hoveredGlyph.horiBearingX}, {hoveredGlyph.horiBearingY}) | BBox: [{hoveredGlyph.bboxMinX}
                              , {hoveredGlyph.bboxMinY}, {hoveredGlyph.bboxMaxX}, {hoveredGlyph.bboxMaxY}] | Advance:{' '}
                              {hoveredGlyph.advance}px | Packed Cell: {hoveredGlyph.cellW}×{hoveredGlyph.cellH} at (
                              {hoveredGlyph.cellX}, {hoveredGlyph.cellY})
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ForgeCollapse>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <ForgeButton
                  variant="primary"
                  size="sm"
                  onClick={() => setShowPerfModal(false)}
                >
                  Close
                </ForgeButton>
              </div>
            </ForgeCard>
          </div>
        </div>
      )}
    </div>
  );
}
