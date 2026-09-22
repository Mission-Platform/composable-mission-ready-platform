import {
  PLATFORM_CONFIGS,
  type PlatformAbiConfig,
  type TargetPlatform,
} from "./platforms.js";

/** Canonical base mapping from C types to Flint primitive or helper types. */
export const C_BASE_TYPE_MAP: Readonly<Record<string, string>> = {
  void: "c_void",
  bool: "bool",
  _Bool: "bool",
  char: "c_char",
  "unsigned char": "u8",
  uint8_t: "u8",
  u8: "u8",
  "signed char": "i8",
  int8_t: "i8",
  i8: "i8",
  short: "c_short",
  "short int": "c_short",
  int16_t: "c_short",
  "unsigned short": "c_ushort",
  uint16_t: "c_ushort",
  int: "c_int",
  "signed int": "c_int",
  int32_t: "c_int",
  "unsigned int": "c_uint",
  uint32_t: "c_uint",
  unsigned: "c_uint",
  long: "c_long",
  "long int": "c_long",
  "unsigned long": "c_ulong",
  "long long": "c_longlong",
  int64_t: "c_longlong",
  "unsigned long long": "c_ulonglong",
  uint64_t: "c_ulonglong",
  size_t: "c_size",
  uintptr_t: "c_size",
  ssize_t: "c_ssize",
  intptr_t: "c_ssize",
  float: "c_float",
  double: "c_double",
};

/** Formats a pointer type into its Flint representation. */
function formatFlintPointer(flintBase: string, isConst: boolean): string {
  if (flintBase === "c_void") {
    return "COpaquePtr";
  }
  return isConst ? `CPtr<${flintBase}>` : `MutCPtr<${flintBase}>`;
}

/** Extracts the base C type name without pointer and const qualifiers. */
function extractCBaseType(trimmed: string): string {
  return trimmed
    .replace(/\s*\*+$/, "")
    .replace(/^const\s+/, "")
    .replace(/\s+const$/, "")
    .replace(/^struct\s+/, "")
    .trim();
}

/**
 * Maps a C scalar or pointer type signature to a Flint type name.
 *
 * @param cType - Raw C type string (e.g. "const uint8_t*", "int32_t", "ScannerResult*").
 * @returns Flint type representation (e.g. "CPtr<u8>", "c_int", "MutCPtr<ScannerResult>").
 */
// skipcq: JS-R1005
export function mapCTypeToFlint(cType: string): string {
  const trimmed = cType.trim().replace(/^struct\s+/, "");
  // Double pointer (e.g. sqlite3**, char**, void**)
  if (/\*{2,}$/.test(trimmed.replaceAll(/\s+/g, ""))) {
    return "MutCPtr<COpaquePtr>";
  }

  const isPointer = trimmed.includes("*");
  const base = extractCBaseType(trimmed);
  const flintBase = C_BASE_TYPE_MAP[base] ?? base;

  if (!isPointer) {
    return flintBase;
  }
  const isConst =
    /^const\s+/.test(trimmed) || /\s+const(\s*\*)*$/.test(trimmed);
  return formatFlintPointer(flintBase, isConst);
}

/** Static WebAssembly value type mapping for primitive types. */
export const STATIC_WASM_TYPES: Readonly<
  Record<string, "i32" | "i64" | "f32" | "f64" | "void">
> = {
  bool: "i32",
  u8: "i32",
  i8: "i32",
  c_char: "i32",
  c_uchar: "i32",
  c_short: "i32",
  c_ushort: "i32",
  i32: "i32",
  u32: "i32",
  c_int: "i32",
  c_uint: "i32",
  f32: "f32",
  c_float: "f32",
  f64: "f64",
  c_double: "f64",
  i64: "i64",
  u64: "i64",
  c_longlong: "i64",
  c_ulonglong: "i64",
  unit: "void",
  c_void: "void",
};

/** Pointer-like types whose WebAssembly representation depends on 64-bit addressing. */
export const POINTER_LIKE_WASM_TYPES: ReadonlySet<string> = new Set<string>([
  "CPtr",
  "MutCPtr",
  "COpaquePtr",
  "c_long",
  "c_ulong",
  "c_size",
  "c_ssize",
]);

