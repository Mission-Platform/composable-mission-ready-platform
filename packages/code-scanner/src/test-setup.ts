// The scanner wasm module inlines its binary and instantiates it synchronously
// at import (see `@mission-platform/code-scan-wasm`), so simply importing it here
// guarantees it is ready before any spec runs. The scanner wasm links the QR,
// Data Matrix and 1D barcode decoders directly (decode runs inside
// `scan_and_decode`), so this is the only module the tests need.
import '@mission-platform/code-scan-wasm';
