import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick, shallowRef } from 'vue';

import { useDrawing } from './use-drawing';

import type { DrawnFeature } from './use-drawing';
import type { Position } from 'geojson';
import type { Map, MapMouseEvent } from 'maplibre-gl';

vi.mock('maplibre-gl', () => ({}));

// ─── Fake map ─────────────────────────────────────────────────────────────────

function makeFakeMap(queryHits: unknown[] = []): Map {
  return {
    on: vi.fn(),
    off: vi.fn(),
    getSource: vi.fn().mockImplementation(() => {}),
    addSource: vi.fn(),
    removeSource: vi.fn(),
    getLayer: vi.fn().mockImplementation(() => {}),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    queryRenderedFeatures: vi.fn().mockReturnValue(queryHits),
    // project: lngLat → pixel point (identity-ish: scale by 100 to get pixels)
    project: vi.fn().mockImplementation((lngLat: [number, number] | { lng: number; lat: number }) => {
      const lng = Array.isArray(lngLat) ? lngLat[0] : lngLat.lng;
      const lat = Array.isArray(lngLat) ? lngLat[1] : lngLat.lat;
      return { x: lng * 100, y: lat * 100 };
    }),
    // unproject: pixel point → lngLat (inverse of above)
    unproject: vi.fn().mockImplementation((point: [number, number] | { x: number; y: number }) => {
      const x = Array.isArray(point) ? point[0] : point.x;
      const y = Array.isArray(point) ? point[1] : point.y;
      return { lng: x / 100, lat: y / 100 };
    }),
  } as unknown as Map;
}

// ─── Fake map click event ─────────────────────────────────────────────────────

function makeClickEvent(lng: number, lat: number, x = 0, y = 0): MapMouseEvent {
  return {
    lngLat: { lng, lat },
    point: { x, y },
    originalEvent: { preventDefault: vi.fn() },
  } as unknown as MapMouseEvent;
}

// ─── Test wrapper ─────────────────────────────────────────────────────────────

function mountDrawing(initialFeatures?: DrawnFeature[]) {
  const mapReference = shallowRef<Map | undefined>(makeFakeMap());
  let drawing: ReturnType<typeof useDrawing>;

  const Wrapper = defineComponent({
    setup() {
      drawing = useDrawing(mapReference, { initialFeatures });
    },
    template: '<div />',
  });

  mount(Wrapper);
  return { drawing: drawing!, mapReference };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useDrawing — initial state', () => {
  it('starts with null mode and empty features', () => {
    const { drawing } = mountDrawing();
    expect(drawing.mode.value).toBeUndefined();
    expect(drawing.features.value.features).toHaveLength(0);
    expect(drawing.selectedId.value).toBeUndefined();
  });

  it('hydrates from initialFeatures', () => {
    const feature: DrawnFeature = {
      id: 'existing-1',
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: { drawMode: 'polygon' },
    };
    const { drawing } = mountDrawing([feature]);
    expect(drawing.features.value.features).toHaveLength(1);
    expect((drawing.features.value.features[0] as DrawnFeature).id).toBe('existing-1');
  });
});

describe('useDrawing — drawing modes', () => {
  let drawing: ReturnType<typeof useDrawing>;

  beforeEach(() => {
    ({ drawing } = mountDrawing());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('startDrawing sets the mode', () => {
    drawing.startDrawing('line');
    expect(drawing.mode.value).toBe('line');
  });

  it('cancelDrawing resets mode and vertices', () => {
    drawing.startDrawing('polygon');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.cancelDrawing();
    expect(drawing.mode.value).toBeUndefined();
    expect(drawing.draftVertices.value).toHaveLength(0);
  });

  it('draws a line with two vertices', async () => {
    drawing.startDrawing('line');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(1, 1));
    // MapLibre fires a click before dblclick; simulate that extra vertex
    drawing.handleMapClick(makeClickEvent(1, 1));
    drawing.handleMapDblClick(makeClickEvent(1, 1));
    await nextTick();

    const features = drawing.features.value.features;
    expect(features).toHaveLength(1);
    expect(features[0]?.geometry.type).toBe('LineString');
    expect((features[0]?.properties as Record<string, unknown>)?.drawMode).toBe('line');
  });

  it('draws a polygon with three vertices', async () => {
    drawing.startDrawing('polygon');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(1, 0));
    drawing.handleMapClick(makeClickEvent(0.5, 1));
    // MapLibre fires a click before dblclick; simulate that extra vertex
    drawing.handleMapClick(makeClickEvent(0.5, 1));
    drawing.handleMapDblClick(makeClickEvent(0.5, 1));
    await nextTick();

    const features = drawing.features.value.features;
    expect(features).toHaveLength(1);
    expect(features[0]?.geometry.type).toBe('Polygon');
    expect((features[0]?.properties as Record<string, unknown>)?.drawMode).toBe('polygon');
  });

  it('draws a square from two clicks', async () => {
    drawing.startDrawing('square');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(2, 2));
    await nextTick();

    const features = drawing.features.value.features;
    expect(features).toHaveLength(1);
    expect(features[0]?.geometry.type).toBe('Polygon');
    expect((features[0]?.properties as Record<string, unknown>)?.drawMode).toBe('square');
  });

  it('draws a circle from two clicks', async () => {
    drawing.startDrawing('circle');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(1, 0));
    await nextTick();

    const features = drawing.features.value.features;
    expect(features).toHaveLength(1);
    expect(features[0]?.geometry.type).toBe('Polygon');
    expect((features[0]?.properties as Record<string, unknown>)?.drawMode).toBe('circle');
  });

  it('draws a triangle from two clicks', async () => {
    drawing.startDrawing('triangle');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(1, 0));
    await nextTick();

    const features = drawing.features.value.features;
    expect(features).toHaveLength(1);
    expect(features[0]?.geometry.type).toBe('Polygon');
    expect((features[0]?.properties as Record<string, unknown>)?.drawMode).toBe('triangle');
  });

  it('shows a draft feature while drawing', () => {
    drawing.startDrawing('line');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(1, 0));
    expect(drawing.draftFeature.value).not.toBeUndefined();
    expect(drawing.draftFeature.value?.geometry.type).toBe('LineString');
  });

  it('does not commit a line with fewer than 2 vertices', () => {
    drawing.startDrawing('line');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.finishDrawing();
    expect(drawing.features.value.features).toHaveLength(0);
  });

  it('does not commit a polygon with fewer than 3 vertices', () => {
    drawing.startDrawing('polygon');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(1, 0));
    drawing.finishDrawing();
    expect(drawing.features.value.features).toHaveLength(0);
  });
});

