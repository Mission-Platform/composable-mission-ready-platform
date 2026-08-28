import {
  compileForgeWebScriptWasm,
  verifyForgeWebScriptWasmArtifact,
  type ForgeWebScriptWasmArtifactVerificationDiagnostic,
  type ForgeWebScriptWasmFeatureRequirements,
} from '@mission-platform/forge-web-script-wasm';

import { analyzeForgeWebScript } from './analysis/analyze.js';
import {
  forgeWebScriptWatCacheKey,
  persistForgeWebScriptDebugArtifacts,
  persistForgeWebScriptSoN,
  persistForgeWebScriptWat,
} from './cache.js';
import { createDiagnostic, type ForgeWebScriptDiagnostic } from './diagnostics.js';
import { prepareForgeWebScriptFrontend, prepareForgeWebScriptGraphFrontend } from './frontend.js';
import { hashForgeWebScriptModuleGraph } from './graph.js';
import { lexForgeWebScript } from './lexer.js';
import {
  FORGE_WEB_SCRIPT_ABI_VERSION,
  FORGE_WEB_SCRIPT_LANGUAGE_VERSION,
  type ForgeWebScriptAbiFunction,
  type ForgeWebScriptAbiManifest,
  type ForgeWebScriptAbiParameter,
  type ForgeWebScriptDynamicLinkMetadata,
} from './manifest.js';
import { forgeWebScriptStandardLibraryIdentity } from './stdlib/regex.js';

import type { ForgeWebScriptAnalysisOptions, ForgeWebScriptAnalysisReport } from './analysis/contracts.js';
import type { ForgeWebScriptPrimitiveType } from './ast.js';
import type {
  ForgeWebScriptArtifact,
  ForgeWebScriptCompileInput,
  ForgeWebScriptCompiler,
  ForgeWebScriptCompilerReport,
  ForgeWebScriptCompilerService,
  ForgeWebScriptCompilerServiceOptions,
  ForgeWebScriptFrontendResult,
  ForgeWebScriptGraphCompileInput,
  ForgeWebScriptArtifactVerificationReport,
  ForgeWebScriptIteratorExport,
  ForgeWebScriptSelfHostedStageReport,
} from './contracts.js';
interface ForgeWebScriptBackendCompilationResult {
  readonly wasm?: Uint8Array;
  readonly wat?: string;
  readonly unoptimizedWasm?: Uint8Array;
  readonly unoptimizedWat?: string;
  readonly iteratorExports?: readonly ForgeWebScriptIteratorExport[];
  readonly sourceMap?: string;
  readonly contentHash: string;
  readonly diagnostics: readonly ForgeWebScriptDiagnostic[];
  readonly metadata: Parameters<typeof compileForgeWebScriptWasm>[0]['metadata'];
  readonly featureRequirements?: ForgeWebScriptWasmFeatureRequirements;
}

export type {
  ForgeWebScriptArtifact,
  ForgeWebScriptCompileInput,
  ForgeWebScriptCompiler,
  ForgeWebScriptCompilerReport,
  ForgeWebScriptCompilerService,
  ForgeWebScriptGraphCompileInput,
} from './contracts.js';

const encoder = new TextEncoder();

