/**
 * Test-only reference oracle for the Forge regex bytecode contract.
 *
 * Production matching is owned by the Forge Web Script backend and generated
 * WASM runtime; this entry point exists only for compiler conformance tests.
 */
export * from "./reference-vm.js";
