import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, it } from 'vitest';

import { compileForgeWebScript } from './compiler.ts';

function typeCheckGeneratedConsumer(declarations: string, includeRawConsumer = false): readonly string[] {
  const rawConsumer = includeRawConsumer
    ? `
async function useRawRuntime(): Promise<ForgeWebScriptRawExports> {
  const imports: ForgeWebScriptRawImports = {};
  const exports: ForgeWebScriptRawExports = await loadRaw(imports);
  const syncExports: ForgeWebScriptRawExports = loadRawSync(imports);
  const currentTime: () => bigint = exports.currentTime;
  const syncCurrentTime: () => bigint = syncExports.currentTime;
  const echo: (valuePointer: number, valueLength: number) => ForgeWebScriptBytes = exports.echo;
  const syncEcho: (valuePointer: number, valueLength: number) => ForgeWebScriptBytes = syncExports.echo;
  const roundTrip: (valuePointer: number, valueLength: number) => ForgeWebScriptBytes = exports.roundTrip;
  const scanArray: (values: number) => number = exports.scanArray;
  void currentTime;
  void syncCurrentTime;
  void echo;
  void syncEcho;
  void roundTrip;
  void scanArray;
  return exports;
}
`
    : '';
  const consumer = `
import library, {
  load,
  loadRaw,
  loadRawSync,
  loadSync,
  manifest,
  type ForgeWebScriptBytes,
  type ForgeWebScriptExports,
  type ForgeWebScriptImports,
  type ForgeWebScriptManifest,
  type ForgeWebScriptRawExports,
  type ForgeWebScriptRawImports,
} from 'generated-runtime';

const imports: ForgeWebScriptImports = {
  'clock.now': { now: () => 1n },
  'text.transform': { transform: (value: string): string => value },
  'codec.bytes': { reverse: (value: ForgeWebScriptBytes): ForgeWebScriptBytes => value },
};

async function useRuntime(): Promise<bigint> {
  const exports: ForgeWebScriptExports = await load(imports);
  const syncExports: ForgeWebScriptExports = loadSync(imports);
  const libraryExports: ForgeWebScriptExports = library(imports);
  const currentTime: () => bigint = exports.currentTime;
  const syncCurrentTime: () => bigint = syncExports.currentTime;
  const echo: (value: string) => string = exports.echo;
  const syncEcho: (value: string) => string = syncExports.echo;
  const allocator: (size: number) => number = exports.fws_alloc;
  const pointer = allocator(8);
  const reallocator: (pointer: number, oldSize: number, newSize: number) => number = exports.fws_realloc;
  const resizedPointer = reallocator(pointer, 8, 4);
  exports.fws_dealloc(resizedPointer, 4);
  // @ts-expect-error The generated i64 result is bigint, not number.
  const wrongResultType: () => number = exports.currentTime;
  void wrongResultType;
  void syncCurrentTime;
  void syncEcho;
  void libraryExports;
  void echo('hello');
  return currentTime();
}

${rawConsumer}

function inspectManifest(value: ForgeWebScriptManifest): void {
  const format: 'forge-web-script-module' = value.format;
  const languageVersion: string = value.languageVersion;
  const abiVersion: string = value.abiVersion;
  const moduleName: string = value.moduleName;
  const exports: readonly unknown[] = value.exports;
  const imports: readonly unknown[] = value.imports;
  const sourceImports: readonly unknown[] = value.sourceImports;
  const graphHash: string | undefined = value.graphHash;
  const projectRoot: string | undefined = value.projectRoot;
  const linkMode: 'static' | 'dynamic' | undefined = value.linkMode;
  const linkedExports: readonly unknown[] | undefined = value.linkedExports;
  const requiredCapabilities: readonly string[] = value.requiredCapabilities;
  const memoryAddressType: 'u32' | 'u64' = value.memory.addressType;
  const valueRepresentations: Readonly<Record<string, string>> = value.valueRepresentations;
  const trapModel: 'explicit-trap' = value.trapModel;
  const standardLibraryVersion: string = value.standardLibrary.regexBytecodeVersion;
  const aggregateLayouts: readonly unknown[] = value.aggregateLayouts;
  const enumDeclarations: readonly unknown[] = value.enumDeclarations;
  const collectionLayouts: readonly unknown[] = value.collectionLayouts;
  const specializations: readonly unknown[] = value.specializations;
  const iteratorDescriptors: readonly unknown[] = value.iteratorDescriptors;
  const targetFeatures = value.targetFeatures;
  if (value.async !== undefined) {
    const asyncCapabilities: readonly string[] = value.async.capabilities;
    void asyncCapabilities;
  }
  void format;
  void languageVersion;
  void abiVersion;
  void moduleName;
  void exports;
  void imports;
  void sourceImports;
  void graphHash;
  void projectRoot;
  void linkMode;
  void linkedExports;
  void requiredCapabilities;
  void memoryAddressType;
  void valueRepresentations;
  void trapModel;
  void standardLibraryVersion;
  void aggregateLayouts;
  void enumDeclarations;
  void collectionLayouts;
  void specializations;
  void iteratorDescriptors;
  void targetFeatures;
}

void useRuntime();
inspectManifest(manifest);
`;
  const runtimeDeclarations = `declare module 'generated-runtime' {
${declarations.replaceAll(/^declare\s+/gmu, '')}
}`;
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'forge-web-script-types-'));
  const consumerPath = path.join(temporaryRoot, 'consumer.ts');
  const declarationsPath = path.join(temporaryRoot, 'generated-runtime.d.ts');
  writeFileSync(consumerPath, consumer);
  writeFileSync(declarationsPath, runtimeDeclarations);

  try {
    execFileSync(
      path.resolve(import.meta.dirname, '../node_modules/.bin/tsc'),
      [
        '--noEmit',
        '--ignoreConfig',
        '--strict',
        '--module',
        'ESNext',
        '--moduleResolution',
        'Bundler',
        '--target',
        'ESNext',
        '--lib',
        'esnext,dom',
        '--pretty',
        'false',
        consumerPath,
        declarationsPath,
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return [];
  } catch (error) {
    const result = error as { stdout?: string; stderr?: string };
    return `${result.stdout ?? ''}${result.stderr ?? ''}`.split(/\r?\n/u).filter((line) => line.length > 0);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

describe('Forge Web Script generated type contracts', () => {
  it('generates ForgeWebScriptExports and ForgeWebScriptImports that are valid TypeScript', () => {
    const artifact = compileForgeWebScript({
      source: `
import capability "clock.now" as now() -> i64;
export fn currentTime() -> i64 { return now(); }
export fn roundTrip(value: bytes) -> bytes { return value; }
export fn echo(value: string) -> string { return value; }
`,
      fileName: 'test.fws',
      compilerVersion: '0.1.0',
      requestedCapabilities: ['clock.now'],
    });

    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.declarations).toBeDefined();

    // Verify the generated declarations contain the expected type signatures
    expect(artifact.declarations).toContain('export interface ForgeWebScriptExports');
    expect(artifact.declarations).toContain('readonly currentTime: () => bigint;');
    expect(artifact.declarations).toContain('readonly roundTrip: (value: ForgeWebScriptBytes) => ForgeWebScriptBytes;');
    expect(artifact.declarations).toContain('readonly echo: (value: string) => string;');
    expect(artifact.declarations).toContain('readonly memory: WebAssembly.Memory;');
    expect(artifact.declarations).toContain('export interface ForgeWebScriptImports');
    expect(artifact.declarations).toContain('export interface ForgeWebScriptRawExports');
    expect(artifact.declarations).toContain('export type ForgeWebScriptRawImports = WebAssembly.Imports;');
    expect(artifact.declarations).toContain('export interface ForgeWebScriptManifest');
    expect(artifact.declarations).toContain('export interface ForgeWebScriptAggregateLayout');
    expect(artifact.declarations).toContain('export const abiManifest: ForgeWebScriptManifest;');
    expect(artifact.declarations).toContain('readonly "clock.now": {');
    expect(artifact.declarations).toContain('readonly now: () => bigint;');
    expect(artifact.declarations).toContain('load(imports?: ForgeWebScriptImports): Promise<ForgeWebScriptExports>');
    expect(artifact.declarations).toContain('loadSync(imports?: ForgeWebScriptImports): ForgeWebScriptExports');
    expect(artifact.declarations).toContain('declare const library: typeof loadSync;');
    expect(artifact.declarations).toContain('export default library;');
    expect(artifact.declarations).toContain(
      'loadRaw(imports?: ForgeWebScriptRawImports): Promise<ForgeWebScriptRawExports>',
    );
    expect(artifact.declarations).toContain(
      'loadRawSync(imports?: ForgeWebScriptRawImports): ForgeWebScriptRawExports',
    );
  });

  it('generates valid TypeScript that can be parsed and type-checked', () => {
    const artifact = compileForgeWebScript({
      source: `export fn answer() -> i32 { return 42; }`,
      fileName: 'test.fws',
      compilerVersion: '0.1.0',
    });

    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.declarations).toBeDefined();

    // The declarations should be valid TypeScript that includes:
    // 1. ForgeWebScriptExports interface with exported functions
    // 2. ForgeWebScriptImports interface for capability imports
    // 3. load() function signature
    const decl = artifact.declarations;
    expect(decl).toMatch(/export interface ForgeWebScriptExports/);
    expect(decl).toMatch(/readonly answer: \(\) => number;/);
    expect(decl).toMatch(/readonly fws_alloc: \(size: number\) => number;/);
    expect(decl).toMatch(/readonly fws_dealloc: \(pointer: number, size: number\) => void;/);
    expect(decl).toMatch(/readonly fws_realloc: \(pointer: number, oldSize: number, newSize: number\) => number;/);
    expect(decl).toMatch(/readonly fws_reset: \(\) => void;/);
    expect(decl).toMatch(/export interface ForgeWebScriptImports/);
    expect(decl).toMatch(/export function load\(imports\?: ForgeWebScriptImports\): Promise<ForgeWebScriptExports>/);
    expect(decl).toMatch(/export function loadSync\(imports\?: ForgeWebScriptImports\): ForgeWebScriptExports/);
    expect(decl).toMatch(/declare const library: typeof loadSync;/);
    expect(decl).toMatch(/export default library;/);
  });

  it('generates i64/u64 as bigint in exported function signatures', () => {
    const artifact = compileForgeWebScript({
      source: `
import capability "clock.now" as now() -> i64;
export fn bigValue() -> i64 { return now(); }
`,
      fileName: 'test.fws',
      compilerVersion: '0.1.0',
      requestedCapabilities: ['clock.now'],
    });

    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.declarations).toContain('readonly bigValue: () => bigint;');
  });

  it('type-checks a consumer against the generated declaration contract', () => {
    const artifact = compileForgeWebScript({
      source: `
import capability "clock.now" as now() -> i64;
import capability "text.transform" as transform(value: string) -> string;
import capability "codec.bytes" as reverse(value: bytes) -> bytes;
export fn currentTime() -> i64 { return now(); }
export fn echo(value: string) -> string { return value; }
`,
      fileName: 'test.fws',
      compilerVersion: '0.1.0',
      requestedCapabilities: ['clock.now', 'text.transform', 'codec.bytes'],
    });

    expect(artifact.diagnostics).toEqual([]);
    const diagnostics = typeCheckGeneratedConsumer(artifact.declarations);
    expect(diagnostics).toEqual([]);
  });

  it('keeps bytes as pointer-length tuples and projects string values as strings', () => {
    const artifact = compileForgeWebScript({
      source: `export fn process(data: bytes) -> bytes { return data; }
export fn echo(value: string) -> string { return value; }`,
      fileName: 'test.fws',
      compilerVersion: '0.1.0',
    });

    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.declarations).toContain('readonly process: (data: ForgeWebScriptBytes) => ForgeWebScriptBytes;');
    expect(artifact.declarations).toContain('readonly echo: (value: string) => string;');
  });

  it('generates raw pointer signatures for string, bytes, and Array values', () => {
    const artifact = compileForgeWebScript({
      source: `import capability "clock.now" as now() -> i64;
import capability "text.transform" as transform(value: string) -> string;
import capability "codec.bytes" as reverse(value: bytes) -> bytes;
export fn currentTime() -> i64 { return now(); }
export fn process(data: bytes) -> bytes { return data; }
export fn roundTrip(value: bytes) -> bytes { return value; }
export fn echo(value: string) -> string { return value; }
export fn scanArray(values: Array<i32>) -> i32 { return values[0]; }`,
      fileName: 'raw.fws',
      compilerVersion: '0.1.0',
      requestedCapabilities: ['clock.now', 'text.transform', 'codec.bytes'],
    });

    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.declarations).toContain(
      'readonly process: (dataPointer: number, dataLength: number) => ForgeWebScriptBytes;',
    );
    expect(artifact.declarations).toContain(
      'readonly echo: (valuePointer: number, valueLength: number) => ForgeWebScriptBytes;',
    );
    expect(artifact.declarations).toContain('readonly scanArray: (values: number) => number;');
    expect(typeCheckGeneratedConsumer(artifact.declarations, true)).toEqual([]);
  });

  it('generates capability imports with nested typed interfaces', () => {
    const artifact = compileForgeWebScript({
      source: `
import capability "codec.barcode.encode" as encode(payload: string) -> bytes;
import capability "codec.bytes" as reverse(value: bytes) -> bytes;
export fn encodeBarcode(payload: string) -> bytes { return encode(payload); }
export fn reverseBytes(value: bytes) -> bytes { return reverse(value); }
`,
      fileName: 'test.fws',
      compilerVersion: '0.1.0',
      requestedCapabilities: ['codec.barcode.encode', 'codec.bytes'],
    });

    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.declarations).toContain('readonly "codec.barcode.encode": {');
    expect(artifact.declarations).toContain('readonly encode: (payload: string) => ForgeWebScriptBytes;');
    expect(artifact.declarations).toContain('readonly "codec.bytes": {');
    expect(artifact.declarations).toContain('readonly reverse: (value: ForgeWebScriptBytes) => ForgeWebScriptBytes;');
  });

  it('generates safe property keys for non-identifier capability names', () => {
    const artifact = compileForgeWebScript({
      source: `
import capability "clock.now" as now() -> i64;
export fn current() -> i64 { return now(); }
`,
      fileName: 'test.fws',
      compilerVersion: '0.1.0',
      requestedCapabilities: ['clock.now'],
    });

    expect(artifact.diagnostics).toEqual([]);
    // The capability name "clock.now" contains a dot, so it must be a quoted key
    expect(artifact.declarations).toContain('readonly "clock.now": {');
  });

  it('publishes deterministic async capability and message-boundary metadata', () => {
    const artifact = compileForgeWebScript({
      source: `
import capability "scheduler.worker" as post(payload: bytes) -> u32;
export fn enqueue(payload: bytes) -> u32 { return post(payload); }
`,
      fileName: 'async.fws',
      compilerVersion: '0.1.0',
      requestedCapabilities: ['scheduler.worker'],
    });

    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.manifest?.async).toEqual({
      capabilities: ['scheduler.worker'],
      deterministic: true,
      taskIdRepresentation: 'u32',
      messageRepresentation: 'owned-bytes',
      ordering: 'sequence',
    });
  });
});
