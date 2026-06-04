// ─── @mission-platform/map ───────────────────────────────────────────────────
// MapLibre GL Vue 3 wrapper with full reactivity support.
// Import the MapLibre stylesheet in your app's entry point:
//   import 'maplibre-gl/dist/maplibre-gl.css'

// ── Components ────────────────────────────────────────────────────────────────
export { default as MapLibre } from './components/MapLibre';
export type { MapLibreProps } from './components/MapLibre';

export { default as MapMarker } from './components/MapMarker';
export type { MapMarkerProps } from './components/MapMarker';

export { default as MapPopup } from './components/MapPopup';
export type { MapPopupProps } from './components/MapPopup';

export { default as MapSource } from './components/MapSource';
export type { MapSourceProps } from './components/MapSource';

export { default as MapLayer } from './components/MapLayer';
export type { MapLayerProps } from './components/MapLayer';

export { default as MapDraw } from './components/MapDraw';
export type { MapDrawProps } from './components/MapDraw';

// ── Composables ───────────────────────────────────────────────────────────────
export { useMap } from './composables/use-map';
export type { UseMapReturn } from './composables/use-map';

export { useMarker } from './composables/use-marker';
export type { UseMarkerOptions, UseMarkerReturn } from './composables/use-marker';

export { usePopup } from './composables/use-popup';
export type { UsePopupOptions, UsePopupReturn } from './composables/use-popup';

export { useSource } from './composables/use-source';
export type { UseSourceOptions } from './composables/use-source';

export { useLayer } from './composables/use-layer';
export type { UseLayerOptions } from './composables/use-layer';

export { useDrawing } from './composables/use-drawing';
export type { DrawMode, DrawnFeature, FeatureId, UseDrawingOptions, UseDrawingReturn } from './composables/use-drawing';

// ── Injection keys ────────────────────────────────────────────────────────────
export { mapKey } from './composables/injection-keys';
