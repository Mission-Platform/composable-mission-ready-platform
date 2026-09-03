// ─── @mission-platform/d3 · composables ──────────────────────────────────────
//
// Write-once composables that bridge D3's selection-based rendering into the
// neutral `@mission-platform/jsx` component model. Authored once and compiled
// to every supported framework by `@mission-platform/vite-plugin-jsx`.

// Reactive D3 selection binding.
export { useD3, type D3Draw, type D3Selection } from './use-d3/use-d3';
