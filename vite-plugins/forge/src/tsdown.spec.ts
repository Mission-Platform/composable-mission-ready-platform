import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { defineTsdownForgeComponents, defineTsdownForgeEmailComponents } from './tsdown';

import type { FrameworkOutputPlugin } from '@mission-platform/forge-plugin-api';
import type { UserConfig } from 'tsdown';

function fixtureFramework(id: string): FrameworkOutputPlugin {
  return {
    id,
    outputLanguage: 'ts',
    source: {
      componentExtension: '.ts',
      componentImportExtension: '',
      composableExtension: '.ts',
      entryExtension: '.ts',
      componentExport: 'named',
    },
    lower(ir, context) {
      return { framework: context.framework, module: ir, context };
    },
    optimize(intentions) {
      return intentions;
    },
    generate() {
      return { code: 'export const fixture = true;', lang: 'ts' };
    },
    build: {
      vite: () => [],
      tsdown: () => [],
    },
  };
}

describe('Forge tsdown component helpers', () => {
  it('keeps generic framework builds separate from the email build', () => {
    const componentsRootDir = path.resolve(import.meta.dirname, '../../../packages/components');
    const componentsModule = path.resolve(componentsRootDir, 'src/components/index.ts');
    const genericConfigs = defineTsdownForgeComponents({
      rootDir: componentsRootDir,
      frameworks: ['vue', 'react', 'astro', 'solid', 'svelte', 'web-components'].map((id) => fixtureFramework(id)),
      componentsModule,
      name: 'MissionPlatformEmailComponents',
    });
    const emailRootDir = path.resolve('/tmp', 'mission-platform-email-components');
    const emailConfig = defineTsdownForgeEmailComponents({
      rootDir: emailRootDir,
      componentsModule,
      name: 'MissionPlatformEmailComponents',
    });

    expect(genericConfigs).toHaveLength(6);
    expect(emailConfig.outDir).toBe(path.resolve(emailRootDir, 'dist/email'));
    expect(emailConfig.clean).toBe(false);
    expect(emailConfig.entry).toEqual({ index: componentsModule });
  }, 30_000);

  it('accepts framework output plugins as independent builds', () => {
    const rootDir = path.resolve('/tmp', 'mission-platform-plugin-components');
    const componentsRootDir = path.resolve(import.meta.dirname, '../../../packages/components');
    const configs = defineTsdownForgeComponents({
      rootDir,
      componentsModule: path.resolve(componentsRootDir, 'src/components/index.ts'),
      frameworks: [fixtureFramework('vue'), fixtureFramework('react')],
    });

    expect(Array.isArray(configs)).toBe(true);
    expect((configs as UserConfig[]).map((config) => config.outDir)).toEqual([
      path.resolve(rootDir, 'dist/vue'),
      path.resolve(rootDir, 'dist/react'),
    ]);
    expect(JSON.stringify(configs)).not.toContain('baseUrl');
  }, 30_000);
});
