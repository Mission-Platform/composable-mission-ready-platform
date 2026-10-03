import { getFlintRenderWorkerWasm } from './wasm';

import type { FlintCamera, FlintRenderWorkerWasmExports, ViewBounds } from './types';
import type { FlintGraphNode } from '@mission-platform/flint';

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
 * Evaluates cubic Bezier point for coordinate axis and step factor.
 */
export function evaluateCubicBezier(p0: number, p1: number, p2: number, p3: number, progressRatio: number): number {
  const inverseRatio = 1 - progressRatio;
  return (
    inverseRatio * inverseRatio * inverseRatio * p0 +
    3 * inverseRatio * inverseRatio * progressRatio * p1 +
    3 * inverseRatio * progressRatio * progressRatio * p2 +
    progressRatio * progressRatio * progressRatio * p3
  );
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
