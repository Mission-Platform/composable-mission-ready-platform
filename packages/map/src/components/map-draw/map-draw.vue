<script lang="ts" setup>
  import { palette } from '@mission-platform/tokens';
  import { computed, watch } from 'vue';

  import { useDrawing } from '../../composables/use-drawing';
  import { useMap } from '../../composables/use-map';
  import { toMapColor } from '../../utils/to-map-color';
  import MapLayer from '../map-layer/map-layer.vue';
  import MapSource from '../map-source/map-source.vue';

  import type { DrawMode, DrawnFeature, FeatureId, UseDrawingOptions } from '../../composables/use-drawing';
  import type { Feature, FeatureCollection } from 'geojson';
  import type { GeoJSONSourceSpecification } from 'maplibre-gl';

  export interface MapDrawProps {
    /** Currently active drawing mode. When omitted the tool is in idle/edit mode. */
    mode?: DrawMode;
    /**
     * Pre-existing drawn features to hydrate the tool with (e.g. loaded from a
     * server). Changes to this prop are reflected in the internal state.
     */
    modelValue?: DrawnFeature[];
    /**
     * When `true` (default), move and scale operations use geodesic (ground-accurate)
     * calculations that respect map projection distortion.
     * When `false`, raw lng/lat arithmetic is used — shapes keep their visual
     * appearance on the screen regardless of latitude.
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
  }

  const props = withDefaults(defineProps<MapDrawProps>(), {
    mode: undefined,
    modelValue: () => [],
    geodesic: true,
    strokeColor: palette.color.primary[500], // #6c2fd4
    fillColor: palette.color.primary[500], // #6c2fd4
    fillOpacity: 0.2,
    strokeWidth: 2,
    draftColor: palette.color.warning[500], // #f79009
    vertexColor: palette.color.white, // #fff
  });

  const emit = defineEmits<{
    /** Fired whenever the committed feature set changes. */
    'update:modelValue': [features: DrawnFeature[]];
    /** Fired when the active drawing mode changes. */
    'update:mode': [mode: DrawMode];
    /** Fired when a feature is selected. `null` means deselected. */
    select: [id: FeatureId | null];
    /** Fired when the geodesic toggle changes. */
    'update:geodesic': [geodesic: boolean];
  }>();

  /** Vertex colour used specifically for draft (in-drawing) vertex circles. */
  const draftVertexColor = palette.color.warning[500];

  const { map } = useMap();

  const drawingOptions: UseDrawingOptions = {
    initialFeatures: props.modelValue,
  };

  const drawing = useDrawing(map, drawingOptions);

  // ── Sync geodesic prop → internal drawing state ──────────────────────────
  watch(
    () => props.geodesic,
    (val: boolean | undefined) => {
      if (drawing.geodesic.value !== (val !== false)) {
        drawing.setGeodesic(val !== false);
      }
    },
    { immediate: true },
  );

  // ── Emit geodesic changes upward ─────────────────────────────────────────
  watch(drawing.geodesic, (val) => {
    if (props.geodesic !== !!val) {
      emit('update:geodesic', !!val);
    }
  });

  // ── Sync mode prop → internal drawing mode ────────────────────────────────
  watch(
    () => props.mode,
    (newMode) => {
      if (newMode !== drawing.mode.value) {
        if (newMode === null) {
          drawing.cancelDrawing();
        } else {
          drawing.startDrawing(newMode);
        }
      }
    },
    { immediate: true },
  );

  // ── Emit mode changes upward ──────────────────────────────────────────────
  // The internal drawing mode resets to `undefined` once a shape is committed
  // (or cancelled). Without propagating that back to the parent, a `v-model:mode`
  // / `:mode` + `@update:mode` binding would stay stuck on the previous value,
  // so the prop watcher above never re-fires `startDrawing` and no further
  // shapes can be drawn.
  watch(
    () => drawing.mode.value,
    (newMode) => {
      if (props.mode !== newMode) {
        emit('update:mode', newMode);
      }
    },
  );

  // ── Sync modelValue prop → internal features ─────────────────────────────
  // Guard flag prevents re-seeding when the value bounced back from an internal change.
  let emittingFromInternal = false;

  watch(
    () => props.modelValue,
    (val) => {
      if (emittingFromInternal) return;
      drawing.setFeatures(val ?? []);
    },
  );

  // ── Emit feature changes upward ───────────────────────────────────────────
  watch(drawing.features, (fc) => {
    emittingFromInternal = true;
    emit('update:modelValue', fc.features as DrawnFeature[]);
    // Reset on next microtask so the parent watcher has time to run first
    Promise.resolve().then(() => {
      emittingFromInternal = false;
    });
  });

  watch(
    () => drawing.selectedId.value,
    (id) => {
      emit('select', id ?? null);
    },
  );

  // ── Map event wiring ──────────────────────────────────────────────────────
  watch(
    map,
    (instance, prev) => {
      if (prev) {
        prev.off('click', drawing.handleMapClick);
        prev.off('dblclick', drawing.handleMapDblClick);
        prev.off('mousemove', drawing.handleMapMouseMove);
        prev.off('mousedown', drawing.handleMapMouseDown);
        prev.off('mouseup', drawing.handleMapMouseUp);
        prev.off('moveend', drawing.handleMapMoveEnd);
        prev.off('zoomend', drawing.handleMapMoveEnd);
      }
      if (!instance) return;

      instance.on('click', drawing.handleMapClick);
      instance.on('dblclick', drawing.handleMapDblClick);
      instance.on('mousemove', drawing.handleMapMouseMove);
      instance.on('mousedown', drawing.handleMapMouseDown);
      instance.on('mouseup', drawing.handleMapMouseUp);
      instance.on('moveend', drawing.handleMapMoveEnd);
      instance.on('zoomend', drawing.handleMapMoveEnd);
    },
    { immediate: true },
  );

  // ── Cursor style ─────────────────────────────────────────────────────────
  watch(
    [() => drawing.isDragging.value, () => drawing.mode.value, () => drawing.selectedId.value],
    ([dragging, activeMode, selected]) => {
      const canvas = map.value?.getCanvas();
      if (!canvas) return;
      if (activeMode) {
        canvas.style.cursor = 'crosshair';
      } else if (dragging) {
        canvas.style.cursor = 'grabbing';
      } else if (selected) {
        canvas.style.cursor = 'grab';
      } else {
        canvas.style.cursor = '';
      }
    },
  );

  // ── GeoJSON sources ───────────────────────────────────────────────────────

  /** Committed shapes source. */
  const committedSource = computed<GeoJSONSourceSpecification>(() => ({
    type: 'geojson',
    data: drawing.features.value as unknown as FeatureCollection,
    // Promote the string `id` property so queryRenderedFeatures can find it via feature.id
    promoteId: 'id',
  }));

  /** Ghost preview source — follows the cursor live during drawing. */
  const ghostSource = computed<GeoJSONSourceSpecification>(() => ({
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: drawing.ghostFeature.value ? [drawing.ghostFeature.value as Feature] : [],
    },
  }));

  /** Draft vertex point source — circles at each clicked vertex during line/polygon drawing. */
  const draftVertexSource = computed<GeoJSONSourceSpecification>(() => ({
    type: 'geojson',
    data: drawing.draftVertexPoints.value as unknown as FeatureCollection,
  }));

  /** Anchor/center point source for two-click shapes (square, circle, triangle). */
  const anchorSource = computed<GeoJSONSourceSpecification>(() => ({
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: drawing.anchorPoint.value ? [drawing.anchorPoint.value as Feature] : [],
    },
  }));

  /** Measurement label source — midpoint of lines and centroid of polygons. */
  const measureSource = computed<GeoJSONSourceSpecification>(() => ({
    type: 'geojson',
    data: drawing.measureLabels.value as unknown as FeatureCollection,
  }));

  /** Draft (in-progress) shape source — committed draft, not used for live preview. */
  const draftSource = computed<GeoJSONSourceSpecification>(() => ({
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: drawing.draftFeature.value ? [drawing.draftFeature.value as Feature] : [],
    },
  }));

  /** Vertex handle source — only for the selected feature. */
  const vertexSource = computed<GeoJSONSourceSpecification>(() => {
    const selectedFeature = (drawing.features.value as FeatureCollection).features.find(
      (f: Feature) => (f as DrawnFeature).id === drawing.selectedId.value,
    ) as DrawnFeature | undefined;

    if (!selectedFeature) {
      return { type: 'geojson', data: { type: 'FeatureCollection', features: [] } };
    }

    const geom = selectedFeature.geometry;
    let coords: [number, number][] = [];

    if (geom.type === 'LineString') {
      coords = geom.coordinates as [number, number][];
    } else if (geom.type === 'Polygon') {
      // Exclude the closing duplicate vertex
      coords = (geom.coordinates[0]?.slice(0, -1) ?? []) as [number, number][];
    }

    return {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: coords.map((coord, index) => ({
          type: 'Feature',
          id: index,
          geometry: { type: 'Point', coordinates: coord },
          properties: { vertexIndex: index },
        })),
      },
    };
  });

  // ── Layer paint expressions ───────────────────────────────────────────────

  const fillPaint = computed(() => ({
    'fill-color': toMapColor(props.fillColor),
    'fill-opacity': [
      'case',
      ['==', ['get', 'id'], drawing.selectedId.value ?? ''],
      Math.min(props.fillOpacity * 1.5, 1),
      props.fillOpacity,
    ] as unknown as number,
  }));

  const linePaint = computed(() => ({
    'line-color': toMapColor(props.strokeColor),
    'line-width': props.strokeWidth,
  }));

  const draftFillPaint = computed(() => ({
    'fill-color': toMapColor(props.draftColor),
    'fill-opacity': props.fillOpacity,
  }));

  const draftLinePaint = computed(() => ({
    'line-color': toMapColor(props.draftColor),
    'line-width': props.strokeWidth,
    'line-dasharray': [2, 2],
  }));

  const vertexPaint = computed(() => ({
    'circle-radius': 6,
    'circle-color': toMapColor(props.vertexColor),
    'circle-stroke-color': toMapColor(props.strokeColor),
    'circle-stroke-width': 2,
  }));

  const draftVertexPaint = computed(() => ({
    'circle-radius': 5,
    'circle-color': toMapColor(draftVertexColor),
    'circle-stroke-color': toMapColor(palette.color.white),
    'circle-stroke-width': 2,
  }));

  const anchorPaint = computed(() => ({
    'circle-radius': 7,
    'circle-color': toMapColor(props.draftColor),
    'circle-stroke-color': toMapColor(palette.color.white),
    'circle-stroke-width': 2,
  }));

  const ghostFillPaint = computed(() => ({
    'fill-color': toMapColor(props.draftColor),
    'fill-opacity': props.fillOpacity * 0.6,
  }));

  const ghostLinePaint = computed(() => ({
    'line-color': toMapColor(props.draftColor),
    'line-width': props.strokeWidth,
    'line-dasharray': [3, 3],
    'line-opacity': 0.75,
  }));

  const measureLabelLayout = computed(() => ({
    'text-field': ['get', 'label'] as unknown as string,
    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'] as unknown as string[],
    'text-size': 12,
    'text-anchor': 'top' as const,
    'text-offset': [0, 0.5] as [number, number],
    'text-allow-overlap': false,
    'text-ignore-placement': false,
  }));

  const measureLabelPaint = computed(() => ({
    'text-color': toMapColor(palette.color.neutral[900]), // #08060d — dark text on map
    'text-halo-color': toMapColor(palette.color.white), // #fff — halo for legibility
    'text-halo-width': 2,
  }));

  // ── Public API exposed to parent ──────────────────────────────────────────
  defineExpose({
    drawing,
  });
