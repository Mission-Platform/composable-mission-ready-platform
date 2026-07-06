/**
 * Vue emitter for the Stage-1 compiler.
 *
 * A neutral component authored against `@mission-platform/jsx` is rewritten into
 * a real `.vue` single-file component (`<script setup lang="tsx">`). The returned
 * markup is emitted as native `<template>` markup where possible, and otherwise
 * falls back to a `render` closure rendered from the `<template>`. The work is
 * split across:
 *
 * - `shared.ts` — the {@link VueAnalysis} accumulator and small rewrite helpers,
 * - `scope.ts` — the read-only pass building the {@link RewriteScope},
 * - `effects.ts` — the `useEffect` → Vue lifecycle translation,
 * - `body.ts` — splitting the body into setup-once work and the derived/return parts,
 * - `template.ts` — the JSX/`h()` → native Vue `<template>` conversion (with an
 *   automatic render-closure fallback for shapes it cannot express),
 * - `imports.ts` / `styles.ts` — the SFC `import`/`defineProps`/`<style>` construction, and
 * - `emit-module.ts` — the module transform tying them together.
 */
export { emitVueModule } from './emit-module.js';
