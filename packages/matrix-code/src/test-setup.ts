// Shared Vitest setup: instantiate the matrix-code WebAssembly modules once
// before any test runs. Under Vitest the compiled wasm is served as a URL
// rather than inlined as a `data:` URI (the production build inlines it via
// Vite), so the synchronous `encodeMatrix`/`decodeMatrix` can't self-initialise
// — we load the encoder and decoder binaries from disk here instead.
// `process.cwd()` is the package root when Vitest runs.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { initMatrixDecodeSync, initMatrixSync } from './index';

initMatrixSync(readFileSync(resolve(process.cwd(), 'src/generated/encode/matrix-code-encode_bg.wasm')));
initMatrixDecodeSync(readFileSync(resolve(process.cwd(), 'src/generated/decode/matrix-code-decode_bg.wasm')));
