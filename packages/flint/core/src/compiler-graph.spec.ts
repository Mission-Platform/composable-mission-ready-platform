import { describe, expect, it } from 'vitest';

import { createFlintCompilerService } from './compiler.ts';
import { resolveFlintModuleGraph } from './graph.ts';

function resolver(files: Readonly<Record<string, string>>) {
  return {
    // skipcq: JS-R1005
    resolve: (source: string, importer: string) => {
      const base = importer.slice(0, importer.lastIndexOf('/'));
      const parts = `${base}/${source}`.split('/');
      const resolved: string[] = [];
      for (const part of parts) {
        if (part === '' || part === '.') continue;
        if (part === '..') resolved.pop();
        else resolved.push(part);
      }
      const fileName = `/${resolved.join('/')}`;
      return files[fileName] === undefined ? undefined : fileName;
    },
    load: (fileName: string) => files[fileName] ?? '',
  };
}

function graphFor(
  files: Readonly<Record<string, string>>,
  configuration: Parameters<typeof resolveFlintModuleGraph>[2],
) {
  return resolveFlintModuleGraph(['/workspace/app/main.flint'], resolver(files), configuration);
}

describe('Forge Web Script graph compiler service', () => {
  it('statically merges same-project modules and records graph metadata', async () => {
    const result = await graphFor(
      {
        '/workspace/app/main.flint': 'import "./helper.flint" as helper; export fn main() -> i32 { return 1; }',
        '/workspace/app/helper.flint': 'export fn helper() -> i32 { return 2; }',
      },
      { projectRoots: ['/workspace/app'] },
    );
    const service = createFlintCompilerService();
    const artifact = service.compileGraph({
      graph: result.graph,
      entryFileName: '/workspace/app/main.flint',
      compilerVersion: '0.1.0',
    });

    expect(result.diagnostics).toEqual([]);
    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.wasm).toBeDefined();
    const wasmBytes = artifact.wasm as Uint8Array;
    expect(WebAssembly.Module.exports(new WebAssembly.Module(wasmBytes)).map(({ name }) => name)).toEqual([
      'main',
      'helper',
      'memory',
      'fws_alloc',
      'fws_dealloc',
      'fws_realloc',
      'fws_reset',
    ]);
    expect(artifact.manifest).toMatchObject({
      moduleName: 'main',
      linkMode: 'static',
      graphHash: expect.any(String),
      linkedExports: expect.arrayContaining([
        expect.objectContaining({ name: 'main', moduleId: 'main' }),
        expect.objectContaining({ name: 'helper', moduleId: 'helper' }),
      ]),
    });
    service.dispose();
  });

  it('runs source analysis for graph compilation before emitting Wasm', async () => {
    const result = await graphFor(
      {
        '/workspace/app/main.flint': 'export fn main() -> i32 { let values: [i32; 2] = [1, 2]; return values[2]; }',
      },
      { projectRoots: ['/workspace/app'] },
    );
    const service = createFlintCompilerService();
    const artifact = service.compileGraph({
      graph: result.graph,
      entryFileName: '/workspace/app/main.flint',
      compilerVersion: '0.1.0',
    });

    expect(result.diagnostics).toEqual([]);
    expect(artifact.wasm).toBeUndefined();
    expect(artifact.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'FLINT-ANALYSIS-MEMORY-002',
          phase: 'analysis',
          ruleId: 'fws.safety.ranges-and-bounds',
        }),
      ]),
    );
    service.dispose();
  });

  it('executes calls to qualified exports from a statically linked module', async () => {
    const result = await graphFor(
      {
        '/workspace/app/main.flint':
          'import "./helper.flint" as helper; export fn main() -> i32 { return helper.increment(41); }',
        '/workspace/app/helper.flint': 'export fn increment(value: i32) -> i32 { return value + 1; }',
      },
      { projectRoots: ['/workspace/app'] },
    );
    const service = createFlintCompilerService();
    const artifact = service.compileGraph({
      graph: result.graph,
      entryFileName: '/workspace/app/main.flint',
      compilerVersion: '0.1.0',
    });

    expect(result.diagnostics).toEqual([]);
    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.manifest?.exports).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'main', parameters: [], result: 'i32' })]),
    );
    expect(artifact.wasm).toBeDefined();
    const wasmBytes = artifact.wasm as Uint8Array;
    const instance = new WebAssembly.Instance(new WebAssembly.Module(wasmBytes));
    expect((instance.exports.main as () => number)()).toBe(42);
    service.dispose();
  });

  it('preserves string return values across statically linked modules', async () => {
    const result = await graphFor(
      {
        '/workspace/app/main.flint':
          'import "./helper.flint" as helper; export fn main(value: string) -> string { return string_concat(helper.suffix(value), ""); }',
        '/workspace/app/helper.flint':
          'export fn suffix(value: string) -> string { return string_concat(value, "!"); }',
      },
      { projectRoots: ['/workspace/app'] },
    );
    const service = createFlintCompilerService();
    const artifact = service.compileGraph({
      graph: result.graph,
      entryFileName: '/workspace/app/main.flint',
      compilerVersion: '0.1.0',
    });

    expect(result.diagnostics).toEqual([]);
    expect(artifact.diagnostics).toEqual([]);
    const wasm = artifact.wasm ?? new Uint8Array();
    const instance = new WebAssembly.Instance(new WebAssembly.Module(wasm));
    const allocate = instance.exports.fws_alloc as (size: number) => number;
    const pointer = allocate(3);
    new Uint8Array((instance.exports.memory as WebAssembly.Memory).buffer, pointer, 3).set([97, 98, 99]);
    const returned = (instance.exports.main as (pointer: number, length: number) => readonly [number, number])(
      pointer,
      3,
    );
    expect(returned[1]).toBe(4);
    expect(
      new TextDecoder().decode(
        new Uint8Array((instance.exports.memory as WebAssembly.Memory).buffer, returned[0], returned[1]),
      ),
    ).toBe('abc!');
    service.dispose();
  });

  it('preserves loop-carried strings in statically linked modules', async () => {
    const result = await graphFor(
      {
        '/workspace/app/main.flint':
          'import "./helper.flint" as helper; export fn main(value: string) -> string { return string_concat(helper.collect(value), ""); }',
        '/workspace/app/helper.flint': `export fn collect(value: string) -> string {
  let mut result: string = "";
  let mut index: i32 = 0;
  while index < string_length(value) {
    result = string_concat(result, string_slice(value, index, index + 1));
    index = index + 1;
  }
  return string_concat(result, "");
}`,
      },
      { projectRoots: ['/workspace/app'] },
    );
    const service = createFlintCompilerService();
    const artifact = service.compileGraph({
      graph: result.graph,
      entryFileName: '/workspace/app/main.flint',
      compilerVersion: '0.1.0',
    });

    expect(result.diagnostics).toEqual([]);
    expect(artifact.diagnostics).toEqual([]);
    const wasm = artifact.wasm ?? new Uint8Array();
    const instance = new WebAssembly.Instance(new WebAssembly.Module(wasm));
    const allocate = instance.exports.fws_alloc as (size: number) => number;
    const pointer = allocate(3);
    const memory = instance.exports.memory as WebAssembly.Memory;
    new Uint8Array(memory.buffer, pointer, 3).set([97, 98, 99]);
    const returned = (instance.exports.main as (pointer: number, length: number) => readonly [number, number])(
      pointer,
      3,
    );
    expect(returned[1]).toBe(3);
    expect(new TextDecoder().decode(new Uint8Array(memory.buffer, returned[0], returned[1]))).toBe('abc');
    service.dispose();
  });

  it('keeps cross-project dynamic links separate and supports explicit static links', async () => {
    const files = {
      '/workspace/app/main.flint': 'import "../shared/helper.flint" as helper; export fn main() -> i32 { return 1; }',
      '/workspace/shared/helper.flint': 'export fn helper() -> i32 { return 2; }',
    };
    const dynamic = await graphFor(files, {
      projectRoots: ['/workspace/app', '/workspace/shared'],
      crossProjectLinkMode: 'dynamic',
    });
    const dynamicService = createFlintCompilerService();
    const dynamicArtifact = dynamicService.compileGraph({
      graph: dynamic.graph,
      entryFileName: '/workspace/app/main.flint',
      compilerVersion: '0.1.0',
      linkConfiguration: { projectRoots: ['/workspace/app', '/workspace/shared'], crossProjectLinkMode: 'dynamic' },
    });
    expect(dynamicArtifact.diagnostics).toEqual([]);
    expect(dynamicArtifact.manifest?.sourceImports).toEqual([
      expect.objectContaining({
        source: '../shared/helper.flint',
        alias: 'helper',
        resolvedModuleId: 'helper',
        linkMode: 'dynamic',
        exports: [{ name: 'helper', parameters: [], result: 'i32' }],
      }),
    ]);
    expect(dynamicArtifact.declarations).toContain('export interface FlintDynamicModuleLoaders');
    expect(dynamicArtifact.declarations).toContain(
      'readonly helper: () => Promise<FlintDynamicModuleExports["helper"]>;',
    );
    expect(dynamicArtifact.linkedModules).toEqual(['main']);
    dynamicService.dispose();

    const staticResult = await graphFor(files, {
      projectRoots: ['/workspace/app', '/workspace/shared'],
      crossProjectLinkMode: 'static',
    });
    const staticService = createFlintCompilerService();
    const staticArtifact = staticService.compileGraph({
      graph: staticResult.graph,
      entryFileName: '/workspace/app/main.flint',
      compilerVersion: '0.1.0',
      linkConfiguration: { projectRoots: ['/workspace/app', '/workspace/shared'], crossProjectLinkMode: 'static' },
    });
    expect(staticArtifact.diagnostics).toEqual([]);
    expect(staticArtifact.linkedModules).toEqual(['main', 'helper']);
    staticService.dispose();
  });

  it('rejects colliding static exports and invalidates graph dependents', async () => {
    const result = await graphFor(
      {
        '/workspace/app/main.flint':
          'import "./one.flint" as one; import "./two.flint" as two; export fn main() -> i32 { return 1; }',
        '/workspace/app/one.flint': 'export fn duplicate() -> i32 { return 1; }',
        '/workspace/app/two.flint': 'export fn duplicate() -> i64 { return 2; }',
      },
      { projectRoots: ['/workspace/app'] },
    );
    const service = createFlintCompilerService();
    const input = {
      graph: result.graph,
      entryFileName: '/workspace/app/main.flint',
      compilerVersion: '0.1.0',
    } as const;
    const failed = service.compileGraph(input);
    expect(failed.diagnostics.map(({ code }) => code)).toContain('FLINT-LINK-004');
    expect(failed.wasm).toBeUndefined();

    const validResult = await graphFor(
      {
        '/workspace/app/main.flint': 'import "./helper.flint" as helper; export fn main() -> i32 { return 1; }',
        '/workspace/app/helper.flint': 'export fn helper() -> i32 { return 2; }',
      },
      { projectRoots: ['/workspace/app'] },
    );
    const validInput = {
      graph: validResult.graph,
      entryFileName: '/workspace/app/main.flint',
      compilerVersion: '0.1.0',
    } as const;
    service.compileGraph(validInput);
    service.compileGraph(validInput);
    expect(service.report().cacheHits).toBe(1);
    service.invalidate(['/workspace/app/helper.flint']);
    expect(service.report().invalidatedFiles).toContain('/workspace/app/main.flint');
    service.compileGraph(validInput);
    expect(service.report().cacheMisses).toBe(3);
    service.dispose();
  });

  it('records correct optimization profile for link profiles', async () => {
    const files = {
      '/workspace/app/main.flint': 'export fn main() -> i32 { return 1; }',
    };
    const service = createFlintCompilerService();

    const staticResult = await graphFor(files, { projectRoots: ['/workspace/app'], linkProfile: 'static' });
    const staticArtifact = service.compileGraph({
      graph: staticResult.graph,
      entryFileName: '/workspace/app/main.flint',
      compilerVersion: '0.1.0',
      linkConfiguration: { linkProfile: 'static' },
    });
    expect(staticArtifact.manifest?.optimizationProfile).toBe('static-aggressive');

    const dynamicResult = await graphFor(files, { projectRoots: ['/workspace/app'], linkProfile: 'dynamic' });
    const dynamicArtifact = service.compileGraph({
      graph: dynamicResult.graph,
      entryFileName: '/workspace/app/main.flint',
      compilerVersion: '0.1.0',
      linkConfiguration: { linkProfile: 'dynamic' },
    });
    expect(dynamicArtifact.manifest?.optimizationProfile).toBe('dynamic-conservative');

    service.dispose();
  });
});
