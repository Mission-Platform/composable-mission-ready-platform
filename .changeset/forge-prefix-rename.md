---
'@mission-platform/components': major
'@mission-platform/icons': major
'@mission-platform/wysiwyg': major
'@mission-platform/map': major
'@mission-platform/layouts': major
'@mission-platform/forms': major
'@mission-platform/breakpoints': major
'@mission-platform/three': major
'@mission-platform/matrix-code': major
'@mission-platform/code-scanner': major
'@mission-platform/barcode': major
'@mission-platform/qr-code': major
'@mission-platform/tokens': patch
'@mission-platform/forge': patch
'@mission-platform/forms-core': patch
'@mission-platform/scheduler-core': patch
'@mission-platform/hunspell': patch
'@mission-platform/harper': patch
'@mission-platform/phone-number': patch
'@mission-platform/qr-code-encode-wasm': patch
'@mission-platform/qr-code-decode-wasm': patch
'@mission-platform/matrix-code-encode-wasm': patch
'@mission-platform/matrix-code-decode-wasm': patch
'@mission-platform/code-scan-wasm': patch
'@mission-platform/barcode-encode-wasm': patch
'@mission-platform/barcode-decode-wasm': patch
'@mission-platform/storybook-framework': patch
'@mission-platform/tsdown-config': patch
---

rename the component library prefix from `Base` to `Forge`

BREAKING CHANGE: every exported component symbol and its folder/file and CSS class name is renamed from `Base*`/`base-*` to `Forge*`/`forge-*` (e.g. `BaseButton` → `ForgeButton`), and previously-unprefixed components (`HideAt`, `ShowAt`, `BreakpointDebug`) and every icon (`IconStar` → `ForgeIconStar`) now carry the `Forge` prefix. Consumers must update all imports and template usages accordingly.
