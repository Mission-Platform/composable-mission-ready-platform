import { describe, expect, it } from 'vitest';

import type { FlintGraphNode } from '@mission-platform/flint';

import { calculateFitToViewCamera, DEFAULT_CAMERA, useViewportController } from './useViewportController';

describe('useViewportController Hook & Camera Calculations', () => {
  it('returns default camera when node list is empty', () => {
    const camera = calculateFitToViewCamera([], 800, 600);
    expect(camera).toEqual({
      x: 0,
      y: 0,
      zoom: 1,
      viewportWidth: 800,
      viewportHeight: 600,
    });
  });

  it('calculates bounding box and centers camera around nodes', () => {
    const nodes: FlintGraphNode[] = [
      {
        id: 'node-1',
        operation: 'math.add',
        position: { x: 100, y: 100 },
        inputs: [],
        outputs: [],
      },
      {
        id: 'node-2',
        operation: 'math.mul',
        position: { x: 500, y: 300 },
        inputs: [],
        outputs: [],
      },
    ];

    const camera = calculateFitToViewCamera(nodes, 1000, 800, 50);
    expect(camera.viewportWidth).toBe(1000);
    expect(camera.viewportHeight).toBe(800);
    expect(camera.x).toBeGreaterThan(100);
    expect(camera.y).toBeGreaterThan(100);
    expect(camera.zoom).toBeGreaterThan(0);
  });

  it('transforms screen to world and world to screen correctly', () => {
    const { screenToWorld, worldToScreen } = useViewportController(DEFAULT_CAMERA);

    const world = screenToWorld(400, 300);
    expect(world).toEqual({ x: 0, y: 0 });

    const screen = worldToScreen(0, 0);
    expect(screen).toEqual({ x: 400, y: 300 });
  });
});
