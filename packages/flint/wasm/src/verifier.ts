import { parseWasm } from './binary-parser.js';
import { sha256ArtifactHash } from './hash.js';

import type { FunctionType, ParsedWasm, WasmExport, WasmImport, WasmMemory, WasmType } from './binary-parser.js';
import type {
  FlintTargetFeatures,
  FlintWasmArtifactMetadata,
  FlintWasmFeatureRequirements,
  FlintWasmIteratorExport,
} from './contracts.js';

/** Diagnostic severity levels emitted during artifact verification. */
export type FlintWasmArtifactVerificationSeverity = 'error' | 'warning' | 'info';

/** Policy rules governing artifact verification enforcement. */
export interface FlintWasmArtifactVerificationPolicy {
  readonly profile?: 'development' | 'strict';
  readonly allowedCapabilities?: readonly string[];
  readonly maxBytes?: number;
  readonly maxCustomSectionBytes?: number;
  readonly allowedCustomSections?: readonly string[];
}

/** Diagnostic finding emitted during WebAssembly binary verification. */
export interface FlintWasmArtifactVerificationDiagnostic {
  readonly code: string;
  readonly severity: FlintWasmArtifactVerificationSeverity;
  readonly phase: 'artifact';
  readonly message: string;
  readonly fileName: string;
  readonly span: {
    readonly start: number;
    readonly end: number;
    readonly line: number;
    readonly column: number;
    readonly endLine: number;
    readonly endColumn: number;
  };
  readonly hint?: string;
  readonly evidence?: readonly { readonly message: string; readonly value?: string | number | boolean }[];
}

/** Input parameters and expectations passed to artifact verification. */
export interface FlintWasmArtifactVerificationInput {
  readonly wasm: Uint8Array;
  readonly unoptimizedWasm?: Uint8Array;
  readonly fileName?: string;
  readonly manifest: FlintWasmArtifactManifest;
  readonly metadata: FlintWasmArtifactMetadata;
  readonly targetFeatures?: FlintTargetFeatures;
  readonly featureRequirements?: FlintWasmFeatureRequirements;
  readonly iteratorExports?: readonly FlintWasmIteratorExport[];
  readonly expectedContentHash?: string;
  readonly expectedSourceHash?: string;
  readonly esmSource?: string;
  readonly policy?: FlintWasmArtifactVerificationPolicy;
}

/** The verifier intentionally consumes a structural manifest to avoid a package cycle. */
export interface FlintWasmArtifactManifest {
  readonly format?: string;
  readonly moduleName?: string;
  readonly exports: readonly FlintWasmManifestFunction[];
  readonly imports: readonly FlintWasmManifestImport[];
  readonly requiredCapabilities: readonly string[];
  readonly memory: FlintWasmMemoryLayout;
  readonly graphHash?: string;
  readonly boundsChecks?: 'runtime' | 'proven-safe' | 'excluded-by-profile';
  readonly targetFeatures?: FlintTargetFeatures;
  readonly async?: {
    readonly capabilities: readonly string[];
    readonly deterministic: true;
    readonly taskIdRepresentation: 'u32';
    readonly messageRepresentation: 'owned-bytes';
    readonly ordering: 'sequence';
  };
  readonly iteratorDescriptors?: readonly {
    readonly id: string;
    readonly nextFunction: string;
    readonly elementType: string;
    readonly representation: 'descriptor-boundary';
    readonly ownership: 'borrowed' | 'owned' | 'shared';
  }[];
}

/** Function metadata extracted from ABI manifest for verification. */
export interface FlintWasmManifestFunction {
  readonly name: string;
  readonly parameters: readonly FlintWasmManifestParameter[];
  readonly result: string;
  readonly resultReference?: string;
}

/** Import declaration metadata extracted from ABI manifest. */
export interface FlintWasmManifestImport {
  readonly capability: string;
  readonly alias: string;
  readonly function: FlintWasmManifestFunction;
}

/** Parameter type metadata in manifest function definition. */
export interface FlintWasmManifestParameter {
  readonly name: string;
  readonly type: string;
  readonly reference?: string;
}

/** Memory layout expectations verified against WebAssembly binary. */
export interface FlintWasmMemoryLayout {
  readonly pageSize: number;
  readonly addressType: 'u32' | 'u64';
  readonly ownership: 'caller-owned';
  readonly stringEncoding: 'utf8';
  readonly byteArrayRepresentation: 'pointer-length';
  readonly allocatorExport: string;
  readonly deallocatorExport: string;
  readonly reallocatorExport: string;
  readonly minimumPages?: number;
  readonly maximumPages?: number;
}

/** Comprehensive verification result report indicating validation status. */
export interface FlintWasmArtifactVerificationResult {
  readonly verified: boolean;
  readonly diagnostics: readonly FlintWasmArtifactVerificationDiagnostic[];
  readonly contentHash: string;
  readonly checkedVariants: readonly ('optimized' | 'unoptimized')[];
}

