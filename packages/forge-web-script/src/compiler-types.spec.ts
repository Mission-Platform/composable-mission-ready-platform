import * as ts from 'typescript';
import { describe, it } from 'vitest';

import { compileForgeWebScript } from './compiler.ts';

function typeCheckGeneratedConsumer(declarations: string): readonly ts.Diagnostic[] {
  const root = '/virtual-forge-web-script-types';
  const files = new Map([
    [
      `${root}/consumer.ts`,
      `
import {
  load,
  loadSync,
  manifest,
  type ForgeWebScriptBytes,
  type ForgeWebScriptExports,
  type ForgeWebScriptImports,
  type ForgeWebScriptManifest,
} from 'generated-runtime';

const imports: ForgeWebScriptImports = {
  'clock.now': { now: () => 1n },
  'text.transform': { transform: (value: string): string => value },
  'codec.bytes': { reverse: (value: ForgeWebScriptBytes): ForgeWebScriptBytes => value },
};

async function useRuntime(): Promise<bigint> {
  const exports: ForgeWebScriptExports = await load(imports);
  const syncExports: ForgeWebScriptExports = loadSync(imports);
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
  void echo('hello');
  return currentTime();
}

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
`,
    ],
    [
      `${root}/generated-runtime.d.ts`,
      `declare module 'generated-runtime' {
${declarations}
}`,
    ],
  ]);
  const options: ts.CompilerOptions = {
    lib: ['lib.esnext.d.ts', 'lib.dom.d.ts'],
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    strict: true,
    target: ts.ScriptTarget.ESNext,
  };
  const host = ts.createCompilerHost(options);
  const defaultReadFile = host.readFile.bind(host);
  const defaultFileExists = host.fileExists.bind(host);
  const defaultGetSourceFile = host.getSourceFile.bind(host);
  host.readFile = (fileName) => files.get(fileName) ?? defaultReadFile(fileName);
  host.fileExists = (fileName) => files.has(fileName) || defaultFileExists(fileName);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    const source = files.get(fileName);
    return source === undefined
      ? defaultGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
      : ts.createSourceFile(fileName, source, languageVersion, true);
  };
  const program = ts.createProgram([`${root}/consumer.ts`, `${root}/generated-runtime.d.ts`], options, host);
  return ts.getPreEmitDiagnostics(program);
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
    expect(artifact.declarations).toContain('export interface ForgeWebScriptManifest');
    expect(artifact.declarations).toContain('export interface ForgeWebScriptAggregateLayout');
    expect(artifact.declarations).toContain('export const abiManifest: ForgeWebScriptManifest;');
    expect(artifact.declarations).toContain('readonly "clock.now": {');
    expect(artifact.declarations).toContain('readonly now: () => bigint;');
    expect(artifact.declarations).toContain('load(imports?: ForgeWebScriptImports): Promise<ForgeWebScriptExports>');
    expect(artifact.declarations).toContain('loadSync(imports?: ForgeWebScriptImports): ForgeWebScriptExports');
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
    expect(diagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))).toEqual([]);
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
