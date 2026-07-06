---
"@mission-platform/harper": minor
---

extract a framework-agnostic `attachHarperMonaco` core

The imperative Harper ↔ Monaco integration (worker spawn, debounced checking,
marker mapping, quick-fix code-action provider) is now a framework-agnostic
`attachHarperMonaco(editor, monaco, language)` helper returning a
`{ dispose, recheck }` handle. The Vue `useHarperMonaco` composable delegates to
it, and it is exported so non-Vue consumers (e.g. the write-once
`@mission-platform/components` `BaseMonacoEditor`) can wire grammar checking
from a single shared implementation.
