export * from "@mission-platform/forge-web-script-runtime";

/** Directory containing the shipped Forge Web Script declaration modules. */
export const FORGE_WEB_SCRIPT_STDLIB_SOURCE_ROOT = "fws";
/** Relative path to the async declaration module used by compiler consumers. */
export const FORGE_WEB_SCRIPT_STDLIB_ASYNC_SOURCE = "fws/async.fws";
/**
 * Stable identity and representation contract for the standard library.
 * Aggregate values use monomorphized layouts where possible and descriptor
 * boundaries for values that cross the host/Wasm ABI.
 */
export const FORGE_WEB_SCRIPT_STDLIB_IDENTITY = {
  name: "@mission-platform/forge-web-script-stdlib",
  version: "0.1.0",
  representation: "hybrid-monomorphized-with-descriptor-boundaries",
} as const;
