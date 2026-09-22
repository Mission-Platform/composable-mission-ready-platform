/** C scalar primitive types supported by Flint C interoperability layer. */
export type CPrimitiveType =
  | "u8"
  | "i8"
  | "c_char"
  | "c_uchar"
  | "c_short"
  | "c_ushort"
  | "c_int"
  | "c_uint"
  | "c_long"
  | "c_ulong"
  | "c_longlong"
  | "c_ulonglong"
  | "c_size"
  | "c_ssize"
  | "c_float"
  | "c_double"
  | "c_void";

/** C pointer constructor names supported by Flint. */
export type CPointerType = "CPtr" | "MutCPtr" | "COpaquePtr";

/** Read-only set of all supported C primitive type names. */
export const C_PRIMITIVE_TYPES: ReadonlySet<string> = new Set<string>([
  "u8",
  "i8",
  "c_char",
  "c_uchar",
  "c_short",
  "c_ushort",
  "c_int",
  "c_uint",
  "c_long",
  "c_ulong",
  "c_longlong",
  "c_ulonglong",
  "c_size",
  "c_ssize",
  "c_float",
  "c_double",
  "c_void",
]);

/** Read-only set of C primitive integer types. */
export const C_INTEGER_TYPES: ReadonlySet<string> = new Set<string>([
  "u8",
  "i8",
  "c_char",
  "c_uchar",
  "c_short",
  "c_ushort",
  "c_int",
  "c_uint",
  "c_long",
  "c_ulong",
  "c_longlong",
  "c_ulonglong",
  "c_size",
  "c_ssize",
]);

/** Read-only set of C pointer type names. */
export const C_POINTER_TYPES: ReadonlySet<string> = new Set<string>([
  "CPtr",
  "MutCPtr",
  "COpaquePtr",
]);

/**
 * Checks if a given name represents a recognized C primitive type.
 *
 * @param name - The type name to inspect.
 * @returns True if the name is a CPrimitiveType.
 */
export function isCPrimitiveType(name: string): name is CPrimitiveType {
  return C_PRIMITIVE_TYPES.has(name);
}

/**
 * Checks if a given name represents an integer C primitive type.
 *
 * @param name - The type name to inspect.
 * @returns True if the name is an integer CPrimitiveType.
 */
export function isCIntegerType(name: string): boolean {
  return C_INTEGER_TYPES.has(name);
}

/**
 * Checks if a given type name is a C pointer type (CPtr, MutCPtr, COpaquePtr, or generic instantiation).
 *
 * @param name - The type name or signature to inspect.
 * @returns True if the type represents a C pointer.
 */
export function isCPointerType(name: string): boolean {
  return (
    C_POINTER_TYPES.has(name) ||
    name.startsWith("CPtr<") ||
    name.startsWith("MutCPtr<")
  );
}

/**
 * Checks if a type name represents a nullable pointer suitable for niche optimization.
 *
 * @param name - The type name to inspect.
 * @returns True if the type is a C pointer.
 */
export function isNullablePointerType(name: string): boolean {
  return isCPointerType(name);
}
