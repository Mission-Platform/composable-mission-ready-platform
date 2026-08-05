import {
  Fragment,
  h,
  type MpElement,
  type MpProperties,
  type MpRenderProperty,
  Slot,
  useEffect,
} from '@mission-platform/forge';
import { palette } from '@mission-platform/tokens';

import {
  type DrawMode,
  type DrawnFeature,
  type FeatureId,
  useDrawing,
  type UseDrawingReturn,
} from '../../../composables/use-drawing';
import { useMap } from '../../../composables/use-map';
import { toMapColor } from '../../../utils/to-map-color';
import { BaseMapLayer } from '../map-layer';
import { BaseMapSource } from '../map-source';

import type { Feature, FeatureCollection } from 'geojson';
import type { GeoJSONSourceSpecification } from 'maplibre-gl';

export interface MapDrawProperties extends MpProperties {
  /**
   * Currently active drawing mode. When omitted the tool is in idle/edit mode.
   * @model onModeChange
   */
  mode?: DrawMode;
  /**
   * Pre-existing drawn features to hydrate the tool with.
   * @model onFeaturesChange
   */
  modelValue?: DrawnFeature[];
  /**
   * When `true` (default), transforms use geodesic (ground-accurate) maths.
   * @model onGeodesicChange
   */
  geodesic?: boolean;
  /** Stroke colour for drawn shapes. */
  strokeColor?: string;
  /** Fill colour for drawn polygon/fill shapes. */
  fillColor?: string;
  /** Fill opacity (0–1). */
  fillOpacity?: number;
  /** Stroke width in pixels. */
  strokeWidth?: number;
  /** Colour for the draft (in-progress) shape. */
  draftColor?: string;
  /** Colour of vertex handle circles. */
  vertexColor?: string;
  /** Fired whenever the committed feature set changes. */
  onFeaturesChange?: (features: DrawnFeature[]) => void;
  /** Fired when the active drawing mode changes. */
  onModeChange?: (mode: DrawMode) => void;
  /** Fired when a feature is selected. `null` means deselected. */
  onSelect?: (id: FeatureId | null) => void;
  /** Fired when the geodesic toggle changes. */
  onGeodesicChange?: (geodesic: boolean) => void;
  /** Toolbar (scoped) slot receiving the live `drawing` controller. */
  toolbar?: MpRenderProperty<{ drawing: UseDrawingReturn }>;
}

/**
 * `BaseMapDraw` — an interactive drawing/editing tool for the nearest
 * `<MapLibre>` ancestor's map. Authored once in the neutral JSX dialect; all
 * drawing state and geometry live in the framework-agnostic `DrawingStore`
 * (wrapped by {@link useDrawing}), which wires the map's own event listeners.
 * The component renders the committed/ghost/draft/vertex/measure GeoJSON sources
 * and layers, and exposes the live `drawing` controller through a scoped
 * `toolbar` slot.
 */
