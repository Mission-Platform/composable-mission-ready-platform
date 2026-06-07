---
'@mission-platform/vite-config': patch
---

add `fileName` option to `defineLibraryConfig`

Consumers can now set the Rollup output bundle name (without extension)
directly via `defineLibraryConfig({ fileName: 'breakpoints' })` instead
of re-declaring the full `build.lib.entry` + `fileName` pair under
`overrides`. The option is ignored when `entry` is an entry map.
