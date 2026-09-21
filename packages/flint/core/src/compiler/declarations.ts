import {
  FLINT_ABI_VERSION,
  FLINT_LANGUAGE_VERSION,
  type FlintAbiFunction,
  type FlintAbiManifest,
  type FlintAbiParameter,
} from '../manifest.js';

import type { FlintPrimitiveType } from '../ast.js';

const PRIMITIVE_TYPE_MAP: Readonly<Record<string, string>> = Object.freeze({
  unit: 'void',
  string: 'string',
  bytes: 'FlintBytes',
  i64: 'bigint',
  u64: 'bigint',
});

const RAW_TYPE_MAP: Readonly<Record<string, string>> = Object.freeze({
  string: 'number',
  bytes: 'number',
  unit: 'void',
  i64: 'bigint',
  u64: 'bigint',
});

/**
 * Checks whether an ABI parameter is an i32 Array reference.
 */
function isI32Array(parameter: FlintAbiParameter): boolean {
  return parameter.reference === 'Array' && parameter.arguments?.[0]?.name === 'i32';
}

/**
 * Checks whether a reference name matches any known enum or record declaration.
 */
function isKnownReference(
  reference: string,
  enumNames?: ReadonlySet<string>,
  recordNames?: ReadonlySet<string>,
): boolean {
  return Boolean(enumNames?.has(reference) || recordNames?.has(reference));
}

/**
 * Resolves reference types (Arrays, enums, records) for an ABI parameter.
 */
function resolveReferenceType(
  parameter: FlintAbiParameter,
  enumNames?: ReadonlySet<string>,
  recordNames?: ReadonlySet<string>,
): string | undefined {
  if (isI32Array(parameter)) return 'ArrayLike<number>';
  const reference = parameter.reference;
  if (reference !== undefined && isKnownReference(reference, enumNames, recordNames)) {
    return reference;
  }
  return undefined;
}

/**
 * Maps a Flint ABI parameter or type name to a TypeScript declaration type.
 */
export function declarationType(
  value: string | FlintAbiParameter,
  enumNames?: ReadonlySet<string>,
  recordNames?: ReadonlySet<string>,
): string {
  if (typeof value !== 'string') {
    const reference = resolveReferenceType(value, enumNames, recordNames);
    if (reference !== undefined) return reference;
    value = value.type;
  }
  if (value.startsWith('Array<')) return 'ArrayLike<number>';
  return PRIMITIVE_TYPE_MAP[value] ?? 'number';
}

/**
 * Formats an identifier as a safe property name or JSON-quoted string.
 */
export function declarationProperty(name: string): string {
  return /^[$A-Z_a-z][$\w]*$/u.test(name) ? name : JSON.stringify(name);
}

/**
 * Constructs an ABI parameter representing the return value of a function declaration.
 */
function buildResultParameter(declaration: FlintAbiFunction): FlintAbiParameter {
  return {
    name: 'result',
    type: declaration.result,
    reference: declaration.resultReference,
    arguments: declaration.resultArguments,
    length: declaration.resultLength,
    ownership: declaration.resultOwnership,
    passing: declaration.resultPassing,
    referenceMode: declaration.resultReferenceMode,
  } as FlintAbiParameter;
}

/**
 * Generates the TypeScript function signature for an ABI function declaration.
 */
export function declarationFunction(
  declaration: FlintAbiFunction,
  enumNames?: ReadonlySet<string>,
  recordNames?: ReadonlySet<string>,
): string {
  const result = buildResultParameter(declaration);
  const parameters = declaration.parameters
    .map((parameter) => `${declarationProperty(parameter.name)}: ${declarationType(parameter, enumNames, recordNames)}`)
    .join(', ');
  return `(${parameters}) => ${declarationType(result, enumNames, recordNames)}`;
}

/**
 * Maps an ABI parameter or primitive type to its raw WebAssembly parameter type in TypeScript.
 */
export function rawDeclarationType(value: FlintPrimitiveType | FlintAbiParameter): string {
  if (typeof value !== 'string') {
    if (value.reference === 'Array') return 'number';
    value = value.type;
  }
  return RAW_TYPE_MAP[value] ?? 'number';
}

/**
 * Generates the low-level raw function signature with pointer/length expansion for strings and bytes.
 */
export function rawDeclarationFunction(declaration: FlintAbiFunction): string {
  const parameters = declaration.parameters.flatMap((parameter) => {
    if (parameter.type === 'string' || parameter.type === 'bytes') {
      return [
        `${declarationProperty(parameter.name)}Pointer: number`,
        `${declarationProperty(parameter.name)}Length: number`,
      ];
    }
    return `${declarationProperty(parameter.name)}: ${rawDeclarationType(parameter)}`;
  });
  const result =
    declaration.result === 'string' || declaration.result === 'bytes'
      ? 'FlintBytes'
      : rawDeclarationType(declaration.result);
  return `(${parameters.join(', ')}) => ${result}`;
}

