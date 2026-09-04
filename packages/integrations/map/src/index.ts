// ─── @mission-platform/map ───────────────────────────────────────────────────
//
// MapLibre GL map components + composables, authored once in the neutral
// `@mission-platform/forge-jsx` dialect and compiled to React and Vue by
// `@mission-platform/vite-plugin-forge`. Consumers import the framework build from
// the `./react` / `./vue` subpath exports (where the components ship under their
// public names — `MapLibre`, `MapMarker`, …); this neutral `.` entry re-exports
// the source components (`Base*`), composables, shared `MapContext`, and every
// public type.
//
// Import the MapLibre stylesheet in your app's entry point:
//   import 'maplibre-gl/dist/maplibre-gl.css'

export * from './components';
export { MapContext } from './map-context';
export * from './composables';
