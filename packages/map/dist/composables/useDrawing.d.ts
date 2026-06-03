import { type ComputedRef, ref, type ShallowRef } from 'vue';
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry, Point, Position } from 'geojson';
import type { Map, MapMouseEvent } from 'maplibre-gl';
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
    /** Select a feature for editing. Pass `undefined` to deselect. */
    selectFeature: (id: FeatureId | undefined) => void;
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
export declare function useDrawing(_mapReference: ShallowRef<Map | null>, options?: UseDrawingOptions): UseDrawingReturn;