const DEFAULT_MAX_BYTES = 16 * 1024 * 1024;
const DEFAULT_MAX_CUSTOM_SECTION_BYTES = 256 * 1024;
const DEFAULT_CUSTOM_SECTIONS = ['fws.target-features', 'fws.metadata'];
const EMPTY_SPAN = { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 } as const;

/** Factory creating a verification diagnostic with standard codes and message. */
function diagnostic(
  code: string,
  message: string,
  fileName: string,
  hint?: string,
  evidence?: readonly { readonly message: string; readonly value?: string | number | boolean }[],
): FlintWasmArtifactVerificationDiagnostic {
  return {
    code,
    severity: 'error',
    phase: 'artifact',
    message,
    fileName,
    span: EMPTY_SPAN,
    ...(hint === undefined ? {} : { hint }),
    ...(evidence === undefined ? {} : { evidence }),
  };
}

// skipcq: JS-D1001, JS-R1005
function scalarLowLevelType(type: string): WasmType | undefined {
  if (type === 'f32') return 0x7d;
  if (type === 'f64') return 0x7c;
  if (type === 'i64' || type === 'u64') return 0x7e;
  if (type === 'unit') return undefined;
  return 0x7f;
}

/** Maps high-level primitive type names to low-level WebAssembly value type codes. */
// skipcq: JS-R1005
function lowLevelTypes(type: string, reference?: string, addressType: 'u32' | 'u64' = 'u32'): readonly WasmType[] {
  if (type === 'string' || type === 'bytes') return addressType === 'u64' ? [0x7e, 0x7e] : [0x7f, 0x7f];
  if (type.startsWith('Option<') || reference === 'Option') return [0x7e];
  if (reference !== undefined) return [addressType === 'u64' ? 0x7e : 0x7f];
  const scalar = scalarLowLevelType(type);
  return scalar === undefined ? [] : [scalar];
}

/** Compares two type arrays for equality. */
function sameTypes(left: readonly WasmType[], right: readonly WasmType[]): boolean {
  return left.length === right.length && left.every((type, index) => type === right[index]);
}

/** Resolves a boolean feature flag from target features record. */
function featureValue(features: FlintTargetFeatures | undefined, key: keyof FlintTargetFeatures): boolean {
  return features?.[key] === true;
}

/** Generates a normalized feature profile string summarizing enabled WebAssembly proposals. */
function normalizedFeatureProfile(features: FlintTargetFeatures | undefined): FlintTargetFeatures {
  return Object.fromEntries(
    (['simd', 'tailCall', 'memory64', 'threads', 'atomics'] as const)
      .filter((feature) => featureValue(features, feature))
      .map((feature) => [feature, true]),
  ) as FlintTargetFeatures;
}

// skipcq: JS-D1001
function parseAndValidateBinary(
  bytes: Uint8Array,
  maxCustomSectionBytes: number,
  fileName: string,
  variant: 'optimized' | 'unoptimized',
): { readonly parsed?: ParsedWasm; readonly diagnostic?: FlintWasmArtifactVerificationDiagnostic } {
  try {
    const parsed = parseWasm(bytes, maxCustomSectionBytes);
    if (!WebAssembly.validate(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer))
      throw new Error('The WebAssembly engine rejected the binary.');
    return { parsed };
  } catch (error) {
    return {
      diagnostic: diagnostic(
        'FLINT-ARTIFACT-001',
        `${variant} WebAssembly is malformed or failed engine validation: ${error instanceof Error ? error.message : String(error)}`,
        fileName,
        'Emit a fresh artifact with the supported FWS backend.',
      ),
    };
  }
}

// skipcq: JS-D1001
function verifyImportSignatures(
  imported: WasmImport,
  expected: FlintWasmManifestImport,
  parsed: ParsedWasm,
  addressType: 'u32' | 'u64',
  fileName: string,
  diagnostics: FlintWasmArtifactVerificationDiagnostic[],
): void {
  if (imported.typeIndex === undefined || !parsed.types[imported.typeIndex]) return;
  const type = parsed.types[imported.typeIndex];
  const expectedParameters = expected.function.parameters.flatMap((parameter) =>
    lowLevelTypes(parameter.type, parameter.reference, addressType),
  );
  const expectedResult = lowLevelTypes(expected.function.result, expected.function.resultReference, addressType);
  if (!sameTypes(type.parameters, expectedParameters) || !sameTypes(type.results, expectedResult)) {
    diagnostics.push(
      diagnostic(
        'FLINT-ARTIFACT-005',
        `Capability import "${imported.module}.${imported.name}" has a signature different from the manifest.`,
        fileName,
      ),
    );
  }
}

