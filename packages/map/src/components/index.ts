// ─── @mission-platform/map — neutral components barrel ──────────────────────────
//
// The single barrel the two-stage compiler reads (`generateFrameworkSources`):
// the `Base*` components are discovered and compiled per framework (their public
// names drop the `Base` prefix — `MapLibre`, `MapMarker`, …), while the lowercase
// composable re-exports are treated as **helper modules** and forwarded through
// the generated `./react` / `./vue` entry alongside the components.

// ── Components ────────────────────────────────────────────────────────────────
export { ForgeMapLibre, type MapLibreProperties } from './organisms/forge-map-libre';
export { ForgeMapMarker, type MapMarkerProperties } from './molecules/forge-map-marker';
export { ForgeMapPopup, type MapPopupProperties } from './molecules/forge-map-popup';
export { ForgeMapSource, type MapSourceProperties } from './molecules/forge-map-source';
export { ForgeMapLayer, type MapLayerProperties } from './molecules/forge-map-layer';
export { ForgeMapDraw, type MapDrawProperties } from './molecules/forge-map-draw';

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
