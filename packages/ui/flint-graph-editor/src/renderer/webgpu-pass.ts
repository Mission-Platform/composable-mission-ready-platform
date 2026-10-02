import { getNodeBounds } from './camera';
import { computeWebGpuNodeGlowAndBorder, getCategoryRgba, getPortTypeRgba, parseColorToRgba } from './color';
import { NODE_HEADER_HEIGHT, NODE_WIDTH, PORT_ROW_HEIGHT } from './constants';
import { EDGES_WGSL, GRID_WGSL, NODES_WGSL, TEXT_WGSL } from './shaders';

import type {
  FlintRenderWorkerWasmExports,
  GPUBindGroup,
  GPUBindGroupLayout,
  GPUBuffer,
  GPUCanvasContext,
  GPUDevice,
  GPUPipelineLayout,
  GPURenderPassEncoder,
  GPURenderPipeline,
  GPUTextureFormat,
  WebGpuNavigator,
} from './types';
import type { RenderWorkerState } from './worker-state';
import type { FlintGraphNode } from '@mission-platform/flint';

/**
 * Enqueues an instanced WebGPU node rectangle with position, size, borders, and glow.
 */
export function pushGpuNodeInstance(
  state: RenderWorkerState,
  posX: number,
  posY: number,
  width: number,
  height: number,
  radius: number,
  fillRgba: readonly [number, number, number, number],
  borderRgba: readonly [number, number, number, number] = [0, 0, 0, 0],
  borderWidth = 0,
  glowRgba: readonly [number, number, number, number] = [0, 0, 0, 0],
): void {
  state.nodeInstanceFloats.push(
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
}

/**
 * Enqueues an instanced WebGPU port pin circle with fill and optional selection border.
 */
export function pushGpuPinInstance(
  state: RenderWorkerState,
  posX: number,
  posY: number,
  radius: number,
  fillRgba: readonly [number, number, number, number],
  borderWidth = 0,
  borderRgba: readonly [number, number, number, number] = [0, 0, 0, 0],
): void {
  state.pinInstanceFloats.push(
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
}

/**
 * Packs camera view projection matrix and viewport uniforms into a Float32Array.
 */
export function packCameraUniforms(w: FlintRenderWorkerWasmExports, theme: string): Float32Array {
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

/**
 * Allocates or reuses GPU instancing buffer ensuring required byte capacity.
 */
export function ensureGpuInstanceBuffer(
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
export function uploadGpuInstanceData(
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

function calculateClampedInstances(
  floatsLength: number,
  bufferSize: number,
  strideFloats: number,
  maxCount?: number,
): number {
  const maxInstances = Math.floor(bufferSize / (strideFloats * 4));
  const availableInstances = Math.floor(floatsLength / strideFloats);
  const clampedCount = maxCount === undefined ? availableInstances : Math.min(maxCount, availableInstances);
  return Math.min(clampedCount, maxInstances);
}

/**
 * Configures pipeline state and issues instanced WebGPU draw calls.
 */
export function executeGpuInstancedDraw(
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
  const actualCount = calculateClampedInstances(floats.length, instanceBuffer.size, strideFloats, maxCount);
  if (actualCount === 0) return;
  passEncoder.setPipeline(pipeline);
  passEncoder.setBindGroup(0, cameraGroup);
  passEncoder.setVertexBuffer(0, instanceBuffer);
  passEncoder.draw(vertexCount, actualCount, 0, 0);
}

/**
 * Flushes WebGPU text vertex buffer and executes text draw calls.
 */
export function flushWebGpuTextBatch(state: RenderWorkerState): void {
  const encoder = state.currentPassEncoder;
  const device = state.gpuDevice;
  if (!encoder || !state.textPipeline || !state.cameraBindGroup || !state.fontBindGroup || !device) return;
  if (state.webGpuTextVertices.length === 0) return;

  const requiredBytes = state.webGpuTextVertices.length * 4;
  state.textVertexBuffer = ensureGpuInstanceBuffer(state.textVertexBuffer, requiredBytes, device);
  device.queue.writeBuffer(state.textVertexBuffer, 0, new Float32Array(state.webGpuTextVertices));
  encoder.setPipeline(state.textPipeline);
  encoder.setBindGroup(0, state.cameraBindGroup);
  encoder.setBindGroup(1, state.fontBindGroup);
  encoder.setVertexBuffer(0, state.textVertexBuffer);
  encoder.draw(state.webGpuTextVertices.length / 8, 1, 0, 0);
}

/**
 * Resets existing WebGPU buffers, samplers, and pipelines when switching devices.
 */
export function resetWebGpuPipelines(state: RenderWorkerState): void {
  state.nodeInstanceBuffer?.destroy();
  state.nodeInstanceBuffer = undefined;
  state.edgeInstanceBuffer?.destroy();
  state.edgeInstanceBuffer = undefined;
  state.pinInstanceBuffer?.destroy();
  state.pinInstanceBuffer = undefined;
  state.textVertexBuffer?.destroy();
  state.textVertexBuffer = undefined;
  state.fontTexture?.destroy?.();
  state.fontTexture = undefined;
  state.fontSampler = undefined;
  state.fontBindGroup = undefined;
  state.textPipeline = undefined;
  state.cameraBuffer?.destroy();
  state.cameraBuffer = undefined;
  state.cameraBindGroup = undefined;
  state.gridPipeline = undefined;
  state.nodesPipeline = undefined;
  state.edgesPipeline = undefined;
}

/**
 * Creates WebGPU geometry and grid render pipelines.
 */
export function createWebGpuGeometryPipelines(
  state: RenderWorkerState,
  device: GPUDevice,
  pipelineLayout: GPUPipelineLayout,
  format: GPUTextureFormat,
): void {
  const gridModule = device.createShaderModule({ code: GRID_WGSL });
  state.gridPipeline = device.createRenderPipeline({
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
  state.nodesPipeline = device.createRenderPipeline({
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
  state.edgesPipeline = device.createRenderPipeline({
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
 * Resolves font atlas texture data buffer from WebAssembly exports.
 */
function resolveFontTextureData(wasm: FlintRenderWorkerWasmExports | undefined, atlasSize: number): Uint8Array {
  const atlasPtr = wasm ? wasm.font_get_atlas_ptr() : 0;
  if (wasm && atlasPtr > 0) {
    return new Uint8Array(wasm.memory.buffer, atlasPtr, atlasSize * atlasSize * 4);
  }
  return new Uint8Array(atlasSize * atlasSize * 4);
}

/**
 * Initializes WebGPU font atlas texture and SDF text pipeline.
 */
export function setupWebGpuFontPipeline(
  state: RenderWorkerState,
  device: GPUDevice,
  cameraBindGroupLayout: GPUBindGroupLayout,
  format: GPUTextureFormat,
): void {
  const wasm = state.wasm;
  const atlasSize = wasm ? wasm.font_get_atlas_size() : 1024;
  const rgbaData = resolveFontTextureData(wasm, atlasSize);

  state.fontTexture = device.createTexture({
    size: [atlasSize, atlasSize, 1],
    format: 'rgba8unorm',
    usage: 0x00_04 | 0x00_02,
  });
  device.queue.writeTexture(
    { texture: state.fontTexture },
    rgbaData,
    { bytesPerRow: atlasSize * 4, rowsPerImage: atlasSize },
    [atlasSize, atlasSize, 1],
  );
  state.fontSampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
  });
  const fontBindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: 2, texture: { sampleType: 'float' } },
      { binding: 1, visibility: 2, sampler: { type: 'filtering' } },
    ],
  });
  if (state.fontTexture && state.fontSampler) {
    state.fontBindGroup = device.createBindGroup({
      layout: fontBindGroupLayout,
      entries: [
        { binding: 0, resource: state.fontTexture.createView() },
        { binding: 1, resource: state.fontSampler },
      ],
    });
  }

  const textPipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [cameraBindGroupLayout, fontBindGroupLayout],
  });
  const textModule = device.createShaderModule({ code: TEXT_WGSL });
  state.textPipeline = device.createRenderPipeline({
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
 * Requests WebGPU hardware adapter and logical device.
 */
async function requestGpuDevice(nav: WebGpuNavigator): Promise<GPUDevice | undefined> {
  if (!nav.gpu) return undefined;
  const adapter = await nav.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) return undefined;
  return adapter.requestDevice();
}

/**
 * Initializes camera uniform buffers and pipeline bind groups.
 */
function setupGpuCameraBuffers(
  state: RenderWorkerState,
  device: GPUDevice,
): { cameraBindGroupLayout: GPUBindGroupLayout; pipelineLayout: GPUPipelineLayout } {
  const cameraBindGroupLayout = device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: 3, buffer: { type: 'uniform' } }],
  });
  const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [cameraBindGroupLayout] });

  state.cameraBuffer = device.createBuffer({ size: 256, usage: 0x00_40 | 0x00_08 });
  state.cameraBindGroup = device.createBindGroup({
    layout: cameraBindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: state.cameraBuffer } }],
  });
  return { cameraBindGroupLayout, pipelineLayout };
}

