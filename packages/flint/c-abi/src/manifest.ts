import type {
  FlintOwnership,
  FlintPrimitiveType,
  FlintTypeInfo,
  FlintTypeName,
} from "@mission-platform/flint-ast";

/**
 * Current language specification version supported by the Flint compiler.
 */
export const FLINT_LANGUAGE_VERSION = "1.0" as const;

/**
 * Binary ABI manifest format version emitted by the compiler.
 */
export const FLINT_ABI_VERSION = "1.2" as const;

/**
 * Type representation of the current language version string.
 */
export type FlintLanguageVersion = typeof FLINT_LANGUAGE_VERSION;

/**
 * Type representation of the current ABI version string.
 */
export type FlintAbiVersion = typeof FLINT_ABI_VERSION;

/**
 * Describes a single parameter in an exported or imported ABI function signature.
 */
export interface FlintAbiParameter {
  readonly name: string;
  readonly type: FlintPrimitiveType;
  readonly reference?: string;
  readonly arguments?: readonly FlintTypeName[];
  readonly length?: number;
  readonly ownership?: FlintOwnership;
  readonly passing?: "value" | "immutable-reference" | "mutable-reference";
  readonly mutable?: true;
  readonly referenceMode?: "ref" | "mut-ref";
}

/**
 * ABI specification for an exported or imported function within a WebAssembly module.
 */
export interface FlintAbiFunction {
  readonly name: string;
  readonly parameters: readonly FlintAbiParameter[];
  readonly result: FlintPrimitiveType;
  readonly resultReference?: string;
  readonly resultArguments?: readonly FlintTypeName[];
  readonly resultLength?: number;
  readonly resultOwnership?: FlintOwnership;
  readonly resultPassing?:
    "value" | "immutable-reference" | "mutable-reference";
  readonly resultReferenceMode?: "ref" | "mut-ref";
}

/**
 * Specification for a host capability imported into a Flint module.
 */
export interface FlintHostImport {
  readonly capability: string;
  readonly alias: string;
  readonly function: FlintAbiFunction;
}

/**
 * Linear memory configuration and memory allocator contract emitted in the ABI manifest.
 */
export interface FlintMemoryLayout {
  readonly pageSize: 65_536;
  readonly addressType: "u32" | "u64";
  readonly ownership: "caller-owned";
  readonly stringEncoding: "utf8";
  readonly byteArrayRepresentation: "pointer-length";
  readonly allocatorExport: "fws_alloc";
  readonly deallocatorExport: "fws_dealloc";
  readonly reallocatorExport: "fws_realloc";
  readonly safetyModel?: "region-arc-checked-linear";
}

/**
 * Binary encoding representation formats for primitive and compound values.
 */
export type FlintValueRepresentation =
  | "bool-i32"
  | "f32"
  | "f64"
  | "i32"
  | "i64"
  | "pointer-length-u32"
  | "pointer-length-u64"
  | "u32"
  | "u64"
  | "unit";

/** Individual foreign function descriptor within an ABI manifest foreign capability. */
export interface FlintForeignFunction {
  readonly symbol: string;
  readonly parameters: readonly {
    readonly name: string;
    readonly cType: string;
    readonly wasmType: string;
  }[];
  readonly result: { readonly cType: string; readonly wasmType: string };
}

/** Foreign capability descriptor recorded in the ABI manifest. */
export interface FlintForeignCapability {
  readonly library: string;
  readonly callingConvention: "wasm-c-abi";
  readonly memoryModel: "shared" | "multi-memory-segregated";
  readonly functions: readonly FlintForeignFunction[];
}

export type FlintLinkMode = "static" | "dynamic";
export type FlintLinkProfile =
  | "standard"
  | "minimal"
  | "full"
  | "dynamic"
  | "static"
  | "monolithic"
  | "cross-package";
export type FlintLinkOptimizationProfile =
  | "standard"
  | "size"
  | "speed"
  | "debug"
  | "dynamic-conservative"
  | "static-thinlto"
  | "static-aggressive";