describe('useDrawing — selection', () => {
  it('selects a feature via queryRenderedFeatures in idle mode', async () => {
    const featureHit = { id: 'draw-99', properties: { id: 'draw-99' } };
    const mapReference = shallowRef<Map | undefined>(makeFakeMap([featureHit]));
    let drawing: ReturnType<typeof useDrawing>;

    const Wrapper = defineComponent({
      setup() {
        drawing = useDrawing(mapReference);
      },
      template: '<div />',
    });
    mount(Wrapper);

    // In idle mode, a click should query the map and select the hit feature
    drawing!.handleMapClick(makeClickEvent(0, 0));
    expect(drawing!.selectedId.value).toBe('draw-99');

    // A click with no hits should deselect
    (mapReference.value!.queryRenderedFeatures as ReturnType<typeof vi.fn>).mockReturnValue([]);
    drawing!.handleMapClick(makeClickEvent(1, 1));
    expect(drawing!.selectedId.value).toBeUndefined();
  });

  it('selects a feature by id', async () => {
    const { drawing } = mountDrawing();

    drawing.startDrawing('square');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(2, 2));
    await nextTick();

    const id = (drawing.features.value.features[0] as DrawnFeature).id;
    drawing.selectFeature(id);
    expect(drawing.selectedId.value).toBe(id);
  });

  it('deselects when selectFeature(undefined) is called', async () => {
    const { drawing } = mountDrawing();

    drawing.startDrawing('square');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(2, 2));
    await nextTick();

    const id = (drawing.features.value.features[0] as DrawnFeature).id;
    drawing.selectFeature(id);
    drawing.selectFeature();
    expect(drawing.selectedId.value).toBeUndefined();
  });
});

describe('useDrawing — deletion', () => {
  it('deleteFeature removes a feature by id', async () => {
    const { drawing } = mountDrawing();

    drawing.startDrawing('square');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(2, 2));
    await nextTick();

    const id = (drawing.features.value.features[0] as DrawnFeature).id;
    drawing.deleteFeature(id);
    expect(drawing.features.value.features).toHaveLength(0);
  });

  it('deleteSelected removes the currently selected feature', async () => {
    const { drawing } = mountDrawing();

    drawing.startDrawing('square');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(2, 2));
    await nextTick();

    const id = (drawing.features.value.features[0] as DrawnFeature).id;
    drawing.selectFeature(id);
    drawing.deleteSelected();
    expect(drawing.features.value.features).toHaveLength(0);
    expect(drawing.selectedId.value).toBeUndefined();
  });
});

async function drawSquare(drawing: ReturnType<typeof useDrawing>): Promise<string> {
  drawing.startDrawing('square');
  drawing.handleMapClick(makeClickEvent(0, 0));
  drawing.handleMapClick(makeClickEvent(2, 2));
  await nextTick();
  const id = (drawing.features.value.features[0] as DrawnFeature).id;
  drawing.selectFeature(id);
  return id;
}

describe('useDrawing — editing transforms', () => {
  it('scaleSelected changes the feature geometry', async () => {
    const { drawing } = mountDrawing();
    const id = await drawSquare(drawing);

    const before = JSON.stringify(drawing.features.value.features[0]?.geometry);
    drawing.scaleSelected(2);
    const after = JSON.stringify(drawing.features.value.features[0]?.geometry);

    expect(after).not.toBe(before);
    expect((drawing.features.value.features[0] as DrawnFeature).id).toBe(id);
  });

  it('rotateSelected changes the feature geometry', async () => {
    const { drawing } = mountDrawing();
    const id = await drawSquare(drawing);

    const before = JSON.stringify(drawing.features.value.features[0]?.geometry);
    drawing.rotateSelected(45);
    const after = JSON.stringify(drawing.features.value.features[0]?.geometry);

    expect(after).not.toBe(before);
    expect((drawing.features.value.features[0] as DrawnFeature).id).toBe(id);
  });

  it('does nothing when no feature is selected', () => {
    const { drawing } = mountDrawing();
    expect(() => drawing.scaleSelected(2)).not.toThrow();
    expect(() => drawing.rotateSelected(45)).not.toThrow();
    expect(() => drawing.deleteSelected()).not.toThrow();
  });
});

