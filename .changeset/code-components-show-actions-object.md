---
'@mission-platform/barcode': major
'@mission-platform/matrix-code': major
'@mission-platform/qr-code': major
---

collapse the action-toolbar props into a single `showActions` prop

`ForgeBarcode`, `ForgeMatrixCode` and `ForgeQrCode` now take one `showActions`
prop accepting either `true` (every button) or an object naming the buttons to
show. Each package exports the matching options interface — `BarcodeActions`,
`MatrixCodeActions` and `QrCodeActions` — alongside its `*Properties` type.

BREAKING CHANGE: the `showDownloadButton`, `showCopyImageButton` and
`showCopyValueButton` props have been removed. Pass their object equivalents to
`showActions` instead — `showDownloadButton: true` becomes
`showActions: { download: true }`, `showCopyImageButton: true` becomes
`showActions: { copyImage: true }`, and `showCopyValueButton: true` becomes
`showActions: { copyValue: true }`. `showActions: true` still enables the whole
toolbar, and omitting the prop still renders no toolbar.
