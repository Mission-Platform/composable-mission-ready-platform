---
'@mission-platform/code-scanner': minor
---

Add opt-in diagnostic logging to help debug codes that are located but fail to decode (the common Data Matrix / 1D-barcode symptom). The JS façade now traces each scan stage — capture size, the located format, its sampled payload (module counts) and each decoder's verdict — via a new `setCodeScannerDebug(true)` toggle (also enabled by the `__CODE_SCANNER_DEBUG__` global or the `BaseCodeScanner` `debug` prop). The wasm scanner emits matching `tracing` events at every decision point (Otsu threshold, dense bounds, inferred Data Matrix size and module geometry, barcode scan-line quality, and each rejection reason), visible in the devtools console. Logging is off by default so production output stays quiet.
