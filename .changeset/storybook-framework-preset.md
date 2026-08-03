---
'@mission-platform/storybook-framework': minor
---

add an env-driven Storybook framework preset

`@mission-platform/storybook-framework` provides `createStorybookConfig`, which
reads the `FRAMEWORK` env var (or an explicit `framework` option) to select the
matching Storybook renderer and story globs and wire the shared `viteFinal`
(i18n, Vue JSX for the Vue renderer, ES-module workers, inlined CSS). This lets
a single Storybook app render the platform's neutral and per-framework stories
on any supported framework instead of maintaining one app per framework.
