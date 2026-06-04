---
"@mission-platform/hunspell": minor
"@mission-platform/components": patch
---

Add `tokenize` method to `HunspellChecker` with `TokenResult` and `TokenResultVector` types; export new types from package index. Refactor hunspell build script to separate `build:wasm` and `build:ts` steps. Remove redundant `role="region"` from `BaseMonacoEditor`.
