---
'@mission-platform/tokens': minor
'@mission-platform/vite-plugin-tokens': minor
---

add marginBlock/marginInline logical-margin fields to the composite typography tokens

Each `typography.tokens.json` variant (`display`, `h1`–`h6`, `body-lg`/`md`/`sm`/`xs`,
`label`, `caption`, `code`) now carries `marginBlock` and `marginInline` fields aliased
from the `spacing.*` scale (`{spacing.3}`, `{spacing.0}`, …). The generator's typography
field list emits the matching `--mp-typography-<variant>-margin-block` /
`--mp-typography-<variant>-margin-inline` CSS custom properties (referencing the primitive
`--mp-spacing-*` tokens) and the `typography` TypeScript export gains the new
`marginBlock`/`marginInline` keys. The plugin now resolves the composite typography
`{spacing.*}` aliases (alongside the existing `{font.*}` aliases) when emitting the
TypeScript module. The existing typography fields and public surface are unchanged.
