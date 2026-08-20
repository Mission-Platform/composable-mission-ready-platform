import {
  DEFAULT_FORGE_WEB_SCRIPT_STANDARD_LIBRARY_IDENTITY,
  type ForgeWebScriptStandardLibraryIdentity,
} from './stdlib/regex.js';
import { forgeWebScriptTypeNameToString } from './ast.js';
import { createForgeWebScriptIteratorBoundaryDescriptor } from './generics.js';

import type {
  ForgeWebScriptModule,
  ForgeWebScriptPrimitiveType,
  ForgeWebScriptOwnership,
  ForgeWebScriptStatement,
  ForgeWebScriptTypeName,
} from './ast.js';
import type {
  ForgeWebScriptAsyncCapability,
  ForgeWebScriptAsyncCompilationContract,
  ForgeWebScriptTargetFeatures,
} from './contracts.js';
import type { ForgeWebScriptLinkMode } from './graph.js';

export const FORGE_WEB_SCRIPT_LANGUAGE_VERSION = '1.0' as const;
export const FORGE_WEB_SCRIPT_ABI_VERSION = '1.2' as const;
export type ForgeWebScriptLanguageVersion = typeof FORGE_WEB_SCRIPT_LANGUAGE_VERSION;
export type ForgeWebScriptAbiVersion = typeof FORGE_WEB_SCRIPT_ABI_VERSION;

export interface ForgeWebScriptAbiParameter {
  readonly name: string;
  readonly type: ForgeWebScriptPrimitiveType;
  /** Source-level aggregate or generic reference retained beside the scalar carrier. */
  readonly reference?: string;
  readonly arguments?: readonly ForgeWebScriptTypeName[];
  readonly length?: number;
  readonly ownership?: ForgeWebScriptOwnership;
}
export interface ForgeWebScriptAbiFunction {
  readonly name: string;
  readonly parameters: readonly ForgeWebScriptAbiParameter[];
  readonly result: ForgeWebScriptPrimitiveType;
  readonly resultReference?: string;
  readonly resultArguments?: readonly ForgeWebScriptTypeName[];
  readonly resultLength?: number;
  readonly resultOwnership?: ForgeWebScriptOwnership;
}
export interface ForgeWebScriptHostImport {
  readonly capability: string;
  readonly alias: string;
  readonly function: ForgeWebScriptAbiFunction;
}

export interface ForgeWebScriptMemoryLayout {
  readonly pageSize: 65_536;
  readonly addressType: 'u32' | 'u64';
  readonly ownership: 'caller-owned';
  readonly stringEncoding: 'utf8';
  readonly byteArrayRepresentation: 'pointer-length';
  readonly allocatorExport: 'fws_alloc';
  readonly deallocatorExport: 'fws_dealloc';
  readonly reallocatorExport: 'fws_realloc';
}

export type ForgeWebScriptValueRepresentation =
  'bool-i32' | 'f32' | 'f64' | 'i32' | 'i64' | 'pointer-length-u32' | 'pointer-length-u64' | 'u32' | 'u64' | 'unit';

export interface ForgeWebScriptAbiManifest {
  readonly format: 'forge-web-script-module';
  readonly languageVersion: ForgeWebScriptLanguageVersion;
  readonly abiVersion: ForgeWebScriptAbiVersion;
  readonly moduleName: string;
  readonly exports: readonly ForgeWebScriptAbiFunction[];
  readonly imports: readonly ForgeWebScriptHostImport[];
  readonly sourceImports: readonly ForgeWebScriptSourceImport[];
  readonly graphHash?: string;
  readonly projectRoot?: string;
  readonly linkMode?: ForgeWebScriptLinkMode;
  readonly linkedExports?: readonly ForgeWebScriptLinkedExport[];
  readonly requiredCapabilities: readonly string[];
  readonly memory: ForgeWebScriptMemoryLayout;
  readonly valueRepresentations: Readonly<Record<ForgeWebScriptPrimitiveType, ForgeWebScriptValueRepresentation>>;
  readonly trapModel: 'explicit-trap';
  readonly standardLibrary: ForgeWebScriptStandardLibraryIdentity;
  /** Canonically ordered layouts for immutable struct and tagged enum values. */
  readonly aggregateLayouts: readonly ForgeWebScriptAggregateLayout[];
  /** Stable integer enum metadata is published separately from scalar function exports. */
  readonly enumDeclarations: readonly ForgeWebScriptEnumMetadata[];
  /** Collection representations used at descriptor boundaries and aggregate fields. */
  readonly collectionLayouts: readonly ForgeWebScriptCollectionLayout[];
  /** Concrete generic instantiations selected by the frontend. */
  readonly specializations: readonly ForgeWebScriptSpecialization[];
  /** Iterator/interface descriptors remain explicit at generic boundaries. */
  readonly iteratorDescriptors: readonly ForgeWebScriptIteratorBoundaryDescriptor[];
  /** Async scheduling is explicit and crosses the host only through capabilities. */
  readonly async?: ForgeWebScriptAsyncCompilationContract;
  /** Target features are part of the loader-visible ABI identity. */
  readonly targetFeatures?: ForgeWebScriptTargetFeatures;
}

