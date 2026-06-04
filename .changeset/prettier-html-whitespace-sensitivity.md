---
"@mission-platform/prettier-config": patch
---

Add `htmlWhitespaceSensitivity: 'ignore'` to the Prettier config. This ensures multi-line Vue/HTML elements with inline content (e.g. `{{ label }}`) are formatted with the content on its own line rather than immediately following the closing `>` of the opening tag.
