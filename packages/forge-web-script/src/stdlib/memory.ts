import type { ForgeWebScriptPrimitiveType } from '../ast.js';

/** Checked guest-linear-memory operations reserved by the compiler. */
export type ForgeWebScriptMemoryOperation =
  | 'memory-alloc'
  | 'memory-dealloc'
  | 'memory-realloc'
  | 'memory-load-u32'
  | 'memory-store-u32'
  | 'memory-load-f64'
  | 'memory-store-f64'
  | 'f64-from-u32';

export interface ForgeWebScriptMemoryFunction {
  readonly name: string;
  readonly parameters: readonly ForgeWebScriptPrimitiveType[];
  readonly result: ForgeWebScriptPrimitiveType;
  readonly operation: ForgeWebScriptMemoryOperation;
}

export const FORGE_WEB_SCRIPT_MEMORY_FUNCTIONS: readonly ForgeWebScriptMemoryFunction[] = [
  { name: 'memory_alloc', parameters: ['u32'], result: 'u32', operation: 'memory-alloc' },
  { name: 'memory_dealloc', parameters: ['u32', 'u32'], result: 'unit', operation: 'memory-dealloc' },
  { name: 'memory_realloc', parameters: ['u32', 'u32', 'u32'], result: 'u32', operation: 'memory-realloc' },
  { name: 'memory_load_u32', parameters: ['u32'], result: 'u32', operation: 'memory-load-u32' },
  { name: 'memory_store_u32', parameters: ['u32', 'u32'], result: 'unit', operation: 'memory-store-u32' },
  { name: 'memory_load_f64', parameters: ['u32'], result: 'f64', operation: 'memory-load-f64' },
  { name: 'memory_store_f64', parameters: ['u32', 'f64'], result: 'unit', operation: 'memory-store-f64' },
  { name: 'f64_from_u32', parameters: ['u32'], result: 'f64', operation: 'f64-from-u32' },
];

export const FORGE_WEB_SCRIPT_MEMORY_FUNCTION_MAP = new Map(
  FORGE_WEB_SCRIPT_MEMORY_FUNCTIONS.map((declaration) => [declaration.name, declaration]),
);