---
'@mission-platform/components': patch
---

add a reusable cross-framework SSR DOM parity test helper

A new `src/test-utils/ssr-parity.ts` helper renders a write-once component on
both the React and Vue `@mission-platform/jsx` adapters to static SSR markup,
normalises framework-specific artefacts, and asserts the two outputs are the
**same DOM** before the per-component assertions run. It is wired into the
canonical `base-badge.spec.ts` as the pattern for the rest of the suite, and is
excluded from the published build (test-only). This underpins the cross-framework
parity verification tracked by the repo's parity matrix tooling.
