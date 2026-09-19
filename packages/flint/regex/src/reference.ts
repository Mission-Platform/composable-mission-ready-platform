/**
 * Test-only reference oracle for the Forge regex bytecode contract.
 *
 * Production matching is owned by the Flint backend and generated
 * WASM runtime; this entry point exists only for compiler conformance tests.
 */
export * from "./reference-vm.js";
