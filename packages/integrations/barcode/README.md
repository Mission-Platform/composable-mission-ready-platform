# @mission-platform/barcode

A dependency-free **1D (linear) barcode encoder and decoder** backed by
package-local Forge Web Script graphs and typed direct loaders.

It renders a symbology + payload into a flat run of **module bits** (`1` = bar,
`0` = space), one entry per unit-width module (no quiet zone) — ready to draw as an SVG or canvas. It also **decodes** a
clean module run of any supported symbology back into its payload (see `decodeBarcode`). Supported symbologies:

| Symbology    | Notes                                                                              |
| ------------ | ---------------------------------------------------------------------------------- |
| `code128`    | High density. Code B for printable ASCII; Code C fast path for even-length digits. |
| `gs1-128`    | Code 128 with a leading FNC1 (a stream of GS1 Application Identifiers).            |
| `code39`     | Alphanumeric, self-checking; auto-framed with the `*` start/stop.                  |
| `code39ext`  | Full-ASCII Code 39 via the four shift characters.                                  |
| `code93`     | Compact, self-checking (two check characters).                                     |
| `code93ext`  | Full-ASCII Code 93 via the four shift characters.                                  |
| `ean13`      | 12 digits (check appended) or 13 (check verified). 95 modules.                     |
| `ean8`       | 7 digits (check appended) or 8 (check verified). 67 modules.                       |
| `upca`       | 11 digits (check appended) or 12 (check verified). 95 modules.                     |
| `upce`       | Zero-suppressed UPC; 6 digits, or a 7/8-digit `system + digits [+ check]` form.    |
| `itf`        | Interleaved 2 of 5; even digit count required.                                     |
| `itf14`      | Fixed 14-digit GTIN-14 (13 digits + computed check, or 14 with verified check).    |
| `codabar`    | Digits plus `-$:/.+`; auto-framed with an `A` start/stop.                          |
| `msi`        | MSI / Modified Plessey; digits with an appended mod-10 check.                      |
| `pharmacode` | Laetus pharmaceutical binary code (`3`–`131070`).                                  |

## Usage

```ts
import { encodeBarcode } from '@mission-platform/barcode';

const barcode = encodeBarcode('ean13', '5901234123457');
// barcode.symbology -> 'ean13'
// barcode.width     -> total module count (e.g. 95)
// barcode.modules   -> number[]; 1 = bar, 0 = space

// Render as an SVG (one <rect> per bar run, or a single path):
const height = 60;
const rects = barcode.modules
  .map((bit, x) => (bit ? `<rect x="${x}" y="0" width="1" height="${height}"/>` : ''))
  .join('');
const svg = `<svg viewBox="0 0 ${barcode.width} ${height}">${rects}</svg>`;
```

`encodeBarcode` paths load their embedded FWS artifacts synchronously and need no runtime `fetch`; an async variant,
`encodeBarcodeAsync`, is also exported.

`encodeBarcode` throws a `RangeError` when the payload is invalid for the chosen symbology (bad characters, wrong
length, or a failing check digit).

### Decoding

`decodeBarcode(symbology, modules)` is the inverse: it takes a clean module run (as produced by `encodeBarcode`) and
recovers the payload, returning `null` when the run is not a valid symbol of that symbology. All supported decoder
families use direct FWS graphs, including EAN/UPC, Code 39/93, Codabar, ITF, MSI, Pharmacode, and Code 128/GS1-128. The recovered value is the symbology's canonical form (recomputed
check digits, upper-cased Code 39/93 text, and the `system + digits + check` form for UPC-E). An async
`decodeBarcodeAsync` mirrors the encoder.

```ts
import { decodeBarcode, encodeBarcode } from '@mission-platform/barcode';

const { modules } = encodeBarcode('code93', 'MISSION 93');
const text = decodeBarcode('code93', modules); // -> 'MISSION 93'
```

## Architecture

- `src/fws/` — package-local Forge Web Script graphs, handwritten ABI
  declarations, and focused parity fixtures. The graphs cover the native 1D
  encoder and decoder families listed above and expose generated `load` and
  `loadSync` loaders.
- `src/encoder/` and `src/decoder/` — typed façades that convert between the
  direct FWS string ABI and the public module-bit contracts. Generated loaders
  own linear-memory allocation and result cleanup.
- `src/index.ts` — the package entry, re-exporting direct FWS codec APIs and
  framework component entrypoints.
- The barcode implementation is package-local and does not depend on a
  generated WebAssembly wrapper package.

## Building

The package build embeds the package-local FWS graphs before the type-check,
bundle, and declaration steps:

```sh
pnpm exec turbo run build --filter @mission-platform/barcode
```

The normal workspace installation provides the Forge Web Script compiler and
runtime packages:

```sh
pnpm install
```
