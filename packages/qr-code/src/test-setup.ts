// Shared Vitest setup: instantiate the QR WebAssembly modules once before any
// test runs. Under Vitest the compiled wasm is served as a URL rather than
// inlined as a `data:` URI (the production build inlines it via Vite), so the
// synchronous `encodeQr`/`decodeQr` can't self-initialise — we load the encoder
// and decoder binaries from disk here instead. `process.cwd()` is the package
// root when Vitest runs.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { initQrSync } from './index';

initQrSync(
  readFileSync(resolve(process.cwd(), 'src/generated/encode/qr-code-encode_bg.wasm')),
  readFileSync(resolve(process.cwd(), 'src/generated/decode/qr-code-decode_bg.wasm')),
);