describe('useDrawing — vertex editing', () => {
  it('updateVertex changes a polygon vertex', async () => {
    const { drawing } = mountDrawing();

    drawing.startDrawing('polygon');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(1, 0));
    drawing.handleMapClick(makeClickEvent(0.5, 1));
    drawing.finishDrawing();
    await nextTick();

    const id = (drawing.features.value.features[0] as DrawnFeature).id;
    drawing.selectFeature(id);

    const newPos: Position = [99, 99];
    drawing.updateVertex(0, newPos);

    const geom = drawing.features.value.features[0]?.geometry;
    if (geom?.type === 'Polygon') {
      expect(geom.coordinates[0]?.[0]).toEqual(newPos);
    } else {
      expect.fail('Expected Polygon geometry');
    }
  });

  it('updateVertex changes a line vertex', async () => {
    const { drawing } = mountDrawing();

    drawing.startDrawing('line');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(1, 1));
    drawing.finishDrawing();
    await nextTick();

    const id = (drawing.features.value.features[0] as DrawnFeature).id;
    drawing.selectFeature(id);

    drawing.updateVertex(0, [99, 99]);

    const geom = drawing.features.value.features[0]?.geometry;
    if (geom?.type === 'LineString') {
      expect(geom.coordinates[0]).toEqual([99, 99]);
    } else {
      expect.fail('Expected LineString geometry');
    }
  });

  it('ignores out-of-range vertex index', async () => {
    const { drawing } = mountDrawing();

    drawing.startDrawing('line');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(1, 1));
    drawing.finishDrawing();
    await nextTick();

    const id = (drawing.features.value.features[0] as DrawnFeature).id;
    drawing.selectFeature(id);

    const before = JSON.stringify(drawing.features.value.features[0]?.geometry);
    drawing.updateVertex(999, [0, 0]);
    const after = JSON.stringify(drawing.features.value.features[0]?.geometry);

    expect(after).toBe(before);
  });
});

describe('useDrawing — setFeatures', () => {
  it('replaces all features when setFeatures is called', () => {
    const { drawing } = mountDrawing();

    const newFeature: DrawnFeature = {
      id: 'hydrated-1',
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: { drawMode: 'polygon' },
    };

    drawing.setFeatures([newFeature]);
    expect(drawing.features.value.features).toHaveLength(1);
    expect((drawing.features.value.features[0] as DrawnFeature).id).toBe('hydrated-1');
  });
});

describe('useDrawing — ghost preview', () => {
  it('ghostFeature is null when no mode is active', () => {
    const { drawing } = mountDrawing();
    expect(drawing.ghostFeature.value).toBeUndefined();
  });

  it('ghostFeature updates when mousemove is called during line drawing', () => {
    const { drawing } = mountDrawing();
    drawing.startDrawing('line');
    drawing.handleMapClick(makeClickEvent(0, 0));
    // No ghost yet with only 1 vertex + cursor at [0,0] (same point)
    drawing.handleMapMouseMove(makeClickEvent(1, 1));
    // Now we have 1 vertex + cursor = 2 points → should build a line ghost
    expect(drawing.ghostFeature.value).not.toBeUndefined();
    expect(drawing.ghostFeature.value?.geometry.type).toBe('LineString');
  });

  it('ghostFeature for polygon uses cursor as tentative vertex', () => {
    const { drawing } = mountDrawing();
    drawing.startDrawing('polygon');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(1, 0));
    drawing.handleMapMouseMove(makeClickEvent(0.5, 1));
    // 2 committed vertices + cursor = 3 → enough for polygon
    expect(drawing.ghostFeature.value?.geometry.type).toBe('Polygon');
  });

  it('ghostFeature for circle shows preview after first click', () => {
    const { drawing } = mountDrawing();
    drawing.startDrawing('circle');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapMouseMove(makeClickEvent(1, 0));
    expect(drawing.ghostFeature.value?.geometry.type).toBe('Polygon');
    expect(drawing.ghostFeature.value?.properties?.drawMode).toBe('circle');
  });

  it('ghostFeature for square shows preview after first click', () => {
    const { drawing } = mountDrawing();
    drawing.startDrawing('square');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapMouseMove(makeClickEvent(2, 2));
    expect(drawing.ghostFeature.value?.geometry.type).toBe('Polygon');
    expect(drawing.ghostFeature.value?.properties?.drawMode).toBe('square');
  });

  it('ghostFeature for triangle shows preview after first click', () => {
    const { drawing } = mountDrawing();
    drawing.startDrawing('triangle');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapMouseMove(makeClickEvent(1, 1));
    expect(drawing.ghostFeature.value?.geometry.type).toBe('Polygon');
    expect(drawing.ghostFeature.value?.properties?.drawMode).toBe('triangle');
  });
});

describe('useDrawing — draftVertexPoints', () => {
  it('is empty when not drawing', () => {
    const { drawing } = mountDrawing();
    expect(drawing.draftVertexPoints.value.features).toHaveLength(0);
  });

  it('is empty for non-line/polygon modes', () => {
    const { drawing } = mountDrawing();
    drawing.startDrawing('circle');
    drawing.handleMapClick(makeClickEvent(0, 0));
    expect(drawing.draftVertexPoints.value.features).toHaveLength(0);
  });

  it('accumulates one Point per click during line drawing', () => {
    const { drawing } = mountDrawing();
    drawing.startDrawing('line');
    drawing.handleMapClick(makeClickEvent(0, 0));
    expect(drawing.draftVertexPoints.value.features).toHaveLength(1);
    drawing.handleMapClick(makeClickEvent(1, 1));
    expect(drawing.draftVertexPoints.value.features).toHaveLength(2);
  });
});

