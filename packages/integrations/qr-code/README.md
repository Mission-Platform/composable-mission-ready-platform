# @mission-platform/qr-code

A dependency-free **QR Code encoder _and_ decoder** backed by package-local
Forge Web Script artifacts and exposed through a small, fully typed ES module
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

`encodeQr` / `decodeQr` load their package-local FWS graphs **synchronously** on
first use, so they are safe to call from render paths. Async variants,
`encodeQrAsync` / `decodeQrAsync`, are also exported and use the corresponding
asynchronous graph loaders.

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
`meCard`, and `iCalEvent`. Each returns a plain `string` and touches no FWS
graph, so they are cheap and synchronous.

## Architecture

- `src/fws/qr-encoder.fws` — the standard QR byte-mode encoder graph.
- `src/fws/qr-compact-encoder.fws` — the Micro QR and rMQR encoder graph.
- `src/fws/qr-decoder.fws` — the packed square-matrix decoder graph.
- `src/encoder` and `src/decoder` — typed façades that load the graphs lazily
  through `loadSync()` or `load()` and normalize their compact packed ABI.
- `crates/qr-code-*` — retained Rust algorithm crates used by `code-scan` and
  native scanner tests; they are not runtime dependencies of this package.

## Building

The FWS graphs are compiled by the package build through the Forge Web Script
Vite plugin:

```sh
pnpm exec turbo run build --filter @mission-platform/qr-code
```

For scanner development, the retained Rust crates additionally require a Rust
toolchain and the workspace's normal Cargo prerequisites:

```sh
pnpm install
```
