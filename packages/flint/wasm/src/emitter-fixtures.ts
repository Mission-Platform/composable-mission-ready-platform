import type { FlintWasmModule, FlintWasmSourceSpan } from './contracts.js';

export const span: FlintWasmSourceSpan = { start: 0, end: 1, line: 1, column: 1, endLine: 1, endColumn: 2 };

export function moduleWith(functions: FlintWasmModule['functions']): FlintWasmModule {
  return {
    kind: 'module',
    name: 'backend-spec',
    imports: [],
    sourceImports: [],
    functions,
    span,
  } as FlintWasmModule;
}

export const metadata = { compilerVersion: 'test', optimization: 'debug' as const, sourceFiles: ['entry.flint'] };
export const literal = (value: string) => ({ kind: 'literal' as const, value, type: 'string' as const, span });
export const index32 = (value: number) => ({ kind: 'literal' as const, value, type: 'i32' as const, span });
export const countInstruction = (bytes: Uint8Array, instruction: readonly number[]): number => {
  let count = 0;
  for (let index = 0; index <= bytes.length - instruction.length; index += 1) {
    if (instruction.every((byte, offset) => bytes[index + offset] === byte)) count += 1;
  }
  return count;
};

export function wasmBytes(result: { readonly wasm?: Uint8Array }): Uint8Array {
  return result.wasm ?? new Uint8Array();
}

export function wasmModule(result: { readonly wasm?: Uint8Array }): WebAssembly.Module {
  return new WebAssembly.Module(wasmBytes(result) as unknown as BufferSource);
}