/**
 * Emits TypeScript definitions for raw WebAssembly export records.
 */
export function rawDeclarationRecord(declarations: readonly FlintAbiFunction[]): string {
  return declarations
    .map(
      (declaration) => `  readonly ${declarationProperty(declaration.name)}: ${rawDeclarationFunction(declaration)};`,
    )
    .join('\n');
}

/**
 * Emits TypeScript definitions for typed ABI export records.
 */
export function declarationRecord(
  declarations: readonly FlintAbiFunction[],
  enumNames?: ReadonlySet<string>,
  recordNames?: ReadonlySet<string>,
): string {
  return declarations
    .map(
      (declaration) =>
        `  readonly ${declarationProperty(declaration.name)}: ${declarationFunction(declaration, enumNames, recordNames)};`,
    )
    .join('\n');
}

/**
 * Generates full TypeScript declaration file contents for a compiled Flint manifest.
 */
export function createDeclarations(manifest: FlintAbiManifest): string {
  const enumNames = new Set(manifest.enumDeclarations.filter(({ exported }) => exported).map(({ name }) => name));
  const recordLayouts = manifest.aggregateLayouts.filter(({ kind, record }) => kind === 'struct' && record === true);
  const recordNames = new Set(recordLayouts.map(({ name }) => name));
  const recordDeclarations = recordLayouts.flatMap((layout) => [
    `export interface ${declarationProperty(layout.name)} {`,
    ...layout.fields.map(
      (field) =>
        `  readonly ${declarationProperty(field.name)}: ${declarationType(field.type, enumNames, recordNames)};`,
    ),
    '}',
    '',
  ]);
  const enumDeclarations = manifest.enumDeclarations
    .filter(({ exported }) => exported)
    .flatMap((declaration) => [
      `export const ${declarationProperty(declaration.name)}: {`,
      ...declaration.variants.map(({ name, value }) => `  readonly ${declarationProperty(name)}: ${value};`),
      '};',
      `export type ${declarationProperty(declaration.name)} = typeof ${declarationProperty(declaration.name)}[keyof typeof ${declarationProperty(declaration.name)}];`,
      '',
    ]);
  const dynamicImports = manifest.sourceImports.filter(({ linkMode }) => linkMode === 'dynamic');
  const dynamicLoaders = dynamicImports
    .map(
      (sourceImport) =>
        `  readonly ${declarationProperty(sourceImport.alias)}: () => Promise<FlintDynamicModuleExports[${JSON.stringify(sourceImport.alias)}]>;`,
    )
    .join('\n');
  const capabilityImports = manifest.imports
    .map(
      (declaration) =>
        `  readonly ${declarationProperty(declaration.capability)}: {\n    readonly ${declarationProperty(declaration.alias)}: ${declarationFunction(declaration.function, enumNames)};\n  };`,
    )
    .join('\n');
  return [
    'export type FlintBytes = readonly [pointer: number, length: number];',
    '',
    ...enumDeclarations,
    'export type FlintManifestPrimitiveType = "bool" | "bytes" | "f32" | "f64" | "i32" | "i64" | "string" | "u32" | "u64" | "unit";',
    'export type FlintManifestOwnership = "borrowed" | "owned" | "shared";',
    'export interface FlintManifestSourceSpan {',
    '  readonly start: number;',
    '  readonly end: number;',
    '  readonly line: number;',
    '  readonly column: number;',
    '  readonly endLine: number;',
    '  readonly endColumn: number;',
    '}',
    '',
    'export interface FlintManifestTypeName {',
    '  readonly kind: "type-name";',
    '  readonly name: FlintManifestPrimitiveType;',
    '  readonly reference?: string;',
    '  readonly arguments?: readonly FlintManifestTypeName[];',
    '  readonly length?: number;',
    '  readonly ownership?: FlintManifestOwnership;',
    '  readonly span: FlintManifestSourceSpan;',
    '}',
    '',
    'export interface FlintManifestParameter {',
    '  readonly name: string;',
    '  readonly type: FlintManifestPrimitiveType;',
    '  readonly reference?: string;',
    '  readonly arguments?: readonly FlintManifestTypeName[];',
    '  readonly length?: number;',
    '  readonly ownership?: FlintManifestOwnership;',
    '}',
    '',
    'export interface FlintManifestFunction {',
    '  readonly name: string;',
    '  readonly parameters: readonly FlintManifestParameter[];',
    '  readonly result: FlintManifestPrimitiveType;',
    '  readonly resultReference?: string;',
    '  readonly resultArguments?: readonly FlintManifestTypeName[];',
    '  readonly resultLength?: number;',
    '  readonly resultOwnership?: FlintManifestOwnership;',
    '}',
    '',
    'export interface FlintManifestHostImport {',
    '  readonly capability: string;',
    '  readonly alias: string;',
    '  readonly function: FlintManifestFunction;',
    '}',
    '',
    'export interface FlintManifestMemoryLayout {',
    '  readonly pageSize: 65536;',
    '  readonly addressType: "u32" | "u64";',
    '  readonly ownership: "caller-owned";',
    '  readonly stringEncoding: "utf8";',
    '  readonly byteArrayRepresentation: "pointer-length";',
    '  readonly allocatorExport: "fws_alloc";',
    '  readonly deallocatorExport: "fws_dealloc";',
    '  readonly reallocatorExport: "fws_realloc";',
    '}',
    '',
    'export type FlintManifestValueRepresentation = "bool-i32" | "f32" | "f64" | "i32" | "i64" | "pointer-length-u32" | "pointer-length-u64" | "u32" | "u64" | "unit";',
    '',
    'export interface FlintAggregateLayout {',
    '  readonly name: string;',
    '  readonly kind: "struct" | "enum";',
    '  readonly size: number;',
    '  readonly alignment: number;',
    '  readonly discriminantSize?: 1 | 2 | 4;',
    '  readonly fields: readonly { readonly name: string; readonly type: string; readonly offset: number; readonly size: number; readonly alignment: number; readonly ownership: FlintManifestOwnership }[];',
    '  readonly immutable: true;',
    '}',
    '',
    'export interface FlintManifestSourceImport {',
    '  readonly source: string;',
    '  readonly alias: string;',
    '  readonly resolvedModuleId?: string;',
    '  readonly linkMode?: "static" | "dynamic";',
    '  readonly exports?: readonly FlintManifestFunction[];',
    '}',
    '',
    'export interface FlintManifestLinkedExport {',
    '  readonly name: string;',
    '  readonly moduleId: string;',
    '  readonly parameters: readonly FlintManifestParameter[];',
    '  readonly result: FlintManifestPrimitiveType;',
    '  readonly resultReference?: string;',
    '  readonly resultArguments?: readonly FlintManifestTypeName[];',
    '  readonly resultLength?: number;',
    '  readonly resultOwnership?: FlintManifestOwnership;',
    '}',
    '',
    'export interface FlintManifestStandardLibrary {',
    '  readonly regexBytecodeVersion: string;',
    '  readonly regexCorpusHash?: string;',
    '}',
    '',
    'export interface FlintManifestSpecialization {',
    '  readonly id: string;',
    '  readonly generic: string;',
    '  readonly arguments: readonly string[];',
    '  readonly representation: "monomorphized" | "descriptor-boundary";',
    '}',
    '',
    'export interface FlintManifestIteratorDescriptor {',
    '  readonly id: string;',
    '  readonly generic: string;',
    '  readonly elementType: string;',
    '  readonly nextFunction: string;',
    '  readonly representation: "descriptor-boundary";',
    '  readonly ownership: FlintManifestOwnership;',
    '}',
    '',
    'export interface FlintManifestAsync {',
    '  readonly capabilities: readonly ("scheduler.microtask" | "scheduler.worker")[];',
    '  readonly deterministic: true;',
    '  readonly taskIdRepresentation: "u32";',
    '  readonly messageRepresentation: "owned-bytes";',
    '  readonly ordering: "sequence";',
    '}',
    '',
    'export interface FlintManifestTargetFeatures {',
    '  readonly simd?: boolean;',
    '  readonly tailCall?: boolean;',
    '  readonly memory64?: boolean;',
    '  readonly threads?: boolean;',
    '  readonly atomics?: boolean;',
    '}',
    '',
    'export interface FlintManifest {',
    '  readonly format: "forge-web-script-module";',
    `  readonly languageVersion: ${JSON.stringify(FLINT_LANGUAGE_VERSION)};`,
    `  readonly abiVersion: ${JSON.stringify(FLINT_ABI_VERSION)};`,
    '  readonly moduleName: string;',
    '  readonly exports: readonly FlintManifestFunction[];',
    '  readonly imports: readonly FlintManifestHostImport[];',
    '  readonly sourceImports: readonly FlintManifestSourceImport[];',
    '  readonly graphHash?: string;',
    '  readonly projectRoot?: string;',
    '  readonly linkMode?: "static" | "dynamic";',
    '  readonly linkProfile?: "static" | "dynamic";',
    '  readonly optimizationProfile?: "standard" | "static-aggressive" | "dynamic-conservative";',
    '  readonly linkedExports?: readonly FlintManifestLinkedExport[];',
    '  readonly requiredCapabilities: readonly string[];',
    '  readonly memory: FlintManifestMemoryLayout;',
    '  readonly valueRepresentations: Readonly<Record<FlintManifestPrimitiveType, FlintManifestValueRepresentation>>;',
    '  readonly trapModel: "explicit-trap";',
    '  readonly standardLibrary: FlintManifestStandardLibrary;',
    '  readonly aggregateLayouts: readonly FlintAggregateLayout[];',
    '  readonly enumDeclarations: readonly { readonly name: string; readonly exported: boolean; readonly representation: "i32"; readonly variants: readonly { readonly name: string; readonly value: number }[] }[];',
    '  readonly collectionLayouts: readonly { readonly type: string; readonly kind: "array" | "vector"; readonly elementType: string; readonly length?: number; readonly representation: "contiguous" | "owned-handle"; readonly ownership: FlintManifestOwnership }[];',
    '  readonly specializations: readonly FlintManifestSpecialization[];',
    '  readonly iteratorDescriptors: readonly FlintManifestIteratorDescriptor[];',
    '  readonly async?: FlintManifestAsync;',
    '  readonly targetFeatures?: FlintManifestTargetFeatures;',
    '}',
    'export type FlintAbiManifest = FlintManifest;',
    '',
    ...recordDeclarations,
    'export interface FlintExports {',
    '  readonly memory: WebAssembly.Memory;',
    declarationRecord(manifest.exports, enumNames, recordNames),
    '  readonly fws_alloc: (size: number) => number;',
    '  readonly fws_dealloc: (pointer: number, size: number) => void;',
    '  readonly fws_realloc: (pointer: number, oldSize: number, newSize: number) => number;',
    '  readonly fws_reset: () => void;',
    '}',
    '',
    'export interface FlintRawExports {',
    '  readonly memory: WebAssembly.Memory;',
    rawDeclarationRecord(manifest.exports),
    '  readonly fws_alloc: (size: number) => number;',
    '  readonly fws_dealloc: (pointer: number, size: number) => void;',
    '  readonly fws_realloc: (pointer: number, oldSize: number, newSize: number) => number;',
    '  readonly fws_reset: () => void;',
    '}',
    '',
    'export type FlintRawImports = WebAssembly.Imports;',
    '',
    'export interface FlintDynamicModuleExports {',
    dynamicImports.length === 0
      ? '  // This module has no dynamic source-module links.'
      : dynamicImports
          .map(
            (sourceImport) =>
              `  readonly ${declarationProperty(sourceImport.alias)}: {\n${declarationRecord(sourceImport.exports ?? [], enumNames)}\n  };`,
          )
          .join('\n'),
    '}',
    '',
    'export interface FlintDynamicModuleLoaders {',
    dynamicLoaders || '  // This module has no dynamic source-module links.',
    '}',
    '',
    'export interface FlintImports {',
    capabilityImports,
    dynamicImports.length === 0 ? '' : '  readonly dynamicModules?: FlintDynamicModuleLoaders;',
    '}',
    '',
    'export interface FlintDynamicLinkMetadata {',
    '  readonly artifactId: string;',
    '  readonly manifestHash: string;',
    '  readonly modules: readonly { readonly moduleId: string; readonly alias: string; readonly exports: readonly FlintManifestFunction[] }[];',
    '}',
    '',
    'export const manifest: FlintManifest;',
    'export const abiManifest: FlintManifest;',
    'export const dynamicLinkMetadata: FlintDynamicLinkMetadata | undefined;',
    'export function resolveDynamicExport(alias: string, exportName: string, imports?: FlintImports): Promise<(...args: readonly number[]) => unknown>;',
    'export function resolveDynamicExportSync(alias: string, exportName: string, imports?: FlintImports): (...args: readonly number[]) => unknown;',
    'export function clearDynamicLinkCache(): void;',
    'export function load(imports?: FlintImports): Promise<FlintExports>;',
    'export function loadSync(imports?: FlintImports): FlintExports;',
    'declare const library: typeof loadSync;',
    'export default library;',
    'export function loadRaw(imports?: FlintRawImports): Promise<FlintRawExports>;',
    'export function loadRawSync(imports?: FlintRawImports): FlintRawExports;',
  ].join('\n');
}
