import { declarationProperty } from './declarations.js';
import { createValueAdapterSource } from './esm-runtime.js';

import type { ForgeWebScriptIteratorExport } from '../contracts.js';
import type { ForgeWebScriptAbiManifest, ForgeWebScriptDynamicLinkMetadata } from '../manifest.js';

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCodePoint(byte);
  return btoa(binary);
}

export function createEsmSource(
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
  const recordLayouts = Object.fromEntries(
    manifest.aggregateLayouts
      .filter(({ kind, record }) => kind === 'struct' && record === true)
      .map((layout) => [layout.name, layout]),
  );
  const recordNames = new Set(Object.keys(recordLayouts));
  const stringImports = manifest.imports.filter(
    ({ function: declaration }) =>
      declaration.parameters.some(({ type }) => type === 'string') || declaration.result === 'string',
  );
  const valueImports = manifest.imports.filter(
    ({ function: declaration }) =>
      declaration.parameters.some(({ type }) => type === 'string' || type === 'bytes') ||
      declaration.result === 'string' ||
      declaration.result === 'bytes' ||
      declaration.parameters.some(({ reference }) => reference !== undefined && recordNames.has(reference)) ||
      (declaration.resultReference !== undefined && recordNames.has(declaration.resultReference)),
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
          declaration.result === 'string' ||
          declaration.parameters.some(({ reference }) => reference !== undefined && recordNames.has(reference)) ||
          (declaration.resultReference !== undefined && recordNames.has(declaration.resultReference)),
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
          ...(declaration.resultReference === undefined ? {} : { resultReference: declaration.resultReference }),
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
    ? createValueAdapterSource(valueExports, recordLayouts, valueImports, hasStringValues)
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
