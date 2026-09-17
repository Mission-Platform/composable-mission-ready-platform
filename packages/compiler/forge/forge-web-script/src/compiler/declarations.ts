import {
  FORGE_WEB_SCRIPT_ABI_VERSION,
  FORGE_WEB_SCRIPT_LANGUAGE_VERSION,
  type ForgeWebScriptAbiFunction,
  type ForgeWebScriptAbiManifest,
  type ForgeWebScriptAbiParameter,
} from '../manifest.js';

import type { ForgeWebScriptPrimitiveType } from '../ast.js';

const PRIMITIVE_TYPE_MAP: Readonly<Record<string, string>> = Object.freeze({
  unit: 'void',
  string: 'string',
  bytes: 'ForgeWebScriptBytes',
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
 * Resolves reference types (Arrays, enums, records) for an ABI parameter.
 */
function resolveReferenceType(
  parameter: ForgeWebScriptAbiParameter,
  enumNames?: ReadonlySet<string>,
  recordNames?: ReadonlySet<string>,
): string | undefined {
  if (parameter.reference === 'Array' && parameter.arguments?.[0]?.name === 'i32') return 'ArrayLike<number>';
  if (
    parameter.reference !== undefined &&
    (enumNames?.has(parameter.reference) || recordNames?.has(parameter.reference))
  ) {
    return parameter.reference;
  }
  return undefined;
}

/**
 * Maps a Forge Web Script ABI parameter or type name to a TypeScript declaration type.
 */
export function declarationType(
  value: string | ForgeWebScriptAbiParameter,
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
function buildResultParameter(declaration: ForgeWebScriptAbiFunction): ForgeWebScriptAbiParameter {
  return {
    name: 'result',
    type: declaration.result,
    ...(declaration.resultReference === undefined ? {} : { reference: declaration.resultReference }),
    ...(declaration.resultArguments === undefined ? {} : { arguments: declaration.resultArguments }),
    ...(declaration.resultLength === undefined ? {} : { length: declaration.resultLength }),
    ...(declaration.resultOwnership === undefined ? {} : { ownership: declaration.resultOwnership }),
    ...(declaration.resultPassing === undefined ? {} : { passing: declaration.resultPassing }),
    ...(declaration.resultReferenceMode === undefined ? {} : { referenceMode: declaration.resultReferenceMode }),
  } satisfies ForgeWebScriptAbiParameter;
}

/**
 * Generates the TypeScript function signature for an ABI function declaration.
 */
export function declarationFunction(
  declaration: ForgeWebScriptAbiFunction,
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
export function rawDeclarationType(value: ForgeWebScriptPrimitiveType | ForgeWebScriptAbiParameter): string {
  if (typeof value !== 'string') {
    if (value.reference === 'Array') return 'number';
    value = value.type;
  }
  return RAW_TYPE_MAP[value] ?? 'number';
}

/**
 * Generates the low-level raw function signature with pointer/length expansion for strings and bytes.
 */
export function rawDeclarationFunction(declaration: ForgeWebScriptAbiFunction): string {
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
      ? 'ForgeWebScriptBytes'
      : rawDeclarationType(declaration.result);
  return `(${parameters.join(', ')}) => ${result}`;
}

/**
 * Emits TypeScript definitions for raw WebAssembly export records.
 */
export function rawDeclarationRecord(declarations: readonly ForgeWebScriptAbiFunction[]): string {
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
  declarations: readonly ForgeWebScriptAbiFunction[],
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
 * Generates full TypeScript declaration file contents for a compiled Forge Web Script manifest.
 */
export function createDeclarations(manifest: ForgeWebScriptAbiManifest): string {
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
        `  readonly ${declarationProperty(sourceImport.alias)}: () => Promise<ForgeWebScriptDynamicModuleExports[${JSON.stringify(sourceImport.alias)}]>;`,
    )
    .join('\n');
  const capabilityImports = manifest.imports
    .map(
      (declaration) =>
        `  readonly ${declarationProperty(declaration.capability)}: {\n    readonly ${declarationProperty(declaration.alias)}: ${declarationFunction(declaration.function, enumNames)};\n  };`,
    )
    .join('\n');
  return [
    'export type ForgeWebScriptBytes = readonly [pointer: number, length: number];',
    '',
    ...enumDeclarations,
    'export type ForgeWebScriptManifestPrimitiveType = "bool" | "bytes" | "f32" | "f64" | "i32" | "i64" | "string" | "u32" | "u64" | "unit";',
    'export type ForgeWebScriptManifestOwnership = "borrowed" | "owned" | "shared";',
    'export interface ForgeWebScriptManifestSourceSpan {',
    '  readonly start: number;',
    '  readonly end: number;',
    '  readonly line: number;',
    '  readonly column: number;',
    '  readonly endLine: number;',
    '  readonly endColumn: number;',
    '}',
    '',
    'export interface ForgeWebScriptManifestTypeName {',
    '  readonly kind: "type-name";',
    '  readonly name: ForgeWebScriptManifestPrimitiveType;',
    '  readonly reference?: string;',
    '  readonly arguments?: readonly ForgeWebScriptManifestTypeName[];',
    '  readonly length?: number;',
    '  readonly ownership?: ForgeWebScriptManifestOwnership;',
    '  readonly span: ForgeWebScriptManifestSourceSpan;',
    '}',
    '',
    'export interface ForgeWebScriptManifestParameter {',
    '  readonly name: string;',
    '  readonly type: ForgeWebScriptManifestPrimitiveType;',
    '  readonly reference?: string;',
    '  readonly arguments?: readonly ForgeWebScriptManifestTypeName[];',
    '  readonly length?: number;',
    '  readonly ownership?: ForgeWebScriptManifestOwnership;',
    '}',
    '',
    'export interface ForgeWebScriptManifestFunction {',
    '  readonly name: string;',
    '  readonly parameters: readonly ForgeWebScriptManifestParameter[];',
    '  readonly result: ForgeWebScriptManifestPrimitiveType;',
    '  readonly resultReference?: string;',
    '  readonly resultArguments?: readonly ForgeWebScriptManifestTypeName[];',
    '  readonly resultLength?: number;',
    '  readonly resultOwnership?: ForgeWebScriptManifestOwnership;',
    '}',
    '',
    'export interface ForgeWebScriptManifestHostImport {',
    '  readonly capability: string;',
    '  readonly alias: string;',
    '  readonly function: ForgeWebScriptManifestFunction;',
    '}',
    '',
    'export interface ForgeWebScriptManifestMemoryLayout {',
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
    'export type ForgeWebScriptManifestValueRepresentation = "bool-i32" | "f32" | "f64" | "i32" | "i64" | "pointer-length-u32" | "pointer-length-u64" | "u32" | "u64" | "unit";',
    '',
    'export interface ForgeWebScriptAggregateLayout {',
    '  readonly name: string;',
    '  readonly kind: "struct" | "enum";',
    '  readonly size: number;',
    '  readonly alignment: number;',
    '  readonly discriminantSize?: 1 | 2 | 4;',
    '  readonly fields: readonly { readonly name: string; readonly type: string; readonly offset: number; readonly size: number; readonly alignment: number; readonly ownership: ForgeWebScriptManifestOwnership }[];',
    '  readonly immutable: true;',
    '}',
    '',
    'export interface ForgeWebScriptManifestSourceImport {',
    '  readonly source: string;',
    '  readonly alias: string;',
    '  readonly resolvedModuleId?: string;',
    '  readonly linkMode?: "static" | "dynamic";',
    '  readonly exports?: readonly ForgeWebScriptManifestFunction[];',
    '}',
    '',
    'export interface ForgeWebScriptManifestLinkedExport {',
    '  readonly name: string;',
    '  readonly moduleId: string;',
    '  readonly parameters: readonly ForgeWebScriptManifestParameter[];',
    '  readonly result: ForgeWebScriptManifestPrimitiveType;',
    '  readonly resultReference?: string;',
    '  readonly resultArguments?: readonly ForgeWebScriptManifestTypeName[];',
    '  readonly resultLength?: number;',
    '  readonly resultOwnership?: ForgeWebScriptManifestOwnership;',
    '}',
    '',
    'export interface ForgeWebScriptManifestStandardLibrary {',
    '  readonly regexBytecodeVersion: string;',
    '  readonly regexCorpusHash?: string;',
    '}',
    '',
    'export interface ForgeWebScriptManifestSpecialization {',
    '  readonly id: string;',
    '  readonly generic: string;',
    '  readonly arguments: readonly string[];',
    '  readonly representation: "monomorphized" | "descriptor-boundary";',
    '}',
    '',
    'export interface ForgeWebScriptManifestIteratorDescriptor {',
    '  readonly id: string;',
    '  readonly generic: string;',
    '  readonly elementType: string;',
    '  readonly nextFunction: string;',
    '  readonly representation: "descriptor-boundary";',
    '  readonly ownership: ForgeWebScriptManifestOwnership;',
    '}',
    '',
    'export interface ForgeWebScriptManifestAsync {',
    '  readonly capabilities: readonly ("scheduler.microtask" | "scheduler.worker")[];',
    '  readonly deterministic: true;',
    '  readonly taskIdRepresentation: "u32";',
    '  readonly messageRepresentation: "owned-bytes";',
    '  readonly ordering: "sequence";',
    '}',
    '',
    'export interface ForgeWebScriptManifestTargetFeatures {',
    '  readonly simd?: boolean;',
    '  readonly tailCall?: boolean;',
    '  readonly memory64?: boolean;',
    '  readonly threads?: boolean;',
    '  readonly atomics?: boolean;',
    '}',
    '',
    'export interface ForgeWebScriptManifest {',
    '  readonly format: "forge-web-script-module";',
    `  readonly languageVersion: ${JSON.stringify(FORGE_WEB_SCRIPT_LANGUAGE_VERSION)};`,
    `  readonly abiVersion: ${JSON.stringify(FORGE_WEB_SCRIPT_ABI_VERSION)};`,
    '  readonly moduleName: string;',
    '  readonly exports: readonly ForgeWebScriptManifestFunction[];',
    '  readonly imports: readonly ForgeWebScriptManifestHostImport[];',
    '  readonly sourceImports: readonly ForgeWebScriptManifestSourceImport[];',
    '  readonly graphHash?: string;',
    '  readonly projectRoot?: string;',
    '  readonly linkMode?: "static" | "dynamic";',
    '  readonly linkProfile?: "static" | "dynamic";',
    '  readonly optimizationProfile?: "standard" | "static-aggressive" | "dynamic-conservative";',
    '  readonly linkedExports?: readonly ForgeWebScriptManifestLinkedExport[];',
    '  readonly requiredCapabilities: readonly string[];',
    '  readonly memory: ForgeWebScriptManifestMemoryLayout;',
    '  readonly valueRepresentations: Readonly<Record<ForgeWebScriptManifestPrimitiveType, ForgeWebScriptManifestValueRepresentation>>;',
    '  readonly trapModel: "explicit-trap";',
    '  readonly standardLibrary: ForgeWebScriptManifestStandardLibrary;',
    '  readonly aggregateLayouts: readonly ForgeWebScriptAggregateLayout[];',
    '  readonly enumDeclarations: readonly { readonly name: string; readonly exported: boolean; readonly representation: "i32"; readonly variants: readonly { readonly name: string; readonly value: number }[] }[];',
    '  readonly collectionLayouts: readonly { readonly type: string; readonly kind: "array" | "vector"; readonly elementType: string; readonly length?: number; readonly representation: "contiguous" | "owned-handle"; readonly ownership: ForgeWebScriptManifestOwnership }[];',
    '  readonly specializations: readonly ForgeWebScriptManifestSpecialization[];',
    '  readonly iteratorDescriptors: readonly ForgeWebScriptManifestIteratorDescriptor[];',
    '  readonly async?: ForgeWebScriptManifestAsync;',
    '  readonly targetFeatures?: ForgeWebScriptManifestTargetFeatures;',
    '}',
    'export type ForgeWebScriptAbiManifest = ForgeWebScriptManifest;',
    '',
    ...recordDeclarations,
    'export interface ForgeWebScriptExports {',
    '  readonly memory: WebAssembly.Memory;',
    declarationRecord(manifest.exports, enumNames, recordNames),
    '  readonly fws_alloc: (size: number) => number;',
    '  readonly fws_dealloc: (pointer: number, size: number) => void;',
    '  readonly fws_realloc: (pointer: number, oldSize: number, newSize: number) => number;',
    '  readonly fws_reset: () => void;',
    '}',
    '',
    'export interface ForgeWebScriptRawExports {',
    '  readonly memory: WebAssembly.Memory;',
    rawDeclarationRecord(manifest.exports),
    '  readonly fws_alloc: (size: number) => number;',
    '  readonly fws_dealloc: (pointer: number, size: number) => void;',
    '  readonly fws_realloc: (pointer: number, oldSize: number, newSize: number) => number;',
    '  readonly fws_reset: () => void;',
    '}',
    '',
    'export type ForgeWebScriptRawImports = WebAssembly.Imports;',
    '',
    'export interface ForgeWebScriptDynamicModuleExports {',
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
    'export interface ForgeWebScriptDynamicModuleLoaders {',
    dynamicLoaders || '  // This module has no dynamic source-module links.',
    '}',
    '',
    'export interface ForgeWebScriptImports {',
    capabilityImports,
    dynamicImports.length === 0 ? '' : '  readonly dynamicModules?: ForgeWebScriptDynamicModuleLoaders;',
    '}',
    '',
    'export interface ForgeWebScriptDynamicLinkMetadata {',
    '  readonly artifactId: string;',
    '  readonly manifestHash: string;',
    '  readonly modules: readonly { readonly moduleId: string; readonly alias: string; readonly exports: readonly ForgeWebScriptManifestFunction[] }[];',
    '}',
    '',
    'export const manifest: ForgeWebScriptManifest;',
    'export const abiManifest: ForgeWebScriptManifest;',
    'export const dynamicLinkMetadata: ForgeWebScriptDynamicLinkMetadata | undefined;',
    'export function resolveDynamicExport(alias: string, exportName: string, imports?: ForgeWebScriptImports): Promise<(...args: readonly number[]) => unknown>;',
    'export function resolveDynamicExportSync(alias: string, exportName: string, imports?: ForgeWebScriptImports): (...args: readonly number[]) => unknown;',
    'export function clearDynamicLinkCache(): void;',
    'export function load(imports?: ForgeWebScriptImports): Promise<ForgeWebScriptExports>;',
    'export function loadSync(imports?: ForgeWebScriptImports): ForgeWebScriptExports;',
    'declare const library: typeof loadSync;',
    'export default library;',
    'export function loadRaw(imports?: ForgeWebScriptRawImports): Promise<ForgeWebScriptRawExports>;',
    'export function loadRawSync(imports?: ForgeWebScriptRawImports): ForgeWebScriptRawExports;',
  ].join('\n');
}
