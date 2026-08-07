// ─── DrawingStore ──────────────────────────────────────────────────────────────
//
// Framework-agnostic imperative store holding all drawing/editing state and the
// TurfJS geometry logic for the map drawing tool. It carries no framework
// import, so the two-stage compiler copies it verbatim onto both the React and
// Vue builds. The thin neutral `useDrawing` hook wraps this store, mirroring its
// getters into `useState` (so a state change re-renders) and forwarding the map
// instance and event handlers.

import {
  area,
  bearing,
  centroid,
  distance,
  featureCollection,
  length,
  lineString,
  midpoint,
  point,
  polygon,
  transformRotate,
  transformScale,
  transformTranslate,
} from '@turf/turf';

import type { Feature, FeatureCollection, Geometry, LineString, Point, Polygon, Position } from 'geojson';
import type { Map, MapMouseEvent } from 'maplibre-gl';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Format a length in metres to a human-readable string.
 * Lengths ≥ 1 000 m are shown in km (1 decimal place); smaller values in m (0 dp).
 */
function formatLength(metres: number): string {
  if (metres >= 1000) return `${(metres / 1000).toFixed(1)} km`;
  return `${Math.round(metres)} m`;
}

/**
 * Format an area in square metres to a human-readable string.
 * Areas ≥ 1 000 000 m² are shown in km² (2 dp); smaller values in m² (0 dp).
 */
function formatArea(squareMetres: number): string {
  if (squareMetres >= 1_000_000) return `${(squareMetres / 1_000_000).toFixed(2)} km²`;
  return `${Math.round(squareMetres)} m²`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

/** Shape types supported by the drawing tool. */
export type DrawMode = 'line' | 'polygon' | 'square' | 'circle' | 'triangle' | undefined;

/** Unique string ID associated with a drawn feature. */
export type FeatureId = string | number;

/**
 * A drawn GeoJSON feature that always carries a string `id` and a `drawMode`
 * property so that the renderer knows how it was originally created.
 *
 * Two-click shapes (square, circle, triangle) additionally store `_anchor`
 * and `_edge` geographic positions so the polygon ring can be recomputed
 * after pan/zoom to maintain visual shape.
 */
export type DrawnFeature = Feature & {
  id: FeatureId;
  properties: {
    drawMode: DrawMode;
    /** Geographic [lng, lat] of the first click — stored for reprojection. */
    _anchor?: [number, number];
    /** Geographic [lng, lat] of the second click — stored for reprojection. */
    _edge?: [number, number];
    [key: string]: unknown;
  };
};

let idCounter = 0;
function nextId(): FeatureId {
  return `draw-${++idCounter}`;
}

/**
 * Squared perpendicular distance from point `p` to segment `[a, b]`.
 * Used for fast nearest-segment lookup without needing a square root.
 */
function distributionToSegmentSquared(p: Position, a: Position, b: Position): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) {
    const ex = p[0] - a[0];
    const ey = p[1] - a[1];
    return ex * ex + ey * ey;
  }
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  const nx = a[0] + t * dx - p[0];
  const ny = a[1] + t * dy - p[1];
  return nx * nx + ny * ny;
}

/**
 * Returns the insertion index for a new vertex nearest to `pos` in `coords`
 * (i.e., `coords.splice(index, 0, pos)` places it on the closest segment).
 */
function nearestSegmentIndex(coords: Position[], pos: Position): number {
  let bestDistribution = Infinity;
  let bestIndex = 1;
  for (let index = 0; index < coords.length - 1; index++) {
    const d = distributionToSegmentSquared(pos, coords[index], coords[index + 1]);
    if (d < bestDistribution) {
      bestDistribution = d;
      bestIndex = index + 1;
    }
  }
  return bestIndex;
}

/**
 * Build an equilateral triangle in screen-pixel space so that it looks
 * visually equilateral regardless of the map projection.
 */
function buildTriangle(origin: Position, edgePoint: Position, map: Map, existingId?: FeatureId): DrawnFeature {
  const pOrigin = map.project(origin as [number, number]);
  const pEdge = map.project(edgePoint as [number, number]);

  const dx = pEdge.x - pOrigin.x;
  const dy = pEdge.y - pOrigin.y;
  const radius = Math.hypot(dx, dy);
  const baseAngle = Math.atan2(dy, dx);

  const vertices: Position[] = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((offset) => {
    const angle = baseAngle + offset;
    const px = pOrigin.x + radius * Math.cos(angle);
    const py = pOrigin.y + radius * Math.sin(angle);
    const ll = map.unproject([px, py]);
    return [ll.lng, ll.lat] as Position;
  });

  const id = existingId ?? nextId();
  const feat = polygon([[...vertices, vertices[0]]], {
    drawMode: 'triangle',
    id,
    _anchor: origin as [number, number],
    _edge: edgePoint as [number, number],
  }) as DrawnFeature;
  feat.id = id;
  return feat;
}

