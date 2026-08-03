// ─── @mission-platform/d3 ─────────────────────────────────────────────────────
//
// D3 ↔ Vue 3 integration for Mission Platform. It keeps D3 as the drawing engine
// (scales, axes, shapes, transitions) while making its selection-based rendering
// feel native in `<script setup>`: `useD3` binds a template ref to a D3
// `Selection` and redraws reactively, and the `margins` helpers provide the pure
// margin-convention maths every chart needs for responsive layout.

// Reactive D3 selection binding.
export { useD3, type D3Draw, type D3Selection } from './composables/use-d3';

// Margin-convention layout maths.
export {
  innerDimensions,
  resolveMargin,
  type ChartBox,
  type InnerDimensions,
  type Margin,
  type MarginInput,
} from './utils/margins';
