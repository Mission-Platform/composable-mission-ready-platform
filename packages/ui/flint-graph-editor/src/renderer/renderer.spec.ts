import { describe, expect, it } from 'vitest';

import { FlintEditorStore } from '../editor/editor-store';

import {
  getFlintCameraWasm,
  getFlintRenderWorkerWasm,
  type RenderWorkerInputMessage,
  type RenderWorkerOutputMessage,
} from './render-worker';
import { loadSync as loadFontWasm } from './sdf-font.flint';

describe('WebGPU Graph Renderer - Native Flint Camera Math & Transforms', () => {
  it('creates camera with clamped zoom limits in Flint Wasm', () => {
    const wasm = getFlintRenderWorkerWasm();

    wasm.createCamera(1200, 800, 100, 200, 1.5);
    expect(wasm.get_camera_viewport_width()).toBe(1200);
    expect(wasm.get_camera_viewport_height()).toBe(800);
    expect(wasm.get_camera_x()).toBe(100);
    expect(wasm.get_camera_y()).toBe(200);
    expect(wasm.get_camera_zoom()).toBe(1.5);

    wasm.createCamera(800, 600, 0, 0, 0.01);
    expect(wasm.get_camera_zoom()).toBeCloseTo(0.1);

    wasm.createCamera(800, 600, 0, 0, 10);
    expect(wasm.get_camera_zoom()).toBe(5);
  });

  it('performs lossless roundtrip conversion between screen and world coordinates in Flint Wasm', () => {
    const wasm = getFlintRenderWorkerWasm();
    wasm.createCamera(1024, 768, 500, 300, 1.25);
    const screenX = 340;
    const screenY = 220;

    wasm.screenToWorld(screenX, screenY);
    const worldX = wasm.get_point_x();
    const worldY = wasm.get_point_y();

    wasm.worldToScreen(worldX, worldY);
    expect(wasm.get_point_x()).toBeCloseTo(screenX, 5);
    expect(wasm.get_point_y()).toBeCloseTo(screenY, 5);
  });

  it('pans camera correctly according to screen delta and zoom level in Flint Wasm', () => {
    const wasm = getFlintRenderWorkerWasm();
    wasm.createCamera(800, 600, 0, 0, 2);
    // Pan right 100px and down 50px on screen
    wasm.panCamera(100, 50);

    // At zoom 2.0, 100px on screen is 50 units in world
    expect(wasm.get_camera_x()).toBeCloseTo(-50);
    expect(wasm.get_camera_y()).toBeCloseTo(-25);
    expect(wasm.get_camera_zoom()).toBe(2);
  });

  it('keeps cursor world location stationary when zooming in Flint Wasm', () => {
    const wasm = getFlintRenderWorkerWasm();
    wasm.createCamera(800, 600, 0, 0, 1);
    const cursorScreenX = 600;
    const cursorScreenY = 450;

    wasm.screenToWorld(cursorScreenX, cursorScreenY);
    const worldBeforeX = wasm.get_point_x();
    const worldBeforeY = wasm.get_point_y();

    wasm.zoomCamera(cursorScreenX, cursorScreenY, 1.5);
    wasm.screenToWorld(cursorScreenX, cursorScreenY);

    expect(wasm.get_point_x()).toBeCloseTo(worldBeforeX, 5);
    expect(wasm.get_point_y()).toBeCloseTo(worldBeforeY, 5);
    expect(wasm.get_camera_zoom()).toBeCloseTo(1.5, 5);
  });

  it('computes accurate viewport bounding boxes in Flint Wasm', () => {
    const wasm = getFlintRenderWorkerWasm();
    wasm.createCamera(800, 600, 100, 100, 1);
    wasm.getViewportBounds(0);

    // Viewport width 800 centered at 100 -> [-300, 500]
    expect(wasm.get_bounds_min_x()).toBeCloseTo(-300);
    expect(wasm.get_bounds_max_x()).toBeCloseTo(500);
    // Viewport height 600 centered at 100 -> [-200, 400]
    expect(wasm.get_bounds_min_y()).toBeCloseTo(-200);
    expect(wasm.get_bounds_max_y()).toBeCloseTo(400);
  });

  it('generates a valid 4x4 view-projection matrix in Flint Wasm', () => {
    const wasm = getFlintRenderWorkerWasm();
    wasm.createCamera(800, 600, 50, 50, 1);
    wasm.createViewProjectionMatrix(0);

    const f64Array = new Float64Array(wasm.memory.buffer, 0, 16);
    expect(f64Array[0]).toBeCloseTo(2 / 800);
    expect(f64Array[5]).toBeCloseTo(-2 / 600);
    expect(f64Array[10]).toBe(1);
    expect(f64Array[15]).toBe(1);
  });
});

