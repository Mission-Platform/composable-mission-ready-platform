import { sha256ArtifactHash } from './hash.js';

import type {
  ForgeWebScriptTargetFeatures,
  ForgeWebScriptWasmArtifactMetadata,
  ForgeWebScriptWasmFeatureRequirements,
  ForgeWebScriptWasmIteratorExport,
} from './contracts.js';

export type ForgeWebScriptWasmArtifactVerificationSeverity = 'error' | 'warning' | 'info';

export interface ForgeWebScriptWasmArtifactVerificationPolicy {
  readonly profile?: 'development' | 'strict';
  readonly allowedCapabilities?: readonly string[];
  readonly maxBytes?: number;
  readonly maxCustomSectionBytes?: number;
  readonly allowedCustomSections?: readonly string[];
}

export interface ForgeWebScriptWasmArtifactVerificationDiagnostic {
  readonly code: string;
  readonly severity: ForgeWebScriptWasmArtifactVerificationSeverity;
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

export interface ForgeWebScriptWasmArtifactVerificationInput {
  readonly wasm: Uint8Array;
  readonly unoptimizedWasm?: Uint8Array;
  readonly fileName?: string;
  readonly manifest: ForgeWebScriptWasmArtifactManifest;
  readonly metadata: ForgeWebScriptWasmArtifactMetadata;
  readonly targetFeatures?: ForgeWebScriptTargetFeatures;
  readonly featureRequirements?: ForgeWebScriptWasmFeatureRequirements;
  readonly iteratorExports?: readonly ForgeWebScriptWasmIteratorExport[];
  readonly expectedContentHash?: string;
  readonly expectedSourceHash?: string;
  readonly esmSource?: string;
  readonly policy?: ForgeWebScriptWasmArtifactVerificationPolicy;
}

/** The verifier intentionally consumes a structural manifest to avoid a package cycle. */
export interface ForgeWebScriptWasmArtifactManifest {
  readonly format?: string;
  readonly moduleName?: string;
  readonly exports: readonly ForgeWebScriptWasmManifestFunction[];
  readonly imports: readonly ForgeWebScriptWasmManifestImport[];
  readonly requiredCapabilities: readonly string[];
  readonly memory: ForgeWebScriptWasmMemoryLayout;
  readonly graphHash?: string;
  readonly boundsChecks?: 'runtime' | 'proven-safe' | 'excluded-by-profile';
  readonly targetFeatures?: ForgeWebScriptTargetFeatures;
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

export interface ForgeWebScriptWasmManifestFunction {
  readonly name: string;
  readonly parameters: readonly ForgeWebScriptWasmManifestParameter[];
  readonly result: string;
  readonly resultReference?: string;
}

export interface ForgeWebScriptWasmManifestImport {
  readonly capability: string;
  readonly alias: string;
  readonly function: ForgeWebScriptWasmManifestFunction;
}

export interface ForgeWebScriptWasmManifestParameter {
  readonly name: string;
  readonly type: string;
  readonly reference?: string;
}

export interface ForgeWebScriptWasmMemoryLayout {
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

export interface ForgeWebScriptWasmArtifactVerificationResult {
  readonly verified: boolean;
  readonly diagnostics: readonly ForgeWebScriptWasmArtifactVerificationDiagnostic[];
  readonly contentHash: string;
  readonly checkedVariants: readonly ('optimized' | 'unoptimized')[];
}

const DEFAULT_MAX_BYTES = 16 * 1024 * 1024;
const DEFAULT_MAX_CUSTOM_SECTION_BYTES = 256 * 1024;
const DEFAULT_CUSTOM_SECTIONS = ['fws.target-features', 'fws.metadata'];
const EMPTY_SPAN = { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 } as const;

type WasmType = 0x7f | 0x7e | 0x7d | 0x7c;
interface FunctionType {
  readonly parameters: readonly WasmType[];
  readonly results: readonly WasmType[];
}
interface WasmImport {
  readonly module: string;
  readonly name: string;
  readonly kind: number;
  readonly typeIndex?: number;
}
interface WasmExport {
  readonly name: string;
  readonly kind: number;
  readonly index: number;
}
interface WasmMemory {
  readonly minimum: number;
  readonly maximum?: number;
  readonly shared: boolean;
  readonly memory64: boolean;
}
interface ParsedWasm {
  readonly types: readonly FunctionType[];
  readonly imports: readonly WasmImport[];
  readonly functionTypeIndexes: readonly number[];
  readonly exports: readonly WasmExport[];
  readonly memory?: WasmMemory;
  readonly customSections: ReadonlyMap<string, Uint8Array>;
}

class Cursor {
  private readonly bytes: Uint8Array;
  public position: number;
  private readonly end: number;

