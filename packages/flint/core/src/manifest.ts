import { flintDefaultPassingMode, flintTypeNameToString } from './ast.js';
import { createFlintIteratorBoundaryDescriptor } from './generics.js';
import {
  DEFAULT_FORGE_WEB_SCRIPT_STANDARD_LIBRARY_IDENTITY,
  type FlintStandardLibraryIdentity,
} from './stdlib/regex.js';
import { createMonomorphizationCache, primitiveLayout } from './type-algebra.js';

import type {
  FlintModule,
  FlintPrimitiveType,
  FlintOwnership,
  FlintParameter,
  FlintStatement,
  FlintTypeName,
} from './ast.js';
import type {
  FlintAsyncCapability,
  FlintAsyncCompilationContract,
  FlintLinkOptimizationProfile,
  FlintLinkProfile,
  FlintTargetFeatures,
} from './contracts.js';
import type { FlintLinkMode } from './graph.js';
import type { FlintSoNBoundsChecks } from './son-ir.js';

/**
 * Current language specification version supported by the Flint compiler.
 */
export const FLINT_LANGUAGE_VERSION = '1.0' as const;

/**
 * Binary ABI manifest format version emitted by the compiler.
 */
export const FLINT_ABI_VERSION = '1.2' as const;

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
  /** Source-level aggregate or generic reference retained beside the scalar carrier. */
  readonly reference?: string;
  readonly arguments?: readonly FlintTypeName[];
  readonly length?: number;
  readonly ownership?: FlintOwnership;
  /** Explicit or recursively derived source passing contract. */
  readonly passing?: 'value' | 'immutable-reference' | 'mutable-reference';
  readonly mutable?: true;
  readonly referenceMode?: 'ref' | 'mut-ref';
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
  readonly resultPassing?: 'value' | 'immutable-reference' | 'mutable-reference';
  readonly resultReferenceMode?: 'ref' | 'mut-ref';
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
  readonly addressType: 'u32' | 'u64';
  readonly ownership: 'caller-owned';
  readonly stringEncoding: 'utf8';
  readonly byteArrayRepresentation: 'pointer-length';
  readonly allocatorExport: 'fws_alloc';
  readonly deallocatorExport: 'fws_dealloc';
  readonly reallocatorExport: 'fws_realloc';
  /** Raw allocator calls remain caller-owned; scoped values use this checked model. */
  readonly safetyModel?: 'region-arc-checked-linear';
}

/**
 * Binary encoding representation formats for primitive and compound values.
 */
export type FlintValueRepresentation =
  'bool-i32' | 'f32' | 'f64' | 'i32' | 'i64' | 'pointer-length-u32' | 'pointer-length-u64' | 'u32' | 'u64' | 'unit';

/** Individual foreign function descriptor within an ABI manifest foreign capability. */
export interface FlintForeignFunction {
  readonly symbol: string;
  readonly parameters: readonly { readonly name: string; readonly cType: string; readonly wasmType: string }[];
  readonly result: { readonly cType: string; readonly wasmType: string };
}

/** Foreign capability descriptor recorded in the ABI manifest. */
export interface FlintForeignCapability {
  readonly library: string;
  readonly callingConvention: 'wasm-c-abi';
  readonly memoryModel: 'shared' | 'multi-memory-segregated';
  readonly functions: readonly FlintForeignFunction[];
}

/**
 * Canonical ABI manifest describing module interface, memory, layouts, and capabilities.
 */
