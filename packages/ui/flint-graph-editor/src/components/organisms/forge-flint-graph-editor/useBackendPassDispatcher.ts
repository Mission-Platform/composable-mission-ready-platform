import type { FlintGraphEdge, FlintGraphGroup, FlintGraphNode } from '@mission-platform/flint';
import { useEffect, useRef, useState } from '@mission-platform/forge-jsx';

import {
  getFlintRenderWorkerWasm,
  type FlintCamera,
  type FlintHitResult,
  type FlintPerformanceMetrics,
  type RenderWorkerInputMessage,
  type RenderWorkerOutputMessage,
  type ViewBounds,
} from '../../../renderer/render-worker';

import type { FlintEditorStore } from '../../../editor/editor-store';

export interface FlintRendererBridge {
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
 * Synchronizes the editor store graph state with the native WebAssembly render bridge.
 */
export function syncGraphWithBridge(store: FlintEditorStore, bridge?: FlintRendererBridge): void {
  if (!bridge) return;
  const state = store.getState();
  bridge.setGraph(state.graph.nodes, state.graph.edges, state.graph.groups ?? []);
  bridge.setSelection(state.selectedNodeIds, state.activeEdgeId ? [state.activeEdgeId] : [], state.selectedGroupId);
}

/**
 * Handles incoming response messages from the render worker.
 */
export function handleBridgeMessage(
  message: RenderWorkerOutputMessage,
  recordPerfMetrics: (metrics: FlintPerformanceMetrics) => void,
  setIsFallback: (fallback: boolean) => void,
  store: FlintEditorStore,
): void {
  if (message.type === 'frame' && message.performance) {
    recordPerfMetrics(message.performance);
    setIsFallback(message.performance.isFallback);
  } else if (message.type === 'hit_result' || message.type === 'hit_test_result') {
    if (message.hit?.type === 'node') {
      store.selectNodes([message.hit.nodeId]);
    } else if (message.hit?.type === 'edge') {
      store.selectEdge(message.hit.edgeId);
    }
  }
}

/**
 * Creates a bridge communicating with the native Flint WebAssembly render worker or canvas context.
 */
export function createRendererBridge(
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

  const postToRenderer = (inputMessage: RenderWorkerInputMessage): void => {
    const messageWithId: RenderWorkerInputMessage = { id: 'flint_render_bridge', ...inputMessage };
    if (globalThis.self !== undefined && 'dispatchEvent' in globalThis.self) {
      globalThis.self.dispatchEvent(new MessageEvent('message', { data: messageWithId }));
    }
  };

  let cleanupListener: (() => void) | undefined;
  if (globalThis.self !== undefined && 'addEventListener' in globalThis.self) {
    const validMessageTypes = new Set(['ready', 'frame', 'camera_changed', 'hit_result', 'hit_test_result', 'error']);
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

  return {
    setGraph: (nodes, edges, groups = []) => {
      currentNodes = nodes;
      currentEdges = edges;
      postToRenderer({ type: 'set_graph', nodes, edges, groups });
    },
    setSelection: (nodeIds, edgeIds = [], groupId) => {
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
      postToRenderer({ type: 'set_hovered_port', hoveredPort: port });
    },
    getHoveredPort: () => hoveredPort,
    renderFrame: () => {
      postToRenderer({ type: 'render_frame' });
    },
    setTheme: (theme) => {
      wasm.engine_set_theme(theme === 'light' ? 1 : 0);
      postToRenderer({ type: 'set_theme', theme });
    },
    resize: (width, height, dpr = 1) => {
      canvasElement.width = Math.round(width * dpr);
      canvasElement.height = Math.round(height * dpr);
      wasm.engine_resize(width, height, dpr);
      postToRenderer({ type: 'resize', width, height, dpr });
    },
    zoom: (cursorX, cursorY, factor) => {
      wasm.engine_zoom(cursorX, cursorY, factor);
      postToRenderer({ type: 'zoom', cursorX, cursorY, factor });
    },
    pan: (deltaX, deltaY) => {
      wasm.engine_pan(deltaX, deltaY);
      postToRenderer({ type: 'pan', deltaX, deltaY });
    },
    screenToWorld: (screenX, screenY) => {
      return {
        x: (screenX - camera.viewportWidth / 2) / camera.zoom + camera.x,
        y: (screenY - camera.viewportHeight / 2) / camera.zoom + camera.y,
      };
    },
    getCamera: () => {
      camera = {
        x: wasm.get_camera_x(),
        y: wasm.get_camera_y(),
        zoom: wasm.get_camera_zoom(),
        viewportWidth: wasm.get_camera_viewport_width(),
        viewportHeight: wasm.get_camera_viewport_height(),
      };
      return camera;
    },
    queryNodesInBox: (box) => {
      const hitIds: string[] = [];
      for (const node of currentNodes) {
        if (
          node.position.x + 220 >= box.minX &&
          node.position.x <= box.maxX &&
          node.position.y + 120 >= box.minY &&
          node.position.y <= box.maxY
        ) {
          hitIds.push(node.id);
        }
      }
      return hitIds;
    },
    hitTestSync: (screenX, screenY) => {
      const worldX = (screenX - camera.viewportWidth / 2) / camera.zoom + camera.x;
      const worldY = (screenY - camera.viewportHeight / 2) / camera.zoom + camera.y;

      for (const node of currentNodes) {
        if (
          worldX >= node.position.x &&
          worldX <= node.position.x + 220 &&
          worldY >= node.position.y &&
          worldY <= node.position.y + 120
        ) {
          return { type: 'node', nodeId: node.id, worldX, worldY };
        }
      }
      return;
    },
    destroy: () => {
      cleanupListener?.();
      postToRenderer({ type: 'destroy' });
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
      visiblePinsCount: 0,
      dpr: initialDpr,
      isFallback: false,
    }),
  };
}

/**
 * Hook coordinating the backend rendering passes, telemetry, and bridge lifecycle.
 */
export function useBackendPassDispatcher(
  canvasReference: { current?: HTMLCanvasElement },
  store: FlintEditorStore,
  renderer?: 'webgpu' | 'webgl' | 'canvas2d',
  theme: 'light' | 'dark' | 'auto' = 'dark',
) {
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
  const [isFallback, setIsFallback] = useState(false);
  const bridgeReference = useRef<FlintRendererBridge | undefined>();

  useEffect(() => {
    const canvas = canvasReference.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(rect.width, 800);
    const height = Math.max(rect.height, 600);
    const dpr = globalThis.window === undefined ? 1 : globalThis.window.devicePixelRatio || 1;

    const bridge = createRendererBridge(
      canvas,
      width,
      height,
      dpr,
      (msg) => handleBridgeMessage(msg, setPerfMetrics, setIsFallback, store),
      renderer,
      theme && theme !== 'auto' ? theme : 'dark',
    );

    bridgeReference.current = bridge;
    syncGraphWithBridge(store, bridge);

    const unsubscribe = store.subscribe(() => {
      syncGraphWithBridge(store, bridge);
    });

    return () => {
      unsubscribe();
      bridge.destroy();
      bridgeReference.current = undefined;
    };
  }, [store, renderer, theme]);

  return {
    bridge: bridgeReference.current,
    perfMetrics,
    isFallback,
  };
}
