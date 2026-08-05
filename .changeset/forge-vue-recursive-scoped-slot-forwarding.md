---
'@mission-platform/vite-plugin-forge': minor
---

compile recursive render-prop components to native Vue `<template>` and forward scoped slots to child components

The Vue template builder's node-typed-prop-as-child guard is now receiver-aware: a plain field read whose name coincides with a render-prop (e.g. `{node.label}`) renders as a normal `{{ … }}` interpolation instead of forcing the `<render v-bind="$attrs" />` render-closure fallback, so recursive components like `base-tree-view-item` compile to native `<template>`. A node-typed render-prop passed to a child component (`label={properties.label}`) is now emitted as a real `<template #label="scope"><slot name="label" v-bind="scope" /></template>` forwarding block rather than a `:label` prop binding, so a custom scoped slot renders correctly at every recursion depth.
