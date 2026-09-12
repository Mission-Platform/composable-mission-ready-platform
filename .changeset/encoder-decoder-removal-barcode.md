---
'@mission-platform/barcode': major
---

remove the embedded barcode decoder API

BREAKING CHANGE: remove `decodeBarcode`, `decodeBarcodeAsync`, and the decoder FWS exports; use `@mission-platform/code-scanner` for decoding.