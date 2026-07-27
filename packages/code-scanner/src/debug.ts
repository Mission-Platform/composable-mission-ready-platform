// Lightweight, opt-in diagnostic logging for the scanner façade.
//
// Locating a code but failing to decode it (the common Data Matrix / 1D-barcode
// symptom) is otherwise silent: the wasm locator returns a buffer, a decoder
// returns `null`, and nothing explains where the pipeline broke. Turning this on
// traces every stage on the JS side — capture dimensions, the located format and
// its sampled payload, and each decoder's verdict — so it is obvious whether the
// symbol was never located, located but sampled wrong, or sampled fine but
// rejected by the decoder. The wasm side emits the matching detail through its
// `tracing` events (visible in the devtools console when the crate is built with
// its default `console` feature).
//
// It is **off by default** so production consoles stay quiet. Enable it either
// programmatically with {@link setCodeScannerDebug} or by setting the
// `__CODE_SCANNER_DEBUG__` global before the module loads (handy from a devtools
// snippet: `globalThis.__CODE_SCANNER_DEBUG__ = true`).

/** The console-facing prefix so scanner logs are easy to spot and filter. */
const LOG_PREFIX = '[code-scanner]';

/**
 * Read the initial debug flag from the `__CODE_SCANNER_DEBUG__` global, if a host
 * set one before this module was imported. Defaults to `false`.
 */
function initialFlag(): boolean {
  return Boolean((globalThis as { __CODE_SCANNER_DEBUG__?: unknown }).__CODE_SCANNER_DEBUG__);
}

let enabled = initialFlag();

/**
 * Enable or disable the scanner's JS-side diagnostic logging at runtime.
 *
 * @param value - `true` to log each scan stage to the console, `false` to silence it.
 */
export function setCodeScannerDebug(value: boolean): void {
  enabled = value;
}

/** Whether scanner diagnostic logging is currently enabled. */
export function isCodeScannerDebugEnabled(): boolean {
  return enabled;
}

/**
 * Log a scanner diagnostic line (prefixed and only when {@link setCodeScannerDebug}
 * is enabled). Accepts the same variadic arguments as `console.debug`.
 */
export function scannerLog(...args: readonly unknown[]): void {
   
  console.debug(LOG_PREFIX, ...args);
}
