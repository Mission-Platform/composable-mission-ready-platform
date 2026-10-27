import type { FlintGraphNode } from '@mission-platform/flint';
import { classNames, useEffect, useRef, type MpElement } from '@mission-platform/forge-jsx';

import styles from './forge-flint-graph-editor.module.scss';

import type { FlintCamera } from '../../../renderer/render-worker';

export interface FlintGraphMinimapProperties {
  readonly nodes: readonly FlintGraphNode[];
  readonly camera: FlintCamera;
  readonly onPanTo: (worldX: number, worldY: number) => void;
  readonly className?: string;
  readonly width?: number;
  readonly height?: number;
}

/**
 * Renders an interactive 2D graph overview and camera viewport reticle.
 */
export function FlintGraphMinimap(properties: FlintGraphMinimapProperties): MpElement {
  const { nodes, camera, onPanTo, className, width = 180, height = 120 } = properties;
  const canvasReference = useRef<HTMLCanvasElement | undefined>();

  useEffect(() => {
    const canvas = canvasReference.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, width, height);

    // Compute bounding box of all nodes
    let minX = -500;
    let minY = -400;
    let maxX = 500;
    let maxY = 400;

    for (const node of nodes) {
      minX = Math.min(minX, node.position.x - 50);
      minY = Math.min(minY, node.position.y - 50);
      maxX = Math.max(maxX, node.position.x + 270);
      maxY = Math.max(maxY, node.position.y + 170);
    }

    const graphWidth = Math.max(maxX - minX, 100);
    const graphHeight = Math.max(maxY - minY, 100);

    const scale = Math.min((width - 16) / graphWidth, (height - 16) / graphHeight);
    const offsetX = (width - graphWidth * scale) / 2 - minX * scale;
    const offsetY = (height - graphHeight * scale) / 2 - minY * scale;

    // Background
    context.fillStyle = 'rgba(13, 17, 23, 0.75)';
    context.fillRect(0, 0, width, height);

    // Draw nodes
    context.fillStyle = '#58a6ff';
    for (const node of nodes) {
      const nx = node.position.x * scale + offsetX;
      const ny = node.position.y * scale + offsetY;
      const nw = Math.max(4, 220 * scale);
      const nh = Math.max(3, 120 * scale);
      context.fillRect(nx, ny, nw, nh);
    }

    // Draw viewport reticle
    const halfVpW = camera.viewportWidth / camera.zoom / 2;
    const halfVpH = camera.viewportHeight / camera.zoom / 2;

    const vpLeft = (camera.x - halfVpW) * scale + offsetX;
    const vpTop = (camera.y - halfVpH) * scale + offsetY;
    const vpWidth = (camera.viewportWidth / camera.zoom) * scale;
    const vpHeight = (camera.viewportHeight / camera.zoom) * scale;

    context.strokeStyle = '#f78166';
    context.lineWidth = 1.5;
    context.strokeRect(vpLeft, vpTop, vpWidth, vpHeight);
    context.fillStyle = 'rgba(247, 129, 102, 0.15)';
    context.fillRect(vpLeft, vpTop, vpWidth, vpHeight);
  }, [nodes, camera, width, height]);

  const handlePointerDown = (event: PointerEvent): void => {
    const canvas = canvasReference.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    let minX = -500;
    let minY = -400;
    let maxX = 500;
    let maxY = 400;

    for (const node of nodes) {
      minX = Math.min(minX, node.position.x - 50);
      minY = Math.min(minY, node.position.y - 50);
      maxX = Math.max(maxX, node.position.x + 270);
      maxY = Math.max(maxY, node.position.y + 170);
    }

    const graphWidth = Math.max(maxX - minX, 100);
    const graphHeight = Math.max(maxY - minY, 100);

    const scale = Math.min((width - 16) / graphWidth, (height - 16) / graphHeight);
    const offsetX = (width - graphWidth * scale) / 2 - minX * scale;
    const offsetY = (height - graphHeight * scale) / 2 - minY * scale;

    const targetWorldX = (clickX - offsetX) / scale;
    const targetWorldY = (clickY - offsetY) / scale;

    onPanTo(targetWorldX, targetWorldY);
  };

  return (
    <div className={classNames(styles.minimapContainer, className)}>
      <canvas
        ref={canvasReference}
        width={width}
        height={height}
        className={styles.minimapCanvas}
        onPointerDown={handlePointerDown}
      />
    </div>
  );
}
