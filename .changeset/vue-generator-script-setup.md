---
'@mission-platform/vite-plugin-jsx': patch
---

emit Vue components as `<script setup>` SFCs instead of `export default defineComponent`

The Vue Stage-1 emitter now produces a `<script setup lang="tsx">` single-file component — `defineOptions({ name, inheritAttrs: false })`, a `defineProps(…)` declaration, `useSlots()`, and the translated hooks emitted once at the top level — with the per-render JSX moved into a `const render = () => …` closure rendered from the `<template>` via `<component :is="render" />` (since `<script setup>` cannot itself return a render function). The compiled output stays functionally identical.
