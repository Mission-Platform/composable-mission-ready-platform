// ─── @mission-platform/map — neutral components barrel ──────────────────────────
//
// The single barrel the two-stage compiler reads (`generateFrameworkSources`):
// the `Base*` components are discovered and compiled per framework (their public
// names drop the `Base` prefix — `MapLibre`, `MapMarker`, …), while the lowercase
// composable re-exports are treated as **helper modules** and forwarded through
// the generated `./react` / `./vue` entry alongside the components.

// ── Components ────────────────────────────────────────────────────────────────
export { BaseMapLibre, type MapLibreProperties } from './map-libre';
export { BaseMapMarker, type MapMarkerProperties } from './map-marker';
export { BaseMapPopup, type MapPopupProperties } from './map-popup';
export { BaseMapSource, type MapSourceProperties } from './map-source';
export { BaseMapLayer, type MapLayerProperties } from './map-layer';
export { BaseMapDraw, type MapDrawProperties } from './map-draw';

// ── Composables (helper modules) ────────────────────────────────────────────────
export { useMap } from '../composables/use-map';
export { useMarker, type UseMarkerOptions, type UseMarkerReturn } from '../composables/use-marker';
export { usePopup, type UsePopupOptions, type UsePopupReturn } from '../composables/use-popup';
export { useSource, type UseSourceOptions } from '../composables/use-source';
export { useLayer, type UseLayerOptions } from '../composables/use-layer';
export {
  useDrawing,
  type DrawMode,
  type DrawnFeature,
  type FeatureId,
  type UseDrawingOptions,
  type UseDrawingReturn,
} from '../composables/use-drawing';
