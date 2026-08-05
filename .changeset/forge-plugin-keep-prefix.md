---
'@mission-platform/vite-plugin-forge': major
---

keep the `Forge` prefix through compilation instead of stripping it

BREAKING CHANGE: the compiler no longer strips the component prefix, so the public API of compiled packages now exposes `Forge`-prefixed names (e.g. `ForgeButton`) rather than the previously stripped names (e.g. `Button`). The `stripPrefix` default now defaults to keeping the prefix.
