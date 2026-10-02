import { init2dBackend } from './canvas2d-pass';
import { COORD_OFFSET, NODE_HEADER_HEIGHT, NODE_WIDTH, PORT_ROW_HEIGHT } from './constants';
import { cleanupGlResources, initWebGLBackend, setupGlFontTexture } from './webgl-pass';
import { initWebGpuBackend, resetWebGpuPipelines } from './webgpu-pass';

import type {
  FlintHitResult,
  FlintRenderWorkerWasmExports,
  RenderWorkerInputMessage,
  RenderWorkerOutputMessage,
} from './types';
import type { RenderWorkerState } from './worker-state';
import type { FlintGraphEdge, FlintGraphNode } from '@mission-platform/flint';

/**
 * Attempts dispatching reply message via postMessage API.
 */
function tryPostMessage(globalObj: typeof globalThis.self, message: RenderWorkerOutputMessage): void {
  try {
    if (typeof globalObj.postMessage === 'function') {
      globalObj.postMessage(message);
    }
  } catch {
    // Ignore JSDOM postMessage error
  }
}

/**
 * Attempts dispatching reply message via DOM Event dispatch.
 */
function tryDispatchEvent(globalObj: typeof globalThis.self, message: RenderWorkerOutputMessage): void {
  try {
    if (typeof globalObj.dispatchEvent === 'function' && typeof MessageEvent !== 'undefined') {
      globalObj.dispatchEvent(new MessageEvent('message', { data: message }));
    }
  } catch {
    // Ignore dispatch errors in non-browser environments
  }
}

/**
 * Dispatches a response message from the render worker back to the main thread or window.
 */
export function dispatchGlobalWorkerReply(globalObj: typeof globalThis.self, message: RenderWorkerOutputMessage): void {
  tryPostMessage(globalObj, message);
  tryDispatchEvent(globalObj, message);
}

/**
 * Dispatches a response message from the render worker back to the main thread or window.
 *
 * @param reply - Output response message payload.
 */
export const postReply = (reply: RenderWorkerOutputMessage): void => {
  const messageWithId: RenderWorkerOutputMessage = { id: 'flint_render_worker', ...reply };
  if (!globalThis.self) return;
  dispatchGlobalWorkerReply(globalThis.self, messageWithId);
};

/**
 * Selects and initializes the most suitable GPU/canvas rendering backend.
 */
export async function selectAndInitBackend(
  state: RenderWorkerState,
  targetCanvas: OffscreenCanvas | HTMLCanvasElement,
  preferred?: 'webgpu' | 'webgl' | 'canvas2d',
): Promise<{ tier: number; backend: 'webgpu' | 'webgl' | 'canvas2d'; ok: boolean }> {
  if (preferred === 'canvas2d') {
    return { tier: 3, backend: 'canvas2d', ok: init2dBackend(state, targetCanvas) };
  }
  if (preferred === 'webgl') {
    const okGl = initWebGLBackend(state, targetCanvas);
    if (okGl) return { tier: 2, backend: 'webgl', ok: true };
    return { tier: 3, backend: 'canvas2d', ok: init2dBackend(state, targetCanvas) };
  }
  const okGpu = await initWebGpuBackend(state, targetCanvas);
  if (okGpu) return { tier: 1, backend: 'webgpu', ok: true };
  const okGl = initWebGLBackend(state, targetCanvas);
  if (okGl) return { tier: 2, backend: 'webgl', ok: true };
  return { tier: 3, backend: 'canvas2d', ok: init2dBackend(state, targetCanvas) };
}

/**
 * Inserts single node into spatial acceleration structure.
 */
