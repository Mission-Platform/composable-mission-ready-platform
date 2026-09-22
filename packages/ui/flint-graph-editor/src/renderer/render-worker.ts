import { loadSync } from './render-worker.flint';
import { EDGES_WGSL, GRID_WGSL, NODES_WGSL } from './shaders';

import type { FlintGraphEdge, FlintGraphGroup, FlintGraphNode, FlintTypeName } from '@mission-platform/flint';

export interface FlintRenderWorkerWasmExports {
  readonly abs_i32: (val: number) => number;
  readonly clamp_i32: (val: number, min_val: number, max_val: number) => number;
  readonly compute_center: (min_val: number, max_val: number) => number;
  readonly camera_pan_x: (cam_x: number, delta_x: number, zoom_percent: number) => number;
  readonly camera_pan_y: (cam_y: number, delta_y: number, zoom_percent: number) => number;
  readonly camera_zoom_percent: (
    current_zoom_percent: number,
    factor_permille: number,
    min_percent: number,
    max_percent: number,
  ) => number;
  readonly camera_zoom_anchor_x: (
    cam_x: number,
    cursor_x: number,
    viewport_w: number,
    old_zoom_percent: number,
    new_zoom_percent: number,
  ) => number;
  readonly camera_zoom_anchor_y: (
    cam_y: number,
    cursor_y: number,
    viewport_h: number,
    old_zoom_percent: number,
    new_zoom_percent: number,
  ) => number;
  readonly viewport_bounds_min_x: (cam_x: number, viewport_w: number, zoom_percent: number, padding: number) => number;
  readonly viewport_bounds_max_x: (cam_x: number, viewport_w: number, zoom_percent: number, padding: number) => number;
  readonly viewport_bounds_min_y: (cam_y: number, viewport_h: number, zoom_percent: number, padding: number) => number;
  readonly viewport_bounds_max_y: (cam_y: number, viewport_h: number, zoom_percent: number, padding: number) => number;
  readonly screen_to_world_x: (screen_x: number, camera_x: number, viewport_w: number, zoom_percent: number) => number;
  readonly screen_to_world_y: (screen_y: number, camera_y: number, viewport_h: number, zoom_percent: number) => number;
  readonly world_to_screen_x: (world_x: number, camera_x: number, viewport_w: number, zoom_percent: number) => number;
  readonly world_to_screen_y: (world_y: number, camera_y: number, viewport_h: number, zoom_percent: number) => number;
  readonly screen_to_world_f32: (
    screen_coord: number,
    camera_coord: number,
    center_coord: number,
    zoom: number,
  ) => number;
  readonly world_to_screen_f32: (
    world_coord: number,
    camera_coord: number,
    center_coord: number,
    zoom: number,
  ) => number;
  readonly node_bounds_height: (header_h: number, max_ports: number, row_h: number, pad: number) => number;
  readonly node_bounds_max_y: (
    node_y: number,
    header_h: number,
    max_ports: number,
    row_h: number,
    pad: number,
  ) => number;
  readonly port_y_position: (
    node_y: number,
    header_h: number,
    row_index: number,
    row_h: number,
    port_offset: number,
  ) => number;
  readonly point_in_rect: (px: number, py: number, rx: number, ry: number, rw: number, rh: number) => number;
  readonly point_in_circle: (px: number, py: number, cx: number, cy: number, radius: number) => number;
  readonly rect_intersects_box: (
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    min_x: number,
    min_y: number,
    max_x: number,
    max_y: number,
  ) => number;
  readonly bezier_point_1d: (p0: number, p1: number, p2: number, p3: number, t_permille: number) => number;
  readonly bezier_control_dx: (p0x: number, p3x: number) => number;
  readonly spatial_init: () => number;
  readonly spatial_clear: () => void;
  readonly spatial_insert_node: (node_idx: number, min_x: number, min_y: number, max_x: number, max_y: number) => void;
  readonly spatial_insert_port: (node_idx: number, port_idx: number, dir: number, x: number, y: number) => void;
  readonly spatial_query_box: (min_x: number, min_y: number, max_x: number, max_y: number) => number;
  readonly spatial_get_query_result: (index: number) => number;
  readonly spatial_hit_test_point: (px: number, py: number) => number;
  readonly spatial_hit_test_port: (px: number, py: number, snap_radius: number) => number;
  readonly compute_node_instance: (
    min_x: number,
    min_y: number,
    max_x: number,
    max_y: number,
    is_selected: number,
    is_active: number,
    is_trapped: number,
  ) => void;
  readonly compute_edge_instance: (
    p0x: number,
    p0y: number,
    p3x: number,
    p3y: number,
    is_selected: number,
    is_active: number,
    pulse_offset_permille: number,
  ) => void;
  readonly compute_pin_instance: (
    px: number,
    py: number,
    is_hovered: number,
    is_active: number,
    is_output: number,
  ) => void;
  readonly edge_hit_test: (
    cursor_x: number,
    cursor_y: number,
    p0x: number,
    p0y: number,
    p3x: number,
    p3y: number,
    threshold: number,
  ) => number | boolean;
  readonly backend_select_tier: (has_webgpu: boolean, has_webgl: boolean, has_canvas2d: boolean) => number;
  readonly backend_fallback_next: (current_tier: number, has_webgl: boolean, has_canvas2d: boolean) => number;
  readonly camera_zoom_f32?: (current_zoom: number, factor: number, min_zoom: number, max_zoom: number) => number;
  readonly renderer_execute_frame: (visible_nodes: number, visible_edges: number, visible_pins: number) => void;
  readonly renderer_render_webgpu_frame: (visible_nodes: number, visible_edges: number, visible_pins: number) => void;

  readonly createCamera: (viewport_w: number, viewport_h: number, x: number, y: number, zoom: number) => void;
  readonly get_camera_x: () => number;
  readonly get_camera_y: () => number;
  readonly get_camera_zoom: () => number;
  readonly get_camera_viewport_width: () => number;
  readonly get_camera_viewport_height: () => number;

  readonly screenToWorld: (screen_x: number, screen_y: number) => void;
  readonly get_point_x: () => number;
  readonly get_point_y: () => number;

  readonly worldToScreen: (world_x: number, world_y: number) => void;

  readonly getViewportBounds: (padding: number) => void;
  readonly get_bounds_min_x: () => number;
  readonly get_bounds_min_y: () => number;
  readonly get_bounds_max_x: () => number;
  readonly get_bounds_max_y: () => number;

  readonly panCamera: (delta_x: number, delta_y: number) => void;
  readonly zoomCamera: (cursor_x: number, cursor_y: number, factor: number) => void;
  readonly createViewProjectionMatrix: (matrix_ptr: number) => void;

  readonly getNodeBounds: (node_x: number, node_y: number, max_ports: number) => void;
  readonly get_node_bounds_min_x: () => number;
  readonly get_node_bounds_min_y: () => number;
  readonly get_node_bounds_max_x: () => number;
  readonly get_node_bounds_max_y: () => number;

  readonly getCategoryRgb: (category_id: number) => number;
  readonly getPortTypeRgb: (type_id: number) => number;

  readonly engine_create: (viewport_w: number, viewport_h: number, dpr: number) => void;
  readonly engine_resize: (viewport_w: number, viewport_h: number, dpr: number) => void;
  readonly engine_pan: (delta_x: number, delta_y: number) => void;
  readonly engine_zoom: (cursor_x: number, cursor_y: number, factor: number) => void;
  readonly engine_set_backend: (tier: number) => void;
  readonly engine_get_backend: () => number;
  readonly engine_render_frame: (visible_nodes: number, visible_edges: number, visible_pins: number) => void;

  readonly memory: WebAssembly.Memory;
}

export interface FlintCamera {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
}

export interface WorldPoint {
  readonly x: number;
  readonly y: number;
}

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

export interface ViewBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface FlintHitResult {
  readonly type: 'node' | 'port' | 'edge' | 'none';
  readonly nodeId: string;
  readonly portId?: string;
  readonly edgeId?: string;
  readonly worldX: number;
  readonly worldY: number;
}

export interface PortSpatialItem {
  readonly nodeId: string;
  readonly portId: string;
  readonly direction: 'input' | 'output';
  readonly position: { readonly x: number; readonly y: number };
}

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;
export const DEFAULT_ZOOM = 1;

export const NODE_WIDTH = 220;
export const NODE_HEADER_HEIGHT = 38;
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
  createBindGroup(descriptor: { layout: GPUBindGroupLayout; entries: readonly unknown[] }): GPUBindGroup;
  createCommandEncoder(): GPUCommandEncoder;
  destroy(): void;
}

export interface GPUQueue {
  writeBuffer(buffer: GPUBuffer, bufferOffset: number, data: BufferSource | ArrayBufferView | Float32Array): void;
  submit(commandBuffers: readonly GPUCommandBuffer[]): void;
}

export interface GPUBuffer {
  readonly size: number;
  destroy(): void;
}

export interface GPUShaderModule {}
export interface GPUBindGroupLayout {}
export interface GPUPipelineLayout {}
export interface GPURenderPipeline {}
export interface GPUBindGroup {}
export interface GPUCommandBuffer {}
export interface GPUTexture {
  createView(): GPUTextureView;
}
export interface GPUTextureView {}

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

export interface FlintWebGpuContext {
  readonly supported: boolean;
  readonly device: GPUDevice;
  readonly queue: GPUQueue;
  readonly context: GPUCanvasContext;
  readonly format: string;
}

let cachedFlintWasm: FlintRenderWorkerWasmExports | undefined;

