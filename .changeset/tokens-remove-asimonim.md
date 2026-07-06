---
'@mission-platform/tokens': patch
---

remove the asimonim tooling integration

Dropped asimonim from the package entirely: removed the `tokens:validate` script,
deleted the `.config/design-tokens.yaml` asimonim config (and its `files` entry), and
updated `llms.txt` to describe the self-contained `@mission-platform/vite-plugin-tokens`
generator instead. The DTCG sources and all generated SCSS/CSS/TS artefacts are unchanged.
