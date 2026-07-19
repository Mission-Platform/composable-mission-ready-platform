// Shared Vitest setup: instantiate the scanner WebAssembly module once before
// any test runs. Under Vitest the compiled wasm is served as a URL rather than
// inlined as a `data:` URI (the production build inlines it via Vite), so the
// synchronous `scanImageData` can't self-initialise — we load the binary from
// disk here instead. The scanner wasm now links the QR, Data Matrix and 1D
// barcode decoders directly (decode runs inside `scan_and_decode`), so this is
// the only module the tests need to initialise. `process.cwd()` is the package
// root when Vitest runs.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { initCodeScannerSync } from './index';

initCodeScannerSync(readFileSync(resolve(process.cwd(), 'src/generated/scan/code-scan_bg.wasm')));
