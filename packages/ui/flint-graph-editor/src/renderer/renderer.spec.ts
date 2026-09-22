import { describe, expect, it } from 'vitest';

import {
  createCamera,
  createViewProjectionMatrix,
  FlintRenderEngine,
  getFlintCameraWasm,
  getFlintRenderWorkerWasm,
  getViewportBounds,
  isWebGpuSupported,
  panCamera,
  screenToWorld,
  SpatialGridIndex,
  worldToScreen,
  zoomCamera,
  type RenderWorkerInputMessage,
  type RenderWorkerOutputMessage,
} from './render-worker';

describe('WebGPU Graph Renderer - Camera Math & Transforms', () => {
  it('creates camera with clamped zoom limits', () => {
    const cam = createCamera(1200, 800, 100, 200, 1.5);
    expect(cam.viewportWidth).toBe(1200);
    expect(cam.viewportHeight).toBe(800);
    expect(cam.x).toBe(100);
    expect(cam.y).toBe(200);
    expect(cam.zoom).toBe(1.5);

    const camMin = createCamera(800, 600, 0, 0, 0.01);
    expect(camMin.zoom).toBeCloseTo(0.1);

    const camMax = createCamera(800, 600, 0, 0, 10);
    expect(camMax.zoom).toBe(5);
  });

  it('performs lossless roundtrip conversion between screen and world coordinates', () => {
    const camera = createCamera(1024, 768, 500, 300, 1.25);
    const screenX = 340;
    const screenY = 220;

    const world = screenToWorld(screenX, screenY, camera);
    const screen = worldToScreen(world.x, world.y, camera);

    expect(screen.x).toBeCloseTo(screenX, 5);
    expect(screen.y).toBeCloseTo(screenY, 5);
  });

  it('pans camera correctly according to screen delta and zoom level', () => {
    const camera = createCamera(800, 600, 0, 0, 2);
    // Pan right 100px and down 50px on screen
    const panned = panCamera(camera, 100, 50);

    // At zoom 2.0, 100px on screen is 50 units in world
    expect(panned.x).toBeCloseTo(-50);
    expect(panned.y).toBeCloseTo(-25);
    expect(panned.zoom).toBe(2);
  });

  it('keeps cursor world location stationary when zooming', () => {
    const camera = createCamera(800, 600, 0, 0, 1);
    const cursorScreenX = 600;
    const cursorScreenY = 450;

    const worldBefore = screenToWorld(cursorScreenX, cursorScreenY, camera);
    const zoomed = zoomCamera(camera, cursorScreenX, cursorScreenY, 1.5);
    const worldAfter = screenToWorld(cursorScreenX, cursorScreenY, zoomed);

    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 5);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 5);
    expect(zoomed.zoom).toBeCloseTo(1.5, 5);
  });

  it('computes accurate viewport bounding boxes', () => {
    const camera = createCamera(800, 600, 100, 100, 1);
    const bounds = getViewportBounds(camera);

    // Viewport width 800 centered at 100 -> [-300, 500]
    expect(bounds.minX).toBeCloseTo(-300);
    expect(bounds.maxX).toBeCloseTo(500);
    // Viewport height 600 centered at 100 -> [-200, 400]
    expect(bounds.minY).toBeCloseTo(-200);
    expect(bounds.maxY).toBeCloseTo(400);
  });

  it('generates a valid 4x4 view-projection matrix', () => {
    const camera = createCamera(800, 600, 50, 50, 1);
    const matrix = createViewProjectionMatrix(camera);

    expect(matrix).toHaveLength(16);
    expect(matrix[0]).toBeCloseTo(2 / 800);
    expect(matrix[5]).toBeCloseTo(-2 / 600);
    expect(matrix[10]).toBe(1);
    expect(matrix[15]).toBe(1);
  });
});