/**
 * Build a square in screen-pixel space from two opposite corners so that
 * it appears visually square regardless of the map projection.
 */
function buildSquare(corner1: Position, corner2: Position, map: Map, existingId?: FeatureId): DrawnFeature {
  const p1 = map.project(corner1 as [number, number]);
  const p2 = map.project(corner2 as [number, number]);

  const dxPx = p2.x - p1.x;
  const dyPx = p2.y - p1.y;
  const side = Math.max(Math.abs(dxPx), Math.abs(dyPx));
  const sx = Math.sign(dxPx) || 1;
  const sy = Math.sign(dyPx) || 1;

  const pixelCorners: [number, number][] = [
    [p1.x, p1.y],
    [p1.x + side * sx, p1.y],
    [p1.x + side * sx, p1.y + side * sy],
    [p1.x, p1.y + side * sy],
    [p1.x, p1.y],
  ];

  const ring: Position[] = pixelCorners.map(([px, py]) => {
    const ll = map.unproject([px, py]);
    return [ll.lng, ll.lat] as Position;
  });

  const id = existingId ?? nextId();
  const feat = polygon([ring], {
    drawMode: 'square',
    id,
    _anchor: corner1 as [number, number],
    _edge: corner2 as [number, number],
  }) as DrawnFeature;
  feat.id = id;
  return feat;
}

/**
 * Build a circle polygon in screen-pixel space from a centre and edge point
 * so that it appears visually circular regardless of the map projection.
 */
function buildCircle(centre: Position, edgePoint: Position, map: Map, existingId?: FeatureId): DrawnFeature {
  const pCentre = map.project(centre as [number, number]);
  const pEdge = map.project(edgePoint as [number, number]);

  const dx = pEdge.x - pCentre.x;
  const dy = pEdge.y - pCentre.y;
  const radiusPx = Math.max(Math.hypot(dx, dy), 1);

  const steps = 64;
  const ringCoords: Position[] = Array.from({ length: steps }, (_, index) => {
    const angle = (2 * Math.PI * index) / steps;
    const px = pCentre.x + radiusPx * Math.cos(angle);
    const py = pCentre.y + radiusPx * Math.sin(angle);
    const ll = map.unproject([px, py]);
    return [ll.lng, ll.lat] as Position;
  });
  ringCoords.push(ringCoords[0]);

  const id = existingId ?? nextId();
  const feat = polygon([ringCoords], {
    drawMode: 'circle',
    id,
    _anchor: centre as [number, number],
    _edge: edgePoint as [number, number],
  }) as DrawnFeature;
  feat.id = id;
  return feat;
}

/** Build a LineString from at least two vertices. */
function buildLine(vertices: Position[]): DrawnFeature | undefined {
  if (vertices.length < 2) return undefined;
  const id = nextId();
  const feat = lineString(vertices, { drawMode: 'line', id }) as DrawnFeature;
  feat.id = id;
  return feat;
}

/** Build a Polygon from at least three vertices. */
function buildPolygon(vertices: Position[]): DrawnFeature | undefined {
  if (vertices.length < 3) return undefined;
  const ring = [...vertices, vertices[0]];
  const id = nextId();
  const feat = polygon([ring], { drawMode: 'polygon', id }) as DrawnFeature;
  feat.id = id;
  return feat;
}

/** Attempt to close the draft vertices into a committed shape for the given mode. */
function commitShape(mode: DrawMode, vertices: Position[], map: Map | undefined): DrawnFeature | undefined {
  switch (mode) {
    case 'line': {
      return buildLine(vertices);
    }
    case 'polygon': {
      return buildPolygon(vertices);
    }
    case 'square': {
      return vertices.length >= 2 && map ? buildSquare(vertices[0], vertices.at(-1) ?? [0, 0], map) : undefined;
    }
    case 'circle': {
      return vertices.length >= 2 && map ? buildCircle(vertices[0], vertices.at(-1) ?? [0, 0], map) : undefined;
    }
    case 'triangle': {
      return vertices.length >= 2 && map ? buildTriangle(vertices[0], vertices.at(-1) ?? [0, 0], map) : undefined;
    }
    default: {
      return undefined;
    }
  }
}

/** Build a real-time preview feature while the user is still placing vertices. */
function buildDraftFeature(mode: DrawMode, vertices: Position[], map: Map | undefined): DrawnFeature | undefined {
  if (!mode || vertices.length === 0) return undefined;

  switch (mode) {
    case 'line': {
      return vertices.length >= 2 ? buildLine(vertices) : undefined;
    }
    case 'polygon': {
      return vertices.length >= 2 ? buildPolygon(vertices) : undefined;
    }
    case 'square': {
      return vertices.length >= 2 && map ? buildSquare(vertices[0], vertices.at(-1) ?? [0, 0], map) : undefined;
    }
    case 'circle': {
      return vertices.length >= 2 && map ? buildCircle(vertices[0], vertices.at(-1) ?? [0, 0], map) : undefined;
    }
    case 'triangle': {
      return vertices.length >= 2 && map ? buildTriangle(vertices[0], vertices.at(-1) ?? [0, 0], map) : undefined;
    }
    default: {
      return undefined;
    }
  }
}

