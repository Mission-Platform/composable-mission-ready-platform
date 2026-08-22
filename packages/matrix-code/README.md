# @mission-platform/matrix-code

Dependency-free **2D matrix barcode encoder and decoder** backed by package-local
Forge Web Script artifacts and wrapped in a typed ES module. Supports **Data
Matrix** (ECC 200, square and rectangular), **GS1 Data Matrix** (the same symbol
with a leading FNC1), and **Aztec Code** (compact).

## Usage

```ts
import { encodeMatrix } from '@mission-platform/matrix-code';

const code = encodeMatrix('datamatrix', 'https://mission-platform.dev');
// code.width   -> symbol width in modules (e.g. 20)
// code.height  -> symbol height in modules (equal to width for square symbologies)
// code.modules -> width * height row-major bits (1 = dark, 0 = light)
```

The encoder is **synchronous** and **self-contained**: its package-local FWS
artifact is loaded without a runtime `fetch`, so `encodeMatrix` works during SSR
and in tests with no initialisation step. An async `encodeMatrixAsync` is also
exported.

Decode a symbol back into its payload with `decodeMatrix` (the inverse of
`encodeMatrix`):

```ts
import { decodeMatrix, encodeMatrix } from '@mission-platform/matrix-code';

const code = encodeMatrix('datamatrix', 'https://mission-platform.dev');
const text = decodeMatrix(code); // 'https://mission-platform.dev', or null if unrecoverable
```

Reed-Solomon error correction repairs a limited number of flipped modules, so a lightly damaged symbol still decodes.
Like the encoder, the decoder is **synchronous** and **self-contained** with no initialisation step; an async
`decodeMatrixAsync` is also exported.

## Supported symbologies

| Symbology               | Notes                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `datamatrix`            | Data Matrix ECC 200, single-data-region square symbols (10×10 … 26×26).                 |
| `gs1datamatrix`         | The same, with a leading FNC1 codeword marking a GS1 Application Identifier stream.     |
| `datamatrixrectangular` | Rectangular Data Matrix ECC 200 (8×18 … 16×48), including the two-region wide sizes.    |
| `aztec`                 | Aztec Code, compact symbols (1–4 layers, 15×15 … 27×27) with a central bullseye finder. |

The square symbologies report `width === height`; the rectangular Data Matrix symbols do not. Payloads too large for the
supported symbols (more than 44 data codewords for square Data Matrix, or beyond a 4-layer compact Aztec) are out of
scope for this encoder and throw a `RangeError`.

> **Note on Aztec:** payloads of up to 31 bytes use the standard Binary-Shift
> high-level encoding (byte-compatible with common readers); longer payloads use
> an unambiguous 11-bit length extension, so the full encode/decode round-trip is
> guaranteed within this package.

## Architecture

- `src/fws/` contains the package-local Forge Web Script graphs, handwritten ABI
  declarations, and focused parity fixtures for the encoder and decoder.
- `src/encoder/` and `src/decoder/` are typed façades around the direct FWS
  loaders. They preserve the public matrix-bit contracts and expose synchronous
  and asynchronous APIs.
- The package-local artifacts are the complete production implementation; the
  package does not depend on a generated WebAssembly wrapper package.

## Building

```sh
pnpm exec turbo run build --filter @mission-platform/matrix-code
```

The normal workspace installation provides the Forge Web Script compiler and
runtime packages used to build the package-local artifacts.
