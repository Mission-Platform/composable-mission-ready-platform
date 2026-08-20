import fs from 'node:fs';
import path from 'node:path';

import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import { describe, expect, it } from 'vitest';

import { defineTsdownForgeComponents, defineTsdownForgeEmailComponents, defineTsdownForgeHooksAll } from './tsdown';

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
      rejectFixturePlaceholder: false,
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
      rejectFixturePlaceholder: false,
    });

    expect(Array.isArray(configs)).toBe(true);
    expect((configs as UserConfig[]).map((config) => config.outDir)).toEqual([
      path.resolve(rootDir, 'dist/vue'),
      path.resolve(rootDir, 'dist/react'),
    ]);
    expect(JSON.stringify(configs)).not.toContain('baseUrl');
  }, 30_000);

  it('writes framework output below an isolated stage root when requested', () => {
    const rootDir = path.resolve('/tmp', 'mission-platform-staged-components');
    const stageRoot = path.resolve(rootDir, 'node_modules/.cache/forge-build/test');
    const componentsRootDir = path.resolve(import.meta.dirname, '../../../packages/components');
    const configs = defineTsdownForgeComponents({
      rootDir,
      outputRoot: stageRoot,
      componentsModule: path.resolve(componentsRootDir, 'src/components/index.ts'),
      frameworks: [fixtureFramework('vue'), fixtureFramework('react')],
      rejectFixturePlaceholder: false,
    });

    expect((configs as UserConfig[]).map((config) => config.outDir)).toEqual([
      path.resolve(stageRoot, 'dist/vue'),
      path.resolve(stageRoot, 'dist/react'),
    ]);
    expect((configs as UserConfig[]).every((config) => config.clean === true)).toBe(true);
  }, 30_000);

  it('stages neutral hook output alongside framework output', () => {
    const rootDir = path.resolve(import.meta.dirname, '../../../packages/components');
    const stageRoot = path.resolve(rootDir, 'node_modules/.cache/forge-build/test');
    const configs = defineTsdownForgeHooksAll({
      rootDir,
      outputRoot: stageRoot,
      frameworks: [fixtureFramework('react')],
      rejectFixturePlaceholder: false,
    });

    expect((configs as UserConfig[]).map((config) => config.outDir)).toEqual([
      path.resolve(stageRoot, 'dist'),
      path.resolve(stageRoot, 'dist/react'),
    ]);
  }, 30_000);

  it('stages multi-neutral outDirs and declaration emit away from package dist', () => {
    const rootDir = path.resolve('/tmp', 'mission-platform-multi-neutral');
    const stageRoot = path.resolve(rootDir, 'node_modules/.cache/forge-build/test');
    // Seed a package-local build tsconfig so staged resolution has something to extend.
    fs.mkdirSync(rootDir, { recursive: true });
    fs.writeFileSync(
      path.join(rootDir, 'tsconfig.build.json'),
      JSON.stringify({
        compilerOptions: {
          declaration: true,
          declarationDir: './dist',
          tsBuildInfoFile: './node_modules/.tmp/tsconfig.build.tsbuildinfo',
        },
        include: ['src'],
      }),
    );

    const components = defineTsdownLibrary({
      rootDir,
      entry: 'src/components/index.ts',
      outputRoot: stageRoot,
      overrides: {
        outDir: path.resolve(rootDir, 'dist/components'),
      },
    });
    const sprite = defineTsdownLibrary({
      rootDir,
      entry: 'src/sprite/asset.ts',
      outputRoot: stageRoot,
      clean: false,
      overrides: {
        outDir: path.resolve(rootDir, 'dist/sprite'),
      },
    });

    expect(components.outDir).toBe(path.resolve(stageRoot, 'dist/components'));
    expect(sprite.outDir).toBe(path.resolve(stageRoot, 'dist/sprite'));
    expect(components.outDir).not.toBe(path.resolve(rootDir, 'dist/components'));
    expect(sprite.outDir).not.toBe(path.resolve(rootDir, 'dist/sprite'));
    expect(components.tsconfig).toBe(path.join(stageRoot, 'tsconfig.forge-stage.json'));
    expect(sprite.tsconfig).toBe(path.join(stageRoot, 'tsconfig.forge-stage.json'));

    for (const config of [components, sprite]) {
      expect(config.dts).toMatchObject({
        build: true,
        newContext: true,
        incremental: false,
        compilerOptions: {
          declarationDir: path.resolve(stageRoot, 'dist'),
          incremental: false,
          tsBuildInfoFile: path.join(stageRoot, 'tsconfig.build.tsbuildinfo'),
        },
      });
    }

    const stagedTsconfig = JSON.parse(fs.readFileSync(path.join(stageRoot, 'tsconfig.forge-stage.json'), 'utf8')) as {
      extends: string;
      compilerOptions: { declarationDir: string; tsBuildInfoFile: string };
    };
    expect(stagedTsconfig.compilerOptions.declarationDir).toBe(path.resolve(stageRoot, 'dist'));
    expect(stagedTsconfig.compilerOptions.tsBuildInfoFile).toBe(path.join(stageRoot, 'tsconfig.build.tsbuildinfo'));
  }, 30_000);
});
