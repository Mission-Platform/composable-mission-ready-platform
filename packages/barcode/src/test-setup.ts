// Codec implementations initialize their wasm backends lazily. FWS fixtures
// do not need to load the legacy wrapper packages during test setup.

export const BARCODE_TEST_SETUP = true;