export interface ForgeWebScriptAggregateFieldLayout {
  readonly name: string;
  readonly type: string;
  readonly offset: number;
  readonly size: number;
  readonly alignment: number;
  readonly ownership: ForgeWebScriptOwnership;
}

export interface ForgeWebScriptAggregateLayout {
  readonly name: string;
  readonly kind: 'struct' | 'enum';
  readonly size: number;
  readonly alignment: number;
  readonly discriminantSize?: 1 | 2 | 4;
  readonly fields: readonly ForgeWebScriptAggregateFieldLayout[];
  readonly immutable: true;
}

export interface ForgeWebScriptEnumMetadata {
  readonly name: string;
  readonly exported: boolean;
  readonly representation: 'i32';
  readonly variants: readonly { readonly name: string; readonly value: number }[];
}

export interface ForgeWebScriptCollectionLayout {
  readonly type: string;
  readonly kind: 'array' | 'vector';
  readonly elementType: string;
  readonly length?: number;
  readonly representation: 'contiguous' | 'owned-handle';
  readonly ownership: ForgeWebScriptOwnership;
}

export interface ForgeWebScriptSpecialization {
  readonly id: string;
  readonly generic: string;
  readonly arguments: readonly string[];
  readonly representation: 'monomorphized' | 'descriptor-boundary';
}

export interface ForgeWebScriptIteratorBoundaryDescriptor {
  readonly id: string;
  readonly generic: string;
  readonly elementType: string;
  readonly nextFunction: string;
  readonly representation: 'descriptor-boundary';
  readonly ownership: ForgeWebScriptOwnership;
}

export interface ForgeWebScriptSourceImport {
  readonly source: string;
  readonly alias: string;
  readonly resolvedModuleId?: string;
  readonly linkMode?: ForgeWebScriptLinkMode;
  /** Export signatures used to type an explicitly dynamic source-module link. */
  readonly exports?: readonly ForgeWebScriptAbiFunction[];
}

export interface ForgeWebScriptLinkedExport {
  readonly name: string;
  readonly moduleId: string;
  readonly parameters: readonly ForgeWebScriptAbiParameter[];
  readonly result: ForgeWebScriptPrimitiveType;
  readonly resultReference?: string;
  readonly resultArguments?: readonly ForgeWebScriptTypeName[];
  readonly resultLength?: number;
  readonly resultOwnership?: ForgeWebScriptOwnership;
}

type FunctionDeclaration = {
  readonly name: string;
  readonly parameters: readonly {
    readonly name: string;
    readonly type: {
      readonly name: ForgeWebScriptPrimitiveType;
      readonly reference?: string;
      readonly arguments?: readonly ForgeWebScriptTypeName[];
      readonly length?: number;
      readonly ownership?: ForgeWebScriptOwnership;
    };
  }[];
  readonly result: {
    readonly name: ForgeWebScriptPrimitiveType;
    readonly reference?: string;
    readonly arguments?: readonly ForgeWebScriptTypeName[];
    readonly length?: number;
    readonly ownership?: ForgeWebScriptOwnership;
  };
};