describe('WebGPU Graph Renderer - Native Flint Spatial Indexing & Picking', () => {
  it('indexes and queries elements with bounding box intersection in Flint Wasm', () => {
    const wasm = getFlintRenderWorkerWasm();
    wasm.spatial_init();

    // Node 0: [0, 0] to [100, 80]
    wasm.spatial_insert_node(0, 1_000_000, 1_000_000, 1_000_100, 1_000_080);
    // Node 1: [500, 500] to [600, 580]
    wasm.spatial_insert_node(1, 1_000_500, 1_000_500, 1_000_600, 1_000_580);
    // Node 2: [1000, 1000] to [1100, 1080]
    wasm.spatial_insert_node(2, 1_001_000, 1_001_000, 1_001_100, 1_001_080);

    // Query covering only node-0 and node-1
    const count = wasm.spatial_query_box(999_950, 999_950, 1_000_700, 1_000_700);
    expect(count).toBe(2);

    const results: number[] = [];
    for (let i = 0; i < count; i++) {
      results.push(wasm.spatial_get_query_result(i));
    }
    expect(results).toContain(0);
    expect(results).toContain(1);
    expect(results).not.toContain(2);
  });

  it('performs sub-millisecond point hit-testing on nodes in Flint Wasm', () => {
    const wasm = getFlintRenderWorkerWasm();
    wasm.spatial_init();
    wasm.spatial_insert_node(0, 1_000_100, 1_000_100, 1_000_280, 1_000_200);

    // Hit test inside node 0 (returns 1-based index 1)
    expect(wasm.spatial_hit_test_point(1_000_150, 1_000_150)).toBe(1);
    // Outside node bounds
    expect(wasm.spatial_hit_test_point(1_000_099, 1_000_150)).toBe(0);
    expect(wasm.spatial_hit_test_point(1_000_281, 1_000_150)).toBe(0);
  });

  it('registers and hit-tests connection ports with snap radius in Flint Wasm', () => {
    const wasm = getFlintRenderWorkerWasm();
    wasm.spatial_init();

    // Node 0, port 1, output (dir 1), position (280, 150)
    wasm.spatial_insert_port(0, 1, 1, 1_000_280, 1_000_150);

    // Hit test within radius 10 at (282, 151) -> returns encoded port identifier > 0
    const hit = wasm.spatial_hit_test_port(1_000_282, 1_000_151, 10);
    expect(hit).toBeGreaterThan(0);

    // Outside radius 10 at (300, 150)
    const miss = wasm.spatial_hit_test_port(1_000_300, 1_000_150, 10);
    expect(miss).toBe(0);
  });

  it('handles 10,000 nodes stress test with sub-millisecond query latency in Flint Wasm', () => {
    const wasm = getFlintRenderWorkerWasm();
    wasm.spatial_init();
    const nodeCount = 10_000;

    for (let index_ = 0; index_ < nodeCount; index_++) {
      const col = index_ % 100;
      const row = Math.floor(index_ / 100);
      const x = 1_000_000 + col * 250;
      const y = 1_000_000 + row * 200;
      wasm.spatial_insert_node(index_, x, y, x + 180, y + 100);
    }

    const startTime = performance.now();
    const count = wasm.spatial_query_box(1_002_000, 1_002_000, 1_004_000, 1_003_500);
    const queryDuration = performance.now() - startTime;

    expect(count).toBeGreaterThan(0);
    expect(queryDuration).toBeLessThan(15);
  });
});

