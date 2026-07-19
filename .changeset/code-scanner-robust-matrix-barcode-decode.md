---
'@mission-platform/code-scanner': patch
---

Fix Data Matrix and 1D-barcode captures that were located but failed to decode. The scanner now localises from an ink-*density* bounding box (so stray speckle or clutter in the quiet zone no longer explodes the symbol bounds), infers the Data Matrix size from the mode of several timing-edge probes instead of a single line, reads each Data Matrix module by a small majority vote (falling back to a single centre sample for very small modules), and picks the cleanest of several barcode scan-lines rather than blindly trusting the middle one. QR scanning is unchanged. Native end-to-end tests now drive real encoders → scanner → real decoders across clean, downscaled, cluttered and noisy images.
