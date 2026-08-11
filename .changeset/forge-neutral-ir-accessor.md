---
'@mission-platform/vite-plugin-forge': minor
---

expose `analyzeForgeModule` as the neutral semantic IR accessor

The previously private `createSemanticModule` is now exported as
`analyzeForgeModule(input)`, so consumers that need the target-neutral IR — such
as the CMS projection driver — can obtain it without electing a
`FrameworkOutputPlugin`. Results are shared through the existing semantic cache,
so a component analysed for several targets in one build is only inferred once.