/**
 * Initializes the WebGPU device, swapchain context, pipelines, and uniform bind groups.
 */
export async function initWebGpuBackend(
  state: RenderWorkerState,
  targetCanvas: OffscreenCanvas | HTMLCanvasElement,
): Promise<boolean> {
  try {
    const nav = typeof navigator === 'undefined' ? undefined : (navigator as unknown as WebGpuNavigator);
    if (!nav?.gpu) return false;
    const device = await requestGpuDevice(nav);
    if (!device) return false;
    const canvasObj = targetCanvas as unknown as { getContext(id: string): GPUCanvasContext | null };
    const context = canvasObj.getContext('webgpu');
    if (!context) return false;
    const format = (
      nav.gpu.getPreferredCanvasFormat ? nav.gpu.getPreferredCanvasFormat() : 'bgra8unorm'
    ) as GPUTextureFormat;
    context.configure({ device, format, alphaMode: 'premultiplied' });

    if (state.gpuDevice !== device) {
      resetWebGpuPipelines(state);
    }

    state.gpuDevice = device;
    state.gpuContext = context;

    const { cameraBindGroupLayout, pipelineLayout } = setupGpuCameraBuffers(state, device);
    createWebGpuGeometryPipelines(state, device, pipelineLayout, format);
    setupWebGpuFontPipeline(state, device, cameraBindGroupLayout, format);

    return true;
  } catch {
    return false;
  }
}

