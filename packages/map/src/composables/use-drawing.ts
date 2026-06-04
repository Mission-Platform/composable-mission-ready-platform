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
import { computed, type ComputedRef, readonly, ref, type ShallowRef } from 'vue';

import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
  LineString,
  Point,
  Polygon,
  Position,
} from 'geojson';
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
export type FeatureId = string;

/**
 * A drawn GeoJSON feature that always carries a string `id` and a `drawMode`
 * property so that the renderer knows how it was originally created.
 *
 * Two-click shapes (square, circle, triangle) additionally store `_anchor`
 * and `_edge` geographic positions so the polygon ring can be recomputed
 * after pan/zoom to maintain visual shape.
 */
export type DrawnFeature = Feature<Geometry, GeoJsonProperties> & {
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

export interface UseDrawingOptions {
  /**
   * Starting GeoJSON feature collection. Pass a reactive ref/getter to
   * initialise the drawing layer from existing data.
   */
  initialFeatures?: DrawnFeature[];
}

export interface UseDrawingReturn {
  /** Currently active drawing mode. `undefined` means the tool is idle. */
  mode: Readonly<ReturnType<typeof ref<DrawMode>>>;
  /** All committed drawn features as a reactive GeoJSON FeatureCollection. */
  features: ComputedRef<FeatureCollection>;
  /** ID of the currently selected feature (for editing). `undefined` if none. */
  selectedId: Readonly<ReturnType<typeof ref<FeatureId | undefined>>>;
  /**
   * When `true` (default), move and scale operations use TurfJS geodesic
   * calculations so distances and areas are accurate on the ground.
   * When `false`, coordinates are shifted/scaled in raw lng/lat space,
   * which preserves the shape's visual appearance on the screen.
   */
  geodesic: ReturnType<typeof ref<boolean>>;
  /** Vertices being accumulated for the shape currently being drawn. */
  draftVertices: Readonly<ReturnType<typeof ref<Position[]>>>;
  /** Preview feature for the shape being actively drawn (before commit). */
  draftFeature: ComputedRef<DrawnFeature | undefined>;
  /**
   * Live ghost preview that follows the cursor during drawing:
   * - line/polygon: the draft shape with the cursor appended as a tentative vertex
   * - square/circle/triangle (after first click): the shape preview anchored at the
   *   first click and stretching to the cursor
   */
  ghostFeature: ComputedRef<DrawnFeature | undefined>;
  /**
   * Point features for each draft vertex clicked so far during line/polygon
   * drawing. Used to render vertex indicator circles.
   */
  draftVertexPoints: ComputedRef<FeatureCollection>;
  /**
   * The anchor/center point placed for the first click of a two-click shape
   * (square, circle, triangle). `undefined` when not applicable.
   */
  anchorPoint: ComputedRef<Feature<Point> | undefined>;
  /** Whether a drag operation is currently in progress. */
  isDragging: Readonly<ReturnType<typeof ref<boolean>>>;
  /** Activate a drawing mode. Finishes any in-progress draw first. */
  startDrawing: (newMode: DrawMode) => void;
  /** Finish and commit the current in-progress shape. */
  finishDrawing: () => void;
  /** Cancel the current in-progress shape without committing. */
  cancelDrawing: () => void;
  /** Select a feature for editing. Omit or pass `undefined` to deselect. */
  selectFeature: (id?: FeatureId) => void;
  /** Delete the currently selected feature. */
  deleteSelected: () => void;
  /** Delete a feature by ID. */
  deleteFeature: (id: FeatureId) => void;
  /** Move the selected feature by the given delta in degrees (lng, lat). */
  moveSelected: (deltaLng: number, deltaLat: number) => void;
  /** Scale the selected feature by the given factor around its centroid. */
  scaleSelected: (factor: number) => void;
  /** Toggle or set the geodesic distortion mode. */
  setGeodesic: (value: boolean) => void;
  /** Rotate the selected feature by degrees (clockwise) around its centroid. */
  rotateSelected: (degrees: number) => void;
  /** Update a specific vertex of the selected feature (polygon / line only). */
  updateVertex: (vertexIndex: number, position: Position) => void;
  /**
   * Remove a vertex from a feature by index.
   * Guarded: lines must keep ≥ 2 vertices; polygons must keep ≥ 3 vertices.
   */
  removeVertex: (featureId: FeatureId, vertexIndex: number) => void;
  /**
   * Insert a new vertex into a feature at the position nearest to `clickPos`
   * on its closest segment. Works for LineString and Polygon geometries.
   */
  insertVertex: (featureId: FeatureId, clickPos: Position) => void;
  /**
   * Split the currently selected line at its midpoint into two new lines.
   */
  splitSelected: () => void;
  /**
   * Join two line features by connecting their nearest endpoint pair into a
   * single merged line. Both source lines are removed and the merged line is
   * selected.
   */
  joinLines: (id1: FeatureId, id2: FeatureId) => void;
  /** Replace all features (e.g. for external hydration). */
  setFeatures: (features: DrawnFeature[]) => void;
  /**
   * MapLibre click handler — call this from the map `click` event listener when
   * the drawing mode is active.
   */
  handleMapClick: (event: MapMouseEvent) => void;
  /**
   * MapLibre dblclick handler — finalises the current shape.
   */
  handleMapDblClick: (event: MapMouseEvent) => void;
  /**
   * MapLibre mousemove handler — updates the cursor position for live ghost preview
   * and drives drag-to-move/vertex-drag operations.
   */
  handleMapMouseMove: (event: MapMouseEvent) => void;
  /**
   * MapLibre mousedown handler — initiates drag operations on shapes or vertex handles.
   */
  handleMapMouseDown: (event: MapMouseEvent) => void;
  /**
   * MapLibre mouseup handler — ends any active drag operation.
   */
  handleMapMouseUp: (event: MapMouseEvent) => void;
  /**
   * MapLibre `moveend`/`zoomend` handler — recomputes the polygon rings of
   * square, circle, and triangle features using the updated viewport so they
   * maintain their visual shape after pan or zoom.
   */
  handleMapMoveEnd: () => void;
  /**
   * A GeoJSON FeatureCollection of Point features used to render measurement
   * labels on the map:
   * - Lines: a label at the line's midpoint showing the length (m or km).
   * - Polygons: a label at the centroid showing the area (m² or km²).
   */
  measureLabels: ComputedRef<FeatureCollection>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
 *
 * `origin` is the centre of the triangle; `edgePoint` defines the radius
 * (distance from centre to any vertex) via the pixel distance to that point.
 * The three vertices are placed 120° apart around the centre.
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
 *
 * The longer pixel axis is used as the side length, keeping the first
 * corner fixed and expanding toward the second corner.
 */
function buildSquare(corner1: Position, corner2: Position, map: Map, existingId?: FeatureId): DrawnFeature {
  const p1 = map.project(corner1 as [number, number]);
  const p2 = map.project(corner2 as [number, number]);

  const dxPx = p2.x - p1.x;
  const dyPx = p2.y - p1.y;
  const side = Math.max(Math.abs(dxPx), Math.abs(dyPx));
  const sx = Math.sign(dxPx) || 1;
  const sy = Math.sign(dyPx) || 1;

  // Four corners in pixel space, clockwise from top-left
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
 *
 * The pixel distance from centre to edgePoint becomes the radius; 64 vertices
 * are sampled uniformly around the circle and unprojected to geographic coords.
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
  ringCoords.push(ringCoords[0]); // close the ring

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

/**
 * Build a LineString from at least two vertices.
 */
function buildLine(vertices: Position[]): DrawnFeature | undefined {
  if (vertices.length < 2) return undefined;
  const id = nextId();
  const feat = lineString(vertices, { drawMode: 'line', id }) as DrawnFeature;
  feat.id = id;
  return feat;
}

/**
 * Build a Polygon from at least three vertices.
 */
function buildPolygon(vertices: Position[]): DrawnFeature | undefined {
  if (vertices.length < 3) return undefined;
  const ring = [...vertices, vertices[0]];
  const id = nextId();
  const feat = polygon([ring], { drawMode: 'polygon', id }) as DrawnFeature;
  feat.id = id;
  return feat;
}

/**
 * Attempt to close the draft vertices into a committed shape for the given mode.
 */
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

/**
 * Build a real-time preview feature while the user is still placing vertices.
 */
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
 * For line/polygon: appends the cursor position as a tentative vertex.
 * For square/circle/triangle: builds the shape from the anchor + cursor.
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

// ─── Composable ──────────────────────────────────────────────────────────────

/**
 * Composable that manages all drawing and editing state for the map.
 *
 * Wire up the returned handlers to MapLibre map events to enable interactive
 * drawing, live ghost previews, and drag-based editing.
 */

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

export function useDrawing(
  _mapReference: ShallowRef<Map | undefined>,
  options: UseDrawingOptions = {},
): UseDrawingReturn {
  const mode = ref<DrawMode>(undefined);
  const selectedId = ref<FeatureId | undefined>(undefined);
  const draftVertices = ref<Position[]>([]);
  const committedFeatures = ref<DrawnFeature[]>(options.initialFeatures ?? []);
  const cursorPos = ref<Position | undefined>(undefined);
  const isDragging = ref(false);
  let _dragTarget: DragTarget | undefined = undefined;
  /** When true, geodesic (ground-distance) transforms are used. When false, raw lng/lat arithmetic. */
  const geodesic = ref(true);

  const features = computed<FeatureCollection>(() => featureCollection(committedFeatures.value as Feature[]));

  const draftFeature = computed<DrawnFeature | undefined>(() =>
    buildDraftFeature(mode.value, draftVertices.value, _mapReference.value),
  );

  const ghostFeature = computed<DrawnFeature | undefined>(() =>
    buildGhostFeature(mode.value, draftVertices.value, cursorPos.value, _mapReference.value),
  );

  const draftVertexPoints = computed<FeatureCollection>(() => {
    if (!mode.value || !['line', 'polygon'].includes(mode.value)) {
      return featureCollection([]);
    }
    const pointFeatures: Feature<Point>[] = draftVertices.value.map((pos, index) => ({
      type: 'Feature',
      id: index,
      geometry: { type: 'Point', coordinates: pos },
      properties: { vertexIndex: index },
    }));
    return featureCollection(pointFeatures);
  });

  // ── Measurement labels ─────────────────────────────────────────────────

  /**
   * Compute the current measurement for `f` and write it into `properties._area`
   * (for polygons) or `properties._length` (for lines) so the value is frozen
   * at this moment in time and will not change when the feature is translated.
   */
  function stampMeasure(f: DrawnFeature): DrawnFeature {
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

  const measureLabels = computed<FeatureCollection>(() => {
    const labelFeatures: Feature<Point>[] = [];

    for (const f of committedFeatures.value) {
      const geom = f.geometry;
      if (geom.type === 'LineString') {
        // Use the stamped length if available so the label is stable during moves.
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
        // Use the stamped area if available so the label is stable during moves.
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
  });

  const anchorPoint = computed<Feature<Point> | undefined>(() => {
    if (!mode.value || !['square', 'circle', 'triangle'].includes(mode.value) || draftVertices.value.length === 0) {
      return;
    }
    const [lng, lat] = draftVertices.value[0];
    return {
      type: 'Feature',
      id: 'anchor',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: { role: 'anchor' },
    };
  });

  // ── Drawing actions ──────────────────────────────────────────────────────

  function startDrawing(newMode: DrawMode): void {
    cancelDrawing();
    mode.value = newMode;
    selectedId.value = undefined;
  }

  function finishDrawing(): void {
    if (!mode.value) return;
    const committed = commitShape(mode.value, draftVertices.value, _mapReference.value);
    if (committed) {
      committedFeatures.value = [...committedFeatures.value, stampMeasure(committed)];
      selectedId.value = committed.id;
    }
    draftVertices.value = [];
    mode.value = undefined;
  }

  function cancelDrawing(): void {
    draftVertices.value = [];
    mode.value = undefined;
  }

  // ── Selection ────────────────────────────────────────────────────────────

  function selectFeature(id?: FeatureId): void {
    if (mode.value) cancelDrawing();
    selectedId.value = id;
  }

  // ── Deletion ─────────────────────────────────────────────────────────────

  function deleteFeature(id: FeatureId): void {
    committedFeatures.value = committedFeatures.value.filter((f) => f.id !== id);
    if (selectedId.value === id) selectedId.value = undefined;
  }

  function deleteSelected(): void {
    if (selectedId.value) deleteFeature(selectedId.value);
  }

  // ── Transform operations ─────────────────────────────────────────────────

  function replaceSelected(transform: (f: DrawnFeature) => DrawnFeature): void {
    if (!selectedId.value) return;
    committedFeatures.value = committedFeatures.value.map((f) => (f.id === selectedId.value ? transform(f) : f));
  }

  /**
   * Shift every coordinate in the feature by `[deltaLng, deltaLat]` without
   * any geodesic correction. This preserves the shape's visual appearance on
   * the map canvas (no projection distortion).
   */
  function translateFeatureFlat(f: DrawnFeature, deltaLng: number, deltaLat: number): DrawnFeature {
    const geom = f.geometry;
    let newGeom: Geometry;
    switch (geom.type) {
      case 'LineString': {
        newGeom = {
          ...geom,
          coordinates: geom.coordinates.map(([lng, lat, ...rest]) => [lng + deltaLng, lat + deltaLat, ...rest]),
        };

        break;
      }
      case 'Polygon': {
        newGeom = {
          ...geom,
          coordinates: geom.coordinates.map((ring) =>
            ring.map(([lng, lat, ...rest]) => [lng + deltaLng, lat + deltaLat, ...rest]),
          ),
        };

        break;
      }
      case 'Point': {
        const [lng, lat, ...rest] = geom.coordinates;
        newGeom = { ...geom, coordinates: [lng + deltaLng, lat + deltaLat, ...rest] };

        break;
      }
      default: {
        newGeom = geom;
      }
    }
    // Also shift stored anchor/edge positions used for reprojection.
    const properties = { ...f.properties };
    if (Array.isArray(properties._anchor)) {
      properties._anchor = [properties._anchor[0] + deltaLng, properties._anchor[1] + deltaLat] as [number, number];
    }
    if (Array.isArray(properties._edge)) {
      properties._edge = [properties._edge[0] + deltaLng, properties._edge[1] + deltaLat] as [number, number];
    }
    return { ...f, geometry: newGeom, properties: properties };
  }

  /**
   * Scale every coordinate in the feature by `factor` around its geographic
   * centroid using raw lng/lat arithmetic (no geodesic correction). This
   * preserves the visual shape on the map canvas.
   */
  function scaleFeatureFlat(f: DrawnFeature, factor: number): DrawnFeature {
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
    // Also scale stored anchor/edge positions used for reprojection.
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
    return { ...f, geometry: newGeom, properties: properties };
  }

  function setGeodesic(value: boolean): void {
    geodesic.value = value;
  }

  function moveSelected(deltaLng: number, deltaLat: number): void {
    if (geodesic.value) {
      replaceSelected((f: DrawnFeature) => {
        const distribution = distance(point([0, 0]), point([deltaLng, deltaLat]), {
          units: 'kilometres',
        });
        const bear = bearing(point([0, 0]), point([deltaLng, deltaLat]));
        const moved = transformTranslate(f, distribution, bear, {
          units: 'kilometres',
        }) as DrawnFeature;
        moved.id = f.id;
        moved.properties = { ...f.properties };
        return moved;
      });
    } else {
      replaceSelected((f: DrawnFeature) => translateFeatureFlat(f, deltaLng, deltaLat));
    }
  }

  function scaleSelected(factor: number): void {
    if (geodesic.value) {
      replaceSelected((f: DrawnFeature) => {
        const scaled = transformScale(f, factor) as DrawnFeature;
        scaled.id = f.id;
        scaled.properties = { ...f.properties };
        return stampMeasure(scaled);
      });
    } else {
      replaceSelected((f: DrawnFeature) => stampMeasure(scaleFeatureFlat(f, factor)));
    }
  }

  function rotateSelected(degrees: number): void {
    replaceSelected((f: DrawnFeature) => {
      const rotated = transformRotate(f, degrees) as DrawnFeature;
      rotated.id = f.id;
      rotated.properties = { ...f.properties };
      return rotated;
    });
  }

  // ── Vertex editing ───────────────────────────────────────────────────────

  function updateVertex(vertexIndex: number, position: Position): void {
    if (!selectedId.value) return;
    const feature = committedFeatures.value.find((f: DrawnFeature) => f.id === selectedId.value);
    if (!feature) return;

    const geom = feature.geometry as LineString | Polygon;
    if (geom.type === 'LineString') {
      const coords = [...geom.coordinates];
      if (vertexIndex < 0 || vertexIndex >= coords.length) return;
      coords[vertexIndex] = position;
      const updated: DrawnFeature = stampMeasure({
        ...feature,
        geometry: { ...geom, coordinates: coords },
        properties: { ...feature.properties },
      });
      committedFeatures.value = committedFeatures.value.map((f: DrawnFeature) =>
        f.id === selectedId.value ? updated : f,
      );
    } else if (geom.type === 'Polygon') {
      const rings = geom.coordinates.map((ring: Position[]) => [...ring]);
      const outerRing = rings[0];
      if (!outerRing || vertexIndex < 0 || vertexIndex >= outerRing.length - 1) return;
      outerRing[vertexIndex] = position;
      // Keep ring closed
      if (vertexIndex === 0) outerRing[outerRing.length - 1] = position;
      const updated: DrawnFeature = stampMeasure({
        ...feature,
        geometry: { ...geom, coordinates: rings },
        properties: { ...feature.properties },
      });
      committedFeatures.value = committedFeatures.value.map((f: DrawnFeature) =>
        f.id === selectedId.value ? updated : f,
      );
    }
  }

  // ── Vertex insertion / removal ───────────────────────────────────────────

  /**
   * Remove a vertex from a line or polygon feature.
   * Guards: a line must keep ≥ 2 vertices; a polygon must keep ≥ 3 vertices.
   */
  function removeVertex(featureId: FeatureId, vertexIndex: number): void {
    const feature = committedFeatures.value.find((f) => f.id === featureId);
    if (!feature) return;

    const geom = feature.geometry as LineString | Polygon;

    if (geom.type === 'LineString') {
      if (geom.coordinates.length <= 2) return; // would leave fewer than 2 points
      const coords = geom.coordinates.filter((_, index) => index !== vertexIndex);
      committedFeatures.value = committedFeatures.value.map((f) =>
        f.id === featureId
          ? stampMeasure({
              ...feature,
              geometry: { ...geom, coordinates: coords },
              properties: { ...feature.properties },
            } as DrawnFeature)
          : f,
      );
    } else if (geom.type === 'Polygon') {
      const ring = [...(geom.coordinates[0] ?? [])];
      // ring has N+1 coords (closing = opening); actual unique vertex count = ring.length - 1
      if (ring.length - 1 <= 3) return; // would leave fewer than 3 polygon vertices
      ring.splice(vertexIndex, 1);
      // Keep ring closed: if we removed vertex 0, update the closing duplicate
      if (vertexIndex === 0) ring[ring.length - 1] = ring[0];
      committedFeatures.value = committedFeatures.value.map((f) =>
        f.id === featureId
          ? stampMeasure({
              ...feature,
              geometry: { ...geom, coordinates: [ring] },
              properties: { ...feature.properties },
            } as DrawnFeature)
          : f,
      );
    }
  }

  /**
   * Insert a new vertex into a line or polygon feature at the position nearest
   * to `clickPos` on the closest segment.
   */
  function insertVertex(featureId: FeatureId, clickPos: Position): void {
    const feature = committedFeatures.value.find((f) => f.id === featureId);
    if (!feature) return;

    const geom = feature.geometry as LineString | Polygon;

    if (geom.type === 'LineString') {
      const coords = [...geom.coordinates];
      const index = nearestSegmentIndex(coords, clickPos);
      coords.splice(index, 0, clickPos);
      committedFeatures.value = committedFeatures.value.map((f) =>
        f.id === featureId
          ? stampMeasure({
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
      committedFeatures.value = committedFeatures.value.map((f) =>
        f.id === featureId
          ? stampMeasure({
              ...feature,
              geometry: { ...geom, coordinates: [ring] },
              properties: { ...feature.properties },
            } as DrawnFeature)
          : f,
      );
    }
  }

  // ── Line split / join ────────────────────────────────────────────────────

  /**
   * Split the currently selected line at its midpoint into two new line
   * features. The original line is removed and both halves are added.
   */
  function splitSelected(): void {
    if (!selectedId.value) return;
    const feature = committedFeatures.value.find((f) => f.id === selectedId.value);
    if (feature?.geometry.type !== 'LineString') return;

    let coords = [...feature.geometry.coordinates];
    if (coords.length < 2) return;

    // If the line has only 2 vertices, synthesise a midpoint so we can split
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

    committedFeatures.value = [...committedFeatures.value.filter((f) => f.id !== selectedId.value), feat1, feat2];
    selectedId.value = id1;
  }

  /**
   * Merge two line features into one by connecting their nearest endpoint pair.
   * The two source lines are removed; the merged line is added and selected.
   */
  function joinLines(id1: FeatureId, id2: FeatureId): void {
    const f1 = committedFeatures.value.find((f) => f.id === id1);
    const f2 = committedFeatures.value.find((f) => f.id === id2);
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

    // 4 possible end-to-end connections; pick the one with smallest gap
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

    committedFeatures.value = [...committedFeatures.value.filter((f) => f.id !== id1 && f.id !== id2), merged];
    selectedId.value = newId;
  }

  // ── External hydration ───────────────────────────────────────────────────

  function setFeatures(newFeatures: DrawnFeature[]): void {
    committedFeatures.value = newFeatures;
  }

  // ── Map event handlers ───────────────────────────────────────────────────

  function handleMapMouseMove(event: MapMouseEvent): void {
    const { lng, lat } = event.lngLat;
    cursorPos.value = [lng, lat];

    if (!isDragging.value || !_dragTarget) return;

    if (_dragTarget.type === 'feature') {
      const deltaLng = lng - _dragTarget.startLng;
      const deltaLat = lat - _dragTarget.startLat;
      _dragTarget.startLng = lng;
      _dragTarget.startLat = lat;
      moveSelected(deltaLng, deltaLat);
    } else if (_dragTarget.type === 'vertex') {
      updateVertex(_dragTarget.vertexIndex, [lng, lat]);
    }
  }

  function handleMapMouseDown(event: MapMouseEvent): void {
    if (mode.value) return;

    const map = _mapReference.value;
    if (!map) return;

    const { x, y } = event.point;
    const buffer = 8;
    const bbox: [[number, number], [number, number]] = [
      [x - buffer, y - buffer],
      [x + buffer, y + buffer],
    ];

    // Check vertex handles first (higher priority)
    const vertexHits = map.queryRenderedFeatures(bbox, {
      layers: ['map-draw-vertices-circle'],
    });
    if (vertexHits.length > 0 && selectedId.value) {
      const vertexIndex = vertexHits[0].properties?.vertexIndex as number | undefined;
      if (vertexIndex != undefined) {
        const { lng, lat } = event.lngLat;
        isDragging.value = true;
        _dragTarget = {
          type: 'vertex',
          featureId: selectedId.value,
          vertexIndex,
          startLng: lng,
          startLat: lat,
        };
        // Prevent map panning during drag
        map.dragPan?.disable();
        return;
      }
    }

    // Check shape hits
    const shapeHits = map.queryRenderedFeatures(bbox, {
      layers: ['map-draw-fill', 'map-draw-line'],
    });
    if (shapeHits.length > 0) {
      const rawId = shapeHits[0].id ?? shapeHits[0].properties?.id;
      const featureId = rawId == undefined ? undefined : String(rawId);
      if (featureId) {
        const { lng, lat } = event.lngLat;
        // Select the feature if not already selected
        if (selectedId.value !== featureId) selectFeature(featureId);
        isDragging.value = true;
        _dragTarget = { type: 'feature', featureId, startLng: lng, startLat: lat };
        map.dragPan?.disable();
      }
    }
  }

  function handleMapMouseUp(_event: MapMouseEvent): void {
    if (!isDragging.value) return;
    isDragging.value = false;
    _dragTarget = undefined;
    _mapReference.value?.dragPan?.enable();
  }

  /**
   * Recompute polygon rings for all two-click shapes (square, circle, triangle)
   * so they stay visually correct after a pan or zoom.
   */
  function handleMapMoveEnd(): void {
    const map = _mapReference.value;
    if (!map) return;
    committedFeatures.value = committedFeatures.value.map((f) => {
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
      // Preserve the stamped area from before the reprojection so the label
      // does not jump when the map is panned or zoomed.
      if (typeof f.properties._area === 'number') {
        rebuilt = { ...rebuilt, properties: { ...rebuilt.properties, _area: f.properties._area } };
      }
      return rebuilt;
    });
  }

  function handleMapClick(event: MapMouseEvent): void {
    // ── Idle mode: attempt to select a drawn feature ─────────────────────
    if (!mode.value) {
      const map = _mapReference.value;
      if (!map) return;

      // Use a pixel buffer so narrow lines are easier to click on.
      const { x, y } = event.point;
      const buffer = 6;
      const bbox: [[number, number], [number, number]] = [
        [x - buffer, y - buffer],
        [x + buffer, y + buffer],
      ];
      const hits = map.queryRenderedFeatures(bbox, {
        layers: ['map-draw-fill', 'map-draw-line'],
      });

      if (hits.length > 0) {
        // `promoteId: 'id'` is set on the source, so hits[0].id should be the
        // promoted string id. Fall back to properties.id if not present.
        const rawId = hits[0].id ?? hits[0].properties?.id;
        const featureId = rawId == undefined ? undefined : String(rawId);
        if (featureId) {
          selectFeature(featureId);
        }
      } else {
        // Click on empty space — deselect
        // eslint-disable-next-line unicorn/no-useless-undefined
        selectFeature(undefined);
      }
      return;
    }

    const { lng, lat } = event.lngLat;
    const vertex: Position = [lng, lat];

    // Single-click shapes (two-vertex): place first click as origin, second as edge
    if (['square', 'circle', 'triangle'].includes(mode.value)) {
      if (draftVertices.value.length === 0) {
        draftVertices.value = [vertex];
      } else {
        draftVertices.value = [...draftVertices.value, vertex];
        finishDrawing();
      }
      return;
    }

    // Multi-click shapes: accumulate vertices
    draftVertices.value = [...draftVertices.value, vertex];
  }

  function handleMapDblClick(event: MapMouseEvent): void {
    // ── Idle mode: insert vertex on segment, or remove vertex ────────────
    if (!mode.value) {
      const map = _mapReference.value;
      if (!map) return;

      const { x, y } = event.point;
      const buffer = 8;
      const bbox: [[number, number], [number, number]] = [
        [x - buffer, y - buffer],
        [x + buffer, y + buffer],
      ];

      // Check vertex handles first — double-click on a handle removes the vertex
      const vertexHits = map.queryRenderedFeatures(bbox, {
        layers: ['map-draw-vertices-circle'],
      });
      if (vertexHits.length > 0 && selectedId.value) {
        const vertexIndex = vertexHits[0].properties?.vertexIndex as number | undefined;
        if (vertexIndex != undefined) {
          removeVertex(selectedId.value, vertexIndex);
          // Prevent the default MapLibre double-click zoom
          event.originalEvent?.preventDefault();
          return;
        }
      }

      // Double-click on a line or shape segment inserts a new vertex
      const shapeHits = map.queryRenderedFeatures(bbox, {
        layers: ['map-draw-fill', 'map-draw-line'],
      });
      if (shapeHits.length > 0) {
        const rawId = shapeHits[0].id ?? shapeHits[0].properties?.id;
        const featureId = rawId == undefined ? undefined : String(rawId);
        if (featureId) {
          const { lng, lat } = event.lngLat;
          insertVertex(featureId, [lng, lat]);
          selectFeature(featureId);
          event.originalEvent?.preventDefault();
        }
      }
      return;
    }

    // ── Drawing mode: finalise the current shape ─────────────────────────
    // Prevent the last dblclick from adding a duplicate vertex by removing the
    // last vertex added by the preceding single-click event fired by MapLibre.
    draftVertices.value = draftVertices.value.slice(0, -1);
    finishDrawing();
  }

  return {
    mode: readonly(mode) as UseDrawingReturn['mode'],
    features,
    selectedId: readonly(selectedId) as UseDrawingReturn['selectedId'],
    geodesic,
    draftVertices: readonly(draftVertices) as UseDrawingReturn['draftVertices'],
    draftFeature,
    ghostFeature,
    draftVertexPoints,
    anchorPoint,
    isDragging: readonly(isDragging) as UseDrawingReturn['isDragging'],
    startDrawing,
    finishDrawing,
    cancelDrawing,
    selectFeature,
    deleteSelected,
    deleteFeature,
    moveSelected,
    scaleSelected,
    setGeodesic,
    rotateSelected,
    updateVertex,
    removeVertex,
    insertVertex,
    splitSelected,
    joinLines,
    setFeatures,
    handleMapClick,
    handleMapDblClick,
    handleMapMouseMove,
    handleMapMouseDown,
    handleMapMouseUp,
    handleMapMoveEnd,
    measureLabels,
  };
}
