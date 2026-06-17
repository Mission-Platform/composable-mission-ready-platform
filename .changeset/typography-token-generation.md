---
'@mission-platform/vite-plugin-tokens': minor
---

generate font and composite typography artefacts from the new DTCG sources

The plugin now reads the dedicated `font.tokens.json` and `typography.tokens.json`
sources in addition to `palette`/`scale`/theme files. Font primitives are emitted
alongside the structural scales (stable `$font-*` / `--mp-font-*` names), and the
composite `typography` tokens — which asimonim cannot resolve — are expanded by the
plugin into `_typography.scss` (`--mp-typography-<variant>-*` custom properties) and a
`typography` export in the generated TypeScript module. New helpers
`buildTypographyCss` and `buildTypographyLiteral` are exported, and
`buildLegacyModule` accepts an optional `typographyLiteral` argument.