// skipcq: JS-D1001
function checkImportAllowed(
  module: string,
  allowed: readonly string[] | undefined,
  fileName: string,
  diagnostics: FlintWasmArtifactVerificationDiagnostic[],
): void {
  if (allowed !== undefined && allowed.length > 0 && !allowed.includes(module)) {
    diagnostics.push(
      diagnostic(
        'FLINT-ARTIFACT-004',
        `Capability "${module}" is not allowed by the artifact verification policy.`,
        fileName,
      ),
    );
  }
}

// skipcq: JS-D1001, JS-R1005
function verifyVariantImports(
  parsed: ParsedWasm,
  input: FlintWasmArtifactVerificationInput,
  fileName: string,
  variant: 'optimized' | 'unoptimized',
  diagnostics: FlintWasmArtifactVerificationDiagnostic[],
): void {
  const expectedImports = input.manifest.imports.map(({ capability, alias, function: declaration }) => ({
    capability,
    alias,
    function: declaration,
  }));
  const actualImports = parsed.imports.filter(({ kind }) => kind === 0);
  if (parsed.imports.some(({ kind }) => kind !== 0)) {
    diagnostics.push(
      diagnostic(
        'FLINT-ARTIFACT-003',
        'Artifact contains a non-function import outside the FWS capability ABI.',
        fileName,
      ),
    );
  }
  if (actualImports.length !== expectedImports.length) {
    diagnostics.push(
      diagnostic(
        'FLINT-ARTIFACT-002',
        `${variant} artifact imports ${actualImports.length} functions but the manifest declares ${expectedImports.length}.`,
        fileName,
      ),
    );
  }
  const allowed = input.policy?.allowedCapabilities;
  for (const imported of actualImports) {
    const expected = expectedImports.find(
      ({ capability, alias }) => capability === imported.module && alias === imported.name,
    );
    if (expected === undefined) {
      diagnostics.push(
        diagnostic(
          'FLINT-ARTIFACT-003',
          `Artifact contains undeclared capability import "${imported.module}.${imported.name}".`,
          fileName,
          'Declare the capability in the FWS ABI manifest and policy.',
        ),
      );
      continue;
    }
    checkImportAllowed(imported.module, allowed, fileName, diagnostics);
    verifyImportSignatures(imported, expected, parsed, input.manifest.memory.addressType, fileName, diagnostics);
  }
  if (
    new Set(expectedImports.map(({ capability }) => capability)).size !==
      new Set(input.manifest.requiredCapabilities).size ||
    expectedImports.some(({ capability }) => !input.manifest.requiredCapabilities.includes(capability))
  ) {
    diagnostics.push(
      diagnostic(
        'FLINT-ARTIFACT-006',
        'Manifest requiredCapabilities does not exactly match its capability imports.',
        fileName,
      ),
    );
  }
}

// skipcq: JS-D1001
function buildFunctionIndexMap(parsed: ParsedWasm): Map<number, FunctionType> {
  const functionIndexes = new Map<number, FunctionType>();
  const importCount = parsed.imports.filter(({ kind }) => kind === 0).length;
  for (const [index, typeIndex] of parsed.functionTypeIndexes.entries()) {
    const type = parsed.types[typeIndex];
    if (type !== undefined) functionIndexes.set(importCount + index, type);
  }
  return functionIndexes;
}

// skipcq: JS-D1001
function resolveFunctionType(
  exportedIndex: number,
  parsed: ParsedWasm,
  functionIndexes: Map<number, FunctionType>,
): FunctionType | undefined {
  const importedTypeIndex = parsed.imports[exportedIndex]?.typeIndex;
  return (
    functionIndexes.get(exportedIndex) ??
    (importedTypeIndex === undefined ? undefined : parsed.types[importedTypeIndex])
  );
}

// skipcq: JS-D1001
function verifyExportSignature(
  exported: WasmExport,
  declaration: FlintWasmManifestFunction,
  parsed: ParsedWasm,
  addressType: 'u32' | 'u64',
  functionIndexes: Map<number, FunctionType>,
  fileName: string,
  diagnostics: FlintWasmArtifactVerificationDiagnostic[],
): void {
  const type = resolveFunctionType(exported.index, parsed, functionIndexes);
  if (type === undefined) return;
  const parameters = declaration.parameters.flatMap(({ type: parameterType, reference }) =>
    lowLevelTypes(parameterType, reference, addressType),
  );
  const result = lowLevelTypes(declaration.result, declaration.resultReference, addressType);
  if (!sameTypes(type.parameters, parameters) || !sameTypes(type.results, result)) {
    diagnostics.push(
      diagnostic(
        'FLINT-ARTIFACT-008',
        `Export "${exported.name}" has a signature different from the manifest.`,
        fileName,
      ),
    );
  }
}