/**
 * Build a ghost (cursor-following) preview for the shape currently being drawn.
 */
function buildGhostFeature(
  mode: DrawMode,
  vertices: Position[],
  cursor: Position | undefined,
  map: Map | undefined,
): DrawnFeature | undefined {
  if (!mode || !cursor || vertices.length === 0) return undefined;

  switch (mode) {
    case 'line': {
      const pts = [...vertices, cursor];
      return pts.length >= 2 ? buildLine(pts) : undefined;
    }
    case 'polygon': {
      const pts = [...vertices, cursor];
      return pts.length >= 2 ? buildPolygon(pts) : undefined;
    }
    case 'square': {
      return map ? buildSquare(vertices[0], cursor, map) : undefined;
    }
    case 'circle': {
      return map ? buildCircle(vertices[0], cursor, map) : undefined;
    }
    case 'triangle': {
      return map ? buildTriangle(vertices[0], cursor, map) : undefined;
    }
    default: {
      return undefined;
    }
  }
}

// ─── Drag state ───────────────────────────────────────────────────────────────

type DragTarget =
  | { type: 'feature'; featureId: FeatureId; startLng: number; startLat: number }
  | {
      type: 'vertex';
      featureId: FeatureId;
      vertexIndex: number;
      startLng: number;
      startLat: number;
    };

/**
 * Imperative, framework-agnostic drawing store. Holds all mutable drawing state
 * and geometry logic; notifies subscribers whenever state changes so the neutral
 * `useDrawing` hook can re-render.
 */
export class DrawingStore {
  private mode: DrawMode = undefined;
  private selectedId: FeatureId | undefined = undefined;
  private draftVertices: Position[] = [];
  private committedFeatures: DrawnFeature[];
  private cursorPos: Position | undefined = undefined;
  private dragging = false;
  private dragTarget: DragTarget | undefined = undefined;
  private geodesic = true;
  private map: Map | undefined = undefined;
  private readonly listeners = new Set<() => void>();

  constructor(initialFeatures: DrawnFeature[] = [], initialState: { mode?: DrawMode; geodesic?: boolean } = {}) {
    this.committedFeatures = initialFeatures;
    // Seed the initial mode/geodesic from the owner's (possibly controlled)
    // props so the store's snapshot matches the props on first render. Without
    // this, `mode` would start as `undefined` while a controlled `mode` prop is
    // set; the "emit" effect then pushes that stale `undefined` back to the
    // owner, fighting the prop→store sync effect — an infinite update loop in
    // React (and a ghost that never activates in Vue).
    this.mode = initialState.mode;
    if (initialState.geodesic !== undefined) this.geodesic = initialState.geodesic;
  }

  // ── Subscription ──────────────────────────────────────────────────────────

  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Attach the store to a map instance, wiring (or unwiring) its event handlers. */
  setMap(map: Map | undefined): void {
    if (this.map === map) return;
    if (this.map) {
      this.map.off('click', this.handleMapClick);
      this.map.off('dblclick', this.handleMapDblClick);
      this.map.off('mousemove', this.handleMapMouseMove);
      this.map.off('mousedown', this.handleMapMouseDown);
      this.map.off('mouseup', this.handleMapMouseUp);
      this.map.off('moveend', this.handleMapMoveEnd);
      this.map.off('zoomend', this.handleMapMoveEnd);
      // Restore the map's native double-click-to-zoom once the tool detaches.
      this.map.doubleClickZoom?.enable();
    }
    this.map = map;
    if (map) {
      map.on('click', this.handleMapClick);
      map.on('dblclick', this.handleMapDblClick);
      map.on('mousemove', this.handleMapMouseMove);
      map.on('mousedown', this.handleMapMouseDown);
      map.on('mouseup', this.handleMapMouseUp);
      map.on('moveend', this.handleMapMoveEnd);
      map.on('zoomend', this.handleMapMoveEnd);
      // The drawing tool owns double-click (finish a line/polygon, insert or
      // remove a vertex) and single clicks add points; MapLibre's default
      // double-click-to-zoom would otherwise fire on the same gesture and zoom
      // the map while the user is adding or modifying points. Disable it for as
      // long as the tool is attached; it is re-enabled when the map detaches.
      map.doubleClickZoom?.disable();
      this.applyCursor();
    }
  }

  // ── Map wiring ────────────────────────────────────────────────────────────

  getMode(): DrawMode {
    return this.mode;
  }

  getSelectedId(): FeatureId | undefined {
    return this.selectedId;
  }

  // ── Getters (snapshots for the neutral hook) ────────────────────────────────