export function insertNodeIntoSpatialIndex(state: RenderWorkerState, index: number, node: FlintGraphNode): void {
  const wasm = state.wasm;
  if (!wasm) return;
  const maxPorts = Math.max(node.inputs?.length ?? 0, node.outputs?.length ?? 0);
  wasm.getNodeBounds(node.position.x, node.position.y, maxPorts);
  const minX = wasm.get_node_bounds_min_x();
  const minY = wasm.get_node_bounds_min_y();
  const maxX = wasm.get_node_bounds_max_x();
  const maxY = wasm.get_node_bounds_max_y();
  wasm.spatial_insert_node(
    index,
    Math.round(minX) + COORD_OFFSET,
    Math.round(minY) + COORD_OFFSET,
    Math.round(maxX) + COORD_OFFSET,
    Math.round(maxY) + COORD_OFFSET,
  );
}

/**
 * Synchronizes canvas buffer dimensions to logical viewport and DPR.
 */
function syncCanvasDimensions(state: RenderWorkerState): void {
  if (state.canvas) {
    state.canvas.width = Math.round(state.width * state.dpr);
    state.canvas.height = Math.round(state.height * state.dpr);
  }
}

/**
 * Initializes and selects the rendering backend.
 */
async function initWorkerBackendPipeline(
  state: RenderWorkerState,
  preferred?: 'webgpu' | 'webgl' | 'canvas2d',
): Promise<void> {
  const wasm = state.wasm;
  if (!wasm || !state.canvas) return;
  const result = await selectAndInitBackend(state, state.canvas, preferred);
  state.backend = result.backend;
  wasm.engine_set_backend(result.tier);
}

/**
 * Initializes the render worker backend pipelines and initial canvas buffer dimensions.
 */
export async function handleWorkerInit(
  state: RenderWorkerState,
  msg: Extract<RenderWorkerInputMessage, { type: 'init' }>,
): Promise<void> {
  const wasm = state.wasm;
  if (!wasm) return;
  state.canvas = msg.canvas;
  state.width = msg.width ?? 800;
  state.height = msg.height ?? 600;
  state.dpr = msg.dpr ?? 1;
  if (msg.theme !== undefined) {
    state.currentTheme = msg.theme;
  }

  syncCanvasDimensions(state);
  wasm.engine_create(state.width, state.height, state.dpr);
  wasm.engine_set_theme(state.currentTheme === 'light' ? 1 : 0);
  await initWorkerBackendPipeline(state, msg.renderer);

  state.performanceStats = {
    ...state.performanceStats,
    dpr: state.dpr,
  };

  wasm.engine_render_frame(state.nodes.length, state.edges.length, state.nodes.length * 4);

  postReply({
    type: 'ready',
    supported: true,
    performance: state.performanceStats,
  } as RenderWorkerOutputMessage);
}

/**
 * Clears and repopulates spatial acceleration index from active graph nodes.
 */
function rebuildSpatialIndex(state: RenderWorkerState): void {
  const wasm = state.wasm;
  if (!wasm) return;
  wasm.spatial_clear();
  for (const [index, node] of state.nodes.entries()) {
    if (node) {
      insertNodeIntoSpatialIndex(state, index, node);
    }
  }
}

/**
 * Sets the active graph elements and populates the spatial index.
 */
export function handleWorkerSetGraph(
  state: RenderWorkerState,
  msg: Extract<RenderWorkerInputMessage, { type: 'set_graph' }>,
): void {
  const wasm = state.wasm;
  if (!wasm) return;
  state.nodes = msg.nodes ?? [];
  state.edges = msg.edges ?? [];
  state.groups = msg.groups ?? [];

  rebuildSpatialIndex(state);
  wasm.engine_render_frame(state.nodes.length, state.edges.length, state.nodes.length * 4);
  postReply({
    type: 'frame',
    performance: state.performanceStats,
    visibleNodes: state.nodes.length,
    visibleEdges: state.edges.length,
  } as RenderWorkerOutputMessage);
}

/**
 * Pans the camera by the given pixel delta.
 */
