import type { ForgeWebScriptPrimitiveType } from '../ast.js';

/** Compiler-owned deterministic string and byte operations. */
export type ForgeWebScriptStringOperation =
  | 'string-concat'
  | 'string-length'
  | 'string-byte-at'
  | 'string-starts-with'
  | 'string-slice'
  | 'string-to-i32'
  | 'bytes-length'
  | 'bytes-length-u32'
  | 'bytes-byte-at'
  | 'bytes-byte-at-u32'
  | 'bytes-slice';

export interface ForgeWebScriptStringFunction {
  readonly name: string;
  readonly parameters: readonly ForgeWebScriptPrimitiveType[];
  readonly result: ForgeWebScriptPrimitiveType;
  readonly operation: ForgeWebScriptStringOperation;
}

export const FORGE_WEB_SCRIPT_STRING_FUNCTIONS: readonly ForgeWebScriptStringFunction[] = [
  { name: 'string_concat', parameters: ['string', 'string'], result: 'string', operation: 'string-concat' },
  { name: 'string_length', parameters: ['string'], result: 'i32', operation: 'string-length' },
  { name: 'string_byte_at', parameters: ['string', 'i32'], result: 'i32', operation: 'string-byte-at' },
  { name: 'string_starts_with', parameters: ['string', 'string'], result: 'bool', operation: 'string-starts-with' },
  { name: 'string_slice', parameters: ['string', 'i32', 'i32'], result: 'string', operation: 'string-slice' },
  { name: 'string_to_i32', parameters: ['string'], result: 'i32', operation: 'string-to-i32' },
  { name: 'bytes_length', parameters: ['bytes'], result: 'i32', operation: 'bytes-length' },
  { name: 'bytes_length_u32', parameters: ['bytes'], result: 'u32', operation: 'bytes-length-u32' },
  { name: 'bytes_byte_at', parameters: ['bytes', 'i32'], result: 'i32', operation: 'bytes-byte-at' },
  { name: 'bytes_byte_at_u32', parameters: ['bytes', 'u32'], result: 'u32', operation: 'bytes-byte-at-u32' },
  { name: 'bytes_slice', parameters: ['bytes', 'i32', 'i32'], result: 'bytes', operation: 'bytes-slice' },
];

export const FORGE_WEB_SCRIPT_STRING_FUNCTION_MAP = new Map(
  FORGE_WEB_SCRIPT_STRING_FUNCTIONS.map((declaration) => [declaration.name, declaration]),
);