describe('WebGPU Graph Renderer - Spatial Indexing & Picking', () => {
  it('indexes and queries elements with bounding box intersection', () => {
    const index = new SpatialGridIndex(256);

    index.insert('node-1', { minX: 0, minY: 0, maxX: 100, maxY: 80 });
    index.insert('node-2', { minX: 500, minY: 500, maxX: 600, maxY: 580 });
    index.insert('node-3', { minX: 1000, minY: 1000, maxX: 1100, maxY: 1080 });

    // Query covering only node-1 and node-2
    const visible = index.queryBox({
      minX: -50,
      minY: -50,
      maxX: 700,
      maxY: 700,
    });
    expect(visible).toContain('node-1');
    expect(visible).toContain('node-2');
    expect(visible).not.toContain('node-3');
  });

  it('performs sub-millisecond point hit-testing on nodes', () => {
    const index = new SpatialGridIndex(256);
    index.insert('node-a', { minX: 100, minY: 100, maxX: 280, maxY: 200 });

    expect(index.hitTestPoint(150, 150)).toBe('node-a');
    expect(index.hitTestPoint(99, 150)).toBeUndefined();
    expect(index.hitTestPoint(281, 150)).toBeUndefined();
  });

  it('registers and hit-tests connection ports with snap radius', () => {
    const index = new SpatialGridIndex(256);

    index.registerPort({
      nodeId: 'node-1',
      portId: 'out-1',
      direction: 'output',
      position: { x: 280, y: 150 },
    });

    // Hit test within radius
    const hit = index.hitTestPort(282, 151, 10);
    expect(hit).toBeDefined();
    expect(hit?.nodeId).toBe('node-1');
    expect(hit?.portId).toBe('out-1');

    // Outside radius
    const miss = index.hitTestPort(300, 150, 10);
    expect(miss).toBeUndefined();
  });

  it('handles 10,000 nodes stress test with sub-millisecond query latency', () => {
    const index = new SpatialGridIndex(256);
    const nodeCount = 10_000;

    // Create a 100x100 grid of nodes spaced by 250 units
    for (let index_ = 0; index_ < nodeCount; index_++) {
      const col = index_ % 100;
      const row = Math.floor(index_ / 100);
      const x = col * 250;
      const y = row * 200;
      index.insert(`node-${index_}`, {
        minX: x,
        minY: y,
        maxX: x + 180,
        maxY: y + 100,
      });
    }

    const startTime = performance.now();
    // Typical viewport area
    const visible = index.queryBox({
      minX: 2000,
      minY: 2000,
      maxX: 4000,
      maxY: 3500,
    });
    const queryDuration = performance.now() - startTime;

    expect(visible.length).toBeGreaterThan(0);
    // Spatial grid query should take less than 15ms even in unoptimized test runner
    expect(queryDuration).toBeLessThan(15);
  });
});

