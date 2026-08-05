// The matrix-code encoder/decoder wasm modules inline their binaries and
// instantiate them synchronously at import (see
// `@mission-platform/matrix-code-{encode,decode}-wasm`), so simply importing
// them here guarantees they are ready before any spec runs.
import '@mission-platform/matrix-code-encode-wasm';
import '@mission-platform/matrix-code-decode-wasm';
