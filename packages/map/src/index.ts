// ─── @mission-platform/map ───────────────────────────────────────────────────
// MapLibre GL Vue 3 wrapper with full reactivity support.
// Import the MapLibre stylesheet in your app's entry point:
//   import 'maplibre-gl/dist/maplibre-gl.css'

// ── Components ────────────────────────────────────────────────────────────────
export { default as MapLibre } from './components/MapLibre'
export type { MapLibreProps } from './components/MapLibre'

export { default as MapMarker } from './components/MapMarker'
export type { MapMarkerProps } from './components/MapMarker'

export { default as MapPopup } from './components/MapPopup'
export type { MapPopupProps } from './components/MapPopup'

export { default as MapSource } from './components/MapSource'
export type { MapSourceProps } from './components/MapSource'

export { default as MapLayer } from './components/MapLayer'
export type { MapLayerProps } from './components/MapLayer'

export { default as MapDraw } from './components/MapDraw'
export type { MapDrawProps } from './components/MapDraw'

// ── Composables ───────────────────────────────────────────────────────────────
export { useMap } from './composables/useMap'
export type { UseMapReturn } from './composables/useMap'

export { useMarker } from './composables/useMarker'
export type { UseMarkerOptions, UseMarkerReturn } from './composables/useMarker'

export { usePopup } from './composables/usePopup'
export type { UsePopupOptions, UsePopupReturn } from './composables/usePopup'

export { useSource } from './composables/useSource'
export type { UseSourceOptions } from './composables/useSource'

export { useLayer } from './composables/useLayer'
export type { UseLayerOptions } from './composables/useLayer'

export { useDrawing } from './composables/useDrawing'
export type {
  DrawMode,
  DrawnFeature,
  FeatureId,
  UseDrawingOptions,
  UseDrawingReturn,
} from './composables/useDrawing'

// ── Injection keys ────────────────────────────────────────────────────────────
export { mapKey } from './composables/injectionKeys'