function toAbiFunction(declaration: FunctionDeclaration): ForgeWebScriptAbiFunction {
  const carrierType = (type: { readonly name: ForgeWebScriptPrimitiveType; readonly reference?: string }): ForgeWebScriptPrimitiveType =>
    type.reference === 'Array' || type.reference !== undefined ? 'i32' : type.name;
  return {
    name: declaration.name,
    parameters: declaration.parameters.map((parameter) => ({
      name: parameter.name,
      type: carrierType(parameter.type),
      ...(parameter.type.reference === undefined ? {} : { reference: parameter.type.reference }),
      ...(parameter.type.arguments === undefined ? {} : { arguments: parameter.type.arguments }),
      ...(parameter.type.length === undefined ? {} : { length: parameter.type.length }),
      ...(parameter.type.reference === 'Array'
        ? { ownership: parameter.type.ownership ?? ('owned' as const) }
        : parameter.type.ownership === undefined
          ? {}
          : { ownership: parameter.type.ownership }),
    })),
    result: carrierType(declaration.result),
    ...(declaration.result.reference === undefined ? {} : { resultReference: declaration.result.reference }),
    ...(declaration.result.arguments === undefined ? {} : { resultArguments: declaration.result.arguments }),
    ...(declaration.result.length === undefined ? {} : { resultLength: declaration.result.length }),
    ...(declaration.result.ownership === undefined ? {} : { resultOwnership: declaration.result.ownership }),
  };
}

function typeKey(type: ForgeWebScriptTypeName): string {
  return forgeWebScriptTypeNameToString(type);
}

function iteratorDescriptors(module: ForgeWebScriptModule): readonly ForgeWebScriptIteratorBoundaryDescriptor[] {
  return module.functions.flatMap((declaration) => {
    if (!declaration.iterable || declaration.result.arguments?.[0] === undefined) return [];
    return [
      createForgeWebScriptIteratorBoundaryDescriptor(
        declaration.result.reference ?? declaration.result.name,
        declaration.result.arguments[0],
        `${declaration.name}.next`,
        declaration.result.ownership,
      ),
    ];
  });
}

function aggregateLayouts(module: ForgeWebScriptModule): readonly ForgeWebScriptAggregateLayout[] {
  const structs = module.structs.map((declaration) => {
    let offset = 0;
    const fields = declaration.fields.map((field) => {
      const size = field.type.name === 'unit' ? 0 : 4;
      const layout = {
        name: field.name,
        type: typeKey(field.type),
        offset,
        size,
        alignment: size === 0 ? 1 : 4,
        ownership: field.ownership ?? ('owned' as const),
      };
      offset += size;
      return layout;
    });
    return {
      name: declaration.name,
      kind: 'struct' as const,
      size: offset,
      alignment: 4,
      fields,
      immutable: true as const,
    };
  });
  const enums = module.enums.map((declaration) => {
    const fields = declaration.variants.flatMap((variant) =>
      variant.fields.map((field, index) => ({
        name: `${variant.name}.${field.name}`,
        type: typeKey(field.type),
        offset: 4 + index * 4,
        size: 4,
        alignment: 4,
        ownership: 'owned' as const,
      })),
    );
    return {
      name: declaration.name,
      kind: 'enum' as const,
      size: Math.max(4, ...fields.map(({ offset, size }) => offset + size)),
      alignment: 4,
      discriminantSize: 4 as const,
      fields,
      immutable: true as const,
    };
  });
  return [...structs, ...enums].toSorted((left, right) => left.name.localeCompare(right.name));
}

function collectionLayouts(module: ForgeWebScriptModule): readonly ForgeWebScriptCollectionLayout[] {
  const types: ForgeWebScriptTypeName[] = [];
  for (const declaration of module.structs) for (const field of declaration.fields) types.push(field.type);
  const statementTypes = (statements: readonly ForgeWebScriptStatement[]): void => {
    for (const statement of statements) {
      switch (statement.kind) {
        case 'let':
          types.push(statement.type);
          break;
        case 'if':
          statementTypes(statement.consequent);
          if (statement.alternate !== undefined) statementTypes(statement.alternate);
          break;
        case 'while':
        case 'do-while':
        case 'for':
        case 'iterator-loop':
          statementTypes(statement.body);
          break;
        case 'switch':
          for (const arm of statement.cases) statementTypes(arm.body);
          if (statement.defaultCase !== undefined) statementTypes(statement.defaultCase);
          break;
        default:
          break;
      }
    }
  };
  for (const declaration of module.functions) {
    types.push(declaration.result);
    for (const parameter of declaration.parameters) types.push(parameter.type);
    statementTypes(declaration.body);
  }
  const layouts = types.flatMap((type) => {
    const kind: ForgeWebScriptCollectionLayout['kind'] | undefined = type.reference === 'Array' ? 'array' : type.reference === 'Vector' ? 'vector' : undefined;
    if (kind === undefined || type.arguments?.[0] === undefined) return [];
    return [{
      type: typeKey(type),
      kind,
      elementType: typeKey(type.arguments[0]),
      ...(type.length === undefined ? {} : { length: type.length }),
      representation: kind === 'array' ? 'contiguous' as const : 'owned-handle' as const,
      ownership: type.ownership ?? ('owned' as const),
    }];
  });
  return [...new Map(layouts.map((layout) => [layout.type, layout])).values()].toSorted((left, right) => left.type.localeCompare(right.type));
}