describe('useDrawing — anchorPoint', () => {
  it('is null when not drawing', () => {
    const { drawing } = mountDrawing();
    expect(drawing.anchorPoint.value).toBeUndefined();
  });

  it('is null for line/polygon modes', () => {
    const { drawing } = mountDrawing();
    drawing.startDrawing('line');
    drawing.handleMapClick(makeClickEvent(1, 2));
    expect(drawing.anchorPoint.value).toBeUndefined();
  });

  it('appears after first click for circle', () => {
    const { drawing } = mountDrawing();
    drawing.startDrawing('circle');
    drawing.handleMapClick(makeClickEvent(5, 10));
    const anchor = drawing.anchorPoint.value;
    expect(anchor).not.toBeUndefined();
    expect(anchor?.geometry.type).toBe('Point');
    expect((anchor?.geometry as { coordinates: number[] }).coordinates).toEqual([5, 10]);
  });
});

describe('useDrawing — handleMapMoveEnd (reprojection)', () => {
  it('recomputes polygon ring for a square after viewport change', async () => {
    const { drawing, mapReference } = mountDrawing();

    // Use non-symmetric anchor/edge so that different scales produce different rings
    drawing.startDrawing('square');
    drawing.handleMapClick(makeClickEvent(1, 2));
    drawing.handleMapClick(makeClickEvent(4, 3));
    await nextTick();

    const ringBefore = JSON.stringify((drawing.features.value.features[0] as DrawnFeature).geometry);

    // Simulate a zoom that stretches x differently from y (anisotropic scale),
    // so the square's pixel side length maps to different geographic extents.
    (mapReference.value!.project as ReturnType<typeof vi.fn>).mockImplementation((lngLat: [number, number]) => ({
      x: lngLat[0] * 200,
      y: lngLat[1] * 50,
    }));
    (mapReference.value!.unproject as ReturnType<typeof vi.fn>).mockImplementation((pt: [number, number]) => ({
      lng: pt[0] / 200,
      lat: pt[1] / 50,
    }));

    drawing.handleMapMoveEnd();
    await nextTick();

    const ringAfter = JSON.stringify((drawing.features.value.features[0] as DrawnFeature).geometry);
    // The rings differ because the projected pixel positions changed
    expect(ringAfter).not.toBe(ringBefore);

    // Properties should still carry _anchor and _edge
    const properties = (drawing.features.value.features[0] as DrawnFeature).properties;
    expect(properties._anchor).toEqual([1, 2]);
    expect(properties._edge).toEqual([4, 3]);
  });

  it('recomputes polygon ring for a circle after viewport change', async () => {
    const { drawing, mapReference } = mountDrawing();

    drawing.startDrawing('circle');
    drawing.handleMapClick(makeClickEvent(1, 2));
    drawing.handleMapClick(makeClickEvent(4, 2));
    await nextTick();

    const ringBefore = JSON.stringify((drawing.features.value.features[0] as DrawnFeature).geometry);

    // Shift the projection so pixel distances change asymmetrically
    (mapReference.value!.project as ReturnType<typeof vi.fn>).mockImplementation((lngLat: [number, number]) => ({
      x: lngLat[0] * 200,
      y: lngLat[1] * 50,
    }));
    (mapReference.value!.unproject as ReturnType<typeof vi.fn>).mockImplementation((pt: [number, number]) => ({
      lng: pt[0] / 200,
      lat: pt[1] / 50,
    }));

    drawing.handleMapMoveEnd();
    await nextTick();

    const ringAfter = JSON.stringify((drawing.features.value.features[0] as DrawnFeature).geometry);
    expect(ringAfter).not.toBe(ringBefore);
  });

  it('does not change line geometry after moveend', async () => {
    const { drawing } = mountDrawing();

    // Draw a valid 3-vertex line (dblclick removes last, leaving 2)
    drawing.startDrawing('line');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(1, 1));
    drawing.handleMapClick(makeClickEvent(2, 2));
    drawing.handleMapDblClick(makeClickEvent(2, 2));
    await nextTick();

    expect(drawing.features.value.features).toHaveLength(1);
    const geomBefore = JSON.stringify((drawing.features.value.features[0] as DrawnFeature).geometry);

    drawing.handleMapMoveEnd();
    await nextTick();

    const geomAfter = JSON.stringify((drawing.features.value.features[0] as DrawnFeature).geometry);
    expect(geomAfter).toBe(geomBefore);
  });
});

