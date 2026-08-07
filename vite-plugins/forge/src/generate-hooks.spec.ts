import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { generateHookLibrarySources } from './generate-hooks';

describe('generateHookLibrarySources', () => {
  it('mirrors directory composables and keeps their index files in the cache', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'forge-hooks-'));
    const sourceDirectory = path.join(root, 'src');
    const composableDirectory = path.join(sourceDirectory, 'composables', 'use-example');
    const outputDirectory = path.join(root, 'cache');
    mkdirSync(composableDirectory, { recursive: true });
    writeFileSync(path.join(sourceDirectory, 'index.ts'), "export * from './composables';\n");
    writeFileSync(
      path.join(sourceDirectory, 'composables', 'index.ts'),
      ["export { useExample } from './use-example';", "export type { ExampleControls } from './use-example';", ''].join(
        '\n',
      ),
    );
    writeFileSync(path.join(composableDirectory, 'index.ts'), "export { useExample } from './use-example';\n");
    writeFileSync(
      path.join(composableDirectory, 'use-example.ts'),
      [
        "import { useEffect, useState } from '@mission-platform/forge';",
        '',
        'export interface ExampleControls {',
        '  value: number;',
        '}',
        '',
        'export function useExample(): number {',
        '  useEffect(() => undefined, []);',
        '  return useState(1);',
        '}',
        '',
      ].join('\n'),
    );

    try {
      generateHookLibrarySources({
        framework: 'vue',
        entryModule: path.join(sourceDirectory, 'index.ts'),
        outDir: outputDirectory,
      });

      expect(existsSync(path.join(outputDirectory, 'composables/use-example/index.ts'))).toBe(true);
      expect(existsSync(path.join(outputDirectory, 'composables/use-example/use-example.ts'))).toBe(true);
      expect(readFileSync(path.join(outputDirectory, 'index.ts'), 'utf8')).toContain(
        "from './composables/use-example';",
      );
      expect(readFileSync(path.join(outputDirectory, 'index.ts'), 'utf8')).toContain('type ExampleControls');
      expect(readFileSync(path.join(outputDirectory, 'composables/use-example/use-example.ts'), 'utf8')).toContain(
        "from '../../mp-effect';",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
