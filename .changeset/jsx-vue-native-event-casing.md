---
'@mission-platform/vite-plugin-jsx': patch
---

lowercase multi-word native DOM event listeners on the Vue target

Vue derives a DOM listener's event name by hyphenating the prop key after `on` (`onDragOver` → the dead `drag-over`), so a React-style multi-word listener on a native element bound nothing and events such as `dragover`/`drop` never fired. The Vue emitter now lowercases the event portion of `on<Event>` listeners on **native** (intrinsic) elements (`onDragOver` → `onDragover`, `@dragover`) on both the render-closure and `<template>` paths, so they bind the real DOM event; listeners on **component** elements keep their camelCase form to match the child's emits.
