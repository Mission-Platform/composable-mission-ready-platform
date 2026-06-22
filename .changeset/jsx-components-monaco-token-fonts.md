---
'@mission-platform/components': patch
---

Consume the `@mission-platform/tokens` design tokens in `BaseMonacoEditor`:
source the editor's `fontFamily` (mono) and `codeLensFontFamily` (sans) from the
shared `font` tokens (and re-enable `fontLigatures`/`fontVariations`), reaching
parity with the `@mission-platform/components` SFC. Adds `@mission-platform/tokens`
as a runtime dependency.
