---
'@mission-platform/phone-number': patch
---

Removed the vendored upstream libphonenumber sources (`vendor/`) and the
`src/metadata/upstream-loader.ts` build-time loader that evaluated them. The
regex pattern corpus they provided is now captured directly in
`src/metadata/pattern-corpus.ts` as self-contained TypeScript data, so the regex
compiler/VM diff-tests run without any external reference sources.
