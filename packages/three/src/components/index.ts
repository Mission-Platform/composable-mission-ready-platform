// ─── @mission-platform/three — neutral components barrel ─────────────────────
//
// The single barrel the two-stage compiler reads (`generateFrameworkSources`):
// the `Base*` component is discovered and compiled per framework (public name
// drops the `Base` prefix — `ThreeCanvas`), while the lowercase composable
// re-export is treated as a **helper module** and forwarded through the
// generated `./react` / `./vue` entry alongside the component.

// ── Components ────────────────────────────────────────────────────────────────
export { ForgeThreeCanvas, type ForgeThreeCanvasProperties } from './organisms/forge-three-canvas/forge-three-canvas';

// ── Composables (helper modules) ──────────────────────────────────────────────
export { useThree, type ThreeContext } from '../composables/use-three/use-three';
