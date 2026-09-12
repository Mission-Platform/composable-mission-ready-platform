# @mission-platform/qr-code

A dependency-free **QR Code encoder** backed by a package-local Forge Web Script
artifact and exposed through a small, fully typed ES module wrapper.

The **encoder** supports byte mode (which can represent any text/URL), automatic version selection and lowest-penalty
data-mask selection per the QR specification (ISO/IEC 18004). It is a port of Project Nayuki's public-domain reference
QR Code generator.

## Usage

```ts
import { encodeQr } from '@mission-platform/qr-code';

const matrix = encodeQr('https://mission-platform.dev', 'M');
// matrix.size    -> side length in modules (e.g. 25)
// matrix.version -> selected QR version (1–40)
// matrix.modules -> boolean[][]; modules[y][x] === true when dark
```

`encodeQr` loads its package-local FWS graph **synchronously** on first use, so it
is safe to call from render paths. The async variant, `encodeQrAsync`, is also
exported and uses the asynchronous graph loader.

`encodeQr` throws a `RangeError` when the payload is too long to fit the largest
(version 40) QR Code at the chosen error-correction level.

To decode captured images or camera frames, use the scanner APIs from
`@mission-platform/code-scanner`.

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
- `src/encoder` — the typed façade that loads the encoder graphs lazily through
  `loadSync()` or `load()` and normalizes their compact packed ABI.
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