  getGeodesic(): boolean {
    return this.geodesic;
  }

  getIsDragging(): boolean {
    return this.dragging;
  }

  getFeatures(): FeatureCollection {
    return featureCollection(this.committedFeatures as Feature[]);
  }

  getDraftFeature(): DrawnFeature | undefined {
    return buildDraftFeature(this.mode, this.draftVertices, this.map);
  }

  getGhostFeature(): DrawnFeature | undefined {
    return buildGhostFeature(this.mode, this.draftVertices, this.cursorPos, this.map);
  }

  getDraftVertexPoints(): FeatureCollection {
    if (!this.mode || !['line', 'polygon'].includes(this.mode)) {
      return featureCollection([]);
    }
    const pointFeatures: Feature<Point>[] = this.draftVertices.map((pos, index) => ({
      type: 'Feature',
      id: index,
      geometry: { type: 'Point', coordinates: pos },
      properties: { vertexIndex: index },
    }));
    return featureCollection(pointFeatures);
  }

  getAnchorPoint(): Feature<Point> | undefined {
    if (!this.mode || !['square', 'circle', 'triangle'].includes(this.mode) || this.draftVertices.length === 0) {
      return undefined;
    }
    const [lng, lat] = this.draftVertices[0];
    return {
      type: 'Feature',
      id: 'anchor',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: { role: 'anchor' },
    };
  }

  getMeasureLabels(): FeatureCollection {
    const labelFeatures: Feature<Point>[] = [];

    for (const f of this.committedFeatures) {
      const geom = f.geometry;
      if (geom.type === 'LineString') {
        const length_ =
          typeof f.properties._length === 'number'
            ? f.properties._length
            : length(f as Feature, { units: 'kilometres' }) * 1000;
        const coords = geom.coordinates;
        if (coords.length >= 2) {
          const mid = midpoint(point(coords[0] as [number, number]), point(coords.at(-1) as [number, number]));
          labelFeatures.push({
            type: 'Feature',
            id: `${f.id}-label`,
            geometry: mid.geometry,
            properties: { label: formatLength(length_), featureId: f.id },
          });
        }
      } else if (geom.type === 'Polygon') {
        const sqm = typeof f.properties._area === 'number' ? f.properties._area : area(f as Feature);
        const c = centroid(f as Feature);
        labelFeatures.push({
          type: 'Feature',
          id: `${f.id}-label`,
          geometry: c.geometry,
          properties: { label: formatArea(sqm), featureId: f.id },
        });
      }
    }

    return featureCollection(labelFeatures);
  }

  startDrawing = (newMode: DrawMode): void => {
    this.draftVertices = [];
    this.mode = newMode;
    this.selectedId = undefined;
    this.notify();
  };

  finishDrawing = (): void => {
    if (!this.mode) return;
    const committed = commitShape(this.mode, this.draftVertices, this.map);
    if (committed) {
      this.committedFeatures = [...this.committedFeatures, this.stampMeasure(committed)];
      this.selectedId = committed.id;
    }
    this.draftVertices = [];
    this.mode = undefined;
    this.notify();
  };

  // ── Measurement stamping ────────────────────────────────────────────────────

  cancelDrawing = (): void => {
    this.draftVertices = [];
    this.mode = undefined;
    this.notify();
  };

  // ── Drawing actions ─────────────────────────────────────────────────────────

  selectFeature = (id?: FeatureId): void => {
    if (this.mode) {
      this.draftVertices = [];
      this.mode = undefined;
    }
    this.selectedId = id;
    this.notify();
  };

  deleteFeature = (id: FeatureId): void => {
    this.committedFeatures = this.committedFeatures.filter((f) => f.id !== id);
    if (this.selectedId === id) this.selectedId = undefined;
    this.notify();
  };

  deleteSelected = (): void => {
    if (this.selectedId) this.deleteFeature(this.selectedId);
  };

  // ── Selection ─────────────────────────────────────────────────────────────

  setGeodesic = (value: boolean): void => {
    if (this.geodesic === value) return;
    this.geodesic = value;
    this.notify();
  };

  // ── Deletion ────────────────────────────────────────────────────────────────

  moveSelected = (deltaLng: number, deltaLat: number): void => {
    if (this.geodesic) {
      this.replaceSelected((f) => {
        const distribution = distance(point([0, 0]), point([deltaLng, deltaLat]), { units: 'kilometres' });
        const bear = bearing(point([0, 0]), point([deltaLng, deltaLat]));
        const moved = transformTranslate(f, distribution, bear, { units: 'kilometres' }) as DrawnFeature;
        moved.id = f.id;
        moved.properties = { ...f.properties };
        return moved;
      });
    } else {
      this.replaceSelected((f) => this.translateFeatureFlat(f, deltaLng, deltaLat));
    }
    this.notify();
  };

