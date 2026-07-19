# @mission-platform/barcode

A dependency-free **1D (linear) barcode encoder** written in
[Rust](https://www.rust-lang.org/) and compiled to **WebAssembly**, exposed
through a small, fully typed ES module wrapper.

It renders a symbology + payload into a flat run of **module bits** (`1` = bar,
`0` = space), one entry per unit-width module (no quiet zone) — ready to draw as
an SVG or canvas. It also **decodes** a clean module run of any supported
symbology back into its payload (see `decodeBarcode`). Supported symbologies:

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

`encodeBarcode` instantiates the wasm binary **synchronously** on first use, so
it is safe to call from render paths. In a bundled build the wasm is inlined as
a base64 `data:` URI, so the module is self-contained and needs no runtime
`fetch`. An async variant, `encodeBarcodeAsync`, is also exported.

In environments where the binary is **not** inlined (e.g. a test runner or
unbundled Node), instantiate the module yourself before the synchronous calls —
`await initBarcode()` (fetches/loads the default binary) or `initBarcodeSync(bytes)`
(instantiates from raw bytes / a `WebAssembly.Module`) — or simply use
`encodeBarcodeAsync`, which initialises on demand.

`encodeBarcode` throws a `RangeError` when the payload is invalid for the chosen
symbology (bad characters, wrong length, or a failing check digit).

### Decoding

`decodeBarcode(symbology, modules)` is the inverse: it takes a clean module run
(as produced by `encodeBarcode`) and recovers the payload, returning `null` when
the run is not a valid symbol of that symbology. The recovered value is the
symbology's canonical form (recomputed check digits, upper-cased Code 39/93
text, and the `system + digits + check` form for UPC-E). An `initBarcodeDecode` /
`initBarcodeDecodeSync` pair and an async `decodeBarcodeAsync` mirror the encoder.

```ts
import { decodeBarcode, encodeBarcode } from '@mission-platform/barcode';

const { modules } = encodeBarcode('code93', 'MISSION 93');
const text = decodeBarcode('code93', modules); // -> 'MISSION 93'
```

## Architecture

- `crates/barcode/` (workspace top level) — the Rust crate, built with
  **`wasm-bindgen`**, split into focused modules:
  - `lib.rs` — the `wasm-bindgen` surface (`encode` / `build_info`) and the
    symbology dispatch.
  - `code128.rs`, `code39.rs`, `code93.rs`, `ean.rs`, `itf.rs`, `codabar.rs`,
    `msi.rs`, `pharmacode.rs` — one module per symbology family (patterns, check
    digits, framing). The sibling `crates/barcode-decode` crate mirrors these to
    recover payloads, sharing tables via `crates/barcode-common`.
- `src/generated/` — emitted by **`wasm-pack build --target web`** (the
  `wasm-bindgen` JS runtime, the `barcode_bg.wasm` binary, and its typings).
  Produced by the **`build:wasm` Turbo task**, whose command invokes `wasm-pack`
  directly via Turborepo's `experimentalTaskCommand` (no wrapper script). The
  directory is a build artifact and is git-ignored.
- `src/encoder/` — the typed façade: it imports the generated runtime and the
  wasm binary (via Vite's `?url`, inlined as base64 at build time), instantiates
  it, and turns the module-bit buffer into a `Barcode`.
- `src/index.ts` — the package entry, re-exporting the encoder API. The
  per-feature `component/` sibling (a write-once `BaseBarcode`) is added in a
  follow-up and re-exported here when present.
- `vite.config.ts` — raises `assetsInlineLimit` so the wasm is inlined as a
  `data:` URI (keeping the encoder synchronous and the bundle self-contained),
  and neutralises the generated glue's dead `new URL(...)` init fallback so the
  binary is embedded exactly once.

## Building

The Rust → wasm step is driven by Turbo (it runs before the type-check, bundle
and declaration steps):

```sh
pnpm exec turbo run build --filter @mission-platform/barcode
```

Prerequisites: a Rust toolchain (the `wasm32-unknown-unknown` target is added
automatically by `wasm-pack`) and `wasm-pack` itself:

```sh
cargo install wasm-pack
```
