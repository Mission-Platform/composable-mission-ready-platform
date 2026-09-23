import { loadSync } from './render-worker.flint';
import { EDGES_WGSL, GRID_WGSL, NODES_WGSL, TEXT_WGSL } from './shaders';

import type { FlintGraphEdge, FlintGraphGroup, FlintGraphNode } from '@mission-platform/flint';

export type FlintRenderWorkerWasmExports = ReturnType<typeof loadSync>;

export interface FlintCamera {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
}

export interface ViewBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface FlintHitResult {
  readonly type: 'node' | 'edge' | 'port';
  readonly nodeId: string;
  readonly edgeId?: string;
  readonly portId?: string;
  readonly worldX?: number;
  readonly worldY?: number;
}

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

export type RenderWorkerInputMessage =
  | {
      readonly type: 'init';
      readonly id?: string;
      readonly canvas?: OffscreenCanvas | HTMLCanvasElement;
      readonly width?: number;
      readonly height?: number;
      readonly dpr?: number;
      readonly renderer?: 'webgpu' | 'webgl' | 'canvas2d';
      readonly theme?: 'light' | 'dark';
    }
  | {
      readonly type: 'set_theme';
      readonly id?: string;
      readonly theme: 'light' | 'dark';
    }
  | {
      readonly type: 'set_graph';
      readonly id?: string;
      readonly nodes: readonly FlintGraphNode[];
      readonly edges: readonly FlintGraphEdge[];
      readonly groups?: readonly FlintGraphGroup[];
    }
  | {
      readonly type: 'pan';
      readonly id?: string;
      readonly deltaX: number;
      readonly deltaY: number;
    }
  | {
      readonly type: 'zoom';
      readonly id?: string;
      readonly factor: number;
      readonly cursorX?: number;
      readonly cursorY?: number;
    }
  | {
      readonly type: 'resize';
      readonly id?: string;
      readonly width: number;
      readonly height: number;
      readonly dpr?: number;
    }
  | {
      readonly type: 'set_selection';
      readonly id?: string;
      readonly selectedNodeIds?: readonly string[];
      readonly selectedEdgeIds?: readonly string[];
    }
  | {
      readonly type: 'set_pulse';
      readonly id?: string;
      readonly edgeId: string;
      readonly progress: number;
    }
  | {
      readonly type: 'hit_test';
      readonly id?: string;
      readonly cursorX: number;
      readonly cursorY: number;
      readonly snapRadius?: number;
      readonly requestId?: string;
    }
  | {
      readonly type: 'set_trace_state';
      readonly id?: string;
      readonly activeNodeIds?: readonly string[];
      readonly trappedNodeId?: string;
      readonly edgePulses?: readonly {
        readonly edgeId: string;
        readonly offset: number;
      }[];
      readonly requestId?: string;
    }
  | {
      readonly type: 'render_frame';
      readonly id?: string;
    }
  | {
      readonly type: 'destroy';
      readonly id?: string;
    };

export interface FlintPerformanceMetrics {
  readonly updateTimeMs: number;
  readonly renderTimeMs: number;
  readonly spatialIndexTimeMs: number;
  readonly bufferUploadTimeMs: number;
  readonly drawPassTimeMs: number;
  readonly totalFrameTimeMs: number;
  readonly visibleNodesCount: number;
  readonly visibleEdgesCount: number;
  readonly visiblePinsCount: number;
  readonly dpr: number;
  readonly isFallback: boolean;
}

export interface RenderWorkerOutputMessage {
  readonly id?: string;
  readonly type: 'ready' | 'frame' | 'hit_test_result' | 'hit_result' | 'camera_changed' | 'error';
  readonly supported?: boolean;
  readonly fps?: number;
  readonly performance?: FlintPerformanceMetrics;
  readonly visibleNodes?: number;
  readonly visibleEdges?: number;
  readonly camera?: FlintCamera;
  readonly hit?: FlintHitResult;
  readonly requestId?: string;
  readonly error?: string;
}

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;
export const DEFAULT_ZOOM = 1;

export const NODE_WIDTH = 220;
export const NODE_HEADER_HEIGHT = 44;
export const PORT_ROW_HEIGHT = 28;

const COORD_OFFSET = 1_000_000;

export interface GPUAdapter {
  requestDevice(descriptor?: Record<string, unknown>): Promise<GPUDevice>;
  readonly info?: {
    readonly vendor?: string;
    readonly architecture?: string;
    readonly device?: string;
    readonly description?: string;
  };
}

export interface GPUDevice {
  readonly queue: GPUQueue;
  createShaderModule(descriptor: { code: string }): GPUShaderModule;
  createBindGroupLayout(descriptor: { entries: readonly unknown[] }): GPUBindGroupLayout;
  createPipelineLayout(descriptor: { bindGroupLayouts: readonly GPUBindGroupLayout[] }): GPUPipelineLayout;
  createRenderPipeline(descriptor: Record<string, unknown>): GPURenderPipeline;
  createBuffer(descriptor: { size: number; usage: number }): GPUBuffer;
  createTexture(descriptor: Record<string, unknown>): GPUTexture;
  createSampler(descriptor?: Record<string, unknown>): GPUSampler;
  createBindGroup(descriptor: { layout: GPUBindGroupLayout; entries: readonly unknown[] }): GPUBindGroup;
  createCommandEncoder(): GPUCommandEncoder;
  destroy(): void;
}

export interface GPUQueue {
  writeBuffer(buffer: GPUBuffer, bufferOffset: number, data: BufferSource | ArrayBufferView | Float32Array): void;
  writeTexture(
    destination: { texture: GPUTexture },
    data: BufferSource | ArrayBufferView | Uint8Array,
    dataLayout: { bytesPerRow: number; rowsPerImage?: number },
    size: readonly number[],
  ): void;
  submit(commandBuffers: readonly GPUCommandBuffer[]): void;
}

export interface GPUBuffer {
  readonly size: number;
  destroy(): void;
}

export interface GPUSampler {
  readonly label?: string;
}
export interface GPUShaderModule {
  readonly label?: string;
}
export interface GPUBindGroupLayout {
  readonly label?: string;
}
export interface GPUPipelineLayout {
  readonly label?: string;
}
export interface GPURenderPipeline {
  readonly label?: string;
}
export interface GPUBindGroup {
  readonly label?: string;
}
export interface GPUCommandBuffer {
  readonly label?: string;
}
export interface GPUTexture {
  createView(): GPUTextureView;
  destroy?(): void;
}
export interface GPUTextureView {
  readonly label?: string;
}

export interface GPUCommandEncoder {
  beginRenderPass(descriptor: Record<string, unknown>): GPURenderPassEncoder;
  finish(): GPUCommandBuffer;
}

export interface GPURenderPassEncoder {
  setPipeline(pipeline: GPURenderPipeline): void;
  setBindGroup(index: number, bindGroup: GPUBindGroup): void;
  setVertexBuffer(slot: number, buffer: GPUBuffer): void;
  draw(vertexCount: number, instanceCount?: number, firstVertex?: number, firstInstance?: number): void;
  end(): void;
}

export interface GPUCanvasContext {
  configure(configuration: { device: GPUDevice; format: string; alphaMode?: string }): void;
  getCurrentTexture(): GPUTexture;
}

interface WebGpuNavigator {
  readonly gpu?: {
    requestAdapter(options?: Record<string, unknown>): Promise<GPUAdapter | null>;
    getPreferredCanvasFormat(): string;
  };
}

/**
 * Creates a camera viewport configuration with given dimensions, pan offsets, and zoom.
 */
export function createCamera(viewportWidth: number, viewportHeight: number, x = 0, y = 0, zoom = 1): FlintCamera {
  return {
    viewportWidth,
    viewportHeight,
    x,
    y,
    zoom,
  };
}

/**
 * Computes a 4x4 orthographic view-projection matrix for the given camera.
 */
export function createViewProjectionMatrix(camera: FlintCamera): Float32Array {
  const matrix = new Float32Array(16);
  const sx = (2 * camera.zoom) / camera.viewportWidth;
  const sy = (-2 * camera.zoom) / camera.viewportHeight;
  const tx = -camera.x * sx;
  const ty = -camera.y * sy;

  matrix[0] = sx;
  matrix[5] = sy;
  matrix[10] = 1;
  matrix[12] = tx;
  matrix[13] = ty;
  matrix[15] = 1;

  return matrix;
}

/**
 * Computes the axis-aligned bounding box for a graph node in world coordinates.
 */
export function getNodeBounds(node: FlintGraphNode, wasmOverride?: FlintRenderWorkerWasmExports): ViewBounds {
  const maxPorts = Math.max(node.inputs?.length ?? 0, node.outputs?.length ?? 0);
  const instance = wasmOverride ?? getFlintRenderWorkerWasm();
  instance.getNodeBounds(node.position.x, node.position.y, maxPorts);
  return {
    minX: instance.get_node_bounds_min_x(),
    minY: instance.get_node_bounds_min_y(),
    maxX: instance.get_node_bounds_max_x(),
    maxY: instance.get_node_bounds_max_y(),
  };
}

/**
 * Computes the visible world-coordinate bounds for the camera viewport with padding.
 */
export function getViewportBounds(camera: FlintCamera, padding = 100): ViewBounds {
  const wasm = getFlintRenderWorkerWasm();
  wasm.createCamera(camera.viewportWidth, camera.viewportHeight, camera.x, camera.y, camera.zoom);
  wasm.getViewportBounds(padding);
  return {
    minX: wasm.get_bounds_min_x(),
    minY: wasm.get_bounds_min_y(),
    maxX: wasm.get_bounds_max_x(),
    maxY: wasm.get_bounds_max_y(),
  };
}

export const getFlintCameraWasm: (imports?: WebAssembly.Imports) => FlintRenderWorkerWasmExports =
  getFlintRenderWorkerWasm;

let cachedFlintWasm: FlintRenderWorkerWasmExports | undefined;

/**
 * Default fallback callback for unconfigured host capability imports.
 */
const noopHostCapability = (): void => {
  /* no-op fallback capability import */
};

/**
 * Instantiates or retrieves the cached native Flint WebAssembly render worker module.
 */
export function getFlintRenderWorkerWasm(imports?: WebAssembly.Imports): FlintRenderWorkerWasmExports {
  const defaultCapabilities: WebAssembly.Imports = {
    'webgpu.upload_camera_buffer': { gpu_upload_camera_buffer: noopHostCapability },
    'webgpu.upload_node_buffer': { gpu_upload_node_buffer: noopHostCapability },
    'webgpu.upload_edge_buffer': { gpu_upload_edge_buffer: noopHostCapability },
    'webgpu.upload_pin_buffer': { gpu_upload_pin_buffer: noopHostCapability },
    'webgpu.render_begin': { gpu_render_begin: noopHostCapability },
    'webgpu.render_grid': { gpu_render_grid: noopHostCapability },
    'webgpu.render_edges': { gpu_render_edges: noopHostCapability },
    'webgpu.render_nodes': { gpu_render_nodes: noopHostCapability },
    'webgpu.render_pins': { gpu_render_pins: noopHostCapability },
    'webgpu.render_end': { gpu_render_end: noopHostCapability },
    'webgpu.write_node_instance': { gpu_write_node_instance: noopHostCapability },
    'webgpu.write_edge_instance': { gpu_write_edge_instance: noopHostCapability },
    'webgpu.write_pin_instance': { gpu_write_pin_instance: noopHostCapability },
    'webgl.render_begin': { gl_render_begin: noopHostCapability },
    'webgl.render_grid': { gl_render_grid: noopHostCapability },
    'webgl.draw_edge': { gl_draw_edge: noopHostCapability },
    'webgl.draw_node': { gl_draw_node: noopHostCapability },
    'webgl.draw_pin': { gl_draw_pin: noopHostCapability },
    'webgl.render_end': { gl_render_end: noopHostCapability },
    'webgl.render_frame': { webgl_render_frame: noopHostCapability },
    'canvas2d.render_begin': { c2d_render_begin: noopHostCapability },
    'canvas2d.render_grid': { c2d_render_grid: noopHostCapability },
    'canvas2d.draw_edge': { c2d_draw_edge: noopHostCapability },
    'canvas2d.draw_node': { c2d_draw_node: noopHostCapability },
    'canvas2d.draw_pin': { c2d_draw_pin: noopHostCapability },
    'canvas2d.render_end': { c2d_render_end: noopHostCapability },
    'canvas2d.render_frame': { canvas2d_render_frame: noopHostCapability },
  };

  if (imports !== undefined) {
    const merged: WebAssembly.Imports = { ...defaultCapabilities, ...imports };
    return loadSync(merged);
  }
  if (cachedFlintWasm === undefined) {
    cachedFlintWasm = loadSync(defaultCapabilities);
  }
  return cachedFlintWasm;
}

