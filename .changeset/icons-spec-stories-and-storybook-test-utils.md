---
"@mission-platform/icons": patch
---

add unit tests and stories for all icon components

- add `icon.spec.ts` for every icon component covering svg rendering, class application, named size tokens, and numeric size in px
- add `icon.stories.ts` for icon components that benefit from visual documentation in Storybook
- rename storybook story and test files to lowercase (`I18n` → `i18n`, `Themes` → `themes`) for consistent file naming conventions
- add `@vue/test-utils` devDependency to `@mission-platform/storybook` to support icon component mounting in tests