describe('useDrawing — removeVertex', () => {
  it('removes a vertex from a multi-vertex line', async () => {
    const { drawing } = mountDrawing();

    // 4 clicks + dblclick → 3-vertex line
    drawing.startDrawing('line');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(1, 0));
    drawing.handleMapClick(makeClickEvent(2, 0));
    drawing.handleMapClick(makeClickEvent(3, 0));
    drawing.handleMapDblClick(makeClickEvent(3, 0));
    await nextTick();

    const id = (drawing.features.value.features[0] as DrawnFeature).id;
    drawing.removeVertex(id, 1); // remove middle vertex
    await nextTick();

    // 4 clicks + dblclick → dblclick strips last → 3 vertices: (0,0),(1,0),(2,0)
    // removeVertex(id, 1) removes (1,0) → leaves (0,0),(2,0)
    const coords = (drawing.features.value.features[0] as DrawnFeature).geometry as {
      coordinates: number[][];
    };
    expect(coords.coordinates).toHaveLength(2); // 3 - 1 = 2
    expect(coords.coordinates[0]).toEqual([0, 0]);
    expect(coords.coordinates[1]).toEqual([2, 0]);
  });

  it('does nothing when removing a vertex would leave a line with fewer than 2 points', async () => {
    const { drawing } = mountDrawing();

    // 3 clicks + dblclick → exactly 2-vertex line
    drawing.startDrawing('line');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(1, 0));
    drawing.handleMapClick(makeClickEvent(2, 0));
    drawing.handleMapDblClick(makeClickEvent(2, 0));
    await nextTick();

    const id = (drawing.features.value.features[0] as DrawnFeature).id;
    drawing.removeVertex(id, 0);
    await nextTick();

    const coords = (drawing.features.value.features[0] as DrawnFeature).geometry as {
      coordinates: number[][];
    };
    expect(coords.coordinates).toHaveLength(2); // unchanged — guard fired
  });

  it('removes a vertex from a polygon when it has more than 3 unique vertices', async () => {
    const { drawing } = mountDrawing();

    // 5 clicks + dblclick → 4-vertex polygon (ring has 5 coords)
    drawing.startDrawing('polygon');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(1, 0));
    drawing.handleMapClick(makeClickEvent(1, 1));
    drawing.handleMapClick(makeClickEvent(0, 1));
    drawing.handleMapClick(makeClickEvent(0, 2));
    drawing.handleMapDblClick(makeClickEvent(0, 2));
    await nextTick();

    const id = (drawing.features.value.features[0] as DrawnFeature).id;
    drawing.removeVertex(id, 2);
    await nextTick();

    // 5 clicks + dblclick → 4 unique vertices → ring has 5 coords
    // removeVertex(id, 2) removes one → 3 unique + 1 closing = 4 coords
    const ring = ((drawing.features.value.features[0] as DrawnFeature).geometry as { coordinates: number[][][] })
      .coordinates[0];
    expect(ring).toHaveLength(4); // 3 unique + 1 closing = 4
  });

  it('does nothing when removing a polygon vertex would leave fewer than 3 unique vertices', async () => {
    const { drawing } = mountDrawing();

    // 4 clicks + dblclick → 3-vertex polygon (ring has 4 coords)
    drawing.startDrawing('polygon');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(1, 0));
    drawing.handleMapClick(makeClickEvent(1, 1));
    drawing.handleMapClick(makeClickEvent(0, 1));
    drawing.handleMapDblClick(makeClickEvent(0, 1));
    await nextTick();

    const id = (drawing.features.value.features[0] as DrawnFeature).id;
    const ringBefore = JSON.stringify(
      (
        (drawing.features.value.features[0] as DrawnFeature).geometry as {
          coordinates: number[][][];
        }
      ).coordinates[0],
    );
    drawing.removeVertex(id, 0);
    await nextTick();

    const ringAfter = JSON.stringify(
      (
        (drawing.features.value.features[0] as DrawnFeature).geometry as {
          coordinates: number[][][];
        }
      ).coordinates[0],
    );
    expect(ringAfter).toBe(ringBefore); // unchanged — guard fired
  });
});

describe('useDrawing — insertVertex', () => {
  it('inserts a vertex into a line on the nearest segment', async () => {
    const { drawing } = mountDrawing();

    // Draw line from (0,0) → (2,0)
    drawing.startDrawing('line');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(2, 0));
    drawing.handleMapClick(makeClickEvent(4, 0));
    drawing.handleMapDblClick(makeClickEvent(4, 0));
    await nextTick();

    const id = (drawing.features.value.features[0] as DrawnFeature).id;
    const before = ((drawing.features.value.features[0] as DrawnFeature).geometry as { coordinates: number[][] })
      .coordinates.length;

    drawing.insertVertex(id, [1, 0]);
    await nextTick();

    const after = ((drawing.features.value.features[0] as DrawnFeature).geometry as { coordinates: number[][] })
      .coordinates.length;
    expect(after).toBe(before + 1);
  });

  it('inserts a vertex into a polygon on the nearest segment', async () => {
    const { drawing } = mountDrawing();

    drawing.startDrawing('polygon');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(2, 0));
    drawing.handleMapClick(makeClickEvent(2, 2));
    drawing.handleMapClick(makeClickEvent(0, 2));
    drawing.handleMapDblClick(makeClickEvent(0, 2));
    await nextTick();

    const id = (drawing.features.value.features[0] as DrawnFeature).id;
    const ringBefore = ((drawing.features.value.features[0] as DrawnFeature).geometry as { coordinates: number[][][] })
      .coordinates[0].length;

    drawing.insertVertex(id, [1, 0]); // midpoint of bottom edge
    await nextTick();

    const ringAfter = ((drawing.features.value.features[0] as DrawnFeature).geometry as { coordinates: number[][][] })
      .coordinates[0].length;
    expect(ringAfter).toBe(ringBefore + 1);
  });
});

describe('useDrawing — splitSelected', () => {
  it('splits a selected line into two lines at the midpoint', async () => {
    const { drawing } = mountDrawing();

    // 5 clicks + dblclick → 4-vertex line
    drawing.startDrawing('line');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(1, 0));
    drawing.handleMapClick(makeClickEvent(2, 0));
    drawing.handleMapClick(makeClickEvent(3, 0));
    drawing.handleMapClick(makeClickEvent(4, 0));
    drawing.handleMapDblClick(makeClickEvent(4, 0));
    await nextTick();

    expect(drawing.features.value.features).toHaveLength(1);
    const id = (drawing.features.value.features[0] as DrawnFeature).id;
    drawing.selectFeature(id);

    drawing.splitSelected();
    await nextTick();

    expect(drawing.features.value.features).toHaveLength(2);
    const types = drawing.features.value.features.map((f) => f.geometry.type);
    expect(types).toEqual(['LineString', 'LineString']);
  });

  it('does nothing when no feature is selected', () => {
    const { drawing } = mountDrawing();
    drawing.splitSelected();
    expect(drawing.features.value.features).toHaveLength(0);
  });

  it('handles splitting a 2-vertex line by inserting a midpoint', async () => {
    const { drawing } = mountDrawing();

    drawing.startDrawing('line');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(2, 0));
    drawing.handleMapClick(makeClickEvent(4, 0));
    drawing.handleMapDblClick(makeClickEvent(4, 0));
    await nextTick();

    // Manually trim to 2 vertices by selecting and using setFeatures
    const id = (drawing.features.value.features[0] as DrawnFeature).id;
    drawing.setFeatures([
      {
        id,
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [4, 0],
          ],
        },
        properties: { drawMode: 'line', id },
      },
    ]);
    drawing.selectFeature(id);

    drawing.splitSelected();
    await nextTick();

    expect(drawing.features.value.features).toHaveLength(2);
    const coords0 = (drawing.features.value.features[0].geometry as { coordinates: number[][] }).coordinates;
    const coords1 = (drawing.features.value.features[1].geometry as { coordinates: number[][] }).coordinates;
    // Both halves share the synthesised midpoint
    expect(coords0.at(-1)).toEqual(coords1[0]);
  });
});

