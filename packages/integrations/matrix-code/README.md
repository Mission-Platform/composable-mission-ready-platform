# @mission-platform/matrix-code

Dependency-free **2D matrix barcode encoder** backed by package-local Forge Web
Script artifacts and wrapped in a typed ES module. Supports **Data
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

To decode captured images or camera frames, use the scanner APIs from
`@mission-platform/code-scanner`.

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
> an unambiguous 11-bit length extension within the package's supported encoder.

## Architecture

- `src/fws/` contains the package-local Forge Web Script encoder graphs,
  handwritten ABI declarations, and focused parity fixtures.
- `src/encoder/` is the typed façade around the direct FWS loaders. It preserves
  the public matrix-bit contract and exposes synchronous and asynchronous APIs.
- The package-local artifacts are the complete production implementation; the
  package does not depend on a generated WebAssembly wrapper package.

## Building

```sh
pnpm exec turbo run build --filter @mission-platform/matrix-code
```

The normal workspace installation provides the Forge Web Script compiler and
runtime packages used to build the package-local artifacts.