// skipcq: JS-D1001
function verifyIteratorExport(
  exported: WasmExport,
  parsed: ParsedWasm,
  functionIndexes: Map<number, FunctionType>,
  fileName: string,
  diagnostics: FlintWasmArtifactVerificationDiagnostic[],
): void {
  const type = resolveFunctionType(exported.index, parsed, functionIndexes);
  if (type !== undefined && (!sameTypes(type.parameters, [0x7f]) || !sameTypes(type.results, [0x7e]))) {
    diagnostics.push(
      diagnostic(
        'FLINT-ARTIFACT-008',
        `Iterator export "${exported.name}" must use the (i32) -> (i64) boundary ABI.`,
        fileName,
      ),
    );
  }
}

// skipcq: JS-D1001, JS-R1005
function verifyReservedMemoryExports(
  parsed: ParsedWasm,
  input: FlintWasmArtifactVerificationInput,
  functionIndexes: Map<number, FunctionType>,
  fileName: string,
  diagnostics: FlintWasmArtifactVerificationDiagnostic[],
): void {
  const addressType = input.manifest.memory.addressType;
  const reserved = new Map([
    [
      input.manifest.memory.allocatorExport,
      { parameters: lowLevelTypes(addressType), results: lowLevelTypes(addressType) },
    ],
    [
      input.manifest.memory.deallocatorExport,
      { parameters: [...lowLevelTypes(addressType), ...lowLevelTypes(addressType)], results: [] },
    ],
    [
      input.manifest.memory.reallocatorExport,
      {
        parameters: [...lowLevelTypes(addressType), ...lowLevelTypes(addressType), ...lowLevelTypes(addressType)],
        results: lowLevelTypes(addressType),
      },
    ],
    ['fws_reset', { parameters: [], results: [] }],
  ]);
  for (const [name, expected] of reserved) {
    const exported = parsed.exports.find((entry) => entry.name === name && entry.kind === 0);
    const type = exported === undefined ? undefined : resolveFunctionType(exported.index, parsed, functionIndexes);
    if (exported === undefined) {
      diagnostics.push(diagnostic('FLINT-ARTIFACT-010', `Required memory export "${name}" is missing.`, fileName));
    } else if (
      type !== undefined &&
      (!sameTypes(type.parameters, expected.parameters) || !sameTypes(type.results, expected.results))
    ) {
      diagnostics.push(
        diagnostic('FLINT-ARTIFACT-011', `Memory export "${name}" has an invalid ABI signature.`, fileName),
      );
    }
  }
}

// skipcq: JS-D1001
function checkUnexpectedExports(
  exports: readonly WasmExport[],
  allowed: ReadonlySet<string>,
  fileName: string,
  diagnostics: FlintWasmArtifactVerificationDiagnostic[],
): void {
  for (const exported of exports) {
    if (exported.name !== 'memory' && (exported.kind !== 0 || !allowed.has(exported.name))) {
      diagnostics.push(
        diagnostic('FLINT-ARTIFACT-007', `Artifact contains unexpected export "${exported.name}".`, fileName),
      );
    }
  }
}

// skipcq: JS-D1001
function verifySingleFunctionExport(
  exported: WasmExport,
  expectedExports: ReadonlyMap<string, FlintWasmManifestFunction>,
  iteratorNextNames: ReadonlySet<string>,
  parsed: ParsedWasm,
  addressType: 'u32' | 'u64',
  functionIndexes: Map<number, FunctionType>,
  fileName: string,
  diagnostics: FlintWasmArtifactVerificationDiagnostic[],
): void {
  if (['fws_alloc', 'fws_dealloc', 'fws_realloc', 'fws_reset'].includes(exported.name)) return;
  const declaration = expectedExports.get(exported.name);
  if (declaration === undefined) {
    if (iteratorNextNames.has(exported.name)) {
      verifyIteratorExport(exported, parsed, functionIndexes, fileName, diagnostics);
    } else {
      diagnostics.push(
        diagnostic('FLINT-ARTIFACT-007', `Artifact contains unexpected function export "${exported.name}".`, fileName),
      );
    }
    return;
  }
  verifyExportSignature(exported, declaration, parsed, addressType, functionIndexes, fileName, diagnostics);
}

