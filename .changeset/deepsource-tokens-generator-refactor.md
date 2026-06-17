---
"@mission-platform/vite-plugin-tokens": patch
---

simplify the DTCG flattener/generator and add missing doc comments

Extracts the token-flattening walk and per-source artefact emission into
smaller, documented helpers to lower their cyclomatic complexity, and adds
the missing documentation comments on the DTCG type guards and helpers. The
generated SCSS/TypeScript output is unchanged.
