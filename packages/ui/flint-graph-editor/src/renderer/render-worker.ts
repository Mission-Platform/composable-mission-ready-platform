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

export type FlintHitResult =
  | {
      readonly type: 'node';
      readonly nodeId: string;
      readonly edgeId?: string;
      readonly portId?: string;
      readonly groupId?: string;
      readonly waypointIndex?: number;
      readonly worldX?: number;
      readonly worldY?: number;
    }
  | {
      readonly type: 'edge';
      readonly edgeId: string;
      readonly nodeId?: string;
      readonly portId?: string;
      readonly groupId?: string;
      readonly waypointIndex?: number;
      readonly worldX?: number;
      readonly worldY?: number;
    }
  | {
      readonly type: 'port';
      readonly nodeId: string;
      readonly portId: string;
      readonly edgeId?: string;
      readonly groupId?: string;
      readonly waypointIndex?: number;
      readonly worldX?: number;
      readonly worldY?: number;
    }
  | {
      readonly type: 'group';
      readonly groupId: string;
      readonly nodeId?: string;
      readonly edgeId?: string;
      readonly portId?: string;
      readonly waypointIndex?: number;
      readonly worldX?: number;
      readonly worldY?: number;
    }
  | {
      readonly type: 'waypoint';
      readonly edgeId: string;
      readonly waypointIndex: number;
      readonly nodeId?: string;
      readonly portId?: string;
      readonly groupId?: string;
      readonly worldX?: number;
      readonly worldY?: number;
    };

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
      readonly selectedGroupId?: string;
    }
  | {
      readonly type: 'set_connecting_edge';
      readonly id?: string;
      readonly edge?: {
        readonly fromNodeId: string;
        readonly fromPortId: string;
        readonly cursorX: number;
        readonly cursorY: number;
      };
    }
  | {
      readonly type: 'set_hovered_port';
      readonly id?: string;
      readonly hoveredPort?: {
        readonly nodeId: string;
        readonly portId: string;
      };
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
      readonly type: 'reload_font_atlas';
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
  readonly textPassTimeMs?: number;
  readonly layoutTimeMs?: number;
  readonly totalFrameTimeMs: number;
  readonly visibleNodesCount: number;
  readonly totalNodesCount?: number;
  readonly visibleEdgesCount: number;
  readonly totalEdgesCount?: number;
  readonly visiblePinsCount: number;
  readonly totalPinsCount?: number;
  readonly textQuadCount?: number;
  readonly dpr: number;
  readonly isFallback: boolean;
  readonly fps?: number;
  readonly backend?: 'webgpu' | 'webgl' | 'canvas2d';
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
if (globalThis.self !== undefined) {
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
  let hoveredPort: { readonly nodeId: string; readonly portId: string } | undefined;
  let connectingEdge:
    | {
        readonly fromNodeId: string;
        readonly fromPortId: string;
        readonly cursorX: number;
        readonly cursorY: number;
      }
    | undefined;
  let selectedGroupId: string | undefined;

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
  let webGpuTextVertices: Float32Array = new Float32Array(0);

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
  let textTriVertices: Float32Array = new Float32Array(0);

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
    const table = isDark ? CATEGORY_RGBA_DARK : CATEGORY_RGBA_LIGHT;
    if (isMeta) return table.math;
    const color = category ? table[category] : undefined;
    return color ?? (isDark ? [0.545, 0.58, 0.62, 1] : [0.341, 0.376, 0.416, 1]);
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
    const table = isDark ? PORT_TYPE_RGBA_DARK : PORT_TYPE_RGBA_LIGHT;
    const typeStr = typeof type === 'string' ? type : '';
    return table[typeStr] ?? (isDark ? [0.788, 0.82, 0.851, 1] : [0.141, 0.161, 0.184, 1]);
  }

  /**
   * Expands short 3-hex and 6-hex strings to full 8-hex representations.
   */
  function expandShortHex(hex: string): string {
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
  function parseHexColor(hexStr: string): [number, number, number, number] | undefined {
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
   * Parses functional rgb() and rgba() color strings into normalized RGBA tuples.
   */
  function parseRgbColor(rgbStr: string): [number, number, number, number] | undefined {
    const match = rgbStr.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
    if (!match) return undefined;
    const r = Number.parseInt(match[1] || '0', 10) / 255;
    const g = Number.parseInt(match[2] || '0', 10) / 255;
    const b = Number.parseInt(match[3] || '0', 10) / 255;
    const a = match[4] ? Number.parseFloat(match[4]) : 1;
    return [r, g, b, a];
  }

  /**
   * Parses arbitrary CSS color hex, rgb, or rgba strings to normalized 0..1 RGBA float tuples.
   */
  function parseColorToRgba(
    colorStr?: string,
    defaultRgba: [number, number, number, number] = [0.35, 0.65, 1, 1],
  ): [number, number, number, number] {
    if (!colorStr) return defaultRgba;
    const str = colorStr.trim();
    if (str.startsWith('#')) return parseHexColor(str) ?? defaultRgba;
    if (str.startsWith('rgb')) return parseRgbColor(str) ?? defaultRgba;
    return defaultRgba;
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
   * Appends a quadrilateral as two triangles to the batch triangle buffer.
   */
  const pushQuad = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    red: number,
    green: number,
    blue: number,
    alpha: number,
  ): void => {
    triVertices.push(
      x0,
      y0,
      red,
      green,
      blue,
      alpha,
      x1,
      y1,
      red,
      green,
      blue,
      alpha,
      x2,
      y2,
      red,
      green,
      blue,
      alpha,
      x0,
      y0,
      red,
      green,
      blue,
      alpha,
      x2,
      y2,
      red,
      green,
      blue,
      alpha,
      x3,
      y3,
      red,
      green,
      blue,
      alpha,
    );
  };

  /**
   * Appends a thick line segment as two triangles (quad ribbon) to the batch triangle buffer.
   */
  const pushThickLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    thickness: number,
    red: number,
    green: number,
    blue: number,
    alpha: number,
  ): void => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 0.0001) return;
    const nx = (-dy / len) * (thickness / 2);
    const ny = (dx / len) * (thickness / 2);
    pushQuad(x1 - nx, y1 - ny, x1 + nx, y1 + ny, x2 + nx, y2 + ny, x2 - nx, y2 - ny, red, green, blue, alpha);
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
    thickness = 1.5,
  ): void => {
    pushThickLine(x, y, x + width, y, thickness, red, green, blue, alpha);
    pushThickLine(x + width, y, x + width, y + height, thickness, red, green, blue, alpha);
    pushThickLine(x + width, y + height, x, y + height, thickness, red, green, blue, alpha);
    pushThickLine(x, y + height, x, y, thickness, red, green, blue, alpha);
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
   * Prepares instanced WebGPU geometry and text quads for node groups.
   */
  function prepareWebGpuGroupInstances(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    isDark: boolean,
    selectedGroupIdVal: string | undefined,
    wasmEngine: NonNullable<typeof wasm>,
  ): void {
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

      if (gx + gw < minX || gx > maxX || gy + gh < minY || gy > maxY) {
        continue;
      }

      const isSelectedGroup = selectedGroupIdVal === group.id;
      const defaultBorder: [number, number, number, number] = isDark ? [0.35, 0.65, 1, 1] : [0.035, 0.412, 0.855, 1];
      const parsedColor = parseColorToRgba(group.color, defaultBorder);
      const groupBg: [number, number, number, number] = group.backgroundColor
        ? parseColorToRgba(group.backgroundColor, [
            parsedColor[0],
            parsedColor[1],
            parsedColor[2],
            isDark ? 0.12 : 0.08,
          ])
        : [parsedColor[0], parsedColor[1], parsedColor[2], isDark ? 0.12 : 0.08];
      const groupBorder: [number, number, number, number] = isSelectedGroup
        ? [1, 1, 1, 1]
        : [parsedColor[0], parsedColor[1], parsedColor[2], isDark ? 0.7 : 0.6];
      pushGpuNodeInstance(gx + gw / 2, gy + gh / 2, gw, gh, 12, groupBg, groupBorder, isSelectedGroup ? 3.5 : 2);

      const titleW = wasmEngine.font_measure_text(group.title, 12);
      const pillW = titleW + 16;
      pushGpuNodeInstance(
        gx + 10 + pillW / 2,
        gy + 4 + 10,
        pillW,
        20,
        4,
        [parsedColor[0], parsedColor[1], parsedColor[2], 0.9],
        isSelectedGroup ? [1, 1, 1, 1] : undefined,
        isSelectedGroup ? 1.5 : 0,
      );
      wasmEngine.font_append_text_quads(group.title, gx + 18, gy + 18, 12, 1, 1, 1, 1, 0);
    }
  }

  /**
   * Prepares port pins and labels for a WebGPU node instance.
   */
  function prepareWebGpuNodePins(
    node: FlintGraphNode,
    isDark: boolean,
    hoveredPortInfo: typeof hoveredPort,
    wasmEngine: NonNullable<typeof wasm>,
  ): number {
    let pinCount = 0;

    for (const [idx, port] of (node.inputs ?? []).entries()) {
      const py = node.position.y + NODE_HEADER_HEIGHT + idx * PORT_ROW_HEIGHT + 14;
      const isHovered = hoveredPortInfo?.nodeId === node.id && hoveredPortInfo?.portId === port.id;
      const pinRadius = isHovered ? 7 : 5;
      const portColor = getPortTypeRgba(port.type, isDark);
      const pinInnerBg: [number, number, number, number] = isDark ? [0.086, 0.106, 0.133, 1] : [0.941, 0.949, 0.961, 1];

      pushGpuPinInstance(node.position.x, py, pinRadius, pinInnerBg, 1.5, portColor);
      pushGpuPinInstance(node.position.x, py, 2.5, isHovered ? [1, 1, 1, 1] : portColor);
      pinCount++;

      const portTextColor = isDark ? [0.788, 0.82, 0.851, 1] : [0.141, 0.161, 0.184, 1];
      wasmEngine.font_append_text_quads(
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

    for (const [idx, port] of (node.outputs ?? []).entries()) {
      const py = node.position.y + NODE_HEADER_HEIGHT + idx * PORT_ROW_HEIGHT + 14;
      const isHovered = hoveredPortInfo?.nodeId === node.id && hoveredPortInfo?.portId === port.id;
      const pinRadius = isHovered ? 7 : 5;
      const portColor = getPortTypeRgba(port.type, isDark);
      const pinInnerBg: [number, number, number, number] = isDark ? [0.086, 0.106, 0.133, 1] : [0.941, 0.949, 0.961, 1];

      pushGpuPinInstance(node.position.x + NODE_WIDTH, py, pinRadius, pinInnerBg, 1.5, portColor);
      pushGpuPinInstance(node.position.x + NODE_WIDTH, py, 2.5, isHovered ? [1, 1, 1, 1] : portColor);
      pinCount++;

      const portTextColor = isDark ? [0.788, 0.82, 0.851, 1] : [0.141, 0.161, 0.184, 1];
      wasmEngine.font_append_text_quads(
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

    return pinCount;
  }

  /**
   * Prepares individual WebGPU node background, headers, category accent, and typography.
   */
  function prepareSingleWebGpuNode(
    node: FlintGraphNode,
    isDark: boolean,
    hoveredPortInfo: typeof hoveredPort,
    wasmEngine: NonNullable<typeof wasm>,
  ): number {
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

    const catColor = getCategoryRgba(node.category, isMeta, isDark);
    pushGpuNodeInstance(x + nodeWidth / 2, y + 3, nodeWidth - 4, 4, 2, catColor);

    const sepColor: [number, number, number, number] = isDark ? [0.188, 0.212, 0.239, 0.8] : [0.816, 0.843, 0.871, 0.8];
    pushGpuNodeInstance(x + nodeWidth / 2, y + NODE_HEADER_HEIGHT, nodeWidth - 2, 1, 0, sepColor);

    const titleColor = isDark ? [0.941, 0.965, 0.988, 1] : [0.122, 0.137, 0.157, 1];
    wasmEngine.font_append_text_quads(
      node.title,
      x + 10,
      y + 17,
      12,
      titleColor[0],
      titleColor[1],
      titleColor[2],
      1,
      0,
    );

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
    wasmEngine.font_append_text_quads(
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

    const subColor = isDark ? [0.545, 0.58, 0.62, 1] : [0.341, 0.376, 0.416, 1];
    wasmEngine.font_append_text_quads(node.operation, x + 10, y + 28, 9, subColor[0], subColor[1], subColor[2], 1, 0);

    const pinCount = prepareWebGpuNodePins(node, isDark, hoveredPortInfo, wasmEngine);

    if (node.properties && Object.keys(node.properties).length > 0) {
      const firstVal = String(Object.values(node.properties)[0]);
      const propColor = isDark ? [0.345, 0.651, 1, 1] : [0.035, 0.412, 0.855, 1];
      wasmEngine.font_append_text_quads_mono(
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

    return pinCount;
  }

  /**
   * Prepares instanced WebGPU geometry and SDF text quads for nodes.
   */
  function prepareWebGpuNodeInstances(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    isDark: boolean,
    hoveredPortInfo: typeof hoveredPort,
    wasmEngine: NonNullable<typeof wasm>,
  ): { visibleNodesCount: number; visiblePinsCount: number } {
    let visibleNodesCount = 0;
    let visiblePinsCount = 0;

    for (const node of nodes) {
      const bounds = getNodeBounds(node);
      const nodeWidth = bounds.maxX - bounds.minX;
      const nodeHeight = bounds.maxY - bounds.minY;
      const x = bounds.minX;
      const y = bounds.minY;

      if (x + nodeWidth < minX || x > maxX || y + nodeHeight < minY || y > maxY) {
        continue;
      }
      visibleNodesCount++;

      visiblePinsCount += prepareSingleWebGpuNode(node, isDark, hoveredPortInfo, wasmEngine);
    }

    return { visibleNodesCount, visiblePinsCount };
  }

  /**
   * Prepares instanced WebGPU spline geometry for graph edges.
   */
  function prepareWebGpuEdgeInstances(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    nodeMap: Map<string, FlintGraphNode>,
    wasmEngine: NonNullable<typeof wasm>,
  ): number {
    let visibleEdgesCount = 0;

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

      if (
        Math.max(p0x, p3x) < minX ||
        Math.min(p0x, p3x) > maxX ||
        Math.max(p0y, p3y) < minY ||
        Math.min(p0y, p3y) > maxY
      ) {
        continue;
      }
      visibleEdgesCount++;

      const isSelected = selectedEdgeIds.has(edge.id) ? 1 : 0;
      const isActive = edgePulses.has(edge.id) ? 1 : 0;
      const pulseOffset = edgePulses.get(edge.id) ?? 0;

      if (edge.points && edge.points.length > 0) {
        let prevX = p0x;
        let prevY = p0y;
        for (const pt of edge.points) {
          wasmEngine.compute_edge_instance(
            prevX,
            prevY,
            pt.x,
            pt.y,
            isSelected,
            isActive,
            Math.round(pulseOffset * 1000),
          );
          pushGpuPinInstance(pt.x, pt.y, isSelected ? 6 : 4.5, isSelected ? [0.35, 0.65, 1, 1] : [0.7, 0.7, 0.7, 1]);
          prevX = pt.x;
          prevY = pt.y;
        }
        wasmEngine.compute_edge_instance(prevX, prevY, p3x, p3y, isSelected, isActive, Math.round(pulseOffset * 1000));
      } else {
        wasmEngine.compute_edge_instance(p0x, p0y, p3x, p3y, isSelected, isActive, Math.round(pulseOffset * 1000));
      }
    }

    return visibleEdgesCount;
  }

  /**
   * Prepares in-flight interactive wire connection spline.
   */
  function prepareWebGpuConnectingEdge(
    connectingEdgeInfo: typeof connectingEdge,
    nodeMap: Map<string, FlintGraphNode>,
    hoveredPortInfo: typeof hoveredPort,
    isDark: boolean,
    wasmEngine: NonNullable<typeof wasm>,
  ): void {
    if (!connectingEdgeInfo) return;
    const fromNode = nodeMap.get(connectingEdgeInfo.fromNodeId);
    if (!fromNode) return;

    const outIdx = Math.max(
      0,
      (fromNode.outputs ?? []).findIndex((p) => p.id === connectingEdgeInfo?.fromPortId),
    );
    const inIdx = Math.max(
      0,
      (fromNode.inputs ?? []).findIndex((p) => p.id === connectingEdgeInfo?.fromPortId),
    );
    let p0x = fromNode.position.x + NODE_WIDTH;
    let p0y = fromNode.position.y + NODE_HEADER_HEIGHT + 14;
    if (outIdx !== -1) {
      p0x = fromNode.position.x + NODE_WIDTH;
      p0y = fromNode.position.y + NODE_HEADER_HEIGHT + outIdx * PORT_ROW_HEIGHT + 14;
    } else if (inIdx !== -1) {
      p0x = fromNode.position.x;
      p0y = fromNode.position.y + NODE_HEADER_HEIGHT + inIdx * PORT_ROW_HEIGHT + 14;
    }

    let p3x = connectingEdgeInfo.cursorX;
    let p3y = connectingEdgeInfo.cursorY;
    if (hoveredPortInfo) {
      const targetNode = nodeMap.get(hoveredPortInfo.nodeId);
      if (targetNode) {
        const tInIdx = (targetNode.inputs ?? []).findIndex((p) => p.id === hoveredPortInfo?.portId);
        const tOutIdx = (targetNode.outputs ?? []).findIndex((p) => p.id === hoveredPortInfo?.portId);
        if (tInIdx !== -1) {
          p3x = targetNode.position.x;
          p3y = targetNode.position.y + NODE_HEADER_HEIGHT + tInIdx * PORT_ROW_HEIGHT + 14;
        } else if (tOutIdx !== -1) {
          p3x = targetNode.position.x + NODE_WIDTH;
          p3y = targetNode.position.y + NODE_HEADER_HEIGHT + tOutIdx * PORT_ROW_HEIGHT + 14;
        }
      }
    }

    wasmEngine.compute_edge_instance(p0x, p0y, p3x, p3y, 1, 1, 500);
    pushGpuPinInstance(p3x, p3y, 6, isDark ? [0.475, 0.753, 1, 1] : [0.035, 0.412, 0.855, 1]);
  }

  /**
   * Prepares instanced WebGPU vertex buffers and text quads for active nodes, groups, edges, and pins.
   */
  function prepareWebGpuInstances(): void {
    if (!gpuContext || !cameraBuffer || !wasm) return;

    nodeInstanceFloats = [];
    edgeInstanceFloats = [];
    pinInstanceFloats = [];
    webGpuTextVertices = new Float32Array(0);

    wasm.font_clear_text_vertices();
    wasm.getViewportBounds(150);
    const minX = wasm.get_bounds_min_x();
    const minY = wasm.get_bounds_min_y();
    const maxX = wasm.get_bounds_max_x();
    const maxY = wasm.get_bounds_max_y();

    const isDark = currentTheme !== 'light';

    prepareWebGpuGroupInstances(minX, minY, maxX, maxY, isDark, selectedGroupId, wasm);

    const { visibleNodesCount, visiblePinsCount } = prepareWebGpuNodeInstances(
      minX,
      minY,
      maxX,
      maxY,
      isDark,
      hoveredPort,
      wasm,
    );

    const floatCount = wasm.font_get_vertex_float_count();
    const vbufPtr = wasm.font_get_vertex_buffer_ptr();
    const f64View = new Float64Array(wasm.memory.buffer, vbufPtr, floatCount);
    webGpuTextVertices = new Float32Array(f64View);

    const nodeMap = new Map<string, FlintGraphNode>(nodes.map((n) => [n.id, n]));
    const visibleEdgesCount = prepareWebGpuEdgeInstances(minX, minY, maxX, maxY, nodeMap, wasm);

    prepareWebGpuConnectingEdge(connectingEdge, nodeMap, hoveredPort, isDark, wasm);

    performanceStats = {
      ...performanceStats,
      visibleNodesCount,
      totalNodesCount: nodes.length,
      visibleEdgesCount,
      totalEdgesCount: edges.length,
      visiblePinsCount,
      totalPinsCount: nodes.length * 4,
      textQuadCount: floatCount / 8,
      backend: 'webgpu',
    };
  }

  /**
   * Resets existing WebGPU buffers, samplers, and pipelines when switching devices.
   */
  function resetWebGpuPipelines(): void {
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

  /**
   * Creates WebGPU geometry and grid render pipelines.
   */
  function createWebGpuGeometryPipelines(
    device: GPUDevice,
    pipelineLayout: GPUPipelineLayout,
    format: GPUTextureFormat,
  ): void {
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
  }

  /**
   * Initializes WebGPU font atlas texture and SDF text pipeline.
   */
  function setupWebGpuFontPipeline(
    device: GPUDevice,
    cameraBindGroupLayout: GPUBindGroupLayout,
    format: GPUTextureFormat,
  ): void {
    const atlasSize = wasm ? wasm.font_get_atlas_size() : 1024;
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
      const format = (
        nav.gpu.getPreferredCanvasFormat ? nav.gpu.getPreferredCanvasFormat() : 'bgra8unorm'
      ) as GPUTextureFormat;
      context.configure({ device, format, alphaMode: 'premultiplied' });

      if (gpuDevice !== device) {
        resetWebGpuPipelines();
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

      createWebGpuGeometryPipelines(device, pipelineLayout, format);
      setupWebGpuFontPipeline(device, cameraBindGroupLayout, format);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Compiles WebGL shader from GLSL source string.
   */
  function compileGlShader(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    type: number,
    source: string,
  ): WebGLShader | undefined {
    const shader = gl.createShader(type);
    if (!shader) return undefined;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return undefined;
    return shader;
  }

  /**
   * Creates and links linked WebGL shader program.
   */
  function createGlProgram(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    vsSource: string,
    fsSource: string,
  ): WebGLProgram | undefined {
    const vs = compileGlShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = compileGlShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return undefined;
    const program = gl.createProgram();
    if (!program) return undefined;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return undefined;
    return program;
  }

  /**
   * Initializes and binds glyph font texture in WebGL context.
   */
  function setupGlFontTexture(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    const atlasSize = wasm ? wasm.font_get_atlas_size() : 1024;
    const atlasPtr = wasm ? wasm.font_get_atlas_ptr() : 0;
    const rgbaData =
      wasm && atlasPtr > 0
        ? new Uint8Array(wasm.memory.buffer, atlasPtr, atlasSize * atlasSize * 4)
        : new Uint8Array(atlasSize * atlasSize * 4);
    const tex = gl.createTexture();
    if (!tex) return;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, atlasSize, atlasSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgbaData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    glFontTexture = tex;
  }

  /**
   * Initializes WebGL SDF text shader program and vertex attribute bindings.
   */
  function setupGlTextProgram(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
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
      float median(float r, float g, float b) {
        return max(min(r, g), min(max(r, g), b));
      }
      void main() {
        vec4 sampleCenter = texture2D(u_fontTexture, v_uv);
        if (v_color.a < 0.0) {
          if (sampleCenter.a < 0.01) discard;
          gl_FragColor = vec4(sampleCenter.rgb, sampleCenter.a * -v_color.a);
          return;
        }
        #ifdef GL_OES_standard_derivatives
          vec2 unitRange = vec2(4.0) / 1024.0;
          vec2 dUV = fwidth(v_uv);
          vec2 screenTexSize = vec2(1.0) / max(dUV, vec2(0.00001));
          float screenPxRange = max(0.5 * dot(unitRange, screenTexSize), 1.0);
          
          vec2 sub = dUV * 0.25;
          vec4 s0 = texture2D(u_fontTexture, v_uv + vec2(-sub.x, -sub.y));
          vec4 s1 = texture2D(u_fontTexture, v_uv + vec2( sub.x, -sub.y));
          vec4 s2 = texture2D(u_fontTexture, v_uv + vec2(-sub.x,  sub.y));
          vec4 s3 = texture2D(u_fontTexture, v_uv + vec2( sub.x,  sub.y));
          
          float a0 = clamp(screenPxRange * (median(s0.r, s0.g, s0.b) - 0.5) + 0.5, 0.0, 1.0);
          float a1 = clamp(screenPxRange * (median(s1.r, s1.g, s1.b) - 0.5) + 0.5, 0.0, 1.0);
          float a2 = clamp(screenPxRange * (median(s2.r, s2.g, s2.b) - 0.5) + 0.5, 0.0, 1.0);
          float a3 = clamp(screenPxRange * (median(s3.r, s3.g, s3.b) - 0.5) + 0.5, 0.0, 1.0);
          float alpha = (a0 + a1 + a2 + a3) * 0.25;
        #else
          float dist = median(sampleCenter.r, sampleCenter.g, sampleCenter.b);
          float alpha = smoothstep(0.46, 0.54, dist);
        #endif
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
      }
    `;

    const textProgram = createGlProgram(gl, vsTextSource, fsTextSource);
    if (!textProgram) return;

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

    setupGlFontTexture(gl);
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

      const program = createGlProgram(gl, vsSource, fsSource);
      if (!program) return false;

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
      setupGlTextProgram(gl);

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
   * Renders background grid lines onto the 2D canvas context.
   */
  function render2dGridPass(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    zoomVal: number,
    isDark: boolean,
  ): void {
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
  }

  /**
   * Renders node group bounding boxes, titles, and borders on 2D canvas.
   */
  function render2dGroupPass(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    zoomVal: number,
    isDark: boolean,
  ): void {
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

      if (gx + gw < minX || gx > maxX || gy + gh < minY || gy > maxY) {
        continue;
      }

      const isSelectedGroup = selectedGroupId === group.id;
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
  }

  /**
   * Renders waypoints and spline curves for a single edge on 2D canvas.
   */
  function render2dEdgeCurve(
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
    const hasWaypoints = edge.points && edge.points.length > 0;
    ctx.save();

    ctx.strokeStyle = isDark ? 'rgba(5, 10, 15, 0.85)' : 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = (isSelected ? 6.5 : 5) / zoomVal;
    ctx.beginPath();
    ctx.moveTo(p0x, p0y);
    if (hasWaypoints && edge.points) {
      for (let i = 0; i < edge.points.length; i++) {
        const pt = edge.points[i];
        if (pt) {
          if (i === 0) {
            const midX = (p0x + pt.x) / 2;
            ctx.bezierCurveTo(midX, p0y, midX, pt.y, pt.x, pt.y);
          } else {
            const prev = edge.points[i - 1];
            if (prev) {
              const midX = (prev.x + pt.x) / 2;
              ctx.bezierCurveTo(midX, prev.y, midX, pt.y, pt.x, pt.y);
            }
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

    if (isSelected) {
      ctx.strokeStyle = isDark ? '#79c0ff' : '#0969da';
      ctx.lineWidth = 4.5 / zoomVal;
      ctx.shadowColor = isDark ? 'rgba(88, 166, 255, 0.9)' : 'rgba(9, 105, 218, 0.7)';
      ctx.shadowBlur = 10;
    } else if (isPulseActive) {
      ctx.strokeStyle = isDark ? '#3fb950' : '#1a7f37';
      ctx.lineWidth = 4 / zoomVal;
      ctx.shadowColor = isDark ? 'rgba(63, 185, 80, 0.9)' : 'rgba(26, 127, 55, 0.7)';
      ctx.shadowBlur = 10;
    } else {
      ctx.strokeStyle = isDark ? '#58a6ff' : '#0550ae';
      ctx.lineWidth = 3.2 / zoomVal;
      ctx.shadowColor = isDark ? 'rgba(88, 166, 255, 0.35)' : 'rgba(9, 105, 218, 0.25)';
      ctx.shadowBlur = 4;
    }
    ctx.beginPath();
    ctx.moveTo(p0x, p0y);
    if (hasWaypoints && edge.points) {
      for (let i = 0; i < edge.points.length; i++) {
        const pt = edge.points[i];
        if (pt) {
          if (i === 0) {
            const midX = (p0x + pt.x) / 2;
            ctx.bezierCurveTo(midX, p0y, midX, pt.y, pt.x, pt.y);
          } else {
            const prev = edge.points[i - 1];
            if (prev) {
              const midX = (prev.x + pt.x) / 2;
              ctx.bezierCurveTo(midX, prev.y, midX, pt.y, pt.x, pt.y);
            }
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

    ctx.fillStyle = isSelected ? '#79c0ff' : isDark ? '#58a6ff' : '#0969da';
    ctx.beginPath();
    ctx.arc(p0x, p0y, 4 / zoomVal, 0, Math.PI * 2);
    ctx.arc(p3x, p3y, 4 / zoomVal, 0, Math.PI * 2);
    ctx.fill();

    if (hasWaypoints && edge.points) {
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

    const arrowX = hasWaypoints && edge.points ? (edge.points[0]?.x ?? (p0x + p3x) / 2) : (p0x + p3x) / 2;
    const arrowY = hasWaypoints && edge.points ? (edge.points[0]?.y ?? (p0y + p3y) / 2) : (p0y + p3y) / 2;
    ctx.fillStyle = isSelected ? '#ffffff' : isDark ? '#79c0ff' : '#0969da';
    ctx.beginPath();
    ctx.moveTo(arrowX - 4 / zoomVal, arrowY - 4 / zoomVal);
    ctx.lineTo(arrowX + 4 / zoomVal, arrowY);
    ctx.lineTo(arrowX - 4 / zoomVal, arrowY + 4 / zoomVal);
    ctx.fill();
  }

  /**
   * Renders edge connection cables and execution flow pulses on 2D canvas.
   */
  function render2dEdgePass(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    zoomVal: number,
    isDark: boolean,
    nodeMap: Map<string, FlintGraphNode>,
    wasmEngine: NonNullable<typeof wasm>,
  ): void {
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

      const pulseOffset = edgePulses.get(edge.id);
      const isPulseActive = pulseOffset !== undefined;
      const isSelected = selectedEdgeIds.has(edge.id);

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
   * Renders interactive in-flight wire connection cable on 2D canvas.
   */
  function render2dConnectingEdgePass(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    zoomVal: number,
    isDark: boolean,
    nodeMap: Map<string, FlintGraphNode>,
  ): void {
    if (!connectingEdge) return;
    const fromNode = nodeMap.get(connectingEdge.fromNodeId);
    if (!fromNode) return;

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

    let p3x = connectingEdge.cursorX;
    let p3y = connectingEdge.cursorY;
    let isSnapped = false;

    if (hoveredPort) {
      const targetNode = nodeMap.get(hoveredPort.nodeId);
      if (targetNode) {
        const tInIdx = (targetNode.inputs ?? []).findIndex((p) => p.id === hoveredPort?.portId);
        const tOutIdx = (targetNode.outputs ?? []).findIndex((p) => p.id === hoveredPort?.portId);
        if (tInIdx !== -1) {
          p3x = targetNode.position.x;
          p3y = targetNode.position.y + NODE_HEADER_HEIGHT + tInIdx * PORT_ROW_HEIGHT + 14;
          isSnapped = true;
        } else if (tOutIdx !== -1) {
          p3x = targetNode.position.x + NODE_WIDTH;
          p3y = targetNode.position.y + NODE_HEADER_HEIGHT + tOutIdx * PORT_ROW_HEIGHT + 14;
          isSnapped = true;
        }
      }
    }

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
   * Renders input and output port pins and labels for a single 2D node.
   */
  function render2dNodePins(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    node: FlintGraphNode,
    x: number,
    y: number,
    nodeWidth: number,
    zoomVal: number,
    isDark: boolean,
  ): void {
    ctx.font = '11px "Comfortaa", -apple-system, sans-serif';
    for (const [idx, port] of (node.inputs ?? []).entries()) {
      const portY = y + NODE_HEADER_HEIGHT + idx * PORT_ROW_HEIGHT + 14;
      const isHovered = hoveredPort?.nodeId === node.id && hoveredPort.portId === port.id;
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

    for (const [idx, port] of (node.outputs ?? []).entries()) {
      const portY = y + NODE_HEADER_HEIGHT + idx * PORT_ROW_HEIGHT + 14;
      const isHovered = hoveredPort?.nodeId === node.id && hoveredPort.portId === port.id;
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
   * Renders an individual node card, header, categories, and port pins on 2D canvas.
   */
  function render2dSingleNode(
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
    ctx.lineWidth = (isSelected || isTrapped || isActive ? 2.5 : 1.5) / zoomVal;

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, nodeWidth, nodeHeight, 8);
    } else {
      ctx.rect(x, y, nodeWidth, nodeHeight);
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();

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

    render2dNodePins(ctx, node, x, y, nodeWidth, zoomVal, isDark);

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
    const zoomVal = wasm.get_camera_zoom();
    const camX = wasm.get_camera_x();
    const camY = wasm.get_camera_y();
    ctx.scale(zoomVal, zoomVal);
    ctx.translate(-camX, -camY);

    wasm.getViewportBounds(100);
    const minX = wasm.get_bounds_min_x();
    const minY = wasm.get_bounds_min_y();
    const maxX = wasm.get_bounds_max_x();
    const maxY = wasm.get_bounds_max_y();

    render2dGridPass(ctx, minX, minY, maxX, maxY, zoomVal, isDark);
    render2dGroupPass(ctx, minX, minY, maxX, maxY, zoomVal, isDark);

    const nodeMap = new Map<string, FlintGraphNode>(nodes.map((n) => [n.id, n]));
    render2dEdgePass(ctx, minX, minY, maxX, maxY, zoomVal, isDark, nodeMap, wasm);
    render2dConnectingEdgePass(ctx, zoomVal, isDark, nodeMap);

    for (const node of nodes) {
      const bounds = getNodeBounds(node);
      const nodeWidth = bounds.maxX - bounds.minX;
      const nodeHeight = bounds.maxY - bounds.minY;
      const x = bounds.minX;
      const y = bounds.minY;

      if (x + nodeWidth < minX || x > maxX || y + nodeHeight < minY || y > maxY) continue;
      render2dSingleNode(ctx, node, zoomVal, isDark);
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
   * Renders background grid lines into WebGL line vertex buffers.
   */
  function renderWebGLGridPass(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    zoomVal: number,
    isDark: boolean,
  ): void {
    const minorSpacing = 24;
    const majorSpacing = 120;
    const startX = Math.floor(minX / minorSpacing) * minorSpacing;
    const endX = Math.ceil(maxX / minorSpacing) * minorSpacing;
    const startY = Math.floor(minY / minorSpacing) * minorSpacing;
    const endY = Math.ceil(maxY / minorSpacing) * minorSpacing;
    const lineThick = 1 / zoomVal;

    if (zoomVal > 0.4) {
      const minorColor = isDark ? [0.22, 0.25, 0.32, 0.25] : [0.55, 0.61, 0.69, 0.25];
      for (let x = startX; x <= endX; x += minorSpacing) {
        if (x % majorSpacing !== 0) {
          pushThickLine(x, minY, x, maxY, lineThick, minorColor[0], minorColor[1], minorColor[2], minorColor[3]);
        }
      }
      for (let y = startY; y <= endY; y += minorSpacing) {
        if (y % majorSpacing !== 0) {
          pushThickLine(minX, y, maxX, y, lineThick, minorColor[0], minorColor[1], minorColor[2], minorColor[3]);
        }
      }
    }

    const majorColor = isDark ? [0.35, 0.4, 0.5, 0.35] : [0.39, 0.47, 0.57, 0.45];
    const majorStartX = Math.floor(minX / majorSpacing) * majorSpacing;
    const majorEndX = Math.ceil(maxX / majorSpacing) * majorSpacing;
    const majorStartY = Math.floor(minY / majorSpacing) * majorSpacing;
    const majorEndY = Math.ceil(maxY / majorSpacing) * majorSpacing;
    for (let x = majorStartX; x <= majorEndX; x += majorSpacing) {
      pushThickLine(x, minY, x, maxY, lineThick, majorColor[0], majorColor[1], majorColor[2], majorColor[3]);
    }
    for (let y = majorStartY; y <= majorEndY; y += majorSpacing) {
      pushThickLine(minX, y, maxX, y, lineThick, majorColor[0], majorColor[1], majorColor[2], majorColor[3]);
    }
  }

  /**
   * Renders group boxes and labels into WebGL triangle/quad batches.
   */
  function renderWebGLGroupPass(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    isDark: boolean,
    wasmEngine: NonNullable<typeof wasm>,
  ): void {
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

      if (gx + gw < minX || gx > maxX || gy + gh < minY || gy > maxY) {
        continue;
      }

      const isSelectedGroup = selectedGroupId === group.id;
      const defaultBorder: [number, number, number, number] = isDark ? [0.35, 0.65, 1, 1] : [0.035, 0.412, 0.855, 1];
      const parsedColor = parseColorToRgba(group.color, defaultBorder);
      const groupBg: [number, number, number, number] = group.backgroundColor
        ? parseColorToRgba(group.backgroundColor, [
            parsedColor[0],
            parsedColor[1],
            parsedColor[2],
            isDark ? 0.12 : 0.08,
          ])
        : [parsedColor[0], parsedColor[1], parsedColor[2], isDark ? 0.12 : 0.08];
      const groupBorder: [number, number, number, number] = isSelectedGroup
        ? [1, 1, 1, 1]
        : [parsedColor[0], parsedColor[1], parsedColor[2], isDark ? 0.7 : 0.6];
      pushRect(gx, gy, gw, gh, groupBg[0], groupBg[1], groupBg[2], groupBg[3]);
      pushRectBorder(gx, gy, gw, gh, groupBorder[0], groupBorder[1], groupBorder[2], groupBorder[3]);

      const titleW = wasmEngine.font_measure_text(group.title, 12);
      const pillW = titleW + 16;
      pushRect(gx + 10, gy + 4, pillW, 20, parsedColor[0], parsedColor[1], parsedColor[2], 0.9);
      if (isSelectedGroup) {
        pushRectBorder(gx + 10, gy + 4, pillW, 20, 1, 1, 1, 1);
      }
      wasmEngine.font_append_text_quads(group.title, gx + 18, gy + 18, 12, 1, 1, 1, 1, 0);
    }
  }

  /**
   * Evaluates bezier segments for an edge and emits WebGL thick lines.
   */
  function pushWebGLBezierEdge(
    p0x: number,
    p0y: number,
    p3x: number,
    p3y: number,
    edgeThickness: number,
    colorR: number,
    colorG: number,
    colorB: number,
    colorA: number,
    wasmEngine: NonNullable<typeof wasm>,
  ): void {
    const p1x = p0x + wasmEngine.bezier_control_dx(Math.round(p0x), Math.round(p3x));
    const p1y = p0y;
    const p2x = p3x - wasmEngine.bezier_control_dx(Math.round(p0x), Math.round(p3x));
    const p2y = p3y;
    const steps = 24;
    for (let s = 0; s < steps; s++) {
      const t1Permille = Math.round((s / steps) * 1000);
      const t2Permille = Math.round(((s + 1) / steps) * 1000);
      const sx1 = wasmEngine.bezier_point_1d(
        Math.round(p0x),
        Math.round(p1x),
        Math.round(p2x),
        Math.round(p3x),
        t1Permille,
      );
      const sy1 = wasmEngine.bezier_point_1d(
        Math.round(p0y),
        Math.round(p1y),
        Math.round(p2y),
        Math.round(p3y),
        t1Permille,
      );
      const sx2 = wasmEngine.bezier_point_1d(
        Math.round(p0x),
        Math.round(p1x),
        Math.round(p2x),
        Math.round(p3x),
        t2Permille,
      );
      const sy2 = wasmEngine.bezier_point_1d(
        Math.round(p0y),
        Math.round(p1y),
        Math.round(p2y),
        Math.round(p3y),
        t2Permille,
      );
      pushThickLine(sx1, sy1, sx2, sy2, edgeThickness, colorR, colorG, colorB, colorA);
    }
  }

  /**
   * Renders edge connections and waypoints into WebGL primitive buffers.
   */
  function renderWebGLEdgePass(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    nodeMap: Map<string, FlintGraphNode>,
    isDark: boolean,
    wasmEngine: NonNullable<typeof wasm>,
  ): number {
    let visibleEdgesCount = 0;

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

      if (
        Math.max(p0x, p3x) < minX ||
        Math.min(p0x, p3x) > maxX ||
        Math.max(p0y, p3y) < minY ||
        Math.min(p0y, p3y) > maxY
      ) {
        continue;
      }
      visibleEdgesCount++;

      const isSelected = selectedEdgeIds.has(edge.id);
      const pulseOffset = edgePulses.get(edge.id);
      const isActive = pulseOffset !== undefined;

      const colorR = isDark
        ? isSelected
          ? 0.35
          : isActive
            ? 0.25
            : 0.35
        : isSelected
          ? 0.035
          : isActive
            ? 0.1
            : 0.035;
      const colorG = isDark
        ? isSelected
          ? 0.65
          : isActive
            ? 0.73
            : 0.65
        : isSelected
          ? 0.412
          : isActive
            ? 0.5
            : 0.412;
      const colorB = isDark ? (isSelected ? 1 : isActive ? 0.31 : 1) : isSelected ? 0.855 : isActive ? 0.22 : 0.855;
      const colorA = isSelected || isActive ? 1 : isDark ? 0.85 : 0.8;
      const edgeThickness = isSelected ? 3.5 : 2.5;

      const hasWaypoints = edge.points && edge.points.length > 0;
      if (hasWaypoints && edge.points) {
        let prevX = p0x;
        let prevY = p0y;
        for (const pt of edge.points) {
          pushThickLine(prevX, prevY, pt.x, pt.y, edgeThickness, colorR, colorG, colorB, colorA);
          pushRect(pt.x - 3, pt.y - 3, 6, 6, isSelected ? 0.35 : 1, isSelected ? 0.65 : 1, 1, 1);
          prevX = pt.x;
          prevY = pt.y;
        }
        pushThickLine(prevX, prevY, p3x, p3y, edgeThickness, colorR, colorG, colorB, colorA);
      } else {
        pushWebGLBezierEdge(p0x, p0y, p3x, p3y, edgeThickness, colorR, colorG, colorB, colorA, wasmEngine);
      }
    }

    return visibleEdgesCount;
  }

  /**
   * Renders in-flight wire connection cable in WebGL.
   */
  function renderWebGLConnectingEdgePass(nodeMap: Map<string, FlintGraphNode>, isDark: boolean): void {
    if (!connectingEdge) return;
    const fromNode = nodeMap.get(connectingEdge.fromNodeId);
    if (!fromNode) return;

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

    let p3x = connectingEdge.cursorX;
    let p3y = connectingEdge.cursorY;
    let isSnapped = false;

    if (hoveredPort) {
      const targetNode = nodeMap.get(hoveredPort.nodeId);
      if (targetNode) {
        const tInIdx = (targetNode.inputs ?? []).findIndex((p) => p.id === hoveredPort?.portId);
        const tOutIdx = (targetNode.outputs ?? []).findIndex((p) => p.id === hoveredPort?.portId);
        if (tInIdx !== -1) {
          p3x = targetNode.position.x;
          p3y = targetNode.position.y + NODE_HEADER_HEIGHT + tInIdx * PORT_ROW_HEIGHT + 14;
          isSnapped = true;
        } else if (tOutIdx !== -1) {
          p3x = targetNode.position.x + NODE_WIDTH;
          p3y = targetNode.position.y + NODE_HEADER_HEIGHT + tOutIdx * PORT_ROW_HEIGHT + 14;
          isSnapped = true;
        }
      }
    }

    const connR = isSnapped ? 0.247 : isDark ? 0.35 : 0.035;
    const connG = isSnapped ? 0.725 : isDark ? 0.65 : 0.412;
    const connB = isSnapped ? 0.314 : isDark ? 1 : 0.855;
    pushThickLine(p0x, p0y, p3x, p3y, isSnapped ? 4 : 3, connR, connG, connB, 1);
    pushCircle(p3x, p3y, isSnapped ? 8 : 6, connR, connG, connB, 1);
    pushCircle(p3x, p3y, isSnapped ? 5 : 4, isDark ? 1 : 0, isDark ? 1 : 0, isDark ? 1 : 0, 1);
  }

  /**
   * Renders input and output port pins and labels for a single WebGL node.
   */
  function renderWebGLNodePins(
    node: FlintGraphNode,
    x: number,
    y: number,
    nodeWidth: number,
    isDark: boolean,
    wasmEngine: NonNullable<typeof wasm>,
  ): number {
    let pinCount = 0;

    for (const [idx, port] of (node.inputs ?? []).entries()) {
      const portY = y + NODE_HEADER_HEIGHT + idx * PORT_ROW_HEIGHT + 14;
      const isHovered = hoveredPort?.nodeId === node.id && hoveredPort?.portId === port.id;
      const pinRadius = isHovered ? 7 : 5;
      const portColor = getPortTypeRgba(port.type, isDark);
      const pinInner = isDark ? [0.086, 0.106, 0.133] : [0.941, 0.949, 0.961];

      pushCircle(x, portY, pinRadius, portColor[0], portColor[1], portColor[2], 1);
      pushCircle(x, portY, Math.max(1, pinRadius - 1.5), pinInner[0], pinInner[1], pinInner[2], 1);
      pushCircle(
        x,
        portY,
        2.5,
        isHovered ? 1 : portColor[0],
        isHovered ? 1 : portColor[1],
        isHovered ? 1 : portColor[2],
        1,
      );
      pinCount++;

      const portTextColor = isDark ? [0.788, 0.82, 0.851] : [0.141, 0.161, 0.184];
      wasmEngine.font_append_text_quads(
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

    for (const [idx, port] of (node.outputs ?? []).entries()) {
      const portY = y + NODE_HEADER_HEIGHT + idx * PORT_ROW_HEIGHT + 14;
      const isHovered = hoveredPort?.nodeId === node.id && hoveredPort?.portId === port.id;
      const pinRadius = isHovered ? 7 : 5;
      const portColor = getPortTypeRgba(port.type, isDark);
      const pinInner = isDark ? [0.086, 0.106, 0.133] : [0.941, 0.949, 0.961];

      pushCircle(x + nodeWidth, portY, pinRadius, portColor[0], portColor[1], portColor[2], 1);
      pushCircle(x + nodeWidth, portY, Math.max(1, pinRadius - 1.5), pinInner[0], pinInner[1], pinInner[2], 1);
      pushCircle(
        x + nodeWidth,
        portY,
        2.5,
        isHovered ? 1 : portColor[0],
        isHovered ? 1 : portColor[1],
        isHovered ? 1 : portColor[2],
        1,
      );
      pinCount++;

      const portTextColor = isDark ? [0.788, 0.82, 0.851] : [0.141, 0.161, 0.184];
      wasmEngine.font_append_text_quads(
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

    return pinCount;
  }

  /**
   * Renders an individual node card, header, and port pins in WebGL.
   */
  function renderWebGLSingleNode(node: FlintGraphNode, isDark: boolean, wasmEngine: NonNullable<typeof wasm>): number {
    const bounds = getNodeBounds(node);
    const nodeWidth = bounds.maxX - bounds.minX;
    const nodeHeight = bounds.maxY - bounds.minY;
    const x = bounds.minX;
    const y = bounds.minY;

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

    const catColor = getCategoryRgba(node.category, isMeta, isDark);
    pushRect(x + 1, y + 1, nodeWidth - 2, 4, catColor[0], catColor[1], catColor[2], 1);

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

    const titleColor = isDark ? [0.941, 0.965, 0.988] : [0.122, 0.137, 0.157];
    wasmEngine.font_append_text_quads(
      node.title,
      x + 10,
      y + 17,
      12,
      titleColor[0],
      titleColor[1],
      titleColor[2],
      1,
      0,
    );

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
    wasmEngine.font_append_text_quads(
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

    const subColor = isDark ? [0.545, 0.58, 0.62] : [0.341, 0.376, 0.416];
    wasmEngine.font_append_text_quads(node.operation, x + 10, y + 28, 9, subColor[0], subColor[1], subColor[2], 1, 0);

    const pinCount = renderWebGLNodePins(node, x, y, nodeWidth, isDark, wasmEngine);

    if (node.properties && Object.keys(node.properties).length > 0) {
      const firstVal = String(Object.values(node.properties)[0]);
      const propColor = isDark ? [0.345, 0.651, 1] : [0.035, 0.412, 0.855];
      wasmEngine.font_append_text_quads_mono(
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

    return pinCount;
  }

  /**
   * Renders all visible nodes in WebGL.
   */
  function renderWebGLNodePass(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    isDark: boolean,
    wasmEngine: NonNullable<typeof wasm>,
  ): { visibleNodesCount: number; visiblePinsCount: number } {
    let visibleNodesCount = 0;
    let visiblePinsCount = 0;

    for (const node of nodes) {
      const bounds = getNodeBounds(node);
      const nodeWidth = bounds.maxX - bounds.minX;
      const nodeHeight = bounds.maxY - bounds.minY;
      const x = bounds.minX;
      const y = bounds.minY;

      if (x + nodeWidth < minX || x > maxX || y + nodeHeight < minY || y > maxY) continue;
      visibleNodesCount++;
      visiblePinsCount += renderWebGLSingleNode(node, isDark, wasmEngine);
    }

    return { visibleNodesCount, visiblePinsCount };
  }

  /**
   * Flushes WebGL SDF text batch to screen.
   */
  function renderWebGLTextPass(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    wasmEngine: NonNullable<typeof wasm>,
  ): number {
    const glTextFloatCount = wasmEngine.font_get_vertex_float_count();
    const glTextBufPtr = wasmEngine.font_get_vertex_buffer_ptr();
    const glTextF64View = new Float64Array(wasmEngine.memory.buffer, glTextBufPtr, glTextFloatCount);
    textTriVertices = new Float32Array(glTextF64View);

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
      gl.uniform2f(glTextUniformLocations.u_camera, wasmEngine.get_camera_x(), wasmEngine.get_camera_y());
      gl.uniform1f(glTextUniformLocations.u_zoom, wasmEngine.get_camera_zoom());

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, glFontTexture);
      gl.uniform1i(glTextUniformLocations.u_fontTexture, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, glTexVertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, textTriVertices, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(glTextAttribLocations.a_position);
      gl.vertexAttribPointer(glTextAttribLocations.a_position, 2, gl.FLOAT, false, 32, 0);
      gl.enableVertexAttribArray(glTextAttribLocations.a_uv);
      gl.vertexAttribPointer(glTextAttribLocations.a_uv, 2, gl.FLOAT, false, 32, 8);
      gl.enableVertexAttribArray(glTextAttribLocations.a_color);
      gl.vertexAttribPointer(glTextAttribLocations.a_color, 4, gl.FLOAT, false, 32, 16);
      gl.drawArrays(gl.TRIANGLES, 0, textTriVertices.length / 8);
    }

    return glTextFloatCount;
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
    textTriVertices = new Float32Array(0);

    wasm.font_clear_text_vertices();
    wasm.getViewportBounds(150);
    const minX = wasm.get_bounds_min_x();
    const minY = wasm.get_bounds_min_y();
    const maxX = wasm.get_bounds_max_x();
    const maxY = wasm.get_bounds_max_y();

    renderWebGLGridPass(minX, minY, maxX, maxY, wasm.get_camera_zoom(), isDark);
    renderWebGLGroupPass(minX, minY, maxX, maxY, isDark, wasm);

    const nodeMap = new Map<string, FlintGraphNode>(nodes.map((n) => [n.id, n]));
    const visibleEdgesCount = renderWebGLEdgePass(minX, minY, maxX, maxY, nodeMap, isDark, wasm);
    renderWebGLConnectingEdgePass(nodeMap, isDark);

    const { visibleNodesCount, visiblePinsCount } = renderWebGLNodePass(minX, minY, maxX, maxY, isDark, wasm);
    const glTextFloatCount = renderWebGLTextPass(gl, wasm);

    if (triVertices.length > 0 && glVertexBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, glVertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triVertices), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(glAttribLocations.a_position);
      gl.vertexAttribPointer(glAttribLocations.a_position, 2, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(glAttribLocations.a_color);
      gl.vertexAttribPointer(glAttribLocations.a_color, 4, gl.FLOAT, false, 24, 8);
      gl.drawArrays(gl.TRIANGLES, 0, triVertices.length / 6);
    }

    if (lineVertices.length > 0 && glVertexBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, glVertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineVertices), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(glAttribLocations.a_position);
      gl.vertexAttribPointer(glAttribLocations.a_position, 2, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(glAttribLocations.a_color);
      gl.vertexAttribPointer(glAttribLocations.a_color, 4, gl.FLOAT, false, 24, 8);
      gl.drawArrays(gl.LINES, 0, lineVertices.length / 6);
    }

    const tEnd = typeof performance === 'undefined' ? 0 : performance.now();
    const frameTime = t0 > 0 && tEnd > 0 ? tEnd - t0 : 1.2;
    performanceStats = {
      ...performanceStats,
      renderTimeMs: Math.round(frameTime * 100) / 100,
      totalFrameTimeMs: Math.round((frameTime + 0.4) * 100) / 100,
      visibleNodesCount,
      totalNodesCount: nodes.length,
      visibleEdgesCount,
      totalEdgesCount: edges.length,
      visiblePinsCount,
      totalPinsCount: nodes.length * 4,
      textQuadCount: glTextFloatCount / 8,
      backend: 'webgl',
      isFallback: false,
    };
  }

  interface WebGpuNodeStyle {
    readonly border: [number, number, number, number];
    readonly width: number;
    readonly glow: [number, number, number, number];
  }

  const GPU_NODE_STYLES_DARK: Record<string, WebGpuNodeStyle> = {
    trapped: { border: [0.97, 0.32, 0.29, 1], width: 2.5, glow: [0.95, 0.15, 0.2, 0.9] },
    active: { border: [0.25, 0.73, 0.31, 1], width: 2.5, glow: [0.15, 0.75, 1, 0.8] },
    selected: { border: [0.35, 0.65, 1, 1], width: 2.5, glow: [0, 0, 0, 0.5] },
    default: { border: [0.28, 0.32, 0.42, 0.7], width: 1.2, glow: [0, 0, 0, 0] },
  };

  const GPU_NODE_STYLES_LIGHT: Record<string, WebGpuNodeStyle> = {
    trapped: { border: [0.81, 0.13, 0.18, 1], width: 2.5, glow: [0.81, 0.13, 0.18, 0.9] },
    active: { border: [0.1, 0.5, 0.22, 1], width: 2.5, glow: [0.1, 0.5, 0.22, 0.8] },
    selected: { border: [0.035, 0.412, 0.855, 1], width: 2.5, glow: [0, 0, 0, 0.5] },
    default: { border: [0.816, 0.843, 0.871, 0.7], width: 1.2, glow: [0, 0, 0, 0] },
  };

  /**
   * Computes WebGPU node instance fill and border styling tuples.
   */
  function computeWebGpuNodeGlowAndBorder(isSelected: number, isActive: number, isTrapped: number, isDark: boolean) {
    const table = isDark ? GPU_NODE_STYLES_DARK : GPU_NODE_STYLES_LIGHT;
    const key = isTrapped ? 'trapped' : isActive ? 'active' : isSelected ? 'selected' : 'default';
    const nodeStyle = table[key];
    const fillR = isDark ? 0.14 : 1;
    const fillG = isDark ? 0.16 : 1;
    const fillB = isDark ? 0.22 : 1;
    const fillA = isDark ? 0.95 : 0.98;

    return {
      glowR: nodeStyle.glow[0],
      glowG: nodeStyle.glow[1],
      glowB: nodeStyle.glow[2],
      glowA: nodeStyle.glow[3],
      fillR,
      fillG,
      fillB,
      fillA,
      borderR: nodeStyle.border[0],
      borderG: nodeStyle.border[1],
      borderB: nodeStyle.border[2],
      borderA: nodeStyle.border[3],
      borderWidth: nodeStyle.width,
    };
  }

  interface WebGpuEdgeStyle {
    readonly color: [number, number, number, number];
    readonly width: number;
  }

  const GPU_EDGE_STYLES_DARK: Record<string, WebGpuEdgeStyle> = {
    selected: { color: [0.35, 0.65, 1, 1], width: 3 },
    active: { color: [0.2, 0.8, 1, 0.9], width: 2.5 },
    default: { color: [0.45, 0.52, 0.65, 0.8], width: 2.5 },
  };

  const GPU_EDGE_STYLES_LIGHT: Record<string, WebGpuEdgeStyle> = {
    selected: { color: [0.035, 0.412, 0.855, 1], width: 3 },
    active: { color: [0.1, 0.5, 0.22, 0.9], width: 2.5 },
    default: { color: [0.34, 0.38, 0.42, 0.65], width: 2.5 },
  };

  /**
   * Computes WebGPU edge instance color channels and cable stroke width.
   */
  function computeWebGpuEdgeColorAndWidth(isSelected: number, isActive: number, isDark: boolean) {
    const table = isDark ? GPU_EDGE_STYLES_DARK : GPU_EDGE_STYLES_LIGHT;
    const key = isSelected ? 'selected' : isActive ? 'active' : 'default';
    const edgeStyle = table[key];
    return {
      colorR: edgeStyle.color[0],
      colorG: edgeStyle.color[1],
      colorB: edgeStyle.color[2],
      colorA: edgeStyle.color[3],
      widthVal: edgeStyle.width,
    };
  }

  interface WebGpuPinStyle {
    readonly fill: [number, number, number, number];
    readonly border: [number, number, number, number];
    readonly borderWidth: number;
    readonly glow: [number, number, number, number];
  }

  const GPU_PIN_STYLES_DARK: Record<string, WebGpuPinStyle> = {
    hovered: { fill: [0, 0.94, 1, 1], border: [0.45, 0.52, 0.65, 0.8], borderWidth: 2.5, glow: [0, 0.94, 1, 0.8] },
    active: { fill: [0, 1, 0.53, 1], border: [0.45, 0.52, 0.65, 0.8], borderWidth: 1.5, glow: [0, 1, 0.53, 0.6] },
    default: { fill: [0.15, 0.2, 0.28, 1], border: [0.45, 0.52, 0.65, 0.8], borderWidth: 1.5, glow: [0, 0, 0, 0] },
  };

  const GPU_PIN_STYLES_LIGHT: Record<string, WebGpuPinStyle> = {
    hovered: { fill: [1, 1, 1, 1], border: [0.34, 0.38, 0.42, 0.8], borderWidth: 2.5, glow: [0, 0.41, 0.85, 0.8] },
    active: { fill: [0.1, 0.5, 0.22, 1], border: [0.34, 0.38, 0.42, 0.8], borderWidth: 1.5, glow: [0, 0.5, 0.22, 0.6] },
    default: { fill: [0.94, 0.95, 0.96, 1], border: [0.34, 0.38, 0.42, 0.8], borderWidth: 1.5, glow: [0, 0, 0, 0] },
  };

  /**
   * Computes WebGPU pin instance color and halo glow attributes.
   */
  function computeWebGpuPinColorAndWidth(isHovered: number, isActive: number, isDark: boolean) {
    const table = isDark ? GPU_PIN_STYLES_DARK : GPU_PIN_STYLES_LIGHT;
    const key = isHovered ? 'hovered' : isActive ? 'active' : 'default';
    const pinStyle = table[key];
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
   * Allocates or reuses GPU instancing buffer ensuring required byte capacity.
   */
  function ensureGpuInstanceBuffer(
    existingBuffer: GPUBuffer | undefined,
    requiredBytes: number,
    device: GPUDevice,
  ): GPUBuffer {
    if (existingBuffer && existingBuffer.size >= requiredBytes) {
      return existingBuffer;
    }
    existingBuffer?.destroy();
    return device.createBuffer({
      size: Math.max(requiredBytes, 2048),
      usage: 0x00_20 | 0x00_08,
    });
  }

  /**
   * Uploads packed float array data into WebGPU instancing buffer.
   */
  function uploadGpuInstanceData(
    device: GPUDevice | undefined,
    buffer: GPUBuffer | undefined,
    floats: number[],
    strideFloats: number,
    count?: number,
  ): GPUBuffer | undefined {
    if (!device) return buffer;
    const instanceCount = Math.max(count ?? 0, Math.floor(floats.length / strideFloats));
    const requiredBytes = Math.max(instanceCount * strideFloats * 4, 1024);
    const targetBuffer = ensureGpuInstanceBuffer(buffer, requiredBytes, device);
    if (floats.length > 0) {
      device.queue.writeBuffer(targetBuffer, 0, new Float32Array(floats));
    }
    return targetBuffer;
  }

  /**
   * Configures pipeline state and issues instanced WebGPU draw calls.
   */
  function executeGpuInstancedDraw(
    passEncoder: GPURenderPassEncoder | undefined,
    pipeline: GPURenderPipeline | undefined,
    cameraGroup: GPUBindGroup | undefined,
    instanceBuffer: GPUBuffer | undefined,
    floats: number[],
    strideFloats: number,
    vertexCount: number,
    maxCount?: number,
  ): void {
    if (!passEncoder || !pipeline || !cameraGroup || !instanceBuffer) return;
    const maxInstances = Math.floor(instanceBuffer.size / (strideFloats * 4));
    const availableInstances = Math.floor(floats.length / strideFloats);
    const clampedCount = maxCount === undefined ? availableInstances : Math.min(maxCount, availableInstances);
    const actualCount = Math.min(clampedCount, maxInstances);
    if (actualCount === 0) return;
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, cameraGroup);
    passEncoder.setVertexBuffer(0, instanceBuffer);
    passEncoder.draw(vertexCount, actualCount, 0, 0);
  }

  const GL_NODE_BORDER_DARK: Record<string, [number, number, number]> = {
    selected: [0.35, 0.65, 1],
    trapped: [0.97, 0.32, 0.29],
    active: [0.25, 0.73, 0.31],
    default: [0.22, 0.25, 0.32],
  };

  const GL_NODE_BORDER_LIGHT: Record<string, [number, number, number]> = {
    selected: [0.035, 0.412, 0.855],
    trapped: [0.81, 0.13, 0.18],
    active: [0.1, 0.5, 0.22],
    default: [0.816, 0.843, 0.871],
  };

  /**
   * Computes WebGL node border RGB color channels.
   */
  function computeGlNodeBorder(isSelected: number, isActive: number, isTrapped: number, isDark: boolean) {
    const table = isDark ? GL_NODE_BORDER_DARK : GL_NODE_BORDER_LIGHT;
    const key = isTrapped ? 'trapped' : isActive ? 'active' : isSelected ? 'selected' : 'default';
    const borderTuple = table[key];
    return { br: borderTuple[0], bg: borderTuple[1], bb: borderTuple[2] };
  }

  const GL_PIN_COLOR_DARK: Record<string, [number, number, number]> = {
    hovered: [0.47, 0.75, 1],
    active: [0.25, 0.73, 0.31],
    default: [0.55, 0.58, 0.62],
  };

  const GL_PIN_COLOR_LIGHT: Record<string, [number, number, number]> = {
    hovered: [0.035, 0.412, 0.855],
    active: [0.1, 0.5, 0.22],
    default: [0.34, 0.38, 0.42],
  };

  /**
   * Computes WebGL pin circle RGB fill color.
   */
  function computeGlPinColor(isHovered: number, isActive: number, isDark: boolean) {
    const table = isDark ? GL_PIN_COLOR_DARK : GL_PIN_COLOR_LIGHT;
    const key = isHovered ? 'hovered' : isActive ? 'active' : 'default';
    const colorTuple = table[key];
    return { pr: colorTuple[0], pg: colorTuple[1], pb: colorTuple[2] };
  }

  const C2D_NODE_STROKE_DARK: Record<string, { strokeStyle: string; lineWidth: number }> = {
    selected: { strokeStyle: '#58a6ff', lineWidth: 2 },
    trapped: { strokeStyle: '#f85149', lineWidth: 2 },
    active: { strokeStyle: '#3fb950', lineWidth: 2 },
    default: { strokeStyle: 'rgba(56, 64, 82, 0.8)', lineWidth: 1 },
  };

  const C2D_NODE_STROKE_LIGHT: Record<string, { strokeStyle: string; lineWidth: number }> = {
    selected: { strokeStyle: '#0969da', lineWidth: 2 },
    trapped: { strokeStyle: '#cf222e', lineWidth: 2 },
    active: { strokeStyle: '#1a7f37', lineWidth: 2 },
    default: { strokeStyle: '#d0d7de', lineWidth: 1 },
  };

  /**
   * Computes 2D Canvas node stroke styling properties.
   */
  function computeC2dNodeStroke(isSelected: number, isActive: number, isTrapped: number, isDark: boolean) {
    const table = isDark ? C2D_NODE_STROKE_DARK : C2D_NODE_STROKE_LIGHT;
    const key = isTrapped ? 'trapped' : isActive ? 'active' : isSelected ? 'selected' : 'default';
    return table[key];
  }

  const C2D_PIN_FILL_DARK: Record<string, string> = {
    hovered: '#79c0ff',
    active: '#3fb950',
    default: '#8b949e',
  };

  const C2D_PIN_FILL_LIGHT: Record<string, string> = {
    hovered: '#0969da',
    active: '#1a7f37',
    default: '#57606a',
  };

  /**
   * Computes 2D Canvas pin circle fill color string.
   */
  function computeC2dPinFill(isHovered: number, isActive: number, isDark: boolean): string {
    const table = isDark ? C2D_PIN_FILL_DARK : C2D_PIN_FILL_LIGHT;
    const key = isHovered ? 'hovered' : isActive ? 'active' : 'default';
    return table[key];
  }

  /**
   * Flushes WebGPU text vertex buffer and executes text draw calls.
   */
  function flushWebGpuTextBatch(): void {
    if (!currentPassEncoder || !textPipeline || !cameraBindGroup || !fontBindGroup || !gpuDevice) return;
    if (webGpuTextVertices.length === 0) return;
    const requiredBytes = webGpuTextVertices.length * 4;
    textVertexBuffer = ensureGpuInstanceBuffer(textVertexBuffer, requiredBytes, gpuDevice);
    gpuDevice.queue.writeBuffer(textVertexBuffer, 0, new Float32Array(webGpuTextVertices));
    currentPassEncoder.setPipeline(textPipeline);
    currentPassEncoder.setBindGroup(0, cameraBindGroup);
    currentPassEncoder.setBindGroup(1, fontBindGroup);
    currentPassEncoder.setVertexBuffer(0, textVertexBuffer);
    currentPassEncoder.draw(webGpuTextVertices.length / 8, 1, 0, 0);
  }

  /**
   * Configures WebGL viewport, clear color, and global uniform matrices.
   */
  function setupWebGLViewport(w: number, h: number, dprVal: number, camX: number, camY: number, zoomVal: number): void {
    if (!glCtx || !glProgram) return;
    const gl = glCtx;
    const isDark = currentTheme !== 'light';
    const canvasW = canvas ? canvas.width : Math.round(w * dprVal);
    const canvasH = canvas ? canvas.height : Math.round(h * dprVal);
    gl.viewport(0, 0, canvasW, canvasH);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const clearR = isDark ? 0.043 : 0.961;
    const clearG = isDark ? 0.071 : 0.965;
    const clearB = isDark ? 0.098 : 0.973;
    gl.clearColor(clearR, clearG, clearB, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(glProgram);
    if (glUniformLocations) {
      gl.uniform2f(glUniformLocations.u_resolution, w, h);
      gl.uniform2f(glUniformLocations.u_camera, camX, camY);
      gl.uniform1f(glUniformLocations.u_zoom, zoomVal);
    }
    triVertices = [];
    lineVertices = [];
  }

  /**
   * Appends minor WebGL grid line vertices to the line buffer.
   */
  function pushWebGlMinorGridLines(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    color: readonly number[],
  ): void {
    for (let x = Math.floor(minX / 24) * 24; x <= Math.ceil(maxX / 24) * 24; x += 24) {
      if (x % 120 !== 0) {
        lineVertices.push(
          x,
          minY,
          color[0],
          color[1],
          color[2],
          color[3],
          x,
          maxY,
          color[0],
          color[1],
          color[2],
          color[3],
        );
      }
    }
    for (let y = Math.floor(minY / 24) * 24; y <= Math.ceil(maxY / 24) * 24; y += 24) {
      if (y % 120 !== 0) {
        lineVertices.push(
          minX,
          y,
          color[0],
          color[1],
          color[2],
          color[3],
          maxX,
          y,
          color[0],
          color[1],
          color[2],
          color[3],
        );
      }
    }
  }

  /**
   * Appends major WebGL grid line vertices to the line buffer.
   */
  function pushWebGlMajorGridLines(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    color: readonly number[],
  ): void {
    for (let x = Math.floor(minX / 120) * 120; x <= Math.ceil(maxX / 120) * 120; x += 120) {
      lineVertices.push(
        x,
        minY,
        color[0],
        color[1],
        color[2],
        color[3],
        x,
        maxY,
        color[0],
        color[1],
        color[2],
        color[3],
      );
    }
    for (let y = Math.floor(minY / 120) * 120; y <= Math.ceil(maxY / 120) * 120; y += 120) {
      lineVertices.push(
        minX,
        y,
        color[0],
        color[1],
        color[2],
        color[3],
        maxX,
        y,
        color[0],
        color[1],
        color[2],
        color[3],
      );
    }
  }

  /**
   * Generates line segments for WebGL background coordinate grid.
   */
  function buildWebGLGridLines(minX: number, minY: number, maxX: number, maxY: number, zoomVal: number): void {
    const isDark = currentTheme !== 'light';
    const minorColor = isDark ? [0.22, 0.25, 0.32, 0.18] : [0.55, 0.61, 0.69, 0.25];
    const majorColor = isDark ? [0.35, 0.4, 0.5, 0.35] : [0.39, 0.47, 0.57, 0.45];

    if (zoomVal > 0.4) {
      pushWebGlMinorGridLines(minX, minY, maxX, maxY, minorColor);
    }
    pushWebGlMajorGridLines(minX, minY, maxX, maxY, majorColor);
  }

  /**
   * Flushes batched triangles to WebGL framebuffer.
   */
  function flushWebGLTriangles(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    if (triVertices.length === 0 || !glVertexBuffer || !glAttribLocations) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, glVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triVertices), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(glAttribLocations.a_position);
    gl.vertexAttribPointer(glAttribLocations.a_position, 2, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(glAttribLocations.a_color);
    gl.vertexAttribPointer(glAttribLocations.a_color, 4, gl.FLOAT, false, 24, 8);
    gl.drawArrays(gl.TRIANGLES, 0, triVertices.length / 6);
  }

  /**
   * Flushes batched line primitives to WebGL framebuffer.
   */
  function flushWebGLLines(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    if (lineVertices.length === 0 || !glVertexBuffer || !glAttribLocations) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, glVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineVertices), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(glAttribLocations.a_position);
    gl.vertexAttribPointer(glAttribLocations.a_position, 2, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(glAttribLocations.a_color);
    gl.vertexAttribPointer(glAttribLocations.a_color, 4, gl.FLOAT, false, 24, 8);
    gl.drawArrays(gl.LINES, 0, lineVertices.length / 6);
  }

  /**
   * Flushes batched triangles and line primitives to WebGL framebuffer.
   */
  function flushWebGLPrimitives(): void {
    if (!glCtx) return;
    flushWebGLTriangles(glCtx);
    flushWebGLLines(glCtx);
    triVertices = [];
    lineVertices = [];
  }

  /**
   * Draws minor grid lines on Canvas2D.
   */
  function drawCanvas2dMinorGridLines(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
  ): void {
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
  }

  /**
   * Draws major grid lines on Canvas2D.
   */
  function drawCanvas2dMajorGridLines(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
  ): void {
    for (let x = Math.floor(minX / 120) * 120; x <= Math.ceil(maxX / 120) * 120; x += 120) {
      ctx.moveTo(x, minY);
      ctx.lineTo(x, maxY);
    }
    for (let y = Math.floor(minY / 120) * 120; y <= Math.ceil(maxY / 120) * 120; y += 120) {
      ctx.moveTo(minX, y);
      ctx.lineTo(maxX, y);
    }
  }

  /**
   * Renders background coordinate grid in Canvas2D context.
   */
  function drawCanvas2dGridLines(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    zoomVal: number,
  ): void {
    const isDark = currentTheme !== 'light';
    ctx.lineWidth = 1 / zoomVal;
    if (zoomVal > 0.4) {
      ctx.strokeStyle = isDark ? 'rgba(56, 64, 82, 0.25)' : 'rgba(140, 155, 175, 0.25)';
      ctx.beginPath();
      drawCanvas2dMinorGridLines(ctx, minX, minY, maxX, maxY);
      ctx.stroke();
    }

    ctx.strokeStyle = isDark ? 'rgba(89, 102, 128, 0.35)' : 'rgba(100, 120, 145, 0.45)';
    ctx.beginPath();
    drawCanvas2dMajorGridLines(ctx, minX, minY, maxX, maxY);
    ctx.stroke();
  }

  /**
   * Evaluates cubic Bezier point for coordinate axis and step factor.
   */
  function evaluateCubicBezier(p0: number, p1: number, p2: number, p3: number, progressRatio: number): number {
    const inverseRatio = 1 - progressRatio;
    return (
      inverseRatio * inverseRatio * inverseRatio * p0 +
      3 * inverseRatio * inverseRatio * progressRatio * p1 +
      3 * inverseRatio * progressRatio * progressRatio * p2 +
      progressRatio * progressRatio * progressRatio * p3
    );
  }

  /**
   * Renders animated pulse particle traveling along an active edge.
   */
  function drawCanvas2dPulseDot(
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
   * Packs camera view projection matrix and viewport uniforms into a Float32Array.
   */
  function packCameraUniforms(w: NonNullable<typeof wasm>, theme: string): Float32Array {
    const uniforms = new Float32Array(24);
    w.createViewProjectionMatrix(256);
    const f64Array = new Float64Array(w.memory.buffer, 256, 16);
    uniforms.set(f64Array);
    uniforms[16] = w.get_camera_viewport_width();
    uniforms[17] = w.get_camera_viewport_height();
    uniforms[18] = w.get_camera_x();
    uniforms[19] = w.get_camera_y();
    uniforms[20] = w.get_camera_zoom();
    uniforms[21] = 1;
    uniforms[22] = theme === 'light' ? 0 : 1;
    return uniforms;
  }

  function getGlEdgeColor(isSelected: number, isDark: boolean): [number, number, number, number] {
    if (isSelected) {
      return isDark ? [0.35, 0.65, 1, 1] : [0.035, 0.412, 0.855, 1];
    }
    return isDark ? [0.47, 0.66, 1, 0.7] : [0.34, 0.38, 0.42, 0.65];
  }

  function pushWebGLBezierEdgeSegments(
    p0x: number,
    p0y: number,
    p1x: number,
    p1y: number,
    p2x: number,
    p2y: number,
    p3x: number,
    p3y: number,
    color: readonly number[],
  ): void {
    let prevX = p0x;
    let prevY = p0y;
    for (let step = 1; step <= 20; step++) {
      const stepFactor = step / 20;
      const currX = evaluateCubicBezier(p0x, p1x, p2x, p3x, stepFactor);
      const currY = evaluateCubicBezier(p0y, p1y, p2y, p3y, stepFactor);
      lineVertices.push(
        prevX,
        prevY,
        color[0],
        color[1],
        color[2],
        color[3],
        currX,
        currY,
        color[0],
        color[1],
        color[2],
        color[3],
      );
      prevX = currX;
      prevY = currY;
    }
  }

  function getC2dEdgeColor(isSelected: number, isDark: boolean): string {
    if (isSelected) {
      return isDark ? '#58a6ff' : '#0969da';
    }
    return isDark ? 'rgba(139, 148, 158, 0.6)' : 'rgba(87, 96, 106, 0.6)';
  }

  const capabilities: WebAssembly.Imports = {
    'webgpu.upload_camera_buffer': {
      gpu_upload_camera_buffer: () => {
        if (!gpuContext || !cameraBuffer || !wasm || !gpuDevice) return;
        prepareWebGpuInstances();
        gpuDevice.queue.writeBuffer(cameraBuffer, 0, packCameraUniforms(wasm, currentTheme));
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
        const style = computeWebGpuNodeGlowAndBorder(isSelected, isActive, isTrapped, isDark);

        nodeInstanceFloats.push(
          posX,
          posY,
          w,
          h,
          radius,
          style.fillR,
          style.fillG,
          style.fillB,
          style.fillA,
          style.borderR,
          style.borderG,
          style.borderB,
          style.borderA,
          style.borderWidth,
          style.glowR,
          style.glowG,
          style.glowB,
          style.glowA,
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
        const style = computeWebGpuEdgeColorAndWidth(isSelected, isActive, isDark);

        edgeInstanceFloats.push(
          p0x,
          p0y,
          p1x,
          p1y,
          p2x,
          p2y,
          p3x,
          p3y,
          style.colorR,
          style.colorG,
          style.colorB,
          style.colorA,
          style.widthVal,
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
        const style = computeWebGpuPinColorAndWidth(isHovered, isActive, isDark);

        pinInstanceFloats.push(
          posX,
          posY,
          radius * 2,
          radius * 2,
          radius,
          style.fillR,
          style.fillG,
          style.fillB,
          style.fillA,
          style.borderR,
          style.borderG,
          style.borderB,
          style.borderA,
          style.borderWidth,
          style.glowR,
          style.glowG,
          style.glowB,
          style.glowA,
        );
      },
    },
    'webgpu.upload_node_buffer': {
      gpu_upload_node_buffer: (count?: number) => {
        nodeInstanceBuffer = uploadGpuInstanceData(gpuDevice, nodeInstanceBuffer, nodeInstanceFloats, 18, count);
      },
    },
    'webgpu.upload_edge_buffer': {
      gpu_upload_edge_buffer: (count?: number) => {
        edgeInstanceBuffer = uploadGpuInstanceData(gpuDevice, edgeInstanceBuffer, edgeInstanceFloats, 15, count);
      },
    },
    'webgpu.upload_pin_buffer': {
      gpu_upload_pin_buffer: (count?: number) => {
        pinInstanceBuffer = uploadGpuInstanceData(gpuDevice, pinInstanceBuffer, pinInstanceFloats, 18, count);
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
        executeGpuInstancedDraw(
          currentPassEncoder,
          edgesPipeline,
          cameraBindGroup,
          edgeInstanceBuffer,
          edgeInstanceFloats,
          15,
          66,
          count,
        );
      },
    },
    'webgpu.render_nodes': {
      gpu_render_nodes: (_count: number) => {
        executeGpuInstancedDraw(
          currentPassEncoder,
          nodesPipeline,
          cameraBindGroup,
          nodeInstanceBuffer,
          nodeInstanceFloats,
          18,
          6,
        );
      },
    },
    'webgpu.render_pins': {
      gpu_render_pins: (_count: number) => {
        executeGpuInstancedDraw(
          currentPassEncoder,
          nodesPipeline,
          cameraBindGroup,
          pinInstanceBuffer,
          pinInstanceFloats,
          18,
          6,
        );
      },
    },
    'webgpu.render_end': {
      gpu_render_end: () => {
        if (!currentPassEncoder || !currentCommandEncoder || !gpuContext) return;
        flushWebGpuTextBatch();
        currentPassEncoder.end();
        gpuDevice?.queue.submit([currentCommandEncoder.finish()]);
        currentPassEncoder = undefined;
        currentCommandEncoder = undefined;
      },
    },
    'webgl.render_begin': {
      gl_render_begin: (w: number, h: number, dprVal: number, camX: number, camY: number, zoomVal: number) => {
        setupWebGLViewport(w, h, dprVal, camX, camY, zoomVal);
      },
    },
    'webgl.render_grid': {
      gl_render_grid: (minX: number, minY: number, maxX: number, maxY: number, zoomVal: number) => {
        buildWebGLGridLines(minX, minY, maxX, maxY, zoomVal);
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
        const color = getGlEdgeColor(isSelected, isDark);
        pushWebGLBezierEdgeSegments(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, color);
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
        const { br, bg, bb } = computeGlNodeBorder(isSelected, isActive, isTrapped, isDark);
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
        const { pr, pg, pb } = computeGlPinColor(isHovered, isActive, isDark);
        pushRect(px - radius, py - radius, radius * 2, radius * 2, pr, pg, pb, 1);
      },
    },
    'webgl.render_end': {
      gl_render_end: () => {
        flushWebGLPrimitives();
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
        drawCanvas2dGridLines(canvas2dCtx, minX, minY, maxX, maxY, zoomVal);
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
        ctx.strokeStyle = getC2dEdgeColor(isSelected, isDark);
        ctx.beginPath();
        ctx.moveTo(p0x, p0y);
        ctx.bezierCurveTo(p1x, p1y, p2x, p2y, p3x, p3y);
        ctx.stroke();

        if (isActive) {
          drawCanvas2dPulseDot(ctx, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, pulseOffsetPermille, isDark);
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
        const stroke = computeC2dNodeStroke(isSelected, isActive, isTrapped, isDark);
        ctx.strokeStyle = stroke.strokeStyle;
        ctx.lineWidth = stroke.lineWidth;
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
        ctx.fillStyle = computeC2dPinFill(isHovered, isActive, isDark);
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
  function dispatchGlobalWorkerReply(globalObj: typeof globalThis.self, message: RenderWorkerOutputMessage): void {
    if (typeof globalObj.postMessage === 'function') {
      try {
        globalObj.postMessage(message);
      } catch {
        // Ignore JSDOM postMessage error
      }
    }
    if (typeof globalObj.dispatchEvent === 'function' && typeof MessageEvent !== 'undefined') {
      try {
        globalObj.dispatchEvent(new MessageEvent('message', { data: message }));
      } catch {
        // Ignore dispatch errors in non-browser environments
      }
    }
  }

  /**
   * Dispatches a response message from the render worker back to the main thread or window.
   *
   * @param reply - Output response message payload.
   */
  const postReply = (reply: RenderWorkerOutputMessage): void => {
    const messageWithId: RenderWorkerOutputMessage = { id: 'flint_render_worker', ...reply };
    if (!globalThis.self) return;
    dispatchGlobalWorkerReply(globalThis.self, messageWithId);
  };

  /**
   * Selects and initializes the most suitable GPU/canvas rendering backend.
   */
  async function selectAndInitBackend(
    targetCanvas: OffscreenCanvas | HTMLCanvasElement,
    preferred?: 'webgpu' | 'webgl' | 'canvas2d',
  ): Promise<{ tier: number; backend: 'webgpu' | 'webgl' | 'canvas2d'; ok: boolean }> {
    if (preferred !== 'webgl' && preferred !== 'canvas2d') {
      const okGpu = await initWebGpuBackend(targetCanvas);
      if (okGpu) return { tier: 1, backend: 'webgpu', ok: true };
    }
    if (preferred !== 'canvas2d') {
      const okGl = initWebGLBackend(targetCanvas);
      if (okGl) return { tier: 2, backend: 'webgl', ok: true };
    }
    const ok2d = init2dBackend(targetCanvas);
    return { tier: 3, backend: 'canvas2d', ok: ok2d };
  }

  /**
   * Initializes the render worker backend pipelines and initial canvas buffer dimensions.
   */
  async function handleWorkerInit(msg: Extract<RenderWorkerInputMessage, { type: 'init' }>): Promise<void> {
    if (!wasm) return;
    canvas = msg.canvas;
    width = msg.width ?? 800;
    height = msg.height ?? 600;
    dpr = msg.dpr ?? 1;
    if (msg.theme !== undefined) {
      currentTheme = msg.theme;
    }

    if (canvas) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }

    wasm.engine_create(width, height, dpr);
    wasm.engine_set_theme(currentTheme === 'light' ? 1 : 0);

    let selectedTier = 3;
    if (canvas) {
      const result = await selectAndInitBackend(canvas, msg.renderer);
      selectedTier = result.tier;
      activeBackend = result.backend;
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
  }

  /**
   * Inserts single node into spatial acceleration structure.
   */
  function insertNodeIntoSpatialIndex(index: number, node: FlintGraphNode): void {
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
   * Sets the active graph elements and populates the spatial index.
   */
  function handleWorkerSetGraph(msg: Extract<RenderWorkerInputMessage, { type: 'set_graph' }>): void {
    if (!wasm) return;
    nodes = msg.nodes ?? [];
    edges = msg.edges ?? [];
    groups = msg.groups ?? [];

    wasm.spatial_clear();
    for (const [i, node] of nodes.entries()) {
      if (node) {
        insertNodeIntoSpatialIndex(i, node);
      }
    }
    wasm.engine_render_frame(nodes.length, edges.length, nodes.length * 4);
    postReply({
      type: 'frame',
      performance: performanceStats,
      visibleNodes: nodes.length,
      visibleEdges: edges.length,
    } as RenderWorkerOutputMessage);
  }

  /**
   * Pans the camera by the given pixel delta.
   */
  function handleWorkerPan(msg: Extract<RenderWorkerInputMessage, { type: 'pan' }>): void {
    if (!wasm || msg.deltaX === undefined || msg.deltaY === undefined) return;
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

  /**
   * Zooms the camera by the given factor centered at cursor coordinates.
   */
  function handleWorkerZoom(msg: Extract<RenderWorkerInputMessage, { type: 'zoom' }>): void {
    if (!wasm || msg.factor === undefined) return;
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

  /**
   * Resizes viewport and buffer dimensions.
   */
  function handleWorkerResize(msg: Extract<RenderWorkerInputMessage, { type: 'resize' }>): void {
    if (!wasm || msg.width === undefined || msg.height === undefined) return;
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

  /**
   * Sets node/edge selection sets.
   */
  function handleWorkerSetSelection(msg: Extract<RenderWorkerInputMessage, { type: 'set_selection' }>): void {
    if (!wasm) return;
    selectedNodeIds.clear();
    for (const id of msg.selectedNodeIds ?? []) selectedNodeIds.add(id);
    selectedEdgeIds.clear();
    for (const id of msg.selectedEdgeIds ?? []) selectedEdgeIds.add(id);
    selectedGroupId = msg.selectedGroupId;
  }

  /**
   * Updates execution trace state and edge pulse animations.
   */
  function handleWorkerSetTraceState(msg: Extract<RenderWorkerInputMessage, { type: 'set_trace_state' }>): void {
    if (!wasm) return;
    activeNodeIds.clear();
    for (const id of msg.activeNodeIds ?? []) activeNodeIds.add(id);
    trappedNodeId = msg.trappedNodeId;
    edgePulses.clear();
    for (const pulse of msg.edgePulses ?? []) edgePulses.set(pulse.edgeId, pulse.offset);
  }

  /**
   * Tests whether an edge connection is intersected by cursor point.
   */
  function isEdgeHitByCursor(
    edge: FlintGraphEdge,
    nodeMap: Map<string, FlintGraphNode>,
    cursorX: number,
    cursorY: number,
    snapRadius: number,
    wasmEngine: NonNullable<typeof wasm>,
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
  function hitTestEdges(
    cursorX: number,
    cursorY: number,
    snapRadius: number,
    nodeList: readonly FlintGraphNode[],
    edgeList: readonly FlintGraphEdge[],
  ): FlintHitResult | undefined {
    if (!wasm) return undefined;
    const nodeMap = new Map<string, FlintGraphNode>(nodeList.map((n) => [n.id, n]));
    for (const edge of edgeList) {
      if (isEdgeHitByCursor(edge, nodeMap, cursorX, cursorY, snapRadius, wasm)) {
        return {
          type: 'edge',
          nodeId: edge.fromNodeId,
          edgeId: edge.id,
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
  function handleWorkerHitTest(msg: Extract<RenderWorkerInputMessage, { type: 'hit_test' }>): void {
    if (!wasm || msg.cursorX === undefined || msg.cursorY === undefined) return;
    const px = Math.round(msg.cursorX) + COORD_OFFSET;
    const py = Math.round(msg.cursorY) + COORD_OFFSET;
    const hit = wasm.spatial_hit_test_point(px, py);
    const hitNode = hit > 0 ? nodes[hit - 1] : undefined;
    const hitResult = hitNode
      ? {
          type: 'node' as const,
          nodeId: hitNode.id,
          worldX: msg.cursorX,
          worldY: msg.cursorY,
        }
      : hitTestEdges(msg.cursorX, msg.cursorY, msg.snapRadius ?? 15, nodes, edges);
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
   * Cleans up WebGL buffers, textures, and shader programs.
   */
  function cleanupGlResources(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    const buffers = [glVertexBuffer, glTexVertexBuffer];
    for (const buf of buffers) {
      if (buf) gl.deleteBuffer(buf);
    }
    if (glFontTexture) gl.deleteTexture(glFontTexture);
    const programs = [glProgram, glTextProgram];
    for (const prog of programs) {
      if (prog) gl.deleteProgram(prog);
    }
  }

  /**
   * Cleans up all GPU, WebGL, and canvas resources.
   */
  function handleWorkerDestroy(): void {
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
    if (glCtx) cleanupGlResources(glCtx);
    glVertexBuffer = undefined;
    glTexVertexBuffer = undefined;
    glFontTexture = undefined;
    glProgram = undefined;
    glTextProgram = undefined;
    glCtx = undefined;
    canvas2dCtx = undefined;
    canvas = undefined;
  }

  /**
   * Processes secondary interactive manipulation worker messages.
   */
  function handleWorkerOtherMessage(msg: RenderWorkerInputMessage): void {
    if (!wasm) return;
    switch (msg.type) {
      case 'set_theme': {
        if (msg.theme !== undefined) {
          currentTheme = msg.theme;
          wasm.engine_set_theme(currentTheme === 'light' ? 1 : 0);
        }
        break;
      }
      case 'pan': {
        handleWorkerPan(msg);
        return;
      }
      case 'zoom': {
        handleWorkerZoom(msg);
        return;
      }
      case 'resize': {
        handleWorkerResize(msg);
        break;
      }
      case 'set_selection': {
        handleWorkerSetSelection(msg);
        break;
      }
      case 'set_connecting_edge': {
        connectingEdge = msg.edge;
        break;
      }
      case 'set_hovered_port': {
        hoveredPort = msg.hoveredPort;
        break;
      }
      case 'set_pulse': {
        if (msg.edgeId !== undefined) {
          edgePulses.set(msg.edgeId, msg.progress);
        }
        break;
      }
      case 'set_trace_state': {
        handleWorkerSetTraceState(msg);
        break;
      }
      default: {
        break;
      }
    }

    wasm.engine_render_frame(nodes.length, edges.length, nodes.length * 4);
    postReply({
      type: 'frame',
      performance: performanceStats,
      visibleNodes: nodes.length,
      visibleEdges: edges.length,
    } as RenderWorkerOutputMessage);
  }

  /**
   * Checks whether incoming message event should be discarded.
   */
  function isWorkerMessageIgnored(eventData: unknown): boolean {
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
  async function dispatchWorkerInputMessage(msg: RenderWorkerInputMessage): Promise<void> {
    if (msg.type === 'init') {
      await handleWorkerInit(msg);
      return;
    }
    if (msg.type === 'set_graph') {
      handleWorkerSetGraph(msg);
      return;
    }
    if (msg.type === 'hit_test') {
      handleWorkerHitTest(msg);
      return;
    }
    if (msg.type === 'destroy') {
      handleWorkerDestroy();
      return;
    }
    handleWorkerOtherMessage(msg);
  }

  globalThis.self.addEventListener('message', async (event: MessageEvent<RenderWorkerInputMessage>) => {
    const msg = event.data;
    if (isWorkerMessageIgnored(msg)) return;
    if (!wasm) wasm = getFlintRenderWorkerWasm(capabilities);

    try {
      await dispatchWorkerInputMessage(msg);
    } catch (error) {
      postReply({
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      } as RenderWorkerOutputMessage);
    }
  });
}
