// Keep the scanner wrapper in the test module graph. Its binary is initialized
// lazily on first operation. The scanner links the QR, Data Matrix and 1D
// barcode decoders directly (decode runs inside `scan_and_decode`).
import '@mission-platform/code-scan-wasm';
