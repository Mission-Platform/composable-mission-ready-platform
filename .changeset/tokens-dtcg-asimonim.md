---
'@mission-platform/tokens': minor
---

migrate design tokens to the DTCG format managed with asimonim

- The design tokens are now authored in the DTCG (designtokens.org) **v2025.10**
  format under `tokens/*.tokens.json` (primitive palette, structural scales, and
  light/dark semantic themes), which become the single source of truth.
- Colours are defined in the **OKLab** colour space (emitted as `oklab(L a b / α)`),
  replacing the previous hex / `rgb()` values.
- The primary sans font is now **Comfortaa** and the primary mono font is **Datatype**.
- The SCSS variables, `--mp-*` CSS custom properties, theme blocks, the standalone
  `@mission-platform/tokens/css` bundle, and the TypeScript token module are generated
  from the DTCG sources at build time by `@mission-platform/vite-plugin-tokens` (via
  asimonim), replacing the hand-maintained value files. The public SCSS/CSS/TS API
  (names and exports) is unchanged. A `tokens:validate` script and an asimonim config
  (`.config/design-tokens.yaml`) are added for CLI/LSP/MCP tooling.
