import { describe, expect, it } from 'vitest';

import { buildGeneratedModule, deriveSyncInstantiate, extractInstantiate } from './generate';

const BINDINGS = `async function instantiate(module, imports = {}) {
  const { exports } = await WebAssembly.instantiate(module, imports);
  return exports;
}
export const {
  memory,
  add,
} = await (async url => instantiate(await WebAssembly.compileStreaming(fetch(url)), {}))(new URL("m.wasm", import.meta.url));
`;

describe('extractInstantiate', () => {
  it('keeps only the instantiate function, dropping the URL auto-instantiation', () => {
    const result = extractInstantiate(BINDINGS);
    expect(result.startsWith('async function instantiate(')).toBe(true);
    expect(result.includes('compileStreaming')).toBe(false);
    expect(result.includes('export const {')).toBe(false);
  });

  it('throws when the expected marker is missing', () => {
    expect(() => extractInstantiate('function instantiate() {}')).toThrow(/marker not found/u);
  });
});

describe('buildGeneratedModule', () => {
  const module = buildGeneratedModule('QUJD', extractInstantiate(BINDINGS));

  it('inlines the wasm as a base64 constant', () => {
    expect(module).toContain('const WASM_BASE64 = "QUJD"');
  });

  it('exports a memoised async loadModule factory', () => {
    expect(module).toContain('export async function loadModule()');
    expect(module).toContain('WebAssembly.compile(decodeBase64(WASM_BASE64))');
  });

  it('exports the instantiate function', () => {
    expect(module).toContain('export async function instantiate(');
  });

  it('exports a memoised synchronous loadModule factory', () => {
    expect(module).toContain('export function loadModuleSync()');
    expect(module).toContain('new WebAssembly.Module(decodeBase64(WASM_BASE64))');
    expect(module).toContain('function instantiateSync(');
    expect(module).toContain('new WebAssembly.Instance(module, imports)');
  });

  it('provides a cross-environment base64 decoder', () => {
    expect(module).toContain("typeof Buffer !== 'undefined'");
    expect(module).toContain('atob(value)');
  });
});

describe('deriveSyncInstantiate', () => {
  it('rewrites the async instantiate into a synchronous variant', () => {
    const result = deriveSyncInstantiate(extractInstantiate(BINDINGS));
    expect(result.startsWith('function instantiateSync(')).toBe(true);
    expect(result.includes('await')).toBe(false);
    expect(result.includes('new WebAssembly.Instance(')).toBe(true);
  });

  it('throws when the async instantiate shape is unexpected', () => {
    expect(() => deriveSyncInstantiate('function instantiate() {}')).toThrow(/synchronous instantiate/u);
  });
});
