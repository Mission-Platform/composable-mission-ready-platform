---
'@mission-platform/tokens': minor
---

split the font primitives into a dedicated font tokens file and add a composite typography tokens file

The font primitives (`font.family`, `font.size`, `font.weight`, `line-height`,
`letter-spacing`) are moved out of `scale.tokens.json` into a new
`font.tokens.json`, and a new `typography.tokens.json` adds composite DTCG
`typography` styles (`display`, `h1`–`h6`, `body-lg`/`md`/`sm`/`xs`, `label`,
`caption`, `code`) composed from those primitives. Generation now emits the
composite `--mp-typography-<variant>-*` CSS custom properties (referencing the
primitive `--mp-*` tokens) and a `typography` export in the TypeScript token
module. The existing `--mp-*` / SCSS `$` / TS public surface is unchanged.
