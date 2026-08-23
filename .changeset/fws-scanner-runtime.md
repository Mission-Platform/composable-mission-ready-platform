---
'@mission-platform/code-scanner': minor
---

Replace the legacy `@mission-platform/code-scan-wasm` runtime with a statically linked Forge Web Script scanner graph.
The static build enables WebAssembly SIMD and aggressive link-time optimization; dynamic builds retain explicit decoder
module boundaries with cached dispatch. The public image, file, camera, synchronous, and asynchronous scanner APIs
remain compatible.