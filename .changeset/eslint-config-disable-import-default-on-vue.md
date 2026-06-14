---
'@mission-platform/eslint-config': patch
---

disable `import/default` so Vue SFC default imports are not flagged

`eslint-plugin-import`'s `import/default` rule (DeepSource shortcode `JS-W1028`)
cannot resolve the implicit default export a Vue `<script setup>` SFC compiles
to, so importing a `.vue` component as a default import was wrongly reported as
"No default export found in imported module". The shared config now switches
that rule off — import linting continues through `eslint-plugin-import-x`, and
DeepSource honours the disabled rule, silencing the false positives repo-wide.