interface GroupBoundingBoxGpu {
  readonly gx: number;
  readonly gy: number;
  readonly gw: number;
  readonly gh: number;
}

/**
 * Computes bounding rectangle enclosing nodes inside a WebGPU group.
 */
function computeGroupBoundsGpu(groupNodes: readonly FlintGraphNode[]): GroupBoundingBoxGpu {
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
  const pad = 24;
  return {
    gx: gMinX - pad,
    gy: gMinY - pad - 22,
    gw: gMaxX - gMinX + pad * 2,
    gh: gMaxY - gMinY + pad * 2 + 22,
  };
}

/**
 * Resolves color tuples for WebGPU group background, border, and title badges.
 */
function resolveGpuGroupColors(
  group: { color?: string; backgroundColor?: string },
  isSelected: boolean,
  isDark: boolean,
): {
  bg: [number, number, number, number];
  border: [number, number, number, number];
  titleBg: [number, number, number, number];
} {
  const defaultBorder: [number, number, number, number] = isDark ? [0.35, 0.65, 1, 1] : [0.035, 0.412, 0.855, 1];
  const parsedColor = parseColorToRgba(group.color, defaultBorder);
  const fallbackBg: [number, number, number, number] = [
    parsedColor[0],
    parsedColor[1],
    parsedColor[2],
    isDark ? 0.12 : 0.08,
  ];
  const groupBg = parseColorToRgba(group.backgroundColor, fallbackBg);
  const groupBorder: [number, number, number, number] = isSelected
    ? [1, 1, 1, 1]
    : [parsedColor[0], parsedColor[1], parsedColor[2], isDark ? 0.7 : 0.6];
  return {
    bg: groupBg,
    border: groupBorder,
    titleBg: [parsedColor[0], parsedColor[1], parsedColor[2], 0.9],
  };
}

/**
 * Prepares WebGPU instance and text quads for an individual node group.
 */
function prepareSingleWebGpuGroup(
  state: RenderWorkerState,
  group: FlintGraphNode extends never ? never : { id: string; title: string; color?: string; backgroundColor?: string },
  box: GroupBoundingBoxGpu,
  isDark: boolean,
  isSelectedGroup: boolean,
  wasmEngine: FlintRenderWorkerWasmExports,
): void {
  const { gx, gy, gw, gh } = box;
  const colors = resolveGpuGroupColors(group, isSelectedGroup, isDark);

  pushGpuNodeInstance(state, gx + gw / 2, gy + gh / 2, gw, gh, 12, colors.bg, colors.border, isSelectedGroup ? 3.5 : 2);

  const titleW = wasmEngine.font_measure_text(group.title, 12);
  const pillW = titleW + 16;
  pushGpuNodeInstance(
    state,
    gx + 10 + pillW / 2,
    gy + 4 + 10,
    pillW,
    20,
    4,
    colors.titleBg,
    isSelectedGroup ? [1, 1, 1, 1] : undefined,
    isSelectedGroup ? 1.5 : 0,
  );
  wasmEngine.font_append_text_quads(group.title, gx + 18, gy + 18, 12, 1, 1, 1, 1, 0);
}

/**
 * Determines whether WebGPU group bounding box lies completely outside viewport.
 */
function isGpuBoxOutsideViewport(
  box: GroupBoundingBoxGpu,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): boolean {
  if (box.gx + box.gw < minX || box.gx > maxX) return true;
  return box.gy + box.gh < minY || box.gy > maxY;
}

/**
 * Prepares instanced WebGPU geometry and text quads for node groups.
 */