  scaleSelected = (factor: number): void => {
    if (this.geodesic) {
      this.replaceSelected((f) => {
        const scaled = transformScale(f, factor) as DrawnFeature;
        scaled.id = f.id;
        scaled.properties = { ...f.properties };
        return this.stampMeasure(scaled);
      });
    } else {
      this.replaceSelected((f) => this.stampMeasure(this.scaleFeatureFlat(f, factor)));
    }
    this.notify();
  };

  // ── Transform operations ────────────────────────────────────────────────────

  rotateSelected = (degrees: number): void => {
    this.replaceSelected((f) => {
      const rotated = transformRotate(f, degrees) as DrawnFeature;
      rotated.id = f.id;
      rotated.properties = { ...f.properties };
      return rotated;
    });
    this.notify();
  };

  updateVertex = (vertexIndex: number, position: Position): void => {
    if (!this.selectedId) return;
    const feature = this.committedFeatures.find((f) => f.id === this.selectedId);
    if (!feature) return;

    const geom = feature.geometry as LineString | Polygon;
    if (geom.type === 'LineString') {
      const coords = [...geom.coordinates];
      if (vertexIndex < 0 || vertexIndex >= coords.length) return;
      coords[vertexIndex] = position;
      const updated = this.stampMeasure({
        ...feature,
        geometry: { ...geom, coordinates: coords },
        properties: { ...feature.properties },
      });
      this.committedFeatures = this.committedFeatures.map((f) => (f.id === this.selectedId ? updated : f));
    } else if (geom.type === 'Polygon') {
      const rings = geom.coordinates.map((ring: Position[]) => [...ring]);
      const outerRing = rings[0];
      if (!outerRing || vertexIndex < 0 || vertexIndex >= outerRing.length - 1) return;
      outerRing[vertexIndex] = position;
      if (vertexIndex === 0) outerRing[outerRing.length - 1] = position;
      const updated = this.stampMeasure({
        ...feature,
        geometry: { ...geom, coordinates: rings },
        properties: { ...feature.properties },
      });
      this.committedFeatures = this.committedFeatures.map((f) => (f.id === this.selectedId ? updated : f));
    }
    this.notify();
  };

  removeVertex = (featureId: FeatureId, vertexIndex: number): void => {
    const feature = this.committedFeatures.find((f) => f.id === featureId);
    if (!feature) return;

    const geom = feature.geometry as LineString | Polygon;

    if (geom.type === 'LineString') {
      if (geom.coordinates.length <= 2) return;
      const coords = geom.coordinates.filter((_, index) => index !== vertexIndex);
      this.committedFeatures = this.committedFeatures.map((f) =>
        f.id === featureId
          ? this.stampMeasure({
              ...feature,
              geometry: { ...geom, coordinates: coords },
              properties: { ...feature.properties },
            } as DrawnFeature)
          : f,
      );
    } else if (geom.type === 'Polygon') {
      const ring = [...(geom.coordinates[0] ?? [])];
      if (ring.length - 1 <= 3) return;
      ring.splice(vertexIndex, 1);
      if (vertexIndex === 0) ring[ring.length - 1] = ring[0];
      this.committedFeatures = this.committedFeatures.map((f) =>
        f.id === featureId
          ? this.stampMeasure({
              ...feature,
              geometry: { ...geom, coordinates: [ring] },
              properties: { ...feature.properties },
            } as DrawnFeature)
          : f,
      );
    }
    this.notify();
  };

  insertVertex = (featureId: FeatureId, clickPos: Position): void => {
    const feature = this.committedFeatures.find((f) => f.id === featureId);
    if (!feature) return;

    const geom = feature.geometry as LineString | Polygon;

    if (geom.type === 'LineString') {
      const coords = [...geom.coordinates];
      const index = nearestSegmentIndex(coords, clickPos);
      coords.splice(index, 0, clickPos);
      this.committedFeatures = this.committedFeatures.map((f) =>
        f.id === featureId
          ? this.stampMeasure({
              ...feature,
              geometry: { ...geom, coordinates: coords },
              properties: { ...feature.properties },
            } as DrawnFeature)
          : f,
      );
    } else if (geom.type === 'Polygon') {
      const ring = [...(geom.coordinates[0] ?? [])];
      const index = nearestSegmentIndex(ring, clickPos);
      ring.splice(index, 0, clickPos);
      this.committedFeatures = this.committedFeatures.map((f) =>
        f.id === featureId
          ? this.stampMeasure({
              ...feature,
              geometry: { ...geom, coordinates: [ring] },
              properties: { ...feature.properties },
            } as DrawnFeature)
          : f,
      );
    }
    this.notify();
  };

