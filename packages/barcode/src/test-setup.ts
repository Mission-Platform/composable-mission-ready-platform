// Shared Vitest setup: instantiate the barcode WebAssembly modules once before
// any test runs. Under Vitest the compiled wasm is served as a URL rather than
// inlined as a `data:` URI (the production build inlines it via Vite), so the
// synchronous `encodeBarcode`/`decodeBarcode` can't self-initialise — we load
// the encoder and decoder binaries from disk here instead. `process.cwd()` is
// the package root when Vitest runs.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { initBarcodeDecodeSync, initBarcodeSync } from '.';

initBarcodeSync(readFileSync(resolve(process.cwd(), 'src/generated/encode/barcode-encode_bg.wasm')));
initBarcodeDecodeSync(readFileSync(resolve(process.cwd(), 'src/generated/decode/barcode-decode_bg.wasm')));