export type FlintSoNBoundsChecks =
  "runtime" | "proven-safe" | "excluded-by-profile";
export type FlintAsyncCapability = "scheduler.microtask" | "scheduler.worker";

export interface FlintTargetFeatures {
  readonly atomics?: boolean;
  readonly memory64?: boolean;
  readonly simd?: boolean;
  readonly tailCall?: boolean;
  readonly threads?: boolean;
}

export interface FlintAsyncCompilationContract {
  readonly capabilities: readonly string[];
  readonly deterministic: boolean;
  readonly taskIdRepresentation: "u32" | "u64";
  readonly messageRepresentation: "owned-bytes";
  readonly ordering: "sequence";
}

/**
 * Opt-in Runtime Type Information (RTTI) metadata table in the ABI manifest.
 */
export interface FlintRttiMetadata {
  readonly enabled: boolean;
  readonly types: readonly FlintTypeInfo[];
}

/**
 * Memory layout descriptor for a single field within a struct or enum variant.
 */
export interface FlintAggregateFieldLayout {
  readonly name: string;
  readonly type: string;
  readonly offset: number;
  readonly size: number;
  readonly alignment: number;
  readonly ownership: FlintOwnership;
}

/**
 * Binary layout and alignment descriptor for an aggregate struct or enum type.
 */
export interface FlintAggregateLayout {
  readonly name: string;
  readonly kind: "struct" | "enum";
  readonly record?: true;
  readonly size: number;
  readonly alignment: number;
  readonly discriminantSize?: 1 | 2 | 4;
  readonly fields: readonly FlintAggregateFieldLayout[];
  readonly immutable: true;
}

/**
 * Exported enum metadata describing variant names and integer tags.
 */
export interface FlintEnumMetadata {
  readonly name: string;
  readonly exported: boolean;
  readonly representation: "i32";
  readonly variants: readonly {
    readonly name: string;
    readonly value: number;
  }[];
}

/**
 * Layout and representation specification for arrays and vectors.
 */
export interface FlintCollectionLayout {
  readonly type: string;
  readonly kind: "array" | "vector";
  readonly elementType: string;
  readonly length?: number;
  readonly representation: "contiguous" | "owned-handle";
  readonly ownership: FlintOwnership;
}

/**
 * Monomorphized specialization mapping for generic types.
 */
export interface FlintSpecialization {
  readonly id: string;
  readonly generic?: string;
  readonly arguments: readonly (string | FlintTypeName)[];
  readonly representation?: "monomorphized" | "descriptor-boundary";
}

/**
 * Boundary descriptor for iterators crossing module or generic boundaries.
 */
export interface FlintIteratorBoundaryDescriptor {
  readonly id: string;
  readonly generic: string;
  readonly elementType: string;
  readonly nextFunction: string;
  readonly representation: "descriptor-boundary";
  readonly ownership: FlintOwnership;
}

/**
 * Source import declaration representing a dependency on another Flint module.
 */
export interface FlintSourceImport {
  readonly source: string;
  readonly alias: string;
  readonly resolvedModuleId?: string;
  readonly linkMode?: FlintLinkMode;
  readonly exports?: readonly FlintAbiFunction[];
}

/** Manifest-visible binding information for an explicitly dynamic module. */
export interface FlintDynamicModuleBinding {
  readonly moduleId: string;
  readonly alias: string;
  readonly exports: readonly FlintAbiFunction[];
}

/** Stable metadata consumed by dynamic loaders and their dispatch caches. */
export interface FlintDynamicLinkMetadata {
  readonly artifactId: string;
  readonly manifestHash: string;
  readonly modules: readonly FlintDynamicModuleBinding[];
}

/**
 * Export specification for a function linked across multi-module boundaries.
 */
export interface FlintLinkedExport {
  readonly name: string;
  readonly moduleId: string;
  readonly parameters: readonly FlintAbiParameter[];
  readonly result: FlintPrimitiveType;
  readonly resultReference?: string;
  readonly resultArguments?: readonly FlintTypeName[];
  readonly resultLength?: number;
  readonly resultOwnership?: FlintOwnership;
}

