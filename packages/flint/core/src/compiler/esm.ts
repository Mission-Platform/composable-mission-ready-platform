import { declarationProperty } from './declarations.js';
import { createValueAdapterSource } from './esm-runtime.js';

import type { FlintIteratorExport } from '../contracts.js';
import type { FlintAbiManifest, FlintAbiParameter, FlintDynamicLinkMetadata, FlintHostImport } from '../manifest.js';

/**
 * Encodes a byte array into a standard Base64 string.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCodePoint(byte);
  return btoa(binary);
}

/**
 * Checks whether a function signature contains value types (strings, bytes, arrays, or records).
 */
function hasValueTypes(
  declaration: {
    readonly parameters: readonly { readonly type: string; readonly reference?: string }[];
    readonly result: string;
    readonly resultReference?: string;
  },
  recordNames: ReadonlySet<string>,
): boolean {
  if (declaration.result === 'string' || declaration.result === 'bytes') return true;
  if (declaration.resultReference !== undefined && recordNames.has(declaration.resultReference)) return true;
  return declaration.parameters.some(
    ({ type, reference }) =>
      type === 'string' ||
      type === 'bytes' ||
      reference === 'Array' ||
      (reference !== undefined && recordNames.has(reference)),
  );
}

/**
 * Renders exported enum declarations as frozen JavaScript objects.
 */
function renderEnumExports(manifest: FlintAbiManifest): string {
  return manifest.enumDeclarations
    .filter(({ exported }) => exported)
    .map(
      (declaration) =>
        `export const ${declarationProperty(declaration.name)} = Object.freeze({ ${declaration.variants
          .map(({ name, value }) => `${declarationProperty(name)}: ${value}`)
          .join(', ')} });`,
    )
    .join('\n');
}

/**
 * Collects aggregate struct layouts for record marshaling.
 */
function collectRecordLayouts(manifest: FlintAbiManifest): Record<string, unknown> {
  return Object.fromEntries(
    manifest.aggregateLayouts
      .filter(({ kind, record }) => kind === 'struct' && record === true)
      .map((layout) => [layout.name, layout]),
  );
}

/**
 * Serializes parameters for value export descriptors.
 */
function serializeExportParameters(parameters: readonly FlintAbiParameter[]): Record<string, unknown>[] {
  return parameters.map((parameter) => {
    const entry: Record<string, unknown> = { type: parameter.type };
    if (parameter.reference !== undefined) entry.reference = parameter.reference;
    if (parameter.arguments !== undefined) entry.arguments = parameter.arguments;
    if (parameter.length !== undefined) entry.length = parameter.length;
    if (parameter.ownership !== undefined) entry.ownership = parameter.ownership;
    return entry;
  });
}

/**
 * Collects and formats value exports for runtime adapters.
 */
function collectValueExports(
  manifest: FlintAbiManifest,
  recordNames: ReadonlySet<string>,
  hasStringImports: boolean,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const declaration of manifest.exports) {
    if (!hasStringImports && !hasValueTypes(declaration, recordNames)) continue;
    const entry: Record<string, unknown> = {
      parameters: serializeExportParameters(declaration.parameters),
      result: declaration.result,
    };
    if (declaration.resultReference !== undefined) entry.resultReference = declaration.resultReference;
    result[declaration.name] = entry;
  }
  return result;
}

/**
 * Gathers all exported WebAssembly function and lifecycle symbols.
 */
function collectExportFunctionNames(
  manifest: FlintAbiManifest,
  iteratorExports: readonly FlintIteratorExport[],
): readonly string[] {
  return [
    ...new Set([
      ...manifest.exports.map(({ name }) => name),
      ...iteratorExports.flatMap(({ name, nextFunction }) => [name, nextFunction]),
      manifest.memory.allocatorExport,
      manifest.memory.deallocatorExport,
      manifest.memory.reallocatorExport,
      'fws_reset',
    ]),
  ];
}

/**
 * Checks whether any exports or imports declare string parameters or returns.
 */