export interface ForgeWebScriptAbiManifestOptions {
  readonly graphHash?: string;
  readonly projectRoot?: string;
  readonly linkMode?: ForgeWebScriptLinkMode;
  readonly sourceImports?: readonly ForgeWebScriptSourceImport[];
  readonly linkedExports?: readonly ForgeWebScriptLinkedExport[];
  readonly standardLibrary?: ForgeWebScriptStandardLibraryIdentity;
  readonly specializations?: readonly ForgeWebScriptSpecialization[];
  readonly iteratorDescriptors?: readonly ForgeWebScriptIteratorBoundaryDescriptor[];
  readonly async?: ForgeWebScriptAsyncCompilationContract;
  readonly targetFeatures?: ForgeWebScriptTargetFeatures;
}

const asyncCapabilities = new Set<ForgeWebScriptAsyncCapability>(['scheduler.microtask', 'scheduler.worker']);

function asyncContract(
  module: ForgeWebScriptModule,
  configured: ForgeWebScriptAsyncCompilationContract | undefined,
): ForgeWebScriptAsyncCompilationContract {
  if (configured !== undefined)
    return {
      ...configured,
      capabilities: [...new Set(configured.capabilities)].toSorted(),
    };
  return {
    capabilities: module.imports
      .map(({ capability }) => capability)
      .filter((capability): capability is ForgeWebScriptAsyncCapability =>
        asyncCapabilities.has(capability as ForgeWebScriptAsyncCapability),
      )
      .toSorted(),
    deterministic: true,
    taskIdRepresentation: 'u32',
    messageRepresentation: 'owned-bytes',
    ordering: 'sequence',
  };
}

export function createForgeWebScriptAbiManifest(
  module: ForgeWebScriptModule,
  options: ForgeWebScriptAbiManifestOptions = {},
): ForgeWebScriptAbiManifest {
  const targetFeatures = Object.fromEntries(
    (Object.keys(options.targetFeatures ?? {}) as (keyof ForgeWebScriptTargetFeatures)[])
      .filter((feature) => options.targetFeatures?.[feature] === true)
      .sort()
      .map((feature) => [feature, true]),
  ) as ForgeWebScriptTargetFeatures;
  const memory64 = targetFeatures.memory64 === true;
  return {
    format: 'forge-web-script-module',
    languageVersion: FORGE_WEB_SCRIPT_LANGUAGE_VERSION,
    abiVersion: FORGE_WEB_SCRIPT_ABI_VERSION,
    moduleName: module.name,
    exports: module.functions
      .filter((declaration) => declaration.exported)
      .map((declaration) => toAbiFunction(declaration))
      .toSorted((left, right) => left.name.localeCompare(right.name)),
    imports: module.imports.map((declaration) => ({
      capability: declaration.capability,
      alias: declaration.alias,
      function: toAbiFunction({
        name: declaration.alias,
        parameters: declaration.parameters,
        result: declaration.result,
      }),
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
    },
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
    enumDeclarations: module.enums.map((declaration) => ({
      name: declaration.name,
      exported: declaration.exported,
      representation: 'i32' as const,
      variants: declaration.variants.map(({ name, tag }) => ({ name, value: tag })),
    })).toSorted((left, right) => left.name.localeCompare(right.name)),
    collectionLayouts: collectionLayouts(module),
    specializations: options.specializations?.toSorted((left, right) => left.id.localeCompare(right.id)) ?? [],
    iteratorDescriptors: (options.iteratorDescriptors ?? iteratorDescriptors(module)).toSorted((left, right) =>
      left.id.localeCompare(right.id),
    ),
    async: asyncContract(module, options.async),
    ...(Object.keys(targetFeatures).length === 0 ? {} : { targetFeatures }),
    ...(options.graphHash === undefined ? {} : { graphHash: options.graphHash }),
    ...(options.projectRoot === undefined ? {} : { projectRoot: options.projectRoot }),
    ...(options.linkMode === undefined ? {} : { linkMode: options.linkMode }),
    ...(options.linkedExports === undefined ? {} : { linkedExports: options.linkedExports }),
  };
}