export function handleWorkerPan(
  state: RenderWorkerState,
  msg: Extract<RenderWorkerInputMessage, { type: 'pan' }>,
): void {
  const wasm = state.wasm;
  if (!wasm || msg.deltaX === undefined || msg.deltaY === undefined) return;
  wasm.engine_pan(msg.deltaX, msg.deltaY);
  wasm.engine_render_frame(state.nodes.length, state.edges.length, state.nodes.length * 4);
  postReply({
    type: 'camera_changed',
    camera: {
      x: wasm.get_camera_x(),
      y: wasm.get_camera_y(),
      zoom: wasm.get_camera_zoom(),
      viewportWidth: wasm.get_camera_viewport_width(),
      viewportHeight: wasm.get_camera_viewport_height(),
    },
  } as RenderWorkerOutputMessage);
  postReply({
    type: 'frame',
    performance: state.performanceStats,
    visibleNodes: state.nodes.length,
    visibleEdges: state.edges.length,
  } as RenderWorkerOutputMessage);
}

/**
 * Zooms the camera by the given factor centered at cursor coordinates.
 */
export function handleWorkerZoom(
  state: RenderWorkerState,
  msg: Extract<RenderWorkerInputMessage, { type: 'zoom' }>,
): void {
  const wasm = state.wasm;
  if (!wasm || msg.factor === undefined) return;
  wasm.engine_zoom(msg.cursorX ?? 0, msg.cursorY ?? 0, msg.factor);
  wasm.engine_render_frame(state.nodes.length, state.edges.length, state.nodes.length * 4);
  postReply({
    type: 'camera_changed',
    camera: {
      x: wasm.get_camera_x(),
      y: wasm.get_camera_y(),
      zoom: wasm.get_camera_zoom(),
      viewportWidth: wasm.get_camera_viewport_width(),
      viewportHeight: wasm.get_camera_viewport_height(),
    },
  } as RenderWorkerOutputMessage);
  postReply({
    type: 'frame',
    performance: state.performanceStats,
    visibleNodes: state.nodes.length,
    visibleEdges: state.edges.length,
  } as RenderWorkerOutputMessage);
}

/**
 * Resizes viewport and buffer dimensions.
 */
export function handleWorkerResize(
  state: RenderWorkerState,
  msg: Extract<RenderWorkerInputMessage, { type: 'resize' }>,
): void {
  const wasm = state.wasm;
  if (!wasm || msg.width === undefined || msg.height === undefined) return;
  state.width = msg.width;
  state.height = msg.height;
  state.dpr = msg.dpr ?? state.dpr;
  syncCanvasDimensions(state);
  wasm.engine_resize(state.width, state.height, state.dpr);
  wasm.engine_render_frame(state.nodes.length, state.edges.length, state.nodes.length * 4);
  postReply({
    type: 'frame',
    performance: state.performanceStats,
    visibleNodes: state.nodes.length,
    visibleEdges: state.edges.length,
  } as RenderWorkerOutputMessage);
}

/**
 * Sets node/edge selection sets.
 */
export function handleWorkerSetSelection(
  state: RenderWorkerState,
  msg: Extract<RenderWorkerInputMessage, { type: 'set_selection' }>,
): void {
  const wasm = state.wasm;
  if (!wasm) return;
  state.selectedNodeIds = new Set(msg.selectedNodeIds);
  state.selectedEdgeIds = new Set(msg.selectedEdgeIds);
  state.selectedGroupId = msg.selectedGroupId;
}

/**
 * Updates execution trace state and edge pulse animations.
 */
export function handleWorkerSetTraceState(
  state: RenderWorkerState,
  msg: Extract<RenderWorkerInputMessage, { type: 'set_trace_state' }>,
): void {
  const wasm = state.wasm;
  if (!wasm) return;
  state.activeNodeIds = new Set(msg.activeNodeIds);
  state.trappedNodeId = msg.trappedNodeId;
  state.edgePulses = new Map((msg.edgePulses ?? []).map((pulse) => [pulse.edgeId, pulse.offset]));
}