describe('useDrawing — joinLines', () => {
  it('merges two lines into one', async () => {
    const { drawing } = mountDrawing();

    drawing.setFeatures([
      {
        id: 'line-a',
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [1, 0],
          ],
        },
        properties: { drawMode: 'line', id: 'line-a' },
      },
      {
        id: 'line-b',
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [1, 0],
            [2, 0],
          ],
        },
        properties: { drawMode: 'line', id: 'line-b' },
      },
    ]);
    await nextTick();

    expect(drawing.features.value.features).toHaveLength(2);
    drawing.joinLines('line-a', 'line-b');
    await nextTick();

    expect(drawing.features.value.features).toHaveLength(1);
    expect(drawing.features.value.features[0].geometry.type).toBe('LineString');
  });

  it('picks the nearest endpoint pair when lines are not already touching', async () => {
    const { drawing } = mountDrawing();

    drawing.setFeatures([
      {
        id: 'la',
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [1, 0],
          ],
        },
        properties: { drawMode: 'line', id: 'la' },
      },
      {
        id: 'lb',
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [10, 0],
            [11, 0],
          ],
        },
        properties: { drawMode: 'line', id: 'lb' },
      },
    ]);
    await nextTick();

    drawing.joinLines('la', 'lb');
    await nextTick();

    expect(drawing.features.value.features).toHaveLength(1);
    const coords = (drawing.features.value.features[0].geometry as { coordinates: number[][] }).coordinates;
    // The merged line should start at [0,0] (start of la, farthest from lb)
    // and end at [11,0] (end of lb, farthest from la)
    // Nearest pair is end of la [1,0] ↔ start of lb [10,0]
    expect(coords[0]).toEqual([0, 0]);
    expect(coords.at(-1)).toEqual([11, 0]);
  });

  it('does nothing if either feature is not a LineString', async () => {
    const { drawing } = mountDrawing();

    drawing.setFeatures([
      {
        id: 'poly',
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 0],
            ],
          ],
        },
        properties: { drawMode: 'polygon', id: 'poly' },
      },
      {
        id: 'ln',
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [2, 0],
            [3, 0],
          ],
        },
        properties: { drawMode: 'line', id: 'ln' },
      },
    ]);
    await nextTick();

    drawing.joinLines('poly', 'ln');
    await nextTick();

    expect(drawing.features.value.features).toHaveLength(2); // unchanged
  });
});

