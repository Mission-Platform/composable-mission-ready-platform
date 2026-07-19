import { describe, expect, it, vi } from 'vitest';

import { DrawingStore, type DrawnFeature } from './drawing-store';

import type { Map } from 'maplibre-gl';

// These tests pin the idempotency guards that keep `DrawingStore` from driving
// an infinite render loop. The neutral `useDrawing` hook subscribes to the
// store and mirrors its getters into framework state, so *every* `notify()`
// triggers a re-render. A `<MapDraw modelValue={[]}>` re-creates that default
// array on each render, so `setFeatures`/`setGeodesic` must only notify when
// something actually changed — otherwise notify → re-render → new array →
// setFeatures → notify … never terminates.

function makeFeature(id: string): DrawnFeature {
  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    },
    properties: { drawMode: 'line' },
  };
}

describe('DrawingStore idempotency', () => {
  it('setFeatures does not notify when a new but equal array is passed', () => {
    const store = new DrawingStore([]);
    let notifications = 0;
    store.subscribe(() => {
      notifications += 1;
    });

    // Fresh empty array reference, same (empty) contents — the exact pattern a
    // `modelValue = []` prop default produces on every render.
    store.setFeatures([]);
    expect(notifications).toBe(0);

    const a = makeFeature('a');
    store.setFeatures([a]);
    expect(notifications).toBe(1);

    // New array, same element identity → no change → no notify.
    store.setFeatures([a]);
    expect(notifications).toBe(1);
  });

  it('setFeatures notifies when the feature set actually changes', () => {
    const a = makeFeature('a');
    const store = new DrawingStore([a]);
    let notifications = 0;
    store.subscribe(() => {
      notifications += 1;
    });

    // Different length.
    store.setFeatures([a, makeFeature('b')]);
    expect(notifications).toBe(1);
    expect(store.getFeatures().features).toHaveLength(2);

    // Same length, different element identity.
    store.setFeatures([makeFeature('a'), makeFeature('b')]);
    expect(notifications).toBe(2);
  });

  it('setGeodesic only notifies when the value changes', () => {
    const store = new DrawingStore([]);
    let notifications = 0;
    store.subscribe(() => {
      notifications += 1;
    });

    // Store defaults to geodesic = true, so setting true again is a no-op.
    store.setGeodesic(true);
    expect(notifications).toBe(0);
    expect(store.getGeodesic()).toBe(true);

    store.setGeodesic(false);
    expect(notifications).toBe(1);
    expect(store.getGeodesic()).toBe(false);

    store.setGeodesic(false);
    expect(notifications).toBe(1);
  });
});

// A controlled `<MapDraw>` feeds its `mode`/`geodesic` back through change
// events. If the store's first snapshot doesn't already match those props, the
// mount-time "emit" effect pushes the stale default back to the owner, fighting
// the prop→store sync effect: an infinite update loop in React (and a ghost
// outline that never activates in Vue, because `mode` is immediately cleared).
// Seeding the initial state from the props removes that first-render mismatch.
describe('DrawingStore initial state seeding', () => {
  it('defaults to an idle mode and geodesic = true', () => {
    const store = new DrawingStore([]);
    expect(store.getMode()).toBeUndefined();
    expect(store.getGeodesic()).toBe(true);
  });

  it('seeds the initial mode so the first snapshot matches a controlled prop', () => {
    const store = new DrawingStore([], { mode: 'polygon' });
    // Available immediately — before any startDrawing() / notify().
    expect(store.getMode()).toBe('polygon');
  });

  it('seeds the initial geodesic flag from the options', () => {
    const store = new DrawingStore([], { geodesic: false });
    expect(store.getGeodesic()).toBe(false);
  });

  it('re-applying the seeded geodesic value is a no-op (no notify → no loop)', () => {
    // The controlled `geodesic` sync effect runs `setGeodesic(prop)` on mount.
    // Because the store was seeded with the same value, that must not notify —
    // otherwise mount would kick off notify → re-render → setGeodesic → notify.
    const store = new DrawingStore([makeFeature('a')], { mode: 'line', geodesic: false });
    let notifications = 0;
    store.subscribe(() => {
      notifications += 1;
    });

    store.setGeodesic(false);
    expect(notifications).toBe(0);
    expect(store.getMode()).toBe('line');
    expect(store.getGeodesic()).toBe(false);
  });
});

