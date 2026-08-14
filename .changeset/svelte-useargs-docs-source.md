---
'@mission-platform/storybook-framework': patch
'@mission-platform/storybook': patch
---

Force static Storybook docs source under the Svelte renderer so CSF `useArgs()` stories are not re-invoked outside the preview hooks context by `@storybook/svelte`'s source decorator.
