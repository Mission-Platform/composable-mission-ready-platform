---
"@mission-platform/components": patch
---

Remove redundant `interface Window { HunspellEnvironment? }` extension from `use-hunspell-monaco.ts`. The `declare global { var HunspellEnvironment }` declaration already covers both `globalThis` and `window`, making the `Window` interface block unnecessary.