/**
 * Tests whether an edge connection is intersected by cursor point.
 */
export function isEdgeHitByCursor(
  edge: FlintGraphEdge,
  nodeMap: Map<string, FlintGraphNode>,
  cursorX: number,
  cursorY: number,
  snapRadius: number,
  wasmEngine: FlintRenderWorkerWasmExports,
): boolean {
  const fromNode = nodeMap.get(edge.fromNodeId);
  const toNode = nodeMap.get(edge.toNodeId);
  if (!fromNode || !toNode) return false;
  const fromPortIdx = Math.max(
    0,
    (fromNode.outputs ?? []).findIndex((p) => p.id === edge.fromPortId),
  );
  const toPortIdx = Math.max(
    0,
    (toNode.inputs ?? []).findIndex((p) => p.id === edge.toPortId),
  );
  const p0x = fromNode.position.x + NODE_WIDTH;
  const p0y = fromNode.position.y + NODE_HEADER_HEIGHT + fromPortIdx * PORT_ROW_HEIGHT + 14;
  const p3x = toNode.position.x;
  const p3y = toNode.position.y + NODE_HEADER_HEIGHT + toPortIdx * PORT_ROW_HEIGHT + 14;
  return Boolean(wasmEngine.edge_hit_test(cursorX, cursorY, p0x, p0y, p3x, p3y, snapRadius));
}

/**
 * Performs hit-testing against active edge geometry curves.
 */
export function hitTestEdges(
  cursorX: number,
  cursorY: number,
  snapRadius: number,
  nodeList: readonly FlintGraphNode[],
  edgeList: readonly FlintGraphEdge[],
  wasmEngine: FlintRenderWorkerWasmExports,
): FlintHitResult | undefined {
  const nodeMap = new Map<string, FlintGraphNode>(nodeList.map((n) => [n.id, n]));
  for (const edge of edgeList) {
    if (isEdgeHitByCursor(edge, nodeMap, cursorX, cursorY, snapRadius, wasmEngine)) {
      return {
        type: 'edge',
        edgeId: edge.id,
        nodeId: edge.fromNodeId,
        worldX: cursorX,
        worldY: cursorY,
      };
    }
  }
  return undefined;
}

/**
 * Executes spatial hit testing for cursor coordinates.
 */
export function handleWorkerHitTest(
  state: RenderWorkerState,
  msg: Extract<RenderWorkerInputMessage, { type: 'hit_test' }>,
): void {
  const wasm = state.wasm;
  if (!wasm || msg.cursorX === undefined || msg.cursorY === undefined) return;
  const px = Math.round(msg.cursorX) + COORD_OFFSET;
  const py = Math.round(msg.cursorY) + COORD_OFFSET;
  const hit = wasm.spatial_hit_test_point(px, py);
  const hitNode = hit > 0 ? state.nodes[hit - 1] : undefined;
  const hitResult = hitNode
    ? {
        type: 'node' as const,
        nodeId: hitNode.id,
        worldX: msg.cursorX,
        worldY: msg.cursorY,
      }
    : hitTestEdges(msg.cursorX, msg.cursorY, msg.snapRadius ?? 15, state.nodes, state.edges, wasm);
  postReply({
    type: 'hit_test_result',
    hit: hitResult,
    requestId: msg.requestId,
  } as RenderWorkerOutputMessage);
  postReply({
    type: 'hit_result',
    hit: hitResult,
    requestId: msg.requestId,
  } as RenderWorkerOutputMessage);
}

/**
 * Cleans up all GPU, WebGL, and canvas resources.
 */
