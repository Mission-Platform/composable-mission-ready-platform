// ─── useDrawing ────────────────────────────────────────────────────────────────
//
// Framework-neutral: authored once against the `@mission-platform/forge-jsx` hooks and
// compiled to React / Vue by `@mission-platform/vite-plugin-forge`. A thin wrapper
// over the framework-agnostic {@link DrawingStore}: it mirrors the store's
// getters into `useState` (so a state change re-renders the owning component),
// forwards the current map instance to the store (which wires its own map event
// listeners and cursor), and exposes the store's imperative actions/handlers.

import { useEffect, useRef, useState } from '@mission-platform/forge-jsx';

import { DrawingStore } from './drawing-store';

import type { DrawMode, DrawnFeature, FeatureId } from './drawing-store';
import type { Feature, FeatureCollection, Point } from 'geojson';
import type { Map, MapMouseEvent } from 'maplibre-gl';

export type { DrawMode, DrawnFeature, FeatureId } from './drawing-store';

export interface UseDrawingOptions {
  /** Starting GeoJSON features to initialise the drawing layer with. */
  initialFeatures?: DrawnFeature[];
  /** Starting drawing mode (mirrors a controlled `mode` prop on first render). */
  initialMode?: DrawMode;
  /** Starting geodesic flag (mirrors a controlled `geodesic` prop on first render). */
  initialGeodesic?: boolean;
}

export interface UseDrawingReturn {
  /** Currently active drawing mode. `undefined` means the tool is idle. */
  mode: DrawMode;
  /** All committed drawn features as a GeoJSON FeatureCollection. */
  features: FeatureCollection;
  /** ID of the currently selected feature (for editing). `undefined` if none. */
  selectedId: FeatureId | undefined;
  /** When `true` (default), transforms use geodesic (ground-accurate) maths. */
  geodesic: boolean;
  /** Preview feature for the shape being actively drawn (before commit). */
  draftFeature: DrawnFeature | undefined;
  /** Live ghost preview that follows the cursor during drawing. */
  ghostFeature: DrawnFeature | undefined;
  /** Point features for each draft vertex clicked so far (line/polygon). */
  draftVertexPoints: FeatureCollection;
  /** Anchor/center point placed for the first click of a two-click shape. */
  anchorPoint: Feature<Point> | undefined;
  /** Whether a drag operation is currently in progress. */
  isDragging: boolean;
  /** Point features for measurement labels (line length / polygon area). */
  measureLabels: FeatureCollection;
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
  updateVertex: (vertexIndex: number, position: [number, number]) => void;
  /** Remove a vertex from a feature by index (guarded by minimum vertex counts). */
  removeVertex: (featureId: FeatureId, vertexIndex: number) => void;
  /** Insert a new vertex into a feature at the position nearest to `clickPos`. */
  insertVertex: (featureId: FeatureId, clickPos: [number, number]) => void;
  /** Split the currently selected line at its midpoint into two new lines. */
  splitSelected: () => void;
  /** Join two line features into a single merged line. */
  joinLines: (id1: FeatureId, id2: FeatureId) => void;
  /** Replace all features (e.g. for external hydration). */
  setFeatures: (features: DrawnFeature[]) => void;
  /** MapLibre `click` handler. */
  handleMapClick: (event: MapMouseEvent) => void;
  /** MapLibre `dblclick` handler — finalises the current shape. */
  handleMapDblClick: (event: MapMouseEvent) => void;
  /** MapLibre `mousemove` handler — live ghost preview + drag. */
  handleMapMouseMove: (event: MapMouseEvent) => void;
  /** MapLibre `mousedown` handler — initiates drag operations. */
  handleMapMouseDown: (event: MapMouseEvent) => void;
  /** MapLibre `mouseup` handler — ends any active drag. */
  handleMapMouseUp: (event: MapMouseEvent) => void;
  /** MapLibre `moveend`/`zoomend` handler — reprojects two-click shapes. */
  handleMapMoveEnd: () => void;
}

/**
 * Manages all drawing and editing state for the map. The store wires the map's
 * own event listeners once a map is provided, so a `<MapDraw>` component only has
 * to forward the map instance and render sources/layers from the returned state.
 */
export function useDrawing(map: Map | undefined, options: UseDrawingOptions = {}): UseDrawingReturn {
  const storeReference = useRef<DrawingStore | undefined>(undefined);
  storeReference.current ??= new DrawingStore(options.initialFeatures ?? [], {
    mode: options.initialMode,
    geodesic: options.initialGeodesic,
  });
  const store = storeReference.current!;

  const [features, setFeatures] = useState<FeatureCollection>(store.getFeatures());
  const [mode, setMode] = useState<DrawMode>(store.getMode());
  const [selectedId, setSelectedId] = useState<FeatureId | undefined>(store.getSelectedId());
  const [geodesic, setGeodesic] = useState<boolean>(store.getGeodesic());
  const [draftFeature, setDraftFeature] = useState<DrawnFeature | undefined>(store.getDraftFeature());
  const [ghostFeature, setGhostFeature] = useState<DrawnFeature | undefined>(store.getGhostFeature());
  const [draftVertexPoints, setDraftVertexPoints] = useState<FeatureCollection>(store.getDraftVertexPoints());
  const [anchorPoint, setAnchorPoint] = useState<Feature<Point> | undefined>(store.getAnchorPoint());
  const [measureLabels, setMeasureLabels] = useState<FeatureCollection>(store.getMeasureLabels());
  const [isDragging, setIsDragging] = useState<boolean>(store.getIsDragging());

  useEffect(() => {
    const sync = (): void => {
      setFeatures(store.getFeatures());
      setMode(store.getMode());
      setSelectedId(store.getSelectedId());
      setGeodesic(store.getGeodesic());
      setDraftFeature(store.getDraftFeature());
      setGhostFeature(store.getGhostFeature());
      setDraftVertexPoints(store.getDraftVertexPoints());
      setAnchorPoint(store.getAnchorPoint());
      setMeasureLabels(store.getMeasureLabels());
      setIsDragging(store.getIsDragging());
    };
    const unsubscribe = store.subscribe(sync);
    sync();
    return unsubscribe;
  }, []);

  useEffect(() => {
    store.setMap(map);
    return () => {
      store.setMap(undefined);
    };
  }, [map]);

  return {
    mode,
    features,
    selectedId,
    geodesic,
    draftFeature,
    ghostFeature,
    draftVertexPoints,
    anchorPoint,
    isDragging,
    measureLabels,
    startDrawing: store.startDrawing,
    finishDrawing: store.finishDrawing,
    cancelDrawing: store.cancelDrawing,
    selectFeature: store.selectFeature,
    deleteSelected: store.deleteSelected,
    deleteFeature: store.deleteFeature,
    moveSelected: store.moveSelected,
    scaleSelected: store.scaleSelected,
    setGeodesic: store.setGeodesic,
    rotateSelected: store.rotateSelected,
    updateVertex: store.updateVertex,
    removeVertex: store.removeVertex,
    insertVertex: store.insertVertex,
    splitSelected: store.splitSelected,
    joinLines: store.joinLines,
    setFeatures: store.setFeatures,
    handleMapClick: store.handleMapClick,
    handleMapDblClick: store.handleMapDblClick,
    handleMapMouseMove: store.handleMapMouseMove,
    handleMapMouseDown: store.handleMapMouseDown,
    handleMapMouseUp: store.handleMapMouseUp,
    handleMapMoveEnd: store.handleMapMoveEnd,
  };
}