export function prepareWebGpuGroupInstances(
  state: RenderWorkerState,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  isDark: boolean,
  selectedGroupIdVal: string | undefined,
  wasmEngine: FlintRenderWorkerWasmExports,
): void {
  for (const group of state.groups) {
    const groupNodes = state.nodes.filter((n) => group.nodeIds.includes(n.id));
    if (groupNodes.length === 0) continue;
    const box = computeGroupBoundsGpu(groupNodes);
    if (isGpuBoxOutsideViewport(box, minX, minY, maxX, maxY)) continue;
    prepareSingleWebGpuGroup(state, group, box, isDark, selectedGroupIdVal === group.id, wasmEngine);
  }
}

/**
 * Prepares WebGPU pin geometry instances and halo circles.
 */
function prepareSingleGpuPin(
  state: RenderWorkerState,
  px: number,
  py: number,
  isHovered: boolean,
  portType: unknown,
  isDark: boolean,
): void {
  const pinRadius = isHovered ? 7 : 5;
  const portColor = getPortTypeRgba(portType, isDark);
  const pinInnerBg: [number, number, number, number] = isDark ? [0.086, 0.106, 0.133, 1] : [0.941, 0.949, 0.961, 1];

  pushGpuPinInstance(state, px, py, pinRadius, pinInnerBg, 1.5, portColor);
  pushGpuPinInstance(state, px, py, 2.5, isHovered ? [1, 1, 1, 1] : portColor);
}

/**
 * Prepares WebGPU input port pins and names.
 */