// skipcq: JS-D1001
function verifyVariantExports(
  parsed: ParsedWasm,
  input: FlintWasmArtifactVerificationInput,
  fileName: string,
  functionIndexes: Map<number, FunctionType>,
  diagnostics: FlintWasmArtifactVerificationDiagnostic[],
): void {
  const expectedExports = new Map(input.manifest.exports.map((declaration) => [declaration.name, declaration]));
  const exportedFunctions = parsed.exports.filter(({ kind }) => kind === 0);
  const iteratorNextNames = new Set((input.iteratorExports ?? []).map(({ nextFunction }) => nextFunction));
  const allowedFunctionExports = new Set([
    ...expectedExports.keys(),
    ...iteratorNextNames,
    'fws_alloc',
    'fws_dealloc',
    'fws_realloc',
    'fws_reset',
  ]);
  checkUnexpectedExports(parsed.exports, allowedFunctionExports, fileName, diagnostics);
  for (const exported of exportedFunctions) {
    verifySingleFunctionExport(
      exported,
      expectedExports,
      iteratorNextNames,
      parsed,
      input.manifest.memory.addressType,
      functionIndexes,
      fileName,
      diagnostics,
    );
  }
  for (const declaration of input.manifest.exports) {
    if (!parsed.exports.some(({ name }) => name === declaration.name)) {
      diagnostics.push(
        diagnostic(
          'FLINT-ARTIFACT-009',
          `Manifest export "${declaration.name}" is missing from the artifact.`,
          fileName,
        ),
      );
    }
  }
  verifyReservedMemoryExports(parsed, input, functionIndexes, fileName, diagnostics);
}

// skipcq: JS-D1001
function verifyMemoryLayout(
  layout: FlintWasmMemoryLayout,
  fileName: string,
  diagnostics: FlintWasmArtifactVerificationDiagnostic[],
): void {
  if (
    layout.pageSize !== 65_536 ||
    layout.ownership !== 'caller-owned' ||
    layout.stringEncoding !== 'utf8' ||
    layout.byteArrayRepresentation !== 'pointer-length'
  ) {
    diagnostics.push(diagnostic('FLINT-ARTIFACT-034', 'Manifest contains an unsupported FWS memory layout.', fileName));
  }
}

// skipcq: JS-D1001, JS-R1005
function verifyMemoryPages(
  memory: WasmMemory,
  layout: FlintWasmMemoryLayout,
  fileName: string,
  diagnostics: FlintWasmArtifactVerificationDiagnostic[],
): void {
  if (layout.minimumPages !== undefined && memory.minimum !== layout.minimumPages) {
    diagnostics.push(
      diagnostic('FLINT-ARTIFACT-015', 'Artifact memory minimum does not match the manifest.', fileName),
    );
  }
  if (layout.maximumPages !== undefined && memory.maximum !== layout.maximumPages) {
    diagnostics.push(
      diagnostic('FLINT-ARTIFACT-016', 'Artifact memory maximum does not match the manifest.', fileName),
    );
  }
  if (memory.maximum !== undefined && memory.maximum < memory.minimum) {
    diagnostics.push(
      diagnostic('FLINT-ARTIFACT-017', 'Artifact memory maximum is smaller than its minimum.', fileName),
    );
  }
}

// skipcq: JS-D1001
function verifyLinearMemory(
  memory: WasmMemory | undefined,
  input: FlintWasmArtifactVerificationInput,
  fileName: string,
  diagnostics: FlintWasmArtifactVerificationDiagnostic[],
): void {
  if (memory === undefined) {
    diagnostics.push(diagnostic('FLINT-ARTIFACT-012', 'Artifact does not declare linear memory.', fileName));
    return;
  }
  verifyMemoryLayout(input.manifest.memory, fileName, diagnostics);
  if (memory.memory64 !== (input.manifest.memory.addressType === 'u64')) {
    diagnostics.push(
      diagnostic('FLINT-ARTIFACT-013', 'Artifact memory address width does not match the manifest.', fileName),
    );
  }
  if (memory.shared !== featureValue(input.targetFeatures, 'threads')) {
    diagnostics.push(
      diagnostic(
        'FLINT-ARTIFACT-014',
        'Artifact shared-memory flag does not match the target feature policy.',
        fileName,
      ),
    );
  }
  verifyMemoryPages(memory, input.manifest.memory, fileName, diagnostics);
}

// skipcq: JS-D1001, JS-R1005
function verifyTargetFeatures(
  input: FlintWasmArtifactVerificationInput,
  fileName: string,
  diagnostics: FlintWasmArtifactVerificationDiagnostic[],
): void {
  const required = input.featureRequirements ?? {};
  for (const feature of ['simd', 'tailCall', 'memory64', 'threads', 'atomics'] as const) {
    if (required[feature] === true && !featureValue(input.targetFeatures, feature)) {
      diagnostics.push(
        diagnostic('FLINT-ARTIFACT-018', `Artifact requires disabled target feature "${feature}".`, fileName),
      );
    }
  }
  const requestedFeatures = JSON.stringify(normalizedFeatureProfile(input.targetFeatures));
  if (JSON.stringify(input.manifest.targetFeatures ?? {}) !== requestedFeatures) {
    diagnostics.push(
      diagnostic(
        'FLINT-ARTIFACT-035',
        'Manifest target features do not match the requested compilation profile.',
        fileName,
      ),
    );
  }
}