export interface FlintAbiManifest {
  readonly format: 'forge-web-script-module';
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
  readonly valueRepresentations: Readonly<Record<FlintPrimitiveType, FlintValueRepresentation>>;
  readonly trapModel: 'explicit-trap';
  readonly standardLibrary: FlintStandardLibraryIdentity;
  /** Canonically ordered layouts for immutable struct and tagged enum values. */
  readonly aggregateLayouts: readonly FlintAggregateLayout[];
  /** Stable integer enum metadata is published separately from scalar function exports. */
  readonly enumDeclarations: readonly FlintEnumMetadata[];
  /** Collection representations used at descriptor boundaries and aggregate fields. */
  readonly collectionLayouts: readonly FlintCollectionLayout[];
  /** Concrete generic instantiations selected by the frontend. */
  readonly specializations: readonly FlintSpecialization[];
  /** Iterator/interface descriptors remain explicit at generic boundaries. */
  readonly iteratorDescriptors: readonly FlintIteratorBoundaryDescriptor[];
  /** Async scheduling is explicit and crosses the host only through capabilities. */
  readonly async?: FlintAsyncCompilationContract;
  /** Target features are part of the loader-visible ABI identity. */
  readonly targetFeatures?: FlintTargetFeatures;
  /** Runtime bounds checks are the default and remain part of the manifest identity. */
  readonly boundsChecks: FlintSoNBoundsChecks;
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
  readonly kind: 'struct' | 'enum';
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
  readonly representation: 'i32';
  readonly variants: readonly { readonly name: string; readonly value: number }[];
}

/**
 * Layout and representation specification for arrays and vectors.
 */
export interface FlintCollectionLayout {
  readonly type: string;
  readonly kind: 'array' | 'vector';
  readonly elementType: string;
  readonly length?: number;
  readonly representation: 'contiguous' | 'owned-handle';
  readonly ownership: FlintOwnership;
}

/**
 * Monomorphized specialization mapping for generic types.
 */
export interface FlintSpecialization {
  readonly id: string;
  readonly generic: string;
  readonly arguments: readonly string[];
  readonly representation: 'monomorphized' | 'descriptor-boundary';
}

/**
 * Boundary descriptor for iterators crossing module or generic boundaries.
 */
