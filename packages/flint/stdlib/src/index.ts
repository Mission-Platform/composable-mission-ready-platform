export * from "@mission-platform/flint-runtime";

/** Directory containing the shipped Flint declaration modules. */
export const FLINT_STDLIB_SOURCE_ROOT = "flint";
/** Relative path to the async declaration module used by compiler consumers. */
export const FLINT_STDLIB_ASYNC_SOURCE = "flint/async.flint";
/** Relative path to the math standard library module with inlined Wasm implementations. */
export const FLINT_STDLIB_MATH_SOURCE = "flint/math.flint";
/** Relative path to the meta introspection standard library module. */
export const FLINT_STDLIB_META_SOURCE = "flint/meta.flint";
/** Relative path to the representation macro standard library module. */
export const FLINT_STDLIB_REPR_SOURCE = "flint/repr.flint";
/**
 * Stable identity and representation contract for the standard library.
 * Aggregate values use monomorphized layouts where possible and descriptor
 * boundaries for values that cross the host/Wasm ABI.
 */
export const FLINT_STDLIB_IDENTITY = {
  name: "@mission-platform/flint-stdlib",
  version: "0.1.0",
  representation: "hybrid-monomorphized-with-descriptor-boundaries",
} as const;
