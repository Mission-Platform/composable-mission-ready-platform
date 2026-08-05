// The barcode encoder/decoder wasm modules inline their binaries and instantiate
// them synchronously at import (see `@mission-platform/barcode-{encode,decode}-wasm`),
// so simply importing them here guarantees they are ready before any spec runs.
import '@mission-platform/barcode-encode-wasm';
import '@mission-platform/barcode-decode-wasm';