// Single clicks add points and double-clicks finish shapes / edit vertices, so
// the map must not fire its native double-click-to-zoom while the tool owns
// those gestures. Attaching disables it; detaching restores it.
describe('DrawingStore double-click zoom handling', () => {
  function makeMapMock(): {
    map: Map;
    doubleClickZoom: { enable: ReturnType<typeof vi.fn>; disable: ReturnType<typeof vi.fn> };
  } {
    const doubleClickZoom = { enable: vi.fn(), disable: vi.fn() };
    const map = {
      on: vi.fn(),
      off: vi.fn(),
      getCanvas: vi.fn(() => undefined),
      doubleClickZoom,
    } as unknown as Map;
    return { map, doubleClickZoom };
  }

  it('disables double-click zoom while the tool is attached to a map', () => {
    const store = new DrawingStore([]);
    const { map, doubleClickZoom } = makeMapMock();

    store.setMap(map);

    expect(doubleClickZoom.disable).toHaveBeenCalledTimes(1);
    expect(doubleClickZoom.enable).not.toHaveBeenCalled();
  });

  it('re-enables double-click zoom when the map detaches', () => {
    const store = new DrawingStore([]);
    const { map, doubleClickZoom } = makeMapMock();

    store.setMap(map);
    store.setMap(undefined);

    expect(doubleClickZoom.enable).toHaveBeenCalledTimes(1);
  });
});

// Web Mercator maps longitude to pixels linearly but latitude non-linearly, so
// adding a constant latitude delta (in degrees) to every vertex distorts a
// shape that spans latitudes: its north/south extent stretches or squashes.
// Moving in flat (non-geodesic) mode must instead translate the shape rigidly
// in screen-pixel space so it keeps its viewport-relative shape.
describe('DrawingStore flat move preserves viewport shape', () => {
  // A minimal Web-Mercator-like projection: longitude is linear in x, latitude
  // is non-linear in y (the property that broke the old degree-based move).
  function project([lng, lat]: [number, number]): { x: number; y: number } {
    const latRad = (lat * Math.PI) / 180;
    const y = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    return { x: lng * 100, y: -y * 100 };
  }

  function unproject([x, y]: [number, number]): { lng: number; lat: number } {
    const yMerc = -y / 100;
    const latRad = 2 * Math.atan(Math.exp(yMerc)) - Math.PI / 2;
    return { lng: x / 100, lat: (latRad * 180) / Math.PI };
  }

  function makeProjectingMap(): Map {
    return {
      on: vi.fn(),
      off: vi.fn(),
      getCanvas: vi.fn(() => undefined),
      doubleClickZoom: { enable: vi.fn(), disable: vi.fn() },
      dragPan: { enable: vi.fn(), disable: vi.fn() },
      project: vi.fn(project),
      unproject: vi.fn(unproject),
    } as unknown as Map;
  }

  function pixelBox(feature: DrawnFeature): { width: number; height: number } {
    const ring = (feature.geometry as { coordinates: [number, number][][] }).coordinates[0];
    const points = ring.map((c) => project([c[0], c[1]]));
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  }

  function makeTallPolygon(): DrawnFeature {
    // A shape spanning a wide latitude range — where the non-linear projection
    // makes the bug obvious.
    return {
      type: 'Feature',
      id: 'poly',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 10],
            [10, 10],
            [10, 60],
            [0, 60],
            [0, 10],
          ],
        ],
      },
      properties: { drawMode: 'polygon' },
    };
  }

  it('keeps the on-screen width and height when moving north/south (geodesic off)', () => {
    const store = new DrawingStore([makeTallPolygon()], { geodesic: false });
    store.setMap(makeProjectingMap());
    store.selectFeature('poly');

    const before = pixelBox(store.getFeatures().features[0] as DrawnFeature);

    // Move the shape south by 20° of latitude.
    store.moveSelected(0, -20);

    const after = pixelBox(store.getFeatures().features[0] as DrawnFeature);

    expect(after.width).toBeCloseTo(before.width, 6);
    expect(after.height).toBeCloseTo(before.height, 6);
  });

  it('translates the shape rigidly on screen when moving north/south', () => {
    const store = new DrawingStore([makeTallPolygon()], { geodesic: false });
    store.setMap(makeProjectingMap());
    store.selectFeature('poly');

    const ringBefore = (store.getFeatures().features[0] as DrawnFeature).geometry as {
      coordinates: [number, number][][];
    };
    const pixelsBefore = ringBefore.coordinates[0].map((c) => project(c));

    store.moveSelected(0, -20);

    const ringAfter = (store.getFeatures().features[0] as DrawnFeature).geometry as {
      coordinates: [number, number][][];
    };
    const pixelsAfter = ringAfter.coordinates[0].map((c) => project(c));

    // Every vertex must shift by the same pixel offset (rigid translation).
    const dx = pixelsAfter[0].x - pixelsBefore[0].x;
    const dy = pixelsAfter[0].y - pixelsBefore[0].y;
    for (let index = 0; index < pixelsBefore.length; index++) {
      expect(pixelsAfter[index].x - pixelsBefore[index].x).toBeCloseTo(dx, 6);
      expect(pixelsAfter[index].y - pixelsBefore[index].y).toBeCloseTo(dy, 6);
    }
    // The move was purely north/south, so there is no horizontal shift.
    expect(dx).toBeCloseTo(0, 6);
    expect(dy).not.toBeCloseTo(0, 6);
  });
});
