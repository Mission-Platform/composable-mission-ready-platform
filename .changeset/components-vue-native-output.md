---
'@mission-platform/components': patch
---

regenerate Vue output — several components now compile to native `<template>` markup

`base-date-range-input`, `base-scheduler`, `base-list`, `base-calendar`, `base-pagination`, `base-multiselect` and `base-time-input` now build to idiomatic native Vue `<template>` markup (with correct `$attrs` fall-through) instead of a `<render v-bind="$attrs" />` render closure. Rendered output and behaviour are unchanged; the remaining harder cases still fall back cleanly.