export function getFlintRenderWorkerWasm(imports?: WebAssembly.Imports): FlintRenderWorkerWasmExports {
  const defaultCapabilities: WebAssembly.Imports = {
    'webgpu.upload_camera_buffer': { gpu_upload_camera_buffer: () => {} },
    'webgpu.upload_node_buffer': { gpu_upload_node_buffer: () => {} },
    'webgpu.upload_edge_buffer': { gpu_upload_edge_buffer: () => {} },
    'webgpu.upload_pin_buffer': { gpu_upload_pin_buffer: () => {} },
    'webgpu.render_begin': { gpu_render_begin: () => {} },
    'webgpu.render_grid': { gpu_render_grid: () => {} },
    'webgpu.render_edges': { gpu_render_edges: () => {} },
    'webgpu.render_nodes': { gpu_render_nodes: () => {} },
    'webgpu.render_pins': { gpu_render_pins: () => {} },
    'webgpu.render_end': { gpu_render_end: () => {} },
    'webgpu.write_node_instance': { gpu_write_node_instance: () => {} },
    'webgpu.write_edge_instance': { gpu_write_edge_instance: () => {} },
    'webgpu.write_pin_instance': { gpu_write_pin_instance: () => {} },
    'webgl.render_frame': { webgl_render_frame: () => {} },
    'canvas2d.render_frame': { canvas2d_render_frame: () => {} },
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

export async function isWebGpuSupported(): Promise<boolean> {
  const nav = typeof navigator === 'undefined' ? undefined : (navigator as unknown as WebGpuNavigator);
  if (!nav?.gpu) return false;
  try {
    const adapter = await nav.gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

export async function createWebGpuContext(canvas: OffscreenCanvas | HTMLCanvasElement): Promise<FlintWebGpuContext> {
  const nav = typeof navigator === 'undefined' ? undefined : (navigator as unknown as WebGpuNavigator);
  if (!nav?.gpu) {
    throw new Error('WebGPU is not supported in this browser or worker environment.');
  }

  const adapter = await nav.gpu.requestAdapter({
    powerPreference: 'high-performance',
  });

  if (!adapter) {
    throw new Error('No suitable WebGPU adapter found on this system.');
  }

  const device = await adapter.requestDevice();
  const canvasObj = canvas as unknown as {
    getContext(id: string): GPUCanvasContext | null;
  };
  const context = canvasObj.getContext('webgpu');
  if (!context) {
    throw new Error('Failed to acquire webgpu canvas context.');
  }

  const format = nav.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format,
    alphaMode: 'premultiplied',
  });

  return {
    supported: true,
    device,
    queue: device.queue,
    context,
    format,
  };
}

export interface WebGPUCapabilityStatus {
  readonly supported: boolean;
  readonly message?: string;
  readonly adapterInfo?: {
    readonly vendor?: string;
    readonly architecture?: string;
    readonly device?: string;
    readonly description?: string;
  };
}

export async function getWebGPUCapability(): Promise<WebGPUCapabilityStatus> {
  const nav = typeof navigator === 'undefined' ? undefined : (navigator as unknown as WebGpuNavigator);
  if (!nav?.gpu) {
    return {
      supported: false,
      message: 'WebGPU is not supported by your current browser. Utilizing 2D canvas fallback.',
    };
  }

  try {
    const adapter = await nav.gpu.requestAdapter();
    if (!adapter) {
      return {
        supported: false,
        message: 'No compatible WebGPU hardware adapter found. Utilizing 2D canvas fallback.',
      };
    }
    return {
      supported: true,
      adapterInfo: adapter.info,
    };
  } catch (error) {
    return {
      supported: false,
      message: error instanceof Error ? error.message : 'WebGPU initialization failed.',
    };
  }
}

export function createCamera(
  viewportWidth = 800,
  viewportHeight = 600,
  x = 0,
  y = 0,
  zoom: number = DEFAULT_ZOOM,
): FlintCamera {
  const wasm = getFlintRenderWorkerWasm();
  wasm.createCamera(viewportWidth, viewportHeight, x, y, zoom);
  return {
    x: wasm.get_camera_x(),
    y: wasm.get_camera_y(),
    zoom: wasm.get_camera_zoom(),
    viewportWidth: wasm.get_camera_viewport_width(),
    viewportHeight: wasm.get_camera_viewport_height(),
  };
}

export function screenToWorld(screenX: number, screenY: number, camera: FlintCamera): WorldPoint {
  const wasm = getFlintRenderWorkerWasm();
  wasm.createCamera(camera.viewportWidth, camera.viewportHeight, camera.x, camera.y, camera.zoom);
  wasm.screenToWorld(screenX, screenY);
  return {
    x: wasm.get_point_x(),
    y: wasm.get_point_y(),
  };
}

export function worldToScreen(worldX: number, worldY: number, camera: FlintCamera): ScreenPoint {
  const wasm = getFlintRenderWorkerWasm();
  wasm.createCamera(camera.viewportWidth, camera.viewportHeight, camera.x, camera.y, camera.zoom);
  wasm.worldToScreen(worldX, worldY);
  return {
    x: wasm.get_point_x(),
    y: wasm.get_point_y(),
  };
}

export function getViewportBounds(camera: FlintCamera, padding = 0): ViewBounds {
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

export function panCamera(camera: FlintCamera, screenDeltaX: number, screenDeltaY: number): FlintCamera {
  const wasm = getFlintRenderWorkerWasm();
  wasm.createCamera(camera.viewportWidth, camera.viewportHeight, camera.x, camera.y, camera.zoom);
  wasm.panCamera(screenDeltaX, screenDeltaY);
  return {
    ...camera,
    x: wasm.get_camera_x(),
    y: wasm.get_camera_y(),
    zoom: wasm.get_camera_zoom(),
    viewportWidth: wasm.get_camera_viewport_width(),
    viewportHeight: wasm.get_camera_viewport_height(),
  };
}

export function zoomCamera(
  camera: FlintCamera,
  cursorScreenX: number,
  cursorScreenY: number,
  factor: number,
): FlintCamera {
  const wasm = getFlintRenderWorkerWasm();
  wasm.createCamera(camera.viewportWidth, camera.viewportHeight, camera.x, camera.y, camera.zoom);
  wasm.zoomCamera(cursorScreenX, cursorScreenY, factor);
  return {
    ...camera,
    x: wasm.get_camera_x(),
    y: wasm.get_camera_y(),
    zoom: wasm.get_camera_zoom(),
    viewportWidth: wasm.get_camera_viewport_width(),
    viewportHeight: wasm.get_camera_viewport_height(),
  };
}

export function createViewProjectionMatrix(camera: FlintCamera): Float32Array {
  const wasm = getFlintRenderWorkerWasm();
  wasm.createCamera(camera.viewportWidth, camera.viewportHeight, camera.x, camera.y, camera.zoom);
  const matrixPtr = 256;
  wasm.createViewProjectionMatrix(matrixPtr);
  const memory = (wasm as unknown as { memory: WebAssembly.Memory }).memory;
  const f64s = new Float64Array(memory.buffer, matrixPtr, 16);
  return new Float32Array(f64s);
}

export class SpatialGridIndex {
  private readonly nodeIds: string[] = [];
  private readonly nodeIdMap = new Map<string, number>();
  private readonly ports: PortSpatialItem[] = [];

  constructor(_cellSize = 256) {
    const wasm = getFlintRenderWorkerWasm();
    wasm.spatial_init();
    this.clear();
  }

  insert(id: string, bounds: ViewBounds): void {
    const wasm = getFlintRenderWorkerWasm();
    let index = this.nodeIdMap.get(id);
    if (index === undefined) {
      index = this.nodeIds.length;
      this.nodeIds.push(id);
      this.nodeIdMap.set(id, index);
    }

    const minX = Math.round(bounds.minX) + COORD_OFFSET;
    const minY = Math.round(bounds.minY) + COORD_OFFSET;
    const maxX = Math.round(bounds.maxX) + COORD_OFFSET;
    const maxY = Math.round(bounds.maxY) + COORD_OFFSET;

    wasm.spatial_insert_node(index, minX, minY, maxX, maxY);
  }

  registerPort(item: PortSpatialItem): void {
    const wasm = getFlintRenderWorkerWasm();
    const portIndex = this.ports.length;
    this.ports.push(item);
    const nodeIndex = this.nodeIdMap.get(item.nodeId) ?? 0;
    const dir = item.direction === 'output' ? 1 : 0;
    const px = Math.round(item.position.x) + COORD_OFFSET;
    const py = Math.round(item.position.y) + COORD_OFFSET;

    wasm.spatial_insert_port(nodeIndex, portIndex, dir, px, py);
  }

  queryBox(queryBounds: ViewBounds): readonly string[] {
    const wasm = getFlintRenderWorkerWasm();
    const qMinX = Math.round(queryBounds.minX) + COORD_OFFSET;
    const qMinY = Math.round(queryBounds.minY) + COORD_OFFSET;
    const qMaxX = Math.round(queryBounds.maxX) + COORD_OFFSET;
    const qMaxY = Math.round(queryBounds.maxY) + COORD_OFFSET;

    const count = wasm.spatial_query_box(qMinX, qMinY, qMaxX, qMaxY);
    const results: string[] = [];
    for (let i = 0; i < count; i++) {
      const nodeIndex = wasm.spatial_get_query_result(i);
      const id = this.nodeIds[nodeIndex];
      if (id !== undefined) {
        results.push(id);
      }
    }
    return results;
  }

  hitTestPoint(pointX: number, pointY: number): string | undefined {
    const wasm = getFlintRenderWorkerWasm();
    const px = Math.round(pointX) + COORD_OFFSET;
    const py = Math.round(pointY) + COORD_OFFSET;

    const hit = wasm.spatial_hit_test_point(px, py);
    if (hit === 0) return undefined;
    return this.nodeIds[hit - 1];
  }

  hitTestPort(pointX: number, pointY: number, snapRadius = 14): PortSpatialItem | undefined {
    const wasm = getFlintRenderWorkerWasm();
    const px = Math.round(pointX) + COORD_OFFSET;
    const py = Math.round(pointY) + COORD_OFFSET;

    const hit = wasm.spatial_hit_test_port(px, py, snapRadius);
    if (hit === 0) return undefined;
    const portIndex = (hit % 65_536) - 1;
    return this.ports[portIndex];
  }

  clear(): void {
    const wasm = getFlintRenderWorkerWasm();
    wasm.spatial_clear();
    this.nodeIds.length = 0;
    this.nodeIdMap.clear();
    this.ports.length = 0;
  }
}

export function getNodeBounds(node: FlintGraphNode): ViewBounds {
  const wasm = getFlintRenderWorkerWasm();
  const maxPorts = Math.max(node.inputs.length, node.outputs.length, 1);
  wasm.getNodeBounds(node.position.x, node.position.y, maxPorts);
  return {
    minX: wasm.get_node_bounds_min_x(),
    minY: wasm.get_node_bounds_min_y(),
    maxX: wasm.get_node_bounds_max_x(),
    maxY: wasm.get_node_bounds_max_y(),
  };
}

const CATEGORY_MAP: Record<string, number> = {
  math: 1,
  logic: 2,
  text: 3,
  collection: 4,
  control: 5,
  capability: 6,
};

export function getCategoryRgb(category: string): { readonly r: number; readonly g: number; readonly b: number } {
  const wasm = getFlintRenderWorkerWasm();
  const packed = wasm.getCategoryRgb(CATEGORY_MAP[category] ?? 0);
  return {
    r: Math.round(((packed >> 16) & 255) / 2.55) / 100,
    g: Math.round(((packed >> 8) & 255) / 2.55) / 100,
    b: Math.round((packed & 255) / 2.55) / 100,
  };
}

export function getPortTypeRgb(typeName: FlintTypeName): {
  readonly r: number;
  readonly g: number;
  readonly b: number;
} {
  const wasm = getFlintRenderWorkerWasm();
  const name: string =
    typeof typeName === 'string'
      ? typeName
      : typeName.kind === 'type-name'
        ? (typeName.reference ?? typeName.name)
        : 'f32';
  let typeId = 0;
  switch (name) {
    case 'f32':
    case 'f64':
    case 'i32':
    case 'i64':
    case 'u32':
    case 'u64': {
      typeId = 1;
      break;
    }
    case 'bool': {
      typeId = 2;
      break;
    }
    case 'string': {
      typeId = 3;
      break;
    }
    case 'Vector':
    case 'Map': {
      typeId = 4;
      break;
    }
    default: {
      break;
    }
  }

  const packed = wasm.getPortTypeRgb(typeId);
  return {
    r: Math.round(((packed >> 16) & 255) / 2.55) / 100,
    g: Math.round(((packed >> 8) & 255) / 2.55) / 100,
    b: Math.round((packed & 255) / 2.55) / 100,
  };
}

export interface RenderWorkerInputMessage {
  readonly type:
    'init' | 'set_graph' | 'pan' | 'zoom' | 'resize' | 'set_selection' | 'set_pulse' | 'hit_test' | 'set_trace_state';
  readonly canvas?: OffscreenCanvas;
  readonly width?: number;
  readonly height?: number;
  readonly dpr?: number;
  readonly nodes?: readonly FlintGraphNode[];
  readonly edges?: readonly FlintGraphEdge[];
  readonly groups?: readonly FlintGraphGroup[];
  readonly deltaX?: number;
  readonly deltaY?: number;
  readonly dx?: number;
  readonly dy?: number;
  readonly factor?: number;
  readonly cursorX?: number;
  readonly cursorY?: number;
  readonly screenX?: number;
  readonly screenY?: number;
  readonly snapRadius?: number;
  readonly selectedNodeIds?: readonly string[];
  readonly selectedEdgeIds?: readonly string[];
  readonly activeEdgeId?: string;
  readonly edgeId?: string;
  readonly progress?: number;
  readonly activeNodeIds?: readonly string[];
  readonly trappedNodeId?: string;
  readonly edgePulses?: readonly {
    readonly edgeId: string;
    readonly offset: number;
  }[];
  readonly requestId?: string;
}

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

export const getFlintCameraWasm: (imports?: WebAssembly.Imports) => FlintRenderWorkerWasmExports =
  getFlintRenderWorkerWasm;

export class FlintRenderEngine {
  private camera: FlintCamera;
  private readonly spatialIndex: SpatialGridIndex;
  private nodes: readonly FlintGraphNode[] = [];
  private edges: readonly FlintGraphEdge[] = [];
  private groups: readonly FlintGraphGroup[] = [];
  private selectedNodeIds = new Set<string>();
  private readonly selectedEdgeIds = new Set<string>();
  private readonly activeNodeIds = new Set<string>();
  private trappedNodeId?: string;
  private readonly edgePulses = new Map<string, number>();
  private connectingEdge?: {
    readonly fromNodeId: string;
    readonly fromPortId: string;
    readonly cursorX: number;
    readonly cursorY: number;
  };
  private hoveredPort?: { readonly nodeId: string; readonly portId: string };
  private onMessageCallback?: (message: RenderWorkerOutputMessage) => void;

  private flintWasmInstance?: FlintRenderWorkerWasmExports;
  private gpuContext?: FlintWebGpuContext;
  private canvas2dCtx?: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  private canvas?: OffscreenCanvas | HTMLCanvasElement;
  private dpr = 1;
  private activeBackend: 'webgpu' | 'webgl' | 'canvas2d' = 'webgpu';
  private performanceStats: FlintPerformanceMetrics = {
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

  private gridPipeline?: GPURenderPipeline;
  private nodesPipeline?: GPURenderPipeline;
  private edgesPipeline?: GPURenderPipeline;
  private cameraBuffer?: GPUBuffer;
  private cameraBindGroup?: GPUBindGroup;
  private nodeInstanceBuffer?: GPUBuffer;
  private edgeInstanceBuffer?: GPUBuffer;
  private pinInstanceBuffer?: GPUBuffer;
  private nodeInstanceFloats: number[] = [];
  private edgeInstanceFloats: number[] = [];
  private pinInstanceFloats: number[] = [];

  private currentPassEncoder?: GPURenderPassEncoder;
  private currentCommandEncoder?: GPUCommandEncoder;
  private currentVisibleNodesCount = 0;
  private currentVisibleEdgesCount = 0;

  private glCtx?: WebGLRenderingContext | WebGL2RenderingContext;
  private glProgram?: WebGLProgram;
  private glVertexBuffer?: WebGLBuffer;
  private glUniformLocations?: {
    readonly u_resolution: WebGLUniformLocation | null;
    readonly u_camera: WebGLUniformLocation | null;
    readonly u_zoom: WebGLUniformLocation | null;
  };
  private glAttribLocations?: {
    readonly a_position: number;
    readonly a_color: number;
  };

  constructor(viewportWidth = 800, viewportHeight = 600, onMessage?: (message: RenderWorkerOutputMessage) => void) {
    this.camera = createCamera(viewportWidth, viewportHeight, 0, 0, 1);
    this.spatialIndex = new SpatialGridIndex(256);
    this.onMessageCallback = onMessage;
    this.initFlintWasm();
  }

  private initFlintWasm(): void {
    const capabilities: WebAssembly.Imports = {
      'webgpu.upload_camera_buffer': {
        gpu_upload_camera_buffer: () => {
          if (!this.gpuContext || !this.cameraBuffer) return;
          this.prepareWebGpuInstances();
          const vpMatrix = createViewProjectionMatrix(this.camera);
          const cameraUniforms = new Float32Array(24);
          cameraUniforms.set(vpMatrix, 0);
          cameraUniforms[16] = this.camera.viewportWidth;
          cameraUniforms[17] = this.camera.viewportHeight;
          cameraUniforms[18] = this.camera.x;
          cameraUniforms[19] = this.camera.y;
          cameraUniforms[20] = this.camera.zoom;
          cameraUniforms[21] = 1;
          this.gpuContext.queue.writeBuffer(this.cameraBuffer, 0, cameraUniforms);
        },
      },
      'webgpu.write_node_instance': {
        gpu_write_node_instance: (
          posX: number,
          posY: number,
          width: number,
          height: number,
          radius: number,
          isSelected: number,
          isActive: number,
          isTrapped: number,
        ) => {
          const glowR = isTrapped ? 0.95 : isActive ? 0.15 : 0;
          const glowG = isTrapped ? 0.15 : isActive ? 0.75 : 0;
          const glowB = isTrapped ? 0.2 : isActive ? 1 : 0;
          const glowA = isTrapped ? 0.9 : isActive ? 0.8 : isSelected ? 0.5 : 0;

          const fillR = 0.14;
          const fillG = 0.16;
          const fillB = 0.22;
          const fillA = 0.95;

          const borderR = isSelected ? 0.35 : 0.28;
          const borderG = isSelected ? 0.65 : 0.32;
          const borderB = isSelected ? 1 : 0.42;
          const borderA = isSelected ? 1 : 0.7;
          const borderWidth = isSelected ? 2.5 : 1.2;

          this.nodeInstanceFloats.push(
            posX,
            posY,
            width,
            height,
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
          const colorR = isSelected ? 0.35 : isActive ? 0.2 : 0.45;
          const colorG = isSelected ? 0.65 : isActive ? 0.8 : 0.52;
          const colorB = isSelected ? 1 : isActive ? 1 : 0.65;
          const colorA = isSelected ? 1 : isActive ? 0.9 : 0.8;
          const width = isSelected ? 3 : 2.5;

          this.edgeInstanceFloats.push(
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
            width,
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
          const fillR = isHovered ? 0 : isActive ? 0 : 0.15;
          const fillG = isHovered ? 0.94 : isActive ? 1 : 0.2;
          const fillB = isHovered ? 1 : isActive ? 0.53 : 0.28;
          const fillA = 1;

          const borderR = 0.45;
          const borderG = 0.52;
          const borderB = 0.65;
          const borderA = 0.8;
          const borderWidth = isHovered ? 2.5 : 1.5;

          const glowR = isHovered ? 0 : isActive ? 0 : 0;
          const glowG = isHovered ? 0.94 : isActive ? 1 : 0;
          const glowB = isHovered ? 1 : isActive ? 0.53 : 0;
          const glowA = isHovered ? 0.8 : isActive ? 0.6 : 0;

          this.pinInstanceFloats.push(
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
        gpu_upload_node_buffer: () => {
          if (!this.gpuContext) return;
          const { device, queue } = this.gpuContext;
          if (this.nodeInstanceFloats.length > 0) {
            const nodeData = new Float32Array(this.nodeInstanceFloats);
            if (!this.nodeInstanceBuffer || this.nodeInstanceBuffer.size < nodeData.byteLength) {
              this.nodeInstanceBuffer?.destroy();
              this.nodeInstanceBuffer = device.createBuffer({
                size: Math.max(nodeData.byteLength, 1024),
                usage: 0x00_20 | 0x00_08,
              });
            }
            queue.writeBuffer(this.nodeInstanceBuffer, 0, nodeData);
          }
        },
      },
      'webgpu.upload_edge_buffer': {
        gpu_upload_edge_buffer: () => {
          if (!this.gpuContext) return;
          const { device, queue } = this.gpuContext;
          if (this.edgeInstanceFloats.length > 0) {
            const edgeData = new Float32Array(this.edgeInstanceFloats);
            if (!this.edgeInstanceBuffer || this.edgeInstanceBuffer.size < edgeData.byteLength) {
              this.edgeInstanceBuffer?.destroy();
              this.edgeInstanceBuffer = device.createBuffer({
                size: Math.max(edgeData.byteLength, 1024),
                usage: 0x00_20 | 0x00_08,
              });
            }
            queue.writeBuffer(this.edgeInstanceBuffer, 0, edgeData);
          }
        },
      },
      'webgpu.upload_pin_buffer': {
        gpu_upload_pin_buffer: () => {
          if (!this.gpuContext) return;
          const { device, queue } = this.gpuContext;
          if (this.pinInstanceFloats.length > 0) {
            const pinData = new Float32Array(this.pinInstanceFloats);
            if (!this.pinInstanceBuffer || this.pinInstanceBuffer.size < pinData.byteLength) {
              this.pinInstanceBuffer?.destroy();
              this.pinInstanceBuffer = device.createBuffer({
                size: Math.max(pinData.byteLength, 1024),
                usage: 0x00_20 | 0x00_08,
              });
            }
            queue.writeBuffer(this.pinInstanceBuffer, 0, pinData);
          }
        },
      },
      'webgpu.render_begin': { gpu_render_begin: () => this.gpuBeginPass() },
      'webgpu.render_grid': { gpu_render_grid: () => this.gpuDrawGrid() },
      'webgpu.render_edges': {
        gpu_render_edges: (count: number) => this.gpuDrawEdges(count),
      },
      'webgpu.render_nodes': {
        gpu_render_nodes: (count: number) => this.gpuDrawNodes(count),
      },
      'webgpu.render_pins': {
        gpu_render_pins: (count: number) => this.gpuDrawPins(count),
      },
      'webgpu.render_end': { gpu_render_end: () => this.gpuEndPass() },
      'webgl.render_frame': {
        webgl_render_frame: () => this.renderWebGLFrame(),
      },
      'canvas2d.render_frame': {
        canvas2d_render_frame: () => this.render2dFrame(),
      },
    };
    try {
      this.flintWasmInstance = getFlintRenderWorkerWasm(capabilities);
      this.flintWasmInstance.spatial_init();
    } catch {
      this.flintWasmInstance = getFlintRenderWorkerWasm();
      this.flintWasmInstance.spatial_init();
    }
  }

  async initWebGpu(canvas: OffscreenCanvas | HTMLCanvasElement): Promise<boolean> {
    try {
      this.gpuContext = await createWebGpuContext(canvas);
      await this.initPipelines();
      return true;
    } catch {
      return false;
    }
  }

  initWebGL(canvas: HTMLCanvasElement | OffscreenCanvas): boolean {
    try {
      const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as
        WebGLRenderingContext | WebGL2RenderingContext | null;
      if (!gl) return false;
      this.glCtx = gl;

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

      this.glProgram = program;
      this.glVertexBuffer = gl.createBuffer() ?? undefined;
      this.glUniformLocations = {
        u_resolution: gl.getUniformLocation(program, 'u_resolution'),
        u_camera: gl.getUniformLocation(program, 'u_camera'),
        u_zoom: gl.getUniformLocation(program, 'u_zoom'),
      };
      this.glAttribLocations = {
        a_position: gl.getAttribLocation(program, 'a_position'),
        a_color: gl.getAttribLocation(program, 'a_color'),
      };
      return true;
    } catch {
      return false;
    }
  }

  init2dFallback(canvas: HTMLCanvasElement | OffscreenCanvas): void {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      this.canvas2dCtx = ctx as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    }
  }

  async initialize(canvas: OffscreenCanvas | HTMLCanvasElement, dpr?: number): Promise<boolean> {
    this.canvas = canvas;
    if (dpr !== undefined && dpr > 0) {
      this.dpr = dpr;
    }
    this.updateCanvasDimensions();

    const wasm = this.flintWasmInstance ?? getFlintRenderWorkerWasm();
    const hasWebGpu =
      typeof navigator !== 'undefined' && 'gpu' in navigator && (navigator as WebGpuNavigator).gpu !== undefined;
    let hasWebGL = false;
    let has2D = false;
    try {
      const probeCanvas =
        typeof OffscreenCanvas === 'undefined'
          ? typeof document === 'undefined'
            ? undefined
            : document.createElement('canvas')
          : new OffscreenCanvas(1, 1);
      if (probeCanvas) {
        hasWebGL = Boolean(probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl'));
      }
    } catch {
      hasWebGL = false;
    }
    try {
      const probe2d =
        typeof OffscreenCanvas === 'undefined'
          ? typeof document === 'undefined'
            ? undefined
            : document.createElement('canvas')
          : new OffscreenCanvas(1, 1);
      if (probe2d) {
        has2D = Boolean(probe2d.getContext('2d'));
      }
    } catch {
      has2D = false;
    }

    let selectedTier = Number(wasm.backend_select_tier(hasWebGpu, hasWebGL, has2D));
    wasm.engine_set_backend(selectedTier);
    let initialized = false;

    if (selectedTier === 1) {
      initialized = await this.initWebGpu(canvas);
      if (initialized) {
        this.activeBackend = 'webgpu';
      } else {
        selectedTier = Number(wasm.backend_fallback_next(1, hasWebGL, has2D));
        wasm.engine_set_backend(selectedTier);
      }
    }

    if (!initialized && selectedTier === 2) {
      initialized = this.initWebGL(canvas);
      if (initialized) {
        this.activeBackend = 'webgl';
      } else {
        selectedTier = Number(wasm.backend_fallback_next(2, false, has2D));
        wasm.engine_set_backend(selectedTier);
      }
    }

    if (!initialized) {
      this.init2dFallback(canvas);
      this.activeBackend = 'canvas2d';
      wasm.engine_set_backend(3);
      initialized = this.canvas2dCtx !== undefined;
    }

    this.renderFrame();
    return initialized && this.activeBackend === 'webgpu';
  }

  destroy(): void {
    this.nodeInstanceBuffer?.destroy();
    this.edgeInstanceBuffer?.destroy();
    this.pinInstanceBuffer?.destroy();
    this.cameraBuffer?.destroy();
    if (this.glProgram && this.glCtx) {
      this.glCtx.deleteProgram(this.glProgram);
    }
    if (this.glVertexBuffer && this.glCtx) {
      this.glCtx.deleteBuffer(this.glVertexBuffer);
    }
  }

  private async initPipelines(): Promise<void> {
    if (!this.gpuContext) return;
    const { device, format } = this.gpuContext;

    const cameraBindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: 3, // GPUShaderStage.VERTEX (1) | GPUShaderStage.FRAGMENT (2)
          buffer: { type: 'uniform' },
        },
      ],
    });

    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [cameraBindGroupLayout],
    });

    this.cameraBuffer = device.createBuffer({
      size: 256, // Uniform buffer accommodating CameraUniform (88+ bytes) aligned to 256 bytes
      usage: 0x00_40 | 0x00_08, // GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    this.cameraBindGroup = device.createBindGroup({
      layout: cameraBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.cameraBuffer },
        },
      ],
    });

    const gridModule = device.createShaderModule({ code: GRID_WGSL });
    this.gridPipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: { module: gridModule, entryPoint: 'vs_main' },
      fragment: {
        module: gridModule,
        entryPoint: 'fs_main',
        targets: [
          {
            format,
            blend: {
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
              },
            },
          },
        ],
      },
      primitive: { topology: 'triangle-list' },
    });

    const nodesModule = device.createShaderModule({ code: NODES_WGSL });
    this.nodesPipeline = device.createRenderPipeline({
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
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
              },
            },
          },
        ],
      },
      primitive: { topology: 'triangle-list' },
    });

    const edgesModule = device.createShaderModule({ code: EDGES_WGSL });
    this.edgesPipeline = device.createRenderPipeline({
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
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
              },
            },
          },
        ],
      },
      primitive: { topology: 'triangle-strip' },
    });
  }

  setGraph(
    nodes: readonly FlintGraphNode[],
    edges: readonly FlintGraphEdge[],
    groups: readonly FlintGraphGroup[] = [],
  ): void {
    const startTime = typeof performance === 'undefined' ? 0 : performance.now();
    this.nodes = nodes;
    this.edges = edges;
    this.groups = groups;
    this.rebuildSpatialIndex();
    if (startTime > 0) {
      const updateDuration = Math.max(0.05, performance.now() - startTime);
      this.performanceStats = {
        ...this.performanceStats,
        updateTimeMs: Math.round((this.performanceStats.updateTimeMs * 0.7 + updateDuration * 0.3) * 10) / 10,
      };
    }
    this.renderFrame();
  }

  setSelection(selectedNodeIds: readonly string[], selectedEdgeIds: readonly string[] = []): void {
    this.selectedNodeIds = new Set(selectedNodeIds);
    this.selectedEdgeIds.clear();
    for (const edgeId of selectedEdgeIds) {
      this.selectedEdgeIds.add(edgeId);
    }
    this.renderFrame();
  }

  setConnectingEdge(edge?: {
    readonly fromNodeId: string;
    readonly fromPortId: string;
    readonly cursorX: number;
    readonly cursorY: number;
  }): void {
    this.connectingEdge = edge;
    this.renderFrame();
  }

  setHoveredPort(port?: { readonly nodeId: string; readonly portId: string }): void {
    this.hoveredPort = port;
    this.renderFrame();
  }

  getHoveredPort(): { readonly nodeId: string; readonly portId: string } | undefined {
    return this.hoveredPort;
  }

  setEdgePulse(edgeId: string, progress: number): void {
    this.edgePulses.set(edgeId, progress);
    this.renderFrame();
  }

  clearEdgePulses(): void {
    this.edgePulses.clear();
    this.renderFrame();
  }

  setActiveNodes(nodeIds: readonly string[]): void {
    this.activeNodeIds.clear();
    for (const id of nodeIds) {
      this.activeNodeIds.add(id);
    }
    this.renderFrame();
  }

  setTrappedNode(nodeId?: string): void {
    this.trappedNodeId = nodeId;
    this.renderFrame();
  }

  pan(deltaX: number, deltaY: number): void {
    this.camera = panCamera(this.camera, deltaX, deltaY);
    this.onMessageCallback?.({ type: 'camera_changed', camera: this.camera });
    this.renderFrame();
  }

  zoom(arg1: number, arg2?: number, arg3?: number): void {
    let factor = arg1;
    let cx = arg2;
    let cy = arg3;
    if (arg3 !== undefined && typeof arg3 === 'number') {
      cx = arg1;
      cy = arg2;
      factor = arg3;
    }
    const cursorX = cx ?? this.camera.viewportWidth / 2;
    const cursorY = cy ?? this.camera.viewportHeight / 2;
    this.camera = zoomCamera(this.camera, cursorX, cursorY, factor);
    this.onMessageCallback?.({ type: 'camera_changed', camera: this.camera });
    this.renderFrame();
  }

  resize(width: number, height: number, dpr?: number): void {
    if (dpr !== undefined && dpr > 0) {
      this.dpr = dpr;
    }
    this.camera = createCamera(width, height, this.camera.x, this.camera.y, this.camera.zoom);
    this.updateCanvasDimensions();
    this.renderFrame();
  }

  setDpr(dpr: number): void {
    if (dpr > 0 && dpr !== this.dpr) {
      this.dpr = dpr;
      this.updateCanvasDimensions();
      this.renderFrame();
    }
  }

  getDpr(): number {
    return this.dpr;
  }

  getPerformanceStats(): FlintPerformanceMetrics {
    return {
      ...this.performanceStats,
      dpr: this.dpr,
      isFallback: !this.gpuContext,
    };
  }

  queryNodesInBox(worldBounds: ViewBounds): readonly string[] {
    return this.spatialIndex.queryBox(worldBounds);
  }

  private updateCanvasDimensions(): void {
    if (!this.canvas) return;
    const targetW = Math.max(1, Math.round(this.camera.viewportWidth * this.dpr));
    const targetH = Math.max(1, Math.round(this.camera.viewportHeight * this.dpr));
    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
      if (this.gpuContext && this.gpuContext.context) {
        try {
          this.gpuContext.context.configure({
            device: this.gpuContext.device,
            format: this.gpuContext.format,
            alphaMode: 'premultiplied',
          });
        } catch {
          // Ignore reconfiguration failure during teardown
        }
      }
    }
  }

  screenToWorld(screenX: number, screenY: number): WorldPoint {
    return screenToWorld(screenX, screenY, this.camera);
  }

  worldToScreen(worldX: number, worldY: number): ScreenPoint {
    return worldToScreen(worldX, worldY, this.camera);
  }

  getCamera(): FlintCamera {
    return this.camera;
  }

  hitTestSync(screenX: number, screenY: number, snapRadius = 14): FlintHitResult | undefined {
    const world = this.screenToWorld(screenX, screenY);

    const hitPort = this.spatialIndex.hitTestPort(world.x, world.y, snapRadius);
    if (hitPort) {
      return {
        type: 'port',
        nodeId: hitPort.nodeId,
        portId: hitPort.portId,
        worldX: world.x,
        worldY: world.y,
      };
    }

    const hitNodeId = this.spatialIndex.hitTestPoint(world.x, world.y);
    if (hitNodeId) {
      return {
        type: 'node',
        nodeId: hitNodeId,
        worldX: world.x,
        worldY: world.y,
      };
    }

    const wasm = getFlintRenderWorkerWasm();
    const nodeMap = new Map<string, FlintGraphNode>(this.nodes.map((n) => [n.id, n]));
    const threshold = Math.max(8, 12 / Math.max(0.2, this.camera.zoom));

    for (const edge of this.edges) {
      const fromNode = nodeMap.get(edge.fromNodeId);
      const toNode = nodeMap.get(edge.toNodeId);
      if (!fromNode || !toNode) continue;
      const fromPortIdx = Math.max(
        0,
        fromNode.outputs.findIndex((p) => p.id === edge.fromPortId),
      );
      const toPortIdx = Math.max(
        0,
        toNode.inputs.findIndex((p) => p.id === edge.toPortId),
      );
      const p0x = fromNode.position.x + NODE_WIDTH;
      const p0y = fromNode.position.y + NODE_HEADER_HEIGHT + fromPortIdx * PORT_ROW_HEIGHT + 14;
      const p3x = toNode.position.x;
      const p3y = toNode.position.y + NODE_HEADER_HEIGHT + toPortIdx * PORT_ROW_HEIGHT + 14;

      const isHit = wasm.edge_hit_test(
        Math.round(world.x),
        Math.round(world.y),
        Math.round(p0x),
        Math.round(p0y),
        Math.round(p3x),
        Math.round(p3y),
        Math.round(threshold),
      );
      if (isHit) {
        return {
          type: 'edge',
          nodeId: '',
          edgeId: edge.id,
          worldX: world.x,
          worldY: world.y,
        };
      }
    }

    return undefined;
  }

  private rebuildSpatialIndex(): void {
    this.spatialIndex.clear();
    for (const node of this.nodes) {
      const bounds = getNodeBounds(node);
      this.spatialIndex.insert(node.id, bounds);

      for (const [idx, port] of node.inputs.entries()) {
        const portY = node.position.y + NODE_HEADER_HEIGHT + idx * PORT_ROW_HEIGHT + 14;
        this.spatialIndex.registerPort({
          nodeId: node.id,
          portId: port.id,
          direction: 'input',
          position: { x: node.position.x, y: portY },
        });
      }

      for (const [idx, port] of node.outputs.entries()) {
        const portY = node.position.y + NODE_HEADER_HEIGHT + idx * PORT_ROW_HEIGHT + 14;
        this.spatialIndex.registerPort({
          nodeId: node.id,
          portId: port.id,
          direction: 'output',
          position: { x: node.position.x + NODE_WIDTH, y: portY },
        });
      }
    }
  }

  renderFrame(): void {
    const startTime = typeof performance === 'undefined' ? 0 : performance.now();
    const wasm = this.flintWasmInstance ?? getFlintRenderWorkerWasm();

    const visibleBounds = getViewportBounds(this.camera, 200);
    const visibleNodeIds = new Set(this.spatialIndex.queryBox(visibleBounds));
    const visibleNodesCount = visibleNodeIds.size;
    const visibleEdgesCount = this.edges.length;
    const visiblePinsCount = visibleNodesCount * 4;

    wasm.engine_render_frame(visibleNodesCount, visibleEdgesCount, visiblePinsCount);
    if (startTime > 0) {
      const renderDuration = Math.max(0.05, performance.now() - startTime);
      this.performanceStats = {
        ...this.performanceStats,
        renderTimeMs: Math.round((this.performanceStats.renderTimeMs * 0.7 + renderDuration * 0.3) * 10) / 10,
        totalFrameTimeMs:
          Math.round(
            (this.performanceStats.updateTimeMs + (this.performanceStats.renderTimeMs * 0.7 + renderDuration * 0.3)) *
              10,
          ) / 10,
      };
      this.onMessageCallback?.({
        type: 'frame',
        performance: this.getPerformanceStats(),
        visibleNodes: this.currentVisibleNodesCount,
        visibleEdges: this.currentVisibleEdgesCount,
      });
    }
  }

  private prepareWebGpuInstances(): void {
    if (!this.gpuContext || !this.cameraBuffer) return;
    const wasm = this.flintWasmInstance ?? getFlintRenderWorkerWasm();

    const t0 = typeof performance === 'undefined' ? 0 : performance.now();
    this.nodeInstanceFloats = [];
    this.edgeInstanceFloats = [];
    this.pinInstanceFloats = [];

    const visibleBounds = getViewportBounds(this.camera, 200);
    const visibleNodeIds = new Set(this.spatialIndex.queryBox(visibleBounds));
    const visibleNodes = this.nodes.filter((n) => visibleNodeIds.has(n.id));
    const t1 = typeof performance === 'undefined' ? 0 : performance.now();
    if (t0 > 0) {
      this.performanceStats = {
        ...this.performanceStats,
        spatialIndexTimeMs: Math.round((this.performanceStats.spatialIndexTimeMs * 0.7 + (t1 - t0) * 0.3) * 100) / 100,
      };
    }

    for (const node of visibleNodes) {
      const bounds = getNodeBounds(node);
      const isSelected = this.selectedNodeIds.has(node.id) ? 1 : 0;
      const isActive = this.activeNodeIds.has(node.id) ? 1 : 0;
      const isTrapped = this.trappedNodeId === node.id ? 1 : 0;

      wasm.compute_node_instance(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY, isSelected, isActive, isTrapped);

      for (const [idx, port] of node.inputs.entries()) {
        const py = node.position.y + NODE_HEADER_HEIGHT + idx * PORT_ROW_HEIGHT + 14;
        const isHovered = this.hoveredPort?.nodeId === node.id && this.hoveredPort?.portId === port.id ? 1 : 0;
        wasm.compute_pin_instance(node.position.x, py, isHovered, 0, 0);
      }
      for (const [idx, port] of node.outputs.entries()) {
        const py = node.position.y + NODE_HEADER_HEIGHT + idx * PORT_ROW_HEIGHT + 14;
        const isHovered = this.hoveredPort?.nodeId === node.id && this.hoveredPort?.portId === port.id ? 1 : 0;
        wasm.compute_pin_instance(node.position.x + NODE_WIDTH, py, isHovered, 0, 1);
      }
    }

    const nodeMap = new Map<string, FlintGraphNode>(this.nodes.map((n) => [n.id, n]));
    for (const edge of this.edges) {
      const fromNode = nodeMap.get(edge.fromNodeId);
      const toNode = nodeMap.get(edge.toNodeId);
      if (!fromNode || !toNode) continue;

      const fromPortIndex = Math.max(
        0,
        fromNode.outputs.findIndex((p) => p.id === edge.fromPortId),
      );
      const toPortIndex = Math.max(
        0,
        toNode.inputs.findIndex((p) => p.id === edge.toPortId),
      );

      const p0x = fromNode.position.x + NODE_WIDTH;
      const p0y = fromNode.position.y + NODE_HEADER_HEIGHT + fromPortIndex * PORT_ROW_HEIGHT + 14;
      const p3x = toNode.position.x;
      const p3y = toNode.position.y + NODE_HEADER_HEIGHT + toPortIndex * PORT_ROW_HEIGHT + 14;

      const isSelected = this.selectedEdgeIds.has(edge.id) ? 1 : 0;
      const isActive = this.edgePulses.has(edge.id) ? 1 : 0;
      const pulseOffset = this.edgePulses.get(edge.id) ?? 0;

      wasm.compute_edge_instance(p0x, p0y, p3x, p3y, isSelected, isActive, Math.round(pulseOffset * 1000));
    }

    if (this.connectingEdge) {
      const fromNode = nodeMap.get(this.connectingEdge.fromNodeId);
      if (fromNode) {
        const outIdx = Math.max(
          0,
          fromNode.outputs.findIndex((p) => p.id === this.connectingEdge?.fromPortId),
        );
        const p0x = fromNode.position.x + NODE_WIDTH;
        const p0y = fromNode.position.y + NODE_HEADER_HEIGHT + outIdx * PORT_ROW_HEIGHT + 14;
        const p3x = this.connectingEdge.cursorX;
        const p3y = this.connectingEdge.cursorY;
        wasm.compute_edge_instance(p0x, p0y, p3x, p3y, 1, 1, 500);
      }
    }

    this.currentVisibleNodesCount = visibleNodes.length;
    this.currentVisibleEdgesCount = Math.floor(this.edgeInstanceFloats.length / 15);
    const visiblePinsCount = Math.floor(this.pinInstanceFloats.length / 18);

    const t2 = typeof performance === 'undefined' ? 0 : performance.now();
    if (t1 > 0) {
      this.performanceStats = {
        ...this.performanceStats,
        bufferUploadTimeMs: Math.round((this.performanceStats.bufferUploadTimeMs * 0.7 + (t2 - t1) * 0.3) * 100) / 100,
        visibleNodesCount: this.currentVisibleNodesCount,
        visibleEdgesCount: this.currentVisibleEdgesCount,
        visiblePinsCount,
      };
    }
  }

  private gpuBeginPass(): void {
    if (!this.gpuContext) return;
    const { device, context } = this.gpuContext;
    this.currentCommandEncoder = device.createCommandEncoder();
    const currentTexture = context.getCurrentTexture();
    const textureView = currentTexture.createView();

    this.currentPassEncoder = this.currentCommandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.08, g: 0.09, b: 0.12, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });
  }

  private gpuDrawGrid(): void {
    if (!this.currentPassEncoder || !this.gridPipeline || !this.cameraBindGroup) return;
    this.currentPassEncoder.setPipeline(this.gridPipeline);
    this.currentPassEncoder.setBindGroup(0, this.cameraBindGroup);
    this.currentPassEncoder.draw(6, 1, 0, 0);
  }

  private gpuDrawEdges(count: number): void {
    if (
      !this.currentPassEncoder ||
      !this.edgesPipeline ||
      !this.cameraBindGroup ||
      !this.edgeInstanceBuffer ||
      count === 0
    )
      return;
    this.currentPassEncoder.setPipeline(this.edgesPipeline);
    this.currentPassEncoder.setBindGroup(0, this.cameraBindGroup);
    this.currentPassEncoder.setVertexBuffer(0, this.edgeInstanceBuffer);
    this.currentPassEncoder.draw(66, count, 0, 0);
  }

  private gpuDrawNodes(count: number): void {
    if (
      !this.currentPassEncoder ||
      !this.nodesPipeline ||
      !this.cameraBindGroup ||
      !this.nodeInstanceBuffer ||
      count === 0
    )
      return;
    this.currentPassEncoder.setPipeline(this.nodesPipeline);
    this.currentPassEncoder.setBindGroup(0, this.cameraBindGroup);
    this.currentPassEncoder.setVertexBuffer(0, this.nodeInstanceBuffer);
    this.currentPassEncoder.draw(6, count, 0, 0);
  }

  private gpuDrawPins(count: number): void {
    if (
      !this.currentPassEncoder ||
      !this.nodesPipeline ||
      !this.cameraBindGroup ||
      !this.pinInstanceBuffer ||
      count === 0
    )
      return;
    this.currentPassEncoder.setPipeline(this.nodesPipeline);
    this.currentPassEncoder.setBindGroup(0, this.cameraBindGroup);
    this.currentPassEncoder.setVertexBuffer(0, this.pinInstanceBuffer);
    this.currentPassEncoder.draw(6, count, 0, 0);
  }

  private gpuEndPass(): void {
    if (!this.currentPassEncoder || !this.currentCommandEncoder || !this.gpuContext) return;
    this.currentPassEncoder.end();
    this.gpuContext.queue.submit([this.currentCommandEncoder.finish()]);
    this.currentPassEncoder = undefined;
    this.currentCommandEncoder = undefined;
  }

  private renderWebGLFrame(): void {
    const gl = this.glCtx;
    if (!gl || !this.glProgram || !this.glVertexBuffer || !this.glUniformLocations || !this.glAttribLocations) return;

    const t0 = typeof performance === 'undefined' ? 0 : performance.now();
    const visibleBounds = getViewportBounds(this.camera, 200);
    const visibleNodeIds = new Set(this.spatialIndex.queryBox(visibleBounds));
    const visibleNodes = this.nodes.filter((n) => visibleNodeIds.has(n.id));

    this.currentVisibleNodesCount = visibleNodes.length;
    this.currentVisibleEdgesCount = this.edges.length;

    const lineVertices: number[] = [];
    const triVertices: number[] = [];

    const pushLine = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      r: number,
      g: number,
      b: number,
      a: number,
    ): void => {
      lineVertices.push(x1, y1, r, g, b, a, x2, y2, r, g, b, a);
    };

    const pushRect = (x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number): void => {
      triVertices.push(
        x,
        y,
        r,
        g,
        b,
        a,
        x + w,
        y,
        r,
        g,
        b,
        a,
        x,
        y + h,
        r,
        g,
        b,
        a,
        x,
        y + h,
        r,
        g,
        b,
        a,
        x + w,
        y,
        r,
        g,
        b,
        a,
        x + w,
        y + h,
        r,
        g,
        b,
        a,
      );
    };

    const pushRectBorder = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
      g: number,
      b: number,
      a: number,
    ): void => {
      pushLine(x, y, x + w, y, r, g, b, a);
      pushLine(x + w, y, x + w, y + h, r, g, b, a);
      pushLine(x + w, y + h, x, y + h, r, g, b, a);
      pushLine(x, y + h, x, y, r, g, b, a);
    };

    const pushCircle = (
      cx: number,
      cy: number,
      radius: number,
      r: number,
      g: number,
      b: number,
      a: number,
      segments = 12,
    ): void => {
      for (let index = 0; index < segments; index++) {
        const theta1 = (index / segments) * Math.PI * 2;
        const theta2 = ((index + 1) / segments) * Math.PI * 2;
        triVertices.push(
          cx,
          cy,
          r,
          g,
          b,
          a,
          cx + Math.cos(theta1) * radius,
          cy + Math.sin(theta1) * radius,
          r,
          g,
          b,
          a,
          cx + Math.cos(theta2) * radius,
          cy + Math.sin(theta2) * radius,
          r,
          g,
          b,
          a,
        );
      }
    };

    // 1. Grid
    const minorSpacing = 24;
    const majorSpacing = 120;
    const startX = Math.floor(visibleBounds.minX / minorSpacing) * minorSpacing;
    const endX = Math.ceil(visibleBounds.maxX / minorSpacing) * minorSpacing;
    const startY = Math.floor(visibleBounds.minY / minorSpacing) * minorSpacing;
    const endY = Math.ceil(visibleBounds.maxY / minorSpacing) * minorSpacing;

    for (let x = startX; x <= endX; x += minorSpacing) {
      const isMajor = Math.round(x) % majorSpacing === 0;
      const alpha = isMajor ? 0.35 : 0.15;
      pushLine(x, visibleBounds.minY, x, visibleBounds.maxY, 0.35, 0.45, 0.6, alpha);
    }
    for (let y = startY; y <= endY; y += minorSpacing) {
      const isMajor = Math.round(y) % majorSpacing === 0;
      const alpha = isMajor ? 0.35 : 0.15;
      pushLine(visibleBounds.minX, y, visibleBounds.maxX, y, 0.35, 0.45, 0.6, alpha);
    }

    // 2. Groups
    for (const group of this.groups) {
      const groupNodes = this.nodes.filter((n) => group.nodeIds.includes(n.id));
      if (groupNodes.length === 0) continue;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const node of groupNodes) {
        const b = getNodeBounds(node);
        minX = Math.min(minX, b.minX);
        minY = Math.min(minY, b.minY);
        maxX = Math.max(maxX, b.maxX);
        maxY = Math.max(maxY, b.maxY);
      }
      const padding = 28;
      const gx = minX - padding;
      const gy = minY - padding - 24;
      const gw = maxX - minX + padding * 2;
      const gh = maxY - minY + padding * 2 + 24;

      pushRect(gx, gy, gw, gh, 0.22, 0.27, 0.34, 0.25);
      pushRectBorder(gx, gy, gw, gh, 0.35, 0.42, 0.52, 0.7);
      pushRect(gx + 10, gy + 4, 80, 20, 0.18, 0.22, 0.28, 0.9);
    }

    // 3. Edges
    const wasm = this.flintWasmInstance ?? getFlintRenderWorkerWasm();
    const nodeMap = new Map<string, FlintGraphNode>(this.nodes.map((n) => [n.id, n]));

    for (const edge of this.edges) {
      const fromNode = nodeMap.get(edge.fromNodeId);
      const toNode = nodeMap.get(edge.toNodeId);
      if (!fromNode || !toNode) continue;

      const fromPortIndex = Math.max(
        0,
        fromNode.outputs.findIndex((p) => p.id === edge.fromPortId),
      );
      const toPortIndex = Math.max(
        0,
        toNode.inputs.findIndex((p) => p.id === edge.toPortId),
      );

      const p0x = fromNode.position.x + NODE_WIDTH;
      const p0y = fromNode.position.y + NODE_HEADER_HEIGHT + fromPortIndex * PORT_ROW_HEIGHT + 14;
      const p3x = toNode.position.x;
      const p3y = toNode.position.y + NODE_HEADER_HEIGHT + toPortIndex * PORT_ROW_HEIGHT + 14;

      const isSelected = this.selectedEdgeIds.has(edge.id);
      const isActive = this.edgePulses.has(edge.id);
      const dx = wasm.bezier_control_dx(p0x, p3x);
      const p1x = p0x + dx;
      const p1y = p0y;
      const p2x = p3x - dx;
      const p2y = p3y;

      const segments = 16;
      let prevX = p0x;
      let prevY = p0y;

      const r = isSelected ? 0.35 : isActive ? 0.25 : 0.45;
      const g = isSelected ? 0.65 : isActive ? 0.85 : 0.52;
      const b = isSelected ? 1 : isActive ? 1 : 0.65;
      const a = isSelected || isActive ? 1 : 0.85;

      for (let s = 1; s <= segments; s++) {
        const t = s / segments;
        const u = 1 - t;
        const curX = u * u * u * p0x + 3 * u * u * t * p1x + 3 * u * t * t * p2x + t * t * t * p3x;
        const curY = u * u * u * p0y + 3 * u * u * t * p1y + 3 * u * t * t * p2y + t * t * t * p3y;
        pushLine(prevX, prevY, curX, curY, r, g, b, a);
        if (isSelected || isActive) {
          pushLine(prevX, prevY + 1, curX, curY + 1, r, g, b, 0.6);
          pushLine(prevX, prevY - 1, curX, curY - 1, r, g, b, 0.6);
        }
        prevX = curX;
        prevY = curY;
      }
    }

    // 4. Connecting Edge (dragging)
    if (this.connectingEdge) {
      const fromNode = nodeMap.get(this.connectingEdge.fromNodeId);
      if (fromNode) {
        const outIndex = fromNode.outputs.findIndex((p) => p.id === this.connectingEdge?.fromPortId);
        const inIndex = fromNode.inputs.findIndex((p) => p.id === this.connectingEdge?.fromPortId);
        let p0x = fromNode.position.x + NODE_WIDTH;
        let p0y = fromNode.position.y + NODE_HEADER_HEIGHT + 14;
        if (outIndex !== -1) {
          p0x = fromNode.position.x + NODE_WIDTH;
          p0y = fromNode.position.y + NODE_HEADER_HEIGHT + outIndex * PORT_ROW_HEIGHT + 14;
        } else if (inIndex !== -1) {
          p0x = fromNode.position.x;
          p0y = fromNode.position.y + NODE_HEADER_HEIGHT + inIndex * PORT_ROW_HEIGHT + 14;
        }
        const p3x = this.connectingEdge.cursorX;
        const p3y = this.connectingEdge.cursorY;
        const dx = Math.max(Math.abs(p3x - p0x) * 0.5, 40);
        const p1x = p0x + dx;
        const p1y = p0y;
        const p2x = p3x - dx;
        const p2y = p3y;
        let prevX = p0x;
        let prevY = p0y;
        const segments = 16;
        for (let s = 1; s <= segments; s++) {
          const t = s / segments;
          const u = 1 - t;
          const curX = u * u * u * p0x + 3 * u * u * t * p1x + 3 * u * t * t * p2x + t * t * t * p3x;
          const curY = u * u * u * p0y + 3 * u * u * t * p1y + 3 * u * t * t * p2y + t * t * t * p3y;
          pushLine(prevX, prevY, curX, curY, 0.35, 0.65, 1, 0.9);
          prevX = curX;
          prevY = curY;
        }
        pushCircle(p3x, p3y, 5, 0.35, 0.65, 1, 1);
      }
    }

    // 5. Nodes
    for (const node of visibleNodes) {
      const bounds = getNodeBounds(node);
      const w = bounds.maxX - bounds.minX;
      const h = bounds.maxY - bounds.minY;
      const x = bounds.minX;
      const y = bounds.minY;

      const isSelected = this.selectedNodeIds.has(node.id);
      const isActive = this.activeNodeIds.has(node.id);
      const isTrapped = this.trappedNodeId === node.id;
      const isMeta = node.metaSubgraph !== undefined || node.operation === 'meta';

      const bodyR = isMeta ? 0.08 : 0.13;
      const bodyG = isMeta ? 0.12 : 0.15;
      const bodyB = isMeta ? 0.18 : 0.2;
      pushRect(x, y, w, h, bodyR, bodyG, bodyB, 0.96);

      const headerR = isTrapped ? 0.24 : isActive ? 0.08 : isMeta ? 0.05 : 0.18;
      const headerG = isTrapped ? 0.08 : isActive ? 0.24 : isMeta ? 0.16 : 0.21;
      const headerB = isTrapped ? 0.09 : isActive ? 0.13 : isMeta ? 0.28 : 0.28;
      pushRect(x, y, w, NODE_HEADER_HEIGHT, headerR, headerG, headerB, 0.98);

      const borderR = isTrapped ? 0.97 : isActive ? 0.25 : isSelected ? 0.35 : isMeta ? 0.47 : 0.22;
      const borderG = isTrapped ? 0.32 : isActive ? 0.73 : isSelected ? 0.65 : isMeta ? 0.75 : 0.26;
      const borderB = isTrapped ? 0.29 : isActive ? 0.31 : isSelected ? 1 : isMeta ? 1 : 0.32;
      const borderA = isSelected || isTrapped || isActive ? 1 : 0.8;
      pushRectBorder(x, y, w, h, borderR, borderG, borderB, borderA);

      // Category accent strip
      const catColor = getCategoryRgb(node.category);
      pushRect(x + 2, y + 2, 4, NODE_HEADER_HEIGHT - 4, catColor.r, catColor.g, catColor.b, 1);

      // Pins (Inputs)
      for (const [index, port] of node.inputs.entries()) {
        const portY = y + NODE_HEADER_HEIGHT + index * PORT_ROW_HEIGHT + 14;
        const isHovered = this.hoveredPort?.nodeId === node.id && this.hoveredPort?.portId === port.id;
        const pinRadius = isHovered ? 7 : 5;
        const pColor = getPortTypeRgb(port.type);
        pushCircle(x, portY, pinRadius, pColor.r, pColor.g, pColor.b, 1);
        pushCircle(x, portY, pinRadius + 1.5, 0.9, 0.95, 1, 0.7);
      }

      // Pins (Outputs)
      for (const [index, port] of node.outputs.entries()) {
        const portY = y + NODE_HEADER_HEIGHT + index * PORT_ROW_HEIGHT + 14;
        const isHovered = this.hoveredPort?.nodeId === node.id && this.hoveredPort?.portId === port.id;
        const pinRadius = isHovered ? 7 : 5;
        const pColor = getPortTypeRgb(port.type);
        pushCircle(x + w, portY, pinRadius, pColor.r, pColor.g, pColor.b, 1);
        pushCircle(x + w, portY, pinRadius + 1.5, 0.9, 0.95, 1, 0.7);
      }
    }

    // Render WebGL draw calls
    gl.viewport(0, 0, this.canvas!.width, this.canvas!.height);
    gl.clearColor(0.05, 0.07, 0.09, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.glProgram);

    gl.uniform2f(this.glUniformLocations.u_resolution, this.camera.viewportWidth, this.camera.viewportHeight);
    gl.uniform2f(this.glUniformLocations.u_camera, this.camera.x, this.camera.y);
    gl.uniform1f(this.glUniformLocations.u_zoom, this.camera.zoom);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.glVertexBuffer);

    if (triVertices.length > 0) {
      const triData = new Float32Array(triVertices);
      gl.bufferData(gl.ARRAY_BUFFER, triData, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(this.glAttribLocations.a_position, 2, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(this.glAttribLocations.a_position);
      gl.vertexAttribPointer(this.glAttribLocations.a_color, 4, gl.FLOAT, false, 24, 8);
      gl.enableVertexAttribArray(this.glAttribLocations.a_color);
      gl.drawArrays(gl.TRIANGLES, 0, triVertices.length / 6);
    }

    if (lineVertices.length > 0) {
      const lineData = new Float32Array(lineVertices);
      gl.bufferData(gl.ARRAY_BUFFER, lineData, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(this.glAttribLocations.a_position, 2, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(this.glAttribLocations.a_position);
      gl.vertexAttribPointer(this.glAttribLocations.a_color, 4, gl.FLOAT, false, 24, 8);
      gl.enableVertexAttribArray(this.glAttribLocations.a_color);
      gl.drawArrays(gl.LINES, 0, lineVertices.length / 6);
    }

    const t1 = typeof performance === 'undefined' ? 0 : performance.now();
    if (t0 > 0) {
      this.performanceStats = {
        ...this.performanceStats,
        drawPassTimeMs: Math.round((this.performanceStats.drawPassTimeMs * 0.7 + (t1 - t0) * 0.3) * 100) / 100,
        visibleNodesCount: this.currentVisibleNodesCount,
        visibleEdgesCount: this.currentVisibleEdgesCount,
      };
    }
  }

  private render2dFrame(): void {
    const ctx = this.canvas2dCtx;
    if (!ctx) return;

    const t0 = typeof performance === 'undefined' ? 0 : performance.now();
    const width = this.camera.viewportWidth;
    const height = this.camera.viewportHeight;
    const dpr = this.dpr || 1;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, width, height);

    ctx.translate(width / 2, height / 2);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    const visibleBounds = getViewportBounds(this.camera, 100);
    const visibleNodeIds = new Set(this.spatialIndex.queryBox(visibleBounds));
    const t1 = typeof performance === 'undefined' ? 0 : performance.now();
    if (t0 > 0) {
      this.performanceStats = {
        ...this.performanceStats,
        spatialIndexTimeMs: Math.round((this.performanceStats.spatialIndexTimeMs * 0.7 + (t1 - t0) * 0.3) * 100) / 100,
      };
    }

    // 1. Grid
    const minorSpacing = 24;
    const majorSpacing = 120;
    const startX = Math.floor(visibleBounds.minX / minorSpacing) * minorSpacing;
    const endX = Math.ceil(visibleBounds.maxX / minorSpacing) * minorSpacing;
    const startY = Math.floor(visibleBounds.minY / minorSpacing) * minorSpacing;
    const endY = Math.ceil(visibleBounds.maxY / minorSpacing) * minorSpacing;

    ctx.lineWidth = 1 / this.camera.zoom;
    if (this.camera.zoom > 0.4) {
      ctx.strokeStyle = 'rgba(56, 64, 82, 0.25)';
      ctx.beginPath();
      for (let x = startX; x <= endX; x += minorSpacing) {
        if (x % majorSpacing !== 0) {
          ctx.moveTo(x, visibleBounds.minY);
          ctx.lineTo(x, visibleBounds.maxY);
        }
      }
      for (let y = startY; y <= endY; y += minorSpacing) {
        if (y % majorSpacing !== 0) {
          ctx.moveTo(visibleBounds.minX, y);
          ctx.lineTo(visibleBounds.maxX, y);
        }
      }
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(89, 102, 128, 0.35)';
    ctx.beginPath();
    const majorStartX = Math.floor(visibleBounds.minX / majorSpacing) * majorSpacing;
    const majorEndX = Math.ceil(visibleBounds.maxX / majorSpacing) * majorSpacing;
    const majorStartY = Math.floor(visibleBounds.minY / majorSpacing) * majorSpacing;
    const majorEndY = Math.ceil(visibleBounds.maxY / majorSpacing) * majorSpacing;
    for (let x = majorStartX; x <= majorEndX; x += majorSpacing) {
      ctx.moveTo(x, visibleBounds.minX);
      ctx.lineTo(x, visibleBounds.maxX);
    }
    for (let y = majorStartY; y <= majorEndY; y += majorSpacing) {
      ctx.moveTo(visibleBounds.minX, y);
      ctx.lineTo(visibleBounds.maxX, y);
    }
    ctx.stroke();

    // 2. Groups
    for (const group of this.groups) {
      const groupNodes = this.nodes.filter((node) => group.nodeIds.includes(node.id));
      if (groupNodes.length === 0) continue;

      let gMinX = Infinity;
      let gMinY = Infinity;
      let gMaxX = -Infinity;
      let gMaxY = -Infinity;

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
      const groupBg = group.backgroundColor ?? (group.color ? `${group.color}25` : 'rgba(88, 166, 255, 0.12)');
      const groupBorder = group.color ?? '#58a6ff';
      ctx.fillStyle = groupBg;
      ctx.strokeStyle = groupBorder;
      ctx.lineWidth = 2 / this.camera.zoom;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.roundRect(gx, gy, gw, gh, 12);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = groupBorder;
      ctx.font = 'bold 12px sans-serif';
      const labelW = ctx.measureText(group.title).width;
      ctx.beginPath();
      ctx.roundRect(gx + 10, gy + 4, labelW + 16, 20, 4);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(group.title, gx + 18, gy + 18);
      ctx.restore();
    }

    // 3. Edges
    const nodeMap = new Map<string, FlintGraphNode>(this.nodes.map((n) => [n.id, n]));
    for (const edge of this.edges) {
      const fromNode = nodeMap.get(edge.fromNodeId);
      const toNode = nodeMap.get(edge.toNodeId);
      if (!fromNode || !toNode) continue;

      const fromPortIndex = Math.max(
        0,
        fromNode.outputs.findIndex((p) => p.id === edge.fromPortId),
      );
      const toPortIndex = Math.max(
        0,
        toNode.inputs.findIndex((p) => p.id === edge.toPortId),
      );

      const p0x = fromNode.position.x + NODE_WIDTH;
      const p0y = fromNode.position.y + NODE_HEADER_HEIGHT + fromPortIndex * PORT_ROW_HEIGHT + 14;
      const p3x = toNode.position.x;
      const p3y = toNode.position.y + NODE_HEADER_HEIGHT + toPortIndex * PORT_ROW_HEIGHT + 14;

      const wasm = getFlintRenderWorkerWasm();
      const dx = wasm.bezier_control_dx(Math.round(p0x), Math.round(p3x));
      const p1x = p0x + dx;
      const p1y = p0y;
      const p2x = p3x - dx;
      const p2y = p3y;

      const pulseOffset = this.edgePulses.get(edge.id);
      const isPulseActive = pulseOffset !== undefined;
      const isSelected = this.selectedEdgeIds.has(edge.id);

      ctx.save();
      if (isSelected) {
        ctx.strokeStyle = '#58a6ff';
        ctx.lineWidth = 4.5 / this.camera.zoom;
        ctx.shadowColor = 'rgba(88, 166, 255, 0.9)';
        ctx.shadowBlur = 10;
      } else if (isPulseActive) {
        ctx.strokeStyle = '#3fb950';
        ctx.lineWidth = 4 / this.camera.zoom;
        ctx.shadowColor = 'rgba(63, 185, 80, 0.9)';
        ctx.shadowBlur = 10;
      } else {
        ctx.strokeStyle = '#79a8ff';
        ctx.lineWidth = 3.2 / this.camera.zoom;
        ctx.shadowColor = 'rgba(121, 168, 255, 0.35)';
        ctx.shadowBlur = 4;
      }
      ctx.beginPath();
      ctx.moveTo(p0x, p0y);
      ctx.bezierCurveTo(p1x, p1y, p2x, p2y, p3x, p3y);
      ctx.stroke();

      if (isPulseActive && pulseOffset !== undefined) {
        const t = Math.max(0, Math.min(1, pulseOffset));
        const tPermille = Math.round(t * 1000);
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
        ctx.shadowColor = '#58a6ff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(pulseX, pulseY, 6 / this.camera.zoom, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 4. Connecting Edge (in-flight drag between pins)
    if (this.connectingEdge) {
      const fromNode = nodeMap.get(this.connectingEdge.fromNodeId);
      if (fromNode) {
        const outIdx = fromNode.outputs.findIndex((p) => p.id === this.connectingEdge?.fromPortId);
        const inIdx = fromNode.inputs.findIndex((p) => p.id === this.connectingEdge?.fromPortId);

        let p0x = fromNode.position.x + NODE_WIDTH;
        let p0y = fromNode.position.y + NODE_HEADER_HEIGHT + 14;

        if (outIdx !== -1) {
          p0x = fromNode.position.x + NODE_WIDTH;
          p0y = fromNode.position.y + NODE_HEADER_HEIGHT + outIdx * PORT_ROW_HEIGHT + 14;
        } else if (inIdx !== -1) {
          p0x = fromNode.position.x;
          p0y = fromNode.position.y + NODE_HEADER_HEIGHT + inIdx * PORT_ROW_HEIGHT + 14;
        }

        const p3x = this.connectingEdge.cursorX;
        const p3y = this.connectingEdge.cursorY;
        const dx = Math.max(Math.abs(p3x - p0x) * 0.5, 40);

        ctx.save();
        ctx.strokeStyle = '#58a6ff';
        ctx.lineWidth = 2.5 / this.camera.zoom;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(p0x, p0y);
        ctx.bezierCurveTo(p0x + dx, p0y, p3x - dx, p3y, p3x, p3y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#58a6ff';
        ctx.beginPath();
        ctx.arc(p3x, p3y, 5 / this.camera.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 5. Nodes
    const visibleNodes = this.nodes.filter((n) => visibleNodeIds.has(n.id));

    for (const node of visibleNodes) {
      const bounds = getNodeBounds(node);
      const w = bounds.maxX - bounds.minX;
      const h = bounds.maxY - bounds.minY;
      const x = bounds.minX;
      const y = bounds.minY;

      const isSelected = this.selectedNodeIds.has(node.id);
      const isActive = this.activeNodeIds.has(node.id);
      const isTrapped = this.trappedNodeId === node.id;
      const isMeta = node.metaSubgraph !== undefined || node.operation === 'meta';

      ctx.save();
      if (isTrapped) {
        ctx.shadowColor = '#f85149';
        ctx.shadowBlur = 14;
      } else if (isActive) {
        ctx.shadowColor = '#3fb950';
        ctx.shadowBlur = 14;
      } else if (isSelected) {
        ctx.shadowColor = '#58a6ff';
        ctx.shadowBlur = 10;
      }

      ctx.fillStyle = isMeta ? '#161e2e' : '#21262d';
      ctx.strokeStyle = isTrapped
        ? '#f85149'
        : isActive
          ? '#3fb950'
          : isSelected
            ? '#58a6ff'
            : isMeta
              ? '#79c0ff'
              : '#30363d';
      ctx.lineWidth = (isSelected || isTrapped || isActive ? 2.5 : 1.5) / this.camera.zoom;

      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, 8);
      } else {
        ctx.rect(x, y, w, h);
      }
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Node Header
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, w, NODE_HEADER_HEIGHT, [8, 8, 0, 0]);
      ctx.fillStyle = isTrapped ? '#3d1417' : isActive ? '#143d22' : isMeta ? '#0d2847' : '#161b22';
      ctx.fill();

      // Title
      ctx.fillStyle = '#f0f6fc';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(node.title, x + 10, y + 17);

      // Category / Meta pill
      ctx.fillStyle = isMeta ? '#58a6ff' : '#8b949e';
      ctx.font = '10px monospace';
      const catText = isMeta ? `META (${node.metaSubgraph?.nodes.length ?? 0})` : node.category.toUpperCase();
      const catWidth = ctx.measureText(catText).width;
      ctx.fillText(catText, x + w - catWidth - 10, y + 17);

      // Subtitle operation identifier
      ctx.fillStyle = '#8b949e';
      ctx.font = '9px monospace';
      ctx.fillText(node.operation, x + 10, y + 28);

      // Port circles (Pins) and labels
      ctx.font = '11px sans-serif';
      for (const [idx, port] of node.inputs.entries()) {
        const portY = y + NODE_HEADER_HEIGHT + idx * PORT_ROW_HEIGHT + 14;
        const isHovered = this.hoveredPort?.nodeId === node.id && this.hoveredPort.portId === port.id;

        // Input Pin (Outer ring + inner core)
        ctx.save();
        ctx.fillStyle = '#161b22';
        ctx.strokeStyle = isHovered ? '#58a6ff' : '#58a6ff';
        ctx.lineWidth = (isHovered ? 2.5 : 1.5) / this.camera.zoom;
        ctx.beginPath();
        ctx.arc(x, portY, 5 / this.camera.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isHovered ? '#ffffff' : '#58a6ff';
        ctx.beginPath();
        ctx.arc(x, portY, 2.5 / this.camera.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Label
        ctx.fillStyle = '#c9d1d9';
        ctx.fillText(port.name, x + 12, portY + 4);
      }

      for (const [idx, port] of node.outputs.entries()) {
        const portY = y + NODE_HEADER_HEIGHT + idx * PORT_ROW_HEIGHT + 14;
        const isHovered = this.hoveredPort?.nodeId === node.id && this.hoveredPort.portId === port.id;

        // Output Pin (Outer ring + inner core)
        ctx.save();
        ctx.fillStyle = '#161b22';
        ctx.strokeStyle = isHovered ? '#3fb950' : '#3fb950';
        ctx.lineWidth = (isHovered ? 2.5 : 1.5) / this.camera.zoom;
        ctx.beginPath();
        ctx.arc(x + w, portY, 5 / this.camera.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isHovered ? '#ffffff' : '#3fb950';
        ctx.beginPath();
        ctx.arc(x + w, portY, 2.5 / this.camera.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Label
        ctx.fillStyle = '#c9d1d9';
        const labelWidth = ctx.measureText(port.name).width;
        ctx.fillText(port.name, x + w - labelWidth - 12, portY + 4);
      }

      // Literal properties preview
      if (node.properties && Object.keys(node.properties).length > 0) {
        const propKeys = Object.keys(node.properties);
        const firstVal = String(node.properties[propKeys[0]]);
        ctx.fillStyle = '#58a6ff';
        ctx.font = '10px monospace';
        ctx.fillText(`= ${firstVal}`, x + 10, y + h - 8);
      }

      ctx.restore();
    }

    ctx.restore();
    const t2 = typeof performance === 'undefined' ? 0 : performance.now();
    if (t0 > 0) {
      this.performanceStats = {
        ...this.performanceStats,
        drawPassTimeMs: Math.round((this.performanceStats.drawPassTimeMs * 0.7 + (t2 - t1) * 0.3) * 100) / 100,
        visibleNodesCount: visibleNodeIds.size,
        visibleEdgesCount: this.edges.length,
        visiblePinsCount: visibleNodeIds.size * 4,
      };
    }
  }
}

// Dedicated OffscreenCanvas Web Worker message listener
if (
  globalThis.self !== undefined &&
  typeof (globalThis as unknown as { postMessage?: unknown }).postMessage === 'function'
) {
  let engine: FlintRenderEngine | undefined;

  globalThis.self.addEventListener('message', async (event: MessageEvent<RenderWorkerInputMessage>) => {
    const msg = event.data;

    try {
      switch (msg.type) {
        case 'init': {
          if (msg.canvas) {
            engine = new FlintRenderEngine(msg.width ?? 800, msg.height ?? 600);
            await engine.initialize(msg.canvas, msg.dpr);
            globalThis.self.postMessage({
              type: 'ready',
              performance: engine.getPerformanceStats(),
            } as RenderWorkerOutputMessage);
          }
          break;
        }
        case 'set_graph': {
          if (engine && msg.nodes && msg.edges) {
            engine.setGraph(msg.nodes, msg.edges, msg.groups ?? []);
          }
          break;
        }
        case 'pan': {
          if (engine && msg.deltaX !== undefined && msg.deltaY !== undefined) {
            engine.pan(msg.deltaX, msg.deltaY);
          }
          break;
        }
        case 'zoom': {
          if (engine && msg.factor !== undefined) {
            engine.zoom(msg.factor, msg.cursorX, msg.cursorY);
          }
          break;
        }
        case 'resize': {
          if (engine && msg.width !== undefined && msg.height !== undefined) {
            engine.resize(msg.width, msg.height, msg.dpr);
          }
          break;
        }
        case 'set_selection': {
          if (engine && msg.selectedNodeIds) {
            engine.setSelection(msg.selectedNodeIds, msg.selectedEdgeIds ?? []);
          }
          break;
        }
        case 'set_pulse': {
          if (engine && msg.edgeId && msg.progress !== undefined) {
            engine.setEdgePulse(msg.edgeId, msg.progress);
          }
          break;
        }
        case 'hit_test': {
          if (engine && msg.cursorX !== undefined && msg.cursorY !== undefined) {
            const hit = engine.hitTestSync(msg.cursorX, msg.cursorY);
            globalThis.self.postMessage({
              type: 'hit_test_result',
              hit,
              requestId: msg.requestId,
            } as RenderWorkerOutputMessage);
          }
          break;
        }
      }
    } catch (error) {
      globalThis.self.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      } as RenderWorkerOutputMessage);
    }
  });
}
