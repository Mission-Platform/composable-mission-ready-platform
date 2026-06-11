---
'@mission-platform/vite-config': patch
---

reduce cyclomatic complexity of `defineLibraryConfig`

Extract the entry-resolution and Rollup `output` branching into the
`resolveLibraryEntry` and `buildLibraryOutput` helpers so the main
`defineLibraryConfig` function has fewer decision points. Behaviour is
unchanged.
