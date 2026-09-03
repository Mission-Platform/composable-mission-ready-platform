# @mission-platform/code-scanner

A dependency-free **image / camera code scanner** compiled as a Forge Web Script graph with WebAssembly SIMD support. It locates and decodes
**QR codes**, **Data Matrix** symbols, **compact Aztec** codes, **1D barcodes**, **PDF417**, **GS1 DataBar** (RSS-14)
and **MaxiCode** from either a decoded image (a file upload) or a live camera stream, and ships a write-once component
available for both **React** and **Vue 3**. Data Matrix and 1D barcodes read at **any rotation**, and a whole frame can
be scanned for **multiple codes** at once or restricted to a **region of interest**.

The scanner runs the **entire pipeline in one statically linked FWS/WebAssembly call**
(`src/fws/scanner.fws`, `scan_and_decode`): it binarises the image, locates the code (QR finder patterns / the Data Matrix
"L" finder / the Aztec bullseye / linear scan-line runs), samples its module grid, **and decodes it** — the located
modules never cross back into JS to be decoded. It does this by linking each format's decoder graph directly:

| Format               | Linked FWS library                           |
| -------------------- | -------------------------------------------- |
| QR                   | `packages/integrations/qr-code/src/fws`      |
| Data Matrix          | `packages/integrations/matrix-code/src/fws`  |
| Aztec (compact)      | `packages/integrations/matrix-code/src/fws`  |
| 1D barcode           | `packages/integrations/barcode/src/fws`      |
| PDF417               | `packages/integrations/code-scanner/src/fws` |
| GS1 DataBar (RSS-14) | `packages/integrations/code-scanner/src/fws` |
| MaxiCode             | `packages/integrations/code-scanner/src/fws` |

The scanner links the decoder FWS sources at build time, so decoder package runtime imports do not cross the neutral
artifact boundary.

## Programmatic API

```ts
import { scanImageData, scanFile, type ScanResult } from '@mission-platform/code-scanner';

// From a canvas `ImageData` (synchronous; the FWS artifact self-initialises):
const result: ScanResult | null = scanImageData(imageData);
// => { format: 'qr', value: 'https://mission-platform.dev' }

// From a File / Blob (decodes the image for you):
const fromFile = await scanFile(fileInput.files[0]);
```

`ScanResult.value` is `null` when a symbol is located and sampled but its payload can't be decoded (e.g. a capture too
degraded for the symbol's error correction to recover).

### Initialisation

No setup is required: the neutral package loads its statically linked FWS artifact on demand. `scanImageData` /
`scanFile` (and their `scanImageDataAsync` / `scanFileAsync` async counterparts) retain their synchronous and lazy
initialisation behavior.

### Region of interest and multiple codes

```ts
import { scanImageData, scanImageDataAll, type Roi } from '@mission-platform/code-scanner';

// Restrict the scan to a reticle rectangle (cropped before binarisation,
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

It is reached through the bare `@mission-platform/code-scanner` specifier. Which framework build you get is decided by
the active `mp:<framework>` export condition, selected **once** for the project via
`resolve.conditions` (see `defineFrameworkAppConfig` / `frameworkResolveConditions` from
`@mission-platform/vite-config`) and `customConditions` (via the
`@mission-platform/typescript-config/framework-<name>` presets):

```tsx
// React (mp:react) — identical in Vue 3 (mp:vue), Solid and Web Components.
import { CodeScanner } from '@mission-platform/code-scanner';

<CodeScanner onResult={(result) => console.log(result.value)} />;
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

The scanner artifact is compiled by the Forge Web Script Vite plugin. The static profile enables SIMD and aggressive
link-time optimization; the dynamic profile preserves explicit decoder module boundaries with cached dispatch. Build
the whole package with:

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
  Read-rate for every symbology is covered by the FWS graph and façade conformance suites; the per-stage model tiering
  used to build them is captured in `docs/model-cost-strategy.md`.
