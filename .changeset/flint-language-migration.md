---
'@mission-platform/flint': major
'@mission-platform/flint-cli': major
'@mission-platform/flint-wasm': major
'@mission-platform/flint-runtime': major
'@mission-platform/flint-stdlib': major
'@mission-platform/flint-regex': major
'@mission-platform/flint-lsp': major
'@mission-platform/flint-language-service': major
'@mission-platform/flint-dap': major
'@mission-platform/flint-vitest': major
'@mission-platform/vite-plugin-flint': major
'@mission-platform/barcode-wasm': patch
'@mission-platform/barcode': patch
'@mission-platform/code-scanner-wasm': patch
'@mission-platform/code-scanner': patch
'@mission-platform/matrix-code-wasm': patch
'@mission-platform/matrix-code': patch
'@mission-platform/qr-code-wasm': patch
'@mission-platform/qr-code': patch
'@mission-platform/phone-number': patch
'@mission-platform/vite-plugin-forge': patch
---

migrate Forge Web Script (FWS) packages and downstream integrations to Flint

BREAKING CHANGE: The systems programming language formerly known as Forge Web Script (FWS) is now Flint. All package names have migrated to `@mission-platform/flint*`, primary source files now use `.flint` (with `.flt` supported as compact), diagnostic codes now emit `FLINT-*` prefixes, and compiler executables have been renamed to `flint` and `flint-lsp`.
