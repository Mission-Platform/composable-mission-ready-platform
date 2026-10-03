import type {
  FlintPerformanceMetrics,
  FlintRenderWorkerWasmExports,
  GPUBindGroup,
  GPUBuffer,
  GPUCanvasContext,
  GPUCommandEncoder,
  GPUDevice,
  GPURenderPassEncoder,
  GPURenderPipeline,
  GPUSampler,
  GPUTexture,
  WebGLAttribLocations,
  WebGLTextAttribLocations,
  WebGLTextUniformLocations,
  WebGLUniformLocations,
} from './types';
import type { FlintGraphEdge, FlintGraphGroup, FlintGraphNode } from '@mission-platform/flint';

export interface RenderWorkerState {
  wasm: FlintRenderWorkerWasmExports | undefined;
  canvas: OffscreenCanvas | HTMLCanvasElement | undefined;
  width: number;
  height: number;
  dpr: number;
  backend: 'webgpu' | 'webgl' | 'canvas2d';

  nodes: readonly FlintGraphNode[];
  edges: readonly FlintGraphEdge[];
  groups: readonly FlintGraphGroup[];
  selectedNodeIds: Set<string>;
  selectedEdgeIds: Set<string>;
  activeNodeIds: Set<string>;
  trappedNodeId: string | undefined;
  edgePulses: Map<string, number>;
  hoveredPort: { readonly nodeId: string; readonly portId: string } | undefined;
  connectingEdge:
    | {
        readonly fromNodeId: string;
        readonly fromPortId: string;
        readonly cursorX: number;
        readonly cursorY: number;
      }
    | undefined;
  selectedGroupId: string | undefined;
  currentTheme: 'light' | 'dark';

  // WebGPU Resources
  gpuContext: GPUCanvasContext | undefined;
  gpuDevice: GPUDevice | undefined;
  cameraBuffer: GPUBuffer | undefined;
  cameraBindGroup: GPUBindGroup | undefined;
  gridPipeline: GPURenderPipeline | undefined;
  nodesPipeline: GPURenderPipeline | undefined;
  edgesPipeline: GPURenderPipeline | undefined;
  nodeInstanceBuffer: GPUBuffer | undefined;
  edgeInstanceBuffer: GPUBuffer | undefined;
  pinInstanceBuffer: GPUBuffer | undefined;
  currentCommandEncoder: GPUCommandEncoder | undefined;
  currentPassEncoder: GPURenderPassEncoder | undefined;
  nodeInstanceFloats: number[];
  edgeInstanceFloats: number[];
  pinInstanceFloats: number[];
  textPipeline: GPURenderPipeline | undefined;
  textVertexBuffer: GPUBuffer | undefined;
  fontTexture: GPUTexture | undefined;
  fontSampler: GPUSampler | undefined;
  fontBindGroup: GPUBindGroup | undefined;
  webGpuTextVertices: Float32Array;

  // WebGL Resources
  glCtx: WebGLRenderingContext | WebGL2RenderingContext | undefined;
  glProgram: WebGLProgram | undefined;
  glVertexBuffer: WebGLBuffer | undefined;
  glUniformLocations: WebGLUniformLocations | undefined;
  glAttribLocations: WebGLAttribLocations | undefined;
  glTextProgram: WebGLProgram | undefined;
  glTexVertexBuffer: WebGLBuffer | undefined;
  glFontTexture: WebGLTexture | undefined;
  glTextUniformLocations: WebGLTextUniformLocations | undefined;
  glTextAttribLocations: WebGLTextAttribLocations | undefined;
  lineVertices: number[];
  triVertices: number[];
  textTriVertices: Float32Array;

  // Canvas 2D Resources
  canvas2dCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | undefined;

  // Performance metrics & timing
  performanceStats: FlintPerformanceMetrics;
  lastFrameTimestamp: number;
  frameCount: number;
  fps: number;
}

/**
 * Creates and initializes default render worker state container.
 */
export function createRenderWorkerState(): RenderWorkerState {
  return {
    wasm: undefined,
    canvas: undefined,
    width: 800,
    height: 600,
    dpr: 1,
    backend: 'webgpu',

    nodes: [],
    edges: [],
    groups: [],
    selectedNodeIds: new Set<string>(),
    selectedEdgeIds: new Set<string>(),
    activeNodeIds: new Set<string>(),
    trappedNodeId: undefined,
    edgePulses: new Map<string, number>(),
    hoveredPort: undefined,
    connectingEdge: undefined,
    selectedGroupId: undefined,
    currentTheme: 'dark',

    gpuContext: undefined,
    gpuDevice: undefined,
    cameraBuffer: undefined,
    cameraBindGroup: undefined,
    gridPipeline: undefined,
    nodesPipeline: undefined,
    edgesPipeline: undefined,
    nodeInstanceBuffer: undefined,
    edgeInstanceBuffer: undefined,
    pinInstanceBuffer: undefined,
    currentCommandEncoder: undefined,
    currentPassEncoder: undefined,
    nodeInstanceFloats: [],
    edgeInstanceFloats: [],
    pinInstanceFloats: [],
    textPipeline: undefined,
    textVertexBuffer: undefined,
    fontTexture: undefined,
    fontSampler: undefined,
    fontBindGroup: undefined,
    webGpuTextVertices: new Float32Array(0),

    glCtx: undefined,
    glProgram: undefined,
    glVertexBuffer: undefined,
    glUniformLocations: undefined,
    glAttribLocations: undefined,
    glTextProgram: undefined,
    glTexVertexBuffer: undefined,
    glFontTexture: undefined,
    glTextUniformLocations: undefined,
    glTextAttribLocations: undefined,
    lineVertices: [],
    triVertices: [],
    textTriVertices: new Float32Array(0),

    canvas2dCtx: undefined,

    performanceStats: {
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
    },
    lastFrameTimestamp: 0,
    frameCount: 0,
    fps: 60,
  };
}