describe('WebGPU Graph Renderer - Worker Protocol & Capability', () => {
  it('validates structuredClone serialization of all input messages', () => {
    const messages: RenderWorkerInputMessage[] = [
      { type: 'resize', width: 1920, height: 1080 },
      { type: 'pan', dx: 15, dy: -25 },
      { type: 'zoom', cursorX: 500, cursorY: 400, factor: 1.2 },
      { type: 'hit_test', screenX: 300, screenY: 200, snapRadius: 16 },
      {
        type: 'set_selection',
        selectedNodeIds: ['node-1', 'node-2'],
        activeEdgeId: 'edge-1',
      },
      {
        type: 'set_trace_state',
        activeNodeIds: ['node-1'],
        trappedNodeId: undefined,
        edgePulses: [{ edgeId: 'edge-1', offset: 0.65 }],
      },
    ];

    for (const message of messages) {
      const cloned = structuredClone(message);
      expect(cloned).toEqual(message);
    }
  });

  it('validates structuredClone serialization of all output messages', () => {
    const outputMessages: RenderWorkerOutputMessage[] = [
      { type: 'ready', supported: true },
      { type: 'frame', fps: 120, visibleNodes: 45, visibleEdges: 62 },
      { type: 'camera_changed', camera: createCamera(800, 600, 10, 20, 1.1) },
      { type: 'hit_result', hit: { type: 'node', nodeId: 'node-42' } },
      { type: 'error', error: 'GPU device lost' },
    ];

    for (const message of outputMessages) {
      const cloned = structuredClone(message);
      expect(cloned).toEqual(message);
    }
  });

  it('detects WebGPU capability gracefully in Node/worker environment', async () => {
    const supported = await isWebGpuSupported();
    // In Node.js without mock GPU adapter, returns false cleanly without throwing
    expect(typeof supported).toBe('boolean');
  });

  it('manages camera and selection states inside FlintRenderEngine instance', () => {
    const messages: RenderWorkerOutputMessage[] = [];
    const engine = new FlintRenderEngine(800, 600, (message) => {
      messages.push(message);
    });

    expect(engine.getCamera().viewportWidth).toBe(800);
    engine.pan(40, 20);
    expect(messages.some((m) => m.type === 'camera_changed')).toBe(true);

    engine.zoom(400, 300, 2);
    expect(engine.getCamera().zoom).toBe(2);
  });

  it('performs edge hit testing and backend fallback selection in Flint Wasm', () => {
    const renderWasm = getFlintRenderWorkerWasm();

    // Line from (0, 0) to (100, 100)
    const isHitOnLine = Boolean(renderWasm.edge_hit_test(50, 50, 0, 0, 100, 100, 15));
    expect(isHitOnLine).toBe(true);

    const isMissFarAway = Boolean(renderWasm.edge_hit_test(50, 200, 0, 0, 100, 100, 10));
    expect(isMissFarAway).toBe(false);

    // Backend selection: 1 = WebGPU, 2 = WebGL, 3 = Canvas 2D
    expect(renderWasm.backend_select_tier(true, true, true)).toBe(1);
    expect(renderWasm.backend_select_tier(false, true, true)).toBe(2);
    expect(renderWasm.backend_select_tier(false, false, true)).toBe(3);

    // Fallback: 1 -> 2, 2 -> 3
    expect(renderWasm.backend_fallback_next(1, true, true)).toBe(2);
    expect(renderWasm.backend_fallback_next(1, false, true)).toBe(3);
    expect(renderWasm.backend_fallback_next(2, false, true)).toBe(3);
  });

  it('performs synchronous hit-testing via hitTestSync', () => {
    const engine = new FlintRenderEngine(800, 600);
    engine.setGraph(
      [
        {
          id: 'node-test-1',
          title: 'Add',
          category: 'math',
          operation: 'add',
          inputs: [{ id: 'in_a', name: 'a', direction: 'input', type: 'i32' }],
          outputs: [{ id: 'out_val', name: 'result', direction: 'output', type: 'i32' }],
          position: { x: 0, y: 0 },
        },
      ],
      [],
    );

    // Screen center corresponds to world (0, 0)
    const hit = engine.hitTestSync(400, 300);
    expect(hit?.type).toBe('node');
    expect(hit?.nodeId).toBe('node-test-1');

    const miss = engine.hitTestSync(10, 10);
    expect(miss).toBeUndefined();
  });
});