  splitSelected = (): void => {
    if (!this.selectedId) return;
    const feature = this.committedFeatures.find((f) => f.id === this.selectedId);
    if (feature?.geometry.type !== 'LineString') return;

    let coords = [...feature.geometry.coordinates];
    if (coords.length < 2) return;

    if (coords.length === 2) {
      const mid: Position = [(coords[0][0] + coords[1][0]) / 2, (coords[0][1] + coords[1][1]) / 2];
      coords = [coords[0], mid, coords[1]];
    }

    const midIndex = Math.floor(coords.length / 2);
    const coords1 = coords.slice(0, midIndex + 1);
    const coords2 = coords.slice(midIndex);

    const id1 = nextId();
    const feat1 = lineString(coords1, { drawMode: 'line', id: id1 }) as DrawnFeature;
    feat1.id = id1;

    const id2 = nextId();
    const feat2 = lineString(coords2, { drawMode: 'line', id: id2 }) as DrawnFeature;
    feat2.id = id2;

    this.committedFeatures = [...this.committedFeatures.filter((f) => f.id !== this.selectedId), feat1, feat2];
    this.selectedId = id1;
    this.notify();
  };

  joinLines = (id1: FeatureId, id2: FeatureId): void => {
    const f1 = this.committedFeatures.find((f) => f.id === id1);
    const f2 = this.committedFeatures.find((f) => f.id === id2);
    if (!f1 || !f2) return;
    if (f1.geometry.type !== 'LineString' || f2.geometry.type !== 'LineString') return;

    const c1 = [...f1.geometry.coordinates];
    const c2 = [...f2.geometry.coordinates];

    const distribution2 = (a: Position, b: Position): number => {
      const dx = a[0] - b[0];
      const dy = a[1] - b[1];
      return dx * dx + dy * dy;
    };

    const start1 = c1[0];
    const end1 = c1.at(-1) ?? [0, 0];
    const start2 = c2[0];
    const end2 = c2.at(-1) ?? [0, 0];

    const options: { d: number; merged: Position[] }[] = [
      { d: distribution2(end1, start2), merged: [...c1, ...c2] },
      { d: distribution2(end1, end2), merged: [...c1, ...c2.toReversed()] },
      { d: distribution2(start1, end2), merged: [...c2, ...c1] },
      { d: distribution2(start1, start2), merged: [...c2.toReversed(), ...c1] },
    ];
    let best: { d: number; merged: Position[] } = { d: Number.POSITIVE_INFINITY, merged: [] };
    for (const option of options) {
      if (option.d < best.d) best = option;
    }

    const newId = nextId();
    const merged = lineString(best.merged, { drawMode: 'line', id: newId }) as DrawnFeature;
    merged.id = newId;

    this.committedFeatures = [...this.committedFeatures.filter((f) => f.id !== id1 && f.id !== id2), merged];
    this.selectedId = newId;
    this.notify();
  };

  setFeatures = (newFeatures: DrawnFeature[]): void => {
    // Guard against redundant hydration: callers frequently pass a *new* array
    // reference holding the same features (e.g. a `modelValue = []` prop default
    // that is re-created on every render). Without this shallow-equality check,
    // `notify()` would re-render the owner, which re-creates the array, which
    // re-invokes `setFeatures` — an infinite update loop. Only notify when the
    // committed feature set has actually changed.
    const current = this.committedFeatures;
    if (current.length === newFeatures.length && current.every((f, index) => f === newFeatures[index])) {
      return;
    }
    this.committedFeatures = newFeatures;
    this.notify();
  };

  // ── Vertex editing ──────────────────────────────────────────────────────────

  handleMapMouseMove = (event: MapMouseEvent): void => {
    const { lng, lat } = event.lngLat;
    this.cursorPos = [lng, lat];

    if (!this.dragging || !this.dragTarget) {
      this.notify();
      return;
    }

    if (this.dragTarget.type === 'feature') {
      const deltaLng = lng - this.dragTarget.startLng;
      const deltaLat = lat - this.dragTarget.startLat;
      this.dragTarget.startLng = lng;
      this.dragTarget.startLat = lat;
      this.moveSelected(deltaLng, deltaLat);
    } else if (this.dragTarget.type === 'vertex') {
      this.updateVertex(this.dragTarget.vertexIndex, [lng, lat]);
    }
  };

  handleMapMouseDown = (event: MapMouseEvent): void => {
    if (this.mode) return;

    const map = this.map;
    if (!map) return;

    const { x, y } = event.point;
    const buffer = 8;
    const bbox: [[number, number], [number, number]] = [
      [x - buffer, y - buffer],
      [x + buffer, y + buffer],
    ];

    const vertexHits = map.queryRenderedFeatures(bbox, { layers: ['map-draw-vertices-circle'] });
    if (vertexHits.length > 0 && this.selectedId) {
      const vertexIndex = vertexHits[0].properties?.vertexIndex as number | undefined;
      if (vertexIndex != undefined) {
        const { lng, lat } = event.lngLat;
        this.dragging = true;
        this.dragTarget = { type: 'vertex', featureId: this.selectedId, vertexIndex, startLng: lng, startLat: lat };
        map.dragPan?.disable();
        this.notify();
        return;
      }
    }

    const shapeHits = map.queryRenderedFeatures(bbox, { layers: ['map-draw-fill', 'map-draw-line'] });
    if (shapeHits.length > 0) {
      const rawId = shapeHits[0].id ?? shapeHits[0].properties?.id;
      const featureId = rawId == undefined ? undefined : String(rawId);
      if (featureId) {
        const { lng, lat } = event.lngLat;
        if (this.selectedId !== featureId) this.selectFeature(featureId);
        this.dragging = true;
        this.dragTarget = { type: 'feature', featureId, startLng: lng, startLat: lat };
        map.dragPan?.disable();
        this.notify();
      }
    }
  };