function hashBytes(bytes: Uint8Array): string {
  let hash = 2_166_136_261;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function sourceHashForArtifact(source: string, fileName: string): string {
  const tokens = lexForgeWebScript(source, fileName)
    .tokens.filter(({ kind }) => kind !== 'comment' && kind !== 'eof')
    .map(({ kind, text }) => `${kind}\0${text}`)
    .join('\0');
  return hashBytes(encoder.encode(tokens));
}

function analysisOptions(input: ForgeWebScriptCompileInput): ForgeWebScriptAnalysisOptions {
  const nested = input.analysis ?? {};
  const policy = nested.policy ?? input.analysisPolicy;
  const policyWithCapabilities =
    input.requestedCapabilities === undefined || policy?.allowedCapabilities !== undefined
      ? policy
      : { ...policy, allowedCapabilities: input.requestedCapabilities };
  return {
    ...nested,
    ...(input.targetFeatures === undefined ? {} : { targetFeatures: input.targetFeatures }),
    ...(policyWithCapabilities === undefined ? {} : { policy: policyWithCapabilities }),
    ...(input.analysisRules === undefined ? {} : { rules: input.analysisRules }),
    ...(input.analysisSourceMap === undefined ? {} : { sourceMap: input.analysisSourceMap }),
  };
}

function artifactVerificationDiagnostic(
  diagnostic: ForgeWebScriptWasmArtifactVerificationDiagnostic,
): ForgeWebScriptDiagnostic {
  return createDiagnostic(
    diagnostic.fileName,
    'artifact',
    diagnostic.code,
    diagnostic.message,
    diagnostic.span,
    diagnostic.severity,
    diagnostic.hint,
    {
      category: 'artifact',
      blocking: diagnostic.severity === 'error',
      evidence: diagnostic.evidence,
    },
  );
}

function dynamicLinkMetadata(
  manifest: ForgeWebScriptAbiManifest,
  artifactId: string,
): ForgeWebScriptDynamicLinkMetadata | undefined {
  const modules = manifest.sourceImports
    .filter((sourceImport) => sourceImport.linkMode === 'dynamic' && sourceImport.resolvedModuleId !== undefined)
    .map((sourceImport) => ({
      moduleId: sourceImport.resolvedModuleId as string,
      alias: sourceImport.alias,
      exports: sourceImport.exports ?? [],
    }))
    .toSorted((left, right) => left.moduleId.localeCompare(right.moduleId));
  if (modules.length === 0) return undefined;
  return {
    artifactId,
    manifestHash: hashBytes(encoder.encode(JSON.stringify(manifest))),
    modules,
  };
}

function declarationType(
  value: ForgeWebScriptPrimitiveType | ForgeWebScriptAbiParameter,
  enumNames?: ReadonlySet<string>,
): string {
  if (typeof value !== 'string') {
    if (value.reference === 'Array' && value.arguments?.[0]?.name === 'i32') return 'ArrayLike<number>';
    if (value.reference !== undefined && enumNames?.has(value.reference)) return value.reference;
    value = value.type;
  }
  if (value === 'unit') return 'void';
  if (value === 'string') return 'string';
  if (value === 'bytes') return 'ForgeWebScriptBytes';
  if (value === 'i64' || value === 'u64') return 'bigint';
  return 'number';
}

function declarationProperty(name: string): string {
  return /^[$A-Z_a-z][$\w]*$/u.test(name) ? name : JSON.stringify(name);
}

function declarationFunction(declaration: ForgeWebScriptAbiFunction, enumNames?: ReadonlySet<string>): string {
  const result = {
    name: 'result',
    type: declaration.result,
    ...(declaration.resultReference === undefined ? {} : { reference: declaration.resultReference }),
    ...(declaration.resultArguments === undefined ? {} : { arguments: declaration.resultArguments }),
    ...(declaration.resultLength === undefined ? {} : { length: declaration.resultLength }),
    ...(declaration.resultOwnership === undefined ? {} : { ownership: declaration.resultOwnership }),
    ...(declaration.resultPassing === undefined ? {} : { passing: declaration.resultPassing }),
    ...(declaration.resultReferenceMode === undefined ? {} : { referenceMode: declaration.resultReferenceMode }),
  } satisfies ForgeWebScriptAbiParameter;
  return `(${declaration.parameters.map((parameter) => `${declarationProperty(parameter.name)}: ${declarationType(parameter, enumNames)}`).join(', ')}) => ${declarationType(result, enumNames)}`;
}

function rawDeclarationType(value: ForgeWebScriptPrimitiveType | ForgeWebScriptAbiParameter): string {
  if (typeof value !== 'string' && value.reference === 'Array') return 'number';
  if (typeof value !== 'string') value = value.type;
  if (value === 'string' || value === 'bytes') return 'number';
  if (value === 'unit') return 'void';
  if (value === 'i64' || value === 'u64') return 'bigint';
  return 'number';
}

function rawDeclarationFunction(declaration: ForgeWebScriptAbiFunction): string {
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

function rawDeclarationRecord(declarations: readonly ForgeWebScriptAbiFunction[]): string {
  return declarations
    .map(
      (declaration) => `  readonly ${declarationProperty(declaration.name)}: ${rawDeclarationFunction(declaration)};`,
    )
    .join('\n');
}

function declarationRecord(
  declarations: readonly ForgeWebScriptAbiFunction[],
  enumNames?: ReadonlySet<string>,
): string {
  return declarations
    .map(
      (declaration) =>
        `  readonly ${declarationProperty(declaration.name)}: ${declarationFunction(declaration, enumNames)};`,
    )
    .join('\n');
}

function createDeclarations(manifest: ForgeWebScriptAbiManifest): string {
  const enumNames = new Set(manifest.enumDeclarations.filter(({ exported }) => exported).map(({ name }) => name));
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
    'export interface ForgeWebScriptExports {',
    '  readonly memory: WebAssembly.Memory;',
    declarationRecord(manifest.exports, enumNames),
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

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCodePoint(byte);
  return btoa(binary);
}

function createEsmSource(
  wasm: Uint8Array,
  manifest: ForgeWebScriptAbiManifest,
  iteratorExports: readonly ForgeWebScriptIteratorExport[] = [],
  dynamicMetadata?: ForgeWebScriptDynamicLinkMetadata,
): string {
  const base64 = bytesToBase64(wasm);
  const byteArray = [...wasm].join(',');
  const enumExports = manifest.enumDeclarations
    .filter(({ exported }) => exported)
    .map(
      (declaration) =>
        `export const ${declarationProperty(declaration.name)} = Object.freeze({ ${declaration.variants
          .map(({ name, value }) => `${declarationProperty(name)}: ${value}`)
          .join(', ')} });`,
    )
    .join('\n');
  const stringImports = manifest.imports.filter(
    ({ function: declaration }) =>
      declaration.parameters.some(({ type }) => type === 'string') || declaration.result === 'string',
  );
  const valueImports = manifest.imports.filter(
    ({ function: declaration }) =>
      declaration.parameters.some(({ type }) => type === 'string' || type === 'bytes') ||
      declaration.result === 'string' ||
      declaration.result === 'bytes',
  );
  const hasStringImports = stringImports.length > 0;
  const valueExports = Object.fromEntries(
    manifest.exports
      .filter(
        (declaration) =>
          hasStringImports ||
          declaration.parameters.some(
            ({ type, reference }) => type === 'string' || type === 'bytes' || reference === 'Array',
          ) ||
          declaration.result === 'string',
      )
      .map((declaration) => [
        declaration.name,
        {
          parameters: declaration.parameters.map(
            ({ type, reference, arguments: typeArguments, length, ownership }) => ({
              type,
              ...(reference === undefined ? {} : { reference }),
              ...(typeArguments === undefined ? {} : { arguments: typeArguments }),
              ...(length === undefined ? {} : { length }),
              ...(ownership === undefined ? {} : { ownership }),
            }),
          ),
          result: declaration.result,
        },
      ]),
  );
  const hasValueExports = Object.keys(valueExports).length > 0;
  const hasValueImports = valueImports.length > 0;
  const hasValueAdapters = hasValueExports || hasValueImports;
  const hasStringExports = manifest.exports.some(
    (declaration) => declaration.parameters.some(({ type }) => type === 'string') || declaration.result === 'string',
  );
  const functionNames = [
    ...new Set([
      ...manifest.exports.map(({ name }) => name),
      ...iteratorExports.flatMap(({ name, nextFunction }) => [name, nextFunction]),
      manifest.memory.allocatorExport,
      manifest.memory.deallocatorExport,
      manifest.memory.reallocatorExport,
      'fws_reset',
    ]),
  ];
  const hasStringValues = hasStringExports || hasStringImports;
  const valueAdapter = hasValueAdapters
    ? `const valueExports = ${JSON.stringify(valueExports)};
function createValueRuntime() { return { wasmExports: undefined, activeAllocations: undefined }; }
function checkedBytes(memory, pointer, length) {
  if (!Number.isSafeInteger(pointer) || pointer < 0 || !Number.isSafeInteger(length) || length < 0) {
    throw new RangeError('Forge Web Script string range is not a non-negative safe integer pair.');
  }
  const buffer = memory.buffer;
  if (pointer > buffer.byteLength || length > buffer.byteLength - pointer) {
    throw new RangeError('Forge Web Script string range [' + pointer + ', ' + length + '] is outside linear memory.');
  }
  return new Uint8Array(buffer, pointer, length);
}
function arraySnapshot(value) {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    throw new TypeError('Forge Web Script Array<i32> argument must be ArrayLike<number>.');
  }
  const length = value.length;
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new RangeError('Forge Web Script Array<i32> length must be a non-negative safe integer.');
  }
  if (length > 0x3ffffffe || (length + 1) * 4 > 0xffffffff) {
    throw new RangeError('Forge Web Script Array<i32> is too large.');
  }
  const values = new Int32Array(length);
  for (let index = 0; index < length; index += 1) {
    const element = value[index];
    if (!Number.isInteger(element) || element < -0x80000000 || element > 0x7fffffff) {
      throw new TypeError('Forge Web Script Array<i32> element at index ' + index + ' must be a signed 32-bit integer.');
    }
    values[index] = element;
  }
  return values;
}
function allocateArray(wasmExports, value) {
  const values = value instanceof Int32Array ? value : arraySnapshot(value);
  if (values.length > 0x3ffffffe || (values.length + 1) * 4 > 0xffffffff) {
    throw new RangeError('Forge Web Script Array<i32> is too large.');
  }
  const byteLength = (values.length + 1) * 4;
  const pointer = wasmExports.fws_alloc(byteLength);
  return { pointer, length: byteLength, values };
}
function pair(runtime, value, message) {
  if (!Array.isArray(value) || value.length < 2) throw new TypeError(message);
  checkedBytes(runtime.wasmExports.memory, value[0], value[1]);
  return [value[0], value[1]];
}
function rangesOverlap(left, right) {
  if (left.length === 0 || right.length === 0) return left.pointer === right.pointer;
  return left.pointer < right.pointer + right.length && right.pointer < left.pointer + left.length;
}
function release(wasmExports, range, released) {
  const key = range.pointer + ':' + range.length;
  if (released.has(key)) return;
  released.add(key);
  wasmExports.fws_dealloc(range.pointer, range.length);
}
${
  hasStringValues
    ? `const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
`
    : ''
}${
        hasStringValues
          ? `function decodeString(runtime, memory, value) {
  const range = pair(runtime, value, 'Forge Web Script string result is not a pointer-length pair.');
  return { bytes: checkedBytes(memory, range[0], range[1]), range: { pointer: range[0], length: range[1] } };
}
`
          : ''
      }function invokeValueExport(wasmExports, rawFunction, metadata, args, runtime) {
  const encoded = [];
  let total = 0;
  let stringCount = 0;
  for (let index = 0; index < metadata.parameters.length; index += 1) {
    if (metadata.parameters[index].type !== 'string') continue;
    stringCount += 1;
    if (typeof args[index] !== 'string') throw new TypeError('Forge Web Script string argument must be a JavaScript string.');
    const bytes = encoder.encode(args[index]);
    encoded.push(bytes);
    total += bytes.byteLength;
    if (!Number.isSafeInteger(total) || total > 0xffffffff) throw new RangeError('Forge Web Script string input is too large.');
  }
  // Guest allocations are bump-allocated. Reset before each independent value
  // call so temporary graph buffers from a previous call cannot exhaust the
  // Wasm page; result bytes remain valid until this invocation finishes.
  if (stringCount !== 0) wasmExports.fws_reset();
  const inputPointer = stringCount === 0 ? undefined : wasmExports.fws_alloc(total);
  let output;
  const owned = [];
  const previousOwned = runtime.activeAllocations;
  runtime.activeAllocations = owned;
  let operationError;
  try {
    const rawArgs = [];
    let encodedIndex = 0;
    let offset = 0;
    for (let index = 0; index < metadata.parameters.length; index += 1) {
      const parameter = metadata.parameters[index];
      if (parameter.type === 'bytes') {
        const value = args[index];
        if (!Array.isArray(value) || value.length < 2) throw new TypeError('Forge Web Script bytes value is not a pointer-length pair.');
        rawArgs.push(value[0], value[1]);
        continue;
      }
      if (parameter.reference === 'Array') {
        const array = allocateArray(wasmExports, args[index]);
        owned.push({ pointer: array.pointer, length: array.length });
        checkedBytes(wasmExports.memory, array.pointer, array.length);
        const view = new DataView(wasmExports.memory.buffer, array.pointer, array.length);
        view.setInt32(0, array.values.length, true);
        new Uint8Array(wasmExports.memory.buffer, array.pointer + 4, array.values.byteLength).set(
          new Uint8Array(array.values.buffer, array.values.byteOffset, array.values.byteLength),
        );
        rawArgs.push(array.pointer);
        continue;
      }
      if (parameter.type !== 'string') {
        rawArgs.push(args[index]);
        continue;
      }
      const bytes = encoded[encodedIndex++];
      checkedBytes(wasmExports.memory, inputPointer + offset, bytes.byteLength).set(bytes);
      rawArgs.push(inputPointer + offset, bytes.byteLength);
      offset += bytes.byteLength;
    }
    const result = rawFunction(...rawArgs);
    if (metadata.result === 'string') {
      const decoded = decodeString(runtime, wasmExports.memory, result);
      output = decoded.range;
      return decoder.decode(decoded.bytes);
    }
    return result;
  } catch (error) {
    operationError = error;
    throw error;
  } finally {
    const released = new Set();
    const input = inputPointer === undefined ? undefined : { pointer: inputPointer, length: total };
    const outputAliases = output !== undefined && (input !== undefined && rangesOverlap(output, input) || owned.some((range) => rangesOverlap(output, range)));
    try {
      if (output !== undefined && !outputAliases) release(wasmExports, output, released);
      for (const range of owned) release(wasmExports, range, released);
      if (input !== undefined) release(wasmExports, input, released);
    } catch (cleanupError) {
      if (operationError === undefined) throw cleanupError;
    } finally {
      runtime.activeAllocations = previousOwned;
    }
  }
}
function invokeCapability(hostFunction, metadata, args, runtime) {
  const hostArgs = [];
  let rawIndex = 0;
  for (const type of metadata.parameters) {
    if (type === 'string') {
      const value = pair(runtime, [args[rawIndex], args[rawIndex + 1]], 'Forge Web Script string import argument is not a pointer-length pair.');
      hostArgs.push(decoder.decode(checkedBytes(runtime.wasmExports.memory, value[0], value[1])));
      rawIndex += 2;
    } else if (type === 'bytes') {
      const value = pair(runtime, [args[rawIndex], args[rawIndex + 1]], 'Forge Web Script bytes import argument is not a pointer-length pair.');
      hostArgs.push(value);
      rawIndex += 2;
    } else {
      hostArgs.push(args[rawIndex]);
      rawIndex += 1;
    }
  }
  const result = hostFunction(...hostArgs);
  if (metadata.result === 'string') {
    if (typeof result !== 'string') throw new TypeError('Forge Web Script string capability result must be a JavaScript string.');
    const bytes = encoder.encode(result);
    const pointer = runtime.wasmExports.fws_alloc(bytes.byteLength);
    try {
      checkedBytes(runtime.wasmExports.memory, pointer, bytes.byteLength).set(bytes);
    } catch (error) {
      try { release(runtime.wasmExports, { pointer, length: bytes.byteLength }, new Set()); } catch {}
      throw error;
    }
    runtime.activeAllocations?.push({ pointer, length: bytes.byteLength });
    return [pointer, bytes.byteLength];
  }
  if (metadata.result === 'bytes') return pair(runtime, result, 'Forge Web Script bytes capability result is not a pointer-length pair.');
  return result;
}
function adaptCapabilityImports(imports, runtime) {
  const adapted = { ...imports };
  for (const metadata of ${JSON.stringify(
    valueImports.map(({ capability, alias, function: declaration }) => ({
      capability,
      alias,
      parameters: declaration.parameters.map(({ type }) => type),
      result: declaration.result,
    })),
  )}) {
    const capability = adapted[metadata.capability];
    if (capability === undefined || typeof capability[metadata.alias] !== 'function') continue;
    adapted[metadata.capability] = {
      ...capability,
      [metadata.alias]: (...args) => invokeCapability(capability[metadata.alias], metadata, args, runtime),
    };
  }
  return adapted;
}
function initializeValueRuntime(runtime, wasmExports) {
  runtime.wasmExports = wasmExports;
}
function adaptValueExports(wasmExports, runtime) {
  return Object.fromEntries(Object.entries(wasmExports).map(([name, value]) => {
    const metadata = valueExports[name];
    if (metadata === undefined || typeof value !== 'function') return [name, value];
    return [name, (...args) => invokeValueExport(wasmExports, value, metadata, args, runtime)];
  }));
}`
    : `function adaptValueExports(wasmExports) {
  return wasmExports;
}`;
  return `${enumExports}${enumExports.length === 0 ? '' : '\n'}const wasm = Uint8Array.from([${byteArray}]);
const wasmBase64 = '${base64}';
export const manifest = ${JSON.stringify(manifest)};
export const dynamicLinkMetadata = ${JSON.stringify(dynamicMetadata)};
const dynamicModuleCache = new Map();
const dynamicExportCache = new Map();
function dynamicModule(alias, imports) {
  const loader = imports.dynamicModules?.[alias];
  if (typeof loader !== 'function') throw new Error('Forge Web Script dynamic module loader "' + alias + '" is missing.');
  let loaded = dynamicModuleCache.get(alias);
  if (loaded === undefined) {
    loaded = Promise.resolve(loader());
    dynamicModuleCache.set(alias, loaded);
  }
  return loaded;
}
export async function resolveDynamicExport(alias, exportName, imports = {}) {
  const key = alias + '\\0' + exportName;
  let cached = dynamicExportCache.get(key);
  if (cached === undefined) {
    cached = dynamicModule(alias, imports).then((module) => {
      const callable = module?.[exportName];
      if (typeof callable !== 'function') throw new Error('Forge Web Script dynamic export "' + exportName + '" is missing from module "' + alias + '".');
      return callable;
    });
    dynamicExportCache.set(key, cached);
  }
  return cached;
}
export function resolveDynamicExportSync(alias, exportName, imports = {}) {
  const key = alias + '\\0' + exportName;
  const cached = dynamicExportCache.get(key);
  if (cached !== undefined && typeof cached === 'function') return cached;
  const loader = imports.dynamicModules?.[alias];
  if (typeof loader !== 'function') throw new Error('Forge Web Script dynamic module loader "' + alias + '" is missing.');
  let module = dynamicModuleCache.get(alias);
  if (module === undefined || typeof module.then === 'function') {
    module = loader();
    dynamicModuleCache.set(alias, module);
  }
  const callable = module?.[exportName];
  if (typeof callable !== 'function') throw new Error('Forge Web Script dynamic export "' + exportName + '" is missing from module "' + alias + '".');
  dynamicExportCache.set(key, callable);
  return callable;
}
export function clearDynamicLinkCache() {
  dynamicModuleCache.clear();
  dynamicExportCache.clear();
}
function decodeWasm() {
  return Uint8Array.from(atob(wasmBase64), (character) => character.charCodeAt(0));
}
function validateExports(exports) {
  for (const name of ${JSON.stringify(functionNames)}) {
    if (typeof exports[name] !== 'function') throw new Error(\`Forge Web Script export "\${name}" is missing or is not callable.\`);
  }
  return exports;
}
function adaptIterator(handle, nextFn) {
  if (handle && typeof handle.next === 'function') return handle;
  if (typeof nextFn !== 'function') {
    let complete = false;
    return {
      next() {
        if (complete) return { value: undefined, done: true };
        complete = true;
        return { value: handle, done: false };
      },
      [Symbol.iterator]() { return this; }
    };
  }
  let state = handle ?? 0;
  let finished = false;
  return {
    next() {
      if (finished) return { value: undefined, done: true };
      const packed = nextFn(state);
      const bits = typeof packed === 'bigint' ? packed : BigInt(packed);
      const value = Number(bits & 0xffffffffn) | 0;
      const done = (bits >> 32n) !== 0n;
      state = (state + 1) | 0;
      if (done) {
        finished = true;
        return { value: undefined, done: true };
      }
      return { value, done: false };
    },
    [Symbol.iterator]() { return this; }
  };
}
function adaptIteratorExports(exports) {
  const adapters = ${JSON.stringify(iteratorExports)};
  return Object.fromEntries(Object.entries(exports).map(([name, value]) => {
    const meta = adapters.find((entry) => entry.name === name);
    if (meta && typeof value === 'function') {
      const nextFn = exports[meta.nextFunction];
      return [name, (...args) => adaptIterator(value(...args), nextFn)];
    }
    return [name, value];
  }));
}
${valueAdapter}
export async function load(imports = {}) {
  const runtime = ${hasValueAdapters ? 'createValueRuntime()' : 'undefined'};
  const result = await WebAssembly.instantiate(wasm, ${hasValueAdapters ? 'adaptCapabilityImports(imports, runtime)' : '{ ...imports }'});
  const wasmExports = validateExports(result.instance.exports);
  ${hasValueAdapters ? 'initializeValueRuntime(runtime, wasmExports);' : ''}
  return adaptIteratorExports(adaptValueExports(wasmExports, runtime));
}
export function loadSync(imports = {}) {
  const runtime = ${hasValueAdapters ? 'createValueRuntime()' : 'undefined'};
  const module = new WebAssembly.Module(decodeWasm());
  const instance = new WebAssembly.Instance(module, ${hasValueAdapters ? 'adaptCapabilityImports(imports, runtime)' : '{ ...imports }'});
  const wasmExports = validateExports(instance.exports);
  ${hasValueAdapters ? 'initializeValueRuntime(runtime, wasmExports);' : ''}
  return adaptIteratorExports(adaptValueExports(wasmExports, runtime));
}
export async function loadRaw(imports = {}) {
  const result = await WebAssembly.instantiate(wasm, imports);
  return validateExports(result.instance.exports);
}
export function loadRawSync(imports = {}) {
  const module = new WebAssembly.Module(decodeWasm());
  const instance = new WebAssembly.Instance(module, imports);
  return validateExports(instance.exports);
}
`;
}

function compileForgeWebScriptModule(
  input: ForgeWebScriptCompileInput,
  frontend: ForgeWebScriptFrontendResult,
  graphMetadata: Pick<
    ForgeWebScriptArtifact,
    'graphHash' | 'linkMode' | 'linkedModules' | 'linkProfile' | 'optimizationProfile'
  > = {},
  sourceFiles: readonly string[] = frontend.sourceFiles,
): ForgeWebScriptArtifact {
  const diagnostics = [...frontend.diagnostics];
  const analysis = analyzeForgeWebScript(frontend, analysisOptions(input));
  diagnostics.push(...analysis.diagnostics);
  input.logger?.log('info', 'compile.start', { fileName: input.fileName });
  const emptyHash = hashBytes(
    encoder.encode(
      `${input.fileName}\0${input.source}\0${input.compilerVersion}\0${input.requireExports ?? true}\0${graphMetadata.graphHash ?? ''}\0${input.logger?.scope ?? ''}\0${JSON.stringify(forgeWebScriptStandardLibraryIdentity(input.standardLibrary))}`,
    ),
  );
  if (
    frontend.diagnostics.length > 0 ||
    analysis.blockingFindings.length > 0 ||
    frontend.optimizedModule === undefined ||
    frontend.abi === undefined
  )
    return { esmSource: '', declarations: '', contentHash: emptyHash, diagnostics, analysis, ...graphMetadata };
  const optimization = input.optimization ?? (frontend.links.linkProfile === undefined ? 'debug' : 'release');
  const module = frontend.optimizedModule;
  const manifest = frontend.abi;
  const backend = compileForgeWebScriptWasm(
    {
      // The seed backend currently accepts the primitive projection. Aggregate
      // IR metadata remains available to later backends without changing this
      // public compilation contract.
      ir: {
        ...frontend.ir!,
        memoryModel: 'region-arc-checked-linear' as const,
        enumDeclarations: frontend.ir!.enums.map((declaration) => ({
          name: declaration.name,
          exported: declaration.exported,
          representation: 'i32' as const,
          variants: declaration.variants.map(({ name, tag }) => ({ name, value: tag })),
        })),
      } as unknown as Parameters<typeof compileForgeWebScriptWasm>[0]['ir'],
      optimizedIr: {
        ...frontend.optimizedIr!,
        memoryModel: 'region-arc-checked-linear' as const,
        enumDeclarations: frontend.optimizedIr!.enums.map((declaration) => ({
          name: declaration.name,
          exported: declaration.exported,
          representation: 'i32' as const,
          variants: declaration.variants.map(({ name, tag }) => ({ name, value: tag })),
        })),
      } as unknown as Parameters<typeof compileForgeWebScriptWasm>[0]['optimizedIr'],
      abi: manifest,
      links: frontend.links,
      metadata: {
        compilerVersion: input.compilerVersion,
        optimization,
        sourceFiles,
        sourceHash: sourceHashForArtifact(input.source, input.fileName),
        memoryModel: 'region-arc-checked-linear' as const,
        ...(graphMetadata.graphHash === undefined ? {} : { graphHash: graphMetadata.graphHash }),
        ...(input.targetFeatures === undefined ? {} : { targetFeatures: input.targetFeatures }),
        ...(input.compilerHints === undefined ? {} : { compilerHints: input.compilerHints }),
        boundsChecks: input.boundsChecks ?? 'runtime',
        ...(frontend.sonIr === undefined
          ? {}
          : {
              sonSchemaVersion: frontend.sonIr.schemaVersion,
              sonGraphHash: frontend.sonIr.graphHash,
              sonOptimizationPasses: frontend.sonIr.optimizationReport?.passes.map(({ name }) => name),
            }),
        ...(input.logger === undefined ? {} : { loggerScope: input.logger.scope }),
      },
      logger: input.logger,
    },
    input.fileName,
  ) as unknown as ForgeWebScriptBackendCompilationResult;
  const backendDiagnostics = backend.diagnostics as readonly ForgeWebScriptDiagnostic[];
  if (backendDiagnostics.length > 0 || backend.wasm === undefined) {
    input.logger?.log('error', 'compile.failed', { fileName: input.fileName, diagnostics: backendDiagnostics.length });
    return {
      esmSource: '',
      declarations: '',
      contentHash: emptyHash,
      diagnostics: [...diagnostics, ...backendDiagnostics],
      ...graphMetadata,
    };
  }
  const wasm = backend.wasm;
  const wat = backend.wat ?? '';
  const sourceMap = backend.sourceMap;
  const contentHash = hashBytes(wasm);
  const dynamicMetadata = dynamicLinkMetadata(manifest, contentHash);
  const esmSource = createEsmSource(wasm, manifest, backend.iteratorExports ?? [], dynamicMetadata);
  const rawVerification = verifyForgeWebScriptWasmArtifact({
    wasm,
    ...(backend.unoptimizedWasm === undefined ? {} : { unoptimizedWasm: backend.unoptimizedWasm }),
    fileName: input.fileName,
    manifest: manifest as unknown as Parameters<typeof verifyForgeWebScriptWasmArtifact>[0]['manifest'],
    metadata: backend.metadata,
    targetFeatures: input.targetFeatures,
    featureRequirements: backend.featureRequirements,
    ...(backend.iteratorExports === undefined ? {} : { iteratorExports: backend.iteratorExports }),
    expectedContentHash: backend.contentHash,
    expectedSourceHash: sourceHashForArtifact(input.source, input.fileName),
    esmSource,
    policy: {
      profile: analysis.policy.profile,
      allowedCapabilities: analysis.policy.allowedCapabilities,
    },
  });
  const verificationDiagnostics = rawVerification.diagnostics.map((diagnostic) =>
    artifactVerificationDiagnostic(diagnostic),
  );
  const artifactVerification: ForgeWebScriptArtifactVerificationReport = {
    verified: rawVerification.verified,
    diagnostics: verificationDiagnostics,
    contentHash: rawVerification.contentHash,
    checkedVariants: rawVerification.checkedVariants,
  };
  const strictArtifactFailure = analysis.policy.profile === 'strict' && !rawVerification.verified;
  if (strictArtifactFailure) {
    input.logger?.log('error', 'compile.failed.artifact-verification', {
      fileName: input.fileName,
      diagnostics: verificationDiagnostics.length,
    });
    return {
      esmSource: '',
      declarations: '',
      manifest,
      contentHash,
      diagnostics: [...diagnostics, ...verificationDiagnostics],
      analysis,
      artifactVerification,
      ...graphMetadata,
    };
  }
  const cacheKey = forgeWebScriptWatCacheKey({
    compilerVersion: input.compilerVersion,
    optimization,
    graphHash: graphMetadata.graphHash,
    sourceGraph: sourceFiles.map((fileName) => ({
      fileName,
      moduleId: module.name,
      contentHash: hashBytes(encoder.encode(input.source)),
    })),
    linkConfiguration: input.linkConfiguration,
    standardLibrary: forgeWebScriptStandardLibraryIdentity(input.standardLibrary),
    targetFeatures: input.targetFeatures,
    compilerHints: input.compilerHints,
    loggerScope: input.logger?.scope,
    analysisPolicy: analysis.policy,
    analysisRuleIds: analysisOptions(input)
      .rules?.map(({ id }) => id)
      .toSorted(),
    analysisSourceMap: input.analysisSourceMap ?? input.analysis?.sourceMap,
    sonSchemaVersion: frontend.sonIr?.schemaVersion,
    sonGraphHash: frontend.sonIr?.graphHash,
    memoryModel: 'region-arc-checked-linear',
    boundsChecks: input.boundsChecks ?? 'runtime',
  });
  const debugArtifacts =
    optimization === 'debug'
      ? {
          optimizedWat: backend.wat,
          unoptimizedWat: backend.unoptimizedWat,
          optimizedWasm: backend.wasm,
          unoptimizedWasm: backend.unoptimizedWasm,
        }
      : undefined;
  const cache =
    input.watCache === undefined
      ? undefined
      : { ...input.watCache, ...(input.logger === undefined ? {} : { logger: input.logger }) };
  const sonIrPath = persistForgeWebScriptSoN(cache, cacheKey, frontend.sonIr!);
  const unoptimizedSonIrPath =
    optimization === 'debug' && frontend.unoptimizedSonIr !== undefined
      ? persistForgeWebScriptSoN(cache, cacheKey, frontend.unoptimizedSonIr, 'unoptimized')
      : undefined;
  const debugPaths =
    cache?.writeBinaryAtomic === undefined
      ? {}
      : persistForgeWebScriptDebugArtifacts(cache, cacheKey, debugArtifacts ?? {});
  const watPath = debugPaths.optimizedWatPath ?? persistForgeWebScriptWat(cache, cacheKey, wat);
  input.logger?.log('info', 'compile.complete', { fileName: input.fileName, contentHash: hashBytes(wasm) });
  return {
    wasm,
    esmSource,
    declarations: createDeclarations(manifest),
    manifest,
    ...(sourceMap === undefined ? {} : { sourceMap }),
    contentHash,
    wat,
    ...(watPath === undefined ? {} : { watPath }),
    ...(sonIrPath === undefined ? {} : { sonIrPath }),
    ...(unoptimizedSonIrPath === undefined ? {} : { unoptimizedSonIrPath }),
    ...(debugPaths.unoptimizedWatPath === undefined ? {} : { unoptimizedWatPath: debugPaths.unoptimizedWatPath }),
    ...(debugPaths.optimizedWasmPath === undefined ? {} : { optimizedWasmPath: debugPaths.optimizedWasmPath }),
    ...(debugPaths.unoptimizedWasmPath === undefined ? {} : { unoptimizedWasmPath: debugPaths.unoptimizedWasmPath }),
    ...(debugArtifacts === undefined ? {} : { debugArtifacts }),
    ...(backend.iteratorExports === undefined ? {} : { iteratorExports: backend.iteratorExports }),
    ...(input.targetFeatures === undefined ? {} : { targetFeatures: input.targetFeatures }),
    ...(input.compilerHints === undefined ? {} : { compilerHints: input.compilerHints }),
    optimizationReport: frontend.optimizationReport,
    sonIr: frontend.sonIr,
    sonOptimizationReport: frontend.sonOptimizationReport,
    ...(dynamicMetadata === undefined ? {} : { dynamicLinkMetadata: dynamicMetadata }),
    diagnostics: [...analysis.diagnostics, ...verificationDiagnostics],
    analysis,
    artifactVerification,
    ...graphMetadata,
  };
}

/**
 * The bounded TypeScript seed used by the self-hosted bootstrap until fixed-
 * point parity promotes the FWS compiler to the normal frontend owner.
 */
export function compileForgeWebScriptSeed(input: ForgeWebScriptCompileInput): ForgeWebScriptArtifact {
  return compileForgeWebScriptModule(input, prepareForgeWebScriptFrontend(input));
}

export function compileForgeWebScript(input: ForgeWebScriptCompileInput): ForgeWebScriptArtifact {
  return compileForgeWebScriptSeed(input);
}

export function createForgeWebScriptCompiler(): ForgeWebScriptCompiler {
  let disposed = false;
  return {
    compile(input): ForgeWebScriptArtifact {
      if (disposed) throw new Error('Forge Web Script compiler has been disposed.');
      return compileForgeWebScript(input);
    },
    dispose(): void {
      disposed = true;
    },
  };
}

function compileForgeWebScriptGraph(input: ForgeWebScriptGraphCompileInput): ForgeWebScriptArtifact {
  const frontend = prepareForgeWebScriptGraphFrontend(input);
  return compileForgeWebScriptModule(
    {
      source: frontend.source,
      fileName: input.entryFileName,
      compilerVersion: input.compilerVersion,
      requireExports: input.requireExports,
      optimization: input.optimization ?? (input.linkProfile === undefined ? undefined : 'release'),
      requestedCapabilities: input.requestedCapabilities,
      watCache: input.watCache,
      linkConfiguration: input.linkConfiguration,
      linkProfile: input.linkProfile,
      standardLibrary: input.standardLibrary,
      targetFeatures: input.targetFeatures,
      compilerHints: input.compilerHints,
      boundsChecks: input.boundsChecks,
      logger: input.logger,
      analysis: {
        ...input.analysis,
        sourceFiles:
          input.analysis?.sourceFiles ?? input.graph.modules.map(({ fileName, source }) => ({ fileName, source })),
      },
      analysisPolicy: input.analysisPolicy,
      analysisRules: input.analysisRules,
      analysisSourceMap: input.analysisSourceMap,
    },
    frontend,
    {
      graphHash: frontend.links.graphHash,
      linkMode: frontend.links.linkMode,
      linkedModules: frontend.links.linkedModules,
      linkProfile: frontend.links.linkProfile,
      optimizationProfile: frontend.links.optimizationProfile,
    },
  );
}

function selfHostedDiagnostic(
  input: Pick<ForgeWebScriptCompileInput, 'fileName'>,
  message: string,
  stage: ForgeWebScriptSelfHostedStageReport['stage'] = 'lex',
): ForgeWebScriptDiagnostic {
  return createDiagnostic(input.fileName, stage === 'parse' ? 'parse' : 'lex', 'FWS-BOOTSTRAP-001', message, {
    start: 0,
    end: 0,
    line: 1,
    column: 1,
    endLine: 1,
    endColumn: 1,
  });
}

function runSelfHostedStage(
  input: Pick<ForgeWebScriptCompileInput, 'source' | 'fileName' | 'compilerVersion' | 'requestedCapabilities'>,
  options: ForgeWebScriptCompilerServiceOptions,
): {
  readonly report?: ForgeWebScriptSelfHostedStageReport;
  readonly stageReports?: readonly ForgeWebScriptSelfHostedStageReport[];
  readonly diagnostic?: ForgeWebScriptDiagnostic;
} {
  if (options.selfHostedRunner === undefined) return {};
  const mode = options.selfHostedVmMode ?? 'interpret';
  try {
    const report = options.selfHostedRunner(input, mode);
    const stageReports = [report, ...(report.stageReports ?? [])];
    const failed = stageReports.find(({ parity }) => !parity);
    return failed === undefined
      ? { report, stageReports }
      : {
          report,
          stageReports,
          diagnostic: selfHostedDiagnostic(
            input,
            `FWS VM ${failed.stage ?? 'lex'} stage parity failed in ${mode} mode: expected ${failed.expectedOutputHash ?? failed.expectedLexFingerprint}, received ${failed.outputHash ?? failed.lexFingerprint}.`,
            failed.stage,
          ),
        };
  } catch (error: unknown) {
    return {
      diagnostic: selfHostedDiagnostic(
        input,
        `FWS VM bootstrap failed in ${mode} mode: ${error instanceof Error ? error.message : String(error)}`,
      ),
    };
  }
}

function withSelfHostedResult(
  artifact: ForgeWebScriptArtifact,
  result: ReturnType<typeof runSelfHostedStage>,
): ForgeWebScriptArtifact {
  if (result.diagnostic === undefined) return artifact;
  return {
    ...artifact,
    wasm: undefined,
    esmSource: '',
    declarations: '',
    diagnostics: [...artifact.diagnostics, result.diagnostic],
  };
}

export function createForgeWebScriptCompilerService(
  options: ForgeWebScriptCompilerServiceOptions = {},
): ForgeWebScriptCompilerService {
  const compiler = createForgeWebScriptCompiler();
  const cache = new Map<
    string,
    { readonly input: ForgeWebScriptCompileInput; readonly artifact: ForgeWebScriptArtifact }
  >();
  const graphCache = new Map<
    string,
    { readonly input: ForgeWebScriptGraphCompileInput; readonly artifact: ForgeWebScriptArtifact }
  >();
  const invalidated = new Set<string>();
  let disposed = false;
  let cacheHits = 0;
  let cacheMisses = 0;
  let diagnostics: readonly ForgeWebScriptDiagnostic[] = [];
  let analysis: ForgeWebScriptAnalysisReport | undefined;
  let selfHosted: ForgeWebScriptSelfHostedStageReport | undefined;
  let selfHostedStages: readonly ForgeWebScriptSelfHostedStageReport[] | undefined;
  const keyFor = (input: ForgeWebScriptCompileInput): string =>
    JSON.stringify({
      ...input,
      requestedCapabilities: [...(input.requestedCapabilities ?? [])].toSorted(),
      standardLibrary: forgeWebScriptStandardLibraryIdentity(input.standardLibrary),
      analysisPolicy: input.analysisPolicy ?? input.analysis?.policy,
      analysisRuleIds: (input.analysisRules ?? input.analysis?.rules)?.map(({ id }) => id).toSorted(),
      analysisSourceMap: input.analysisSourceMap ?? input.analysis?.sourceMap,
      selfHostedVmMode: options.selfHostedVmMode ?? 'interpret',
    });
  const graphKeyFor = (input: ForgeWebScriptGraphCompileInput): string =>
    JSON.stringify({
      graphHash: hashForgeWebScriptModuleGraph(input.graph, input.linkConfiguration),
      entryFileName: input.entryFileName,
      compilerVersion: input.compilerVersion,
      requireExports: input.requireExports ?? true,
      optimization: input.optimization ?? 'debug',
      loggerScope: input.logger?.scope,
      requestedCapabilities: [...(input.requestedCapabilities ?? [])].toSorted(),
      watCacheRoot: input.watCache?.root,
      linkConfiguration: input.linkConfiguration,
      standardLibrary: forgeWebScriptStandardLibraryIdentity(input.standardLibrary),
      targetFeatures: input.targetFeatures,
      compilerHints: input.compilerHints,
      analysisPolicy: input.analysisPolicy ?? input.analysis?.policy,
      analysisRuleIds: (input.analysisRules ?? input.analysis?.rules)?.map(({ id }) => id).toSorted(),
      analysisSourceMap: input.analysisSourceMap ?? input.analysis?.sourceMap,
      selfHostedVmMode: options.selfHostedVmMode ?? 'interpret',
    });
  const assertActive = (): void => {
    if (disposed) throw new Error('Forge Web Script compiler service has been disposed.');
  };
  return {
    prepare(input): void {
      assertActive();
      if (input.root !== undefined) invalidated.add(input.root);
    },
    compile(input): ForgeWebScriptArtifact {
      assertActive();
      const effectiveInput: ForgeWebScriptCompileInput = {
        ...input,
        ...(input.analysisPolicy === undefined && options.analysisPolicy === undefined
          ? {}
          : { analysisPolicy: input.analysisPolicy ?? options.analysisPolicy }),
        ...(input.analysisRules === undefined && options.analysisRules === undefined
          ? {}
          : { analysisRules: input.analysisRules ?? options.analysisRules }),
      };
      const key = keyFor(effectiveInput);
      const cached = cache.get(key);
      if (cached !== undefined && !invalidated.has(effectiveInput.fileName)) {
        cacheHits += 1;
        diagnostics = cached.artifact.diagnostics;
        analysis = cached.artifact.analysis;
        return cached.artifact;
      }
      cacheMisses += 1;
      const stage = runSelfHostedStage(effectiveInput, options);
      selfHosted = stage.report;
      selfHostedStages = stage.stageReports;
      const artifact = withSelfHostedResult(compiler.compile(effectiveInput), stage);
      cache.set(key, { input: effectiveInput, artifact });
      invalidated.delete(effectiveInput.fileName);
      diagnostics = artifact.diagnostics;
      analysis = artifact.analysis;
      return artifact;
    },
    compileGraph(input): ForgeWebScriptArtifact {
      assertActive();
      const effectiveInput: ForgeWebScriptGraphCompileInput = {
        ...input,
        ...(input.analysisPolicy === undefined && options.analysisPolicy === undefined
          ? {}
          : { analysisPolicy: input.analysisPolicy ?? options.analysisPolicy }),
        ...(input.analysisRules === undefined && options.analysisRules === undefined
          ? {}
          : { analysisRules: input.analysisRules ?? options.analysisRules }),
      };
      const key = graphKeyFor(effectiveInput);
      const cached = graphCache.get(key);
      const invalidatedGraph = effectiveInput.graph.modules.some(({ fileName }) => invalidated.has(fileName));
      if (cached !== undefined && !invalidatedGraph) {
        cacheHits += 1;
        diagnostics = cached.artifact.diagnostics;
        analysis = cached.artifact.analysis;
        return cached.artifact;
      }
      cacheMisses += 1;
      const frontend = prepareForgeWebScriptGraphFrontend(effectiveInput);
      const stage = runSelfHostedStage(
        {
          source: frontend.source,
          fileName: effectiveInput.entryFileName,
          compilerVersion: effectiveInput.compilerVersion,
          requestedCapabilities: effectiveInput.requestedCapabilities,
        },
        options,
      );
      selfHosted = stage.report;
      selfHostedStages = stage.stageReports;
      const artifact = withSelfHostedResult(compileForgeWebScriptGraph(effectiveInput), stage);
      graphCache.set(key, { input: effectiveInput, artifact });
      for (const module of effectiveInput.graph.modules) invalidated.delete(module.fileName);
      diagnostics = artifact.diagnostics;
      analysis = artifact.analysis;
      return artifact;
    },
    invalidate(files): void {
      assertActive();
      for (const file of files) {
        invalidated.add(file);
        for (const [key, entry] of cache) if (entry.input.fileName === file) cache.delete(key);
        for (const [key, entry] of graphCache) {
          if (
            entry.input.graph.modules.some(({ fileName }) => fileName === file) ||
            entry.input.graph.edges.some(({ resolved }) => resolved === file)
          ) {
            graphCache.delete(key);
            invalidated.add(entry.input.entryFileName);
          }
        }
      }
    },
    report(): ForgeWebScriptCompilerReport {
      assertActive();
      return {
        diagnostics,
        cacheHits,
        cacheMisses,
        invalidatedFiles: [...invalidated].toSorted(),
        ...(analysis === undefined ? {} : { analysis }),
        ...(selfHosted === undefined ? {} : { selfHosted }),
        ...(selfHostedStages === undefined ? {} : { selfHostedStages }),
      };
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      cache.clear();
      graphCache.clear();
      invalidated.clear();
      compiler.dispose();
    },
  };
}
