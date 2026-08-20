import { describe, expect, it } from 'vitest';

import { createForgeWebScriptCompilerService } from './compiler.ts';
import { resolveForgeWebScriptModuleGraph } from './graph.ts';

function resolver(files: Readonly<Record<string, string>>) {
  return {
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

async function graphFor(
  files: Readonly<Record<string, string>>,
  configuration: Parameters<typeof resolveForgeWebScriptModuleGraph>[2],
) {
  return resolveForgeWebScriptModuleGraph(['/workspace/app/main.fws'], resolver(files), configuration);
}

describe('Forge Web Script graph compiler service', () => {
  it('statically merges same-project modules and records graph metadata', async () => {
    const result = await graphFor(
      {
        '/workspace/app/main.fws': 'import "./helper.fws" as helper; export fn main() -> i32 { return 1; }',
        '/workspace/app/helper.fws': 'export fn helper() -> i32 { return 2; }',
      },
      { projectRoots: ['/workspace/app'] },
    );
    const service = createForgeWebScriptCompilerService();
    const artifact = service.compileGraph({
      graph: result.graph,
      entryFileName: '/workspace/app/main.fws',
      compilerVersion: '0.1.0',
    });

    expect(result.diagnostics).toEqual([]);
    expect(artifact.diagnostics).toEqual([]);
    expect(WebAssembly.Module.exports(new WebAssembly.Module(artifact.wasm!)).map(({ name }) => name)).toEqual([
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

  it('executes calls to qualified exports from a statically linked module', async () => {
    const result = await graphFor(
      {
        '/workspace/app/main.fws':
          'import "./helper.fws" as helper; export fn main() -> i32 { return helper.increment(41); }',
        '/workspace/app/helper.fws': 'export fn increment(value: i32) -> i32 { return value + 1; }',
      },
      { projectRoots: ['/workspace/app'] },
    );
    const service = createForgeWebScriptCompilerService();
    const artifact = service.compileGraph({
      graph: result.graph,
      entryFileName: '/workspace/app/main.fws',
      compilerVersion: '0.1.0',
    });

    expect(result.diagnostics).toEqual([]);
    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.manifest?.exports).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'main', parameters: [], result: 'i32' })]),
    );
    const instance = new WebAssembly.Instance(new WebAssembly.Module(artifact.wasm!));
    expect((instance.exports.main as () => number)()).toBe(42);
    service.dispose();
  });

  it('keeps cross-project dynamic links separate and supports explicit static links', async () => {
    const files = {
      '/workspace/app/main.fws': 'import "../shared/helper.fws" as helper; export fn main() -> i32 { return 1; }',
      '/workspace/shared/helper.fws': 'export fn helper() -> i32 { return 2; }',
    };
    const dynamic = await graphFor(files, {
      projectRoots: ['/workspace/app', '/workspace/shared'],
      crossProjectLinkMode: 'dynamic',
    });
    const dynamicService = createForgeWebScriptCompilerService();
    const dynamicArtifact = dynamicService.compileGraph({
      graph: dynamic.graph,
      entryFileName: '/workspace/app/main.fws',
      compilerVersion: '0.1.0',
      linkConfiguration: { projectRoots: ['/workspace/app', '/workspace/shared'], crossProjectLinkMode: 'dynamic' },
    });
    expect(dynamicArtifact.diagnostics).toEqual([]);
    expect(dynamicArtifact.manifest?.sourceImports).toEqual([
      expect.objectContaining({
        source: '../shared/helper.fws',
        alias: 'helper',
        resolvedModuleId: 'helper',
        linkMode: 'dynamic',
        exports: [{ name: 'helper', parameters: [], result: 'i32' }],
      }),
    ]);
    expect(dynamicArtifact.declarations).toContain('export interface ForgeWebScriptDynamicModuleLoaders');
    expect(dynamicArtifact.declarations).toContain(
      'readonly helper: () => Promise<ForgeWebScriptDynamicModuleExports["helper"]>;',
    );
    expect(dynamicArtifact.linkedModules).toEqual(['main']);
    dynamicService.dispose();

    const staticResult = await graphFor(files, {
      projectRoots: ['/workspace/app', '/workspace/shared'],
      crossProjectLinkMode: 'static',
    });
    const staticService = createForgeWebScriptCompilerService();
    const staticArtifact = staticService.compileGraph({
      graph: staticResult.graph,
      entryFileName: '/workspace/app/main.fws',
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
        '/workspace/app/main.fws':
          'import "./one.fws" as one; import "./two.fws" as two; export fn main() -> i32 { return 1; }',
        '/workspace/app/one.fws': 'export fn duplicate() -> i32 { return 1; }',
        '/workspace/app/two.fws': 'export fn duplicate() -> i64 { return 2; }',
      },
      { projectRoots: ['/workspace/app'] },
    );
    const service = createForgeWebScriptCompilerService();
    const input = { graph: result.graph, entryFileName: '/workspace/app/main.fws', compilerVersion: '0.1.0' } as const;
    const failed = service.compileGraph(input);
    expect(failed.diagnostics.map(({ code }) => code)).toContain('FWS-LINK-004');
    expect(failed.wasm).toBeUndefined();

    const validResult = await graphFor(
      {
        '/workspace/app/main.fws': 'import "./helper.fws" as helper; export fn main() -> i32 { return 1; }',
        '/workspace/app/helper.fws': 'export fn helper() -> i32 { return 2; }',
      },
      { projectRoots: ['/workspace/app'] },
    );
    const validInput = {
      graph: validResult.graph,
      entryFileName: '/workspace/app/main.fws',
      compilerVersion: '0.1.0',
    } as const;
    service.compileGraph(validInput);
    service.compileGraph(validInput);
    expect(service.report().cacheHits).toBe(1);
    service.invalidate(['/workspace/app/helper.fws']);
    expect(service.report().invalidatedFiles).toContain('/workspace/app/main.fws');
    service.compileGraph(validInput);
    expect(service.report().cacheMisses).toBe(3);
    service.dispose();
  });
});