  handleMapMouseUp = (): void => {
    if (!this.dragging) return;
    this.dragging = false;
    this.dragTarget = undefined;
    this.map?.dragPan?.enable();
    this.notify();
  };

  // ── Line split / join ───────────────────────────────────────────────────────

  handleMapMoveEnd = (): void => {
    const map = this.map;
    if (!map) return;
    this.committedFeatures = this.committedFeatures.map((f) => {
      const { drawMode, _anchor, _edge } = f.properties ?? {};
      if (!_anchor || !_edge) return f;
      let rebuilt: DrawnFeature;
      switch (drawMode) {
        case 'square': {
          rebuilt = buildSquare(_anchor as Position, _edge as Position, map, f.id);
          break;
        }
        case 'circle': {
          rebuilt = buildCircle(_anchor as Position, _edge as Position, map, f.id);
          break;
        }
        case 'triangle': {
          rebuilt = buildTriangle(_anchor as Position, _edge as Position, map, f.id);
          break;
        }
        default: {
          return f;
        }
      }
      if (typeof f.properties._area === 'number') {
        rebuilt = { ...rebuilt, properties: { ...rebuilt.properties, _area: f.properties._area } };
      }
      return rebuilt;
    });
    this.notify();
  };

  handleMapClick = (event: MapMouseEvent): void => {
    if (!this.mode) {
      const map = this.map;
      if (!map) return;

      const { x, y } = event.point;
      const buffer = 6;
      const bbox: [[number, number], [number, number]] = [
        [x - buffer, y - buffer],
        [x + buffer, y + buffer],
      ];
      const hits = map.queryRenderedFeatures(bbox, { layers: ['map-draw-fill', 'map-draw-line'] });

      if (hits.length > 0) {
        const rawId = hits[0].id ?? hits[0].properties?.id;
        const featureId = rawId == undefined ? undefined : String(rawId);
        if (featureId) {
          this.selectFeature(featureId);
        }
      } else {
        this.selectFeature();
      }
      return;
    }

    const { lng, lat } = event.lngLat;
    const vertex: Position = [lng, lat];

    if (['square', 'circle', 'triangle'].includes(this.mode)) {
      if (this.draftVertices.length === 0) {
        this.draftVertices = [vertex];
        this.notify();
      } else {
        this.draftVertices = [...this.draftVertices, vertex];
        this.finishDrawing();
      }
      return;
    }

    this.draftVertices = [...this.draftVertices, vertex];
    this.notify();
  };

  // ── External hydration ────────────────────────────────────────────────────

  handleMapDblClick = (event: MapMouseEvent): void => {
    if (!this.mode) {
      const map = this.map;
      if (!map) return;

      const { x, y } = event.point;
      const buffer = 8;
      const bbox: [[number, number], [number, number]] = [
        [x - buffer, y - buffer],
        [x + buffer, y + buffer],
      ];

      const vertexHits = map.queryRenderedFeatures(bbox, { layers: ['map-draw-vertices-circle'] });
      if (vertexHits.length > 0 && this.selectedId) {
        const vertexIndex = vertexHits[0].properties?.vertexIndex as number | undefined;
        if (vertexIndex != undefined) {
          this.removeVertex(this.selectedId, vertexIndex);
          event.originalEvent?.preventDefault();
          return;
        }
      }

      const shapeHits = map.queryRenderedFeatures(bbox, { layers: ['map-draw-fill', 'map-draw-line'] });
      if (shapeHits.length > 0) {
        const rawId = shapeHits[0].id ?? shapeHits[0].properties?.id;
        const featureId = rawId == undefined ? undefined : String(rawId);
        if (featureId) {
          const { lng, lat } = event.lngLat;
          this.insertVertex(featureId, [lng, lat]);
          this.selectFeature(featureId);
          event.originalEvent?.preventDefault();
        }
      }
      return;
    }

    this.draftVertices = this.draftVertices.slice(0, -1);
    this.finishDrawing();
  };

  // ── Map event handlers ──────────────────────────────────────────────────────

  private notify(): void {
    this.applyCursor();
    for (const listener of this.listeners) listener();
  }

