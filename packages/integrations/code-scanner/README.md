# @mission-platform/code-scanner

A dependency-free **image / camera code scanner** compiled as a Forge Web Script graph with WebAssembly SIMD support. It locates and decodes
Data Matrix symbols, compact Aztec codes, 1D/RSS readers, PDF417, and MaxiCode from either a decoded image or a live camera stream,
and ships a write-once component available for React, Vue 3, Solid, Svelte, and Web Components. QR decoder sources are retained as a
standalone graph while combined QR emission is blocked by a Forge Web Script emitter limitation; they are not advertised as linked runtime coverage.

The scanner runs the **entire pipeline in one statically linked FWS/WebAssembly call**
(`src/fws/scanner.fws`, `scan_and_decode`): it binarises the image, locates the code (the Data Matrix
"L" finder / the Aztec bullseye / linear scan-line runs), samples its module grid, **and decodes it** — the located
modules never cross back into JS to be decoded. It does this by linking each format's decoder graph directly:

| Format             | Linked FWS library                           |
| ------------------ | -------------------------------------------- |
| Data Matrix        | `packages/integrations/code-scanner/src/fws` |
| Aztec (compact)    | `packages/integrations/code-scanner/src/fws` |
| 1D and RSS readers | `packages/integrations/code-scanner/src/fws` |
| PDF417             | `packages/integrations/code-scanner/src/fws` |
| RSS-14             | `packages/integrations/code-scanner/src/fws` |
| MaxiCode           | `packages/integrations/code-scanner/src/fws` |

The scanner links the decoder FWS sources at build time, so decoder package runtime imports do not cross the neutral
artifact boundary.

## Programmatic API

```ts
import { scanImageData, scanFile, type ScanResult } from '@mission-platform/code-scanner';

// From a canvas `ImageData` (synchronous; the FWS artifact self-initialises):
const result: ScanResult | null = scanImageData(imageData, {
  formats: ['DATA_MATRIX', 'CODE_128'],
  tryHarder: true,
  alsoInverted: true,
});
// => { format: 'DATA_MATRIX', text: 'HELLO', rawBytes: Uint8Array(...), ... }

// From a File / Blob (decodes the image for you):
const fromFile = await scanFile(fileInput.files[0]);
```

`ScanResult.text` is `null` when a symbol is located and sampled but its payload can't be decoded. `rawBytes`, `numBits`,
`points`, `metadata`, and `timestamp` are always present in the result model; fields unavailable for a reduced reader are
represented by an empty byte value, zero, or an empty collection.

### Initialisation

No setup is required: the neutral package loads its statically linked FWS artifact on demand. `scanImageData` /
`scanFile` (and their `scanImageDataAsync` / `scanFileAsync` async counterparts) retain their synchronous and lazy
initialisation behavior.

### Region of interest and multiple codes

```ts
import { scanImageData, scanImageDataAll, type Roi, type ScanOptions } from '@mission-platform/code-scanner';

// Restrict the scan to a reticle rectangle (cropped before binarisation,
// so surrounding clutter is ignored):
const roi: Roi = { x: 120, y: 80, width: 240, height: 240 };
const options: ScanOptions = { roi, formats: ['DATA_MATRIX'] };
const hit = scanImageData(imageData, options);

// Decode every distinct code in one frame (deduplicated, in discovery order):
const results = scanImageDataAll(imageData);
// => [{ format: 'DATA_MATRIX', text: '…', ... }, { format: 'CODE_128', text: '…', ... }]
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

<CodeScanner onResult={(result) => console.log(result.text, result.format)} />;
```

### Props

| Prop             | Type                           | Default         | Description                                            |
| ---------------- | ------------------------------ | --------------- | ------------------------------------------------------ |
| `facingMode`     | `'environment' \| 'user'`      | `'environment'` | Which camera to prefer for the live stream.            |
| `scanIntervalMs` | `number`                       | `300`           | Milliseconds between live-camera frame scans.          |
| `showFileUpload` | `boolean`                      | `true`          | Show the "upload image" control.                       |
| `showCamera`     | `boolean`                      | `true`          | Show the "scan with camera" control.                   |
| `stopOnDecode`   | `boolean`                      | `true`          | Stop the camera once a payload is decoded.             |
| `formats`        | `readonly ScanFormat[]`        | all             | Restrict reader dispatch to selected formats.          |
| `tryHarder`      | `boolean`                      | `true`          | Enable adaptive binarization and additional retries.   |
| `alsoInverted`   | `boolean`                      | `true`          | Retry with inverted luminance.                         |
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

- Detection is tuned for clean, reasonably framed captures (file uploads and camera frames). The **Data Matrix** locator reads at any
  rotation (a corner-based affine locator, plus a straighten-and-retry fallback that recovers the angle and re-samples
  upright) and tolerates mild shear. **1D barcodes** are likewise straightened before sampling, so tilted captures still
  read. The **Aztec** locator finds the central bullseye but samples an axis-aligned grid, so it expects an upright
  symbol.
- 1D barcodes are located **and decoded** end-to-end (Code 128, Code 39, EAN-13/8, UPC-A, ITF, Codabar, …). UPC-A shares
  its module run with a leading-zero EAN-13; the scanner resolves this by the number-system digit, so a UPC-A symbol is
  reported as its **12-digit UPC-A** value rather than its EAN-13 alias (see `docs/accuracy-improvement-plan.md`).
- **PDF417**, **RSS-14/RSS Expanded**, and **MaxiCode** are bounded reduced readers: clean upright fixtures are covered,
  while full ZXing correction, rotation, and metadata parity remain outstanding.
- Data Matrix currently covers the implemented ASCII subset; compact Aztec currently covers the implemented binary subset.
- QR decoder graphs emit independently, but combined scanner linkage currently fails Forge Web Script `FWS-EMIT-001` and is
  intentionally not included in the linked artifact. The linked result envelope is currently a bounded compatibility string;
  points, metadata, and binary-result preservation remain follow-up work tracked in `docs/accuracy-improvement-plan.md`.
