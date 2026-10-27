import type { FlintGraphNode } from '@mission-platform/flint';
import { useState } from '@mission-platform/forge-jsx';

import type { FlintCamera } from '../../../renderer/render-worker';

export interface ViewportState {
  readonly camera: FlintCamera;
  readonly isPanning: boolean;
  readonly isZooming: boolean;
}

export interface UseViewportControllerResult {
  readonly camera: FlintCamera;
  readonly setCamera: (camera: FlintCamera | ((prev: FlintCamera) => FlintCamera)) => void;
  readonly screenToWorld: (screenX: number, screenY: number, canvasRect?: DOMRect) => { x: number; y: number };
  readonly worldToScreen: (worldX: number, worldY: number, canvasRect?: DOMRect) => { x: number; y: number };
  readonly fitToView: (nodes: readonly FlintGraphNode[], canvasWidth: number, canvasHeight: number) => FlintCamera;
  readonly zoomBy: (cursorX: number, cursorY: number, factor: number) => void;
  readonly panBy: (deltaX: number, deltaY: number) => void;
  readonly resetViewport: () => void;
}

export const DEFAULT_CAMERA: FlintCamera = {
  x: 0,
  y: 0,
  zoom: 1,
  viewportWidth: 800,
  viewportHeight: 600,
};

/**
 * Calculates camera bounds and zoom level to frame a list of nodes nicely within the canvas.
 */
export function calculateFitToViewCamera(
  nodes: readonly FlintGraphNode[],
  viewportWidth: number,
  viewportHeight: number,
  padding = 80,
): FlintCamera {
  if (nodes.length === 0) {
    return {
      x: 0,
      y: 0,
      zoom: 1,
      viewportWidth,
      viewportHeight,
    };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const node of nodes) {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + 220);
    maxY = Math.max(maxY, node.position.y + 120);
  }

  const boundingWidth = Math.max(maxX - minX, 100);
  const boundingHeight = Math.max(maxY - minY, 100);

  const availableWidth = Math.max(viewportWidth - padding * 2, 100);
  const availableHeight = Math.max(viewportHeight - padding * 2, 100);

  const zoomX = availableWidth / boundingWidth;
  const zoomY = availableHeight / boundingHeight;
  const zoom = Math.max(0.1, Math.min(2, Math.min(zoomX, zoomY)));

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return {
    x: centerX,
    y: centerY,
    zoom,
    viewportWidth,
    viewportHeight,
  };
}

/**
 * Hook managing canvas viewport, camera zoom/pan transformations, and coordinate conversions.
 */
export function useViewportController(initialCamera: FlintCamera = DEFAULT_CAMERA): UseViewportControllerResult {
  const [camera, setCamera] = useState<FlintCamera>(initialCamera);

  const screenToWorld = (screenX: number, screenY: number): { x: number; y: number } => {
    const halfWidth = camera.viewportWidth / 2;
    const halfHeight = camera.viewportHeight / 2;
    const worldX = (screenX - halfWidth) / camera.zoom + camera.x;
    const worldY = (screenY - halfHeight) / camera.zoom + camera.y;
    return { x: worldX, y: worldY };
  };

  const worldToScreen = (worldX: number, worldY: number): { x: number; y: number } => {
    const halfWidth = camera.viewportWidth / 2;
    const halfHeight = camera.viewportHeight / 2;
    const screenX = (worldX - camera.x) * camera.zoom + halfWidth;
    const screenY = (worldY - camera.y) * camera.zoom + halfHeight;
    return { x: screenX, y: screenY };
  };

  const fitToView = (nodes: readonly FlintGraphNode[], canvasWidth: number, canvasHeight: number): FlintCamera => {
    const nextCamera = calculateFitToViewCamera(nodes, canvasWidth, canvasHeight);
    setCamera(nextCamera);
    return nextCamera;
  };

  const zoomBy = (cursorX: number, cursorY: number, factor: number): void => {
    setCamera((prev) => {
      const nextZoom = Math.max(0.05, Math.min(8, prev.zoom * factor));
      const halfWidth = prev.viewportWidth / 2;
      const halfHeight = prev.viewportHeight / 2;
      const worldX = (cursorX - halfWidth) / prev.zoom + prev.x;
      const worldY = (cursorY - halfHeight) / prev.zoom + prev.y;
      const nextX = worldX - (cursorX - halfWidth) / nextZoom;
      const nextY = worldY - (cursorY - halfHeight) / nextZoom;

      return {
        ...prev,
        x: nextX,
        y: nextY,
        zoom: nextZoom,
      };
    });
  };

  const panBy = (deltaX: number, deltaY: number): void => {
    setCamera((prev) => ({
      ...prev,
      x: prev.x - deltaX / prev.zoom,
      y: prev.y - deltaY / prev.zoom,
    }));
  };

  const resetViewport = (): void => {
    setCamera((prev) => ({
      ...prev,
      x: 0,
      y: 0,
      zoom: 1,
    }));
  };

  return {
    camera,
    setCamera,
    screenToWorld,
    worldToScreen,
    fitToView,
    zoomBy,
    panBy,
    resetViewport,
  };
}