export interface FlintStandardLibraryDescriptor {
  readonly version: string;
  readonly hash: string;
}

/**
 * Canonical ABI manifest describing module interface, memory, layouts, and capabilities.
 */
export interface FlintAbiManifest {
  readonly format: "forge-web-script-module";
  readonly languageVersion: FlintLanguageVersion;
  readonly abiVersion: FlintAbiVersion;
  readonly moduleName: string;
  readonly exports: readonly FlintAbiFunction[];
  readonly imports: readonly FlintHostImport[];
  readonly sourceImports: readonly FlintSourceImport[];
  readonly foreignCapabilities?: readonly FlintForeignCapability[];
  readonly multiMemory?: boolean;
  readonly graphHash?: string;
  readonly projectRoot?: string;
  readonly linkMode?: FlintLinkMode;
  readonly linkProfile?: FlintLinkProfile;
  readonly optimizationProfile?: FlintLinkOptimizationProfile;
  readonly linkedExports?: readonly FlintLinkedExport[];
  readonly dynamicLinkMetadata?: FlintDynamicLinkMetadata;
  readonly requiredCapabilities: readonly string[];
  readonly memory: FlintMemoryLayout;
  readonly valueRepresentations: Readonly<
    Record<FlintPrimitiveType, FlintValueRepresentation>
  >;
  readonly trapModel: "explicit-trap";
  readonly standardLibrary: FlintStandardLibraryDescriptor;
  readonly aggregateLayouts: readonly FlintAggregateLayout[];
  readonly enumDeclarations: readonly FlintEnumMetadata[];
  readonly collectionLayouts: readonly FlintCollectionLayout[];
  readonly specializations: readonly FlintSpecialization[];
  readonly iteratorDescriptors: readonly FlintIteratorBoundaryDescriptor[];
  readonly async?: FlintAsyncCompilationContract;
  readonly targetFeatures?: FlintTargetFeatures;
  readonly boundsChecks: FlintSoNBoundsChecks;
  readonly reflection?: FlintRttiMetadata;
}

/** Structural representation of a Flint ABI Manifest alias. */
export type FlintCAbiManifest =
  | FlintAbiManifest
  | {
      readonly format?: string;
      readonly languageVersion?: string;
      readonly abiVersion?: string;
      readonly entryModule?: string;
      readonly exports?: readonly unknown[];
      readonly imports?: readonly unknown[];
      readonly memory?: unknown;
      readonly [key: string]: unknown;
    };

/**
 * Encodes arbitrary JavaScript primitive, array, and object data structures into canonical binary CBOR.
 */