</script>

<template>
  <!-- Committed shapes -->
  <MapSource
    id="map-draw-committed"
    :source="committedSource"
  >
    <!-- Polygon / square / circle / triangle fill -->
    <MapLayer
      :layer="{
        id: 'map-draw-fill',
        type: 'fill',
        source: 'map-draw-committed',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: fillPaint,
      }"
    />
    <!-- Line and polygon stroke -->
    <MapLayer
      :layer="{
        id: 'map-draw-line',
        type: 'line',
        source: 'map-draw-committed',
        paint: linePaint,
      }"
    />
  </MapSource>

  <!-- Ghost preview: cursor-following live shape while drawing -->
  <MapSource
    id="map-draw-ghost"
    :source="ghostSource"
  >
    <MapLayer
      :layer="{
        id: 'map-draw-ghost-fill',
        type: 'fill',
        source: 'map-draw-ghost',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: ghostFillPaint,
      }"
    />
    <MapLayer
      :layer="{
        id: 'map-draw-ghost-line',
        type: 'line',
        source: 'map-draw-ghost',
        paint: ghostLinePaint,
      }"
    />
  </MapSource>

  <!-- Vertex indicator circles for each clicked point during line/polygon drawing -->
  <MapSource
    id="map-draw-draft-vertices"
    :source="draftVertexSource"
  >
    <MapLayer
      :layer="{
        id: 'map-draw-draft-vertices-circle',
        type: 'circle',
        source: 'map-draw-draft-vertices',
        paint: draftVertexPaint,
      }"
    />
  </MapSource>

  <!-- Anchor/center point for two-click shapes (square, circle, triangle) -->
  <MapSource
    id="map-draw-anchor"
    :source="anchorSource"
  >
    <MapLayer
      :layer="{
        id: 'map-draw-anchor-circle',
        type: 'circle',
        source: 'map-draw-anchor',
        paint: anchorPaint,
      }"
    />
  </MapSource>

  <!-- Committed draft shape (kept for compatibility; ghost replaces visual role) -->
  <MapSource
    id="map-draw-draft"
    :source="draftSource"
  >
    <MapLayer
      :layer="{
        id: 'map-draw-draft-fill',
        type: 'fill',
        source: 'map-draw-draft',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: draftFillPaint,
      }"
    />
    <MapLayer
      :layer="{
        id: 'map-draw-draft-line',
        type: 'line',
        source: 'map-draw-draft',
        paint: draftLinePaint,
      }"
    />
  </MapSource>

  <!-- Measurement labels: length on lines, area on polygons -->
  <MapSource
    id="map-draw-measure"
    :source="measureSource"
  >
    <MapLayer
      :layer="{
        id: 'map-draw-measure-labels',
        type: 'symbol',
        source: 'map-draw-measure',
        layout: measureLabelLayout,
        paint: measureLabelPaint,
      }"
    />
  </MapSource>

  <!-- Vertex handles for the selected committed feature -->
  <MapSource
    id="map-draw-vertices"
    :source="vertexSource"
  >
    <MapLayer
      :layer="{
        id: 'map-draw-vertices-circle',
        type: 'circle',
        source: 'map-draw-vertices',
        paint: vertexPaint,
      }"
    />
  </MapSource>

  <!-- Optional toolbar slot -->
  <slot :drawing="drawing" />
</template>