export function BaseMapDraw(properties: Readonly<MapDrawProperties>): MpElement {
  const {
    mode,
    modelValue = [],
    geodesic = true,
    strokeColor = palette.color.primary[500],
    fillColor = palette.color.primary[500],
    fillOpacity = 0.2,
    strokeWidth = 2,
    draftColor = palette.color.warning[500],
    vertexColor = palette.color.white,
  } = properties;

  const draftVertexColor = palette.color.warning[500];

  const map = useMap();
  const drawing = useDrawing(map, {
    initialFeatures: modelValue,
    initialMode: mode,
    initialGeodesic: geodesic !== false,
  });

  // ── Sync controlled props → internal store ────────────────────────────────
  useEffect(() => {
    drawing.setGeodesic(geodesic !== false);
  }, [geodesic]);

  useEffect(() => {
    if (mode !== drawing.mode) {
      if (mode === undefined) {
        drawing.cancelDrawing();
      } else {
        drawing.startDrawing(mode);
      }
    }
  }, [mode]);

  useEffect(() => {
    drawing.setFeatures(modelValue ?? []);
  }, [modelValue]);

  // ── Emit internal changes upward ──────────────────────────────────────────
  useEffect(() => {
    properties.onFeaturesChange?.(drawing.features.features as DrawnFeature[]);
  }, [drawing.features]);

  useEffect(() => {
    properties.onModeChange?.(drawing.mode);
  }, [drawing.mode]);

  useEffect(() => {
    properties.onSelect?.(drawing.selectedId ?? null);
  }, [drawing.selectedId]);

  useEffect(() => {
    properties.onGeodesicChange?.(drawing.geodesic);
  }, [drawing.geodesic]);

  // ── GeoJSON sources ───────────────────────────────────────────────────────
  const committedSource = {
    type: 'geojson',
    data: drawing.features as unknown as FeatureCollection,
    promoteId: 'id',
  } satisfies GeoJSONSourceSpecification;

  const ghostSource = {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: drawing.ghostFeature ? [drawing.ghostFeature as Feature] : [],
    },
  } satisfies GeoJSONSourceSpecification;

  const draftVertexSource = {
    type: 'geojson',
    data: drawing.draftVertexPoints as unknown as FeatureCollection,
  } satisfies GeoJSONSourceSpecification;

  const anchorSource = {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: drawing.anchorPoint ? [drawing.anchorPoint as Feature] : [],
    },
  } satisfies GeoJSONSourceSpecification;

  const measureSource = {
    type: 'geojson',
    data: drawing.measureLabels as unknown as FeatureCollection,
  } satisfies GeoJSONSourceSpecification;

  const draftSource = {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: drawing.draftFeature ? [drawing.draftFeature as Feature] : [],
    },
  } satisfies GeoJSONSourceSpecification;

  const selectedFeature = (drawing.features.features as Feature[]).find(
    (f) => (f as DrawnFeature).id === drawing.selectedId,
  ) as DrawnFeature | undefined;

  let vertexCoords: [number, number][] = [];
  if (selectedFeature) {
    const geom = selectedFeature.geometry;
    if (geom.type === 'LineString') {
      vertexCoords = geom.coordinates as [number, number][];
    } else if (geom.type === 'Polygon') {
      vertexCoords = (geom.coordinates[0]?.slice(0, -1) ?? []) as [number, number][];
    }
  }

  const vertexSource = {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: vertexCoords.map((coord, index) => ({
        type: 'Feature',
        id: index,
        geometry: { type: 'Point', coordinates: coord },
        properties: { vertexIndex: index },
      })),
    },
  } satisfies GeoJSONSourceSpecification;

  // ── Layer paint expressions ───────────────────────────────────────────────
  const fillPaint = {
    'fill-color': toMapColor(fillColor),
    'fill-opacity': [
      'case',
      ['==', ['get', 'id'], drawing.selectedId ?? ''],
      Math.min(fillOpacity * 1.5, 1),
      fillOpacity,
    ] as unknown as number,
  };

  const linePaint = { 'line-color': toMapColor(strokeColor), 'line-width': strokeWidth };

  const draftFillPaint = { 'fill-color': toMapColor(draftColor), 'fill-opacity': fillOpacity };

  const draftLinePaint = {
    'line-color': toMapColor(draftColor),
    'line-width': strokeWidth,
    'line-dasharray': [2, 2],
  };

  const vertexPaint = {
    'circle-radius': 6,
    'circle-color': toMapColor(vertexColor),
    'circle-stroke-color': toMapColor(strokeColor),
    'circle-stroke-width': 2,
  };

  const draftVertexPaint = {
    'circle-radius': 5,
    'circle-color': toMapColor(draftVertexColor),
    'circle-stroke-color': toMapColor(palette.color.white),
    'circle-stroke-width': 2,
  };

  const anchorPaint = {
    'circle-radius': 7,
    'circle-color': toMapColor(draftColor),
    'circle-stroke-color': toMapColor(palette.color.white),
    'circle-stroke-width': 2,
  };

  const ghostFillPaint = { 'fill-color': toMapColor(draftColor), 'fill-opacity': fillOpacity * 0.6 };

  const ghostLinePaint = {
    'line-color': toMapColor(draftColor),
    'line-width': strokeWidth,
    'line-dasharray': [3, 3],
    'line-opacity': 0.75,
  };

  const measureLabelLayout = {
    'text-field': ['get', 'label'] as unknown as string,
    // `Open Sans Semibold` is the font shipped by the MapLibre demo glyph server
    // (and referenced by its default style); the previous
    // `['Open Sans Bold', 'Arial Unicode MS Bold']` stack 404s there and leaves
    // the symbol layer without glyphs.
    'text-font': ['Open Sans Semibold'] as unknown as string[],
    'text-size': 12,
    'text-anchor': 'top' as const,
    'text-offset': [0, 0.5] as [number, number],
    'text-allow-overlap': false,
    'text-ignore-placement': false,
  };

  const measureLabelPaint = {
    'text-color': toMapColor(palette.color.neutral[900]),
    'text-halo-color': toMapColor(palette.color.white),
    'text-halo-width': 2,
  };

  return (
    <>
      <BaseMapSource
        id="map-draw-committed"
        source={committedSource}
      >
        <BaseMapLayer
          layer={{
            id: 'map-draw-fill',
            type: 'fill',
            source: 'map-draw-committed',
            filter: ['==', ['geometry-type'], 'Polygon'],
            paint: fillPaint,
          }}
        />
        <BaseMapLayer layer={{ id: 'map-draw-line', type: 'line', source: 'map-draw-committed', paint: linePaint }} />
      </BaseMapSource>

      <BaseMapSource
        id="map-draw-ghost"
        source={ghostSource}
      >
        <BaseMapLayer
          layer={{
            id: 'map-draw-ghost-fill',
            type: 'fill',
            source: 'map-draw-ghost',
            filter: ['==', ['geometry-type'], 'Polygon'],
            paint: ghostFillPaint,
          }}
        />
        <BaseMapLayer
          layer={{ id: 'map-draw-ghost-line', type: 'line', source: 'map-draw-ghost', paint: ghostLinePaint }}
        />
      </BaseMapSource>

      <BaseMapSource
        id="map-draw-draft-vertices"
        source={draftVertexSource}
      >
        <BaseMapLayer
          layer={{
            id: 'map-draw-draft-vertices-circle',
            type: 'circle',
            source: 'map-draw-draft-vertices',
            paint: draftVertexPaint,
          }}
        />
      </BaseMapSource>

      <BaseMapSource
        id="map-draw-anchor"
        source={anchorSource}
      >
        <BaseMapLayer
          layer={{ id: 'map-draw-anchor-circle', type: 'circle', source: 'map-draw-anchor', paint: anchorPaint }}
        />
      </BaseMapSource>

      <BaseMapSource
        id="map-draw-draft"
        source={draftSource}
      >
        <BaseMapLayer
          layer={{
            id: 'map-draw-draft-fill',
            type: 'fill',
            source: 'map-draw-draft',
            filter: ['==', ['geometry-type'], 'Polygon'],
            paint: draftFillPaint,
          }}
        />
        <BaseMapLayer
          layer={{ id: 'map-draw-draft-line', type: 'line', source: 'map-draw-draft', paint: draftLinePaint }}
        />
      </BaseMapSource>

      <BaseMapSource
        id="map-draw-measure"
        source={measureSource}
      >
        <BaseMapLayer
          layer={{
            id: 'map-draw-measure-labels',
            type: 'symbol',
            source: 'map-draw-measure',
            layout: measureLabelLayout,
            paint: measureLabelPaint,
          }}
        />
      </BaseMapSource>

      <BaseMapSource
        id="map-draw-vertices"
        source={vertexSource}
      >
        <BaseMapLayer
          layer={{ id: 'map-draw-vertices-circle', type: 'circle', source: 'map-draw-vertices', paint: vertexPaint }}
        />
      </BaseMapSource>

      <Slot
        name="toolbar"
        drawing={drawing}
      />
    </>
  );
}
