import type { MachModule, TargetBackend } from "@mission-platform/flint-machir";

import type { WasmMultiMemoryConfig } from "./multimem.js";

export interface WasmEmissionOptions {
  readonly emitWat?: boolean;
  readonly multiMemory?: WasmMultiMemoryConfig;
  readonly simd?: boolean;
}

export interface WasmEmissionResult {
  readonly wasm: Uint8Array;
  readonly wat?: string;
  readonly codeSize: number;
}

/**
 * WebAssembly Backend Emitter implementing TargetBackend.
 */
export class WasmTargetBackend implements TargetBackend<
  WasmEmissionOptions,
  WasmEmissionResult
> {
  public readonly targetName = "wasm";
  public readonly targetCategory = "web" as const;
  public readonly architecture = "wasm32" as const;

  /**
   * Emits WebAssembly binary artifact and optional WAT from a MachIR module.
   */
  public emit(
    machModule: MachModule,
    options: WasmEmissionOptions = {},
  ): WasmEmissionResult {
    const magic = [0x00, 0x61, 0x73, 0x6d]; // \0asm
    const version = [0x01, 0x00, 0x00, 0x00]; // 1

    // 1. Type section (Type 1: () -> i32)
    const typeSection = [
      0x01, // Section 1: Type
      0x05, // Section length: 5 bytes
      0x01, // 1 type entry
      0x60, // func
      0x00, // 0 params
      0x01, // 1 return
      0x7f, // i32
    ];

    // 2. Function section (Func 0 -> Type 0)
    const functionSection = [
      0x03, // Section 3: Function
      0x02, // Section length: 2 bytes
      0x01, // 1 function
      0x00, // type index 0
    ];

    // 3. Memory section (1 memory: min 2 pages)
    const memorySection = [
      0x05, // Section 5: Memory
      0x03, // Section length
      0x01, // 1 memory
      0x00, // flags (no max)
      0x02, // initial pages: 2
    ];

    // 4. Export section (Export function 0 as module name or 'main', Export memory 0 as 'memory')
    const exportName = machModule.functions[0]?.name ?? "main";
    const nameBytes = new TextEncoder().encode(exportName);
    const exportSectionPayload = [
      0x02, // 2 exports
      // Export 1: function
      nameBytes.length,
      ...nameBytes,
      0x00, // export kind: function
      0x00, // function index 0
      // Export 2: memory
      0x06,
      ...new TextEncoder().encode("memory"),
      0x02, // export kind: memory
      0x00, // memory index 0
    ];
    const exportSection = [
      0x07, // Section 7: Export
      exportSectionPayload.length,
      ...exportSectionPayload,
    ];

    // 5. Code section (Function body emitting instruction sequence from MachIR)
    const bodyOpcodes: number[] = [];
    const mainFn = machModule.functions[0];
    if (mainFn !== undefined) {
      for (const block of mainFn.blocks) {
        for (const ins of block.instructions) {
          if (ins.opcode === "mov" && ins.immediate !== undefined) {
            bodyOpcodes.push(0x41); // i32.const
            bodyOpcodes.push(Number(ins.immediate) & 0x7f);
          } else if (ins.opcode === "add") {
            bodyOpcodes.push(0x6a); // i32.add
          } else if (ins.opcode === "sub") {
            bodyOpcodes.push(0x6b); // i32.sub
          } else if (ins.opcode === "mul") {
            bodyOpcodes.push(0x6c); // i32.mul
          }
        }
      }
    }

    if (bodyOpcodes.length === 0) {
      bodyOpcodes.push(0x41, 0x00); // i32.const 0
    }
    bodyOpcodes.push(0x0b); // end

    const funcBody = [
      0x00, // 0 local declarations
      ...bodyOpcodes,
    ];

    const codeSectionPayload = [
      0x01, // 1 function body
      funcBody.length,
      ...funcBody,
    ];

    const codeSection = [
      0x0a, // Section 10: Code
      codeSectionPayload.length,
      ...codeSectionPayload,
    ];

    const wasmBytes = new Uint8Array([
      ...magic,
      ...version,
      ...typeSection,
      ...functionSection,
      ...memorySection,
      ...exportSection,
      ...codeSection,
    ]);

    let wat: string | undefined;
    if (options.emitWat) {
      wat = `(module
  (type $t0 (func (result i32)))
  (func $${exportName} (type $t0) (result i32)
    ${bodyOpcodes.map((b) => `0x${b.toString(16)}`).join(" ")}
  )
  (memory $memory 2)
  (export "${exportName}" (func $${exportName}))
  (export "memory" (memory $memory))
)`;
    }

    return {
      wasm: wasmBytes,
      wat,
      codeSize: wasmBytes.length,
    };
  }
}

export function createWasmTargetBackend(): WasmTargetBackend {
  return new WasmTargetBackend();
}
