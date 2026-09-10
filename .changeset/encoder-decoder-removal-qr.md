---
'@mission-platform/qr-code': major
---

remove the embedded QR decoder API

BREAKING CHANGE: remove `decodeQr`, `decodeQrAsync`, and the decoder FWS artifact; use `@mission-platform/code-scanner` for decoding.