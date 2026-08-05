# @mission-platform/qr-code

A dependency-free **QR Code encoder _and_ decoder** written in
[Rust](https://www.rust-lang.org/) and compiled to **WebAssembly**, exposed through a small, fully typed ES module
wrapper.

The **encoder** supports byte mode (which can represent any text/URL), automatic version selection and lowest-penalty
data-mask selection per the QR specification (ISO/IEC 18004). It is a port of Project Nayuki's public-domain reference
QR Code generator.

The **decoder** recovers the payload from a module matrix: it reads the format info (ECC level + data mask), unmasks the
data region, walks the codewords in the encoder's zig-zag order, de-interleaves the Reed-Solomon blocks and corrects
errors up to the level's capacity (a full Berlekamp-Massey / Chien / Forney corrector), then parses the byte-mode
segment.

## Usage

```ts
import { encodeQr, decodeQr } from '@mission-platform/qr-code';

const matrix = encodeQr('https://mission-platform.dev', 'M');
// matrix.size    -> side length in modules (e.g. 25)
// matrix.version -> selected QR version (1–40)
// matrix.modules -> boolean[][]; modules[y][x] === true when dark

const text = decodeQr(matrix); // 'https://mission-platform.dev', or null
```

`encodeQr` / `decodeQr` instantiate the wasm binary **synchronously** on first use, so they are safe to call from render
paths. In a bundled build the wasm is inlined as a base64 `data:` URI, so the module is self-contained and needs no
runtime `fetch`. Async variants, `encodeQrAsync` / `decodeQrAsync`, are also exported.

`encodeQr` throws a `RangeError` when the payload is too long to fit the largest (version 40) QR Code at the chosen
error-correction level. `decodeQr` returns
`null` when the matrix cannot be decoded.

## Content formats

A QR Code is just an opaque string; the _meaning_ comes from well-known text conventions that scanning apps recognise.
The `formats` namespace builds those strings from typed inputs (handling the escaping and field-ordering rules) so you
can feed the result straight into `encodeQr`:

```ts
import { encodeQr, formats } from '@mission-platform/qr-code';

encodeQr(formats.wifi({ ssid: 'Cafe', password: 'latte123', encryption: 'WPA' }));
encodeQr(formats.url('https://mission-platform.dev'));
encodeQr(formats.email({ to: 'hi@example.com', subject: 'Hi', body: 'Hello!' }));
encodeQr(formats.sms({ number: '+14155550123', message: 'Hi' }));
encodeQr(formats.phone('+14155550123'));
encodeQr(formats.geo({ latitude: 37.422, longitude: -122.084 }));
encodeQr(formats.vCard({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' }));
encodeQr(formats.meCard({ firstName: 'Ada', lastName: 'Lovelace', phone: '+14155550123' }));
encodeQr(formats.iCalEvent({ title: 'Launch', start: new Date('2026-07-14T09:00:00Z') }));
```

Available builders: `url`, `wifi`, `email`, `sms`, `phone`, `geo`, `vCard`,
`meCard`, and `iCalEvent`. Each returns a plain `string` and touches no wasm, so they are cheap and synchronous.

## Architecture

- `crates/qr-code/` (workspace top level) — the Rust crate, built with **`wasm-bindgen`**, split into focused modules:
  - `lib.rs` — the `wasm-bindgen` surface (`encode` / `decode` / `build_info`).
  - `tables.rs` — version/capacity tables and sizing helpers.
  - `gf.rs` — GF (256) Reed-Solomon: encode-parity multiply/divisor/remainder plus the error corrector used on decode.
  - `builder.rs` — the matrix builder + data-mask selection (shared with the decoder's data-module traversal).
  - `encode.rs` / `decode.rs` — the encode and decode entry points.
- `src/generated/` — emitted by **`wasm-pack build --target web`** (the
  `wasm-bindgen` JS runtime, the `qr-code_bg.wasm` binary, and its typings). This is produced by the **`build:wasm`
  Turbo task**, whose command invokes
  `wasm-pack` directly via Turborepo's `experimentalTaskCommand` (no wrapper script). The directory is a build artifact
  and is git-ignored.
- `src/index.ts` — the typed façade: it imports the generated runtime and the wasm binary (via Vite's `?url`, inlined as
  base64 at build time), instantiates it, and unpacks the output into a `QrMatrix`.
- `vite.config.ts` — raises `assetsInlineLimit` so the wasm is inlined as a
  `data:` URI (keeping the encoder synchronous and the bundle self-contained), and strips the generated glue's dead
  `new URL(...)` init fallback so the binary is embedded exactly once.

## Building

The Rust → wasm step is driven by Turbo (it runs before the type-check, bundle and declaration steps):

```sh
pnpm exec turbo run build --filter @mission-platform/qr-code
```

Prerequisites: a Rust toolchain (the `wasm32-unknown-unknown` target is added automatically by `wasm-pack`) and
`wasm-pack` itself:

```sh
cargo install wasm-pack
```
