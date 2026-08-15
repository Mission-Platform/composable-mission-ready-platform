// Keep the wrapper packages in the test module graph. Their binaries are now
// initialized lazily on first operation rather than during import.
import '@mission-platform/barcode-encode-wasm';
import '@mission-platform/barcode-decode-wasm';
