import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { forgeVueFramework } from '../../../../compiler/plugins/forge-vue/src';

import { createForgeCompilerService } from './compiler/service';
import { generateHookLibrarySources } from './generate-hooks';

describe('generateHookLibrarySources', () => {
  it('keeps warm hook artifacts stable while sharing neutral analysis', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'forge-hooks-warm-'));
    const sourceDirectory = path.join(root, 'src');
    const outputDirectory = path.join(root, 'cache');
    const service = createForgeCompilerService();
    mkdirSync(path.join(sourceDirectory, 'composables'), { recursive: true });
    writeFileSync(path.join(sourceDirectory, 'index.ts'), "export { useExample } from './composables/use-example';\n");
    writeFileSync(
      path.join(sourceDirectory, 'composables/use-example.ts'),
      "import { useState } from '@mission-platform/forge-jsx';\nexport function useExample(): number { return useState(1); }\n",
    );
    try {
      const options = {
        plugin: forgeVueFramework(),
        entryModule: path.join(sourceDirectory, 'index.ts'),
        outDir: outputDirectory,
        service,
      };
      generateHookLibrarySources(options);
      const hookPath = path.join(outputDirectory, 'composables/use-example.ts');
      const firstMtime = statSync(hookPath).mtimeMs;
      generateHookLibrarySources(options);
      expect(statSync(hookPath).mtimeMs).toBe(firstMtime);
      expect(service.report().cache.semanticHits).toBeGreaterThan(0);
      expect(
        JSON.parse(readFileSync(path.join(outputDirectory, '.forge-artifact-manifest.json'), 'utf8')),
      ).toMatchObject({
        targetId: 'vue',
        complete: true,
      });
    } finally {
      service.dispose();
      rmSync(root, { recursive: true, force: true });
    }
  });
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
        "import { useEffect, useState } from '@mission-platform/forge-jsx';",
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
        plugin: forgeVueFramework(),
        entryModule: path.join(sourceDirectory, 'index.ts'),
        outDir: outputDirectory,
      });

      expect(existsSync(path.join(outputDirectory, 'composables/use-example/index.ts'))).toBe(true);
      expect(existsSync(path.join(outputDirectory, 'composables/use-example/use-example.ts'))).toBe(true);
      expect(readFileSync(path.join(outputDirectory, 'index.ts'), 'utf8')).toContain(
        "from './composables/use-example';",
      );
      expect(readFileSync(path.join(outputDirectory, 'index.ts'), 'utf8')).toContain('type ExampleControls');
      expect(readFileSync(path.join(outputDirectory, 'composables/use-example/use-example.ts'), 'utf8')).not.toContain(
        'mp-effect',
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('follows multiline alias and type-only exports through graph aliases', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'forge-hooks-alias-'));
    const sourceDirectory = path.join(root, 'src');
    const outputDirectory = path.join(root, 'cache');
    mkdirSync(path.join(sourceDirectory, 'hooks'), { recursive: true });
    writeFileSync(
      path.join(sourceDirectory, 'index.ts'),
      "export {\n  useExample as useRenamed,\n  type ExampleControls as Controls,\n} from '@/hooks/use-example';\n",
    );
    writeFileSync(
      path.join(sourceDirectory, 'hooks/use-example.ts'),
      'export interface ExampleControls { value: number; }\nexport function useExample(): number { return 1; }\n',
    );

    try {
      generateHookLibrarySources({
        plugin: forgeVueFramework(),
        entryModule: path.join(sourceDirectory, 'index.ts'),
        outDir: outputDirectory,
        sourceRoot: sourceDirectory,
      });

      expect(readFileSync(path.join(outputDirectory, 'index.ts'), 'utf8')).toContain(
        'useExample as useRenamed, type ExampleControls as Controls',
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