/**
 * Maps a Flint or C type representation string to its corresponding WebAssembly ABI value type.
 *
 * @param type - Type name string.
 * @param memory64 - True if target uses 64-bit pointers.
 * @returns Wasm value type name ('i32', 'i64', 'f32', 'f64', or 'void').
 */
export function mapCTypeToWasmValueType(
  type: string,
  memory64 = false,
): "i32" | "i64" | "f32" | "f64" | "void" {
  if (!type) return "i32";
  if (STATIC_WASM_TYPES[type]) return STATIC_WASM_TYPES[type];
  if (
    type.startsWith("CPtr") ||
    type.startsWith("MutCPtr") ||
    type === "COpaquePtr"
  ) {
    return memory64 ? "i64" : "i32";
  }
  if (POINTER_LIKE_WASM_TYPES.has(type)) {
    return memory64 ? "i64" : "i32";
  }
  return "i32";
}

// eslint-disable-next-line unicorn/prevent-abbreviations
export const mapCTypeToWasmValType = mapCTypeToWasmValueType;

/** Set of 64-bit Flint integer types represented as bigint in TypeScript. */
export const BIGINT_FLINT_TYPES: ReadonlySet<string> = new Set<string>([
  "c_longlong",
  "c_ulonglong",
  "i64",
  "u64",
]);

/**
 * Maps a Flint type representation to its corresponding TypeScript type declaration string.
 *
 * @param flintType - Flint type representation name.
 * @returns TypeScript type string ('boolean', 'void', 'bigint', or 'number').
 */
export function mapFlintToTsType(flintType: string): string {
  if (flintType === "bool") return "boolean";
  if (flintType === "c_void" || flintType === "unit") return "void";
  if (BIGINT_FLINT_TYPES.has(flintType)) return "bigint";
  return "number";
}

/** Pre-configured bun:ffi FFIType mappings for specific Flint primitives. */
export const FFI_TYPE_MAP: Readonly<Record<string, string>> = {
  c_void: "FFIType.void",
  unit: "FFIType.void",
  bool: "FFIType.bool",
  u8: "FFIType.u8",
  c_uchar: "FFIType.u8",
  i8: "FFIType.i8",
  c_char: "FFIType.i8",
  c_short: "FFIType.i16",
  c_ushort: "FFIType.u16",
  i32: "FFIType.i32",
  u32: "FFIType.u32",
  c_int: "FFIType.i32",
  c_uint: "FFIType.u32",
  c_float: "FFIType.f32",
  f32: "FFIType.f32",
  c_double: "FFIType.f64",
  f64: "FFIType.f64",
  c_longlong: "FFIType.i64",
  c_ulonglong: "FFIType.u64",
  i64: "FFIType.i64",
  u64: "FFIType.u64",
};

/**
 * Maps a Flint type representation to its bun:ffi FFIType identifier.
 *
 * @param flintType - Flint type representation name.
 * @param targetAbi - Target platform configuration or triplet name (defaults to 'wasm32-unknown-unknown').
 * @returns Corresponding bun:ffi FFIType string.
 */
export function mapFlintToFfiType(
  flintType: string,
  targetAbi: PlatformAbiConfig | TargetPlatform = "wasm32-unknown-unknown",
): string {
  if (
    flintType.startsWith("CPtr") ||
    flintType.startsWith("MutCPtr") ||
    flintType === "COpaquePtr"
  ) {
    return "FFIType.ptr";
  }

  const config =
    typeof targetAbi === "string"
      ? (PLATFORM_CONFIGS[targetAbi] ??
        PLATFORM_CONFIGS["wasm32-unknown-unknown"])
      : targetAbi;

  if (flintType === "c_size") {
    return config.pointerSize === 8 ? "FFIType.u64" : "FFIType.u32";
  }
  if (flintType === "c_ssize") {
    return config.pointerSize === 8 ? "FFIType.i64" : "FFIType.i32";
  }
  if (flintType === "c_long") {
    return config.longSize === 8 ? "FFIType.i64" : "FFIType.i32";
  }
  if (flintType === "c_ulong") {
    return config.longSize === 8 ? "FFIType.u64" : "FFIType.u32";
  }

  return FFI_TYPE_MAP[flintType] ?? "FFIType.i32";
}