  private applyCursor(): void {
    const canvas = this.map?.getCanvas();
    if (!canvas) return;
    if (this.mode) {
      canvas.style.cursor = 'crosshair';
    } else if (this.dragging) {
      canvas.style.cursor = 'grabbing';
    } else if (this.selectedId) {
      canvas.style.cursor = 'grab';
    } else {
      canvas.style.cursor = '';
    }
  }

  private stampMeasure(f: DrawnFeature): DrawnFeature {
    const geom = f.geometry;
    if (geom.type === 'LineString') {
      const metres = length(f, { units: 'kilometres' }) * 1000;
      return { ...f, properties: { ...f.properties, _length: metres } };
    }
    if (geom.type === 'Polygon') {
      const sqm = area(f);
      return { ...f, properties: { ...f.properties, _area: sqm } };
    }
    return f;
  }

  private replaceSelected(transform: (f: DrawnFeature) => DrawnFeature): void {
    if (!this.selectedId) return;
    this.committedFeatures = this.committedFeatures.map((f) => (f.id === this.selectedId ? transform(f) : f));
  }

  private translateFeatureFlat(f: DrawnFeature, deltaLng: number, deltaLat: number): DrawnFeature {
    // Translate the shape rigidly in screen-pixel space so it keeps its
    // viewport-relative shape. Web Mercator's longitude→pixel mapping is linear
    // (so a fixed `deltaLng` moves every vertex by the same number of pixels),
    // but its latitude→pixel mapping is not: the same `deltaLat` in degrees maps
    // to a different pixel offset depending on latitude. Adding `deltaLat` to
    // every vertex therefore stretches/squashes a shape that spans latitudes —
    // the north/south distortion this fixes. We derive a single uniform pixel
    // offset from the shape's centroid, then project each vertex, shift it by
    // that offset, and unproject it back.
    const map = this.map;
    const shift = map
      ? (() => {
          const c = centroid(f);
          const [cLng, cLat] = c.geometry.coordinates;
          const pReference = map.project([cLng, cLat] as [number, number]);
          const pMoved = map.project([cLng + deltaLng, cLat + deltaLat] as [number, number]);
          const pixelDx = pMoved.x - pReference.x;
          const pixelDy = pMoved.y - pReference.y;
          return ([lng, lat, ...rest]: Position): Position => {
            const p = map.project([lng, lat] as [number, number]);
            const ll = map.unproject([p.x + pixelDx, p.y + pixelDy]);
            return [ll.lng, ll.lat, ...rest];
          };
        })()
      : ([lng, lat, ...rest]: Position): Position => [lng + deltaLng, lat + deltaLat, ...rest];

    const geom = f.geometry;
    let newGeom: Geometry;
    switch (geom.type) {
      case 'LineString': {
        newGeom = { ...geom, coordinates: geom.coordinates.map((position) => shift(position)) };

        break;
      }
      case 'Polygon': {
        newGeom = { ...geom, coordinates: geom.coordinates.map((ring) => ring.map((position) => shift(position))) };

        break;
      }
      case 'Point': {
        newGeom = { ...geom, coordinates: shift(geom.coordinates) };

        break;
      }
      default: {
        newGeom = geom;
      }
    }
    const properties = { ...f.properties };
    if (Array.isArray(properties._anchor)) {
      const [lng, lat] = shift(properties._anchor);
      properties._anchor = [lng, lat] as [number, number];
    }
    if (Array.isArray(properties._edge)) {
      const [lng, lat] = shift(properties._edge);
      properties._edge = [lng, lat] as [number, number];
    }
    return { ...f, geometry: newGeom, properties };
  }

  private scaleFeatureFlat(f: DrawnFeature, factor: number): DrawnFeature {
    const c = centroid(f);
    const [cLng, cLat] = c.geometry.coordinates;
    const geom = f.geometry;
    let newGeom: Geometry;
    if (geom.type === 'LineString') {
      newGeom = {
        ...geom,
        coordinates: geom.coordinates.map(([lng, lat, ...rest]) => [
          cLng + (lng - cLng) * factor,
          cLat + (lat - cLat) * factor,
          ...rest,
        ]),
      };
    } else if (geom.type === 'Polygon') {
      newGeom = {
        ...geom,
        coordinates: geom.coordinates.map((ring) =>
          ring.map(([lng, lat, ...rest]) => [cLng + (lng - cLng) * factor, cLat + (lat - cLat) * factor, ...rest]),
        ),
      };
    } else {
      newGeom = geom;
    }
    const properties = { ...f.properties };
    if (Array.isArray(properties._anchor)) {
      properties._anchor = [
        cLng + (properties._anchor[0] - cLng) * factor,
        cLat + (properties._anchor[1] - cLat) * factor,
      ] as [number, number];
    }
    if (Array.isArray(properties._edge)) {
      properties._edge = [
        cLng + (properties._edge[0] - cLng) * factor,
        cLat + (properties._edge[1] - cLat) * factor,
      ] as [number, number];
    }
    return { ...f, geometry: newGeom, properties };
  }
}
