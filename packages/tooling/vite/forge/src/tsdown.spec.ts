import fs from 'node:fs';
import path from 'node:path';

import { cssBundlePlugin, defineTsdownLibrary, resolveCssOwner } from '@mission-platform/tsdown-config';
import { describe, expect, it } from 'vitest';

import {
  defineTsdownForgeComponentsAll,
  defineTsdownForgeEmailComponents,
  defineTsdownForgeHooksAll,
  forgePathNormalizationPlugin,
  resolveCanonicalChunkName,
  resolveCanonicalEntryName,
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

  it('resolves CSS owner and threads CSS imports into JS chunks cleanly', () => {
    const tempDir = path.resolve(import.meta.dirname, `../../../.test-tmp-css-${Date.now()}`);
    fs.mkdirSync(path.join(tempDir, 'components'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'styles'), { recursive: true });

    try {
      // 1. Direct class-map owner
      fs.writeFileSync(path.join(tempDir, 'components/btn.module.js'), 'export const cls = {};');
      expect(resolveCssOwner(tempDir, 'components/btn.css')).toBe('components/btn.module.js');

      // 2. Vue style marker
      fs.writeFileSync(path.join(tempDir, 'components/card.vue.js'), 'export default {};');
      expect(resolveCssOwner(tempDir, 'components/card.vue_vue_type_style_0.css')).toBe('components/card.vue.js');

      // 3. Fallback search when CSS is in styles directory
      fs.writeFileSync(path.join(tempDir, 'components/dialog.js'), 'export const Dialog = () => {};');
      expect(resolveCssOwner(tempDir, 'styles/dialog.css')).toBe('components/dialog.js');

      // 4. cssBundlePlugin injecting import and preventing duplicates
      const jsPath = path.join(tempDir, 'components/alert.js');
      fs.writeFileSync(jsPath, "'use client';\nexport const Alert = () => {};\n");
      fs.writeFileSync(path.join(tempDir, 'components/alert.css'), '.alert { color: red; }');

      const plugin = cssBundlePlugin() as { writeBundle: (options: { dir: string }) => void };
      plugin.writeBundle({ dir: tempDir });

      let code = fs.readFileSync(jsPath, 'utf8');
      expect(code).toBe('\'use client\';\nimport "./alert.css";\nexport const Alert = () => {};\n');

      // Running writeBundle again must not duplicate the import
      plugin.writeBundle({ dir: tempDir });
      code = fs.readFileSync(jsPath, 'utf8');
      expect(code).toBe('\'use client\';\nimport "./alert.css";\nexport const Alert = () => {};\n');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }, 30_000);
});

describe('Forge Tsdown build adapter path normalization and canonical naming', () => {
  it('resolves canonical entry filenames correctly', () => {
    // Virtual forge entries mapped to index.js
    expect(
      resolveCanonicalEntryName({
        name: '_virtual/_virtual_forge-entry-vue',
        facadeModuleId: '\0virtual:forge-entry-vue',
      }),
    ).toBe('index.js');
    expect(
      resolveCanonicalEntryName({
        name: 'virtual:forge-entry-react',
      }),
    ).toBe('index.js');
    expect(resolveCanonicalEntryName('entry:react')).toBe('index.js');
    expect(resolveCanonicalEntryName('entry_vue')).toBe('index.js');

    // Preserved modules delegate to chunk name resolution
    expect(
      resolveCanonicalEntryName({
        name: 'components/button/button',
      }),
    ).toBe('[name].js');
    expect(
      resolveCanonicalEntryName({
        name: 'composables/use-theme/use-theme',
      }),
    ).toBe('[name].js');
  });

  it('resolves canonical chunk filenames for Vue virtual script modules and standard chunks', () => {
    // Vue virtual script modules mapped to .script.js
    expect(
      resolveCanonicalChunkName({
        name: 'components/button/button.vue?vue&type=script&setup=true&lang.js',
      }),
    ).toBe('components/button/button.script.js');
    expect(
      resolveCanonicalChunkName({
        name: 'components/button/button.vue_vue_type_script_setup_true_lang',
      }),
    ).toBe('components/button/button.script.js');
    expect(
      resolveCanonicalChunkName({
        name: 'components/button/button',
        facadeModuleId: '/root/components/button/button.vue?vue&type=script&setup=true',
      }),
    ).toBe('components/button/button.script.js');

    // Standard chunks preserve [name].js without collisions
    expect(
      resolveCanonicalChunkName({
        name: 'components/button/button',
      }),
    ).toBe('[name].js');
    expect(
      resolveCanonicalChunkName({
        name: 'composables/use-theme/use-theme',
      }),
    ).toBe('[name].js');
  });

  it('normalizes chunk code specifiers via forgePathNormalizationPlugin', async () => {
    const plugin = forgePathNormalizationPlugin();
    const renderChunk =
      typeof plugin.renderChunk === 'function'
        ? plugin.renderChunk
        : (plugin.renderChunk as unknown as { handler: Function }).handler;

    // Normalizes Vue virtual script import specifiers
    const vueChunkCode =
      'import script from "./button.vue?vue&type=script&setup=true&lang.js";\nexport default script;\n';
    const normalizedVue = await Reflect.apply(renderChunk, plugin, [
      vueChunkCode,
      { fileName: 'components/button/button.js' },
      {},
    ]);
    expect(normalizedVue).toBe('import script from "./button.script.js";\nexport default script;\n');

    // Normalizes CSS module relative import specifiers
    const cssChunkCode = 'import "./alert.module.css";\nimport "./theme.module.scss";\nexport const x = 1;\n';
    const normalizedCss = await Reflect.apply(renderChunk, plugin, [
      cssChunkCode,
      { fileName: 'components/alert/alert.js' },
      {},
    ]);
    expect(normalizedCss).toBe('import "./alert.css";\nimport "./theme.css";\nexport const x = 1;\n');

    // Returns null when no transformation is needed
    const cleanCode = 'export const noop = () => {};\n';
    const normalizedClean = await Reflect.apply(renderChunk, plugin, [cleanCode, { fileName: 'utils/noop.js' }, {}]);
    expect(normalizedClean).toBeNull();
  });

  it('configures canonical entry and chunk naming in outputOptions for component plugins and hook configs', async () => {
    const rootDir = path.resolve('/tmp', 'mission-platform-canonical-naming');
    const componentsRootDir = path.resolve(import.meta.dirname, '../../../../ui/components');
    const configs = tsdownForgeComponentPlugins({
      rootDir,
      componentsModule: path.resolve(componentsRootDir, 'src/components/index.ts'),
      frameworks: [fixtureFramework('vue')],
      rejectFixturePlaceholder: false,
    });

    const materialized = await Promise.all(configs.map((plugin) => materializeConfig(plugin)));
    const vueConfig = materialized[0];
    expect(vueConfig).toBeDefined();

    const outputOptions = vueConfig.outputOptions;
    expect(outputOptions).toBeDefined();
    if (typeof outputOptions === 'object' && outputOptions !== null) {
      expect(typeof outputOptions.entryFileNames).toBe('function');
      expect(typeof outputOptions.chunkFileNames).toBe('function');
      expect(
        (outputOptions.entryFileNames as (chunk: { name: string }) => string)({
          name: 'virtual:forge-entry-vue',
        }),
      ).toBe('index.js');
      expect(
        (outputOptions.chunkFileNames as (chunk: { name: string }) => string)({
          name: 'components/card/card.vue?vue&type=script&setup=true&lang.js',
        }),
      ).toBe('components/card/card.script.js');
    }
  });
});
