---
'@mission-platform/tokens': minor
---

document every design token with a DTCG `$description`

Added `$description` metadata across the DTCG sources so each token group and value is self-documenting: the colour palette (the `color` group plus every hue ramp and the black/white/primary helper swatches), the structural scales (`spacing`, `radius`, `shadow`, `breakpoint`, and the `size.*` subgroups, with per-token notes and px equivalents), and the font primitives (`font.family`/`size`/`weight`, `line-height`, `letter-spacing`). The descriptions are emitted as `///` doc comments in the generated SCSS/CSS/TS output and surfaced by the asimonim LSP on hover. Token names, values and generated artefacts are otherwise unchanged.
