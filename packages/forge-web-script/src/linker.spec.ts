import { describe, expect, it } from 'vitest';

import { validateForgeWebScriptLinks } from './linker.ts';

describe('Forge Web Script linker boundary', () => {
  it('rejects dynamic edges within one project', () => {
    const result = validateForgeWebScriptLinks({
      modules: [
        {
          fileName: '/app/a.fws',
          moduleId: 'a',
          projectRoot: '/app',
          source: '',
          contentHash: 'a',
          module: {} as never,
        },
        {
          fileName: '/app/b.fws',
          moduleId: 'b',
          projectRoot: '/app',
          source: '',
          contentHash: 'b',
          module: {} as never,
        },
      ],
      projects: [{ root: '/app', id: 'app' }],
      edges: [
        {
          importer: '/app/a.fws',
          source: './b.fws',
          resolved: '/app/b.fws',
          linkMode: 'dynamic',
          span: { start: 0, end: 1, line: 1, column: 1, endLine: 1, endColumn: 2 },
        },
      ],
    });
    expect(result.diagnostics.map(({ code }) => code)).toEqual(['FWS-LINK-002']);
  });
});