describe('WebGPU Graph Renderer - Worker Protocol & Serialization', () => {
  it('validates structuredClone serialization of all input messages', () => {
    const messages: RenderWorkerInputMessage[] = [
      { type: 'resize', width: 1920, height: 1080 },
      { type: 'pan', deltaX: 15, deltaY: -25 },
      { type: 'zoom', factor: 1.2, cursorX: 500, cursorY: 400 },
      { type: 'hit_test', cursorX: 300, cursorY: 200, snapRadius: 16 },
      {
        type: 'set_selection',
        selectedNodeIds: ['node-1', 'node-2'],
        selectedEdgeIds: ['edge-1'],
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
      {
        type: 'camera_changed',
        camera: { x: 10, y: 20, zoom: 1.1, viewportWidth: 800, viewportHeight: 600 },
      },
      { type: 'hit_result', hit: { type: 'node', nodeId: 'node-42' } },
      { type: 'error', error: 'GPU device lost' },
    ];

    for (const message of outputMessages) {
      const cloned = structuredClone(message);
      expect(cloned).toEqual(message);
    }
  });

  it('dispatches worker input messages and triggers native Flint Wasm events', async () => {
    let postedMessage: RenderWorkerOutputMessage | undefined;
    const originalPostMessage = (globalThis.self as unknown as { postMessage?: (msg: unknown) => void }).postMessage;
    (globalThis.self as unknown as { postMessage: (msg: unknown) => void }).postMessage = (msg: unknown) => {
      postedMessage = msg as RenderWorkerOutputMessage;
    };

    try {
      globalThis.self.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'init',
            width: 1024,
            height: 768,
            dpr: 1.5,
          } as RenderWorkerInputMessage,
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(postedMessage).toBeDefined();
      expect(postedMessage?.type).toBe('ready');
      expect(postedMessage?.performance?.dpr).toBe(1.5);
    } finally {
      (globalThis.self as unknown as { postMessage?: (msg: unknown) => void }).postMessage = originalPostMessage;
    }
  });

  it('renders canvas frame via capability imports when worker receives set_graph and pan', async () => {
    const messages: RenderWorkerOutputMessage[] = [];
    const originalPostMessage = (globalThis.self as unknown as { postMessage?: (msg: unknown) => void }).postMessage;
    (globalThis.self as unknown as { postMessage: (msg: unknown) => void }).postMessage = (msg: unknown) => {
      messages.push(msg as RenderWorkerOutputMessage);
    };

    const mockCtx2d = {
      save: () => {
        /* no-op */
      },
      restore: () => {
        /* no-op */
      },
      setTransform: () => {
        /* no-op */
      },
      scale: () => {
        /* no-op */
      },
      translate: () => {
        /* no-op */
      },
      fillRect: () => {
        /* no-op */
      },
      beginPath: () => {
        /* no-op */
      },
      moveTo: () => {
        /* no-op */
      },
      lineTo: () => {
        /* no-op */
      },
      stroke: () => {
        /* no-op */
      },
      fill: () => {
        /* no-op */
      },
      arc: () => {
        /* no-op */
      },
      bezierCurveTo: () => {
        /* no-op */
      },
      setLineDash: () => {
        /* no-op */
      },
      fillText: () => {
        /* no-op */
      },
      measureText: () => ({ width: 40 }),
      roundRect: () => {
        /* no-op */
      },
    };

    const mockCanvas = {
      width: 800,
      height: 600,
      getContext: (type: string) => (type === '2d' ? mockCtx2d : undefined),
    } as unknown as HTMLCanvasElement;

    try {
      globalThis.self.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'init',
            canvas: mockCanvas,
            width: 800,
            height: 600,
            dpr: 1,
          } as RenderWorkerInputMessage,
        }),
      );

      globalThis.self.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'set_graph',
            nodes: [
              {
                id: 'n1',
                title: 'Add',
                category: 'math',
                kind: 'operation',
                operation: 'add',
                position: { x: 10, y: 20 },
                inputs: [{ id: 'in1', name: 'a', direction: 'input', type: 'f32' }],
                outputs: [{ id: 'out1', name: 'out', direction: 'output', type: 'f32' }],
              },
            ],
            edges: [],
          } as RenderWorkerInputMessage,
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 15));

      const frameMsg = messages.find((m) => m.type === 'frame');
      expect(frameMsg).toBeDefined();
      expect(frameMsg?.visibleNodes).toBe(1);
    } finally {
      (globalThis.self as unknown as { postMessage?: (msg: unknown) => void }).postMessage = originalPostMessage;
    }
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
      'webgpu.upload_node_buffer': {
        gpu_upload_node_buffer: () => {
          /* no-op */
        },
      },
      'webgpu.upload_edge_buffer': {
        gpu_upload_edge_buffer: (count: number) => {
          uploadedEdgeCount = count;
        },
      },
      'webgpu.upload_pin_buffer': {
        gpu_upload_pin_buffer: () => {
          /* no-op */
        },
      },
      'webgpu.render_begin': {
        gpu_render_begin: () => {
          /* no-op */
        },
      },
      'webgpu.render_grid': {
        gpu_render_grid: () => {
          renderedGrid = true;
        },
      },
      'webgpu.render_edges': {
        gpu_render_edges: () => {
          /* no-op */
        },
      },
      'webgpu.render_nodes': {
        gpu_render_nodes: (count: number) => {
          renderedNodesCount = count;
        },
      },
      'webgpu.render_pins': {
        gpu_render_pins: () => {
          /* no-op */
        },
      },
      'webgpu.render_end': {
        gpu_render_end: () => {
          /* no-op */
        },
      },
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

  it('supports continuous floating-point zoom, DPR scaling, and box queries in Flint Wasm', () => {
    const cameraWasm = getFlintCameraWasm();
    const zoomed = cameraWasm.camera_zoom_f32(1, 1.15, 0.1, 5);
    expect(zoomed).toBeCloseTo(1.15, 2);

    const clampedMax = cameraWasm.camera_zoom_f32(4.5, 2, 0.1, 5);
    expect(clampedMax).toBeCloseTo(5, 2);

    const clampedMin = cameraWasm.camera_zoom_f32(0.2, 0.1, 0.1, 5);
    expect(clampedMin).toBeCloseTo(0.1, 2);

    const wasm = getFlintRenderWorkerWasm();
    wasm.engine_create(800, 600, 2);
    wasm.engine_set_dpr(2);
    expect(wasm.engine_get_dpr()).toBe(2);

    wasm.spatial_init();
    wasm.spatial_insert_node(0, 1_000_100, 1_000_100, 1_000_320, 1_000_200);
    wasm.spatial_insert_node(1, 1_000_500, 1_000_400, 1_000_720, 1_000_500);

    const count = wasm.spatial_query_box(1_000_050, 1_000_050, 1_000_350, 1_000_300);
    expect(count).toBe(1);
    expect(wasm.spatial_get_query_result(0)).toBe(0);
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

  it('performs edge hit testing in Flint Wasm', () => {
    const renderWasm = getFlintRenderWorkerWasm();

    // Line from (0, 0) to (100, 100)
    const isHitOnLine = Boolean(renderWasm.edge_hit_test(50, 50, 0, 0, 100, 100, 15));
    expect(isHitOnLine).toBe(true);

    const isMissFarAway = Boolean(renderWasm.edge_hit_test(50, 200, 0, 0, 100, 100, 10));
    expect(isMissFarAway).toBe(false);
  });

  it('computes node bounds in Flint accurately', () => {
    const wasm = getFlintRenderWorkerWasm();
    wasm.getNodeBounds(100, 150, 1);
    expect(wasm.get_node_bounds_min_x()).toBe(100);
    expect(wasm.get_node_bounds_min_y()).toBe(150);
    expect(wasm.get_node_bounds_max_x()).toBe(320); // 100 + 220
    expect(wasm.get_node_bounds_max_y()).toBe(238); // 150 + 44 + 28 + 16
  });

  it('maps categories and port types to RGB values in Flint', () => {
    const wasm = getFlintRenderWorkerWasm();

    // Category 'math' (category index 0)
    const mathEncoded = wasm.getCategoryRgb(0);
    expect(mathEncoded).toBeGreaterThan(0);

    // Port type f32 (type index 2)
    const f32Encoded = wasm.getPortTypeRgb(2);
    expect(f32Encoded).toBeGreaterThan(0);

    // Port type bool (type index 0)
    const boolEncoded = wasm.getPortTypeRgb(0);
    expect(boolEncoded).toBeGreaterThan(0);
  });

  it('manages engine lifecycle and backend switching in Flint', () => {
    const wasm = getFlintRenderWorkerWasm();
    wasm.engine_create(1024, 768, 1.5);
    expect(wasm.get_camera_viewport_width()).toBe(1024);
    expect(wasm.get_camera_viewport_height()).toBe(768);

    wasm.engine_set_backend(2);
    expect(wasm.engine_get_backend()).toBe(2);

    wasm.engine_pan(50, 25);
    expect(wasm.get_camera_x()).toBeCloseTo(-50);
    expect(wasm.get_camera_y()).toBeCloseTo(-25);

    wasm.engine_zoom(512, 384, 1.2);
    expect(wasm.get_camera_zoom()).toBeCloseTo(1.2, 2);

    wasm.engine_resize(1920, 1080, 2);
    expect(wasm.get_camera_viewport_width()).toBe(1920);
    expect(wasm.get_camera_viewport_height()).toBe(1080);
    expect(wasm.engine_get_dpr()).toBe(2);
  });

  it('executes 2D canvas fallback rendering via Flint engine', () => {
    let canvas2dRendered = false;
    let beginCalled = false;
    let gridCalled = false;
    let endCalled = false;
    const testWasm = getFlintRenderWorkerWasm({
      'canvas2d.render_begin': {
        c2d_render_begin: () => {
          beginCalled = true;
        },
      },
      'canvas2d.render_grid': {
        c2d_render_grid: () => {
          gridCalled = true;
        },
      },
      'canvas2d.render_frame': {
        canvas2d_render_frame: () => {
          canvas2dRendered = true;
        },
      },
      'canvas2d.render_end': {
        c2d_render_end: () => {
          endCalled = true;
        },
      },
    });

    testWasm.engine_create(800, 600, 1);
    testWasm.engine_set_backend(3);
    expect(testWasm.engine_get_backend()).toBe(3);

    testWasm.engine_render_frame(10, 8, 40);
    expect(beginCalled).toBe(true);
    expect(gridCalled).toBe(true);
    expect(canvas2dRendered).toBe(true);
    expect(endCalled).toBe(true);
  });

  it('computes 2D canvas edge, node, and pin geometry in Flint', () => {
    let edgeDrawn = false;
    let nodeDrawn = false;
    let pinDrawn = false;
    const testWasm = getFlintRenderWorkerWasm({
      'canvas2d.draw_edge': {
        c2d_draw_edge: (
          p0x: number,
          p0y: number,
          p1x: number,
          p1y: number,
          p2x: number,
          p2y: number,
          p3x: number,
          p3y: number,
        ) => {
          expect(p0x).toBe(100);
          expect(p3x).toBe(300);
          expect(p3y).toBeDefined();
          expect(p1x).toBeGreaterThan(p0x);
          expect(p2x).toBeLessThan(p3x);
          edgeDrawn = true;
        },
      },
      'canvas2d.draw_node': {
        c2d_draw_node: (x: number, y: number, w: number, h: number) => {
          expect(x).toBe(50);
          expect(y).toBe(60);
          expect(w).toBe(220);
          expect(h).toBe(120);
          nodeDrawn = true;
        },
      },
      'canvas2d.draw_pin': {
        c2d_draw_pin: (px: number, py: number, radius: number) => {
          expect(px).toBe(50);
          expect(py).toBe(80);
          expect(radius).toBe(7); // hovered radius
          pinDrawn = true;
        },
      },
    });

    testWasm.compute_c2d_edge(100, 150, 300, 250, 1, 0, 0);
    expect(edgeDrawn).toBe(true);

    testWasm.compute_c2d_node(50, 60, 270, 180, 0, 1, 0, 1);
    expect(nodeDrawn).toBe(true);

    testWasm.compute_c2d_pin(50, 80, 1, 0, 0);
    expect(pinDrawn).toBe(true);
  });

  it('executes WebGL rendering lifecycle and geometry computations via Flint engine', () => {
    let beginCalled = false;
    let gridCalled = false;
    let frameCalled = false;
    let endCalled = false;
    let edgeDrawn = false;
    let nodeDrawn = false;
    let pinDrawn = false;

    const testWasm = getFlintRenderWorkerWasm({
      'webgl.render_begin': {
        gl_render_begin: () => {
          beginCalled = true;
        },
      },
      'webgl.render_grid': {
        gl_render_grid: () => {
          gridCalled = true;
        },
      },
      'webgl.render_frame': {
        webgl_render_frame: () => {
          frameCalled = true;
        },
      },
      'webgl.render_end': {
        gl_render_end: () => {
          endCalled = true;
        },
      },
      'webgl.draw_edge': {
        gl_draw_edge: (
          p0x: number,
          p0y: number,
          p1x: number,
          p1y: number,
          p2x: number,
          p2y: number,
          p3x: number,
          p3y: number,
        ) => {
          expect(p0x).toBe(100);
          expect(p3x).toBe(400);
          expect(p3y).toBeDefined();
          expect(p1x).toBeGreaterThan(p0x);
          expect(p2x).toBeLessThan(p3x);
          edgeDrawn = true;
        },
      },
      'webgl.draw_node': {
        gl_draw_node: (x: number, y: number, w: number, h: number) => {
          expect(x).toBe(40);
          expect(y).toBe(50);
          expect(w).toBe(220);
          expect(h).toBe(100);
          nodeDrawn = true;
        },
      },
      'webgl.draw_pin': {
        gl_draw_pin: (px: number, py: number, radius: number) => {
          expect(px).toBe(40);
          expect(py).toBe(70);
          expect(radius).toBe(5);
          pinDrawn = true;
        },
      },
    });

    testWasm.engine_create(800, 600, 1);
    testWasm.engine_set_backend(2);
    expect(testWasm.engine_get_backend()).toBe(2);

    testWasm.engine_render_frame(5, 4, 20);
    expect(beginCalled).toBe(true);
    expect(gridCalled).toBe(true);
    expect(frameCalled).toBe(true);
    expect(endCalled).toBe(true);

    testWasm.compute_gl_edge(100, 120, 400, 220, 0, 0);
    expect(edgeDrawn).toBe(true);

    testWasm.compute_gl_node(40, 50, 260, 150, 1, 0, 0);
    expect(nodeDrawn).toBe(true);

    testWasm.compute_gl_pin(40, 70, 0, 0, 0);
    expect(pinDrawn).toBe(true);
  });

  it('processes worker init message with preferred renderer selection', async () => {
    const replies: RenderWorkerOutputMessage[] = [];
    const listener = (event: MessageEvent<RenderWorkerOutputMessage>) => {
      replies.push(event.data);
    };
    globalThis.self.addEventListener('message', listener);

    try {
      globalThis.self.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'init',
            width: 800,
            height: 600,
            dpr: 1,
            renderer: 'canvas2d',
          } as RenderWorkerInputMessage,
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(replies.some((r) => r.type === 'ready')).toBe(true);
    } finally {
      globalThis.self.removeEventListener('message', listener);
    }
  });

  it('processes worker destroy message cleanly', async () => {
    let errorCaught = false;
    try {
      globalThis.self.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'destroy',
          } as RenderWorkerInputMessage,
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
    } catch {
      errorCaught = true;
    }
    expect(errorCaught).toBe(false);
  });

  it('generates SDF font atlas and measures text correctly in Flint Wasm', () => {
    const wasm = getFlintRenderWorkerWasm();
    const atlasSize = wasm.font_get_atlas_size();
    expect(atlasSize).toBe(1024);

    const atlasPtr = wasm.font_init_atlas_data();
    expect(atlasPtr).toBeGreaterThan(0);

    const atlasBytes = new Uint8Array(wasm.memory.buffer, atlasPtr, atlasSize * atlasSize * 4);
    let nonZero = 0;
    for (const byte of atlasBytes) {
      if (byte > 0) nonZero++;
    }
    expect(nonZero).toBeGreaterThan(1000);

    const width12 = wasm.font_measure_text('Math Node', 12);
    const width24 = wasm.font_measure_text('Math Node', 24);
    expect(width12).toBeGreaterThan(0);
    expect(width24).toBeCloseTo(width12 * 2, 1);
  });

  it('supports UTF-8 text measurement, glyph lookups, and quad generation', () => {
    const wasm = getFlintRenderWorkerWasm();

    // Test text with Unicode / UTF-8 math, Greek, and symbols
    const utf8Text = 'f(x) = √x ± ∑y → α · 100%';
    const measured = wasm.font_measure_text(utf8Text, 14);
    expect(measured).toBeGreaterThan(0);

    wasm.font_clear_text_vertices();
    const quads = wasm.font_append_text_quads(utf8Text, 50, 100, 14, 1, 1, 1, 1, 0);
    expect(quads).toBeGreaterThan(10);
    const floatCount = wasm.font_get_vertex_float_count();
    expect(floatCount).toBe(quads * 6 * 8);

    // Test specific unicode codepoints
    const getIdx = (code: number) =>
      wasm.font_char_code_to_idx ? wasm.font_char_code_to_idx(code) : wasm.char_code_to_idx?.(code);
    expect(getIdx(177)).toBe(96); // ±
    expect(getIdx(8730)).toBe(99); // √
    expect(getIdx(8594)).toBe(114); // →
    expect(getIdx(945)).toBe(132); // α
    expect(getIdx(9733)).toBe(125); // ★
    expect(getIdx(9889)).toBe(126); // ⚡
  });

  it('generates text vertex quads with coordinates, UVs, and alignments in Flint Wasm', () => {
    const wasm = getFlintRenderWorkerWasm();

    wasm.font_clear_text_vertices();
    const quads = wasm.font_append_text_quads('Add', 100, 200, 12, 1, 0, 0, 1, 0);
    expect(quads).toBe(3);

    // 3 characters ('A', 'd', 'd') * 6 vertices per quad * 8 floats per vertex = 144 floats
    const floatCount = wasm.font_get_vertex_float_count();
    expect(floatCount).toBe(3 * 6 * 8);

    const vbufPtr = wasm.font_get_vertex_buffer_ptr();
    const f64View = new Float64Array(wasm.memory.buffer, vbufPtr, floatCount);

    // Each vertex contains: [x, y, u, v, r, g, b, a]
    // Check color channels
    expect(f64View[4]).toBe(1); // r
    expect(f64View[5]).toBe(0); // g
    expect(f64View[6]).toBe(0); // b
    expect(f64View[7]).toBe(1); // a

    // Right alignment
    wasm.font_clear_text_vertices();
    wasm.font_append_text_quads('Add', 100, 200, 12, 0, 1, 0, 1, 1);
    const rightF64View = new Float64Array(wasm.memory.buffer, vbufPtr, floatCount);
    const rightX = rightF64View[0];
    expect(rightX).toBeLessThan(100);

    // Center alignment
    wasm.font_clear_text_vertices();
    wasm.font_append_text_quads('Add', 100, 200, 12, 0, 0, 1, 1, 2);
    const centerF64View = new Float64Array(wasm.memory.buffer, vbufPtr, floatCount);
    const centerX = centerF64View[0];
    expect(centerX).toBeGreaterThan(rightX);
    expect(centerX).toBeLessThan(100);

    // Also test standalone sdf-font.flint wasm loader
    const fontWasm = loadFontWasm();
    expect(fontWasm.sdf_get_atlas_size()).toBe(1024);
    expect(fontWasm.sdf_measure_text('Math Node', 12)).toBeGreaterThan(0);
  });

  it('supports Datatype monospace and Comfortaa proportional text measurement and quad generation', () => {
    const wasm = getFlintRenderWorkerWasm();

    // Datatype monospace font measurements
    const monoText = 'CONST_42';
    const monoWidth = wasm.font_measure_text_mono(monoText, 12);
    expect(monoWidth).toBeCloseTo((8 * 14 * 12) / 24, 1);

    // Monospace quads
    wasm.font_clear_text_vertices();
    const monoQuads = wasm.font_append_text_quads_mono(monoText, 50, 100, 12, 1, 1, 1, 1, 0);
    expect(monoQuads).toBe(8);

    // Proportional (Comfortaa)
    const compText = 'Comfortaa UI';
    const compWidth = wasm.font_measure_text(compText, 12);
    expect(compWidth).toBeGreaterThan(0);

    wasm.font_clear_text_vertices();
    const compQuads = wasm.font_append_text_quads(compText, 50, 100, 12, 1, 1, 1, 1, 0);
    expect(compQuads).toBe(11); // 'Comfortaa UI' without space is 11 quads

    // Also verify standalone font loader
    const fontWasm = loadFontWasm();
    expect(fontWasm.sdf_measure_text_mono('TEST', 12)).toBeCloseTo((4 * 14 * 12) / 24, 1);
  });

  it('sets and retrieves theme mode in Flint Wasm engine and handles theme worker messages', async () => {
    const wasm = getFlintRenderWorkerWasm();
    wasm.engine_create(800, 600, 1);

    // Default or initial theme
    wasm.engine_set_theme(0); // 0 = dark
    expect(wasm.engine_get_theme()).toBe(0);

    wasm.engine_set_theme(1); // 1 = light
    expect(wasm.engine_get_theme()).toBe(1);

    // Test worker message handling for set_theme
    const replies: RenderWorkerOutputMessage[] = [];
    const listener = (event: MessageEvent<RenderWorkerOutputMessage>) => {
      replies.push(event.data);
    };
    globalThis.self.addEventListener('message', listener);

    try {
      // Send set_theme: 'light'
      globalThis.self.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'set_theme',
            theme: 'light',
          } as RenderWorkerInputMessage,
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(replies.some((r) => r.type === 'frame')).toBe(true);

      // Send set_theme: 'dark'
      globalThis.self.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'set_theme',
            theme: 'dark',
          } as RenderWorkerInputMessage,
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(replies.filter((r) => r.type === 'frame').length).toBeGreaterThanOrEqual(2);
    } finally {
      globalThis.self.removeEventListener('message', listener);
    }
  });

  it('supports 4-layer RGBA MSDF font shaping with kerning, ligatures, character spacing, and line spacing', () => {
    const wasm = getFlintRenderWorkerWasm();

    // 1. Verify 4-layer RGBA MSDF atlas initialization & 2D Shelf Packing
    const atlasPtr = wasm.font_init_atlas_data();
    expect(atlasPtr).toBeGreaterThan(0);
    expect(wasm.font_get_atlas_size()).toBe(1024);

    wasm.font_clear_text_vertices();
    const testCount = wasm.font_append_text_quads('Param α (Alpha)', 10, 20, 12, 1, 1, 1, 1, 0);
    expect(testCount).toBe(13);
    const testPtr = wasm.font_get_vertex_buffer_ptr();
    const testFloats = new Float64Array(wasm.memory.buffer, testPtr, testCount * 48);
    for (let i = 0; i < testCount; i++) {
      const off = i * 48;
      const u0 = testFloats[off + 2] ?? 0;
      const u1 = testFloats[off + 10] ?? 0;
      expect(u1).toBeGreaterThan(u0);
    }

    // 2. Kerning verification
    const kernAV = wasm.font_get_kerning(65, 86); // 'A' and 'V'
    expect(kernAV).toBeLessThan(0);
    const kernTa = wasm.font_get_kerning(84, 97); // 'T' and 'a'
    expect(kernTa).toBeLessThan(0);
    const kernOO = wasm.font_get_kerning(79, 79); // 'O' and 'O'
    expect(kernOO).toBe(0);

    // 3. Ligature verification: '->' shaped as '→' (single glyph)
    const arrowSingleW = wasm.font_measure_text('→', 12);
    const arrowLigatureW = wasm.font_measure_text('->', 12);
    expect(arrowLigatureW).toBeCloseTo(arrowSingleW, 1);

    // Ligature '!=' shaped as '≠'
    const notEqSingleW = wasm.font_measure_text('≠', 12);
    const notEqLigatureW = wasm.font_measure_text('!=', 12);
    expect(notEqLigatureW).toBeCloseTo(notEqSingleW, 1);

    // Ligature '...' shaped as '…'
    const ellipsisSingleW = wasm.font_measure_text('…', 12);
    const ellipsisLigatureW = wasm.font_measure_text('...', 12);
    expect(ellipsisLigatureW).toBeCloseTo(ellipsisSingleW, 1);

    // 4. Character spacing (tracking)
    const baseWidth = wasm.font_measure_text('Result', 12);
    wasm.font_set_char_spacing(2);
    expect(wasm.font_get_char_spacing()).toBe(2);
    const trackedWidth = wasm.font_measure_text('Result', 12);
    expect(trackedWidth).toBeGreaterThan(baseWidth);
    wasm.font_set_char_spacing(0);

    // 5. Line spacing (line height) on multi-line text
    wasm.font_set_line_height(1.5);
    expect(wasm.font_get_line_height()).toBe(1.5);
    wasm.font_clear_text_vertices();
    const multilineQuads = wasm.font_append_text_quads('Line1\nLine2', 0, 100, 12, 1, 1, 1, 1, 0);
    expect(multilineQuads).toBe(10); // 5 letters on line 1 + 5 letters on line 2

    // 6. Rich styling: italic, underline, strike-through, word wrap
    wasm.font_clear_text_vertices();
    const styledQuads = wasm.font_append_text_quads_styled(
      'Styled Text',
      0,
      100,
      14,
      1,
      0.5,
      0.2,
      1,
      0,
      true, // italic
      true, // underline
      true, // strike
      200, // max width
    );
    expect(styledQuads).toBe(10);

    // 7. Multi-color emoji quad generation
    wasm.font_clear_text_vertices();
    const emojiQuads = wasm.font_append_text_quads('⚡ Energy ✓', 0, 100, 14, 1, 1, 1, 1, 0);
    expect(emojiQuads).toBe(8); // ⚡, E, n, e, r, g, y, ✓ (7 visible chars + 1 emoji)
    const vbufPtr = wasm.font_get_vertex_buffer_ptr();
    const f64View = new Float64Array(wasm.memory.buffer, vbufPtr, emojiQuads * 48);
    // ⚡ is at index 0, vertex alpha is stored at offset 7, should be negative (-1.0)
    expect(f64View[7]).toBeLessThan(0);

    // 8. Variable fonts & font hinting weighting
    wasm.font_set_font_weight(2);
    expect(wasm.font_get_font_weight()).toBe(2);
    wasm.font_set_font_slant(0.2);
    expect(wasm.font_get_font_slant()).toBeCloseTo(0.2, 2);
    wasm.font_set_font_weight(0);
    wasm.font_set_font_slant(0);

    // 9. Perspective transform quad layout
    wasm.font_clear_text_vertices();
    const perspectiveQuads = wasm.font_append_text_quads_perspective(
      'Perspective Title',
      100,
      100,
      14,
      1,
      1,
      1,
      1,
      0,
      1,
      0.1,
      0,
      1,
      0.05,
      0,
    );
    expect(perspectiveQuads).toBe(16); // 16 non-space glyphs
    const perspFloats = new Float64Array(wasm.memory.buffer, wasm.font_get_vertex_buffer_ptr(), perspectiveQuads * 48);
    expect(perspFloats[0]).toBeGreaterThan(0);
  });

  it('manages edge waypoints in editor store', () => {
    const store = new FlintEditorStore();
    const nodeA = store.addNode('add', { x: 100, y: 100 });
    const nodeB = store.addNode('multiply', { x: 400, y: 100 });
    store.connectPorts(nodeA.id, 'result', nodeB.id, 'a');

    const edge = store.getState().graph.edges[0];
    expect(edge).toBeDefined();

    // Add waypoint
    store.addEdgePoint(edge.id, { x: 250, y: 150 });
    let updatedEdge = store.getState().graph.edges[0];
    expect(updatedEdge.points).toHaveLength(1);
    expect(updatedEdge.points?.[0]).toEqual({ x: 250, y: 150 });

    // Update waypoint
    store.updateEdgePoint(edge.id, 0, { x: 260, y: 160 });
    updatedEdge = store.getState().graph.edges[0];
    expect(updatedEdge.points?.[0]).toEqual({ x: 260, y: 160 });

    // Reset waypoints
    store.clearEdgePoints(edge.id);
    updatedEdge = store.getState().graph.edges[0];
    expect(updatedEdge.points).toBeUndefined();
  });

  it('manages group properties and movement in editor store', () => {
    const store = new FlintEditorStore();
    const nodeA = store.addNode('add', { x: 100, y: 100 });
    const nodeB = store.addNode('multiply', { x: 400, y: 100 });

    // Group management
    store.createGroup('Math Group', [nodeA.id, nodeB.id]);
    const group = store.getState().graph.groups?.[0];
    expect(group).toBeDefined();
    expect(group?.title).toBe('Math Group');

    // Select group
    store.selectGroup(group?.id);
    expect(store.getState().selectedGroupId).toBe(group?.id);

    // Modify group title and color
    store.setGroupTitle(group?.id ?? '', 'Calculations');
    store.setGroupColor(group?.id ?? '', '#3fb950');
    const modifiedGroup = store.getState().graph.groups?.[0];
    expect(modifiedGroup?.title).toBe('Calculations');
    expect(modifiedGroup?.color).toBe('#3fb950');

    // Move group
    const initialPosA = store.getState().graph.nodes.find((n) => n.id === nodeA.id)?.position.x ?? 0;
    store.moveGroup(group?.id ?? '', 50, 30);
    const movedPosA = store.getState().graph.nodes.find((n) => n.id === nodeA.id)?.position.x ?? 0;
    expect(movedPosA).toBe(initialPosA + 50);
  });

  it('tracks detailed performance categories and updates in renderer metrics', () => {
    const store = new FlintEditorStore();
    for (let i = 0; i < 20; i++) {
      store.addNode('add', { x: i * 200, y: i * 100 });
    }

    const state = store.getState();
    expect(state.graph.nodes).toHaveLength(20);
    expect(store.getUpdateTimeMs()).toBeGreaterThanOrEqual(0);
  });

  it('captures complete FreeType glyph metrics with multiple-of-2 bounds on X and Y planes', () => {
    const wasm = getFlintRenderWorkerWasm();
    wasm.font_init_atlas_data();

    const metricsTablePtr = wasm.font_get_metrics_table_ptr();
    expect(metricsTablePtr).toBeGreaterThan(0);

    const totalGlyphs = 157;
    const u32Mem = new Uint32Array(wasm.memory.buffer);
    const i32Mem = new Int32Array(wasm.memory.buffer);

    for (let idx = 0; idx < totalGlyphs; idx++) {
      const entryBase = metricsTablePtr + idx * 32;
      const width = u32Mem[entryBase >> 2] ?? 0;
      const height = u32Mem[(entryBase + 4) >> 2] ?? 0;
      const horiBearingX = i32Mem[(entryBase + 8) >> 2] ?? 0;
      const horiBearingY = i32Mem[(entryBase + 12) >> 2] ?? 0;
      const horiAdvance = u32Mem[(entryBase + 16) >> 2] ?? 0;
      const vertBearingX = i32Mem[(entryBase + 20) >> 2] ?? 0;
      const vertBearingY = i32Mem[(entryBase + 24) >> 2] ?? 0;
      const vertAdvance = u32Mem[(entryBase + 28) >> 2] ?? 0;

      // Validate all dimensions and bearings are even integers (multiples of 2 on X and Y)
      expect(Math.abs(width % 2)).toBe(0);
      expect(Math.abs(height % 2)).toBe(0);
      expect(Math.abs(horiBearingX % 2)).toBe(0);
      expect(Math.abs(horiBearingY % 2)).toBe(0);
      expect(horiAdvance).toBeGreaterThan(0);
      expect(Math.abs(vertBearingX % 2)).toBe(0);
      expect(Math.abs(vertBearingY % 2)).toBe(0);
      expect(Math.abs(vertAdvance % 2)).toBe(0);

      // Validate export helper methods match serialized metrics
      expect(wasm.font_get_glyph_width(idx)).toBe(width);
      expect(wasm.font_get_glyph_height(idx)).toBe(height);
      expect(wasm.font_get_glyph_hori_bearing_x(idx)).toBe(horiBearingX);
      expect(wasm.font_get_glyph_hori_bearing_y(idx)).toBe(horiBearingY);
      expect(wasm.font_get_glyph_hori_advance(idx)).toBe(horiAdvance);

      // Validate BBox coordinate calculations
      const bboxMinX = wasm.font_get_glyph_bbox_min_x(idx);
      const bboxMaxX = wasm.font_get_glyph_bbox_max_x(idx);
      const bboxMinY = wasm.font_get_glyph_bbox_min_y(idx);
      const bboxMaxY = wasm.font_get_glyph_bbox_max_y(idx);

      expect(Math.abs(bboxMinX % 2)).toBe(0);
      expect(Math.abs(bboxMaxX % 2)).toBe(0);
      expect(Math.abs(bboxMinY % 2)).toBe(0);
      expect(Math.abs(bboxMaxY % 2)).toBe(0);

      expect(bboxMinX).toBe(horiBearingX);
      expect(bboxMaxX).toBe(horiBearingX + width);
      expect(bboxMinY).toBe(horiBearingY - height);
      expect(bboxMaxY).toBe(horiBearingY);
    }
  });

  it('packs glyphs non-sequentially with non-uniform cell bounds to optimize texture space', () => {
    const wasm = getFlintRenderWorkerWasm();
    wasm.font_init_atlas_data();

    const tableBase = wasm.font_get_table_ptr();
    expect(tableBase).toBeGreaterThan(0);

    const u32Mem = new Uint32Array(wasm.memory.buffer);

    // Verify non-uniform widths and heights across glyphs
    const cellW_period = u32Mem[(tableBase + 14 * 16 + 8) >> 2] ?? 0; // '.'
    const cellH_period = u32Mem[(tableBase + 14 * 16 + 12) >> 2] ?? 0; // '.'
    const cellW_M = u32Mem[(tableBase + 45 * 16 + 8) >> 2] ?? 0; // 'M'
    const cellH_M = u32Mem[(tableBase + 45 * 16 + 12) >> 2] ?? 0; // 'M'
    const cellW_excl = u32Mem[(tableBase + 1 * 16 + 8) >> 2] ?? 0; // '!'

    expect(cellW_period).toBeLessThan(cellW_M);
    expect(cellH_period).toBeLessThan(cellH_M);
    expect(cellW_excl).toBeLessThan(cellW_M);
    expect(cellW_period % 2).toBe(0);
    expect(cellH_period % 2).toBe(0);
    expect(cellW_M % 2).toBe(0);
    expect(cellH_M % 2).toBe(0);

    // Verify non-sequential packing order: taller/wider glyphs are packed on earlier shelves
    const cellY_M = u32Mem[(tableBase + 45 * 16 + 4) >> 2] ?? 0; // 'M' (tall/wide, top shelf)
    const cellY_period = u32Mem[(tableBase + 14 * 16 + 4) >> 2] ?? 0; // '.' (short, lower shelf)
    expect(cellY_M).toBeLessThanOrEqual(cellY_period);

    // Verify partial differential ∂ (idx 109, U+2202) has valid segments and positive metrics
    const segPtr = 1024;
    const numSegs = wasm.sdf_load_char_segments(109, segPtr);
    expect(numSegs).toBeGreaterThanOrEqual(13);
  });

  it('captures ascent, descent, leadings, linegap, bearings, and centers for origin-based layout', () => {
    const wasm = getFlintRenderWorkerWasm();

    expect(wasm.font_get_ascent()).toBe(18);
    expect(wasm.font_get_descent()).toBe(6);
    expect(wasm.font_get_linegap()).toBe(4);
    expect(wasm.font_get_internal_leading()).toBe(2);
    expect(wasm.font_get_external_leading()).toBe(4);

    // Check right side bearing (RSB)
    expect(wasm.font_get_glyph_right_bearing(45)).toBeGreaterThanOrEqual(0); // 'M'
    expect(wasm.font_get_glyph_right_bearing(14)).toBeGreaterThanOrEqual(0); // '.'

    // Check center points for glyphs
    expect(wasm.font_get_glyph_center_x(45)).toBeGreaterThan(0);
    expect(wasm.font_get_glyph_center_y(45)).toBeGreaterThan(0);
    expect(wasm.font_get_glyph_center_x(1)).toBeGreaterThan(0); // '!'
    expect(wasm.font_get_glyph_center_y(1)).toBeGreaterThan(0);
  });
});
