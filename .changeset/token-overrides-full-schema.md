---
'@mission-platform/vite-plugin-token-overrides': minor
---

enumerate every overridable token key in the override JSON Schema

The `./schema` export (`schema/token-overrides.schema.json`) now enumerates **all** overridable design-token keys from `@mission-platform/tokens` — `palette`/`theme-light`/`theme-dark` merged under `color`, plus `font`, `line-height`, `letter-spacing`, `spacing`, `radius`, `shadow`, `size`, `breakpoint`, `border-width`, `opacity`, `duration`, `easing`, `z-index`, and composite `typography` — each carrying its DTCG `$description` for editor hover. Every known key is validated against its expected value shape (scalar, `{ light, dark }` pair, or composite typography object) while unknown/app-specific keys are still accepted via the generic node fallback, so editors gain full autocomplete and validation for `*.tokens.json` override documents without breaking forward-compatibility.
