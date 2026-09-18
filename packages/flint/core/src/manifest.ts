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

export const FLINT_LANGUAGE_VERSION = '1.0' as const;
export const FLINT_ABI_VERSION = '1.2' as const;
export type FlintLanguageVersion = typeof FLINT_LANGUAGE_VERSION;
export type FlintAbiVersion = typeof FLINT_ABI_VERSION;

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
export interface FlintHostImport {
  readonly capability: string;
  readonly alias: string;
  readonly function: FlintAbiFunction;
}

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

export type FlintValueRepresentation =
  'bool-i32' | 'f32' | 'f64' | 'i32' | 'i64' | 'pointer-length-u32' | 'pointer-length-u64' | 'u32' | 'u64' | 'unit';

export interface FlintAbiManifest {
  readonly format: 'forge-web-script-module';
  readonly languageVersion: FlintLanguageVersion;
  readonly abiVersion: FlintAbiVersion;
  readonly moduleName: string;
  readonly exports: readonly FlintAbiFunction[];
  readonly imports: readonly FlintHostImport[];
  readonly sourceImports: readonly FlintSourceImport[];
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

export interface FlintAggregateFieldLayout {
  readonly name: string;
  readonly type: string;
  readonly offset: number;
  readonly size: number;
  readonly alignment: number;
  readonly ownership: FlintOwnership;
}

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

export interface FlintEnumMetadata {
  readonly name: string;
  readonly exported: boolean;
  readonly representation: 'i32';
  readonly variants: readonly { readonly name: string; readonly value: number }[];
}

export interface FlintCollectionLayout {
  readonly type: string;
  readonly kind: 'array' | 'vector';
  readonly elementType: string;
  readonly length?: number;
  readonly representation: 'contiguous' | 'owned-handle';
  readonly ownership: FlintOwnership;
}

export interface FlintSpecialization {
  readonly id: string;
  readonly generic: string;
  readonly arguments: readonly string[];
  readonly representation: 'monomorphized' | 'descriptor-boundary';
}

export interface FlintIteratorBoundaryDescriptor {
  readonly id: string;
  readonly generic: string;
  readonly elementType: string;
  readonly nextFunction: string;
  readonly representation: 'descriptor-boundary';
  readonly ownership: FlintOwnership;
}

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

type FunctionDeclaration = {
  readonly name: string;
  readonly parameters: readonly FlintParameter[];
  readonly result: FlintTypeName;
};

function toAbiFunction(declaration: FunctionDeclaration, module?: FlintModule): FlintAbiFunction {
  const referenceOf = (type: { readonly name: FlintPrimitiveType; readonly reference?: string }): string | undefined =>
    type.reference ?? (module?.structs.some(({ name }) => name === type.name) ? type.name : undefined);
  const carrierType = (type: {
    readonly name: FlintPrimitiveType;
    readonly reference?: string;
  }): FlintPrimitiveType => {
    const reference = referenceOf(type);
    return reference === undefined ? type.name : 'i32';
  };
  return {
    name: declaration.name,
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

function typeKey(type: FlintTypeName): string {
  return flintTypeNameToString(type);
}

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

function collectSpecializations(module: FlintModule): readonly FlintSpecialization[] {
  const { cache } = createMonomorphizationCache(module);
  return cache.collectFromModule(module).map((entry) => entry.specialization);
}

function collectionLayouts(module: FlintModule): readonly FlintCollectionLayout[] {
  const types: FlintTypeName[] = [];
  for (const declaration of module.structs) for (const field of declaration.fields) types.push(field.type);
  const statementTypes = (statements: readonly FlintStatement[]): void => {
    for (const statement of statements) {
      switch (statement.kind) {
        case 'let': {
          types.push(statement.type);
          break;
        }
        case 'if': {
          statementTypes(statement.consequent);
          if (statement.alternate !== undefined) statementTypes(statement.alternate);
          break;
        }
        case 'while':
        case 'do-while':
        case 'for':
        case 'iterator-loop': {
          statementTypes(statement.body);
          break;
        }
        case 'switch': {
          for (const arm of statement.cases) statementTypes(arm.body);
          if (statement.defaultCase !== undefined) statementTypes(statement.defaultCase);
          break;
        }
        default: {
          break;
        }
      }
    }
  };
  for (const declaration of module.functions) {
    types.push(declaration.result);
    for (const parameter of declaration.parameters) types.push(parameter.type);
    statementTypes(declaration.body);
  }
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
  readonly targetFeatures?: FlintTargetFeatures;
  readonly boundsChecks?: FlintSoNBoundsChecks;
}

const asyncCapabilities = new Set<FlintAsyncCapability>(['scheduler.microtask', 'scheduler.worker']);

function asyncContract(
  module: FlintModule,
  configured: FlintAsyncCompilationContract | undefined,
): FlintAsyncCompilationContract {
  if (configured !== undefined)
    return {
      ...configured,
      capabilities: [...new Set(configured.capabilities)].toSorted(),
    };
  return {
    capabilities: module.imports
      .map(({ capability }) => capability)
      .filter((capability): capability is FlintAsyncCapability =>
        asyncCapabilities.has(capability as FlintAsyncCapability),
      )
      .toSorted(),
    deterministic: true,
    taskIdRepresentation: 'u32',
    messageRepresentation: 'owned-bytes',
    ordering: 'sequence',
  };
}

export function createFlintAbiManifest(module: FlintModule, options: FlintAbiManifestOptions = {}): FlintAbiManifest {
  const targetFeatures = Object.fromEntries(
    (Object.keys(options.targetFeatures ?? {}) as (keyof FlintTargetFeatures)[])
      .filter((feature) => options.targetFeatures?.[feature] === true)
      .toSorted()
      .map((feature) => [feature, true]),
  ) as FlintTargetFeatures;
  const memory64 = targetFeatures.memory64 === true;
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
    memory: {
      pageSize: 65_536,
      addressType: memory64 ? 'u64' : 'u32',
      ownership: 'caller-owned',
      stringEncoding: 'utf8',
      byteArrayRepresentation: 'pointer-length',
      allocatorExport: 'fws_alloc',
      deallocatorExport: 'fws_dealloc',
      reallocatorExport: 'fws_realloc',
      safetyModel: 'region-arc-checked-linear',
    },
    boundsChecks: options.boundsChecks ?? 'runtime',
    valueRepresentations: {
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
    },
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
    ...(options.graphHash === undefined ? {} : { graphHash: options.graphHash }),
    ...(options.projectRoot === undefined ? {} : { projectRoot: options.projectRoot }),
    ...(options.linkMode === undefined ? {} : { linkMode: options.linkMode }),
    ...(options.linkProfile === undefined ? {} : { linkProfile: options.linkProfile }),
    ...(options.optimizationProfile === undefined ? {} : { optimizationProfile: options.optimizationProfile }),
    ...(options.linkedExports === undefined ? {} : { linkedExports: options.linkedExports }),
    ...(options.dynamicLinkMetadata === undefined ? {} : { dynamicLinkMetadata: options.dynamicLinkMetadata }),
  };
}
