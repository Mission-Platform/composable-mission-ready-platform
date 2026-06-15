---
'@mission-platform/i18n': patch
---

create the vue-i18n instance in Composition API mode (`legacy: false`)

`createMpI18n` now sets `legacy: false`, matching how every consumer already uses the package (`useI18n()` in `<script setup>`). This makes `i18n.global.locale` a `WritableComputedRef`, so apps can read and assign the active locale via `i18n.global.locale.value` without TypeScript errors.
