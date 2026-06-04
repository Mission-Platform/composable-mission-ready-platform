---
---

Refactor root build scripts to use parallel execution and split into four explicit stages: `build:config` (lint/style/postcss configs), `build:assets` (tokens and icons), `build:packages` (components, breakpoints, i18n, map, hunspell), and `build:apps` (storybook, my-care-notes). Add a top-level `build` script that orchestrates all four stages in dependency order.