function prepareWebGpuInputPins(
  state: RenderWorkerState,
  node: FlintGraphNode,
  isDark: boolean,
  hoveredPortInfo: typeof state.hoveredPort,
  wasmEngine: FlintRenderWorkerWasmExports,
): number {
  let pinCount = 0;
  for (const [idx, port] of (node.inputs ?? []).entries()) {
    const py = node.position.y + NODE_HEADER_HEIGHT + idx * PORT_ROW_HEIGHT + 14;
    const isHovered = hoveredPortInfo?.nodeId === node.id && hoveredPortInfo?.portId === port.id;
    prepareSingleGpuPin(state, node.position.x, py, isHovered, port.type, isDark);
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
  return pinCount;
}

/**
 * Prepares WebGPU output port pins and names.
 */
function prepareWebGpuOutputPins(
  state: RenderWorkerState,
  node: FlintGraphNode,
  isDark: boolean,
  hoveredPortInfo: typeof state.hoveredPort,
  wasmEngine: FlintRenderWorkerWasmExports,
): number {
  let pinCount = 0;
  for (const [idx, port] of (node.outputs ?? []).entries()) {
    const py = node.position.y + NODE_HEADER_HEIGHT + idx * PORT_ROW_HEIGHT + 14;
    const isHovered = hoveredPortInfo?.nodeId === node.id && hoveredPortInfo?.portId === port.id;
    prepareSingleGpuPin(state, node.position.x + NODE_WIDTH, py, isHovered, port.type, isDark);
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
 * Prepares port pins and labels for a WebGPU node instance.
 */
export function prepareWebGpuNodePins(
  state: RenderWorkerState,
  node: FlintGraphNode,
  isDark: boolean,
  hoveredPortInfo: typeof state.hoveredPort,
  wasmEngine: FlintRenderWorkerWasmExports,
): number {
  const inPins = prepareWebGpuInputPins(state, node, isDark, hoveredPortInfo, wasmEngine);
  const outPins = prepareWebGpuOutputPins(state, node, isDark, hoveredPortInfo, wasmEngine);
  return inPins + outPins;
}

const GPU_HEADER_COLORS_DARK: Readonly<Record<string, readonly [number, number, number, number]>> = {
  trapped: [0.239, 0.078, 0.09, 1],
  active: [0.078, 0.239, 0.133, 1],
  meta: [0.051, 0.157, 0.278, 1],
  default: [0.086, 0.106, 0.133, 1],
};

const GPU_HEADER_COLORS_LIGHT: Readonly<Record<string, readonly [number, number, number, number]>> = {
  trapped: [0.996, 0.886, 0.886, 1],
  active: [0.863, 0.988, 0.906, 1],
  meta: [0.882, 0.925, 0.969, 1],
  default: [0.941, 0.949, 0.961, 1],
};

/**
 * Computes WebGPU node header background RGBA color channels.
 */
function getGpuHeaderColor(
  isTrapped: boolean,
  isActive: boolean,
  isMeta: boolean,
  isDark: boolean,
): [number, number, number, number] {
  const table = isDark ? GPU_HEADER_COLORS_DARK : GPU_HEADER_COLORS_LIGHT;
  if (isTrapped) return [...table.trapped];
  if (isActive) return [...table.active];
  if (isMeta) return [...table.meta];
  return [...table.default];
}

/**
 * Resolves node card fill RGBA channels for WebGPU background.
 */
function getGpuNodeFill(isMeta: boolean, isDark: boolean): [number, number, number, number] {
  if (isDark) {
    return isMeta ? [0.086, 0.118, 0.18, 0.95] : [0.129, 0.149, 0.176, 0.95];
  }
  return isMeta ? [0.941, 0.957, 0.973, 0.98] : [1, 1, 1, 0.98];
}

/**
 * Resolves category text color channels for WebGPU node header.
 */
function resolveGpuCategoryTextColor(isMeta: boolean, isDark: boolean): [number, number, number, number] {
  if (isMeta) {
    return isDark ? [0.345, 0.651, 1, 1] : [0.035, 0.412, 0.855, 1];
  }
  return isDark ? [0.545, 0.58, 0.62, 1] : [0.341, 0.376, 0.416, 1];
}

/**
 * Prepares WebGPU node header card, category strip, and titles.
 */
function prepareWebGpuNodeHeader(
  state: RenderWorkerState,
  node: FlintGraphNode,
  x: number,
  y: number,
  nodeWidth: number,
  isDark: boolean,
  isTrapped: boolean,
  isActive: boolean,
  isMeta: boolean,
  wasmEngine: FlintRenderWorkerWasmExports,
): void {
  const headerRgba = getGpuHeaderColor(isTrapped, isActive, isMeta, isDark);
  pushGpuNodeInstance(state, x + nodeWidth / 2, y + 16, nodeWidth - 2, 30, 4, headerRgba);

  const catColor = getCategoryRgba(node.category, isMeta, isDark);
  pushGpuNodeInstance(state, x + nodeWidth / 2, y + 3, nodeWidth - 4, 4, 2, catColor);

  const sepColor: [number, number, number, number] = isDark ? [0.188, 0.212, 0.239, 0.8] : [0.816, 0.843, 0.871, 0.8];
  pushGpuNodeInstance(state, x + nodeWidth / 2, y + NODE_HEADER_HEIGHT, nodeWidth - 2, 1, 0, sepColor);

  const titleColor = isDark ? [0.941, 0.965, 0.988, 1] : [0.122, 0.137, 0.157, 1];
  wasmEngine.font_append_text_quads(node.title, x + 10, y + 17, 12, titleColor[0], titleColor[1], titleColor[2], 1, 0);

  const catText = isMeta
    ? `META (${node.metaSubgraph?.nodes.length ?? 0})`
    : (node.category || 'OPERATION').toUpperCase();
  const catTextColor = resolveGpuCategoryTextColor(isMeta, isDark);
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
}

/**
 * Prepares WebGPU node property evaluation preview.
 */
function prepareWebGpuNodeProperties(
  node: FlintGraphNode,
  x: number,
  y: number,
  nodeHeight: number,
  isDark: boolean,
  wasmEngine: FlintRenderWorkerWasmExports,
): void {
  if (!node.properties || Object.keys(node.properties).length === 0) return;
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

/**
 * Prepares individual WebGPU node background, headers, category accent, and typography.
 */
export function prepareSingleWebGpuNode(
  state: RenderWorkerState,
  node: FlintGraphNode,
  isDark: boolean,
  hoveredPortInfo: typeof state.hoveredPort,
  wasmEngine: FlintRenderWorkerWasmExports,
): number {
  const bounds = getNodeBounds(node);
  const nodeWidth = bounds.maxX - bounds.minX;
  const nodeHeight = bounds.maxY - bounds.minY;
  const x = bounds.minX;
  const y = bounds.minY;

  const isSelected = state.selectedNodeIds.has(node.id);
  const isActive = state.activeNodeIds.has(node.id);
  const isTrapped = state.trappedNodeId === node.id;
  const isMeta = node.metaSubgraph !== undefined || node.operation === 'meta';

  const fillRgba = getGpuNodeFill(isMeta, isDark);
  const { borderR, borderG, borderB, borderA, borderWidth, glowR, glowG, glowB, glowA } =
    computeWebGpuNodeGlowAndBorder(isSelected ? 1 : 0, isActive ? 1 : 0, isTrapped ? 1 : 0, isDark);

  pushGpuNodeInstance(
    state,
    x + nodeWidth / 2,
    y + nodeHeight / 2,
    nodeWidth,
    nodeHeight,
    8,
    fillRgba,
    [borderR, borderG, borderB, borderA],
    borderWidth,
    [glowR, glowG, glowB, glowA],
  );

  prepareWebGpuNodeHeader(state, node, x, y, nodeWidth, isDark, isTrapped, isActive, isMeta, wasmEngine);
  const pinCount = prepareWebGpuNodePins(state, node, isDark, hoveredPortInfo, wasmEngine);
  prepareWebGpuNodeProperties(node, x, y, nodeHeight, isDark, wasmEngine);

  return pinCount;
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
 * Prepares instanced WebGPU geometry and SDF text quads for nodes.
 */
export function prepareWebGpuNodeInstances(
  state: RenderWorkerState,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  isDark: boolean,
  hoveredPortInfo: typeof state.hoveredPort,
  wasmEngine: FlintRenderWorkerWasmExports,
): { visibleNodesCount: number; visiblePinsCount: number } {
  let visibleNodesCount = 0;
  let visiblePinsCount = 0;

  for (const node of state.nodes) {
    const bounds = getNodeBounds(node);
    const nodeWidth = bounds.maxX - bounds.minX;
    const nodeHeight = bounds.maxY - bounds.minY;
    if (isNodeOutsideViewport(bounds.minX, bounds.minY, nodeWidth, nodeHeight, minX, minY, maxX, maxY)) continue;
    visibleNodesCount++;
    visiblePinsCount += prepareSingleWebGpuNode(state, node, isDark, hoveredPortInfo, wasmEngine);
  }

  return { visibleNodesCount, visiblePinsCount };
}

/**
 * Computes endpoint coordinates for a WebGPU graph edge.
 */
function computeGpuEdgeCoordinates(
  fromNode: FlintGraphNode,
  toNode: FlintGraphNode,
  fromPortId: string,
  toPortId: string,
): { p0x: number; p0y: number; p3x: number; p3y: number } {
  const fromPortIndex = Math.max(
    0,
    (fromNode.outputs ?? []).findIndex((p) => p.id === fromPortId),
  );
  const toPortIndex = Math.max(
    0,
    (toNode.inputs ?? []).findIndex((p) => p.id === toPortId),
  );
  return {
    p0x: fromNode.position.x + NODE_WIDTH,
    p0y: fromNode.position.y + NODE_HEADER_HEIGHT + fromPortIndex * PORT_ROW_HEIGHT + 14,
    p3x: toNode.position.x,
    p3y: toNode.position.y + NODE_HEADER_HEIGHT + toPortIndex * PORT_ROW_HEIGHT + 14,
  };
}

/**
 * Determines whether WebGPU edge endpoints lie completely outside viewport.
 */
function isGpuEdgeOutsideViewport(
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
 * Packs WebGPU instancing floats for an individual graph edge curve.
 */
function prepareSingleWebGpuEdge(
  state: RenderWorkerState,
  edge: FlintGraphNode extends never ? never : { id: string; points?: readonly { x: number; y: number }[] },
  p0x: number,
  p0y: number,
  p3x: number,
  p3y: number,
  isSelected: number,
  isActive: number,
  pulseOffset: number,
  wasmEngine: FlintRenderWorkerWasmExports,
): void {
  const pulseT = Math.round(pulseOffset * 1000);
  const pinFill: [number, number, number, number] = isSelected ? [0.35, 0.65, 1, 1] : [0.7, 0.7, 0.7, 1];
  const pinRadius = isSelected ? 6 : 4.5;

  let prevX = p0x;
  let prevY = p0y;
  for (const pt of edge.points ?? []) {
    wasmEngine.compute_edge_instance(prevX, prevY, pt.x, pt.y, isSelected, isActive, pulseT);
    pushGpuPinInstance(state, pt.x, pt.y, pinRadius, pinFill);
    prevX = pt.x;
    prevY = pt.y;
  }
  wasmEngine.compute_edge_instance(prevX, prevY, p3x, p3y, isSelected, isActive, pulseT);
}

/**
 * Prepares instanced WebGPU spline geometry for graph edges.
 */
export function prepareWebGpuEdgeInstances(
  state: RenderWorkerState,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  nodeMap: Map<string, FlintGraphNode>,
  wasmEngine: FlintRenderWorkerWasmExports,
): number {
  let visibleEdgesCount = 0;

  for (const edge of state.edges) {
    const fromNode = nodeMap.get(edge.fromNodeId);
    const toNode = nodeMap.get(edge.toNodeId);
    if (!fromNode || !toNode) continue;

    const { p0x, p0y, p3x, p3y } = computeGpuEdgeCoordinates(fromNode, toNode, edge.fromPortId, edge.toPortId);
    if (isGpuEdgeOutsideViewport(p0x, p0y, p3x, p3y, minX, minY, maxX, maxY)) continue;
    visibleEdgesCount++;

    const isSelected = state.selectedEdgeIds.has(edge.id) ? 1 : 0;
    const isActive = state.edgePulses.has(edge.id) ? 1 : 0;
    const pulseOffset = state.edgePulses.get(edge.id) ?? 0;

    prepareSingleWebGpuEdge(state, edge, p0x, p0y, p3x, p3y, isSelected, isActive, pulseOffset, wasmEngine);
  }

  return visibleEdgesCount;
}

/**
 * Computes source pin origin for connecting edge wire drag in WebGPU.
 */
function computeGpuConnectingSource(fromNode: FlintGraphNode, fromPortId?: string): { p0x: number; p0y: number } {
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
 * Resolves connecting wire hover target indicator color.
 */
function resolveConnectingHoverColor(isHovered: boolean, isDark: boolean): [number, number, number, number] {
  if (isHovered) {
    return isDark ? [0.247, 0.725, 0.314, 1] : [0.102, 0.498, 0.216, 1];
  }
  return isDark ? [0.345, 0.651, 1, 1] : [0.035, 0.412, 0.855, 1];
}

/**
 * Prepares in-flight interactive wire connection spline.
 */
export function prepareWebGpuConnectingEdge(
  state: RenderWorkerState,
  connectingEdgeInfo: typeof state.connectingEdge,
  nodeMap: Map<string, FlintGraphNode>,
  hoveredPortInfo: typeof state.hoveredPort,
  isDark: boolean,
  wasmEngine: FlintRenderWorkerWasmExports,
): void {
  if (!connectingEdgeInfo) return;
  const fromNode = nodeMap.get(connectingEdgeInfo.fromNodeId);
  if (!fromNode) return;

  const { p0x, p0y } = computeGpuConnectingSource(fromNode, connectingEdgeInfo.fromPortId);
  const p3x = connectingEdgeInfo.cursorX;
  const p3y = connectingEdgeInfo.cursorY;
  wasmEngine.compute_edge_instance(p0x, p0y, p3x, p3y, 1, 1, 0);

  const hoverColor = resolveConnectingHoverColor(Boolean(hoveredPortInfo), isDark);
  pushGpuPinInstance(state, p3x, p3y, 6, hoverColor);
}

/**
 * Prepares instanced WebGPU vertex buffers and text quads for active nodes, groups, edges, and pins.
 */
export function prepareWebGpuInstances(state: RenderWorkerState): void {
  if (!state.gpuContext || !state.cameraBuffer || !state.wasm) return;

  state.nodeInstanceFloats = [];
  state.edgeInstanceFloats = [];
  state.pinInstanceFloats = [];

  const wasm = state.wasm;
  wasm.font_clear_text_vertices();
  wasm.getViewportBounds(150);
  const minX = wasm.get_bounds_min_x();
  const minY = wasm.get_bounds_min_y();
  const maxX = wasm.get_bounds_max_x();
  const maxY = wasm.get_bounds_max_y();

  const isDark = state.currentTheme !== 'light';

  prepareWebGpuGroupInstances(state, minX, minY, maxX, maxY, isDark, state.selectedGroupId, wasm);

  const { visibleNodesCount, visiblePinsCount } = prepareWebGpuNodeInstances(
    state,
    minX,
    minY,
    maxX,
    maxY,
    isDark,
    state.hoveredPort,
    wasm,
  );

  const floatCount = wasm.font_get_vertex_float_count();
  const vbufPtr = wasm.font_get_vertex_buffer_ptr();
  const f64View = new Float64Array(wasm.memory.buffer, vbufPtr, floatCount);
  state.webGpuTextVertices = new Float32Array(f64View);

  const nodeMap = new Map<string, FlintGraphNode>(state.nodes.map((n) => [n.id, n]));
  const visibleEdgesCount = prepareWebGpuEdgeInstances(state, minX, minY, maxX, maxY, nodeMap, wasm);

  prepareWebGpuConnectingEdge(state, state.connectingEdge, nodeMap, state.hoveredPort, isDark, wasm);

  state.performanceStats = {
    ...state.performanceStats,
    visibleNodesCount,
    totalNodesCount: state.nodes.length,
    visibleEdgesCount,
    totalEdgesCount: state.edges.length,
    visiblePinsCount,
    totalPinsCount: state.nodes.length * 4,
    textQuadCount: floatCount / 8,
    backend: 'webgpu',
    isFallback: false,
  };
}

/**
 * Resolves WebGPU background clear color.
 */
function getGpuClearColor(isDark: boolean): { r: number; g: number; b: number; a: number } {
  if (isDark) return { r: 0.043, g: 0.071, b: 0.098, a: 1 };
  return { r: 0.961, g: 0.965, b: 0.973, a: 1 };
}

/**
 * Initiates WebGPU command encoder and render pass with clear color.
 */
function beginGpuRenderPass(state: RenderWorkerState): void {
  if (!state.gpuContext || !state.gpuDevice) return;
  state.currentCommandEncoder = state.gpuDevice.createCommandEncoder();
  const textureView = state.gpuContext.getCurrentTexture().createView();
  const isDark = state.currentTheme !== 'light';
  const clearValue = getGpuClearColor(isDark);

  state.currentPassEncoder = state.currentCommandEncoder.beginRenderPass({
    colorAttachments: [
      {
        view: textureView,
        clearValue,
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  });
}

/**
 * Creates WebGPU WebAssembly host capabilities object.
 */
export function createWebGpuCapabilities(state: RenderWorkerState): WebAssembly.Imports {
  return {
    'webgpu.upload_camera_buffer': {
      gpu_upload_camera_buffer: () => {
        if (!state.gpuContext || !state.cameraBuffer || !state.wasm || !state.gpuDevice) return;
        prepareWebGpuInstances(state);
        state.gpuDevice.queue.writeBuffer(state.cameraBuffer, 0, packCameraUniforms(state.wasm, state.currentTheme));
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
        const isDark = state.currentTheme !== 'light';
        const style = computeWebGpuNodeGlowAndBorder(isSelected, isActive, isTrapped, isDark);

        state.nodeInstanceFloats.push(
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
        r: number,
        g: number,
        b: number,
        a: number,
        widthVal: number,
        dashOffset: number,
        pulseOffset: number,
      ) => {
        state.edgeInstanceFloats.push(
          p0x,
          p0y,
          p1x,
          p1y,
          p2x,
          p2y,
          p3x,
          p3y,
          r,
          g,
          b,
          a,
          widthVal,
          dashOffset,
          pulseOffset,
        );
      },
    },
    'webgpu.write_pin_instance': {
      gpu_write_pin_instance: (posX: number, posY: number, radius: number, isHovered: number, isActive: number) => {
        const isDark = state.currentTheme !== 'light';
        const pinStyle = computeWebGpuNodeGlowAndBorder(0, isActive, isHovered, isDark);
        pushGpuPinInstance(
          state,
          posX,
          posY,
          radius,
          [pinStyle.fillR, pinStyle.fillG, pinStyle.fillB, pinStyle.fillA],
          pinStyle.borderWidth,
          [pinStyle.borderR, pinStyle.borderG, pinStyle.borderB, pinStyle.borderA],
        );
      },
    },
    'webgpu.upload_node_buffer': {
      gpu_upload_node_buffer: (count: number) => {
        state.nodeInstanceBuffer = uploadGpuInstanceData(
          state.gpuDevice,
          state.nodeInstanceBuffer,
          state.nodeInstanceFloats,
          18,
          count,
        );
      },
    },
    'webgpu.upload_edge_buffer': {
      gpu_upload_edge_buffer: (count: number) => {
        state.edgeInstanceBuffer = uploadGpuInstanceData(
          state.gpuDevice,
          state.edgeInstanceBuffer,
          state.edgeInstanceFloats,
          15,
          count,
        );
      },
    },
    'webgpu.upload_pin_buffer': {
      gpu_upload_pin_buffer: (count: number) => {
        state.pinInstanceBuffer = uploadGpuInstanceData(
          state.gpuDevice,
          state.pinInstanceBuffer,
          state.pinInstanceFloats,
          18,
          count,
        );
      },
    },
    'webgpu.render_begin': {
      gpu_render_begin: () => {
        beginGpuRenderPass(state);
      },
    },
    'webgpu.render_grid': {
      gpu_render_grid: () => {
        if (!state.currentPassEncoder || !state.gridPipeline || !state.cameraBindGroup) return;
        state.currentPassEncoder.setPipeline(state.gridPipeline);
        state.currentPassEncoder.setBindGroup(0, state.cameraBindGroup);
        state.currentPassEncoder.draw(6, 1, 0, 0);
      },
    },
    'webgpu.render_edges': {
      gpu_render_edges: (count: number) => {
        executeGpuInstancedDraw(
          state.currentPassEncoder,
          state.edgesPipeline,
          state.cameraBindGroup,
          state.edgeInstanceBuffer,
          state.edgeInstanceFloats,
          15,
          64,
          count,
        );
      },
    },
    'webgpu.render_nodes': {
      gpu_render_nodes: (count: number) => {
        executeGpuInstancedDraw(
          state.currentPassEncoder,
          state.nodesPipeline,
          state.cameraBindGroup,
          state.nodeInstanceBuffer,
          state.nodeInstanceFloats,
          18,
          6,
          count,
        );
      },
    },
    'webgpu.render_pins': {
      gpu_render_pins: (count: number) => {
        executeGpuInstancedDraw(
          state.currentPassEncoder,
          state.nodesPipeline,
          state.cameraBindGroup,
          state.pinInstanceBuffer,
          state.pinInstanceFloats,
          18,
          6,
          count,
        );
      },
    },
    'webgpu.render_end': {
      gpu_render_end: () => {
        if (!state.currentPassEncoder || !state.currentCommandEncoder || !state.gpuDevice) return;
        flushWebGpuTextBatch(state);
        state.currentPassEncoder.end();
        state.gpuDevice.queue.submit([state.currentCommandEncoder.finish()]);
        state.currentPassEncoder = undefined;
        state.currentCommandEncoder = undefined;
      },
    },
  };
}
