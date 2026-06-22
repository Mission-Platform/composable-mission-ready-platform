---
"@mission-platform/hunspell": minor
---

extract a framework-agnostic `attachHunspellMonaco` core

The imperative Hunspell ↔ Monaco integration (worker spawn, debounced checking,
marker mapping, quick-fix code-action provider) is now a framework-agnostic
`attachHunspellMonaco(editor, monaco, language)` helper returning a
`{ dispose, recheck }` handle. The Vue `useHunspellMonaco` composable delegates
to it, and it is exported so non-Vue consumers (e.g. the write-once
`@mission-platform/components` `BaseMonacoEditor`) can wire spell checking
from a single shared implementation.
