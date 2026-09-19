import { describe, expect, it } from 'vitest';

import { resolveFlintModuleGraph } from './graph.ts';
import { resolveFlintImportTypeEnvironment } from './module-types.ts';

function resolver(files: Readonly<Record<string, string>>) {
  return {
    resolve: (source: string, importer: string) => {
      if (source.startsWith('./')) return `${importer.slice(0, importer.lastIndexOf('/'))}/${source.slice(2)}`;
      if (source.startsWith('../../')) {
        const target = `/workspace/shared/${source.slice('../../shared/'.length)}`;
        return files[target] === undefined ? undefined : target;
      }
      return;
    },
    load: (fileName: string) => files[fileName] ?? '',
  };
}

describe('Forge Web Script module graph', () => {
  it('resolves same-project dependencies with static links', async () => {
    const result = await resolveFlintModuleGraph(
      ['/workspace/app/main.flint'],
      resolver({
        '/workspace/app/main.flint': 'import "./helper.flint" as helper; export fn main() -> i32 { return 1; }',
        '/workspace/app/helper.flint': 'export fn helper() -> i32 { return 2; }',
      }),
      { projectRoots: ['/workspace/app'] },
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.graph.modules.map(({ moduleId }) => moduleId)).toEqual(['main', 'helper']);
    expect(result.graph.edges[0]).toMatchObject({ linkMode: 'static', source: './helper.flint' });
  });

  it('resolves only exported imported functions with alias-qualified names', async () => {
    const result = await resolveFlintModuleGraph(
      ['/workspace/app/main.flint'],
      resolver({
        '/workspace/app/main.flint': 'import "./helper.flint" as helper; export fn main() -> i32 { return 1; }',
        '/workspace/app/helper.flint':
          'export fn run(value: i32) -> i32 { return value; } fn hidden(value: i64) -> i64 { return value; }',
      }),
      { projectRoots: ['/workspace/app'] },
    );
    const importer = result.graph.modules.find(({ fileName }) => fileName === '/workspace/app/main.flint');

    expect(result.diagnostics).toEqual([]);
    expect(importer).toBeDefined();
    const environment = resolveFlintImportTypeEnvironment(importer!, result.graph);
    expect(environment.externalFunctions.map(({ name }) => name)).toEqual(['run', 'helper.run']);
    expect(environment.externalFunctions[0]).toMatchObject({
      parameters: [{ type: { name: 'i32' } }],
      result: { name: 'i32' },
    });
    expect(environment.externalFunctions.some(({ name }) => name.includes('hidden'))).toBe(false);
  });

  it('reports missing modules and supports dynamic cross-project links', async () => {
    const result = await resolveFlintModuleGraph(
      ['/workspace/app/main.flint'],
      resolver({
        '/workspace/app/main.flint':
          'import "../../shared/missing.flint" as helper; export fn main() -> i32 { return 1; }',
      }),
      { projectRoots: ['/workspace/app', '/workspace/shared'], crossProjectLinkMode: 'dynamic' },
    );
    expect(result.diagnostics.map(({ code }) => code)).toContain('FLINT-GRAPH-002');
  });

  it('selects an explicit static or dynamic cross-project profile', async () => {
    const files = {
      '/workspace/app/main.flint':
        'import "../../shared/helper.flint" as helper; export fn main() -> i32 { return 1; }',
      '/workspace/shared/helper.flint': 'export fn helper() -> i32 { return 2; }',
    };
    const staticResult = await resolveFlintModuleGraph(['/workspace/app/main.flint'], resolver(files), {
      projectRoots: ['/workspace/app', '/workspace/shared'],
      linkProfile: 'static',
    });
    const dynamicResult = await resolveFlintModuleGraph(['/workspace/app/main.flint'], resolver(files), {
      projectRoots: ['/workspace/app', '/workspace/shared'],
      linkProfile: 'dynamic',
    });
    expect(staticResult.graph.edges[0]?.linkMode).toBe('static');
    expect(dynamicResult.graph.edges[0]?.linkMode).toBe('dynamic');
  });

  it('reports static source cycles', async () => {
    const result = await resolveFlintModuleGraph(
      ['/workspace/app/a.flint'],
      resolver({
        '/workspace/app/a.flint': 'import "./b.flint" as b; export fn a() -> i32 { return 1; }',
        '/workspace/app/b.flint': 'import "./a.flint" as a; export fn b() -> i32 { return 2; }',
      }),
      { projectRoots: ['/workspace/app'] },
    );
    expect(result.diagnostics.map(({ code }) => code)).toContain('FLINT-LINK-001');
  });
});
