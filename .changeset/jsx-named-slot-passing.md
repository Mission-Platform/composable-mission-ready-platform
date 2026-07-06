---
'@mission-platform/jsx': minor
---

support passing content into a child component's named slot

The runtime adapters now route a child element marked `slot="name"` into the
matching named slot of the component being expanded — mirroring native Vue
`<template #name>` / a React `name` prop. A new `collectSlottedChildren` helper
partitions a parent's children by their `slot` marker (stripping the marker so
no stray attribute is emitted) and both the React and Vue adapters fold the
named groups into the child's props, with the unmarked children staying in the
default slot. `MpProperties` gains a documented optional `slot?: string`.
