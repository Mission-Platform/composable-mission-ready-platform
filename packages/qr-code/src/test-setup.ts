// The QR Code encoder/decoder wasm modules inline their binaries and instantiate
// them synchronously at import (see `@mission-platform/qr-code-{encode,decode}-wasm`),
// so simply importing them here guarantees they are ready before any spec runs.
import '@mission-platform/qr-code-encode-wasm';
import '@mission-platform/qr-code-decode-wasm';
