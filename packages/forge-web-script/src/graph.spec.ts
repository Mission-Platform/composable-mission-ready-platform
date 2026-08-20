import { describe, expect, it } from 'vitest';

import { resolveForgeWebScriptModuleGraph } from './graph.ts';

function resolver(files: Readonly<Record<string, string>>) {
  return {
    resolve: (source: string, importer: string) => {
      if (source.startsWith('./')) return `${importer.slice(0, importer.lastIndexOf('/'))}/${source.slice(2)}`;
      return;
    },
    load: (fileName: string) => files[fileName] ?? '',
  };
}

describe('Forge Web Script module graph', () => {
  it('resolves same-project dependencies with static links', async () => {
    const result = await resolveForgeWebScriptModuleGraph(
      ['/workspace/app/main.fws'],
      resolver({
        '/workspace/app/main.fws': 'import "./helper.fws" as helper; export fn main() -> i32 { return 1; }',
        '/workspace/app/helper.fws': 'export fn helper() -> i32 { return 2; }',
      }),
      { projectRoots: ['/workspace/app'] },
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.graph.modules.map(({ moduleId }) => moduleId)).toEqual(['main', 'helper']);
    expect(result.graph.edges[0]).toMatchObject({ linkMode: 'static', source: './helper.fws' });
  });

  it('reports missing modules and supports dynamic cross-project links', async () => {
    const result = await resolveForgeWebScriptModuleGraph(
      ['/workspace/app/main.fws'],
      resolver({
        '/workspace/app/main.fws': 'import "../../shared/helper.fws" as helper; export fn main() -> i32 { return 1; }',
      }),
      { projectRoots: ['/workspace/app', '/workspace/shared'], crossProjectLinkMode: 'dynamic' },
    );
    expect(result.diagnostics.map(({ code }) => code)).toContain('FWS-GRAPH-002');
  });

  it('reports static source cycles', async () => {
    const result = await resolveForgeWebScriptModuleGraph(
      ['/workspace/app/a.fws'],
      resolver({
        '/workspace/app/a.fws': 'import "./b.fws" as b; export fn a() -> i32 { return 1; }',
        '/workspace/app/b.fws': 'import "./a.fws" as a; export fn b() -> i32 { return 2; }',
      }),
      { projectRoots: ['/workspace/app'] },
    );
    expect(result.diagnostics.map(({ code }) => code)).toContain('FWS-LINK-001');
  });
});