// skipcq: JS-D1001, JS-R1005
function verifyIteratorDescriptors(
  input: FlintWasmArtifactVerificationInput,
  fileName: string,
  diagnostics: FlintWasmArtifactVerificationDiagnostic[],
): void {
  for (const descriptor of input.manifest.iteratorDescriptors ?? []) {
    const exported = input.iteratorExports?.find(({ nextFunction }) => nextFunction === descriptor.nextFunction);
    if (exported === undefined) {
      diagnostics.push(
        diagnostic(
          'FLINT-ARTIFACT-036',
          `Iterator descriptor "${descriptor.id}" has no matching emitted boundary export.`,
          fileName,
        ),
      );
    } else if (
      exported.elementType !== descriptor.elementType ||
      exported.ownership !== descriptor.ownership ||
      exported.resultRepresentation !== 'value-done-pair'
    ) {
      diagnostics.push(
        diagnostic(
          'FLINT-ARTIFACT-037',
          `Iterator descriptor "${descriptor.id}" does not match its emitted boundary metadata.`,
          fileName,
        ),
      );
    }
  }
}

// skipcq: JS-D1001, JS-R1005
function verifyAsyncContracts(
  input: FlintWasmArtifactVerificationInput,
  fileName: string,
  diagnostics: FlintWasmArtifactVerificationDiagnostic[],
): void {
  if (input.manifest.async === undefined) return;
  for (const capability of input.manifest.async.capabilities) {
    if (!input.manifest.requiredCapabilities.includes(capability)) {
      diagnostics.push(
        diagnostic(
          'FLINT-ARTIFACT-038',
          `Async contract capability "${capability}" is not declared by the artifact.`,
          fileName,
        ),
      );
    }
  }
  if (
    input.manifest.async.deterministic !== true ||
    input.manifest.async.taskIdRepresentation !== 'u32' ||
    input.manifest.async.messageRepresentation !== 'owned-bytes' ||
    input.manifest.async.ordering !== 'sequence'
  ) {
    diagnostics.push(
      diagnostic(
        'FLINT-ARTIFACT-039',
        'Artifact async contract is not deterministic or uses an unsupported representation.',
        fileName,
      ),
    );
  }
}

// skipcq: JS-D1001
function verifyVariantAsyncAndIterators(
  input: FlintWasmArtifactVerificationInput,
  fileName: string,
  diagnostics: FlintWasmArtifactVerificationDiagnostic[],
): void {
  verifyIteratorDescriptors(input, fileName, diagnostics);
  verifyAsyncContracts(input, fileName, diagnostics);
}

// skipcq: JS-D1001
function verifyCustomSectionsList(
  parsed: ParsedWasm,
  input: FlintWasmArtifactVerificationInput,
  fileName: string,
  diagnostics: FlintWasmArtifactVerificationDiagnostic[],
): void {
  const allowedCustomSections = input.policy?.allowedCustomSections ?? DEFAULT_CUSTOM_SECTIONS;
  for (const name of parsed.customSections.keys()) {
    if (!allowedCustomSections.includes(name)) {
      diagnostics.push(
        diagnostic('FLINT-ARTIFACT-019', `Artifact contains unrecognized custom section "${name}".`, fileName),
      );
    }
  }
}

// skipcq: JS-D1001
function verifyFeatureCustomSection(
  parsed: ParsedWasm,
  input: FlintWasmArtifactVerificationInput,
  fileName: string,
  diagnostics: FlintWasmArtifactVerificationDiagnostic[],
): void {
  const featureSection = parsed.customSections.get('fws.target-features');
  if (featureSection === undefined) return;
  try {
    const encoded = JSON.parse(new TextDecoder().decode(featureSection)) as Record<string, unknown>;
    for (const feature of ['simd', 'tailCall', 'memory64', 'threads', 'atomics'] as const) {
      if (encoded[feature] !== featureValue(input.targetFeatures, feature)) {
        diagnostics.push(
          diagnostic(
            'FLINT-ARTIFACT-020',
            `Target-feature metadata for "${feature}" does not match the requested profile.`,
            fileName,
          ),
        );
      }
    }
  } catch {
    diagnostics.push(diagnostic('FLINT-ARTIFACT-021', 'The fws.target-features metadata is not valid JSON.', fileName));
  }
}

// skipcq: JS-D1001
function metadataCompilerFieldsMatch(
  encoded: Partial<FlintWasmArtifactMetadata>,
  expected: FlintWasmArtifactMetadata,
): boolean {
  return (
    encoded.compilerVersion === expected.compilerVersion &&
    encoded.optimization === expected.optimization &&
    encoded.sourceHash === expected.sourceHash &&
    encoded.boundsChecks === expected.boundsChecks
  );
}

