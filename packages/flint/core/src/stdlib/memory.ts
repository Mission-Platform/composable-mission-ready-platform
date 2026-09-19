import type { FlintPrimitiveType } from '../ast.js';

/** Checked guest-linear-memory operations reserved by the compiler. */
export type FlintMemoryOperation =
  | 'memory-alloc'
  | 'memory-dealloc'
  | 'memory-realloc'
  | 'memory-load-u32'
  | 'memory-store-u32'
  | 'memory-load-f64'
  | 'memory-store-f64'
  | 'f64-from-u32';

/**
 * Metadata descriptor for a reserved guest-memory compiler intrinsic function.
 */
export interface FlintMemoryFunction {
  readonly name: string;
  readonly parameters: readonly FlintPrimitiveType[];
  readonly result: FlintPrimitiveType;
  readonly operation: FlintMemoryOperation;
}

/**
 * List of built-in guest linear memory intrinsics provided by the runtime.
 */
export const FLINT_MEMORY_FUNCTIONS: readonly FlintMemoryFunction[] = [
  { name: 'memory_alloc', parameters: ['u32'], result: 'u32', operation: 'memory-alloc' },
  { name: 'memory_dealloc', parameters: ['u32', 'u32'], result: 'unit', operation: 'memory-dealloc' },
  { name: 'memory_realloc', parameters: ['u32', 'u32', 'u32'], result: 'u32', operation: 'memory-realloc' },
  { name: 'memory_load_u32', parameters: ['u32'], result: 'u32', operation: 'memory-load-u32' },
  { name: 'memory_store_u32', parameters: ['u32', 'u32'], result: 'unit', operation: 'memory-store-u32' },
  { name: 'memory_load_f64', parameters: ['u32'], result: 'f64', operation: 'memory-load-f64' },
  { name: 'memory_store_f64', parameters: ['u32', 'f64'], result: 'unit', operation: 'memory-store-f64' },
  { name: 'f64_from_u32', parameters: ['u32'], result: 'f64', operation: 'f64-from-u32' },
];

/**
 * Lookup map of guest memory intrinsic function names to their definitions.
 */
export const FLINT_MEMORY_FUNCTION_MAP = new Map(
  FLINT_MEMORY_FUNCTIONS.map((declaration) => [declaration.name, declaration]),
);
