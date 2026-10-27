import type {
  FlintFunction,
  FlintOwnership,
  FlintPrimitiveType,
  FlintTypeName,
} from "@mission-platform/flint-ast";
import { FLINT_REGEX_BYTECODE_VERSION } from "@mission-platform/flint-regex";

export { FLINT_TYPE_DYNAMIC_TYPE_PROHIBITED } from "@mission-platform/flint-ast";

/** External type environment containing declarations imported into a module. */
export interface FlintImportTypeEnvironment {
  /** External function declarations exported by resolved dependency modules. */
  readonly externalFunctions: readonly FlintFunction[];
}

/** Specialization contract for monomorphized generic applications. */
export interface FlintSpecialization {
  readonly id: string;
  readonly template?: string;
  readonly generic?: string;
  readonly arguments: readonly (string | FlintTypeName)[];
  readonly mangledName?: string;
  readonly representation?: "monomorphized" | "descriptor-boundary";
}

/** Descriptor for iterator boundary across module boundaries. */
export interface FlintIteratorBoundaryDescriptor {
  readonly id: string;
  readonly generic: string;
  readonly elementType: string;
  readonly nextFunction: string;
  readonly representation: "descriptor-boundary";
  readonly ownership: FlintOwnership;
}

/** Compiler-owned deterministic string and byte operations. */
export type FlintStringOperation =
  | "string-concat"
  | "string-length"
  | "string-byte-at"
  | "string-starts-with"
  | "string-slice"
  | "string-to-i32"
  | "bytes-length"
  | "bytes-length-u32"
  | "bytes-byte-at"
  | "bytes-byte-at-u32"
  | "bytes-slice";

/** Metadata descriptor for a built-in string or bytes compiler intrinsic function. */
export interface FlintStringFunction {
  readonly name: string;
  readonly parameters: readonly FlintPrimitiveType[];
  readonly result: FlintPrimitiveType;
  readonly operation: FlintStringOperation;
}

export const FLINT_STRING_FUNCTIONS: readonly FlintStringFunction[] = [
  {
    name: "string_concat",
    parameters: ["string", "string"],
    result: "string",
    operation: "string-concat",
  },
  {
    name: "string_length",
    parameters: ["string"],
    result: "i32",
    operation: "string-length",
  },
  {
    name: "string_byte_at",
    parameters: ["string", "i32"],
    result: "i32",
    operation: "string-byte-at",
  },
  {
    name: "string_starts_with",
    parameters: ["string", "string"],
    result: "bool",
    operation: "string-starts-with",
  },
  {
    name: "string_slice",
    parameters: ["string", "i32", "i32"],
    result: "string",
    operation: "string-slice",
  },
  {
    name: "string_to_i32",
    parameters: ["string"],
    result: "i32",
    operation: "string-to-i32",
  },
  {
    name: "bytes_length",
    parameters: ["bytes"],
    result: "i32",
    operation: "bytes-length",
  },
  {
    name: "bytes_length_u32",
    parameters: ["bytes"],
    result: "u32",
    operation: "bytes-length-u32",
  },
  {
    name: "bytes_byte_at",
    parameters: ["bytes", "i32"],
    result: "i32",
    operation: "bytes-byte-at",
  },
  {
    name: "bytes_byte_at_u32",
    parameters: ["bytes", "u32"],
    result: "u32",
    operation: "bytes-byte-at-u32",
  },
  {
    name: "bytes_slice",
    parameters: ["bytes", "i32", "i32"],
    result: "bytes",
    operation: "bytes-slice",
  },
];

export const FLINT_STRING_FUNCTION_MAP = new Map(
  FLINT_STRING_FUNCTIONS.map((declaration) => [declaration.name, declaration]),
);

/** Checked guest-linear-memory operations reserved by the compiler. */
export type FlintMemoryOperation =
  | "memory-alloc"
  | "memory-dealloc"
  | "memory-realloc"
  | "memory-load-u32"
  | "memory-store-u32"
  | "memory-load-u8"
  | "memory-store-u8"
  | "memory-load-f64"
  | "memory-store-f64"
  | "f64-from-u32";

/** Metadata descriptor for a reserved guest-memory compiler intrinsic function. */
export interface FlintMemoryFunction {
  readonly name: string;
  readonly parameters: readonly FlintPrimitiveType[];
  readonly result: FlintPrimitiveType;
  readonly operation: FlintMemoryOperation;
}

export type FlintAllocatorBridgeMode =
  "internal" | "c-malloc-free" | "shared-arena";

