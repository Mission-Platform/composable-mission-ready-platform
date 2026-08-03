---
'@mission-platform/vite-plugin-forge': patch
---

retry the generated-tree cleanup on transient `ENOTEMPTY` errors

`generateFrameworkSources` and `generateStoryblokBloks` wipe the generated source tree with a recursive `rmSync` before each Stage-1 emit. On macOS/APFS, or when a sibling framework build is still touching the same package's `node_modules/.cache`, the final `rmdir` can intermittently fail with `ENOTEMPTY` (also `EBUSY`/`EPERM`) and crash the build (e.g. `ENOTEMPTY … icons-solid`). Both deletes now pass Node's `maxRetries`/`retryDelay` options so the operation retries with linear backoff on exactly those transient errors instead of failing hard.