// skipcq: JS-D1001, JS-R1005
function metadataGraphFieldsMatch(
  encoded: Partial<FlintWasmArtifactMetadata>,
  expected: FlintWasmArtifactMetadata,
): boolean {
  return (
    encoded.graphHash === expected.graphHash &&
    encoded.sonSchemaVersion === expected.sonSchemaVersion &&
    encoded.sonGraphHash === expected.sonGraphHash &&
    JSON.stringify(encoded.sourceFiles?.toSorted()) === JSON.stringify(expected.sourceFiles.toSorted()) &&
    JSON.stringify(encoded.sonOptimizationPasses) === JSON.stringify(expected.sonOptimizationPasses) &&
    (expected.wasmOptimizationPasses === undefined ||
      JSON.stringify(encoded.wasmOptimizationPasses) === JSON.stringify(expected.wasmOptimizationPasses))
  );
}

// skipcq: JS-D1001
function verifyMetadataCustomSection(
  parsed: ParsedWasm,
  input: FlintWasmArtifactVerificationInput,
  fileName: string,
  diagnostics: FlintWasmArtifactVerificationDiagnostic[],
): void {
  const metadataSection = parsed.customSections.get('fws.metadata');
  if (metadataSection === undefined) return;
  try {
    const encoded = JSON.parse(new TextDecoder().decode(metadataSection)) as Partial<FlintWasmArtifactMetadata>;
    if (!metadataCompilerFieldsMatch(encoded, input.metadata) || !metadataGraphFieldsMatch(encoded, input.metadata)) {
      diagnostics.push(
        diagnostic(
          'FLINT-ARTIFACT-022',
          'Artifact metadata does not match the deterministic compiler metadata.',
          fileName,
        ),
      );
    }
  } catch {
    diagnostics.push(diagnostic('FLINT-ARTIFACT-023', 'The fws.metadata custom section is not valid JSON.', fileName));
  }
}

// skipcq: JS-D1001, JS-R1005
function verifyHashes(
  bytes: Uint8Array,
  input: FlintWasmArtifactVerificationInput,
  fileName: string,
  variant: 'optimized' | 'unoptimized',
  diagnostics: FlintWasmArtifactVerificationDiagnostic[],
): void {
  if (
    variant === 'optimized' &&
    input.expectedContentHash !== undefined &&
    sha256ArtifactHash(bytes) !== input.expectedContentHash
  ) {
    diagnostics.push(
      diagnostic('FLINT-ARTIFACT-024', 'Artifact content hash does not match the backend result.', fileName),
    );
  }
  if (
    variant === 'optimized' &&
    input.expectedSourceHash !== undefined &&
    input.metadata.sourceHash !== input.expectedSourceHash
  ) {
    diagnostics.push(
      diagnostic(
        'FLINT-ARTIFACT-031',
        'Artifact source hash does not match the source used for compilation.',
        fileName,
      ),
    );
  }
}

/** Verifies structural invariants and binary sections of a WebAssembly module. */
function verifyVariant(
  bytes: Uint8Array,
  input: FlintWasmArtifactVerificationInput,
  fileName: string,
  variant: 'optimized' | 'unoptimized',
): { readonly parsed?: ParsedWasm; readonly diagnostics: readonly FlintWasmArtifactVerificationDiagnostic[] } {
  const maxCustomSectionBytes = input.policy?.maxCustomSectionBytes ?? DEFAULT_MAX_CUSTOM_SECTION_BYTES;
  const initial = parseAndValidateBinary(bytes, maxCustomSectionBytes, fileName, variant);
  if (initial.diagnostic !== undefined || initial.parsed === undefined) {
    return { diagnostics: initial.diagnostic === undefined ? [] : [initial.diagnostic] };
  }
  const parsed = initial.parsed;
  const functionIndexes = buildFunctionIndexMap(parsed);
  const diagnostics: FlintWasmArtifactVerificationDiagnostic[] = [];

  verifyVariantImports(parsed, input, fileName, variant, diagnostics);
  verifyVariantExports(parsed, input, fileName, functionIndexes, diagnostics);
  verifyLinearMemory(parsed.memory, input, fileName, diagnostics);
  verifyTargetFeatures(input, fileName, diagnostics);
  verifyVariantAsyncAndIterators(input, fileName, diagnostics);
  verifyCustomSectionsList(parsed, input, fileName, diagnostics);
  verifyFeatureCustomSection(parsed, input, fileName, diagnostics);
  verifyMetadataCustomSection(parsed, input, fileName, diagnostics);
  verifyHashes(bytes, input, fileName, variant, diagnostics);

  return { parsed, diagnostics };
}

// skipcq: JS-D1001
function manifestRequiresPointers(manifest: FlintWasmArtifactManifest): boolean {
  const declarations = [...manifest.exports, ...manifest.imports.map(({ function: declaration }) => declaration)];
  return declarations.some(
    (declaration) =>
      declaration.parameters.some(({ type }) => type === 'string' || type === 'bytes') ||
      declaration.result === 'string' ||
      declaration.result === 'bytes',
  );
}