  public constructor(bytes: Uint8Array, position = 0, end = bytes.byteLength) {
    this.bytes = bytes;
    this.position = position;
    this.end = end;
  }

  public remaining(): number {
    return this.end - this.position;
  }

  public byte(): number {
    if (this.position >= this.end) throw new Error('Unexpected end of WebAssembly section.');
    return this.bytes[this.position++] ?? 0;
  }

  public leb(maxBytes = 5): number {
    let value = 0;
    let shift = 0;
    for (let count = 0; count < maxBytes; count += 1) {
      const byte = this.byte();
      value += (byte & 0x7f) * 2 ** shift;
      if ((byte & 0x80) === 0) return value;
      shift += 7;
    }
    throw new Error('WebAssembly integer is too long.');
  }

  public bytesValue(length: number): Uint8Array {
    if (!Number.isSafeInteger(length) || length < 0 || length > this.remaining())
      throw new Error('Invalid WebAssembly section length.');
    const value = this.bytes.slice(this.position, this.position + length);
    this.position += length;
    return value;
  }

  public string(maxLength: number): string {
    const length = this.leb();
    if (length > maxLength) throw new Error('WebAssembly name exceeds the verifier limit.');
    return new TextDecoder().decode(this.bytesValue(length));
  }
}

function diagnostic(
  code: string,
  message: string,
  fileName: string,
  hint?: string,
  evidence?: readonly { readonly message: string; readonly value?: string | number | boolean }[],
): ForgeWebScriptWasmArtifactVerificationDiagnostic {
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

function parseLimits(cursor: Cursor): WasmMemory {
  const flags = cursor.leb();
  const memory64 = (flags & 0x04) !== 0;
  const shared = (flags & 0x02) !== 0;
  const hasMaximum = (flags & 0x01) !== 0 || (flags & 0x02) !== 0;
  const minimum = cursor.leb(memory64 ? 10 : 5);
  const maximum = hasMaximum ? cursor.leb(memory64 ? 10 : 5) : undefined;
  return { minimum, ...(maximum === undefined ? {} : { maximum }), shared, memory64 };
}

function parseWasm(bytes: Uint8Array, maxCustomSectionBytes: number): ParsedWasm {
  if (
    bytes.byteLength < 8 ||
    bytes[0] !== 0 ||
    bytes[1] !== 0x61 ||
    bytes[2] !== 0x73 ||
    bytes[3] !== 0x6d ||
    bytes[4] !== 1
  )
    throw new Error('Invalid WebAssembly magic or version.');
  const types: FunctionType[] = [];
  const imports: WasmImport[] = [];
  const functionTypeIndexes: number[] = [];
  const exports: WasmExport[] = [];
  const customSections = new Map<string, Uint8Array>();
  let memory: WasmMemory | undefined;
  const cursor = new Cursor(bytes, 8);
  let lastSection = 0;
  while (cursor.remaining() > 0) {
    const id = cursor.byte();
    const length = cursor.leb(5);
    const payload = new Cursor(cursor.bytesValue(length));
    if (id !== 0 && id < lastSection) throw new Error('WebAssembly sections are out of order.');
    if (id !== 0) lastSection = id;
    if (id === 0) {
      const name = payload.string(256);
      if (payload.remaining() > maxCustomSectionBytes)
        throw new Error('WebAssembly custom section exceeds the verifier limit.');
      if (customSections.has(name)) throw new Error(`Duplicate WebAssembly custom section "${name}".`);
      customSections.set(name, payload.bytesValue(payload.remaining()));
      continue;
    }
    switch (id) {
      case 1: {
        const count = payload.leb();
        if (count > 100_000) throw new Error('WebAssembly type section is too large.');
        for (let index = 0; index < count; index += 1) {
          if (payload.byte() !== 0x60) throw new Error('Unsupported WebAssembly type declaration.');
          const parameters = Array.from({ length: payload.leb() }, () => payload.byte() as WasmType);
          const results = Array.from({ length: payload.leb() }, () => payload.byte() as WasmType);
          if ([...parameters, ...results].some((type) => ![0x7f, 0x7e, 0x7d, 0x7c].includes(type)))
            throw new Error('Unsupported WebAssembly value type.');
          types.push({ parameters, results });
        }

        break;
      }
      case 2: {
        const count = payload.leb();
        if (count > 100_000) throw new Error('WebAssembly import section is too large.');
        for (let index = 0; index < count; index += 1) {
          const module = payload.string(256);
          const name = payload.string(256);
          const kind = payload.byte();
          switch (kind) {
            case 0: {
              imports.push({ module, name, kind, typeIndex: payload.leb() });
              break;
            }
            case 1: {
              payload.byte();
              payload.leb();
              if (payload.byte() === 0x70) payload.leb();

              break;
            }
            case 2: {
              parseLimits(payload);

              break;
            }
            case 3: {
              payload.byte();
              payload.byte();

              break;
            }
            default: {
              throw new Error('Unsupported WebAssembly import kind.');
            }
          }
        }

        break;
      }
      case 3: {
        const count = payload.leb();
        if (count > 100_000) throw new Error('WebAssembly function section is too large.');
        for (let index = 0; index < count; index += 1) functionTypeIndexes.push(payload.leb());

        break;
      }
      case 5: {
        const count = payload.leb();
        if (count !== 1 || memory !== undefined) throw new Error('FWS modules must declare exactly one memory.');
        memory = parseLimits(payload);

        break;
      }
      case 7: {
        const count = payload.leb();
        if (count > 100_000) throw new Error('WebAssembly export section is too large.');
        for (let index = 0; index < count; index += 1)
          exports.push({ name: payload.string(256), kind: payload.byte(), index: payload.leb() });

        break;
      }
      // No default
    }
    // The engine validates sections that are not needed for the ABI policy checks
    // (table, global, element, code, data, and data-count sections).
  }
  return { types, imports, functionTypeIndexes, exports, ...(memory === undefined ? {} : { memory }), customSections };
}

function lowLevelTypes(type: string, reference?: string, addressType: 'u32' | 'u64' = 'u32'): readonly WasmType[] {
  if (type === 'string' || type === 'bytes') return addressType === 'u64' ? [0x7e, 0x7e] : [0x7f, 0x7f];
  if (type.startsWith('Option<') || reference === 'Option') return [0x7e];
  if (reference !== undefined) return [addressType === 'u64' ? 0x7e : 0x7f];
  if (type === 'f32') return [0x7d];
  if (type === 'f64') return [0x7c];
  if (type === 'i64' || type === 'u64') return [0x7e];
  return type === 'unit' ? [] : [0x7f];
}

function sameTypes(left: readonly WasmType[], right: readonly WasmType[]): boolean {
  return left.length === right.length && left.every((type, index) => type === right[index]);
}

function featureValue(
  features: ForgeWebScriptTargetFeatures | undefined,
  key: keyof ForgeWebScriptTargetFeatures,
): boolean {
  return features?.[key] === true;
}

function normalizedFeatureProfile(features: ForgeWebScriptTargetFeatures | undefined): ForgeWebScriptTargetFeatures {
  return Object.fromEntries(
    (['simd', 'tailCall', 'memory64', 'threads', 'atomics'] as const)
      .filter((feature) => featureValue(features, feature))
      .map((feature) => [feature, true]),
  ) as ForgeWebScriptTargetFeatures;
}

function verifyVariant(
  bytes: Uint8Array,
  input: ForgeWebScriptWasmArtifactVerificationInput,
  fileName: string,
  variant: 'optimized' | 'unoptimized',
): { readonly parsed?: ParsedWasm; readonly diagnostics: readonly ForgeWebScriptWasmArtifactVerificationDiagnostic[] } {
  const diagnostics: ForgeWebScriptWasmArtifactVerificationDiagnostic[] = [];
  let parsed: ParsedWasm;
  try {
    parsed = parseWasm(bytes, input.policy?.maxCustomSectionBytes ?? DEFAULT_MAX_CUSTOM_SECTION_BYTES);
    if (!WebAssembly.validate(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer))
      throw new Error('The WebAssembly engine rejected the binary.');
  } catch (error) {
    diagnostics.push(
      diagnostic(
        'FWS-ARTIFACT-001',
        `${variant} WebAssembly is malformed or failed engine validation: ${error instanceof Error ? error.message : String(error)}`,
        fileName,
        'Emit a fresh artifact with the supported FWS backend.',
      ),
    );
    return { diagnostics };
  }
  const expectedImports = input.manifest.imports.map(({ capability, alias, function: declaration }) => ({
    capability,
    alias,
    declaration,
  }));
  const actualImports = parsed.imports.filter(({ kind }) => kind === 0);
  if (parsed.imports.some(({ kind }) => kind !== 0))
    diagnostics.push(
      diagnostic(
        'FWS-ARTIFACT-003',
        'Artifact contains a non-function import outside the FWS capability ABI.',
        fileName,
      ),
    );
  if (actualImports.length !== expectedImports.length)
    diagnostics.push(
      diagnostic(
        'FWS-ARTIFACT-002',
        `${variant} artifact imports ${actualImports.length} functions but the manifest declares ${expectedImports.length}.`,
        fileName,
      ),
    );
  const allowed = input.policy?.allowedCapabilities;
  for (const imported of actualImports) {
    const expected = expectedImports.find(
      ({ capability, alias }) => capability === imported.module && alias === imported.name,
    );
    if (expected === undefined) {
      diagnostics.push(
        diagnostic(
          'FWS-ARTIFACT-003',
          `Artifact contains undeclared capability import "${imported.module}.${imported.name}".`,
          fileName,
          'Declare the capability in the FWS ABI manifest and policy.',
        ),
      );
      continue;
    }
    if (allowed !== undefined && allowed.length > 0 && !allowed.includes(imported.module))
      diagnostics.push(
        diagnostic(
          'FWS-ARTIFACT-004',
          `Capability "${imported.module}" is not allowed by the artifact verification policy.`,
          fileName,
        ),
      );
    if (imported.typeIndex === undefined || !parsed.types[imported.typeIndex]) continue;
    const type = parsed.types[imported.typeIndex];
    const expectedParameters = expected.declaration.parameters.flatMap((parameter) =>
      lowLevelTypes(parameter.type, parameter.reference, input.manifest.memory.addressType),
    );
    const expectedResult = lowLevelTypes(
      expected.declaration.result,
      expected.declaration.resultReference,
      input.manifest.memory.addressType,
    );
    if (!sameTypes(type.parameters, expectedParameters) || !sameTypes(type.results, expectedResult))
      diagnostics.push(
        diagnostic(
          'FWS-ARTIFACT-005',
          `Capability import "${imported.module}.${imported.name}" has a signature different from the manifest.`,
          fileName,
        ),
      );
  }
  if (
    new Set(expectedImports.map(({ capability }) => capability)).size !==
      new Set(input.manifest.requiredCapabilities).size ||
    expectedImports.some(({ capability }) => !input.manifest.requiredCapabilities.includes(capability))
  )
    diagnostics.push(
      diagnostic(
        'FWS-ARTIFACT-006',
        'Manifest requiredCapabilities does not exactly match its capability imports.',
        fileName,
      ),
    );
  const functionIndexes = new Map<number, FunctionType>();
  for (const [index, typeIndex] of parsed.functionTypeIndexes.entries()) {
    const type = parsed.types[typeIndex];
    if (type !== undefined) functionIndexes.set(parsed.imports.filter(({ kind }) => kind === 0).length + index, type);
  }
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
  for (const exported of parsed.exports) {
    if (exported.name !== 'memory' && (exported.kind !== 0 || !allowedFunctionExports.has(exported.name)))
      diagnostics.push(
        diagnostic('FWS-ARTIFACT-007', `Artifact contains unexpected export "${exported.name}".`, fileName),
      );
  }
  for (const exported of exportedFunctions) {
    if (['fws_alloc', 'fws_dealloc', 'fws_realloc', 'fws_reset'].includes(exported.name)) continue;
    const declaration = expectedExports.get(exported.name);
    if (declaration === undefined) {
      if (iteratorNextNames.has(exported.name)) {
        const iteratorTypeIndex = parsed.imports[exported.index]?.typeIndex;
        const iteratorType =
          functionIndexes.get(exported.index) ??
          (iteratorTypeIndex === undefined ? undefined : parsed.types[iteratorTypeIndex]);
        if (
          iteratorType !== undefined &&
          (!sameTypes(iteratorType.parameters, [0x7f]) || !sameTypes(iteratorType.results, [0x7e]))
        )
          diagnostics.push(
            diagnostic(
              'FWS-ARTIFACT-008',
              `Iterator export "${exported.name}" must use the (i32) -> (i64) boundary ABI.`,
              fileName,
            ),
          );
      } else
        diagnostics.push(
          diagnostic('FWS-ARTIFACT-007', `Artifact contains unexpected function export "${exported.name}".`, fileName),
        );
      continue;
    }
    const importedTypeIndex = parsed.imports[exported.index]?.typeIndex;
    const type =
      functionIndexes.get(exported.index) ??
      (importedTypeIndex === undefined ? undefined : parsed.types[importedTypeIndex]);
    if (type === undefined) continue;
    const parameters = declaration.parameters.flatMap(({ type: parameterType, reference }) =>
      lowLevelTypes(parameterType, reference, input.manifest.memory.addressType),
    );
    const result = lowLevelTypes(declaration.result, declaration.resultReference, input.manifest.memory.addressType);
    if (!sameTypes(type.parameters, parameters) || !sameTypes(type.results, result))
      diagnostics.push(
        diagnostic(
          'FWS-ARTIFACT-008',
          `Export "${exported.name}" has a signature different from the manifest.`,
          fileName,
        ),
      );
  }
  for (const declaration of input.manifest.exports)
    if (!parsed.exports.some(({ name }) => name === declaration.name))
      diagnostics.push(
        diagnostic('FWS-ARTIFACT-009', `Manifest export "${declaration.name}" is missing from the artifact.`, fileName),
      );
  const reserved = new Map([
    [
      input.manifest.memory.allocatorExport,
      {
        parameters: lowLevelTypes(input.manifest.memory.addressType),
        results: lowLevelTypes(input.manifest.memory.addressType),
      },
    ],
    [
      input.manifest.memory.deallocatorExport,
      {
        parameters: [
          ...lowLevelTypes(input.manifest.memory.addressType),
          ...lowLevelTypes(input.manifest.memory.addressType),
        ],
        results: [],
      },
    ],
    [
      input.manifest.memory.reallocatorExport,
      {
        parameters: [
          ...lowLevelTypes(input.manifest.memory.addressType),
          ...lowLevelTypes(input.manifest.memory.addressType),
          ...lowLevelTypes(input.manifest.memory.addressType),
        ],
        results: lowLevelTypes(input.manifest.memory.addressType),
      },
    ],
    ['fws_reset', { parameters: [], results: [] }],
  ]);
  for (const [name, expected] of reserved) {
    const exported = parsed.exports.find((entry) => entry.name === name && entry.kind === 0);
    const importedTypeIndex = exported === undefined ? undefined : parsed.imports[exported.index]?.typeIndex;
    const type =
      exported === undefined
        ? undefined
        : (functionIndexes.get(exported.index) ??
          (importedTypeIndex === undefined ? undefined : parsed.types[importedTypeIndex]));
    if (exported === undefined)
      diagnostics.push(diagnostic('FWS-ARTIFACT-010', `Required memory export "${name}" is missing.`, fileName));
    else if (
      type !== undefined &&
      (!sameTypes(type.parameters, expected.parameters) || !sameTypes(type.results, expected.results))
    )
      diagnostics.push(
        diagnostic('FWS-ARTIFACT-011', `Memory export "${name}" has an invalid ABI signature.`, fileName),
      );
  }
  const memory = parsed.memory;
  if (memory === undefined)
    diagnostics.push(diagnostic('FWS-ARTIFACT-012', 'Artifact does not declare linear memory.', fileName));
  else {
    if (
      input.manifest.memory.pageSize !== 65_536 ||
      input.manifest.memory.ownership !== 'caller-owned' ||
      input.manifest.memory.stringEncoding !== 'utf8' ||
      input.manifest.memory.byteArrayRepresentation !== 'pointer-length'
    )
      diagnostics.push(diagnostic('FWS-ARTIFACT-034', 'Manifest contains an unsupported FWS memory layout.', fileName));
    if (memory.memory64 !== (input.manifest.memory.addressType === 'u64'))
      diagnostics.push(
        diagnostic('FWS-ARTIFACT-013', 'Artifact memory address width does not match the manifest.', fileName),
      );
    if (memory.shared !== featureValue(input.targetFeatures, 'threads'))
      diagnostics.push(
        diagnostic(
          'FWS-ARTIFACT-014',
          'Artifact shared-memory flag does not match the target feature policy.',
          fileName,
        ),
      );
    if (input.manifest.memory.minimumPages !== undefined && memory.minimum !== input.manifest.memory.minimumPages)
      diagnostics.push(
        diagnostic('FWS-ARTIFACT-015', 'Artifact memory minimum does not match the manifest.', fileName),
      );
    if (input.manifest.memory.maximumPages !== undefined && memory.maximum !== input.manifest.memory.maximumPages)
      diagnostics.push(
        diagnostic('FWS-ARTIFACT-016', 'Artifact memory maximum does not match the manifest.', fileName),
      );
    if (memory.maximum !== undefined && memory.maximum < memory.minimum)
      diagnostics.push(
        diagnostic('FWS-ARTIFACT-017', 'Artifact memory maximum is smaller than its minimum.', fileName),
      );
  }
  const required = input.featureRequirements ?? {};
  for (const feature of ['simd', 'tailCall', 'memory64', 'threads', 'atomics'] as const) {
    if (required[feature] === true && !featureValue(input.targetFeatures, feature))
      diagnostics.push(
        diagnostic('FWS-ARTIFACT-018', `Artifact requires disabled target feature "${feature}".`, fileName),
      );
  }
  const requestedFeatures = JSON.stringify(normalizedFeatureProfile(input.targetFeatures));
  if (JSON.stringify(input.manifest.targetFeatures ?? {}) !== requestedFeatures)
    diagnostics.push(
      diagnostic(
        'FWS-ARTIFACT-035',
        'Manifest target features do not match the requested compilation profile.',
        fileName,
      ),
    );
  for (const descriptor of input.manifest.iteratorDescriptors ?? []) {
    const exported = input.iteratorExports?.find(({ nextFunction }) => nextFunction === descriptor.nextFunction);
    if (exported === undefined)
      diagnostics.push(
        diagnostic(
          'FWS-ARTIFACT-036',
          `Iterator descriptor "${descriptor.id}" has no matching emitted boundary export.`,
          fileName,
        ),
      );
    else if (
      exported.elementType !== descriptor.elementType ||
      exported.ownership !== descriptor.ownership ||
      exported.resultRepresentation !== 'value-done-pair'
    )
      diagnostics.push(
        diagnostic(
          'FWS-ARTIFACT-037',
          `Iterator descriptor "${descriptor.id}" does not match its emitted boundary metadata.`,
          fileName,
        ),
      );
  }
  if (input.manifest.async !== undefined) {
    for (const capability of input.manifest.async.capabilities)
      if (!input.manifest.requiredCapabilities.includes(capability))
        diagnostics.push(
          diagnostic(
            'FWS-ARTIFACT-038',
            `Async contract capability "${capability}" is not declared by the artifact.`,
            fileName,
          ),
        );
    if (
      input.manifest.async.deterministic !== true ||
      input.manifest.async.taskIdRepresentation !== 'u32' ||
      input.manifest.async.messageRepresentation !== 'owned-bytes' ||
      input.manifest.async.ordering !== 'sequence'
    )
      diagnostics.push(
        diagnostic(
          'FWS-ARTIFACT-039',
          'Artifact async contract is not deterministic or uses an unsupported representation.',
          fileName,
        ),
      );
  }
  const allowedCustomSections = input.policy?.allowedCustomSections ?? DEFAULT_CUSTOM_SECTIONS;
  for (const name of parsed.customSections.keys())
    if (!allowedCustomSections.includes(name))
      diagnostics.push(
        diagnostic('FWS-ARTIFACT-019', `Artifact contains unrecognized custom section "${name}".`, fileName),
      );
  const featureSection = parsed.customSections.get('fws.target-features');
  if (featureSection !== undefined) {
    try {
      const encoded = JSON.parse(new TextDecoder().decode(featureSection)) as Record<string, unknown>;
      for (const feature of ['simd', 'tailCall', 'memory64', 'threads', 'atomics'] as const)
        if (encoded[feature] !== featureValue(input.targetFeatures, feature))
          diagnostics.push(
            diagnostic(
              'FWS-ARTIFACT-020',
              `Target-feature metadata for "${feature}" does not match the requested profile.`,
              fileName,
            ),
          );
    } catch {
      diagnostics.push(diagnostic('FWS-ARTIFACT-021', 'The fws.target-features metadata is not valid JSON.', fileName));
    }
  }
  const metadataSection = parsed.customSections.get('fws.metadata');
  if (metadataSection !== undefined) {
    try {
      const encoded = JSON.parse(
        new TextDecoder().decode(metadataSection),
      ) as Partial<ForgeWebScriptWasmArtifactMetadata>;
      if (
        encoded.compilerVersion !== input.metadata.compilerVersion ||
        encoded.optimization !== input.metadata.optimization ||
        JSON.stringify(encoded.sourceFiles?.toSorted()) !== JSON.stringify(input.metadata.sourceFiles.toSorted()) ||
        encoded.sourceHash !== input.metadata.sourceHash ||
        encoded.graphHash !== input.metadata.graphHash ||
        encoded.sonSchemaVersion !== input.metadata.sonSchemaVersion ||
        encoded.sonGraphHash !== input.metadata.sonGraphHash ||
        encoded.boundsChecks !== input.metadata.boundsChecks ||
        JSON.stringify(encoded.sonOptimizationPasses) !== JSON.stringify(input.metadata.sonOptimizationPasses) ||
        (input.metadata.wasmOptimizationPasses !== undefined &&
          JSON.stringify(encoded.wasmOptimizationPasses) !== JSON.stringify(input.metadata.wasmOptimizationPasses))
      )
        diagnostics.push(
          diagnostic(
            'FWS-ARTIFACT-022',
            'Artifact metadata does not match the deterministic compiler metadata.',
            fileName,
          ),
        );
    } catch {
      diagnostics.push(diagnostic('FWS-ARTIFACT-023', 'The fws.metadata custom section is not valid JSON.', fileName));
    }
  }
  if (
    variant === 'optimized' &&
    input.expectedContentHash !== undefined &&
    sha256ArtifactHash(bytes) !== input.expectedContentHash
  )
    diagnostics.push(
      diagnostic('FWS-ARTIFACT-024', 'Artifact content hash does not match the backend result.', fileName),
    );
  if (
    variant === 'optimized' &&
    input.expectedSourceHash !== undefined &&
    input.metadata.sourceHash !== input.expectedSourceHash
  )
    diagnostics.push(
      diagnostic('FWS-ARTIFACT-031', 'Artifact source hash does not match the source used for compilation.', fileName),
    );
  return { parsed, diagnostics };
}

function verifyAdapter(
  input: ForgeWebScriptWasmArtifactVerificationInput,
  fileName: string,
): readonly ForgeWebScriptWasmArtifactVerificationDiagnostic[] {
  if (input.esmSource === undefined) return [];
  const diagnostics: ForgeWebScriptWasmArtifactVerificationDiagnostic[] = [];
  const source = input.esmSource;
  if (!source.includes('WebAssembly.instantiate') || !source.includes('WebAssembly.Module'))
    diagnostics.push(
      diagnostic(
        'FWS-ARTIFACT-025',
        'Generated ESM adapter does not contain both asynchronous and synchronous Wasm loading paths.',
        fileName,
      ),
    );
  const pointerValue = [
    ...input.manifest.exports,
    ...input.manifest.imports.map(({ function: declaration }) => declaration),
  ].some(
    (declaration) =>
      declaration.parameters.some(({ type }) => type === 'string' || type === 'bytes') ||
      declaration.result === 'string' ||
      declaration.result === 'bytes',
  );
  if (
    !source.includes(input.manifest.memory.allocatorExport) ||
    !source.includes(input.manifest.memory.deallocatorExport) ||
    (pointerValue && !source.includes('checkedBytes'))
  )
    diagnostics.push(
      diagnostic(
        'FWS-ARTIFACT-026',
        'Generated ESM adapter does not expose checked pointer-length allocation and cleanup paths.',
        fileName,
      ),
    );
  const adaptedImport = input.manifest.imports.some(
    ({ function: declaration }) =>
      declaration.parameters.some(({ type }) => type === 'string' || type === 'bytes') ||
      declaration.result === 'string' ||
      declaration.result === 'bytes',
  );
  if (adaptedImport && !source.includes('adaptCapabilityImports'))
    diagnostics.push(
      diagnostic('FWS-ARTIFACT-027', 'Generated ESM adapter does not adapt declared capability imports.', fileName),
    );
  if ((input.manifest.iteratorDescriptors?.length ?? 0) > 0 && !source.includes('adaptIteratorExports'))
    diagnostics.push(
      diagnostic('FWS-ARTIFACT-028', 'Generated ESM adapter does not adapt declared iterator exports.', fileName),
    );
  return diagnostics;
}

export function verifyForgeWebScriptWasmArtifact(
  input: ForgeWebScriptWasmArtifactVerificationInput,
): ForgeWebScriptWasmArtifactVerificationResult {
  const fileName = input.fileName ?? '<artifact>';
  const maxBytes = input.policy?.maxBytes ?? DEFAULT_MAX_BYTES;
  const diagnostics: ForgeWebScriptWasmArtifactVerificationDiagnostic[] = [];
  if (input.wasm.byteLength > maxBytes)
    diagnostics.push(
      diagnostic('FWS-ARTIFACT-029', `Optimized artifact exceeds the verifier byte limit of ${maxBytes}.`, fileName),
    );
  const optimized = verifyVariant(input.wasm, input, fileName, 'optimized');
  diagnostics.push(...optimized.diagnostics);
  const checkedVariants: ('optimized' | 'unoptimized')[] = ['optimized'];
  if (input.unoptimizedWasm !== undefined) {
    checkedVariants.push('unoptimized');
    if (input.unoptimizedWasm.byteLength > maxBytes)
      diagnostics.push(
        diagnostic(
          'FWS-ARTIFACT-030',
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
        'FWS-ARTIFACT-032',
        'A source hash was requested but artifact metadata has no source files.',
        fileName,
      ),
    );
  if (input.manifest.graphHash !== input.metadata.graphHash)
    diagnostics.push(
      diagnostic('FWS-ARTIFACT-033', 'Manifest graph hash does not match deterministic artifact metadata.', fileName),
    );
  return {
    verified: diagnostics.every(({ severity }) => severity !== 'error'),
    diagnostics,
    contentHash: sha256ArtifactHash(input.wasm),
    checkedVariants,
  };
}