describe('useDrawing — idle dblclick vertex ops', () => {
  it('removes a vertex via dblclick on vertex handle in idle mode', async () => {
    const mapReference = shallowRef<Map | undefined>(makeFakeMap());
    let drawing: ReturnType<typeof useDrawing>;

    const Wrapper = defineComponent({
      setup() {
        drawing = useDrawing(mapReference);
      },
      template: '<div />',
    });
    mount(Wrapper);

    // Draw a 3-vertex line
    drawing!.startDrawing('line');
    drawing!.handleMapClick(makeClickEvent(0, 0));
    drawing!.handleMapClick(makeClickEvent(1, 0));
    drawing!.handleMapClick(makeClickEvent(2, 0));
    drawing!.handleMapClick(makeClickEvent(3, 0));
    drawing!.handleMapDblClick(makeClickEvent(3, 0));
    await nextTick();

    expect(drawing!.features.value.features[0]).toBeDefined();
    const id = (drawing!.features.value.features[0] as DrawnFeature).id;
    drawing!.selectFeature(id);

    // Simulate dblclick on vertex 1 — queryRenderedFeatures returns a vertex hit
    (mapReference.value!.queryRenderedFeatures as ReturnType<typeof vi.fn>).mockReturnValueOnce([
      { properties: { vertexIndex: 1 } },
    ]); // vertex hit
    (mapReference.value!.queryRenderedFeatures as ReturnType<typeof vi.fn>).mockReturnValueOnce([]); // shape hit (not reached)

    drawing!.handleMapDblClick(makeClickEvent(1, 0, 100, 0));
    await nextTick();

    const coords = ((drawing!.features.value.features[0] as DrawnFeature).geometry as { coordinates: number[][] })
      .coordinates;
    expect(coords).toHaveLength(2); // 3 - 1 = 2
  });

  it('inserts a vertex via dblclick on a line segment in idle mode', async () => {
    const mapReference = shallowRef<Map | undefined>(makeFakeMap());
    let drawing: ReturnType<typeof useDrawing>;

    const Wrapper = defineComponent({
      setup() {
        drawing = useDrawing(mapReference);
      },
      template: '<div />',
    });
    mount(Wrapper);

    // Draw a 2-vertex line
    drawing!.startDrawing('line');
    drawing!.handleMapClick(makeClickEvent(0, 0));
    drawing!.handleMapClick(makeClickEvent(2, 0));
    drawing!.handleMapClick(makeClickEvent(4, 0));
    drawing!.handleMapDblClick(makeClickEvent(4, 0));
    await nextTick();

    const id = (drawing!.features.value.features[0] as DrawnFeature).id;
    drawing!.selectFeature(id);
    const coordsBefore = ((drawing!.features.value.features[0] as DrawnFeature).geometry as { coordinates: number[][] })
      .coordinates.length;

    // Simulate dblclick on the line segment (no vertex hit, but a shape hit)
    (mapReference.value!.queryRenderedFeatures as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce([]) // no vertex hit
      .mockReturnValueOnce([{ id, properties: { id } }]); // shape hit

    drawing!.handleMapDblClick(makeClickEvent(1, 0, 50, 0));
    await nextTick();

    const coordsAfter = ((drawing!.features.value.features[0] as DrawnFeature).geometry as { coordinates: number[][] })
      .coordinates.length;
    expect(coordsAfter).toBe(coordsBefore + 1);
  });
});

describe('useDrawing — measureLabels', () => {
  it('produces a length label for a committed line', async () => {
    const { drawing } = mountDrawing();

    // 3 clicks + dblclick: dblclick strips last duplicate → 2 vertices remain → valid line
    drawing.startDrawing('line');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(1, 0));
    drawing.handleMapClick(makeClickEvent(2, 0));
    drawing.handleMapDblClick(makeClickEvent(2, 0));
    await nextTick();

    const labels = drawing.measureLabels.value.features;
    expect(labels).toHaveLength(1);
    const label = labels[0].properties?.label as string;
    // The label must be a non-empty string ending with "m" or "km"
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
    expect(/\d+(\.\d+)?\s?(m|km)$/.test(label)).toBe(true);
    // Label should be at a Point geometry
    expect(labels[0].geometry.type).toBe('Point');
  });

  it('produces an area label for a committed polygon', async () => {
    const { drawing } = mountDrawing();

    // 4 clicks + dblclick: dblclick strips last duplicate → 3 vertices remain → valid polygon
    drawing.startDrawing('polygon');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(1, 0));
    drawing.handleMapClick(makeClickEvent(1, 1));
    drawing.handleMapClick(makeClickEvent(0, 1));
    drawing.handleMapDblClick(makeClickEvent(0, 1));
    await nextTick();

    const labels = drawing.measureLabels.value.features;
    expect(labels).toHaveLength(1);
    const label = labels[0].properties?.label as string;
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
    expect(/\d+(\.\d+)?\s?(m²|km²)$/.test(label)).toBe(true);
    expect(labels[0].geometry.type).toBe('Point');
  });

  it('produces separate labels for multiple committed shapes', async () => {
    const { drawing } = mountDrawing();

    // Draw a line (3 clicks + dblclick → 2 vertices)
    drawing.startDrawing('line');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(1, 0));
    drawing.handleMapClick(makeClickEvent(2, 0));
    drawing.handleMapDblClick(makeClickEvent(2, 0));
    await nextTick();

    // Draw a polygon (4 clicks + dblclick → 3 vertices)
    drawing.startDrawing('polygon');
    drawing.handleMapClick(makeClickEvent(10, 10));
    drawing.handleMapClick(makeClickEvent(11, 10));
    drawing.handleMapClick(makeClickEvent(11, 11));
    drawing.handleMapClick(makeClickEvent(10, 11));
    drawing.handleMapDblClick(makeClickEvent(10, 11));
    await nextTick();

    expect(drawing.features.value.features).toHaveLength(2);
    expect(drawing.measureLabels.value.features).toHaveLength(2);
  });

  it('has no labels when there are no committed features', () => {
    const { drawing } = mountDrawing();
    expect(drawing.measureLabels.value.features).toHaveLength(0);
  });

  it('removes a label when the feature is deleted', async () => {
    const { drawing } = mountDrawing();

    // 3 clicks + dblclick → 2 vertices → valid line
    drawing.startDrawing('line');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(1, 0));
    drawing.handleMapClick(makeClickEvent(2, 0));
    drawing.handleMapDblClick(makeClickEvent(2, 0));
    await nextTick();

    expect(drawing.measureLabels.value.features).toHaveLength(1);

    const id = (drawing.features.value.features[0] as DrawnFeature).id;
    drawing.deleteFeature(id);
    await nextTick();

    expect(drawing.measureLabels.value.features).toHaveLength(0);
  });
});

