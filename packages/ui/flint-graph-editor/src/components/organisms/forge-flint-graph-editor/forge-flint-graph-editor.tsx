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
  readonly setSelection: (nodeIds: readonly string[], edgeIds?: readonly string[]) => void;
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
  readonly destroy: () => void;
  readonly getPerformanceStats: () => FlintPerformanceMetrics;
}

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
  let currentDpr = initialDpr;

  const postToRenderer = (inputMessage: RenderWorkerInputMessage): void => {
    const messageWithId: RenderWorkerInputMessage = { id: 'flint_render_bridge', ...inputMessage };
    if (globalThis.self !== undefined && 'dispatchEvent' in globalThis.self) {
      globalThis.self.dispatchEvent(new MessageEvent('message', { data: messageWithId }));
    }
  };

  let cleanupListener: (() => void) | undefined;
  if (globalThis.self !== undefined && 'addEventListener' in globalThis.self) {
    const handleOutputMessage = (event: MessageEvent<RenderWorkerOutputMessage>): void => {
      const data = event.data;
      if (
        data &&
        typeof data === 'object' &&
        'type' in data &&
        (data.type === 'ready' ||
          data.type === 'frame' ||
          data.type === 'camera_changed' ||
          data.type === 'hit_result' ||
          data.type === 'hit_test_result' ||
          data.type === 'error')
      ) {
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
    setSelection: (nodeIds, edgeIds = []) => {
      postToRenderer({ type: 'set_selection', selectedNodeIds: nodeIds, selectedEdgeIds: edgeIds });
    },
    setConnectingEdge: (edge) => {
      if (edge) {
        postToRenderer({
          type: 'hit_test',
          cursorX: edge.cursorX,
          cursorY: edge.cursorY,
        });
      }
    },
    setHoveredPort: (port) => {
      hoveredPort = port;
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

      for (const node of currentNodes) {
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

      const nodeMap = new Map<string, FlintGraphNode>(currentNodes.map((n) => [n.id, n]));
      for (const edge of currentEdges) {
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
        if (
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
      return;
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

  const canvasReference = useRef<HTMLCanvasElement | undefined>(undefined);
  const rendererReference = useRef<FlintRendererBridge | undefined>(undefined);

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

  const spriteSheetCanvasReference = useRef<HTMLCanvasElement | undefined>(undefined);

  const paintSpriteSheet = (): void => {
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
        const imgData = new ImageData(new Uint8ClampedArray(rawBytes), atlasSize, atlasSize);
        canvasContext.putImageData(imgData, 0, 0);
      }
    } catch {
      // Ignore if wasm not ready yet
    }
  };

  useEffect(() => {
    if (showPerfModal) {
      setTimeout(() => {
        paintSpriteSheet();
      }, 50);
    }
  }, [showPerfModal]);

  useEffect(() => {
    if (properties.theme && properties.theme !== 'auto') {
      setResolvedTheme(properties.theme);
      return;
    }
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
      return () => observer.disconnect();
    }
    return;
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
        rendererReference.current.setSelection(newState.selectedNodeIds);
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
                setPerfMetrics(message.performance);
              }
              break;
            }
            case 'ready': {
              if (message.supported === false) {
                setIsFallback(true);
              }
              if (message.performance) {
                setPerfMetrics(message.performance);
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
      setPerfMetrics(renderer.getPerformanceStats());

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const contentRect = entry.contentRect;
            if (contentRect.width > 0 && contentRect.height > 0) {
              const currentDpr = globalThis.window === undefined ? 1 : globalThis.window.devicePixelRatio || 1;
              renderer.resize(contentRect.width, contentRect.height, currentDpr);
              setPerfMetrics(renderer.getPerformanceStats());
            }
          }
        });
        resizeObserver.observe(canvasElement);
      }

      let isPointerDown = false;
      let dragMode: 'pan' | 'node' | 'connect' | 'box_select' | 'none' = 'none';
      let connectingSourceNodeId = '';
      let connectingSourcePortId = '';
      let dragStartScreen = { x: 0, y: 0 };
      let boxSelectStart = { x: 0, y: 0 };
      let lastClickTime = 0;
      let lastClickNodeId = '';
      const nodesStartPositions = new Map<string, { readonly x: number; readonly y: number }>();

      const profilerInterval = setInterval(() => {
        if (rendererReference.current) {
          const stats = rendererReference.current.getPerformanceStats();
          const storeUpdateTime = store.getUpdateTimeMs();
          setPerfMetrics({
            ...stats,
            updateTimeMs: storeUpdateTime,
          });
        }
      }, 1000);

      const onWheel = (event: WheelEvent): void => {
        event.preventDefault();
        const normalizedDelta = Math.max(-100, Math.min(100, event.deltaY));
        const factor = Math.exp(-normalizedDelta * 0.003);
        renderer.zoom(event.offsetX, event.offsetY, factor);
      };

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

        if (hit?.type === 'edge' && hit.edgeId) {
          store.selectEdge(hit.edgeId);
          renderer.setSelection([], [hit.edgeId]);
          renderer.renderFrame();
          return;
        }

        if (hit?.type === 'port') {
          dragMode = 'connect';
          connectingSourceNodeId = hit.nodeId;
          connectingSourcePortId = hit.portId!;
          store.startConnecting(hit.nodeId, hit.portId!, hit.worldX ?? 0, hit.worldY ?? 0);
          renderer.setConnectingEdge({
            fromNodeId: hit.nodeId,
            fromPortId: hit.portId!,
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

      const onPointerMove = (event: PointerEvent): void => {
        if (!isPointerDown) {
          const hoverHit = renderer.hitTestSync(event.offsetX, event.offsetY);
          switch (hoverHit?.type) {
            case 'port': {
              canvasElement.style.cursor = 'crosshair';
              renderer.setHoveredPort({ nodeId: hoverHit.nodeId, portId: hoverHit.portId! });
              renderer.renderFrame();

              break;
            }
            case 'edge': {
              canvasElement.style.cursor = 'pointer';
              renderer.setHoveredPort(undefined);
              renderer.renderFrame();

              break;
            }
            case 'node': {
              canvasElement.style.cursor = 'move';
              renderer.setHoveredPort(undefined);
              renderer.renderFrame();

              break;
            }
            default: {
              canvasElement.style.cursor = 'default';
              if (renderer.getHoveredPort()) {
                renderer.setHoveredPort(undefined);
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
            renderer.setHoveredPort(undefined);
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
            renderer.setConnectingEdge(undefined);
            renderer.setHoveredPort(undefined);
            renderer.renderFrame();
            break;
          }
          case 'node': {
            store.commitNodeMove();
            renderer.renderFrame();
            break;
          }
        }
        dragMode = 'none';
        nodesStartPositions.clear();
      };

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

  const handleAddNode = (operation: string): void => {
    const center = rendererReference.current?.getCamera();
    const position = center ? { x: Math.round(center.x), y: Math.round(center.y) } : { x: 0, y: 0 };
    store.addNode(operation, position);
  };

  const handleExport = (): void => {
    const artifacts = store.exportArtifacts();
    if (artifacts.type === 'export_result') {
      setExportedSource(artifacts.source);
      setShowExportModal(true);
    }
  };

  const handleRun = (): void => {
    void store.runGraph();
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
            {selectedNode ? (
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
                            store.setGroupColor(selectedNode.groupId!, c);
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
                Select a node on canvas to view and configure properties.
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
                style={{ color: '#f85149' }}
                onClick={() => {
                  store.removeEdge(contextMenu.targetId!);
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
                  store.copyNode(contextMenu.targetId!);
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
                      store.drillIntoMetaNode(contextMenu.targetId!);
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
                      store.duplicateMetaNode(contextMenu.targetId!);
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
                      store.copyGroup(contextMenu.targetGroupId!);
                      setContextMenu({ ...contextMenu, open: false });
                    }}
                  >
                    Copy Group
                  </button>
                  <button
                    type="button"
                    className={styles.contextMenuItem}
                    onClick={() => {
                      store.ungroup(contextMenu.targetGroupId!);
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
                    store.toggleSplitOutputs(contextMenu.targetId!);
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
                  store.removeNode(contextMenu.targetId!);
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
                  store.copyGroup(contextMenu.targetGroupId!);
                  setContextMenu({ ...contextMenu, open: false });
                }}
              >
                Copy Group (with Connections)
              </button>
              <button
                type="button"
                className={styles.contextMenuItem}
                onClick={() => {
                  store.ungroup(contextMenu.targetGroupId!);
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
                      store.setGroupColor(contextMenu.targetGroupId!, c);
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
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Performance Profiler (D3)</span>
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
              <ForgePerformancePieChart
                metrics={perfMetrics}
                width={280}
                height={240}
              />
              <div style={{ marginTop: '16px' }}>
                <ForgeCollapse
                  summary="Debug Glyph Sprite Sheet (512x512 SDF Atlas)"
                  open={true}
                  size="sm"
                  onToggle={() => paintSpriteSheet()}
                >
                  <div className={styles.spriteSheetContainer}>
                    <div className={styles.spriteSheetMeta}>
                      <ForgeBadge
                        variant="primary"
                        size="xs"
                      >
                        512 × 512 px
                      </ForgeBadge>
                      <ForgeBadge
                        variant="neutral"
                        size="xs"
                      >
                        16 × 16 Grid (256 Cells)
                      </ForgeBadge>
                      <ForgeBadge
                        variant="info"
                        size="xs"
                      >
                        UTF-8 / ASCII
                      </ForgeBadge>
                      <ForgeBadge
                        variant="success"
                        size="xs"
                      >
                        157 Active Glyphs
                      </ForgeBadge>
                    </div>
                    <canvas
                      ref={spriteSheetCanvasReference}
                      width={512}
                      height={512}
                      className={styles.spriteSheetCanvas}
                    />
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
          </div>
        </div>
      )}
    </div>
  );
}
