---
"@mission-platform/harper": patch
"@mission-platform/components": patch
---

add harper grammar and style checker package and integrate into monaco editor

- add new `@mission-platform/harper` package providing Harper grammar/style checker integration for Monaco editor via `useHarperMonaco` composable
- integrate `useHarperMonaco` into `base-monaco-editor` alongside the existing Hunspell spell-checker
- add `@mission-platform/harper` as a dependency to `@mission-platform/components` and `@mission-platform/my-care-notes`
- wire `HarperWorker` into `my-care-notes` main entry and declare `HarperEnvironment` global type
- update root `package.json` build scripts: split assets into `build:tokens` and `build:icons`, add `build:monaco` step for hunspell + harper
- fix hunspell worker dictionary import casing from `en_au` to `en_AU`
