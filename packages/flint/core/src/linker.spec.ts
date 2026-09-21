import { describe, expect, it } from 'vitest';

import { validateFlintLinks } from './linker.ts';

describe('Forge Web Script linker boundary', () => {
  it('rejects dynamic edges within one project', () => {
    const result = validateFlintLinks({
      modules: [
        {
          fileName: '/app/a.flint',
          moduleId: 'a',
          projectRoot: '/app',
          source: '',
          contentHash: 'a',
          module: {} as never,
        },
        {
          fileName: '/app/b.flint',
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
          importer: '/app/a.flint',
          source: './b.flint',
          resolved: '/app/b.flint',
          linkMode: 'dynamic',
          span: { start: 0, end: 1, line: 1, column: 1, endLine: 1, endColumn: 2 },
        },
      ],
    });
    expect(result.diagnostics.map(({ code }) => code)).toEqual(['FLINT-LINK-002']);
  });
});
