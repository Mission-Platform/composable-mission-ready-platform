import { describe, expect, it } from "vitest";

import type { MachModule } from "@mission-platform/flint-machir";

import {
  createWasmTargetBackend,
  encodeV128Const,
  SIMD_OPCODES,
  WASM_SIMD_PREFIX,
} from ".";

describe("Flint Web Backend (WebAssembly)", () => {
  it("emits valid WebAssembly bytecode that instantiates and executes", async () => {
    const machModule: MachModule = {
      name: "add_two",
      functions: [
        {
          name: "add_two",
          stackFrameSize: 0,
          callingConvention: "wasm_stack",
          isInterruptHandler: false,
          blocks: [
            {
              id: 1,
              label: "entry",
              predecessors: [],
              successors: [],
              instructions: [
                { id: 1, opcode: "mov", defs: [], uses: [], immediate: 20 },
                { id: 2, opcode: "mov", defs: [], uses: [], immediate: 22 },
                { id: 3, opcode: "add", defs: [], uses: [] },
              ],
            },
          ],
        },
      ],
    };

    const backend = createWasmTargetBackend();
    const result = backend.emit(machModule, { emitWat: true });

    expect(result.wasm).toBeInstanceOf(Uint8Array);
    expect(result.codeSize).toBeGreaterThan(0);
    expect(result.wat).toContain("add_two");

    // Instantiate and execute Wasm in Node
    const wasmModule = await WebAssembly.instantiate(result.wasm);
    const exports = wasmModule.instance.exports as Record<string, () => number>;
    expect(typeof exports.add_two).toBe("function");
    expect(exports.add_two()).toBe(42);
  });

  it("encodes SIMD v128 constants", () => {
    const bytes = new Uint8Array(16);
    bytes[0] = 0x42;
    const encoded = encodeV128Const(bytes);

    expect(encoded[0]).toBe(WASM_SIMD_PREFIX);
    expect(encoded[1]).toBe(SIMD_OPCODES.v128_const);
    expect(encoded[2]).toBe(0x42);
    expect(encoded.length).toBe(18);
  });
});
