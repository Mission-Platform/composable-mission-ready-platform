---
'@mission-platform/components': minor
---
tune base-monaco-editor typography and overflow behavior

Apply the shared `@mission-platform/tokens` font families to the Monaco
editor (`fontFamily`, `codeLensFontFamily`), enable `fontLigatures`,
`fontVariations`, and `allowOverflow`, and disable
`copyWithSyntaxHighlighting` to keep clipboard payloads as plain text.
Also drop the redundant `role="region"` attribute from the wrapper so
the editor's own ARIA semantics are not overridden.