export interface FlintIteratorBoundaryDescriptor {
  readonly id: string;
  readonly generic: string;
  readonly elementType: string;
  readonly nextFunction: string;
  readonly representation: 'descriptor-boundary';
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
  /** Export signatures used to type an explicitly dynamic source-module link. */
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

/**
 * Structural subset of function declarations used during ABI conversion.
 */
type FunctionDeclaration = {
  readonly name: string;
  readonly parameters: readonly FlintParameter[];
  readonly result: FlintTypeName;
};

/**
 * Converts an internal AST function declaration into an ABI export/import function descriptor.
 *
 * @param declaration - Function declaration AST node.
 * @param module - Optional enclosing module used to resolve aggregate reference names.
 * @returns Serialized ABI function representation.
 */
// skipcq: JS-R1005
function toAbiFunction(declaration: FunctionDeclaration, module?: FlintModule): FlintAbiFunction {
  // skipcq: JS-D1001
  const referenceOf = (type: { readonly name: FlintPrimitiveType; readonly reference?: string }): string | undefined =>
    type.reference ?? (module?.structs.some(({ name }) => name === type.name) ? type.name : undefined);
  // skipcq: JS-D1001
  const carrierType = (type: {
    readonly name: FlintPrimitiveType;
    readonly reference?: string;
  }): FlintPrimitiveType => {
    const reference = referenceOf(type);
    return reference === undefined ? type.name : 'i32';
  };
  return {
    name: declaration.name,
    // skipcq: JS-R1005
    parameters: declaration.parameters.map((parameter) => ({
      name: parameter.name,
      type: carrierType(parameter.type),
      ...(referenceOf(parameter.type) === undefined ? {} : { reference: referenceOf(parameter.type) }),
      ...(parameter.type.arguments === undefined ? {} : { arguments: parameter.type.arguments }),
      ...(parameter.type.length === undefined ? {} : { length: parameter.type.length }),
      ...(parameter.type.reference === 'Array'
        ? { ownership: parameter.type.ownership ?? ('owned' as const) }
        : parameter.type.ownership === undefined
          ? {}
          : { ownership: parameter.type.ownership }),
      passing: flintDefaultPassingMode(parameter.type, module),
      ...(parameter.mutable === true ? { mutable: true as const } : {}),
      ...(parameter.type.referenceMode === undefined ? {} : { referenceMode: parameter.type.referenceMode }),
    })),
    result: carrierType(declaration.result),
    ...(referenceOf(declaration.result) === undefined ? {} : { resultReference: referenceOf(declaration.result) }),
    ...(declaration.result.arguments === undefined ? {} : { resultArguments: declaration.result.arguments }),
    ...(declaration.result.length === undefined ? {} : { resultLength: declaration.result.length }),
    ...(declaration.result.ownership === undefined ? {} : { resultOwnership: declaration.result.ownership }),
    ...(flintDefaultPassingMode(declaration.result, module) === 'value'
      ? {}
      : { resultPassing: flintDefaultPassingMode(declaration.result, module) }),
    ...(declaration.result.referenceMode === undefined
      ? {}
      : { resultReferenceMode: declaration.result.referenceMode }),
  };
}

/**
 * Serializes a Flint type name into a canonical string key.
 *
 * @param type - AST type name.
 * @returns Normalized type string.
 */
function typeKey(type: FlintTypeName): string {
  return flintTypeNameToString(type);
}

/**
 * Extracts generic iterator boundary descriptors from iterable functions in a module.
 *
 * @param module - Module AST to inspect.
 * @returns List of discovered iterator boundary descriptors.
 */
function iteratorDescriptors(module: FlintModule): readonly FlintIteratorBoundaryDescriptor[] {
  return module.functions.flatMap((declaration) => {
    if (!declaration.iterable || declaration.result.arguments?.[0] === undefined) return [];
    return [
      createFlintIteratorBoundaryDescriptor(
        declaration.result.reference ?? declaration.result.name,
        declaration.result.arguments[0],
        `${declaration.name}.next`,
        declaration.result.ownership,
      ),
    ];
  });
}

/**
 * Computes memory byte size and alignment for aggregate field carriers.
 *
 * @param type - AST type name of the field.
 * @returns Size and alignment specification.
 */
// skipcq: JS-R1005
function fieldCarrierSize(type: FlintTypeName): { readonly size: number; readonly alignment: number } {
  // Seed ABI keeps non-primitive aggregates as 4-byte handles; primitives use TypeAlgebra sizes.
  if (type.reference !== undefined || type.arguments !== undefined || type.referenceMode !== undefined) {
    return { size: 4, alignment: 4 };
  }
  if (type.length !== undefined) {
    const element = primitiveLayout(type.name);
    return { size: Math.max(element.size, 4) * type.length, alignment: Math.max(element.alignment, 4) };
  }
  const primitive = primitiveLayout(type.name);
  return { size: primitive.size, alignment: primitive.alignment === 0 ? 1 : primitive.alignment };
}

/**
 * Computes binary memory layout offsets and alignments for all structs and enums declared in a module.
 *
 * @param module - Module AST containing structs and enums.
 * @returns Sorted collection of aggregate layouts.
 */
function aggregateLayouts(module: FlintModule): readonly FlintAggregateLayout[] {
  const structs = module.structs.map((declaration) => {
    let offset = 0;
    let alignment = 1;
    const fields = declaration.fields.map((field) => {
      const carrier = fieldCarrierSize(field.type);
      const size = carrier.size;
      const fieldAlignment = carrier.alignment;
      const alignedOffset = fieldAlignment <= 1 ? offset : (offset + fieldAlignment - 1) & ~(fieldAlignment - 1);
      const layout = {
        name: field.name,
        type: typeKey(field.type),
        offset: alignedOffset,
        size,
        alignment: fieldAlignment,
        ownership: field.ownership ?? ('owned' as const),
      };
      offset = alignedOffset + size;
      alignment = Math.max(alignment, fieldAlignment);
      return layout;
    });
    const structAlignment = Math.max(alignment, 1);
    const size = structAlignment <= 1 ? offset : (offset + structAlignment - 1) & ~(structAlignment - 1);
    return {
      name: declaration.name,
      kind: 'struct' as const,
      ...(declaration.record ? { record: true as const } : {}),
      size,
      alignment: structAlignment,
      fields,
      immutable: true as const,
    };
  });
  const enums = module.enums.map((declaration) => {
    let maxVariantAlignment = 4;
    const fields = declaration.variants.flatMap((variant) => {
      let offset = 4;
      return variant.fields.map((field) => {
        const carrier = fieldCarrierSize(field.type);
        const size = Math.max(carrier.size, 4);
        const fieldAlignment = carrier.alignment;
        maxVariantAlignment = Math.max(maxVariantAlignment, fieldAlignment);
        const alignedOffset = fieldAlignment <= 1 ? offset : (offset + fieldAlignment - 1) & ~(fieldAlignment - 1);
        const layout = {
          name: `${variant.name}.${field.name}`,
          type: typeKey(field.type),
          offset: alignedOffset,
          size,
          alignment: fieldAlignment,
          ownership: 'owned' as const,
        };
        offset = alignedOffset + size;
        return layout;
      });
    });
    const enumSize = Math.max(4, ...fields.map(({ offset, size }) => offset + size));
    const alignedEnumSize =
      maxVariantAlignment <= 1 ? enumSize : (enumSize + maxVariantAlignment - 1) & ~(maxVariantAlignment - 1);
    return {
      name: declaration.name,
      kind: 'enum' as const,
      size: alignedEnumSize,
      alignment: maxVariantAlignment,
      discriminantSize: 4 as const,
      fields,
      immutable: true as const,
    };
  });
  return [...structs, ...enums].toSorted((left, right) => left.name.localeCompare(right.name));
}

/**
 * Discovers and builds monomorphized specializations for generic usages within a module.
 *
 * @param module - Module AST to analyze.
 * @returns Monomorphized specialization entries.
 */
function collectSpecializations(module: FlintModule): readonly FlintSpecialization[] {
  const { cache } = createMonomorphizationCache(module);
  return cache.collectFromModule(module).map((entry) => entry.specialization);
}

/**
 * Traverses branching statement blocks (if and switch) to collect type annotations.
 *
 * @param statement - Branching statement to inspect.
 * @param types - Collector array accumulating discovered type names.
 */
function collectBranchStatementTypes(
  statement: Extract<FlintStatement, { kind: 'if' | 'switch' }>,
  types: FlintTypeName[],
): void {
  if (statement.kind === 'if') {
    collectStatementTypes(statement.consequent, types);
    if (statement.alternate !== undefined) {
      collectStatementTypes(statement.alternate, types);
    }
    return;
  }
  for (const arm of statement.cases) {
    collectStatementTypes(arm.body, types);
  }
  if (statement.defaultCase !== undefined) {
    collectStatementTypes(statement.defaultCase, types);
  }
}

/**
 * Traverses statement hierarchies to collect type annotations for collection discovery.
 *
 * @param statements - Sequence of statements to scan.
 * @param types - Collector array accumulating discovered type names.
 */
// skipcq: JS-R1005
function collectStatementTypes(statements: readonly FlintStatement[], types: FlintTypeName[]): void {
  for (const statement of statements) {
    switch (statement.kind) {
      case 'let': {
        types.push(statement.type);
        break;
      }
      case 'if':
      case 'switch': {
        collectBranchStatementTypes(statement, types);
        break;
      }
      case 'while':
      case 'do-while':
      case 'for':
      case 'iterator-loop': {
        collectStatementTypes(statement.body, types);
        break;
      }
      default: {
        break;
      }
    }
  }
}

/**
 * Scans all struct fields, function signatures, and statement variables to derive collection layouts.
 *
 * @param module - Module AST to scan.
 * @returns Canonical sorted list of array and vector collection layouts.
 */
function collectionLayouts(module: FlintModule): readonly FlintCollectionLayout[] {
  const types: FlintTypeName[] = [];
  for (const declaration of module.structs) {
    for (const field of declaration.fields) {
      types.push(field.type);
    }
  }
  for (const declaration of module.functions) {
    types.push(declaration.result);
    for (const parameter of declaration.parameters) {
      types.push(parameter.type);
    }
    collectStatementTypes(declaration.body, types);
  }
  // skipcq: JS-R1005
  const layouts = types.flatMap((type) => {
    const kind: FlintCollectionLayout['kind'] | undefined =
      type.reference === 'Array' ? 'array' : type.reference === 'Vector' ? 'vector' : undefined;
    if (kind === undefined || type.arguments?.[0] === undefined) return [];
    return [
      {
        type: typeKey(type),
        kind,
        elementType: typeKey(type.arguments[0]),
        ...(type.length === undefined ? {} : { length: type.length }),
        representation: kind === 'array' ? ('contiguous' as const) : ('owned-handle' as const),
        ownership: type.ownership ?? ('owned' as const),
      },
    ];
  });
  return [...new Map(layouts.map((layout) => [layout.type, layout])).values()].toSorted((left, right) =>
    left.type.localeCompare(right.type),
  );
}

/**
 * Optional parameters accepted by createFlintAbiManifest for custom compilation environments.
 */
export interface FlintAbiManifestOptions {
  readonly graphHash?: string;
  readonly projectRoot?: string;
  readonly linkMode?: FlintLinkMode;
  readonly linkProfile?: FlintLinkProfile;
  readonly optimizationProfile?: FlintLinkOptimizationProfile;
  readonly dynamicLinkMetadata?: FlintDynamicLinkMetadata;
  readonly sourceImports?: readonly FlintSourceImport[];
  readonly linkedExports?: readonly FlintLinkedExport[];
  readonly standardLibrary?: FlintStandardLibraryIdentity;
  readonly specializations?: readonly FlintSpecialization[];
  readonly iteratorDescriptors?: readonly FlintIteratorBoundaryDescriptor[];
  readonly async?: FlintAsyncCompilationContract;
  readonly targetFeatures?: FlintTargetFeatures | readonly string[];
  readonly boundsChecks?: FlintSoNBoundsChecks;
}

const asyncCapabilities = new Set<string>(['scheduler.microtask', 'scheduler.worker']);

/**
 * Checks whether an imported capability string is an asynchronous host capability.
 *
 * @param capability - Imported capability identifier.
 * @returns True if capability matches an asynchronous scheduler primitive.
 */
function isAsyncCapability(capability: string): capability is FlintAsyncCapability {
  return asyncCapabilities.has(capability);
}

/**
 * Constructs the async scheduling contract metadata for the ABI manifest.
 *
 * @param module - Compiled module AST.
 * @param configured - Optional user-configured async compilation contract.
 * @returns Canonical FlintAsyncCompilationContract.
 */
function asyncContract(
  module: FlintModule,
  configured: FlintAsyncCompilationContract | undefined,
): FlintAsyncCompilationContract {
  if (configured !== undefined) {
    return {
      ...configured,
      capabilities: [...new Set(configured.capabilities)].toSorted(),
    };
  }
  return {
    capabilities: module.imports
      .map(({ capability }) => capability)
      .filter(isAsyncCapability)
      .toSorted(),
    deterministic: true,
    taskIdRepresentation: 'u32',
    messageRepresentation: 'owned-bytes',
    ordering: 'sequence',
  };
}

/**
 * Extracts and canonicalizes enabled target features from optional compiler manifest options.
 *
 * @param features - Input target features configuration.
 * @returns Canonicalized target features mapping with enabled entries.
 */
// skipcq: JS-R1005
function extractEnabledTargetFeatures(features?: FlintTargetFeatures | readonly string[]): FlintTargetFeatures {
  if (!features) return {};
  if (Array.isArray(features)) {
    const list = features as readonly string[];
    return {
      ...(list.includes('atomics') ? { atomics: true } : {}),
      ...(list.includes('memory64') ? { memory64: true } : {}),
      ...(list.includes('simd') ? { simd: true } : {}),
      ...(list.includes('tailCall') ? { tailCall: true } : {}),
      ...(list.includes('threads') ? { threads: true } : {}),
    };
  }
  const config = features as FlintTargetFeatures;
  return {
    ...(config.atomics === true ? { atomics: true } : {}),
    ...(config.memory64 === true ? { memory64: true } : {}),
    ...(config.simd === true ? { simd: true } : {}),
    ...(config.tailCall === true ? { tailCall: true } : {}),
    ...(config.threads === true ? { threads: true } : {}),
  };
}

/**
 * Creates the memory layout specification for the ABI manifest.
 *
 * @param memory64 - True if 64-bit addressing is enabled.
 * @returns Initialized FlintMemoryLayout.
 */
function createMemoryLayout(memory64: boolean): FlintMemoryLayout {
  return {
    pageSize: 65_536,
    addressType: memory64 ? 'u64' : 'u32',
    ownership: 'caller-owned',
    stringEncoding: 'utf8',
    byteArrayRepresentation: 'pointer-length',
    allocatorExport: 'fws_alloc',
    deallocatorExport: 'fws_dealloc',
    reallocatorExport: 'fws_realloc',
    safetyModel: 'region-arc-checked-linear',
  };
}

/**
 * Creates the value representations mapping for the ABI manifest.
 *
 * @param memory64 - True if 64-bit addressing is enabled.
 * @returns Mapping of primitive types to their binary ABI representation.
 */
function createValueRepresentations(memory64: boolean): Readonly<Record<FlintPrimitiveType, FlintValueRepresentation>> {
  return {
    bool: 'bool-i32',
    bytes: memory64 ? 'pointer-length-u64' : 'pointer-length-u32',
    f32: 'f32',
    f64: 'f64',
    i32: 'i32',
    i64: 'i64',
    string: memory64 ? 'pointer-length-u64' : 'pointer-length-u32',
    u32: 'u32',
    u64: 'u64',
    unit: 'unit',
    u8: 'u32',
    i8: 'i32',
    c_char: 'i32',
    c_uchar: 'u32',
    c_short: 'i32',
    c_ushort: 'u32',
    c_int: 'i32',
    c_uint: 'u32',
    c_long: memory64 ? 'i64' : 'i32',
    c_ulong: memory64 ? 'u64' : 'u32',
    c_longlong: 'i64',
    c_ulonglong: 'u64',
    c_size: memory64 ? 'u64' : 'u32',
    c_ssize: memory64 ? 'i64' : 'i32',
    c_float: 'f32',
    c_double: 'f64',
    c_void: 'unit',
  };
}

/**
 * Extracts optional linkage and metadata attributes for inclusion in the ABI manifest.
 *
 * @param options - Manifest configuration options.
 * @returns Partial ABI manifest record with populated optional linkage fields.
 */
// skipcq: JS-R1005
function extractLinkOptions(options: FlintAbiManifestOptions): Partial<FlintAbiManifest> {
  return {
    ...(options.graphHash === undefined ? {} : { graphHash: options.graphHash }),
    ...(options.projectRoot === undefined ? {} : { projectRoot: options.projectRoot }),
    ...(options.linkMode === undefined ? {} : { linkMode: options.linkMode }),
    ...(options.linkProfile === undefined ? {} : { linkProfile: options.linkProfile }),
    ...(options.optimizationProfile === undefined ? {} : { optimizationProfile: options.optimizationProfile }),
    ...(options.linkedExports === undefined ? {} : { linkedExports: options.linkedExports }),
    ...(options.dynamicLinkMetadata === undefined ? {} : { dynamicLinkMetadata: options.dynamicLinkMetadata }),
  };
}

/**
 * Maps a Flint type AST node to its corresponding WebAssembly ABI value type.
 *
 * @param type - Type name AST node.
 * @param memory64 - True if target uses 64-bit pointers.
 * @returns Wasm value type name ('i32', 'i64', 'f32', 'f64', or 'void').
 */
function toWasmType(type: FlintTypeName, memory64: boolean): string {
  const name = type.reference ?? type.name;
  if (name === 'CPtr' || name === 'MutCPtr' || name === 'COpaquePtr') {
    return memory64 ? 'i64' : 'i32';
  }
  switch (name) {
    case 'f32':
    case 'c_float': {
      return 'f32';
    }
    case 'f64':
    case 'c_double': {
      return 'f64';
    }
    case 'i64':
    case 'u64':
    case 'c_longlong':
    case 'c_ulonglong': {
      return 'i64';
    }
    case 'c_long':
    case 'c_ulong':
    case 'c_size':
    case 'c_ssize': {
      return memory64 ? 'i64' : 'i32';
    }
    case 'unit':
    case 'c_void': {
      return 'void';
    }
    default: {
      return 'i32';
    }
  }
}

/**
 * Builds foreign capabilities manifest entries from declared module foreign capabilities.
 *
 * @param module - Compiled module AST.
 * @param memory64 - True if 64-bit addressing is enabled.
 * @returns Array of foreign capability descriptors, or undefined if none declared.
 */
function buildForeignCapabilities(
  module: FlintModule,
  memory64: boolean,
): readonly FlintForeignCapability[] | undefined {
  if (module.foreignCapabilities === undefined || module.foreignCapabilities.length === 0) {
    return undefined;
  }
  return module.foreignCapabilities.map((capability) => ({
    library: capability.library,
    callingConvention: capability.callingConvention,
    memoryModel: capability.memoryModel ?? 'shared',
    functions: capability.functions.map((function_) => ({
      symbol: function_.name,
      parameters: function_.parameters.map((parameter) => ({
        name: parameter.name,
        cType: flintTypeNameToString(parameter.type),
        wasmType: toWasmType(parameter.type, memory64),
      })),
      result: {
        cType: flintTypeNameToString(function_.result),
        wasmType: toWasmType(function_.result, memory64),
      },
    })),
  }));
}

/**
 * Generates a complete, deterministic ABI manifest for a compiled Flint module.
 *
 * @param module - Compiled module AST.
 * @param options - Optional compiler and linkage parameters.
 * @returns The structured FlintAbiManifest.
 */
// skipcq: JS-R1005
export function createFlintAbiManifest(module: FlintModule, options: FlintAbiManifestOptions = {}): FlintAbiManifest {
  const targetFeatures = extractEnabledTargetFeatures(options.targetFeatures);
  const memory64 = targetFeatures.memory64 === true;
  const foreignCapabilities = buildForeignCapabilities(module, memory64);
  return {
    format: 'forge-web-script-module',
    languageVersion: FLINT_LANGUAGE_VERSION,
    abiVersion: FLINT_ABI_VERSION,
    moduleName: module.name,
    exports: module.functions
      .filter((declaration) => declaration.exported)
      .map((declaration) => toAbiFunction(declaration, module))
      .toSorted((left, right) => left.name.localeCompare(right.name)),
    imports: module.imports.map((declaration) => ({
      capability: declaration.capability,
      alias: declaration.alias,
      function: toAbiFunction(
        {
          name: declaration.alias,
          parameters: declaration.parameters,
          result: declaration.result,
        },
        module,
      ),
    })),
    sourceImports: options.sourceImports ?? module.sourceImports.map(({ source, alias }) => ({ source, alias })),
    requiredCapabilities: [...new Set(module.imports.map((declaration) => declaration.capability))].toSorted(),
    ...(foreignCapabilities === undefined ? {} : { foreignCapabilities }),
    memory: createMemoryLayout(memory64),
    boundsChecks: options.boundsChecks ?? 'runtime',
    valueRepresentations: createValueRepresentations(memory64),
    trapModel: 'explicit-trap',
    standardLibrary: options.standardLibrary ?? DEFAULT_FORGE_WEB_SCRIPT_STANDARD_LIBRARY_IDENTITY,
    aggregateLayouts: aggregateLayouts(module),
    enumDeclarations: module.enums
      .map((declaration) => ({
        name: declaration.name,
        exported: declaration.exported,
        representation: 'i32' as const,
        variants: declaration.variants.map(({ name, tag }) => ({ name, value: tag })),
      }))
      .toSorted((left, right) => left.name.localeCompare(right.name)),
    collectionLayouts: collectionLayouts(module),
    specializations: (options.specializations ?? collectSpecializations(module)).toSorted((left, right) =>
      left.id.localeCompare(right.id),
    ),
    iteratorDescriptors: (options.iteratorDescriptors ?? iteratorDescriptors(module)).toSorted((left, right) =>
      left.id.localeCompare(right.id),
    ),
    async: asyncContract(module, options.async),
    ...(Object.keys(targetFeatures).length === 0 ? {} : { targetFeatures }),
    ...extractLinkOptions(options),
  };
}
