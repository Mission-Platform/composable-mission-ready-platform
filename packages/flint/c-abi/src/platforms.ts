import type { CPrimitiveType } from "./types.js";

/** Target platform architectures supported by the Flint compiler and TypeAlgebra. */
export type TargetPlatformTriplet =
  | "wasm32-unknown-unknown"
  | "wasm64-unknown-unknown"
  | "x86_64-unknown-linux-gnu"
  | "x86_64-pc-windows-msvc"
  | "aarch64-apple-darwin"
  | "i686-unknown-linux-gnu";

/** Alias for TargetPlatformTriplet matching existing compiler usage. */
export type TargetPlatform = TargetPlatformTriplet;

/** Platform-specific ABI layout configuration rules. */
export interface PlatformAbiConfig {
  readonly platform: TargetPlatformTriplet;
  readonly pointerSize: number;
  readonly pointerAlignment: number;
  readonly longSize: number;
  readonly longAlignment: number;
  readonly i64StructAlignment: number;
  readonly maxNaturalAlignment: number;
}

/** Pre-configured ABI layout parameters across the 6 supported compilation targets. */
export const PLATFORM_CONFIGS: Readonly<
  Record<TargetPlatformTriplet, PlatformAbiConfig>
> = {
  "wasm32-unknown-unknown": {
    platform: "wasm32-unknown-unknown",
    pointerSize: 4,
    pointerAlignment: 4,
    longSize: 4,
    longAlignment: 4,
    i64StructAlignment: 8,
    maxNaturalAlignment: 16,
  },
  "wasm64-unknown-unknown": {
    platform: "wasm64-unknown-unknown",
    pointerSize: 8,
    pointerAlignment: 8,
    longSize: 8,
    longAlignment: 8,
    i64StructAlignment: 8,
    maxNaturalAlignment: 16,
  },
  "x86_64-unknown-linux-gnu": {
    platform: "x86_64-unknown-linux-gnu",
    pointerSize: 8,
    pointerAlignment: 8,
    longSize: 8,
    longAlignment: 8,
    i64StructAlignment: 8,
    maxNaturalAlignment: 16,
  },
  "x86_64-pc-windows-msvc": {
    platform: "x86_64-pc-windows-msvc",
    pointerSize: 8,
    pointerAlignment: 8,
    longSize: 4,
    longAlignment: 4,
    i64StructAlignment: 8,
    maxNaturalAlignment: 16,
  },
  "aarch64-apple-darwin": {
    platform: "aarch64-apple-darwin",
    pointerSize: 8,
    pointerAlignment: 8,
    longSize: 8,
    longAlignment: 8,
    i64StructAlignment: 8,
    maxNaturalAlignment: 16,
  },
  "i686-unknown-linux-gnu": {
    platform: "i686-unknown-linux-gnu",
    pointerSize: 4,
    pointerAlignment: 4,
    longSize: 4,
    longAlignment: 4,
    i64StructAlignment: 4,
    maxNaturalAlignment: 16,
  },
};

/** Byte size and alignment representation for a C primitive. */
export interface CPrimitiveLayout {
  readonly size: number;
  readonly alignment: number;
}

/** Fixed byte size and alignment for platform-invariant C primitives. */
export const FIXED_C_PRIMITIVE_LAYOUTS: Readonly<
  Record<string, CPrimitiveLayout>
> = {
  c_void: { size: 0, alignment: 1 },
  u8: { size: 1, alignment: 1 },
  i8: { size: 1, alignment: 1 },
  c_char: { size: 1, alignment: 1 },
  c_uchar: { size: 1, alignment: 1 },
  c_short: { size: 2, alignment: 2 },
  c_ushort: { size: 2, alignment: 2 },
  c_int: { size: 4, alignment: 4 },
  c_uint: { size: 4, alignment: 4 },
  c_float: { size: 4, alignment: 4 },
};

/**
 * Computes the byte size and alignment for a C primitive type on the given platform.
 *
 * @param type - The C primitive type.
 * @param platform - Platform configuration or target triplet (defaults to 'wasm32-unknown-unknown').
 * @returns The computed C primitive layout.
 */
export function layoutCPrimitive(
  type: CPrimitiveType,
  platform:
    PlatformAbiConfig | TargetPlatformTriplet = "wasm32-unknown-unknown",
): CPrimitiveLayout {
  const config =
    typeof platform === "string"
      ? (PLATFORM_CONFIGS[platform] ??
        PLATFORM_CONFIGS["wasm32-unknown-unknown"])
      : platform;
  const fixed = FIXED_C_PRIMITIVE_LAYOUTS[type];
  if (fixed !== undefined) return fixed;

  switch (type) {
    case "c_long":
    case "c_ulong": {
      return { size: config.longSize, alignment: config.longAlignment };
    }
    case "c_size":
    case "c_ssize": {
      return { size: config.pointerSize, alignment: config.pointerAlignment };
    }
    case "c_longlong":
    case "c_ulonglong":
    case "c_double": {
      return { size: 8, alignment: config.i64StructAlignment };
    }
    default: {
      throw new Error(
        `Unsupported C primitive type for layout: ${String(type)}`,
      );
    }
  }
}
