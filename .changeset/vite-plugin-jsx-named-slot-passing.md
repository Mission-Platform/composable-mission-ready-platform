---
'@mission-platform/vite-plugin-jsx': minor
---

compile named-slot passing into child components

A write-once component can now pass content into a child component's named slot
by marking a child with `slot="name"`. The compiler routes it to each
framework's native mechanism: the React emitter turns `<Child><x slot="name"/></Child>`
into a `name={<x/>}` prop; the Vue template path emits a `<template #name>`
block (with the default-slot children in `<template #default>`); and the Vue
render-closure path emits the `@vitejs/plugin-vue-jsx` `{{ name: () => … }}`
object-children form (composed before the reference rewriter, so setters and
state reads inside the slot functions are still translated to Vue reactivity).
The `slot` marker is always stripped from the generated output.