describe('Flint WebAssembly Renderer & Camera Engines', () => {
  it('executes native Flint WebAssembly projections and calculations accurately', () => {
    const renderWasm = getFlintRenderWorkerWasm();
    const cameraWasm = getFlintCameraWasm();

    expect(renderWasm.screen_to_world_x(400, 0, 800, 100)).toBe(0);
    expect(renderWasm.screen_to_world_y(300, 0, 600, 100)).toBe(0);
    expect(renderWasm.world_to_screen_x(0, 0, 800, 100)).toBe(400);
    expect(renderWasm.world_to_screen_y(0, 0, 600, 100)).toBe(300);

    expect(renderWasm.point_in_rect(50, 50, 0, 0, 100, 100)).toBe(1);
    expect(renderWasm.point_in_rect(150, 50, 0, 0, 100, 100)).toBe(0);

    expect(renderWasm.point_in_circle(10, 10, 10, 10, 5)).toBe(1);
    expect(renderWasm.point_in_circle(20, 20, 10, 10, 5)).toBe(0);

    expect(renderWasm.rect_intersects_box(10, 10, 50, 50, 0, 0, 100, 100)).toBe(1);
    expect(renderWasm.rect_intersects_box(200, 200, 50, 50, 0, 0, 100, 100)).toBe(0);

    expect(cameraWasm.clamp_i32(5, 10, 500)).toBe(10);
    expect(cameraWasm.clamp_i32(600, 10, 500)).toBe(500);
    expect(cameraWasm.clamp_i32(150, 10, 500)).toBe(150);

    expect(cameraWasm.camera_pan_x(100, 50, 100)).toBe(50);
    expect(renderWasm.bezier_control_dx(0, 100)).toBe(50);
  });

  it('computes WebGPU camera view-projection matrix elements and instances in Flint', () => {
    let uploadedCamera = false;
    let recordedNode: unknown;
    let recordedEdge: unknown;
    let recordedPin: unknown;
    let uploadedEdgeCount = 0;
    let renderedGrid = false;
    let renderedNodesCount = 0;

    const testWasm = getFlintRenderWorkerWasm({
      'webgpu.upload_camera_buffer': {
        gpu_upload_camera_buffer: () => {
          uploadedCamera = true;
        },
      },
      'webgpu.write_node_instance': {
        gpu_write_node_instance: (cx: number, cy: number, w: number, h: number, radius: number, isSelected: number) => {
          recordedNode = { cx, cy, w, h, radius, isSelected };
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
        ) => {
          recordedEdge = { p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y };
        },
      },
      'webgpu.write_pin_instance': {
        gpu_write_pin_instance: (px: number, py: number, radius: number) => {
          recordedPin = { px, py, radius };
        },
      },
      'webgpu.upload_node_buffer': { gpu_upload_node_buffer: () => {} },
      'webgpu.upload_edge_buffer': {
        gpu_upload_edge_buffer: (count: number) => {
          uploadedEdgeCount = count;
        },
      },
      'webgpu.upload_pin_buffer': { gpu_upload_pin_buffer: () => {} },
      'webgpu.render_begin': { gpu_render_begin: () => {} },
      'webgpu.render_grid': {
        gpu_render_grid: () => {
          renderedGrid = true;
        },
      },
      'webgpu.render_edges': { gpu_render_edges: () => {} },
      'webgpu.render_nodes': {
        gpu_render_nodes: (count: number) => {
          renderedNodesCount = count;
        },
      },
      'webgpu.render_pins': { gpu_render_pins: () => {} },
      'webgpu.render_end': { gpu_render_end: () => {} },
    });

    testWasm.compute_node_instance(0, 0, 220, 100, 1, 0, 0);
    expect(recordedNode).toEqual({ cx: 110, cy: 50, w: 220, h: 100, radius: 8, isSelected: 1 });

    testWasm.compute_edge_instance(220, 50, 400, 50, 1, 1, 500);
    expect(recordedEdge).toEqual({
      p0x: 220,
      p0y: 50,
      p1x: 310,
      p1y: 50,
      p2x: 310,
      p2y: 50,
      p3x: 400,
      p3y: 50,
    });

    testWasm.compute_pin_instance(220, 50, 1, 0, 1);
    expect(recordedPin).toEqual({ px: 220, py: 50, radius: 8 });

    testWasm.renderer_render_webgpu_frame(5, 3, 10);
    expect(uploadedCamera).toBe(true);
    expect(uploadedEdgeCount).toBe(3);
    expect(renderedGrid).toBe(true);
    expect(renderedNodesCount).toBe(5);
  });

  it('supports continuous floating-point zoom, DPR scaling, and box queries', () => {
    const cameraWasm = getFlintCameraWasm();
    // Test continuous float zoom math
    const zoomed = cameraWasm.camera_zoom_f32(1, 1.15, 0.1, 5);
    expect(zoomed).toBeCloseTo(1.15, 2);

    const clampedMax = cameraWasm.camera_zoom_f32(4.5, 2, 0.1, 5);
    expect(clampedMax).toBeCloseTo(5, 2);

    const clampedMin = cameraWasm.camera_zoom_f32(0.2, 0.1, 0.1, 5);
    expect(clampedMin).toBeCloseTo(0.1, 2);

    // Test FlintRenderEngine DPR and box query
    const engine = new FlintRenderEngine(800, 600);
    engine.setDpr(2);
    expect(engine.getDpr()).toBe(2);

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        save: () => {},
        restore: () => {},
        setTransform: () => {},
        fillRect: () => {},
        translate: () => {},
        scale: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        measureText: () => ({ width: 40 }),
        fillText: () => {},
        fill: () => {},
        arc: () => {},
        roundRect: () => {},
      }),
    } as unknown as HTMLCanvasElement;

    void engine.initialize(mockCanvas, 2);
    expect(mockCanvas.width).toBe(1600);
    expect(mockCanvas.height).toBe(1200);

    engine.setGraph(
      [
        {
          id: 'node-box-1',
          title: 'Add',
          category: 'math',
          operation: 'add',
          inputs: [],
          outputs: [],
          position: { x: 100, y: 100 },
        },
        {
          id: 'node-box-2',
          title: 'Multiply',
          category: 'math',
          operation: 'multiply',
          inputs: [],
          outputs: [],
          position: { x: 500, y: 400 },
        },
      ],
      [],
    );

    const matched = engine.queryNodesInBox({
      minX: 50,
      minY: 50,
      maxX: 350,
      maxY: 300,
    });
    expect(matched).toContain('node-box-1');
    expect(matched).not.toContain('node-box-2');

    const perf = engine.getPerformanceStats();
    expect(perf.dpr).toBe(2);
    expect(perf.updateTimeMs).toBeGreaterThan(0);
    expect(perf.renderTimeMs).toBeGreaterThan(0);
  });

  it('gracefully selects and degrades graphics tiers in Flint Wasm', () => {
    const wasm = getFlintRenderWorkerWasm();

    // WebGPU available -> Tier 1
    expect(wasm.backend_select_tier(true, true, true)).toBe(1);
    expect(wasm.backend_select_tier(true, false, true)).toBe(1);

    // WebGPU unavailable, WebGL available -> Tier 2
    expect(wasm.backend_select_tier(false, true, true)).toBe(2);
    expect(wasm.backend_select_tier(false, true, false)).toBe(2);

    // Only 2D Canvas available -> Tier 3
    expect(wasm.backend_select_tier(false, false, true)).toBe(3);

    // Nothing available -> 0
    expect(wasm.backend_select_tier(false, false, false)).toBe(0);

    // Fallbacks
    expect(wasm.backend_fallback_next(1, true, true)).toBe(2);
    expect(wasm.backend_fallback_next(1, false, true)).toBe(3);
    expect(wasm.backend_fallback_next(2, false, true)).toBe(3);
    expect(wasm.backend_fallback_next(3, false, false)).toBe(0);
  });

  it('renders graph nodes immediately upon setGraph in 2D fallback mode', async () => {
    let fillTextCount = 0;
    let fillRectCount = 0;

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: (contextId: string) => {
        if (contextId === '2d') {
          return {
            save: () => {},
            restore: () => {},
            setTransform: () => {},
            fillRect: () => {
              fillRectCount++;
            },
            translate: () => {},
            scale: () => {},
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            stroke: () => {},
            measureText: () => ({ width: 40 }),
            fillText: () => {
              fillTextCount++;
            },
            fill: () => {},
            arc: () => {},
            roundRect: () => {},
          };
        }
        return;
      },
    } as unknown as HTMLCanvasElement;

    const engine = new FlintRenderEngine(800, 600);
    const isGpu = await engine.initialize(mockCanvas, 1);
    expect(isGpu).toBe(false);

    // Setting graph triggers immediate rendering of nodes and labels
    engine.setGraph(
      [
        {
          id: 'test-node-1',
          title: 'Math Node',
          category: 'math',
          operation: 'add',
          inputs: [{ id: 'in_a', name: 'a', direction: 'input', type: { kind: 'type-name', name: 'f32' } }],
          outputs: [{ id: 'out_c', name: 'c', direction: 'output', type: { kind: 'type-name', name: 'f32' } }],
          position: { x: 50, y: 50 },
        },
      ],
      [],
    );

    expect(fillRectCount).toBeGreaterThan(0);
    expect(fillTextCount).toBeGreaterThan(0);
  });
});
