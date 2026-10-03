import type { loadSync } from './render-worker.flint';
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

export type GPUTextureFormat = string;

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

export interface WebGpuNavigator {
  readonly gpu?: {
    requestAdapter(options?: Record<string, unknown>): Promise<GPUAdapter | null>;
    getPreferredCanvasFormat(): string;
  };
}

export interface WebGLUniformLocations {
  readonly u_resolution: WebGLUniformLocation | null;
  readonly u_camera: WebGLUniformLocation | null;
  readonly u_zoom: WebGLUniformLocation | null;
}

export interface WebGLAttribLocations {
  readonly a_position: number;
  readonly a_color: number;
}

export interface WebGLTextUniformLocations {
  readonly u_resolution: WebGLUniformLocation | null;
  readonly u_camera: WebGLUniformLocation | null;
  readonly u_zoom: WebGLUniformLocation | null;
  readonly u_fontTexture: WebGLUniformLocation | null;
}

export interface WebGLTextAttribLocations {
  readonly a_position: number;
  readonly a_uv: number;
  readonly a_color: number;
}
