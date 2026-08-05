# @mission-platform/code-scanner

A dependency-free **image / camera code scanner** written in Rust and compiled to WebAssembly. It locates and decodes
**QR codes**, **Data Matrix** symbols, **compact Aztec** codes, **1D barcodes**, **PDF417**, **GS1 DataBar** (RSS-14)
and **MaxiCode** from either a decoded image (a file upload) or a live camera stream, and ships a write-once component
available for both **React** and **Vue 3**. Data Matrix and 1D barcodes read at **any rotation**, and a whole frame can
be scanned for **multiple codes** at once or restricted to a **region of interest**.

The scanner runs the **entire pipeline in one Rust/WebAssembly call**
(`crates/code-scan`, `scan_and_decode`): it binarises the image, locates the code (QR finder patterns / the Data Matrix
"L" finder / the Aztec bullseye / linear scan-line runs), samples its module grid, **and decodes it** — the located
modules never cross back into JS to be decoded. It does this by linking each format's decoder crate directly:

| Format               | Decoder crate                         |
| -------------------- | ------------------------------------- |
| QR                   | `mission-platform-qr-code-decode`     |
| Data Matrix          | `mission-platform-matrix-code-decode` |
| Aztec (compact)      | `mission-platform-matrix-code-decode` |
| 1D barcode           | `mission-platform-barcode-decode`     |
| PDF417               | `mission-platform-pdf417-decode`      |
| GS1 DataBar (RSS-14) | `mission-platform-gs1-databar-decode` |
| MaxiCode             | `mission-platform-maxicode-decode`    |

Those crates still ship their own standalone wasm for `@mission-platform/qr-code`
/ `-/matrix-code` / `-/barcode`; the scanner just links their dependency-free decode cores instead of calling their wasm
at runtime.

## Programmatic API

```ts
import { scanImageData, scanFile, type ScanResult } from '@mission-platform/code-scanner';

// From a canvas `ImageData` (synchronous; the wasm self-initialises):
const result: ScanResult | null = scanImageData(imageData);
// => { format: 'qr', value: 'https://mission-platform.dev' }

// From a File / Blob (decodes the image for you):
const fromFile = await scanFile(fileInput.files[0]);
```

`ScanResult.value` is `null` when a symbol is located and sampled but its payload can't be decoded (e.g. a capture too
degraded for the symbol's error correction to recover).

### Initialisation

No setup is required: the `@mission-platform/code-scan-wasm` package inlines the wasm as a base64 `data:` URI and
instantiates it eagerly at import, so `scanImageData` / `scanFile` (and their `scanImageDataAsync` / `scanFileAsync`
async counterparts) work synchronously with no initialisation step.

### Region of interest and multiple codes

```ts
import { scanImageData, scanImageDataAll, type Roi } from '@mission-platform/code-scanner';

// Restrict the scan to a reticle rectangle (cropped in wasm before binarisation,
// so surrounding clutter is ignored):
const roi: Roi = { x: 120, y: 80, width: 240, height: 240 };
const hit = scanImageData(imageData, roi);

// Decode every distinct code in one frame (deduplicated, in discovery order):
const results = scanImageDataAll(imageData);
// => [{ format: 'qr', value: '…' }, { format: 'barcode', value: '…' }]
```

## Component

The `CodeScanner` component provides a file-upload button and a live-camera viewport, emitting each detection through
`onResult`.

```tsx
// React
import { CodeScanner } from '@mission-platform/code-scanner/react';

<CodeScanner onResult={(result) => console.log(result.value)} />;
```

```ts
// Vue 3
import { CodeScanner } from '@mission-platform/code-scanner/vue';
```

### Props

| Prop             | Type                           | Default         | Description                                            |
| ---------------- | ------------------------------ | --------------- | ------------------------------------------------------ |
| `facingMode`     | `'environment' \| 'user'`      | `'environment'` | Which camera to prefer for the live stream.            |
| `scanIntervalMs` | `number`                       | `300`           | Milliseconds between live-camera frame scans.          |
| `showFileUpload` | `boolean`                      | `true`          | Show the "upload image" control.                       |
| `showCamera`     | `boolean`                      | `true`          | Show the "scan with camera" control.                   |
| `stopOnDecode`   | `boolean`                      | `true`          | Stop the camera once a payload is decoded.             |
| `onResult`       | `(result: ScanResult) => void` | —               | Fired with each successful detection.                  |
| `onError`        | `(error: Error) => void`       | —               | Fired when reading a file / frame or the camera fails. |

> The live-camera path uses `getUserMedia`, so it needs a secure context
> (HTTPS or `localhost`) and camera permission.

## Building

The wasm is generated by `wasm-pack` (wired into the Turbo `build:wasm:scan`
task) and emitted under `src/generated/scan`. Build the whole package with:

```sh
pnpm exec turbo run build --filter @mission-platform/code-scanner
```

## Scope & limitations

- Detection is tuned for clean, reasonably framed captures (file uploads and camera frames). The QR locator is
  rotation-tolerant (it derives an affine grid from the three finder centres). The **Data Matrix** locator reads at any
  rotation (a corner-based affine locator, plus a straighten-and-retry fallback that recovers the angle and re-samples
  upright) and tolerates mild shear. **1D barcodes** are likewise straightened before sampling, so tilted captures still
  read. The **Aztec** locator finds the central bullseye but samples an axis-aligned grid, so it expects an upright
  symbol.
- 1D barcodes are located **and decoded** end-to-end (Code 128, Code 39, EAN-13/8, UPC-A, ITF, Codabar, …). UPC-A shares
  its module run with a leading-zero EAN-13; the scanner resolves this by the number-system digit, so a UPC-A symbol is
  reported as its **12-digit UPC-A** value rather than its EAN-13 alias (see `docs/accuracy-improvement-plan.md`).
- **PDF417**, **GS1 DataBar (RSS-14)** and **MaxiCode** are located and decoded upright: they read at 0° (PDF417 also at
  180°). Rotated captures for these three are a documented follow-up (see `docs/accuracy-improvement-plan.md`).
  Read-rate for every symbology is measured against the vendored ZXING corpus by the native
  `crates/code-scan/tests/blackbox.rs` harness; the per-stage model tiering used to build them is captured in
  `docs/model-cost-strategy.md`.