function hasStringTypes(manifest: FlintAbiManifest): boolean {
  const inExports = manifest.exports.some(
    (decl) => decl.parameters.some(({ type }) => type === 'string') || decl.result === 'string',
  );
  const inImports = manifest.imports.some(
    ({ function: decl }) => decl.parameters.some(({ type }) => type === 'string') || decl.result === 'string',
  );
  return inExports || inImports;
}

/**
 * Checks whether any value adapters are configured for imports or exports.
 */
function hasValueAdaptersConfigured(valueExports: Record<string, unknown>, valueImports: readonly unknown[]): boolean {
  return Object.keys(valueExports).length > 0 || valueImports.length > 0;
}

/**
 * Resolves the marshaling value adapter code or an identity passthrough function.
 */
function resolveValueAdapter(
  valueExports: Record<string, unknown>,
  recordLayouts: Record<string, unknown>,
  valueImports: readonly FlintHostImport[],
  hasStringValues: boolean,
  hasValueAdapters: boolean,
): string {
  if (!hasValueAdapters) {
    return 'function adaptValueExports(wasmExports) {\n  return wasmExports;\n}';
  }
  return createValueAdapterSource(valueExports, recordLayouts, valueImports, hasStringValues);
}

/**
 * Generates an ESM loader module string containing embedded WebAssembly and runtime adapters.
 */
// skipcq: JS-R1005
export function createEsmSource(
  wasm: Uint8Array,
  manifest: FlintAbiManifest,
  iteratorExports: readonly FlintIteratorExport[] = [],
  dynamicMetadata?: FlintDynamicLinkMetadata,
): string {
  const base64 = bytesToBase64(wasm);
  const byteArray = [...wasm].join(',');
  const enumExports = renderEnumExports(manifest);
  const recordLayouts = collectRecordLayouts(manifest);
  const recordNames = new Set(Object.keys(recordLayouts));
  const hasStringImports = manifest.imports.some(
    ({ function: decl }) => decl.parameters.some(({ type }) => type === 'string') || decl.result === 'string',
  );
  const valueImports = manifest.imports.filter(({ function: decl }) => hasValueTypes(decl, recordNames));
  const valueExports = collectValueExports(manifest, recordNames, hasStringImports);
  const functionNames = collectExportFunctionNames(manifest, iteratorExports);
  const hasValueAdapters = hasValueAdaptersConfigured(valueExports, valueImports);
  const valueAdapter = resolveValueAdapter(
    valueExports,
    recordLayouts,
    valueImports,
    hasStringTypes(manifest),
    hasValueAdapters,
  );
  const enumPrefix = enumExports.length > 0 ? `${enumExports}\n` : '';
  return `${enumPrefix}const wasm = Uint8Array.from([${byteArray}]);
const wasmBase64 = '${base64}';
export const manifest = ${JSON.stringify(manifest)};
export const dynamicLinkMetadata = ${JSON.stringify(dynamicMetadata)};
const dynamicModuleCache = new Map();
const dynamicExportCache = new Map();
function dynamicModule(alias, imports) {
  const loader = imports.dynamicModules?.[alias];
  if (typeof loader !== 'function') throw new Error('Flint dynamic module loader "' + alias + '" is missing.');
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
      if (typeof callable !== 'function') throw new Error('Flint dynamic export "' + exportName + '" is missing from module "' + alias + '".');
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
  if (typeof loader !== 'function') throw new Error('Flint dynamic module loader "' + alias + '" is missing.');
  let module = dynamicModuleCache.get(alias);
  if (module === undefined || typeof module.then === 'function') {
    module = loader();
    dynamicModuleCache.set(alias, module);
  }
  const callable = module?.[exportName];
  if (typeof callable !== 'function') throw new Error('Flint dynamic export "' + exportName + '" is missing from module "' + alias + '".');
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
    if (typeof exports[name] !== 'function') throw new Error(\`Flint export "\${name}" is missing or is not callable.\`);
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