// Dedicated OffscreenCanvas Web Worker message listener
if (
  globalThis.self !== undefined &&
  typeof (globalThis as unknown as { postMessage?: unknown }).postMessage === 'function'
) {
  let wasm: FlintRenderWorkerWasmExports | undefined;
  let canvas: OffscreenCanvas | HTMLCanvasElement | undefined;
  let width = 800;
  let height = 600;
  let dpr = 1;

  let nodes: readonly FlintGraphNode[] = [];
  let edges: readonly FlintGraphEdge[] = [];
  let groups: readonly FlintGraphGroup[] = [];
  const selectedNodeIds = new Set<string>();
  const selectedEdgeIds = new Set<string>();
  const activeNodeIds = new Set<string>();
  let trappedNodeId: string | undefined;
  const edgePulses = new Map<string, number>();
  const hoveredPort: { readonly nodeId: string; readonly portId: string } | undefined = undefined;
  const connectingEdge:
    | {
        readonly fromNodeId: string;
        readonly fromPortId: string;
        readonly cursorX: number;
        readonly cursorY: number;
      }
    | undefined = undefined;

  let gpuContext: GPUCanvasContext | undefined;
  let gpuDevice: GPUDevice | undefined;
  let cameraBuffer: GPUBuffer | undefined;
  let cameraBindGroup: GPUBindGroup | undefined;
  let gridPipeline: GPURenderPipeline | undefined;
  let nodesPipeline: GPURenderPipeline | undefined;
  let edgesPipeline: GPURenderPipeline | undefined;
  let nodeInstanceBuffer: GPUBuffer | undefined;
  let edgeInstanceBuffer: GPUBuffer | undefined;
  let pinInstanceBuffer: GPUBuffer | undefined;
  let currentCommandEncoder: GPUCommandEncoder | undefined;
  let currentPassEncoder: GPURenderPassEncoder | undefined;

  let nodeInstanceFloats: number[] = [];
  let edgeInstanceFloats: number[] = [];
  let pinInstanceFloats: number[] = [];

  let textPipeline: GPURenderPipeline | undefined;
  let textVertexBuffer: GPUBuffer | undefined;
  let fontTexture: GPUTexture | undefined;
  let fontSampler: GPUSampler | undefined;
  let fontBindGroup: GPUBindGroup | undefined;
  let webGpuTextVertices: number[] = [];

  let glCtx: WebGLRenderingContext | WebGL2RenderingContext | undefined;
  let glProgram: WebGLProgram | undefined;
  let glVertexBuffer: WebGLBuffer | undefined;
  let glUniformLocations:
    | {
        readonly u_resolution: WebGLUniformLocation | null;
        readonly u_camera: WebGLUniformLocation | null;
        readonly u_zoom: WebGLUniformLocation | null;
      }
    | undefined;
  let glAttribLocations:
    | {
        readonly a_position: number;
        readonly a_color: number;
      }
    | undefined;

  let glTextProgram: WebGLProgram | undefined;
  let glTexVertexBuffer: WebGLBuffer | undefined;
  let glFontTexture: WebGLTexture | undefined;
  let glTextUniformLocations:
    | {
        readonly u_resolution: WebGLUniformLocation | null;
        readonly u_camera: WebGLUniformLocation | null;
        readonly u_zoom: WebGLUniformLocation | null;
        readonly u_fontTexture: WebGLUniformLocation | null;
      }
    | undefined;
  let glTextAttribLocations:
    | {
        readonly a_position: number;
        readonly a_uv: number;
        readonly a_color: number;
      }
    | undefined;

  let lineVertices: number[] = [];
  let triVertices: number[] = [];
  let textTriVertices: number[] = [];

  let currentTheme: 'light' | 'dark' = 'dark';

  const CATEGORY_RGBA_DARK: Record<string, [number, number, number, number]> = {
    math: [0.345, 0.651, 1, 1],
    logic: [0.82, 0.529, 0.949, 1],
    string: [0.247, 0.725, 0.314, 1],
    flow: [0.337, 0.741, 0.741, 1],
    io: [0.949, 0.6, 0.2, 1],
    memory: [0.961, 0.318, 0.286, 1],
  };

  const CATEGORY_RGBA_LIGHT: Record<string, [number, number, number, number]> = {
    math: [0.035, 0.412, 0.855, 1],
    logic: [0.51, 0.22, 0.76, 1],
    string: [0.102, 0.498, 0.216, 1],
    flow: [0.051, 0.518, 0.549, 1],
    io: [0.749, 0.42, 0.051, 1],
    memory: [0.812, 0.133, 0.18, 1],
  };

  /**
   * Maps a graph node category to an RGBA color tuple adapted to light or dark themes.
   */
  function getCategoryRgba(
    category?: string,
    isMeta?: boolean,
    isDark = currentTheme !== 'light',
  ): [number, number, number, number] {
    if (isMeta) return isDark ? [0.345, 0.651, 1, 1] : [0.035, 0.412, 0.855, 1];
    const table = isDark ? CATEGORY_RGBA_DARK : CATEGORY_RGBA_LIGHT;
    return (category ? table[category] : undefined) ?? (isDark ? [0.545, 0.58, 0.62, 1] : [0.341, 0.376, 0.416, 1]);
  }

  const PORT_TYPE_RGBA_DARK: Record<string, [number, number, number, number]> = {
    float32: [0.345, 0.651, 1, 1],
    int32: [0.82, 0.529, 0.949, 1],
    string: [0.247, 0.725, 0.314, 1],
    boolean: [0.337, 0.741, 0.741, 1],
  };

  const PORT_TYPE_RGBA_LIGHT: Record<string, [number, number, number, number]> = {
    float32: [0.035, 0.412, 0.855, 1],
    int32: [0.51, 0.22, 0.76, 1],
    string: [0.102, 0.498, 0.216, 1],
    boolean: [0.051, 0.518, 0.549, 1],
  };

  /**
   * Maps a port data type to an RGBA color tuple adapted to light or dark themes.
   */
  function getPortTypeRgba(
    type?: string | unknown,
    isDark = currentTheme !== 'light',
  ): [number, number, number, number] {
    const key = typeof type === 'string' ? type : undefined;
    const table = isDark ? PORT_TYPE_RGBA_DARK : PORT_TYPE_RGBA_LIGHT;
    return (key ? table[key] : undefined) ?? (isDark ? [0.788, 0.82, 0.851, 1] : [0.141, 0.161, 0.184, 1]);
  }

  /**
   * Enqueues an instanced WebGPU node rectangle with position, size, borders, and glow.
   */
  const pushGpuNodeInstance = (
    posX: number,
    posY: number,
    width: number,
    height: number,
    radius: number,
    fillRgba: readonly [number, number, number, number],
    borderRgba: readonly [number, number, number, number] = [0, 0, 0, 0],
    borderWidth = 0,
    glowRgba: readonly [number, number, number, number] = [0, 0, 0, 0],
  ): void => {
    nodeInstanceFloats.push(
      posX,
      posY,
      width,
      height,
      radius,
      fillRgba[0],
      fillRgba[1],
      fillRgba[2],
      fillRgba[3],
      borderRgba[0],
      borderRgba[1],
      borderRgba[2],
      borderRgba[3],
      borderWidth,
      glowRgba[0],
      glowRgba[1],
      glowRgba[2],
      glowRgba[3],
    );
  };

  /**
   * Enqueues an instanced WebGPU port pin circle with fill and optional selection border.
   */
  const pushGpuPinInstance = (
    posX: number,
    posY: number,
    radius: number,
    fillRgba: readonly [number, number, number, number],
    borderWidth = 0,
    borderRgba: readonly [number, number, number, number] = [0, 0, 0, 0],
  ): void => {
    pinInstanceFloats.push(
      posX,
      posY,
      radius * 2,
      radius * 2,
      radius,
      fillRgba[0],
      fillRgba[1],
      fillRgba[2],
      fillRgba[3],
      borderRgba[0],
      borderRgba[1],
      borderRgba[2],
      borderRgba[3],
      borderWidth,
      0,
      0,
      0,
      0,
    );
  };

  /**
   * Appends line vertex coordinates and colors to the batch line buffer.
   */
  const pushLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    red: number,
    green: number,
    blue: number,
    alpha: number,
  ): void => {
    lineVertices.push(x1, y1, red, green, blue, alpha, x2, y2, red, green, blue, alpha);
  };

  /**
   * Appends solid triangle quad vertices and colors to the batch triangle buffer.
   */
  const pushRect = (
    x: number,
    y: number,
    width: number,
    height: number,
    red: number,
    green: number,
    blue: number,
    alpha: number,
  ): void => {
    triVertices.push(
      x,
      y,
      red,
      green,
      blue,
      alpha,
      x + width,
      y,
      red,
      green,
      blue,
      alpha,
      x,
      y + height,
      red,
      green,
      blue,
      alpha,
      x,
      y + height,
      red,
      green,
      blue,
      alpha,
      x + width,
      y,
      red,
      green,
      blue,
      alpha,
      x + width,
      y + height,
      red,
      green,
      blue,
      alpha,
    );
  };

  /**
   * Appends outline line segments for a rectangle to the batch line buffer.
   */
  const pushRectBorder = (
    x: number,
    y: number,
    width: number,
    height: number,
    red: number,
    green: number,
    blue: number,
    alpha: number,
  ): void => {
    pushLine(x, y, x + width, y, red, green, blue, alpha);
    pushLine(x + width, y, x + width, y + height, red, green, blue, alpha);
    pushLine(x + width, y + height, x, y + height, red, green, blue, alpha);
    pushLine(x, y + height, x, y, red, green, blue, alpha);
  };

  /**
   * Appends triangle fan vertices for a solid circle to the batch triangle buffer.
   */
  const pushCircle = (
    cx: number,
    cy: number,
    radius: number,
    red: number,
    green: number,
    blue: number,
    alpha: number,
    segments = 12,
  ): void => {
    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      triVertices.push(
        cx,
        cy,
        red,
        green,
        blue,
        alpha,
        cx + Math.cos(a1) * radius,
        cy + Math.sin(a1) * radius,
        red,
        green,
        blue,
        alpha,
        cx + Math.cos(a2) * radius,
        cy + Math.sin(a2) * radius,
        red,
        green,
        blue,
        alpha,
      );
    }
  };

  let canvas2dCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | undefined;
  let activeBackend: 'webgpu' | 'webgl' | 'canvas2d' = 'canvas2d';

  let performanceStats: FlintPerformanceMetrics = {
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
  };

  /**
   * Prepares instanced WebGPU vertex buffers and text quads for active nodes, groups, edges, and pins.
   */
  function prepareWebGpuInstances(): void {
    if (!gpuContext || !cameraBuffer || !wasm) return;

    nodeInstanceFloats = [];
    edgeInstanceFloats = [];
    pinInstanceFloats = [];
    webGpuTextVertices = [];

    wasm.font_clear_text_vertices();
    wasm.getViewportBounds(200);

    // 1. Groups
    for (const group of groups) {
      const groupNodes = nodes.filter((n) => group.nodeIds.includes(n.id));
      if (groupNodes.length === 0) continue;

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
      const pad = 24;
      const gx = gMinX - pad;
      const gy = gMinY - pad - 22;
      const gw = gMaxX - gMinX + pad * 2;
      const gh = gMaxY - gMinY + pad * 2 + 22;

      const isDark = currentTheme !== 'light';

      // Group background
      const groupBg: [number, number, number, number] = isDark ? [0.35, 0.65, 1, 0.08] : [0.035, 0.412, 0.855, 0.06];
      const groupBorder: [number, number, number, number] = isDark ? [0.35, 0.65, 1, 0.5] : [0.035, 0.412, 0.855, 0.6];
      pushGpuNodeInstance(gx + gw / 2, gy + gh / 2, gw, gh, 12, groupBg, groupBorder, 2);

      // Group title pill
      const titleW = wasm.font_measure_text(group.title, 12);
      const pillW = titleW + 16;
      pushGpuNodeInstance(
        gx + 10 + pillW / 2,
        gy + 4 + 10,
        pillW,
        20,
        4,
        isDark ? [0.35, 0.65, 1, 0.9] : [0.035, 0.412, 0.855, 0.9],
      );
      wasm.font_append_text_quads(group.title, gx + 18, gy + 18, 12, 1, 1, 1, 1, 0);
    }

    // 2. Nodes
    const isDark = currentTheme !== 'light';
    for (const node of nodes) {
      const bounds = getNodeBounds(node);
      const nodeWidth = bounds.maxX - bounds.minX;
      const nodeHeight = bounds.maxY - bounds.minY;
      const x = bounds.minX;
      const y = bounds.minY;

      const isSelected = selectedNodeIds.has(node.id);
      const isActive = activeNodeIds.has(node.id);
      const isTrapped = trappedNodeId === node.id;
      const isMeta = node.metaSubgraph !== undefined || node.operation === 'meta';

      const fillRgba: [number, number, number, number] = isDark
        ? isMeta
          ? [0.086, 0.118, 0.18, 0.95]
          : [0.129, 0.149, 0.176, 0.95]
        : isMeta
          ? [0.941, 0.957, 0.973, 0.98]
          : [1, 1, 1, 0.98];

      const borderRgba: [number, number, number, number] = isDark
        ? isTrapped
          ? [0.973, 0.318, 0.286, 1]
          : isActive
            ? [0.247, 0.725, 0.314, 1]
            : isSelected
              ? [0.345, 0.651, 1, 1]
              : isMeta
                ? [0.475, 0.753, 1, 0.8]
                : [0.188, 0.212, 0.239, 0.8]
        : isTrapped
          ? [0.812, 0.133, 0.18, 1]
          : isActive
            ? [0.102, 0.498, 0.216, 1]
            : isSelected
              ? [0.035, 0.412, 0.855, 1]
              : isMeta
                ? [0.035, 0.412, 0.855, 0.85]
                : [0.816, 0.843, 0.871, 0.9];

      const borderWidth = isSelected || isTrapped || isActive ? 2.5 : 1.5;
      const glowRgba: [number, number, number, number] = isDark
        ? isTrapped
          ? [0.973, 0.318, 0.286, 0.9]
          : isActive
            ? [0.247, 0.725, 0.314, 0.8]
            : isSelected
              ? [0.345, 0.651, 1, 0.5]
              : [0, 0, 0, 0]
        : isTrapped
          ? [0.812, 0.133, 0.18, 0.5]
          : isActive
            ? [0.102, 0.498, 0.216, 0.5]
            : isSelected
              ? [0.035, 0.412, 0.855, 0.4]
              : [0, 0, 0, 0];

      // Node body
      pushGpuNodeInstance(
        x + nodeWidth / 2,
        y + nodeHeight / 2,
        nodeWidth,
        nodeHeight,
        8,
        fillRgba,
        borderRgba,
        borderWidth,
        glowRgba,
      );

      // Node header background
      const headerRgba: [number, number, number, number] = isDark
        ? isTrapped
          ? [0.239, 0.078, 0.09, 1]
          : isActive
            ? [0.078, 0.239, 0.133, 1]
            : isMeta
              ? [0.051, 0.157, 0.278, 1]
              : [0.086, 0.106, 0.133, 1]
        : isTrapped
          ? [0.996, 0.886, 0.886, 1]
          : isActive
            ? [0.863, 0.988, 0.906, 1]
            : isMeta
              ? [0.882, 0.925, 0.969, 1]
              : [0.941, 0.949, 0.961, 1];
      pushGpuNodeInstance(x + nodeWidth / 2, y + 16, nodeWidth - 2, 30, 4, headerRgba);

      // Category accent bar (4px)
      const catColor = getCategoryRgba(node.category, isMeta, isDark);
      pushGpuNodeInstance(x + nodeWidth / 2, y + 3, nodeWidth - 4, 4, 2, catColor);

      // Header separator
      const sepColor: [number, number, number, number] = isDark
        ? [0.188, 0.212, 0.239, 0.8]
        : [0.816, 0.843, 0.871, 0.8];
      pushGpuNodeInstance(x + nodeWidth / 2, y + NODE_HEADER_HEIGHT, nodeWidth - 2, 1, 0, sepColor);

      // Node Text
      // Title
      const titleColor = isDark ? [0.941, 0.965, 0.988, 1] : [0.122, 0.137, 0.157, 1];
      wasm.font_append_text_quads(node.title, x + 10, y + 17, 12, titleColor[0], titleColor[1], titleColor[2], 1, 0);

      // Category / Meta pill
      const catText = isMeta
        ? `META (${node.metaSubgraph?.nodes.length ?? 0})`
        : (node.category || 'OPERATION').toUpperCase();
      const catTextColor = isMeta
        ? isDark
          ? [0.345, 0.651, 1, 1]
          : [0.035, 0.412, 0.855, 1]
        : isDark
          ? [0.545, 0.58, 0.62, 1]
          : [0.341, 0.376, 0.416, 1];
      wasm.font_append_text_quads_mono(
        catText,
        x + nodeWidth - 10,
        y + 17,
        10,
        catTextColor[0],
        catTextColor[1],
        catTextColor[2],
        1,
        1,
      );

      // Subtitle operation identifier
      const subColor = isDark ? [0.545, 0.58, 0.62, 1] : [0.341, 0.376, 0.416, 1];
      wasm.font_append_text_quads_mono(node.operation, x + 10, y + 28, 9, subColor[0], subColor[1], subColor[2], 1, 0);

      // Input pins & labels
      for (const [idx, port] of (node.inputs ?? []).entries()) {
        const py = node.position.y + NODE_HEADER_HEIGHT + idx * PORT_ROW_HEIGHT + 14;
        const isHovered = hoveredPort?.nodeId === node.id && hoveredPort?.portId === port.id;
        const pinRadius = isHovered ? 7 : 5;
        const portColor = getPortTypeRgba(port.type, isDark);
        const pinInnerBg: [number, number, number, number] = isDark
          ? [0.086, 0.106, 0.133, 1]
          : [0.941, 0.949, 0.961, 1];

        // Outer circle + inner dot
        pushGpuPinInstance(node.position.x, py, pinRadius, portColor, 1.5, pinInnerBg);
        pushGpuPinInstance(node.position.x, py, Math.max(1, pinRadius - 2), isHovered ? [1, 1, 1, 1] : portColor);

        // Port label text
        const portTextColor = isDark ? [0.788, 0.82, 0.851, 1] : [0.141, 0.161, 0.184, 1];
        wasm.font_append_text_quads(
          port.name,
          node.position.x + 12,
          py + 4,
          11,
          portTextColor[0],
          portTextColor[1],
          portTextColor[2],
          1,
          0,
        );
      }

      // Output pins & labels
      for (const [idx, port] of (node.outputs ?? []).entries()) {
        const py = node.position.y + NODE_HEADER_HEIGHT + idx * PORT_ROW_HEIGHT + 14;
        const isHovered = hoveredPort?.nodeId === node.id && hoveredPort?.portId === port.id;
        const pinRadius = isHovered ? 7 : 5;
        const portColor = getPortTypeRgba(port.type, isDark);
        const pinInnerBg: [number, number, number, number] = isDark
          ? [0.086, 0.106, 0.133, 1]
          : [0.941, 0.949, 0.961, 1];

        // Outer circle + inner dot
        pushGpuPinInstance(node.position.x + NODE_WIDTH, py, pinRadius, portColor, 1.5, pinInnerBg);
        pushGpuPinInstance(
          node.position.x + NODE_WIDTH,
          py,
          Math.max(1, pinRadius - 2),
          isHovered ? [1, 1, 1, 1] : portColor,
        );

        // Port label text
        const portTextColor = isDark ? [0.788, 0.82, 0.851, 1] : [0.141, 0.161, 0.184, 1];
        wasm.font_append_text_quads(
          port.name,
          node.position.x + NODE_WIDTH - 12,
          py + 4,
          11,
          portTextColor[0],
          portTextColor[1],
          portTextColor[2],
          1,
          1,
        );
      }

      // Literal properties preview
      if (node.properties && Object.keys(node.properties).length > 0) {
        const firstVal = String(Object.values(node.properties)[0]);
        const propColor = isDark ? [0.345, 0.651, 1, 1] : [0.035, 0.412, 0.855, 1];
        wasm.font_append_text_quads_mono(
          `= ${firstVal}`,
          x + 10,
          y + nodeHeight - 8,
          10,
          propColor[0],
          propColor[1],
          propColor[2],
          1,
          0,
        );
      }
    }

    const floatCount = wasm.font_get_vertex_float_count();
    const vbufPtr = wasm.font_get_vertex_buffer_ptr();
    const f64View = new Float64Array(wasm.memory.buffer, vbufPtr, floatCount);
    webGpuTextVertices = [...f64View];

    const nodeMap = new Map<string, FlintGraphNode>(nodes.map((n) => [n.id, n]));
    for (const edge of edges) {
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

      const isSelected = selectedEdgeIds.has(edge.id) ? 1 : 0;
      const isActive = edgePulses.has(edge.id) ? 1 : 0;
      const pulseOffset = edgePulses.get(edge.id) ?? 0;

      wasm.compute_edge_instance(p0x, p0y, p3x, p3y, isSelected, isActive, Math.round(pulseOffset * 1000));
    }

    if (connectingEdge) {
      const fromNode = nodeMap.get(connectingEdge.fromNodeId);
      if (fromNode) {
        const outIdx = Math.max(
          0,
          (fromNode.outputs ?? []).findIndex((p) => p.id === connectingEdge?.fromPortId),
        );
        const p0x = fromNode.position.x + NODE_WIDTH;
        const p0y = fromNode.position.y + NODE_HEADER_HEIGHT + outIdx * PORT_ROW_HEIGHT + 14;
        const p3x = connectingEdge.cursorX;
        const p3y = connectingEdge.cursorY;
        wasm.compute_edge_instance(p0x, p0y, p3x, p3y, 1, 1, 500);
      }
    }
  }

  /**
   * Initializes the WebGPU device, swapchain context, pipelines, and uniform bind groups.
   */
  async function initWebGpuBackend(targetCanvas: OffscreenCanvas | HTMLCanvasElement): Promise<boolean> {
    try {
      const nav = typeof navigator === 'undefined' ? undefined : (navigator as unknown as WebGpuNavigator);
      if (!nav?.gpu) return false;
      const adapter = await nav.gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (!adapter) return false;
      const device = await adapter.requestDevice();
      const canvasObj = targetCanvas as unknown as { getContext(id: string): GPUCanvasContext | null };
      const context = canvasObj.getContext('webgpu');
      if (!context) return false;
      const format = nav.gpu.getPreferredCanvasFormat();
      context.configure({ device, format, alphaMode: 'premultiplied' });

      if (gpuDevice !== device) {
        nodeInstanceBuffer?.destroy();
        nodeInstanceBuffer = undefined;
        edgeInstanceBuffer?.destroy();
        edgeInstanceBuffer = undefined;
        pinInstanceBuffer?.destroy();
        pinInstanceBuffer = undefined;
        textVertexBuffer?.destroy();
        textVertexBuffer = undefined;
        fontTexture?.destroy?.();
        fontTexture = undefined;
        fontSampler = undefined;
        fontBindGroup = undefined;
        textPipeline = undefined;
        cameraBuffer?.destroy();
        cameraBuffer = undefined;
        cameraBindGroup = undefined;
        gridPipeline = undefined;
        nodesPipeline = undefined;
        edgesPipeline = undefined;
      }

      gpuDevice = device;
      gpuContext = context;

      const cameraBindGroupLayout = device.createBindGroupLayout({
        entries: [{ binding: 0, visibility: 3, buffer: { type: 'uniform' } }],
      });
      const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [cameraBindGroupLayout] });

      cameraBuffer = device.createBuffer({ size: 256, usage: 0x00_40 | 0x00_08 });
      cameraBindGroup = device.createBindGroup({
        layout: cameraBindGroupLayout,
        entries: [{ binding: 0, resource: { buffer: cameraBuffer } }],
      });

      const gridModule = device.createShaderModule({ code: GRID_WGSL });
      gridPipeline = device.createRenderPipeline({
        layout: pipelineLayout,
        vertex: { module: gridModule, entryPoint: 'vs_main' },
        fragment: {
          module: gridModule,
          entryPoint: 'fs_main',
          targets: [
            {
              format,
              blend: {
                color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
              },
            },
          ],
        },
        primitive: { topology: 'triangle-list' },
      });

      const nodesModule = device.createShaderModule({ code: NODES_WGSL });
      nodesPipeline = device.createRenderPipeline({
        layout: pipelineLayout,
        vertex: {
          module: nodesModule,
          entryPoint: 'vs_main',
          buffers: [
            {
              arrayStride: 72,
              stepMode: 'instance',
              attributes: [
                { shaderLocation: 0, offset: 0, format: 'float32x2' },
                { shaderLocation: 1, offset: 8, format: 'float32x2' },
                { shaderLocation: 2, offset: 16, format: 'float32' },
                { shaderLocation: 3, offset: 20, format: 'float32x4' },
                { shaderLocation: 4, offset: 36, format: 'float32x4' },
                { shaderLocation: 5, offset: 52, format: 'float32' },
                { shaderLocation: 6, offset: 56, format: 'float32x4' },
              ],
            },
          ],
        },
        fragment: {
          module: nodesModule,
          entryPoint: 'fs_main',
          targets: [
            {
              format,
              blend: {
                color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
              },
            },
          ],
        },
        primitive: { topology: 'triangle-list' },
      });

      const edgesModule = device.createShaderModule({ code: EDGES_WGSL });
      edgesPipeline = device.createRenderPipeline({
        layout: pipelineLayout,
        vertex: {
          module: edgesModule,
          entryPoint: 'vs_main',
          buffers: [
            {
              arrayStride: 60,
              stepMode: 'instance',
              attributes: [
                { shaderLocation: 0, offset: 0, format: 'float32x2' },
                { shaderLocation: 1, offset: 8, format: 'float32x2' },
                { shaderLocation: 2, offset: 16, format: 'float32x2' },
                { shaderLocation: 3, offset: 24, format: 'float32x2' },
                { shaderLocation: 4, offset: 32, format: 'float32x4' },
                { shaderLocation: 5, offset: 48, format: 'float32' },
                { shaderLocation: 6, offset: 52, format: 'float32' },
                { shaderLocation: 7, offset: 56, format: 'float32' },
              ],
            },
          ],
        },
        fragment: {
          module: edgesModule,
          entryPoint: 'fs_main',
          targets: [
            {
              format,
              blend: {
                color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
              },
            },
          ],
        },
        primitive: { topology: 'triangle-strip' },
      });

      const atlasSize = wasm ? wasm.font_get_atlas_size() : 512;
      const atlasPtr = wasm ? wasm.font_get_atlas_ptr() : 0;
      const rgbaData =
        wasm && atlasPtr > 0
          ? new Uint8Array(wasm.memory.buffer, atlasPtr, atlasSize * atlasSize * 4)
          : new Uint8Array(atlasSize * atlasSize * 4);
      fontTexture = device.createTexture({
        size: [atlasSize, atlasSize, 1],
        format: 'rgba8unorm',
        usage: 0x00_04 | 0x00_02,
      });
      device.queue.writeTexture(
        { texture: fontTexture },
        rgbaData,
        { bytesPerRow: atlasSize * 4, rowsPerImage: atlasSize },
        [atlasSize, atlasSize, 1],
      );
      fontSampler = device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
      });
      const fontBindGroupLayout = device.createBindGroupLayout({
        entries: [
          { binding: 0, visibility: 2, texture: { sampleType: 'float' } },
          { binding: 1, visibility: 2, sampler: { type: 'filtering' } },
        ],
      });
      if (fontTexture && fontSampler) {
        fontBindGroup = device.createBindGroup({
          layout: fontBindGroupLayout,
          entries: [
            { binding: 0, resource: fontTexture.createView() },
            { binding: 1, resource: fontSampler },
          ],
        });
      }

      const textPipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [cameraBindGroupLayout, fontBindGroupLayout],
      });
      const textModule = device.createShaderModule({ code: TEXT_WGSL });
      textPipeline = device.createRenderPipeline({
        layout: textPipelineLayout,
        vertex: {
          module: textModule,
          entryPoint: 'vs_main',
          buffers: [
            {
              arrayStride: 32,
              stepMode: 'vertex',
              attributes: [
                { shaderLocation: 0, offset: 0, format: 'float32x2' },
                { shaderLocation: 1, offset: 8, format: 'float32x2' },
                { shaderLocation: 2, offset: 16, format: 'float32x4' },
              ],
            },
          ],
        },
        fragment: {
          module: textModule,
          entryPoint: 'fs_main',
          targets: [
            {
              format,
              blend: {
                color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
              },
            },
          ],
        },
        primitive: { topology: 'triangle-list' },
      });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initializes WebGL 1.0 or 2.0 context, compiles vertex and fragment shaders, and configures vertex attributes.
   */
  function initWebGLBackend(targetCanvas: OffscreenCanvas | HTMLCanvasElement): boolean {
    try {
      const gl = (targetCanvas.getContext('webgl2', { preserveDrawingBuffer: true, alpha: true }) ||
        targetCanvas.getContext('webgl', { preserveDrawingBuffer: true, alpha: true })) as
        WebGLRenderingContext | WebGL2RenderingContext | null;
      if (!gl) return false;
      glCtx = gl;

      const vsSource = `
        attribute vec2 a_position;
        attribute vec4 a_color;
        uniform vec2 u_resolution;
        uniform vec2 u_camera;
        uniform float u_zoom;
        varying vec4 v_color;
        void main() {
          vec2 screenPos = (a_position - u_camera) * u_zoom + (u_resolution * 0.5);
          vec2 clipSpace = (screenPos / u_resolution) * 2.0 - 1.0;
          gl_Position = vec4(clipSpace.x, -clipSpace.y, 0.0, 1.0);
          v_color = a_color;
        }
      `;
      const fsSource = `
        precision mediump float;
        varying vec4 v_color;
        void main() {
          gl_FragColor = v_color;
        }
      `;

      const vs = gl.createShader(gl.VERTEX_SHADER);
      if (!vs) return false;
      gl.shaderSource(vs, vsSource);
      gl.compileShader(vs);
      if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) return false;

      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      if (!fs) return false;
      gl.shaderSource(fs, fsSource);
      gl.compileShader(fs);
      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) return false;

      const program = gl.createProgram();
      if (!program) return false;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;

      glProgram = program;
      glVertexBuffer = gl.createBuffer() ?? undefined;
      glUniformLocations = {
        u_resolution: gl.getUniformLocation(program, 'u_resolution'),
        u_camera: gl.getUniformLocation(program, 'u_camera'),
        u_zoom: gl.getUniformLocation(program, 'u_zoom'),
      };
      glAttribLocations = {
        a_position: gl.getAttribLocation(program, 'a_position'),
        a_color: gl.getAttribLocation(program, 'a_color'),
      };

      gl.getExtension('OES_standard_derivatives');

      const vsTextSource = `
        attribute vec2 a_position;
        attribute vec2 a_uv;
        attribute vec4 a_color;
        uniform vec2 u_resolution;
        uniform vec2 u_camera;
        uniform float u_zoom;
        varying vec2 v_uv;
        varying vec4 v_color;
        void main() {
          vec2 screenPos = (a_position - u_camera) * u_zoom + (u_resolution * 0.5);
          vec2 clipSpace = (screenPos / u_resolution) * 2.0 - 1.0;
          gl_Position = vec4(clipSpace.x, -clipSpace.y, 0.0, 1.0);
          v_uv = a_uv;
          v_color = a_color;
        }
      `;
      const fsTextSource = `
        #extension GL_OES_standard_derivatives : enable
        precision mediump float;
        uniform sampler2D u_fontTexture;
        varying vec2 v_uv;
        varying vec4 v_color;
        void main() {
          float dist = texture2D(u_fontTexture, v_uv).r;
          float edge = 0.5;
          #ifdef GL_OES_standard_derivatives
            float smoothing = clamp(fwidth(dist) * 0.65, 0.005, 0.15);
          #else
            float smoothing = 0.05;
          #endif
          float alpha = smoothstep(edge - smoothing, edge + smoothing, dist);
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
        }
      `;

      const vsText = gl.createShader(gl.VERTEX_SHADER);
      if (vsText) {
        gl.shaderSource(vsText, vsTextSource);
        gl.compileShader(vsText);
        const fsText = gl.createShader(gl.FRAGMENT_SHADER);
        if (fsText) {
          gl.shaderSource(fsText, fsTextSource);
          gl.compileShader(fsText);
          const textProgram = gl.createProgram();
          if (textProgram) {
            gl.attachShader(textProgram, vsText);
            gl.attachShader(textProgram, fsText);
            gl.linkProgram(textProgram);
            if (gl.getProgramParameter(textProgram, gl.LINK_STATUS)) {
              glTextProgram = textProgram;
              glTexVertexBuffer = gl.createBuffer() ?? undefined;
              glTextUniformLocations = {
                u_resolution: gl.getUniformLocation(textProgram, 'u_resolution'),
                u_camera: gl.getUniformLocation(textProgram, 'u_camera'),
                u_zoom: gl.getUniformLocation(textProgram, 'u_zoom'),
                u_fontTexture: gl.getUniformLocation(textProgram, 'u_fontTexture'),
              };
              glTextAttribLocations = {
                a_position: gl.getAttribLocation(textProgram, 'a_position'),
                a_uv: gl.getAttribLocation(textProgram, 'a_uv'),
                a_color: gl.getAttribLocation(textProgram, 'a_color'),
              };

              const atlasSize = wasm ? wasm.font_get_atlas_size() : 512;
              const atlasPtr = wasm ? wasm.font_get_atlas_ptr() : 0;
              const rgbaData =
                wasm && atlasPtr > 0
                  ? new Uint8Array(wasm.memory.buffer, atlasPtr, atlasSize * atlasSize * 4)
                  : new Uint8Array(atlasSize * atlasSize * 4);
              const tex = gl.createTexture();
              if (tex) {
                gl.bindTexture(gl.TEXTURE_2D, tex);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, atlasSize, atlasSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgbaData);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                glFontTexture = tex;
              }
            }
          }
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initializes standard 2D canvas context as a fallback rendering pipeline.
   */
  function init2dBackend(targetCanvas: OffscreenCanvas | HTMLCanvasElement): boolean {
    try {
      const ctx = targetCanvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
      if (ctx) {
        canvas2dCtx = ctx;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Renders the complete node graph using the 2D canvas context and native Flint geometry projections.
   */
  function render2dFrame(): void {
    if (!canvas2dCtx || !wasm) return;
    const ctx = canvas2dCtx;
    const isDark = currentTheme !== 'light';
    const t0 = typeof performance === 'undefined' ? 0 : performance.now();
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = isDark ? '#0b1219' : '#f5f6f8';
    ctx.fillRect(0, 0, width, height);

    ctx.translate(width / 2, height / 2);
    const zoom = wasm.get_camera_zoom();
    const camX = wasm.get_camera_x();
    const camY = wasm.get_camera_y();
    ctx.scale(zoom, zoom);
    ctx.translate(-camX, -camY);

    wasm.getViewportBounds(100);
    const minX = wasm.get_bounds_min_x();
    const minY = wasm.get_bounds_min_y();
    const maxX = wasm.get_bounds_max_x();
    const maxY = wasm.get_bounds_max_y();

    // 1. Grid
    const minorSpacing = 24;
    const majorSpacing = 120;
    const startX = Math.floor(minX / minorSpacing) * minorSpacing;
    const endX = Math.ceil(maxX / minorSpacing) * minorSpacing;
    const startY = Math.floor(minY / minorSpacing) * minorSpacing;
    const endY = Math.ceil(maxY / minorSpacing) * minorSpacing;

    ctx.lineWidth = 1 / zoom;
    if (zoom > 0.4) {
      ctx.strokeStyle = isDark ? 'rgba(56, 64, 82, 0.25)' : 'rgba(140, 155, 175, 0.25)';
      ctx.beginPath();
      for (let x = startX; x <= endX; x += minorSpacing) {
        if (x % majorSpacing !== 0) {
          ctx.moveTo(x, minY);
          ctx.lineTo(x, maxY);
        }
      }
      for (let y = startY; y <= endY; y += minorSpacing) {
        if (y % majorSpacing !== 0) {
          ctx.moveTo(minX, y);
          ctx.lineTo(maxX, y);
        }
      }
      ctx.stroke();
    }

    ctx.strokeStyle = isDark ? 'rgba(89, 102, 128, 0.35)' : 'rgba(100, 120, 145, 0.45)';
    ctx.beginPath();
    const majorStartX = Math.floor(minX / majorSpacing) * majorSpacing;
    const majorEndX = Math.ceil(maxX / majorSpacing) * majorSpacing;
    const majorStartY = Math.floor(minY / majorSpacing) * majorSpacing;
    const majorEndY = Math.ceil(maxY / majorSpacing) * majorSpacing;
    for (let x = majorStartX; x <= majorEndX; x += majorSpacing) {
      ctx.moveTo(x, minY);
      ctx.lineTo(x, maxY);
    }
    for (let y = majorStartY; y <= majorEndY; y += majorSpacing) {
      ctx.moveTo(minX, y);
      ctx.lineTo(maxX, y);
    }
    ctx.stroke();

    // 2. Groups
    for (const group of groups) {
      const groupNodes = nodes.filter((node) => group.nodeIds.includes(node.id));
      if (groupNodes.length === 0) continue;

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
      const gx = gMinX - padding;
      const gy = gMinY - padding - 22;
      const gw = gMaxX - gMinX + padding * 2;
      const gh = gMaxY - gMinY + padding * 2 + 22;

      ctx.save();
      const groupBg =
        group.backgroundColor ??
        (group.color ? `${group.color}25` : isDark ? 'rgba(88, 166, 255, 0.12)' : 'rgba(9, 105, 218, 0.08)');
      const groupBorder = group.color ?? (isDark ? '#58a6ff' : '#0969da');
      ctx.fillStyle = groupBg;
      ctx.strokeStyle = groupBorder;
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([8, 4]);
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

      ctx.fillStyle = '#ffffff';
      ctx.fillText(group.title, gx + 18, gy + 18);
      ctx.restore();
    }

    // 3. Edges
    const nodeMap = new Map<string, FlintGraphNode>(nodes.map((n) => [n.id, n]));
    for (const edge of edges) {
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

      const dx = wasm.bezier_control_dx(Math.round(p0x), Math.round(p3x));
      const p1x = p0x + dx;
      const p1y = p0y;
      const p2x = p3x - dx;
      const p2y = p3y;

      const pulseOffset = edgePulses.get(edge.id);
      const isPulseActive = pulseOffset !== undefined;
      const isSelected = selectedEdgeIds.has(edge.id);

      ctx.save();
      if (isSelected) {
        ctx.strokeStyle = isDark ? '#58a6ff' : '#0969da';
        ctx.lineWidth = 4.5 / zoom;
        ctx.shadowColor = isDark ? 'rgba(88, 166, 255, 0.9)' : 'rgba(9, 105, 218, 0.7)';
        ctx.shadowBlur = 10;
      } else if (isPulseActive) {
        ctx.strokeStyle = isDark ? '#3fb950' : '#1a7f37';
        ctx.lineWidth = 4 / zoom;
        ctx.shadowColor = isDark ? 'rgba(63, 185, 80, 0.9)' : 'rgba(26, 127, 55, 0.7)';
        ctx.shadowBlur = 10;
      } else {
        ctx.strokeStyle = isDark ? '#79a8ff' : '#57606a';
        ctx.lineWidth = 3.2 / zoom;
        ctx.shadowColor = isDark ? 'rgba(121, 168, 255, 0.35)' : 'rgba(87, 96, 106, 0.2)';
        ctx.shadowBlur = 4;
      }
      ctx.beginPath();
      ctx.moveTo(p0x, p0y);
      ctx.bezierCurveTo(p1x, p1y, p2x, p2y, p3x, p3y);
      ctx.stroke();

      if (isPulseActive && pulseOffset !== undefined) {
        const pulseProgress = Math.max(0, Math.min(1, pulseOffset));
        const tPermille = Math.round(pulseProgress * 1000);
        const pulseX = wasm.bezier_point_1d(
          Math.round(p0x),
          Math.round(p1x),
          Math.round(p2x),
          Math.round(p3x),
          tPermille,
        );
        const pulseY = wasm.bezier_point_1d(
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
        ctx.arc(pulseX, pulseY, 6 / zoom, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 4. Connecting Edge
    if (connectingEdge) {
      const fromNode = nodeMap.get(connectingEdge.fromNodeId);
      if (fromNode) {
        const outIdx = (fromNode.outputs ?? []).findIndex((p) => p.id === connectingEdge?.fromPortId);
        const inIdx = (fromNode.inputs ?? []).findIndex((p) => p.id === connectingEdge?.fromPortId);

        let p0x = fromNode.position.x + NODE_WIDTH;
        let p0y = fromNode.position.y + NODE_HEADER_HEIGHT + 14;

        if (outIdx !== -1) {
          p0x = fromNode.position.x + NODE_WIDTH;
          p0y = fromNode.position.y + NODE_HEADER_HEIGHT + outIdx * PORT_ROW_HEIGHT + 14;
        } else if (inIdx !== -1) {
          p0x = fromNode.position.x;
          p0y = fromNode.position.y + NODE_HEADER_HEIGHT + inIdx * PORT_ROW_HEIGHT + 14;
        }

        const p3x = connectingEdge.cursorX;
        const p3y = connectingEdge.cursorY;
        const dx = Math.max(Math.abs(p3x - p0x) * 0.5, 40);

        ctx.save();
        ctx.strokeStyle = isDark ? '#58a6ff' : '#0969da';
        ctx.lineWidth = 2.5 / zoom;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(p0x, p0y);
        ctx.bezierCurveTo(p0x + dx, p0y, p3x - dx, p3y, p3x, p3y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = isDark ? '#58a6ff' : '#0969da';
        ctx.beginPath();
        ctx.arc(p3x, p3y, 5 / zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 5. Nodes
    for (const node of nodes) {
      const bounds = getNodeBounds(node);
      const nodeWidth = bounds.maxX - bounds.minX;
      const nodeHeight = bounds.maxY - bounds.minY;
      const x = bounds.minX;
      const y = bounds.minY;

      // Cull nodes completely outside viewport
      if (x + nodeWidth < minX || x > maxX || y + nodeHeight < minY || y > maxY) continue;

      const isSelected = selectedNodeIds.has(node.id);
      const isActive = activeNodeIds.has(node.id);
      const isTrapped = trappedNodeId === node.id;
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
      ctx.strokeStyle = isTrapped
        ? isDark
          ? '#f85149'
          : '#cf222e'
        : isActive
          ? isDark
            ? '#3fb950'
            : '#1a7f37'
          : isSelected
            ? isDark
              ? '#58a6ff'
              : '#0969da'
            : isMeta
              ? isDark
                ? '#79c0ff'
                : '#0969da'
              : isDark
                ? '#30363d'
                : '#d0d7de';
      ctx.lineWidth = (isSelected || isTrapped || isActive ? 2.5 : 1.5) / zoom;

      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, nodeWidth, nodeHeight, 8);
      } else {
        ctx.rect(x, y, nodeWidth, nodeHeight);
      }
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Node Header
      ctx.save();
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, nodeWidth, NODE_HEADER_HEIGHT, [8, 8, 0, 0]);
      } else {
        ctx.rect(x, y, nodeWidth, NODE_HEADER_HEIGHT);
      }
      ctx.fillStyle = isTrapped
        ? isDark
          ? '#3d1417'
          : '#fee2e2'
        : isActive
          ? isDark
            ? '#143d22'
            : '#dcfce7'
          : isMeta
            ? isDark
              ? '#0d2847'
              : '#e1ecf7'
            : isDark
              ? '#161b22'
              : '#f0f2f5';
      ctx.fill();

      // Category accent bar (4px)
      const catColor = getCategoryRgba(node.category, isMeta, isDark);
      ctx.fillStyle = `rgba(${Math.round(catColor[0] * 255)},${Math.round(catColor[1] * 255)},${Math.round(catColor[2] * 255)},${catColor[3]})`;
      ctx.fillRect(x + 1, y + 1, nodeWidth - 2, 4);

      // Header separator
      ctx.strokeStyle = isDark ? 'rgba(48, 54, 61, 0.8)' : 'rgba(208, 215, 222, 0.8)';
      ctx.lineWidth = 1 / zoom;
      ctx.beginPath();
      ctx.moveTo(x + 1, y + NODE_HEADER_HEIGHT);
      ctx.lineTo(x + nodeWidth - 1, y + NODE_HEADER_HEIGHT);
      ctx.stroke();

      // Title
      ctx.fillStyle = isDark ? '#f0f6fc' : '#1f2328';
      ctx.font = 'bold 12px "Comfortaa", -apple-system, sans-serif';
      ctx.fillText(node.title, x + 10, y + 17);

      // Category / Meta pill
      ctx.fillStyle = isMeta ? (isDark ? '#58a6ff' : '#0969da') : isDark ? '#8b949e' : '#57606a';
      ctx.font = '10px "Datatype", monospace';
      const catText = isMeta ? `META (${node.metaSubgraph?.nodes.length ?? 0})` : node.category.toUpperCase();
      const catWidth = ctx.measureText(catText).width;
      ctx.fillText(catText, x + nodeWidth - catWidth - 10, y + 17);

      // Subtitle operation identifier
      ctx.fillStyle = isDark ? '#8b949e' : '#57606a';
      ctx.font = '9px "Datatype", monospace';
      ctx.fillText(node.operation, x + 10, y + 28);

      // Port circles (Pins) and labels
      ctx.font = '11px "Comfortaa", -apple-system, sans-serif';
      for (const [idx, port] of (node.inputs ?? []).entries()) {
        const portY = y + NODE_HEADER_HEIGHT + idx * PORT_ROW_HEIGHT + 14;
        const isHovered = hoveredPort?.nodeId === node.id && hoveredPort.portId === port.id;
        const portRgb = getPortTypeRgba(port.type, isDark);
        const portColor = `rgba(${Math.round(portRgb[0] * 255)},${Math.round(portRgb[1] * 255)},${Math.round(portRgb[2] * 255)},${portRgb[3]})`;

        ctx.save();
        ctx.fillStyle = isDark ? '#161b22' : '#f0f2f5';
        ctx.strokeStyle = portColor;
        ctx.lineWidth = (isHovered ? 2.5 : 1.5) / zoom;
        ctx.beginPath();
        ctx.arc(x, portY, 5 / zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isHovered ? '#ffffff' : portColor;
        ctx.beginPath();
        ctx.arc(x, portY, 2.5 / zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Label
        ctx.fillStyle = isDark ? '#c9d1d9' : '#24292f';
        ctx.fillText(port.name, x + 12, portY + 4);
      }

      for (const [idx, port] of (node.outputs ?? []).entries()) {
        const portY = y + NODE_HEADER_HEIGHT + idx * PORT_ROW_HEIGHT + 14;
        const isHovered = hoveredPort?.nodeId === node.id && hoveredPort.portId === port.id;
        const portRgb = getPortTypeRgba(port.type, isDark);
        const portColor = `rgba(${Math.round(portRgb[0] * 255)},${Math.round(portRgb[1] * 255)},${Math.round(portRgb[2] * 255)},${portRgb[3]})`;

        ctx.save();
        ctx.fillStyle = isDark ? '#161b22' : '#f0f2f5';
        ctx.strokeStyle = portColor;
        ctx.lineWidth = (isHovered ? 2.5 : 1.5) / zoom;
        ctx.beginPath();
        ctx.arc(x + nodeWidth, portY, 5 / zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isHovered ? '#ffffff' : portColor;
        ctx.beginPath();
        ctx.arc(x + nodeWidth, portY, 2.5 / zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Label
        ctx.fillStyle = isDark ? '#c9d1d9' : '#24292f';
        const labelWidth = ctx.measureText(port.name).width;
        ctx.fillText(port.name, x + nodeWidth - labelWidth - 12, portY + 4);
      }

      // Literal properties preview
      if (node.properties && Object.keys(node.properties).length > 0) {
        const propKeys = Object.keys(node.properties);
        const firstVal = String(node.properties[propKeys[0]]);
        ctx.fillStyle = isDark ? '#58a6ff' : '#0969da';
        ctx.font = '10px "Datatype", monospace';
        ctx.fillText(`= ${firstVal}`, x + 10, y + nodeHeight - 8);
      }

      ctx.restore();
    }

    ctx.restore();

    const tEnd = typeof performance === 'undefined' ? 0 : performance.now();
    const frameTime = t0 > 0 && tEnd > 0 ? tEnd - t0 : 1.7;
    performanceStats = {
      ...performanceStats,
      renderTimeMs: Math.round(frameTime * 100) / 100,
      totalFrameTimeMs: Math.round((frameTime + 0.5) * 100) / 100,
      visibleNodesCount: nodes.length,
      visibleEdgesCount: edges.length,
      visiblePinsCount: nodes.length * 4,
      isFallback: activeBackend === 'canvas2d',
    };
  }

  /**
   * Renders the complete node graph using WebGL draw arrays and native Flint vertex batching.
   */
  function renderWebGLFrame(): void {
    const gl = glCtx;
    if (!gl || !glProgram || !glVertexBuffer || !glUniformLocations || !glAttribLocations || !wasm) return;

    const isDark = currentTheme !== 'light';
    const t0 = typeof performance === 'undefined' ? 0 : performance.now();
    const canvasW = canvas ? canvas.width : Math.round(width * dpr);
    const canvasH = canvas ? canvas.height : Math.round(height * dpr);
    gl.viewport(0, 0, canvasW, canvasH);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    if (isDark) {
      gl.clearColor(0.043, 0.071, 0.098, 1);
    } else {
      gl.clearColor(0.961, 0.965, 0.973, 1);
    }
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(glProgram);
    gl.uniform2f(glUniformLocations.u_resolution, width, height);
    gl.uniform2f(glUniformLocations.u_camera, wasm.get_camera_x(), wasm.get_camera_y());
    gl.uniform1f(glUniformLocations.u_zoom, wasm.get_camera_zoom());

    lineVertices = [];
    triVertices = [];
    textTriVertices = [];

    wasm.font_clear_text_vertices();
    wasm.getViewportBounds(200);
    const minX = wasm.get_bounds_min_x();
    const minY = wasm.get_bounds_min_y();
    const maxX = wasm.get_bounds_max_x();
    const maxY = wasm.get_bounds_max_y();

    // 1. Grid
    const minorSpacing = 24;
    const majorSpacing = 120;
    const startX = Math.floor(minX / minorSpacing) * minorSpacing;
    const endX = Math.ceil(maxX / minorSpacing) * minorSpacing;
    const startY = Math.floor(minY / minorSpacing) * minorSpacing;
    const endY = Math.ceil(maxY / minorSpacing) * minorSpacing;

    if (wasm.get_camera_zoom() > 0.4) {
      const minorColor = isDark ? [0.22, 0.25, 0.32, 0.18] : [0.55, 0.61, 0.69, 0.25];
      for (let x = startX; x <= endX; x += minorSpacing) {
        if (x % majorSpacing !== 0) {
          pushLine(x, minY, x, maxY, minorColor[0], minorColor[1], minorColor[2], minorColor[3]);
        }
      }
      for (let y = startY; y <= endY; y += minorSpacing) {
        if (y % majorSpacing !== 0) {
          pushLine(minX, y, maxX, y, minorColor[0], minorColor[1], minorColor[2], minorColor[3]);
        }
      }
    }

    const majorColor = isDark ? [0.35, 0.4, 0.5, 0.35] : [0.39, 0.47, 0.57, 0.45];
    const majorStartX = Math.floor(minX / majorSpacing) * majorSpacing;
    const majorEndX = Math.ceil(maxX / majorSpacing) * majorSpacing;
    const majorStartY = Math.floor(minY / majorSpacing) * majorSpacing;
    const majorEndY = Math.ceil(maxY / majorSpacing) * majorSpacing;
    for (let x = majorStartX; x <= majorEndX; x += majorSpacing) {
      pushLine(x, minY, x, maxY, majorColor[0], majorColor[1], majorColor[2], majorColor[3]);
    }
    for (let y = majorStartY; y <= majorEndY; y += majorSpacing) {
      pushLine(minX, y, maxX, y, majorColor[0], majorColor[1], majorColor[2], majorColor[3]);
    }

    // 2. Groups
    for (const group of groups) {
      const groupNodes = nodes.filter((n) => group.nodeIds.includes(n.id));
      if (groupNodes.length === 0) continue;

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
      const pad = 24;
      const gx = gMinX - pad;
      const gy = gMinY - pad - 22;
      const gw = gMaxX - gMinX + pad * 2;
      const gh = gMaxY - gMinY + pad * 2 + 22;

      const groupBg: [number, number, number, number] = isDark ? [0.35, 0.65, 1, 0.08] : [0.035, 0.412, 0.855, 0.06];
      const groupBorder: [number, number, number, number] = isDark ? [0.35, 0.65, 1, 0.5] : [0.035, 0.412, 0.855, 0.6];
      pushRect(gx, gy, gw, gh, groupBg[0], groupBg[1], groupBg[2], groupBg[3]);
      pushRectBorder(gx, gy, gw, gh, groupBorder[0], groupBorder[1], groupBorder[2], groupBorder[3]);

      const titleW = wasm.font_measure_text(group.title, 12);
      const pillW = titleW + 16;
      pushRect(gx + 10, gy + 4, pillW, 20, isDark ? 0.35 : 0.035, isDark ? 0.65 : 0.412, isDark ? 1 : 0.855, 0.9);
      wasm.font_append_text_quads(group.title, gx + 18, gy + 18, 12, 1, 1, 1, 1, 0);
    }

    // 3. Edges
    const nodeMap = new Map<string, FlintGraphNode>(nodes.map((n) => [n.id, n]));
    for (const edge of edges) {
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

      const dx = wasm.bezier_control_dx(Math.round(p0x), Math.round(p3x));
      const p1x = p0x + dx;
      const p1y = p0y;
      const p2x = p3x - dx;
      const p2y = p3y;

      const isSelected = selectedEdgeIds.has(edge.id);
      const pulseOffset = edgePulses.get(edge.id);
      const isActive = pulseOffset !== undefined;

      const colorR = isDark ? (isSelected ? 0.35 : isActive ? 0.25 : 0.47) : isSelected ? 0.035 : isActive ? 0.1 : 0.34;
      const colorG = isDark ? (isSelected ? 0.65 : isActive ? 0.73 : 0.66) : isSelected ? 0.412 : isActive ? 0.5 : 0.38;
      const colorB = isDark ? (isSelected ? 1 : isActive ? 0.31 : 1) : isSelected ? 0.855 : isActive ? 0.22 : 0.42;
      const colorA = isSelected || isActive ? 1 : isDark ? 0.7 : 0.65;

      const steps = 16;
      for (let s = 0; s < steps; s++) {
        const t1Permille = Math.round((s / steps) * 1000);
        const t2Permille = Math.round(((s + 1) / steps) * 1000);
        const sx1 = wasm.bezier_point_1d(
          Math.round(p0x),
          Math.round(p1x),
          Math.round(p2x),
          Math.round(p3x),
          t1Permille,
        );
        const sy1 = wasm.bezier_point_1d(
          Math.round(p0y),
          Math.round(p1y),
          Math.round(p2y),
          Math.round(p3y),
          t1Permille,
        );
        const sx2 = wasm.bezier_point_1d(
          Math.round(p0x),
          Math.round(p1x),
          Math.round(p2x),
          Math.round(p3x),
          t2Permille,
        );
        const sy2 = wasm.bezier_point_1d(
          Math.round(p0y),
          Math.round(p1y),
          Math.round(p2y),
          Math.round(p3y),
          t2Permille,
        );
        pushLine(sx1, sy1, sx2, sy2, colorR, colorG, colorB, colorA);
      }
    }

    // 4. Connecting Edge
    if (connectingEdge) {
      const fromNode = nodeMap.get(connectingEdge.fromNodeId);
      if (fromNode) {
        const outIdx = (fromNode.outputs ?? []).findIndex((p) => p.id === connectingEdge?.fromPortId);
        const inIdx = (fromNode.inputs ?? []).findIndex((p) => p.id === connectingEdge?.fromPortId);
        let p0x = fromNode.position.x + NODE_WIDTH;
        let p0y = fromNode.position.y + NODE_HEADER_HEIGHT + 14;
        if (outIdx !== -1) {
          p0x = fromNode.position.x + NODE_WIDTH;
          p0y = fromNode.position.y + NODE_HEADER_HEIGHT + outIdx * PORT_ROW_HEIGHT + 14;
        } else if (inIdx !== -1) {
          p0x = fromNode.position.x;
          p0y = fromNode.position.y + NODE_HEADER_HEIGHT + inIdx * PORT_ROW_HEIGHT + 14;
        }
        pushLine(
          p0x,
          p0y,
          connectingEdge.cursorX,
          connectingEdge.cursorY,
          isDark ? 0.35 : 0.035,
          isDark ? 0.65 : 0.412,
          isDark ? 1 : 0.855,
          0.9,
        );
      }
    }

    // 5. Nodes
    for (const node of nodes) {
      const bounds = getNodeBounds(node);
      const nodeWidth = bounds.maxX - bounds.minX;
      const nodeHeight = bounds.maxY - bounds.minY;
      const x = bounds.minX;
      const y = bounds.minY;

      if (x + nodeWidth < minX || x > maxX || y + nodeHeight < minY || y > maxY) continue;

      const isSelected = selectedNodeIds.has(node.id);
      const isActive = activeNodeIds.has(node.id);
      const isTrapped = trappedNodeId === node.id;
      const isMeta = node.metaSubgraph !== undefined || node.operation === 'meta';

      const fillR = isDark ? (isMeta ? 0.086 : 0.129) : isMeta ? 0.941 : 1;
      const fillG = isDark ? (isMeta ? 0.118 : 0.149) : isMeta ? 0.957 : 1;
      const fillB = isDark ? (isMeta ? 0.18 : 0.176) : isMeta ? 0.973 : 1;
      pushRect(x, y, nodeWidth, nodeHeight, fillR, fillG, fillB, isDark ? 0.95 : 0.98);

      const borderR = isDark
        ? isTrapped
          ? 0.973
          : isActive
            ? 0.247
            : isSelected
              ? 0.345
              : isMeta
                ? 0.475
                : 0.188
        : isTrapped
          ? 0.812
          : isActive
            ? 0.102
            : isSelected
              ? 0.035
              : isMeta
                ? 0.035
                : 0.816;
      const borderG = isDark
        ? isTrapped
          ? 0.318
          : isActive
            ? 0.725
            : isSelected
              ? 0.651
              : isMeta
                ? 0.753
                : 0.212
        : isTrapped
          ? 0.133
          : isActive
            ? 0.498
            : isSelected
              ? 0.412
              : isMeta
                ? 0.412
                : 0.843;
      const borderB = isDark
        ? isTrapped
          ? 0.286
          : isActive
            ? 0.314
            : isSelected
              ? 1
              : isMeta
                ? 1
                : 0.239
        : isTrapped
          ? 0.18
          : isActive
            ? 0.216
            : isSelected
              ? 0.855
              : isMeta
                ? 0.855
                : 0.871;
      const borderA = isSelected || isTrapped || isActive ? 1 : isDark ? 0.8 : 0.9;
      pushRectBorder(x, y, nodeWidth, nodeHeight, borderR, borderG, borderB, borderA);

      // Node Header fill
      const headerR = isDark
        ? isTrapped
          ? 0.239
          : isActive
            ? 0.078
            : isMeta
              ? 0.051
              : 0.086
        : isTrapped
          ? 0.996
          : isActive
            ? 0.863
            : isMeta
              ? 0.882
              : 0.941;
      const headerG = isDark
        ? isTrapped
          ? 0.078
          : isActive
            ? 0.239
            : isMeta
              ? 0.157
              : 0.106
        : isTrapped
          ? 0.886
          : isActive
            ? 0.988
            : isMeta
              ? 0.925
              : 0.949;
      const headerB = isDark
        ? isTrapped
          ? 0.09
          : isActive
            ? 0.133
            : isMeta
              ? 0.278
              : 0.133
        : isTrapped
          ? 0.886
          : isActive
            ? 0.906
            : isMeta
              ? 0.969
              : 0.961;
      pushRect(x + 1, y + 1, nodeWidth - 2, NODE_HEADER_HEIGHT - 1, headerR, headerG, headerB, 1);

      // Category accent bar (4px)
      const catColor = getCategoryRgba(node.category, isMeta, isDark);
      pushRect(x + 1, y + 1, nodeWidth - 2, 4, catColor[0], catColor[1], catColor[2], 1);

      // Header separator
      const sepColor = isDark ? [0.188, 0.212, 0.239, 0.8] : [0.816, 0.843, 0.871, 0.8];
      pushLine(
        x + 1,
        y + NODE_HEADER_HEIGHT,
        x + nodeWidth - 1,
        y + NODE_HEADER_HEIGHT,
        sepColor[0],
        sepColor[1],
        sepColor[2],
        sepColor[3],
      );

      // Node Text
      // Title
      const titleColor = isDark ? [0.941, 0.965, 0.988] : [0.122, 0.137, 0.157];
      wasm.font_append_text_quads(node.title, x + 10, y + 17, 12, titleColor[0], titleColor[1], titleColor[2], 1, 0);

      // Category / Meta pill
      const catText = isMeta
        ? `META (${node.metaSubgraph?.nodes.length ?? 0})`
        : (node.category || 'OPERATION').toUpperCase();
      const catTextColor = isMeta
        ? isDark
          ? [0.345, 0.651, 1, 1]
          : [0.035, 0.412, 0.855, 1]
        : isDark
          ? [0.545, 0.58, 0.62, 1]
          : [0.341, 0.376, 0.416, 1];
      wasm.font_append_text_quads_mono(
        catText,
        x + nodeWidth - 10,
        y + 17,
        10,
        catTextColor[0],
        catTextColor[1],
        catTextColor[2],
        1,
        1,
      );

      // Subtitle operation identifier
      const subColor = isDark ? [0.545, 0.58, 0.62] : [0.341, 0.376, 0.416];
      wasm.font_append_text_quads_mono(node.operation, x + 10, y + 28, 9, subColor[0], subColor[1], subColor[2], 1, 0);

      // Pins (Inputs)
      for (const [idx, port] of (node.inputs ?? []).entries()) {
        const portY = y + NODE_HEADER_HEIGHT + idx * PORT_ROW_HEIGHT + 14;
        const isHovered = hoveredPort?.nodeId === node.id && hoveredPort?.portId === port.id;
        const pinRadius = isHovered ? 7 : 5;
        const portColor = getPortTypeRgba(port.type, isDark);
        const pinInner = isDark ? [0.086, 0.106, 0.133] : [0.941, 0.949, 0.961];

        // Outer ring + inner dot
        pushCircle(x, portY, pinRadius, portColor[0], portColor[1], portColor[2], 1);
        pushCircle(x, portY, Math.max(1, pinRadius - 2), pinInner[0], pinInner[1], pinInner[2], 1);
        if (isHovered) {
          pushCircle(x, portY, Math.max(1, pinRadius - 2), 1, 1, 1, 1);
        }

        // Port label text
        const portTextColor = isDark ? [0.788, 0.82, 0.851] : [0.141, 0.161, 0.184];
        wasm.font_append_text_quads(
          port.name,
          x + 12,
          portY + 4,
          11,
          portTextColor[0],
          portTextColor[1],
          portTextColor[2],
          1,
          0,
        );
      }

      // Pins (Outputs)
      for (const [idx, port] of (node.outputs ?? []).entries()) {
        const portY = y + NODE_HEADER_HEIGHT + idx * PORT_ROW_HEIGHT + 14;
        const isHovered = hoveredPort?.nodeId === node.id && hoveredPort?.portId === port.id;
        const pinRadius = isHovered ? 7 : 5;
        const portColor = getPortTypeRgba(port.type, isDark);
        const pinInner = isDark ? [0.086, 0.106, 0.133] : [0.941, 0.949, 0.961];

        // Outer ring + inner dot
        pushCircle(x + nodeWidth, portY, pinRadius, portColor[0], portColor[1], portColor[2], 1);
        pushCircle(x + nodeWidth, portY, Math.max(1, pinRadius - 2), pinInner[0], pinInner[1], pinInner[2], 1);
        if (isHovered) {
          pushCircle(x + nodeWidth, portY, Math.max(1, pinRadius - 2), 1, 1, 1, 1);
        }

        // Port label text
        const portTextColor = isDark ? [0.788, 0.82, 0.851] : [0.141, 0.161, 0.184];
        wasm.font_append_text_quads(
          port.name,
          x + nodeWidth - 12,
          portY + 4,
          11,
          portTextColor[0],
          portTextColor[1],
          portTextColor[2],
          1,
          1,
        );
      }

      // Literal properties preview
      if (node.properties && Object.keys(node.properties).length > 0) {
        const firstVal = String(Object.values(node.properties)[0]);
        const propColor = isDark ? [0.345, 0.651, 1] : [0.035, 0.412, 0.855];
        wasm.font_append_text_quads_mono(
          `= ${firstVal}`,
          x + 10,
          y + nodeHeight - 8,
          10,
          propColor[0],
          propColor[1],
          propColor[2],
          1,
          0,
        );
      }
    }

    const glTextFloatCount = wasm.font_get_vertex_float_count();
    const glTextBufPtr = wasm.font_get_vertex_buffer_ptr();
    const glTextF64View = new Float64Array(wasm.memory.buffer, glTextBufPtr, glTextFloatCount);
    textTriVertices = [...glTextF64View];

    // Draw triangles
    if (triVertices.length > 0 && glVertexBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, glVertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triVertices), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(glAttribLocations.a_position);
      gl.vertexAttribPointer(glAttribLocations.a_position, 2, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(glAttribLocations.a_color);
      gl.vertexAttribPointer(glAttribLocations.a_color, 4, gl.FLOAT, false, 24, 8);
      gl.drawArrays(gl.TRIANGLES, 0, triVertices.length / 6);
    }

    // Draw lines
    if (lineVertices.length > 0 && glVertexBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, glVertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineVertices), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(glAttribLocations.a_position);
      gl.vertexAttribPointer(glAttribLocations.a_position, 2, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(glAttribLocations.a_color);
      gl.vertexAttribPointer(glAttribLocations.a_color, 4, gl.FLOAT, false, 24, 8);
      gl.drawArrays(gl.LINES, 0, lineVertices.length / 6);
    }

    // Draw text
    if (
      textTriVertices.length > 0 &&
      glTextProgram &&
      glTexVertexBuffer &&
      glFontTexture &&
      glTextUniformLocations &&
      glTextAttribLocations
    ) {
      gl.useProgram(glTextProgram);
      gl.uniform2f(glTextUniformLocations.u_resolution, width, height);
      gl.uniform2f(glTextUniformLocations.u_camera, wasm.get_camera_x(), wasm.get_camera_y());
      gl.uniform1f(glTextUniformLocations.u_zoom, wasm.get_camera_zoom());

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, glFontTexture);
      gl.uniform1i(glTextUniformLocations.u_fontTexture, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, glTexVertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textTriVertices), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(glTextAttribLocations.a_position);
      gl.vertexAttribPointer(glTextAttribLocations.a_position, 2, gl.FLOAT, false, 32, 0);
      gl.enableVertexAttribArray(glTextAttribLocations.a_uv);
      gl.vertexAttribPointer(glTextAttribLocations.a_uv, 2, gl.FLOAT, false, 32, 8);
      gl.enableVertexAttribArray(glTextAttribLocations.a_color);
      gl.vertexAttribPointer(glTextAttribLocations.a_color, 4, gl.FLOAT, false, 32, 16);
      gl.drawArrays(gl.TRIANGLES, 0, textTriVertices.length / 8);
    }

    const tEnd = typeof performance === 'undefined' ? 0 : performance.now();
    const frameTime = t0 > 0 && tEnd > 0 ? tEnd - t0 : 1.2;
    performanceStats = {
      ...performanceStats,
      renderTimeMs: Math.round(frameTime * 100) / 100,
      totalFrameTimeMs: Math.round((frameTime + 0.4) * 100) / 100,
      visibleNodesCount: nodes.length,
      visibleEdgesCount: edges.length,
      visiblePinsCount: nodes.length * 4,
      isFallback: false,
    };
  }

  const capabilities: WebAssembly.Imports = {
    'webgpu.upload_camera_buffer': {
      gpu_upload_camera_buffer: () => {
        if (!gpuContext || !cameraBuffer || !wasm || !gpuDevice) return;
        prepareWebGpuInstances();
        const cameraUniforms = new Float32Array(24);
        wasm.createViewProjectionMatrix(256);
        const f64Array = new Float64Array(wasm.memory.buffer, 256, 16);
        for (let i = 0; i < 16; i++) {
          cameraUniforms[i] = f64Array[i] ?? 0;
        }
        cameraUniforms[16] = wasm.get_camera_viewport_width();
        cameraUniforms[17] = wasm.get_camera_viewport_height();
        cameraUniforms[18] = wasm.get_camera_x();
        cameraUniforms[19] = wasm.get_camera_y();
        cameraUniforms[20] = wasm.get_camera_zoom();
        cameraUniforms[21] = 1;
        cameraUniforms[22] = currentTheme === 'light' ? 0 : 1;
        gpuDevice.queue.writeBuffer(cameraBuffer, 0, cameraUniforms);
      },
    },
    'webgpu.write_node_instance': {
      gpu_write_node_instance: (
        posX: number,
        posY: number,
        w: number,
        h: number,
        radius: number,
        isSelected: number,
        isActive: number,
        isTrapped: number,
      ) => {
        const isDark = currentTheme !== 'light';
        const glowR = isDark ? (isTrapped ? 0.95 : isActive ? 0.15 : 0) : isTrapped ? 0.81 : isActive ? 0.1 : 0;
        const glowG = isDark ? (isTrapped ? 0.15 : isActive ? 0.75 : 0) : isTrapped ? 0.13 : isActive ? 0.5 : 0;
        const glowB = isDark ? (isTrapped ? 0.2 : isActive ? 1 : 0) : isTrapped ? 0.18 : isActive ? 0.22 : 0;
        const glowA = isTrapped ? 0.9 : isActive ? 0.8 : isSelected ? 0.5 : 0;

        const fillR = isDark ? 0.14 : 1;
        const fillG = isDark ? 0.16 : 1;
        const fillB = isDark ? 0.22 : 1;
        const fillA = isDark ? 0.95 : 0.98;

        const borderR = isDark ? (isSelected ? 0.35 : 0.28) : isSelected ? 0.035 : 0.816;
        const borderG = isDark ? (isSelected ? 0.65 : 0.32) : isSelected ? 0.412 : 0.843;
        const borderB = isDark ? (isSelected ? 1 : 0.42) : isSelected ? 0.855 : 0.871;
        const borderA = isSelected ? 1 : 0.7;
        const borderWidth = isSelected ? 2.5 : 1.2;

        nodeInstanceFloats.push(
          posX,
          posY,
          w,
          h,
          radius,
          fillR,
          fillG,
          fillB,
          fillA,
          borderR,
          borderG,
          borderB,
          borderA,
          borderWidth,
          glowR,
          glowG,
          glowB,
          glowA,
        );
      },
    },
    'webgpu.write_edge_instance': {
      gpu_write_edge_instance: (
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
        const isDark = currentTheme !== 'light';
        const colorR = isDark
          ? isSelected
            ? 0.35
            : isActive
              ? 0.2
              : 0.45
          : isSelected
            ? 0.035
            : isActive
              ? 0.1
              : 0.34;
        const colorG = isDark
          ? isSelected
            ? 0.65
            : isActive
              ? 0.8
              : 0.52
          : isSelected
            ? 0.412
            : isActive
              ? 0.5
              : 0.38;
        const colorB = isDark ? (isSelected ? 1 : isActive ? 1 : 0.65) : isSelected ? 0.855 : isActive ? 0.22 : 0.42;
        const colorA = isSelected ? 1 : isActive ? 0.9 : isDark ? 0.8 : 0.65;
        const widthVal = isSelected ? 3 : 2.5;

        edgeInstanceFloats.push(
          p0x,
          p0y,
          p1x,
          p1y,
          p2x,
          p2y,
          p3x,
          p3y,
          colorR,
          colorG,
          colorB,
          colorA,
          widthVal,
          pulseOffsetPermille / 1000,
          isActive,
        );
      },
    },
    'webgpu.write_pin_instance': {
      gpu_write_pin_instance: (
        posX: number,
        posY: number,
        radius: number,
        isHovered: number,
        isActive: number,
        _isOutput: number,
      ) => {
        const isDark = currentTheme !== 'light';
        const fillR = isHovered ? (isDark ? 0 : 1) : isActive ? (isDark ? 0 : 0.1) : isDark ? 0.15 : 0.94;
        const fillG = isHovered ? (isDark ? 0.94 : 1) : isActive ? (isDark ? 1 : 0.5) : isDark ? 0.2 : 0.95;
        const fillB = isHovered ? (isDark ? 1 : 1) : isActive ? (isDark ? 0.53 : 0.22) : isDark ? 0.28 : 0.96;
        const fillA = 1;

        const borderR = isDark ? 0.45 : 0.34;
        const borderG = isDark ? 0.52 : 0.38;
        const borderB = isDark ? 0.65 : 0.42;
        const borderA = 0.8;
        const borderWidth = isHovered ? 2.5 : 1.5;

        const glowR = 0;
        const glowG = isHovered ? (isDark ? 0.94 : 0.41) : isActive ? (isDark ? 1 : 0.5) : 0;
        const glowB = isHovered ? (isDark ? 1 : 0.85) : isActive ? (isDark ? 0.53 : 0.22) : 0;
        const glowA = isHovered ? 0.8 : isActive ? 0.6 : 0;

        pinInstanceFloats.push(
          posX,
          posY,
          radius * 2,
          radius * 2,
          radius,
          fillR,
          fillG,
          fillB,
          fillA,
          borderR,
          borderG,
          borderB,
          borderA,
          borderWidth,
          glowR,
          glowG,
          glowB,
          glowA,
        );
      },
    },
    'webgpu.upload_node_buffer': {
      gpu_upload_node_buffer: (count?: number) => {
        if (!gpuDevice) return;
        const requiredCount = Math.max(count ?? 0, Math.floor(nodeInstanceFloats.length / 18));
        const requiredBytes = Math.max(requiredCount * 72, 1024);
        if (!nodeInstanceBuffer || nodeInstanceBuffer.size < requiredBytes) {
          nodeInstanceBuffer?.destroy();
          nodeInstanceBuffer = gpuDevice.createBuffer({
            size: Math.max(requiredBytes, 2048),
            usage: 0x00_20 | 0x00_08,
          });
        }
        if (nodeInstanceFloats.length > 0) {
          const nodeData = new Float32Array(nodeInstanceFloats);
          gpuDevice.queue.writeBuffer(nodeInstanceBuffer, 0, nodeData);
        }
      },
    },
    'webgpu.upload_edge_buffer': {
      gpu_upload_edge_buffer: (count?: number) => {
        if (!gpuDevice) return;
        const requiredCount = Math.max(count ?? 0, Math.floor(edgeInstanceFloats.length / 15));
        const requiredBytes = Math.max(requiredCount * 60, 1024);
        if (!edgeInstanceBuffer || edgeInstanceBuffer.size < requiredBytes) {
          edgeInstanceBuffer?.destroy();
          edgeInstanceBuffer = gpuDevice.createBuffer({
            size: Math.max(requiredBytes, 2048),
            usage: 0x00_20 | 0x00_08,
          });
        }
        if (edgeInstanceFloats.length > 0) {
          const edgeData = new Float32Array(edgeInstanceFloats);
          gpuDevice.queue.writeBuffer(edgeInstanceBuffer, 0, edgeData);
        }
      },
    },
    'webgpu.upload_pin_buffer': {
      gpu_upload_pin_buffer: (count?: number) => {
        if (!gpuDevice) return;
        const requiredCount = Math.max(count ?? 0, Math.floor(pinInstanceFloats.length / 18));
        const requiredBytes = Math.max(requiredCount * 72, 1024);
        if (!pinInstanceBuffer || pinInstanceBuffer.size < requiredBytes) {
          pinInstanceBuffer?.destroy();
          pinInstanceBuffer = gpuDevice.createBuffer({
            size: Math.max(requiredBytes, 2048),
            usage: 0x00_20 | 0x00_08,
          });
        }
        if (pinInstanceFloats.length > 0) {
          const pinData = new Float32Array(pinInstanceFloats);
          gpuDevice.queue.writeBuffer(pinInstanceBuffer, 0, pinData);
        }
      },
    },
    'webgpu.render_begin': {
      gpu_render_begin: () => {
        if (!gpuDevice || !gpuContext) return;
        const isDark = currentTheme !== 'light';
        currentCommandEncoder = gpuDevice.createCommandEncoder();
        const currentTexture = gpuContext.getCurrentTexture();
        const textureView = currentTexture.createView();
        currentPassEncoder = currentCommandEncoder.beginRenderPass({
          colorAttachments: [
            {
              view: textureView,
              clearValue: isDark ? { r: 0.043, g: 0.071, b: 0.098, a: 1 } : { r: 0.961, g: 0.965, b: 0.973, a: 1 },
              loadOp: 'clear',
              storeOp: 'store',
            },
          ],
        });
      },
    },
    'webgpu.render_grid': {
      gpu_render_grid: () => {
        if (!currentPassEncoder || !gridPipeline || !cameraBindGroup) return;
        currentPassEncoder.setPipeline(gridPipeline);
        currentPassEncoder.setBindGroup(0, cameraBindGroup);
        currentPassEncoder.draw(6, 1, 0, 0);
      },
    },
    'webgpu.render_edges': {
      gpu_render_edges: (count: number) => {
        if (!currentPassEncoder || !edgesPipeline || !cameraBindGroup || !edgeInstanceBuffer) return;
        const maxInstances = Math.floor(edgeInstanceBuffer.size / 60);
        const actualCount = Math.min(count, Math.floor(edgeInstanceFloats.length / 15), maxInstances);
        if (actualCount === 0) return;
        currentPassEncoder.setPipeline(edgesPipeline);
        currentPassEncoder.setBindGroup(0, cameraBindGroup);
        currentPassEncoder.setVertexBuffer(0, edgeInstanceBuffer);
        currentPassEncoder.draw(66, actualCount, 0, 0);
      },
    },
    'webgpu.render_nodes': {
      gpu_render_nodes: (_count: number) => {
        if (!currentPassEncoder || !nodesPipeline || !cameraBindGroup || !nodeInstanceBuffer) return;
        const maxInstances = Math.floor(nodeInstanceBuffer.size / 72);
        const actualCount = Math.min(Math.floor(nodeInstanceFloats.length / 18), maxInstances);
        if (actualCount === 0) return;
        currentPassEncoder.setPipeline(nodesPipeline);
        currentPassEncoder.setBindGroup(0, cameraBindGroup);
        currentPassEncoder.setVertexBuffer(0, nodeInstanceBuffer);
        currentPassEncoder.draw(6, actualCount, 0, 0);
      },
    },
    'webgpu.render_pins': {
      gpu_render_pins: (_count: number) => {
        if (!currentPassEncoder || !nodesPipeline || !cameraBindGroup || !pinInstanceBuffer) return;
        const maxInstances = Math.floor(pinInstanceBuffer.size / 72);
        const actualCount = Math.min(Math.floor(pinInstanceFloats.length / 18), maxInstances);
        if (actualCount === 0) return;
        currentPassEncoder.setPipeline(nodesPipeline);
        currentPassEncoder.setBindGroup(0, cameraBindGroup);
        currentPassEncoder.setVertexBuffer(0, pinInstanceBuffer);
        currentPassEncoder.draw(6, actualCount, 0, 0);
      },
    },
    'webgpu.render_end': {
      gpu_render_end: () => {
        if (!currentPassEncoder || !currentCommandEncoder || !gpuContext) return;
        if (textPipeline && cameraBindGroup && fontBindGroup && webGpuTextVertices.length > 0 && gpuDevice) {
          const requiredBytes = webGpuTextVertices.length * 4;
          if (!textVertexBuffer || textVertexBuffer.size < requiredBytes) {
            textVertexBuffer?.destroy();
            textVertexBuffer = gpuDevice.createBuffer({
              size: Math.max(requiredBytes, 4096),
              usage: 0x00_20 | 0x00_08,
            });
          }
          if (textVertexBuffer) {
            gpuDevice.queue.writeBuffer(textVertexBuffer, 0, new Float32Array(webGpuTextVertices));
            currentPassEncoder.setPipeline(textPipeline);
            currentPassEncoder.setBindGroup(0, cameraBindGroup);
            currentPassEncoder.setBindGroup(1, fontBindGroup);
            currentPassEncoder.setVertexBuffer(0, textVertexBuffer);
            currentPassEncoder.draw(webGpuTextVertices.length / 8, 1, 0, 0);
          }
        }
        currentPassEncoder.end();
        gpuDevice?.queue.submit([currentCommandEncoder.finish()]);
        currentPassEncoder = undefined;
        currentCommandEncoder = undefined;
      },
    },
    'webgl.render_begin': {
      gl_render_begin: (w: number, h: number, dprVal: number, camX: number, camY: number, zoomVal: number) => {
        if (!glCtx || !glProgram) return;
        const gl = glCtx;
        const isDark = currentTheme !== 'light';
        const canvasW = canvas ? canvas.width : Math.round(w * dprVal);
        const canvasH = canvas ? canvas.height : Math.round(h * dprVal);
        gl.viewport(0, 0, canvasW, canvasH);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        if (isDark) {
          gl.clearColor(0.043, 0.071, 0.098, 1);
        } else {
          gl.clearColor(0.961, 0.965, 0.973, 1);
        }
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(glProgram);
        if (glUniformLocations) {
          gl.uniform2f(glUniformLocations.u_resolution, w, h);
          gl.uniform2f(glUniformLocations.u_camera, camX, camY);
          gl.uniform1f(glUniformLocations.u_zoom, zoomVal);
        }
        triVertices = [];
        lineVertices = [];
      },
    },
    'webgl.render_grid': {
      gl_render_grid: (minX: number, minY: number, maxX: number, maxY: number, zoomVal: number) => {
        const isDark = currentTheme !== 'light';
        const minorSpacing = 24;
        const majorSpacing = 120;
        const startX = Math.floor(minX / minorSpacing) * minorSpacing;
        const endX = Math.ceil(maxX / minorSpacing) * minorSpacing;
        const startY = Math.floor(minY / minorSpacing) * minorSpacing;
        const endY = Math.ceil(maxY / minorSpacing) * minorSpacing;

        const minorColor = isDark ? [0.22, 0.25, 0.32, 0.18] : [0.55, 0.61, 0.69, 0.25];
        const majorColor = isDark ? [0.35, 0.4, 0.5, 0.35] : [0.39, 0.47, 0.57, 0.45];

        if (zoomVal > 0.4) {
          for (let x = startX; x <= endX; x += minorSpacing) {
            if (x % majorSpacing !== 0) {
              lineVertices.push(
                x,
                minY,
                minorColor[0],
                minorColor[1],
                minorColor[2],
                minorColor[3],
                x,
                maxY,
                minorColor[0],
                minorColor[1],
                minorColor[2],
                minorColor[3],
              );
            }
          }
          for (let y = startY; y <= endY; y += minorSpacing) {
            if (y % majorSpacing !== 0) {
              lineVertices.push(
                minX,
                y,
                minorColor[0],
                minorColor[1],
                minorColor[2],
                minorColor[3],
                maxX,
                y,
                minorColor[0],
                minorColor[1],
                minorColor[2],
                minorColor[3],
              );
            }
          }
        }

        const majorStartX = Math.floor(minX / majorSpacing) * majorSpacing;
        const majorEndX = Math.ceil(maxX / majorSpacing) * majorSpacing;
        const majorStartY = Math.floor(minY / majorSpacing) * majorSpacing;
        const majorEndY = Math.ceil(maxY / majorSpacing) * majorSpacing;
        for (let x = majorStartX; x <= majorEndX; x += majorSpacing) {
          lineVertices.push(
            x,
            minY,
            majorColor[0],
            majorColor[1],
            majorColor[2],
            majorColor[3],
            x,
            maxY,
            majorColor[0],
            majorColor[1],
            majorColor[2],
            majorColor[3],
          );
        }
        for (let y = majorStartY; y <= majorEndY; y += majorSpacing) {
          lineVertices.push(
            minX,
            y,
            majorColor[0],
            majorColor[1],
            majorColor[2],
            majorColor[3],
            maxX,
            y,
            majorColor[0],
            majorColor[1],
            majorColor[2],
            majorColor[3],
          );
        }
      },
    },
    'webgl.draw_edge': {
      gl_draw_edge: (
        p0x: number,
        p0y: number,
        p1x: number,
        p1y: number,
        p2x: number,
        p2y: number,
        p3x: number,
        p3y: number,
        isSelected: number,
        _isActive: number,
      ) => {
        const isDark = currentTheme !== 'light';
        const edgeRed = isSelected ? (isDark ? 0.35 : 0.035) : isDark ? 0.47 : 0.34;
        const edgeGreen = isSelected ? (isDark ? 0.65 : 0.412) : isDark ? 0.66 : 0.38;
        const edgeBlue = isSelected ? (isDark ? 1 : 0.855) : isDark ? 1 : 0.42;
        const edgeAlpha = isSelected ? 1 : isDark ? 0.7 : 0.65;

        let prevX = p0x;
        let prevY = p0y;
        for (let step = 1; step <= 20; step++) {
          const stepFactor = step / 20;
          const invStepFactor = 1 - stepFactor;
          const currX =
            invStepFactor * invStepFactor * invStepFactor * p0x +
            3 * invStepFactor * invStepFactor * stepFactor * p1x +
            3 * invStepFactor * stepFactor * stepFactor * p2x +
            stepFactor * stepFactor * stepFactor * p3x;
          const currY =
            invStepFactor * invStepFactor * invStepFactor * p0y +
            3 * invStepFactor * invStepFactor * stepFactor * p1y +
            3 * invStepFactor * stepFactor * stepFactor * p2y +
            stepFactor * stepFactor * stepFactor * p3y;
          lineVertices.push(
            prevX,
            prevY,
            edgeRed,
            edgeGreen,
            edgeBlue,
            edgeAlpha,
            currX,
            currY,
            edgeRed,
            edgeGreen,
            edgeBlue,
            edgeAlpha,
          );
          prevX = currX;
          prevY = currY;
        }
      },
    },
    'webgl.draw_node': {
      gl_draw_node: (
        x: number,
        y: number,
        w: number,
        h: number,
        isSelected: number,
        isActive: number,
        isTrapped: number,
      ) => {
        const isDark = currentTheme !== 'light';
        pushRect(x, y, w, h, isDark ? 0.086 : 1, isDark ? 0.106 : 1, isDark ? 0.133 : 1, isDark ? 1 : 0.98);
        const br = isSelected
          ? isDark
            ? 0.35
            : 0.035
          : isTrapped
            ? isDark
              ? 0.97
              : 0.81
            : isActive
              ? isDark
                ? 0.25
                : 0.1
              : isDark
                ? 0.22
                : 0.816;
        const bg = isSelected
          ? isDark
            ? 0.65
            : 0.412
          : isTrapped
            ? isDark
              ? 0.32
              : 0.13
            : isActive
              ? isDark
                ? 0.73
                : 0.5
              : isDark
                ? 0.25
                : 0.843;
        const bb = isSelected
          ? isDark
            ? 1
            : 0.855
          : isTrapped
            ? isDark
              ? 0.29
              : 0.18
            : isActive
              ? isDark
                ? 0.31
                : 0.22
              : isDark
                ? 0.32
                : 0.871;
        lineVertices.push(
          x,
          y,
          br,
          bg,
          bb,
          1,
          x + w,
          y,
          br,
          bg,
          bb,
          1,
          x + w,
          y,
          br,
          bg,
          bb,
          1,
          x + w,
          y + h,
          br,
          bg,
          bb,
          1,
          x + w,
          y + h,
          br,
          bg,
          bb,
          1,
          x,
          y + h,
          br,
          bg,
          bb,
          1,
          x,
          y + h,
          br,
          bg,
          bb,
          1,
          x,
          y,
          br,
          bg,
          bb,
          1,
        );
      },
    },
    'webgl.draw_pin': {
      gl_draw_pin: (px: number, py: number, radius: number, isHovered: number, isActive: number, _isOutput: number) => {
        const isDark = currentTheme !== 'light';
        const pr = isHovered ? (isDark ? 0.47 : 0.035) : isActive ? (isDark ? 0.25 : 0.1) : isDark ? 0.55 : 0.34;
        const pg = isHovered ? (isDark ? 0.75 : 0.412) : isActive ? (isDark ? 0.73 : 0.5) : isDark ? 0.58 : 0.38;
        const pb = isHovered ? (isDark ? 1 : 0.855) : isActive ? (isDark ? 0.31 : 0.22) : isDark ? 0.62 : 0.42;
        pushRect(px - radius, py - radius, radius * 2, radius * 2, pr, pg, pb, 1);
      },
    },
    'webgl.render_end': {
      gl_render_end: () => {
        if (!glCtx || !glVertexBuffer || !glAttribLocations) return;
        const gl = glCtx;
        if (triVertices.length > 0) {
          gl.bindBuffer(gl.ARRAY_BUFFER, glVertexBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triVertices), gl.DYNAMIC_DRAW);
          gl.enableVertexAttribArray(glAttribLocations.a_position);
          gl.vertexAttribPointer(glAttribLocations.a_position, 2, gl.FLOAT, false, 24, 0);
          gl.enableVertexAttribArray(glAttribLocations.a_color);
          gl.vertexAttribPointer(glAttribLocations.a_color, 4, gl.FLOAT, false, 24, 8);
          gl.drawArrays(gl.TRIANGLES, 0, triVertices.length / 6);
        }
        if (lineVertices.length > 0) {
          gl.bindBuffer(gl.ARRAY_BUFFER, glVertexBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineVertices), gl.DYNAMIC_DRAW);
          gl.enableVertexAttribArray(glAttribLocations.a_position);
          gl.vertexAttribPointer(glAttribLocations.a_position, 2, gl.FLOAT, false, 24, 0);
          gl.enableVertexAttribArray(glAttribLocations.a_color);
          gl.vertexAttribPointer(glAttribLocations.a_color, 4, gl.FLOAT, false, 24, 8);
          gl.drawArrays(gl.LINES, 0, lineVertices.length / 6);
        }
      },
    },
    'webgl.render_frame': {
      webgl_render_frame: () => {
        renderWebGLFrame();
      },
    },
    'canvas2d.render_begin': {
      c2d_render_begin: (w: number, h: number, dprVal: number, camX: number, camY: number, zoomVal: number) => {
        if (!canvas2dCtx) return;
        const ctx = canvas2dCtx;
        const isDark = currentTheme !== 'light';
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
        if (!canvas2dCtx) return;
        const ctx = canvas2dCtx;
        const isDark = currentTheme !== 'light';
        const minorSpacing = 24;
        const majorSpacing = 120;
        const startX = Math.floor(minX / minorSpacing) * minorSpacing;
        const endX = Math.ceil(maxX / minorSpacing) * minorSpacing;
        const startY = Math.floor(minY / minorSpacing) * minorSpacing;
        const endY = Math.ceil(maxY / minorSpacing) * minorSpacing;

        ctx.lineWidth = 1 / zoomVal;
        if (zoomVal > 0.4) {
          ctx.strokeStyle = isDark ? 'rgba(56, 64, 82, 0.25)' : 'rgba(140, 155, 175, 0.25)';
          ctx.beginPath();
          for (let x = startX; x <= endX; x += minorSpacing) {
            if (x % majorSpacing !== 0) {
              ctx.moveTo(x, minY);
              ctx.lineTo(x, maxY);
            }
          }
          for (let y = startY; y <= endY; y += minorSpacing) {
            if (y % majorSpacing !== 0) {
              ctx.moveTo(minX, y);
              ctx.lineTo(maxX, y);
            }
          }
          ctx.stroke();
        }

        ctx.strokeStyle = isDark ? 'rgba(89, 102, 128, 0.35)' : 'rgba(100, 120, 145, 0.45)';
        ctx.beginPath();
        const majorStartX = Math.floor(minX / majorSpacing) * majorSpacing;
        const majorEndX = Math.ceil(maxX / majorSpacing) * majorSpacing;
        const majorStartY = Math.floor(minY / majorSpacing) * majorSpacing;
        const majorEndY = Math.ceil(maxY / majorSpacing) * majorSpacing;
        for (let x = majorStartX; x <= majorEndX; x += majorSpacing) {
          ctx.moveTo(x, minY);
          ctx.lineTo(x, maxY);
        }
        for (let y = majorStartY; y <= majorEndY; y += majorSpacing) {
          ctx.moveTo(minX, y);
          ctx.lineTo(maxX, y);
        }
        ctx.stroke();
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
        if (!canvas2dCtx) return;
        const ctx = canvas2dCtx;
        const isDark = currentTheme !== 'light';
        ctx.save();
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeStyle = isSelected
          ? isDark
            ? '#58a6ff'
            : '#0969da'
          : isDark
            ? 'rgba(139, 148, 158, 0.6)'
            : 'rgba(87, 96, 106, 0.6)';
        ctx.beginPath();
        ctx.moveTo(p0x, p0y);
        ctx.bezierCurveTo(p1x, p1y, p2x, p2y, p3x, p3y);
        ctx.stroke();

        if (isActive) {
          const pulseRatio = pulseOffsetPermille / 1000;
          const invPulseRatio = 1 - pulseRatio;
          const bx =
            invPulseRatio * invPulseRatio * invPulseRatio * p0x +
            3 * invPulseRatio * invPulseRatio * pulseRatio * p1x +
            3 * invPulseRatio * pulseRatio * pulseRatio * p2x +
            pulseRatio * pulseRatio * pulseRatio * p3x;
          const by =
            invPulseRatio * invPulseRatio * invPulseRatio * p0y +
            3 * invPulseRatio * invPulseRatio * pulseRatio * p1y +
            3 * invPulseRatio * pulseRatio * pulseRatio * p2y +
            pulseRatio * pulseRatio * pulseRatio * p3y;
          ctx.fillStyle = isDark ? '#79c0ff' : '#0969da';
          ctx.beginPath();
          ctx.arc(bx, by, 4, 0, Math.PI * 2);
          ctx.fill();
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
        categoryRgb: number,
      ) => {
        if (!canvas2dCtx) return;
        const ctx = canvas2dCtx;
        const isDark = currentTheme !== 'light';
        ctx.save();
        if (isSelected) {
          ctx.strokeStyle = isDark ? '#58a6ff' : '#0969da';
          ctx.lineWidth = 2;
        } else if (isTrapped) {
          ctx.strokeStyle = isDark ? '#f85149' : '#cf222e';
          ctx.lineWidth = 2;
        } else if (isActive) {
          ctx.strokeStyle = isDark ? '#3fb950' : '#1a7f37';
          ctx.lineWidth = 2;
        } else {
          ctx.strokeStyle = isDark ? 'rgba(56, 64, 82, 0.8)' : '#d0d7de';
          ctx.lineWidth = 1;
        }
        ctx.fillStyle = isDark ? '#161b22' : '#ffffff';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, w, h, 8);
        } else {
          ctx.rect(x, y, w, h);
        }
        ctx.fill();
        ctx.stroke();

        const catRed = (categoryRgb >> 16) & 255;
        const catGreen = (categoryRgb >> 8) & 255;
        const catBlue = categoryRgb & 255;
        ctx.fillStyle = `rgb(${catRed},${catGreen},${catBlue})`;
        ctx.fillRect(x + 1, y + 1, w - 2, 4);
        ctx.restore();
      },
    },
    'canvas2d.draw_pin': {
      c2d_draw_pin: (
        px: number,
        py: number,
        radius: number,
        isHovered: number,
        isActive: number,
        _isOutput: number,
      ) => {
        if (!canvas2dCtx) return;
        const ctx = canvas2dCtx;
        const isDark = currentTheme !== 'light';
        ctx.save();
        ctx.fillStyle = isHovered
          ? isDark
            ? '#79c0ff'
            : '#0969da'
          : isActive
            ? isDark
              ? '#3fb950'
              : '#1a7f37'
            : isDark
              ? '#8b949e'
              : '#57606a';
        ctx.strokeStyle = isDark ? '#0d1117' : '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      },
    },
    'canvas2d.render_end': {
      c2d_render_end: () => {
        if (!canvas2dCtx) return;
        canvas2dCtx.restore();
      },
    },
    'canvas2d.render_frame': {
      canvas2d_render_frame: () => {
        render2dFrame();
      },
    },
  };

  /**
   * Dispatches a response message from the render worker back to the main thread or window.
   */
  const postReply = (reply: RenderWorkerOutputMessage): void => {
    const messageWithId: RenderWorkerOutputMessage = { id: 'flint_render_worker', ...reply };
    if (globalThis.window !== undefined && globalThis.self === globalThis.window) {
      globalThis.window.postMessage(messageWithId, '*');
    } else if (globalThis.self !== undefined && 'postMessage' in globalThis.self) {
      globalThis.self.postMessage(messageWithId);
    }
  };

  globalThis.self.addEventListener('message', async (event: MessageEvent<RenderWorkerInputMessage>) => {
    const msg = event.data;
    if (!msg || typeof msg !== 'object' || !('type' in msg)) {
      return;
    }
    const knownTypes = new Set([
      'init',
      'set_theme',
      'set_graph',
      'pan',
      'zoom',
      'resize',
      'set_selection',
      'set_pulse',
      'set_trace_state',
      'render_frame',
      'hit_test',
      'destroy',
    ]);
    if (!knownTypes.has(msg.type)) {
      return;
    }

    if (!wasm) {
      wasm = getFlintRenderWorkerWasm(capabilities);
    }

    try {
      switch (msg.type) {
        case 'init': {
          canvas = msg.canvas;
          width = msg.width ?? 800;
          height = msg.height ?? 600;
          dpr = msg.dpr ?? 1;
          const preferredRenderer = msg.renderer;
          if (msg.theme !== undefined) {
            currentTheme = msg.theme;
            wasm.engine_set_theme(currentTheme === 'light' ? 1 : 0);
          }

          if (canvas) {
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
          }

          wasm.engine_create(width, height, dpr);
          wasm.engine_set_theme(currentTheme === 'light' ? 1 : 0);

          let initialized = false;
          let selectedTier = 3;

          if (canvas) {
            const hasWebGpu =
              typeof navigator !== 'undefined' &&
              'gpu' in navigator &&
              (navigator as unknown as WebGpuNavigator).gpu !== undefined;

            if ((preferredRenderer === 'webgpu' || !preferredRenderer) && hasWebGpu) {
              initialized = await initWebGpuBackend(canvas);
              if (initialized) {
                selectedTier = 1;
                activeBackend = 'webgpu';
              }
            }

            if (!initialized && (preferredRenderer === 'webgl' || !preferredRenderer)) {
              initialized = initWebGLBackend(canvas);
              if (initialized) {
                selectedTier = 2;
                activeBackend = 'webgl';
              }
            }

            if (!initialized && (preferredRenderer === 'canvas2d' || !preferredRenderer)) {
              initialized = init2dBackend(canvas);
              if (initialized) {
                selectedTier = 3;
                activeBackend = 'canvas2d';
              }
            }

            if (!initialized && !preferredRenderer) {
              if (hasWebGpu) {
                initialized = await initWebGpuBackend(canvas);
                if (initialized) {
                  selectedTier = 1;
                  activeBackend = 'webgpu';
                }
              }
              if (!initialized) {
                initialized = initWebGLBackend(canvas);
                if (initialized) {
                  selectedTier = 2;
                  activeBackend = 'webgl';
                }
              }
              if (!initialized) {
                initialized = init2dBackend(canvas);
                if (initialized) {
                  selectedTier = 3;
                  activeBackend = 'canvas2d';
                }
              }
            }

            wasm.engine_set_backend(selectedTier);
          }

          performanceStats = {
            ...performanceStats,
            dpr,
          };
          wasm.engine_render_frame(nodes.length, edges.length, nodes.length * 4);

          postReply({
            type: 'ready',
            supported: true,
            performance: performanceStats,
          } as RenderWorkerOutputMessage);
          break;
        }
        case 'set_theme': {
          if (msg.theme !== undefined) {
            currentTheme = msg.theme;
            wasm.engine_set_theme(currentTheme === 'light' ? 1 : 0);
            wasm.engine_render_frame(nodes.length, edges.length, nodes.length * 4);
            postReply({
              type: 'frame',
              performance: performanceStats,
              visibleNodes: nodes.length,
              visibleEdges: edges.length,
            } as RenderWorkerOutputMessage);
          }
          break;
        }
        case 'set_graph': {
          nodes = msg.nodes ?? [];
          edges = msg.edges ?? [];
          groups = msg.groups ?? [];

          wasm.spatial_clear();
          for (const [i, node] of nodes.entries()) {
            if (node) {
              const maxPorts = Math.max(node.inputs?.length ?? 0, node.outputs?.length ?? 0);
              wasm.getNodeBounds(node.position.x, node.position.y, maxPorts);
              const minX = wasm.get_node_bounds_min_x();
              const minY = wasm.get_node_bounds_min_y();
              const maxX = wasm.get_node_bounds_max_x();
              const maxY = wasm.get_node_bounds_max_y();
              wasm.spatial_insert_node(
                i,
                Math.round(minX) + COORD_OFFSET,
                Math.round(minY) + COORD_OFFSET,
                Math.round(maxX) + COORD_OFFSET,
                Math.round(maxY) + COORD_OFFSET,
              );
            }
          }
          wasm.engine_render_frame(nodes.length, edges.length, nodes.length * 4);
          postReply({
            type: 'frame',
            performance: performanceStats,
            visibleNodes: nodes.length,
            visibleEdges: edges.length,
          } as RenderWorkerOutputMessage);
          break;
        }
        case 'pan': {
          if (msg.deltaX !== undefined && msg.deltaY !== undefined) {
            wasm.engine_pan(msg.deltaX, msg.deltaY);
            wasm.engine_render_frame(nodes.length, edges.length, nodes.length * 4);
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
              performance: performanceStats,
              visibleNodes: nodes.length,
              visibleEdges: edges.length,
            } as RenderWorkerOutputMessage);
          }
          break;
        }
        case 'zoom': {
          if (msg.factor !== undefined) {
            wasm.engine_zoom(msg.cursorX ?? 0, msg.cursorY ?? 0, msg.factor);
            wasm.engine_render_frame(nodes.length, edges.length, nodes.length * 4);
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
              performance: performanceStats,
              visibleNodes: nodes.length,
              visibleEdges: edges.length,
            } as RenderWorkerOutputMessage);
          }
          break;
        }
        case 'resize': {
          if (msg.width !== undefined && msg.height !== undefined) {
            width = msg.width;
            height = msg.height;
            dpr = msg.dpr ?? dpr;
            if (canvas) {
              canvas.width = Math.round(width * dpr);
              canvas.height = Math.round(height * dpr);
            }
            wasm.engine_resize(width, height, dpr);
            performanceStats = {
              ...performanceStats,
              dpr,
            };
            wasm.engine_render_frame(nodes.length, edges.length, nodes.length * 4);
            postReply({
              type: 'frame',
              performance: performanceStats,
              visibleNodes: nodes.length,
              visibleEdges: edges.length,
            } as RenderWorkerOutputMessage);
          }
          break;
        }
        case 'set_selection': {
          selectedNodeIds.clear();
          if (msg.selectedNodeIds) {
            for (const id of msg.selectedNodeIds) {
              selectedNodeIds.add(id);
            }
          }
          selectedEdgeIds.clear();
          if (msg.selectedEdgeIds) {
            for (const id of msg.selectedEdgeIds) {
              selectedEdgeIds.add(id);
            }
          }
          wasm.engine_render_frame(nodes.length, edges.length, nodes.length * 4);
          postReply({
            type: 'frame',
            performance: performanceStats,
            visibleNodes: nodes.length,
            visibleEdges: edges.length,
          } as RenderWorkerOutputMessage);
          break;
        }
        case 'set_pulse': {
          if (msg.edgeId !== undefined) {
            edgePulses.set(msg.edgeId, msg.progress);
            wasm.engine_render_frame(nodes.length, edges.length, nodes.length * 4);
            postReply({
              type: 'frame',
              performance: performanceStats,
              visibleNodes: nodes.length,
              visibleEdges: edges.length,
            } as RenderWorkerOutputMessage);
          }
          break;
        }
        case 'set_trace_state': {
          activeNodeIds.clear();
          if (msg.activeNodeIds) {
            for (const id of msg.activeNodeIds) {
              activeNodeIds.add(id);
            }
          }
          trappedNodeId = msg.trappedNodeId;
          edgePulses.clear();
          if (msg.edgePulses) {
            for (const pulse of msg.edgePulses) {
              edgePulses.set(pulse.edgeId, pulse.offset);
            }
          }
          wasm.engine_render_frame(nodes.length, edges.length, nodes.length * 4);
          postReply({
            type: 'frame',
            performance: performanceStats,
            visibleNodes: nodes.length,
            visibleEdges: edges.length,
          } as RenderWorkerOutputMessage);
          break;
        }
        case 'render_frame': {
          wasm.engine_render_frame(nodes.length, edges.length, nodes.length * 4);
          postReply({
            type: 'frame',
            performance: performanceStats,
            visibleNodes: nodes.length,
            visibleEdges: edges.length,
          } as RenderWorkerOutputMessage);
          break;
        }
        case 'hit_test': {
          if (msg.cursorX !== undefined && msg.cursorY !== undefined) {
            const px = Math.round(msg.cursorX) + COORD_OFFSET;
            const py = Math.round(msg.cursorY) + COORD_OFFSET;
            const hit = wasm.spatial_hit_test_point(px, py);
            let hitResult: FlintHitResult | undefined;
            if (hit > 0) {
              const node = nodes[hit - 1];
              if (node) {
                hitResult = {
                  type: 'node',
                  nodeId: node.id,
                  worldX: msg.cursorX,
                  worldY: msg.cursorY,
                };
              }
            } else {
              const nodeMap = new Map<string, FlintGraphNode>(nodes.map((n) => [n.id, n]));
              for (const edge of edges) {
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
                if (wasm.edge_hit_test(msg.cursorX, msg.cursorY, p0x, p0y, p3x, p3y, msg.snapRadius ?? 15)) {
                  hitResult = {
                    type: 'edge',
                    nodeId: edge.fromNodeId,
                    edgeId: edge.id,
                    worldX: msg.cursorX,
                    worldY: msg.cursorY,
                  };
                  break;
                }
              }
            }
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
          break;
        }
        case 'destroy': {
          nodeInstanceBuffer?.destroy();
          nodeInstanceBuffer = undefined;
          edgeInstanceBuffer?.destroy();
          edgeInstanceBuffer = undefined;
          pinInstanceBuffer?.destroy();
          pinInstanceBuffer = undefined;
          textVertexBuffer?.destroy();
          textVertexBuffer = undefined;
          fontTexture?.destroy?.();
          fontTexture = undefined;
          fontSampler = undefined;
          fontBindGroup = undefined;
          cameraBuffer?.destroy();
          cameraBuffer = undefined;
          cameraBindGroup = undefined;
          currentPassEncoder = undefined;
          currentCommandEncoder = undefined;
          gridPipeline = undefined;
          nodesPipeline = undefined;
          edgesPipeline = undefined;
          textPipeline = undefined;
          gpuDevice = undefined;
          gpuContext = undefined;
          if (glCtx) {
            if (glVertexBuffer) glCtx.deleteBuffer(glVertexBuffer);
            if (glTexVertexBuffer) glCtx.deleteBuffer(glTexVertexBuffer);
            if (glFontTexture) glCtx.deleteTexture(glFontTexture);
            if (glProgram) glCtx.deleteProgram(glProgram);
            if (glTextProgram) glCtx.deleteProgram(glTextProgram);
          }
          glVertexBuffer = undefined;
          glTexVertexBuffer = undefined;
          glFontTexture = undefined;
          glProgram = undefined;
          glTextProgram = undefined;
          glCtx = undefined;
          canvas2dCtx = undefined;
          canvas = undefined;
          break;
        }
        default: {
          break;
        }
      }
    } catch (error) {
      postReply({
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      } as RenderWorkerOutputMessage);
    }
  });
}