export function encodeCbor(value: unknown): Uint8Array {
  const chunks: number[] = [];

  function encodeItem(item: unknown): void {
    if (item === null || item === undefined) {
      chunks.push(0xf6);
      return;
    }

    if (typeof item === "boolean") {
      chunks.push(item ? 0xf5 : 0xf4);
      return;
    }

    if (typeof item === "number") {
      if (Number.isInteger(item)) {
        if (item >= 0) {
          encodeUnsigned(0, item);
        } else {
          encodeUnsigned(1, -1 - item);
        }
      } else {
        const buffer = new ArrayBuffer(8);
        new DataView(buffer).setFloat64(0, item, false);
        chunks.push(0xfb, ...new Uint8Array(buffer));
      }
      return;
    }

    if (typeof item === "bigint") {
      if (item >= 0n) {
        encodeUnsignedBigInt(0, item);
      } else {
        encodeUnsignedBigInt(1, -1n - item);
      }
      return;
    }

    if (typeof item === "string") {
      const bytes = new TextEncoder().encode(item);
      encodeUnsigned(3, bytes.byteLength);
      chunks.push(...bytes);
      return;
    }

    if (item instanceof Uint8Array) {
      encodeUnsigned(2, item.byteLength);
      chunks.push(...item);
      return;
    }

    if (Array.isArray(item)) {
      encodeUnsigned(4, item.length);
      for (const element of item) {
        encodeItem(element);
      }
      return;
    }

    if (typeof item === "object") {
      const entries = Object.entries(item as Record<string, unknown>).filter(
        ([, value_]) => value_ !== undefined,
      );
      entries.sort(([leftKey], [rightKey]) =>
        leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0,
      );

      encodeUnsigned(5, entries.length);
      for (const [key, value_] of entries) {
        encodeItem(key);
        encodeItem(value_);
      }
      return;
    }

    throw new TypeError(`Unsupported CBOR type: ${typeof item}`);
  }

  function encodeUnsigned(major: number, value: number): void {
    const majorBits = major << 5;
    if (value < 24) {
      chunks.push(majorBits | value);
    } else if (value < 256) {
      chunks.push(majorBits | 24, value);
    } else if (value < 65_536) {
      chunks.push(majorBits | 25, (value >> 8) & 0xff, value & 0xff);
    } else if (value < 4_294_967_296) {
      chunks.push(
        majorBits | 26,
        (value >>> 24) & 0xff,
        (value >>> 16) & 0xff,
        (value >>> 8) & 0xff,
        value & 0xff,
      );
    } else {
      encodeUnsignedBigInt(major, BigInt(value));
    }
  }

  function encodeUnsignedBigInt(major: number, value: bigint): void {
    const majorBits = major << 5;
    const view = new DataView(new ArrayBuffer(8));
    view.setBigUint64(0, value, false);
    chunks.push(majorBits | 27, ...new Uint8Array(view.buffer));
  }

  encodeItem(value);
  return new Uint8Array(chunks);
}

export interface CborDecodeOptions {
  readonly strictCanonical?: boolean;
}

export function decodeCbor<T = unknown>(
  bytes: Uint8Array,
  options: CborDecodeOptions = {},
): T {
  let offset = 0;

  function decodeItem(depth = 0): unknown {
    if (depth > 64) {
      throw new RangeError("Exceeded maximum CBOR nesting depth of 64");
    }
    if (offset >= bytes.length) {
      throw new RangeError("Unexpected end of CBOR input buffer");
    }

    const initialByte = bytes[offset++];
    if (initialByte === undefined)
      throw new RangeError("Unexpected EOF reading CBOR byte");
    const majorType = initialByte >> 5;
    const additionalInfo = initialByte & 0x1f;

    function readArgument(): number | bigint {
      if (additionalInfo < 24) {
        return additionalInfo;
      }
      if (additionalInfo === 24) {
        if (offset >= bytes.length)
          throw new RangeError("CBOR payload truncated");
        const val = bytes[offset++];
        if (val === undefined) throw new RangeError("CBOR truncated");
        return val;
      }
      if (additionalInfo === 25) {
        if (offset + 2 > bytes.length)
          throw new RangeError("CBOR payload truncated");
        const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 2);
        offset += 2;
        return view.getUint16(0, false);
      }
      if (additionalInfo === 26) {
        if (offset + 4 > bytes.length)
          throw new RangeError("CBOR payload truncated");
        const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 4);
        offset += 4;
        return view.getUint32(0, false);
      }
      if (additionalInfo === 27) {
        if (offset + 8 > bytes.length)
          throw new RangeError("CBOR payload truncated");
        const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
        offset += 8;
        return view.getBigUint64(0, false);
      }
      throw new Error(`Unsupported CBOR additional info: ${additionalInfo}`);
    }

    switch (majorType) {
      case 0: {
        return readArgument();
      }
      case 1: {
        const rawArg = readArgument();
        if (typeof rawArg === "bigint") {
          return -1n - rawArg;
        }
        return -1 - rawArg;
      }
      case 2: {
        const length = Number(readArgument());
        if (offset + length > bytes.length)
          throw new RangeError("CBOR byte string truncated");
        const slice = bytes.subarray(offset, offset + length);
        offset += length;
        return slice;
      }
      case 3: {
        const length = Number(readArgument());
        if (offset + length > bytes.length)
          throw new RangeError("CBOR text string truncated");
        const slice = bytes.subarray(offset, offset + length);
        offset += length;
        return new TextDecoder().decode(slice);
      }
      case 4: {
        const length = Number(readArgument());
        const array: unknown[] = [];
        for (let i = 0; i < length; i++) {
          array.push(decodeItem(depth + 1));
        }
        return array;
      }
      case 5: {
        const length = Number(readArgument());
        const object: Record<string, unknown> = {};
        let previousKey: string | undefined;

        for (let i = 0; i < length; i++) {
          const keyItem = decodeItem(depth + 1);
          if (typeof keyItem !== "string") {
            throw new TypeError("CBOR map keys must decode as text strings");
          }
          if (
            keyItem === "__proto__" ||
            keyItem === "constructor" ||
            keyItem === "prototype"
          ) {
            throw new TypeError(
              `Malicious prototype pollution key detected: ${keyItem}`,
            );
          }
          if (
            options.strictCanonical &&
            previousKey !== undefined &&
            previousKey >= keyItem
          ) {
            throw new TypeError("Non-canonical CBOR map key ordering detected");
          }
          previousKey = keyItem;
          object[keyItem] = decodeItem(depth + 1);
        }
        return object;
      }
      case 7: {
        if (additionalInfo === 20) return false;
        if (additionalInfo === 21) return true;
        if (additionalInfo === 22) return null;
        if (additionalInfo === 23) return undefined;
        if (additionalInfo === 27) {
          if (offset + 8 > bytes.length)
            throw new RangeError("CBOR payload truncated");
          const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
          offset += 8;
          return view.getFloat64(0, false);
        }
        throw new Error(
          `Unsupported CBOR simple/float value: ${additionalInfo}`,
        );
      }
      default: {
        throw new Error(`Unsupported CBOR major type: ${majorType}`);
      }
    }
  }

  const result = decodeItem(0) as T;
  if (offset !== bytes.length) {
    throw new Error(
      `Unconsumed trailing bytes in CBOR payload: ${bytes.length - offset} bytes remain`,
    );
  }
  return result;
}

