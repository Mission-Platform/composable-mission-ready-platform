---
'@mission-platform/vite-plugin-jsx': patch
---

emit native Vue `<template>` markup instead of a render function where possible

The Vue Stage-1 emitter now rewrites a component's returned JSX/`h()` tree into real Vue `<template>` markup for the single-tree primitives: a dynamic tag becomes `<component :is="tag">`, `class`/`style`/`on<Event>`/`ref`/other dynamic attributes become the matching binding, `cond ? <a/> : <b/>` becomes `v-if`/`v-else`, `properties.children`/`<Slot>` become native `<slot>`, and each derived scalar `const` is lifted to a reactive `computed`. Components whose body falls outside that shape (node-valued local consts, `.map()` lists, prop spreads, or `MpChild`-typed props rendered as children — the complex layout components) automatically fall back to the previous `<script setup>` + `const render = () => …` + `<component :is="render" />` closure. The compiled output stays functionally identical.
