import fs from 'node:fs';
import path from 'node:path';

import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import { describe, expect, it } from 'vitest';

import {
  defineTsdownForgeComponentsAll,
  defineTsdownForgeEmailComponents,
  defineTsdownForgeHooksAll,
  tsdownForgeComponentPlugins,
} from './tsdown';

import type { FrameworkOutputPlugin } from '@mission-platform/forge-plugin-api';
import type { TsdownPlugin, UserConfig } from 'tsdown';

type ForgeTsdownPlugin = TsdownPlugin & {
  tsdownConfig?: (config: UserConfig) => void | Promise<void>;
};

async function materializeConfig(plugin: TsdownPlugin): Promise<UserConfig> {
  const config = {} as UserConfig;
  await (plugin as ForgeTsdownPlugin).tsdownConfig?.(config);
  return config;
}

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
      return {
        framework: context.framework,
        module: ir,
        context,
        lowered: { framework: context.framework, appliedOptimizations: [] },
      };
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
    const componentsRootDir = path.resolve(import.meta.dirname, '../../../../ui/components');
    const componentsModule = path.resolve(componentsRootDir, 'src/components/index.ts');
    const genericConfigs = tsdownForgeComponentPlugins({
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

  it('accepts framework output plugins as independent builds', async () => {
    const rootDir = path.resolve('/tmp', 'mission-platform-plugin-components');
    const componentsRootDir = path.resolve(import.meta.dirname, '../../../../ui/components');
    const configs = tsdownForgeComponentPlugins({
      rootDir,
      componentsModule: path.resolve(componentsRootDir, 'src/components/index.ts'),
      frameworks: [fixtureFramework('vue'), fixtureFramework('react')],
      rejectFixturePlaceholder: false,
    });

    expect(Array.isArray(configs)).toBe(true);
    const materialized = await Promise.all(configs.map((plugin) => materializeConfig(plugin)));
    expect(materialized.map((config) => config.outDir)).toEqual([
      expect.stringMatching(`${path.resolve(rootDir, 'dist')}/.forge-attempt-vue-vue-`),
      expect.stringMatching(`${path.resolve(rootDir, 'dist')}/.forge-attempt-react-react-`),
    ]);
    expect(JSON.stringify(materialized)).not.toContain('baseUrl');
  }, 30_000);

  it('skips component configs for the explicit neutral-only target', () => {
    const originalTarget = process.env.FORGE_FRAMEWORK_TARGET;
    process.env.FORGE_FRAMEWORK_TARGET = 'none';

    try {
      const options = {
        rootDir: path.resolve('/tmp', 'mission-platform-neutral-only'),
        frameworks: [fixtureFramework('vue')],
        rejectFixturePlaceholder: false,
      };

      expect(tsdownForgeComponentPlugins(options)).toEqual([]);
      expect(defineTsdownForgeComponentsAll(options)).toEqual([]);
    } finally {
      if (originalTarget === undefined) {
        delete process.env.FORGE_FRAMEWORK_TARGET;
      } else {
        process.env.FORGE_FRAMEWORK_TARGET = originalTarget;
      }
    }
  });

  it('discovers the package public entry lazily while preserving component-only fallback', async () => {
    const rootDir = fs.mkdtempSync(path.join('/tmp', 'mission-platform-public-entry-'));
    const componentsDir = path.join(rootDir, 'src', 'components');
    const helperDir = path.join(rootDir, 'src', 'helpers');
    const componentModule = path.join(componentsDir, 'index.ts');

    try {
      fs.mkdirSync(path.join(componentsDir, 'forge-card'), { recursive: true });
      fs.mkdirSync(helperDir, { recursive: true });
      fs.writeFileSync(componentModule, "export { ForgeCard } from './forge-card';\n");
      fs.writeFileSync(path.join(componentsDir, 'forge-card', 'forge-card.tsx'), 'export function ForgeCard() {}\n');
      fs.writeFileSync(
        path.join(rootDir, 'src', 'index.ts'),
        "export * from './components';\nexport * from './helpers/store';\n",
      );
      fs.writeFileSync(path.join(helperDir, 'store.ts'), 'export const publicStore = true;\n');

      const [plugin] = tsdownForgeComponentPlugins({
        rootDir,
        frameworks: [fixtureFramework('vue')],
        componentsModule: componentModule,
        rejectFixturePlaceholder: false,
      });
      const config = await materializeConfig(plugin);
      expect(fs.existsSync(config.entry as string)).toBe(false);
      const forgePlugin = (config.plugins as unknown[]).find(
        (plugin) =>
          typeof plugin === 'object' && plugin !== null && 'name' in plugin && String(plugin.name).includes(':build-'),
      ) as { buildStart?: () => Promise<void>; resolveId?: (source: string) => Promise<string | undefined> };
      await forgePlugin.buildStart?.();
      const generatedEntry = fs.readFileSync((await forgePlugin.resolveId?.(config.entry as string)) as string, 'utf8');
      expect(generatedEntry).toContain('publicStore');
      expect(generatedEntry).toContain('ForgeCard');

      const componentOnlyRootDir = fs.mkdtempSync(path.join('/tmp', 'mission-platform-component-only-'));
      const componentOnlyModule = path.join(componentOnlyRootDir, 'src', 'components', 'index.ts');
      fs.mkdirSync(path.dirname(componentOnlyModule), { recursive: true });
      fs.mkdirSync(path.join(path.dirname(componentOnlyModule), 'forge-only'), { recursive: true });
      fs.writeFileSync(componentOnlyModule, "export { ForgeOnly } from './forge-only';\n");
      fs.writeFileSync(
        path.join(path.dirname(componentOnlyModule), 'forge-only', 'forge-only.tsx'),
        'export function ForgeOnly() {}\n',
      );
      try {
        const [componentOnlyPlugin] = tsdownForgeComponentPlugins({
          rootDir: componentOnlyRootDir,
          frameworks: [fixtureFramework('react')],
          componentsModule: componentOnlyModule,
          rejectFixturePlaceholder: false,
        });
        const componentOnlyConfig = await materializeConfig(componentOnlyPlugin);
        const componentBuildPlugin = (componentOnlyConfig.plugins as unknown[]).find(
          (plugin) =>
            typeof plugin === 'object' &&
            plugin !== null &&
            'name' in plugin &&
            String(plugin.name).includes(':build-'),
        ) as { buildStart?: () => Promise<void>; resolveId?: (source: string) => Promise<string | undefined> };
        await (componentBuildPlugin as { buildStart?: () => Promise<void> }).buildStart?.();
        expect(
          fs.readFileSync(
            (await (
              componentBuildPlugin as { resolveId?: (source: string) => Promise<string | undefined> }
            ).resolveId?.(componentOnlyConfig.entry as string)) as string,
            'utf8',
          ),
        ).toContain('ForgeOnly');
      } finally {
        fs.rmSync(componentOnlyRootDir, { recursive: true, force: true });
      }
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  }, 30_000);

  it('uses an explicit public-entry override instead of the package root entry lazily', async () => {
    const rootDir = fs.mkdtempSync(path.join('/tmp', 'mission-platform-public-entry-override-'));
    const componentsDir = path.join(rootDir, 'src', 'components');
    const helperDir = path.join(rootDir, 'src', 'helpers');
    const componentModule = path.join(componentsDir, 'index.ts');
    const overrideModule = path.join(rootDir, 'src', 'public.ts');

    try {
      fs.mkdirSync(path.join(componentsDir, 'forge-card'), { recursive: true });
      fs.mkdirSync(helperDir, { recursive: true });
      fs.writeFileSync(componentModule, "export { ForgeCard } from './forge-card';\n");
      fs.writeFileSync(path.join(componentsDir, 'forge-card', 'forge-card.tsx'), 'export function ForgeCard() {}\n');
      fs.writeFileSync(path.join(rootDir, 'src', 'index.ts'), "export * from './helpers/default-store';\n");
      fs.writeFileSync(overrideModule, "export * from './helpers/override-store';\n");
      fs.writeFileSync(path.join(helperDir, 'default-store.ts'), 'export const defaultStore = true;\n');
      fs.writeFileSync(path.join(helperDir, 'override-store.ts'), 'export const overrideStore = true;\n');

      const [plugin] = tsdownForgeComponentPlugins({
        rootDir,
        frameworks: [fixtureFramework('solid')],
        componentsModule: componentModule,
        publicEntryModule: overrideModule,
        rejectFixturePlaceholder: false,
      });
      const config = await materializeConfig(plugin);
      expect(fs.existsSync(config.entry as string)).toBe(false);
      const forgePlugin = (config.plugins as unknown[]).find(
        (plugin) =>
          typeof plugin === 'object' && plugin !== null && 'name' in plugin && String(plugin.name).includes(':build-'),
      ) as { buildStart?: () => Promise<void>; resolveId?: (source: string) => Promise<string | undefined> };
      await forgePlugin.buildStart?.();
      const generatedEntry = fs.readFileSync((await forgePlugin.resolveId?.(config.entry as string)) as string, 'utf8');
      expect(generatedEntry).toContain('overrideStore');
      expect(generatedEntry).not.toContain('defaultStore');
      expect(generatedEntry).toContain('ForgeCard');
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  }, 30_000);

  it('writes framework output below an isolated stage root when requested', async () => {
    const rootDir = path.resolve('/tmp', 'mission-platform-staged-components');
    const stageRoot = path.resolve(rootDir, 'node_modules/.cache/forge-build/test');
    const componentsRootDir = path.resolve(import.meta.dirname, '../../../../ui/components');
    const configs = tsdownForgeComponentPlugins({
      rootDir,
      outputRoot: stageRoot,
      componentsModule: path.resolve(componentsRootDir, 'src/components/index.ts'),
      frameworks: [fixtureFramework('vue'), fixtureFramework('react')],
      rejectFixturePlaceholder: false,
    });

    const materialized = await Promise.all(configs.map((plugin) => materializeConfig(plugin)));
    expect(materialized.map((config) => config.outDir)).toEqual([
      expect.stringMatching(`${path.resolve(stageRoot, 'dist')}/.forge-attempt-vue-vue-`),
      expect.stringMatching(`${path.resolve(stageRoot, 'dist')}/.forge-attempt-react-react-`),
    ]);
    expect(materialized.every((config) => config.clean === true)).toBe(true);
  }, 30_000);

  it('stages neutral hook output alongside framework output', () => {
    const rootDir = path.resolve(import.meta.dirname, '../../../../ui/components');
    const stageRoot = path.resolve(rootDir, 'node_modules/.cache/forge-build/test');
    const configs = defineTsdownForgeHooksAll({
      rootDir,
      outputRoot: stageRoot,
      frameworks: [fixtureFramework('react')],
      rejectFixturePlaceholder: false,
    });

    expect((configs as UserConfig[]).map((config) => config.outDir)).toEqual([
      path.resolve(stageRoot, 'dist'),
      expect.stringMatching(`${path.resolve(stageRoot, 'dist')}/.forge-attempt-react-react-`),
    ]);
  }, 30_000);

  it('returns independent component configs for each framework target', () => {
    const rootDir = path.resolve('/tmp', 'mission-platform-component-configs');
    const stageRoot = path.resolve(rootDir, 'node_modules/.cache/forge-build/test');
    const componentsRootDir = path.resolve(import.meta.dirname, '../../../../ui/components');
    const configs = defineTsdownForgeComponentsAll({
      rootDir,
      outputRoot: stageRoot,
      componentsModule: path.resolve(componentsRootDir, 'src/components/index.ts'),
      frameworks: [fixtureFramework('vue'), fixtureFramework('react')],
      rejectFixturePlaceholder: false,
    });

    expect(configs.map((config) => config.outDir)).toEqual([
      expect.stringMatching(`${path.resolve(stageRoot, 'dist')}/.forge-attempt-vue-vue-`),
      expect.stringMatching(`${path.resolve(stageRoot, 'dist')}/.forge-attempt-react-react-`),
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
        build: false,
        generator: 'oxc',
      });
    }

    const stagedTsconfig = JSON.parse(fs.readFileSync(path.join(stageRoot, 'tsconfig.forge-stage.json'), 'utf8')) as {
      extends: string;
      compilerOptions: { declarationDir: string; tsBuildInfoFile: string };
    };
    expect(stagedTsconfig.compilerOptions.declarationDir).toBe(path.resolve(stageRoot, 'dist'));
    expect(stagedTsconfig.compilerOptions.tsBuildInfoFile).toBe(path.join(stageRoot, 'tsconfig.build.tsbuildinfo'));
  }, 30_000);

  it('keeps framework artifacts available while running in watch mode', async () => {
    const originalArgv = process.argv;
    process.argv = [...originalArgv, '--watch'];

    try {
      const rootDir = path.resolve('/tmp', 'mission-platform-watch-components');
      const configs = tsdownForgeComponentPlugins({
        rootDir,
        componentsModule: path.resolve(import.meta.dirname, '../../../../ui/components/src/components/index.ts'),
        frameworks: [fixtureFramework('web-components')],
        rejectFixturePlaceholder: false,
      });

      const materialized = await Promise.all(configs.map((plugin) => materializeConfig(plugin)));
      expect(materialized.every((config) => config.clean === false)).toBe(true);
    } finally {
      process.argv = originalArgv;
    }
  }, 30_000);
});