export function encodeCborAbiManifest<T extends object = FlintCAbiManifest>(
  manifest: T,
): Uint8Array {
  return encodeCbor(manifest);
}

export function decodeCborAbiManifest<T extends object = FlintCAbiManifest>(
  bytes: Uint8Array,
  options?: CborDecodeOptions,
): T {
  return decodeCbor<T>(bytes, options);
}

/**
 * Normalizes an arbitrary ABI manifest object into a canonical key-sorted data structure.
 */
export function canonicalizeAbiManifest<T extends object>(manifest: T): T {
  function canonicalizeValue(val: unknown): unknown {
    if (val === null || val === undefined || typeof val !== "object") {
      return val;
    }
    if (Array.isArray(val)) {
      return val.map(canonicalizeValue);
    }
    const entries = Object.entries(val as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([leftKey], [rightKey]) =>
        leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0,
      );

    const result: Record<string, unknown> = {};
    for (const [k, v] of entries) {
      result[k] = canonicalizeValue(v);
    }
    return result;
  }

  return canonicalizeValue(manifest) as T;
}

/**
 * Validates structural invariants of a Flint ABI manifest.
 */
export function validateAbiManifest(manifest: FlintCAbiManifest): {
  readonly valid: boolean;
  readonly errors: readonly string[];
} {
  const errors: string[] = [];

  if (manifest.format !== "forge-web-script-module") {
    errors.push(
      `Invalid manifest format: expected 'forge-web-script-module', received '${String(manifest.format)}'`,
    );
  }

  if (
    typeof manifest.languageVersion !== "string" ||
    !manifest.languageVersion
  ) {
    errors.push("Missing or invalid languageVersion string in ABI manifest");
  }

  if (typeof manifest.abiVersion !== "string" || !manifest.abiVersion) {
    errors.push("Missing or invalid abiVersion string in ABI manifest");
  }

  if (manifest.memory !== undefined && typeof manifest.memory !== "object") {
    errors.push("Invalid memory layout section in ABI manifest");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
