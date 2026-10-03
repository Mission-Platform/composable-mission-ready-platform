import { loadSync } from './render-worker.flint';

import type { FlintRenderWorkerWasmExports } from './types';

let cachedFlintWasm: FlintRenderWorkerWasmExports | undefined;

/**
 * Default fallback callback for unconfigured host capability imports.
 */
export const noopHostCapability = (): void => {
  /* no-op fallback capability import */
};

/**
 * Creates default host capability imports for WebAssembly initialization.
 */
export function createDefaultCapabilities(): WebAssembly.Imports {
  return {
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
}

/**
 * Instantiates or retrieves the cached native Flint WebAssembly render worker module.
 */
export function getFlintRenderWorkerWasm(imports?: WebAssembly.Imports): FlintRenderWorkerWasmExports {
  const defaultCapabilities = createDefaultCapabilities();

  if (imports !== undefined) {
    const merged: WebAssembly.Imports = { ...defaultCapabilities, ...imports };
    return loadSync(merged);
  }
  if (cachedFlintWasm === undefined) {
    cachedFlintWasm = loadSync(defaultCapabilities);
  }
  return cachedFlintWasm;
}