export function handleWorkerDestroy(state: RenderWorkerState): void {
  resetWebGpuPipelines(state);
  state.currentPassEncoder = undefined;
  state.currentCommandEncoder = undefined;
  state.gpuDevice = undefined;
  state.gpuContext = undefined;
  if (state.glCtx) cleanupGlResources(state, state.glCtx);
  state.glVertexBuffer = undefined;
  state.glTexVertexBuffer = undefined;
  state.glFontTexture = undefined;
  state.glProgram = undefined;
  state.glTextProgram = undefined;
  state.glCtx = undefined;
  state.canvas2dCtx = undefined;
  state.canvas = undefined;
}

type InteractiveHandler = (state: RenderWorkerState, msg: RenderWorkerInputMessage) => void;

const INTERACTIVE_HANDLERS: Partial<Record<RenderWorkerInputMessage['type'], InteractiveHandler>> = {
  set_theme: (state, msg) => {
    if (msg.type === 'set_theme' && msg.theme !== undefined) {
      state.currentTheme = msg.theme;
      state.wasm?.engine_set_theme(state.currentTheme === 'light' ? 1 : 0);
    }
  },
  pan: (state, msg) => {
    if (msg.type === 'pan') handleWorkerPan(state, msg);
  },
  zoom: (state, msg) => {
    if (msg.type === 'zoom') handleWorkerZoom(state, msg);
  },
  resize: (state, msg) => {
    if (msg.type === 'resize') handleWorkerResize(state, msg);
  },
  set_selection: (state, msg) => {
    if (msg.type === 'set_selection') handleWorkerSetSelection(state, msg);
  },
  set_connecting_edge: (state, msg) => {
    if (msg.type === 'set_connecting_edge') state.connectingEdge = msg.edge;
  },
  set_hovered_port: (state, msg) => {
    if (msg.type === 'set_hovered_port') state.hoveredPort = msg.hoveredPort;
  },
  set_pulse: (state, msg) => {
    if (msg.type === 'set_pulse' && msg.edgeId !== undefined) {
      state.edgePulses.set(msg.edgeId, msg.progress);
    }
  },
  set_trace_state: (state, msg) => {
    if (msg.type === 'set_trace_state') handleWorkerSetTraceState(state, msg);
  },
  reload_font_atlas: (state, msg) => {
    if (msg.type === 'reload_font_atlas' && state.glCtx) {
      setupGlFontTexture(state, state.glCtx);
    }
  },
};

/**
 * Processes secondary interactive manipulation worker messages.
 */
export function handleWorkerOtherMessage(state: RenderWorkerState, msg: RenderWorkerInputMessage): void {
  const wasm = state.wasm;
  if (!wasm) return;
  const handler = INTERACTIVE_HANDLERS[msg.type];
  if (handler) {
    handler(state, msg);
  }
  if (msg.type === 'pan' || msg.type === 'zoom') return;

  wasm.engine_render_frame(state.nodes.length, state.edges.length, state.nodes.length * 4);
  postReply({
    type: 'frame',
    performance: state.performanceStats,
    visibleNodes: state.nodes.length,
    visibleEdges: state.edges.length,
  } as RenderWorkerOutputMessage);
}

/**
 * Checks whether incoming message event should be discarded.
 */
export function isWorkerMessageIgnored(eventData: unknown): boolean {
  return (
    !eventData ||
    typeof eventData !== 'object' ||
    !('type' in eventData) ||
    ('id' in eventData && (eventData as { id?: string }).id === 'flint_render_worker')
  );
}

/**
 * Routes worker input messages to appropriate handler procedures.
 */
export async function dispatchWorkerInputMessage(
  state: RenderWorkerState,
  msg: RenderWorkerInputMessage,
): Promise<void> {
  if (msg.type === 'init') {
    await handleWorkerInit(state, msg);
    return;
  }
  if (msg.type === 'set_graph') {
    handleWorkerSetGraph(state, msg);
    return;
  }
  if (msg.type === 'hit_test') {
    handleWorkerHitTest(state, msg);
    return;
  }
  if (msg.type === 'destroy') {
    handleWorkerDestroy(state);
    return;
  }
  handleWorkerOtherMessage(state, msg);
}
