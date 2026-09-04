import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createFileGraph } from './file-graph';

describe('createFileGraph', () => {
  it('classifies nodes and follows import/export edges without filename conventions', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'forge-file-graph-'));
    const sourceRoot = path.join(root, 'src');
    const entry = path.join(sourceRoot, 'entry.ts');
    try {
      mkdirSync(path.join(sourceRoot, 'ui', 'card'), { recursive: true });
      mkdirSync(path.join(sourceRoot, 'shared'), { recursive: true });
      writeFileSync(
        entry,
        "export { ForgeCard } from './ui/card/view';\nexport { useCard } from '@/shared/use-card';\n",
      );
      writeFileSync(
        path.join(sourceRoot, 'ui', 'card', 'view.tsx'),
        "import { useCard } from '@/shared/use-card';\nimport './card.scss';\nexport function ForgeCard() { return null; }\n",
      );
      writeFileSync(path.join(sourceRoot, 'ui', 'card', 'card.scss'), '.card {}');
      writeFileSync(
        path.join(sourceRoot, 'shared', 'use-card.ts'),
        "import { useState } from '@mission-platform/forge-jsx';\nexport function useCard() { return useState(false); }\n",
      );

      const graph = createFileGraph({
        entryFile: entry,
        sourceRoot,
        componentSpecifiers: ['./ui/card/view'],
      });

      expect(graph.node(path.join(sourceRoot, 'ui', 'card', 'view.tsx'))?.kind).toBe('component');
      expect(graph.node(path.join(sourceRoot, 'shared', 'use-card.ts'))?.kind).toBe('composable');
      expect(graph.node(path.join(sourceRoot, 'ui', 'card', 'card.scss'))?.kind).toBe('style');
      expect(graph.nodes.some((node) => node.kind === 'folder' && node.relativePath === 'ui/card')).toBe(true);
      expect(graph.edges).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ specifier: './ui/card/view', kind: 'export' }),
          expect.objectContaining({ specifier: '@/shared/use-card', kind: 'import' }),
          expect.objectContaining({ specifier: './card.scss', kind: 'import' }),
        ]),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
