import {
  FLINT_ABI_VERSION,
  FLINT_LANGUAGE_VERSION,
  flintDefaultPassingMode,
  type FlintAbiVersion,
  type FlintLanguageVersion,
  type FlintModule,
  type FlintOwnership,
  type FlintPrimitiveType,
  type FlintTypeName,
} from "@mission-platform/flint-ast";
import type {
  FlintIteratorBoundaryDescriptor,
  FlintSpecialization,
  TargetPlatform,
} from "@mission-platform/flint-types";

export {
  FLINT_ABI_VERSION,
  FLINT_LANGUAGE_VERSION,
  type FlintAbiVersion,
  type FlintLanguageVersion,
};

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

export interface FlintHostImport {
  readonly capability: string;
  readonly alias: string;
  readonly function: FlintAbiFunction;
}

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

export interface FlintAbiForeignFunction {
  readonly name: string;
  readonly parameters: readonly FlintAbiParameter[];
  readonly result: FlintPrimitiveType;
  readonly resultReference?: string;
}

export interface FlintAbiForeignCapability {
  readonly abi: "C";
  readonly library: string;
  readonly callingConvention: "wasm-c-abi";
  readonly memoryModel?: "shared" | "multi-memory-segregated";
  readonly functions: readonly FlintAbiForeignFunction[];
}

export interface FlintAbiOpaqueForeignType {
  readonly name: string;
}

export interface FlintSourceImport {
  readonly source: string;
  readonly alias: string;
}

export interface FlintAbiStructField {
  readonly name: string;
  readonly type: FlintPrimitiveType;
  readonly reference?: string;
  readonly arguments?: readonly FlintTypeName[];
  readonly length?: number;
  readonly ownership?: FlintOwnership;
  readonly passing?: "value" | "immutable-reference" | "mutable-reference";
  readonly representation?: FlintValueRepresentation;
}

export interface FlintAbiStruct {
  readonly name: string;
  readonly record?: true;
  readonly fields: readonly FlintAbiStructField[];
}

export interface FlintAbiEnumVariant {
  readonly name: string;
  readonly tag: number;
  readonly fields: readonly FlintAbiParameter[];
}

export interface FlintAbiEnum {
  readonly name: string;
  readonly variants: readonly FlintAbiEnumVariant[];
}

export interface FlintAbiManifest {
  readonly schemaVersion: typeof FLINT_ABI_VERSION;
  readonly languageVersion: typeof FLINT_LANGUAGE_VERSION;
  readonly module: string;
  readonly target?: TargetPlatform;
  readonly memory: FlintMemoryLayout;
  readonly imports: readonly FlintHostImport[];
  readonly sourceImports: readonly FlintSourceImport[];
  readonly exports: readonly FlintAbiFunction[];
  readonly structs?: readonly FlintAbiStruct[];
  readonly enums?: readonly FlintAbiEnum[];
  readonly specializations?: readonly FlintSpecialization[];
  readonly iteratorDescriptors?: readonly FlintIteratorBoundaryDescriptor[];
  readonly foreignCapabilities?: readonly FlintAbiForeignCapability[];
  readonly opaqueForeignTypes?: readonly FlintAbiOpaqueForeignType[];
}

/**
 * Builds an ABI manifest from an AST module.
 */
export function buildFlintAbiManifest(
  module: FlintModule,
  moduleName = module.name,
): FlintAbiManifest {
  const exports: FlintAbiFunction[] = module.functions
    .filter((fn) => fn.exported)
    .map((fn) => ({
      name: fn.name,
      parameters: fn.parameters.map((p) => ({
        name: p.name,
        type: p.type.name,
        reference: p.type.reference,
        arguments: p.type.arguments,
        length: p.type.length,
        ownership: p.type.ownership,
        passing: flintDefaultPassingMode(p.type, module),
      })),
      result: fn.result.name,
      resultReference: fn.result.reference,
      resultArguments: fn.result.arguments,
      resultLength: fn.result.length,
      resultOwnership: fn.result.ownership,
      resultPassing: flintDefaultPassingMode(fn.result, module),
    }));

  const imports: FlintHostImport[] = module.imports.map((imp) => ({
    capability: imp.capability,
    alias: imp.alias,
    function: {
      name: imp.alias,
      parameters: imp.parameters.map((p) => ({
        name: p.name,
        type: p.type.name,
        reference: p.type.reference,
        arguments: p.type.arguments,
        length: p.type.length,
        ownership: p.type.ownership,
        passing: flintDefaultPassingMode(p.type, module),
      })),
      result: imp.result.name,
      resultReference: imp.result.reference,
      resultArguments: imp.result.arguments,
      resultLength: imp.result.length,
      resultOwnership: imp.result.ownership,
      resultPassing: flintDefaultPassingMode(imp.result, module),
    },
  }));

  const sourceImports: FlintSourceImport[] = module.sourceImports.map((s) => ({
    source: s.source,
    alias: s.alias,
  }));

  const structs: FlintAbiStruct[] = module.structs.map((st) => ({
    name: st.name,
    record: st.record,
    fields: st.fields.map((f) => ({
      name: f.name,
      type: f.type.name,
      reference: f.type.reference,
      arguments: f.type.arguments,
      length: f.type.length,
      ownership: f.type.ownership,
      passing: flintDefaultPassingMode(f.type, module),
    })),
  }));

  const enums: FlintAbiEnum[] = module.enums.map((en) => ({
    name: en.name,
    variants: en.variants.map((v) => ({
      name: v.name,
      tag: v.tag,
      fields: v.fields.map((f) => ({
        name: f.name,
        type: f.type.name,
        reference: f.type.reference,
        arguments: f.type.arguments,
        length: f.type.length,
        ownership: f.type.ownership,
        passing: flintDefaultPassingMode(f.type, module),
      })),
    })),
  }));

  return {
    schemaVersion: FLINT_ABI_VERSION,
    languageVersion: FLINT_LANGUAGE_VERSION,
    module: moduleName,
    memory: {
      pageSize: 65_536,
      addressType: "u32",
      ownership: "caller-owned",
      stringEncoding: "utf8",
      byteArrayRepresentation: "pointer-length",
      allocatorExport: "fws_alloc",
      deallocatorExport: "fws_dealloc",
      reallocatorExport: "fws_realloc",
    },
    imports,
    sourceImports,
    exports,
    structs,
    enums,
  };
}