describe('useDrawing — drag move', () => {
  it('handleMapMouseDown initiates drag on a shape hit and moves it on mousemove', async () => {
    // We need a map whose queryRenderedFeatures returns a vertex-miss then a shape-hit.
    // Build the drawing first to know the feature id, then swap the mock.
    const mapReference = shallowRef<Map | undefined>(makeFakeMap());
    let drawing: ReturnType<typeof useDrawing>;

    const Wrapper = defineComponent({
      setup() {
        drawing = useDrawing(mapReference);
      },
      template: '<div />',
    });
    mount(Wrapper);

    // Draw a square
    drawing!.startDrawing('square');
    drawing!.handleMapClick(makeClickEvent(0, 0));
    drawing!.handleMapClick(makeClickEvent(2, 2));
    await nextTick();

    const id = (drawing!.features.value.features[0] as DrawnFeature).id;
    drawing!.selectFeature(id);

    // Now configure the fake map to return a shape hit for the next mousedown
    const fakeFeatureHit = { id, properties: { id } };
    (mapReference.value!.queryRenderedFeatures as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce([]) // vertex check → no hits
      .mockReturnValueOnce([fakeFeatureHit]); // shape check → hit

    const geomBefore = JSON.stringify(drawing!.features.value.features[0]?.geometry);

    drawing!.handleMapMouseDown(makeClickEvent(1, 1, 50, 50));
    expect(drawing!.isDragging.value).toBe(true);

    drawing!.handleMapMouseMove(makeClickEvent(2, 2, 60, 60));
    drawing!.handleMapMouseUp(makeClickEvent(2, 2, 60, 60));

    const geomAfter = JSON.stringify(drawing!.features.value.features[0]?.geometry);
    expect(geomAfter).not.toBe(geomBefore);
    expect(drawing!.isDragging.value).toBe(false);
  });
});

describe('useDrawing — geodesic toggle', () => {
  it('defaults to geodesic=true', () => {
    const { drawing } = mountDrawing();
    expect(drawing.geodesic.value).toBe(true);
  });

  it('setGeodesic(false) changes the flag', () => {
    const { drawing } = mountDrawing();
    drawing.setGeodesic(false);
    expect(drawing.geodesic.value).toBe(false);
    drawing.setGeodesic(true);
    expect(drawing.geodesic.value).toBe(true);
  });

  it('flat moveSelected shifts coordinates by raw delta without geodesic warp', async () => {
    const { drawing } = mountDrawing();

    // Draw a line: 3 clicks + dblclick — dblclick strips the last vertex,
    // leaving exactly 2 vertices which is valid for a LineString.
    drawing.startDrawing('line');
    drawing.handleMapClick(makeClickEvent(10, 20));
    drawing.handleMapClick(makeClickEvent(11, 21));
    drawing.handleMapClick(makeClickEvent(12, 22));
    drawing.handleMapDblClick(makeClickEvent(12, 22));
    await nextTick();

    const id = (drawing.features.value.features[0] as DrawnFeature).id;
    drawing.selectFeature(id);
    drawing.setGeodesic(false);

    const before = drawing.features.value.features[0]?.geometry as {
      type: string;
      coordinates: number[][];
    };
    drawing.moveSelected(1, 2);

    const after = drawing.features.value.features[0]?.geometry as {
      type: string;
      coordinates: number[][];
    };
    // In flat mode each coordinate is shifted by exactly [deltaLng, deltaLat]
    expect(after.coordinates[0][0]).toBeCloseTo(before.coordinates[0][0] + 1, 10);
    expect(after.coordinates[0][1]).toBeCloseTo(before.coordinates[0][1] + 2, 10);
    expect(after.coordinates[1][0]).toBeCloseTo(before.coordinates[1][0] + 1, 10);
    expect(after.coordinates[1][1]).toBeCloseTo(before.coordinates[1][1] + 2, 10);
  });

  it('flat scaleSelected scales coordinates around centroid without geodesic warp', async () => {
    const { drawing } = mountDrawing();

    // Draw a polygon (square-ish 2×2 around origin)
    drawing.startDrawing('polygon');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(2, 0));
    drawing.handleMapClick(makeClickEvent(2, 2));
    drawing.handleMapClick(makeClickEvent(0, 2));
    drawing.handleMapDblClick(makeClickEvent(0, 2));
    await nextTick();

    const id = (drawing.features.value.features[0] as DrawnFeature).id;
    drawing.selectFeature(id);
    drawing.setGeodesic(false);

    const factor = 2;
    const before = drawing.features.value.features[0]?.geometry as {
      type: string;
      coordinates: number[][][];
    };
    drawing.scaleSelected(factor);

    const after = drawing.features.value.features[0]?.geometry as {
      type: string;
      coordinates: number[][][];
    };

    // The bounding box should be twice as wide and tall after scaling by factor 2
    const beforeLngs = before.coordinates[0].map((c) => c[0]);
    const afterLngs = after.coordinates[0].map((c) => c[0]);
    const beforeLats = before.coordinates[0].map((c) => c[1]);
    const afterLats = after.coordinates[0].map((c) => c[1]);
    const beforeWidth = Math.max(...beforeLngs) - Math.min(...beforeLngs);
    const afterWidth = Math.max(...afterLngs) - Math.min(...afterLngs);
    const beforeHeight = Math.max(...beforeLats) - Math.min(...beforeLats);
    const afterHeight = Math.max(...afterLats) - Math.min(...afterLats);
    expect(afterWidth).toBeCloseTo(beforeWidth * factor, 5);
    expect(afterHeight).toBeCloseTo(beforeHeight * factor, 5);
  });

  it('flat moveSelected also shifts _anchor and _edge for two-click shapes', async () => {
    const { drawing } = mountDrawing();

    drawing.startDrawing('square');
    drawing.handleMapClick(makeClickEvent(0, 0));
    drawing.handleMapClick(makeClickEvent(2, 2));
    await nextTick();

    const id = (drawing.features.value.features[0] as DrawnFeature).id;
    drawing.selectFeature(id);
    drawing.setGeodesic(false);

    const before = drawing.features.value.features[0] as DrawnFeature;
    const anchorBefore = before.properties._anchor as [number, number];

    drawing.moveSelected(1, 1);

    const after = drawing.features.value.features[0] as DrawnFeature;
    const anchorAfter = after.properties._anchor as [number, number];
    expect(anchorAfter[0]).toBeCloseTo(anchorBefore[0] + 1, 10);
    expect(anchorAfter[1]).toBeCloseTo(anchorBefore[1] + 1, 10);
  });
});