// skipcq: JS-D1001
function manifestHasAdaptedImports(manifest: FlintWasmArtifactManifest): boolean {
  return manifest.imports.some(
    ({ function: declaration }) =>
      declaration.parameters.some(({ type }) => type === 'string' || type === 'bytes') ||
      declaration.result === 'string' ||
      declaration.result === 'bytes',
  );
}

// skipcq: JS-D1001
function verifyAdapterPointers(
  source: string,
  manifest: FlintWasmArtifactManifest,
  fileName: string,
  diagnostics: FlintWasmArtifactVerificationDiagnostic[],
): void {
  const pointerValue = manifestRequiresPointers(manifest);
  if (
    !source.includes(manifest.memory.allocatorExport) ||
    !source.includes(manifest.memory.deallocatorExport) ||
    (pointerValue && !source.includes('checkedBytes'))
  ) {
    diagnostics.push(
      diagnostic(
        'FLINT-ARTIFACT-026',
        'Generated ESM adapter does not expose checked pointer-length allocation and cleanup paths.',
        fileName,
      ),
    );
  }
}

/** Verifies synthesized JavaScript loader adapter script against manifest contracts. */
// skipcq: JS-R1005
function verifyAdapter(
  input: FlintWasmArtifactVerificationInput,
  fileName: string,
): readonly FlintWasmArtifactVerificationDiagnostic[] {
  if (input.esmSource === undefined) return [];
  const diagnostics: FlintWasmArtifactVerificationDiagnostic[] = [];
  const source = input.esmSource;
  if (!source.includes('WebAssembly.instantiate') || !source.includes('WebAssembly.Module')) {
    diagnostics.push(
      diagnostic(
        'FLINT-ARTIFACT-025',
        'Generated ESM adapter does not contain both asynchronous and synchronous Wasm loading paths.',
        fileName,
      ),
    );
  }
  verifyAdapterPointers(source, input.manifest, fileName, diagnostics);
  if (manifestHasAdaptedImports(input.manifest) && !source.includes('adaptCapabilityImports')) {
    diagnostics.push(
      diagnostic('FLINT-ARTIFACT-027', 'Generated ESM adapter does not adapt declared capability imports.', fileName),
    );
  }
  if ((input.manifest.iteratorDescriptors?.length ?? 0) > 0 && !source.includes('adaptIteratorExports')) {
    diagnostics.push(
      diagnostic('FLINT-ARTIFACT-028', 'Generated ESM adapter does not adapt declared iterator exports.', fileName),
    );
  }
  return diagnostics;
}

/** Complete verification entry point validating WebAssembly binary and adapter artifacts. */
// skipcq: JS-R1005
export function verifyFlintWasmArtifact(
  input: FlintWasmArtifactVerificationInput,
): FlintWasmArtifactVerificationResult {
  const fileName = input.fileName ?? '<artifact>';
  const maxBytes = input.policy?.maxBytes ?? DEFAULT_MAX_BYTES;
  const diagnostics: FlintWasmArtifactVerificationDiagnostic[] = [];
  if (input.wasm.byteLength > maxBytes)
    diagnostics.push(
      diagnostic('FLINT-ARTIFACT-029', `Optimized artifact exceeds the verifier byte limit of ${maxBytes}.`, fileName),
    );
  const optimized = verifyVariant(input.wasm, input, fileName, 'optimized');
  diagnostics.push(...optimized.diagnostics);
  const checkedVariants: ('optimized' | 'unoptimized')[] = ['optimized'];
  if (input.unoptimizedWasm !== undefined) {
    checkedVariants.push('unoptimized');
    if (input.unoptimizedWasm.byteLength > maxBytes)
      diagnostics.push(
        diagnostic(
          'FLINT-ARTIFACT-030',
          `Unoptimized artifact exceeds the verifier byte limit of ${maxBytes}.`,
          fileName,
        ),
      );
    diagnostics.push(...verifyVariant(input.unoptimizedWasm, input, fileName, 'unoptimized').diagnostics);
  }
  diagnostics.push(...verifyAdapter(input, fileName));
  if (input.expectedSourceHash !== undefined && input.metadata.sourceFiles.length === 0)
    diagnostics.push(
      diagnostic(
        'FLINT-ARTIFACT-032',
        'A source hash was requested but artifact metadata has no source files.',
        fileName,
      ),
    );
  if (input.manifest.graphHash !== input.metadata.graphHash)
    diagnostics.push(
      diagnostic('FLINT-ARTIFACT-033', 'Manifest graph hash does not match deterministic artifact metadata.', fileName),
    );
  return {
    verified: diagnostics.every(({ severity }) => severity !== 'error'),
    diagnostics,
    contentHash: sha256ArtifactHash(input.wasm),
    checkedVariants,
  };
}
