/**
 * WebAssembly SIMD v128 instruction opcodes and vector encoders.
 */
export const WASM_SIMD_PREFIX = 0xfd;

export const SIMD_OPCODES = {
  v128_const: 0x0c,
  i32x4_add: 0xae,
  i32x4_sub: 0xb1,
  i32x4_mul: 0xb5,
  f32x4_add: 0xe4,
  f32x4_sub: 0xe5,
  f32x4_mul: 0xe6,
  v128_and: 0x4e,
  v128_or: 0x50,
  v128_xor: 0x51,
  v128_not: 0x4d,
} as const;

/**
 * Encodes a 128-bit vector constant instruction.
 */
export function encodeV128Const(bytes: Uint8Array): number[] {
  if (bytes.length !== 16) {
    throw new Error(
      `v128.const requires exactly 16 bytes, got ${bytes.length}`,
    );
  }
  return [WASM_SIMD_PREFIX, SIMD_OPCODES.v128_const, ...bytes];
}

/**
 * Encodes a SIMD 2-operand vector instruction.
 */
export function encodeSimdOp(opcode: number): number[] {
  return [WASM_SIMD_PREFIX, opcode];
}