export interface FlintAllocatorBridgeContract {
  readonly mode: FlintAllocatorBridgeMode;
  readonly mallocSymbol: string;
  readonly freeSymbol: string;
  readonly reallocSymbol?: string;
  readonly callocSymbol?: string;
}

export const DEFAULT_C_ALLOCATOR_BRIDGE: FlintAllocatorBridgeContract = {
  mode: "c-malloc-free",
  mallocSymbol: "malloc",
  freeSymbol: "free",
  reallocSymbol: "realloc",
  callocSymbol: "calloc",
};

export const FLINT_MEMORY_FUNCTIONS: readonly FlintMemoryFunction[] = [
  {
    name: "memory_alloc",
    parameters: ["u32"],
    result: "u32",
    operation: "memory-alloc",
  },
  {
    name: "memory_dealloc",
    parameters: ["u32", "u32"],
    result: "unit",
    operation: "memory-dealloc",
  },
  {
    name: "memory_realloc",
    parameters: ["u32", "u32", "u32"],
    result: "u32",
    operation: "memory-realloc",
  },
  {
    name: "memory_load_u32",
    parameters: ["u32"],
    result: "u32",
    operation: "memory-load-u32",
  },
  {
    name: "memory_store_u32",
    parameters: ["u32", "u32"],
    result: "unit",
    operation: "memory-store-u32",
  },
  {
    name: "memory_load_u8",
    parameters: ["u32"],
    result: "u32",
    operation: "memory-load-u8",
  },
  {
    name: "memory_store_u8",
    parameters: ["u32", "u32"],
    result: "unit",
    operation: "memory-store-u8",
  },
  {
    name: "memory_load_f64",
    parameters: ["u32"],
    result: "f64",
    operation: "memory-load-f64",
  },
  {
    name: "memory_store_f64",
    parameters: ["u32", "f64"],
    result: "unit",
    operation: "memory-store-f64",
  },
  {
    name: "f64_from_u32",
    parameters: ["u32"],
    result: "f64",
    operation: "f64-from-u32",
  },
  {
    name: "malloc",
    parameters: ["c_size"],
    result: "c_size",
    operation: "memory-alloc",
  },
  {
    name: "free",
    parameters: ["c_size"],
    result: "unit",
    operation: "memory-dealloc",
  },
];

export const FLINT_MEMORY_FUNCTION_MAP = new Map(
  FLINT_MEMORY_FUNCTIONS.map((declaration) => [declaration.name, declaration]),
);

export type FlintRegexOperation =
  | "full-match"
  | "prefix-match"
  | "search"
  | "full-capture-start"
  | "full-capture-end"
  | "prefix-capture-start"
  | "prefix-capture-end"
  | "search-capture-start"
  | "search-capture-end";

export interface FlintStandardLibraryFunction {
  readonly name: string;
  readonly parameters: readonly FlintPrimitiveType[];
  readonly result: FlintPrimitiveType;
  readonly operation: FlintRegexOperation;
}

export const FLINT_REGEX_FUNCTIONS: readonly FlintStandardLibraryFunction[] = [
  {
    name: "regex_full_match",
    parameters: ["string", "string"],
    result: "bool",
    operation: "full-match",
  },
  {
    name: "regex_prefix_match",
    parameters: ["string", "string"],
    result: "bool",
    operation: "prefix-match",
  },
  {
    name: "regex_search",
    parameters: ["string", "string", "i32"],
    result: "bool",
    operation: "search",
  },
  {
    name: "regex_full_capture_start",
    parameters: ["string", "string", "i32"],
    result: "i32",
    operation: "full-capture-start",
  },
  {
    name: "regex_full_capture_end",
    parameters: ["string", "string", "i32"],
    result: "i32",
    operation: "full-capture-end",
  },
  {
    name: "regex_prefix_capture_start",
    parameters: ["string", "string", "i32"],
    result: "i32",
    operation: "prefix-capture-start",
  },
  {
    name: "regex_prefix_capture_end",
    parameters: ["string", "string", "i32"],
    result: "i32",
    operation: "prefix-capture-end",
  },
  {
    name: "regex_search_capture_start",
    parameters: ["string", "string", "i32", "i32"],
    result: "i32",
    operation: "search-capture-start",
  },
  {
    name: "regex_search_capture_end",
    parameters: ["string", "string", "i32", "i32"],
    result: "i32",
    operation: "search-capture-end",
  },
];

export const FLINT_REGEX_FUNCTION_MAP = new Map(
  FLINT_REGEX_FUNCTIONS.map((declaration) => [declaration.name, declaration]),
);

export const FLINT_REGEX_VERSION =
  `bytecode-${FLINT_REGEX_BYTECODE_VERSION}` as const;
