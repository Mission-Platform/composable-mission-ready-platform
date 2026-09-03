import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { forgeReactFramework } from '../packages/compiler/plugins/forge-react/src';
import { forgeSolidFramework } from '../packages/compiler/plugins/forge-solid/src';
import { forgeSvelteFramework } from '../packages/compiler/plugins/forge-svelte/src';
import { forgeVueFramework } from '../packages/compiler/plugins/forge-vue/src';
import { forgeWebComponentsFramework } from '../packages/compiler/plugins/forge-web-components/src';
import { generateFrameworkSources } from '../packages/tooling/vite/forge/src/generate';

import {
  deriveForgeStagePath,
  type ForgeBuildCommandContext,
  normalizeForgeBuildTarget,
  promoteAggregate,
  promoteTarget,
  runForgeBuild,
  type ForgeStageManifest,
} from './forge-build.ts';

async function fixturePackage(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'mission-platform-forge-build-'));
}

describe('Forge staged build orchestration', () => {
  it('normalizes aliases and derives package-local stage paths', async () => {
    const packageRoot = await fixturePackage();
    const stageRoot = path.join(packageRoot, 'node_modules/.cache/forge-build/run');

    expect(normalizeForgeBuildTarget()).toBe('all');
    expect(normalizeForgeBuildTarget('none')).toBe('forge');
    expect(deriveForgeStagePath(packageRoot, stageRoot, path.join(packageRoot, 'dist/react'))).toBe(
      path.join(stageRoot, 'dist/react'),
    );
  });

  it('promotes one framework while preserving neutral, CMS, and sibling output', async () => {
    const packageRoot = await fixturePackage();
    const stageRoot = path.join(packageRoot, 'node_modules/.cache/forge-build/run');
    const dist = path.join(packageRoot, 'dist');
    await fs.mkdir(path.join(dist, 'react'), { recursive: true });
    await fs.mkdir(path.join(dist, 'vue'), { recursive: true });
    await fs.mkdir(path.join(dist, 'cms/storyblok/react'), { recursive: true });
    await fs.writeFile(path.join(dist, 'index.js'), 'neutral');
    await fs.writeFile(path.join(dist, 'react/old.js'), 'old');
    await fs.writeFile(path.join(dist, 'vue/index.js'), 'vue');
    await fs.writeFile(path.join(dist, 'cms/storyblok/react/old.js'), 'old');
    await fs.mkdir(path.join(stageRoot, 'dist/react'), { recursive: true });
    await fs.mkdir(path.join(stageRoot, 'dist/cms/storyblok/react'), { recursive: true });
    await fs.writeFile(path.join(stageRoot, 'dist/react/index.js'), 'new');
    await fs.writeFile(path.join(stageRoot, 'dist/cms/storyblok/react/index.js'), 'new');

    await promoteTarget({ packageRoot, stageRoot, target: 'react' });

    await expect(fs.readFile(path.join(dist, 'index.js'), 'utf8')).resolves.toBe('neutral');
    await expect(fs.readFile(path.join(dist, 'vue/index.js'), 'utf8')).resolves.toBe('vue');
    await expect(fs.readFile(path.join(dist, 'react/index.js'), 'utf8')).resolves.toBe('new');
    await expect(fs.stat(path.join(dist, 'react/old.js'))).rejects.toThrow();
    await expect(fs.readFile(path.join(dist, 'cms/storyblok/react/index.js'), 'utf8')).resolves.toBe('new');
  });

  it('cleans an incomplete stage after a failed build without touching dist', async () => {
    const packageRoot = await fixturePackage();
    const stageRoot = path.join(packageRoot, 'node_modules/.cache/forge-build/run');
    const dist = path.join(packageRoot, 'dist');
    await fs.mkdir(dist, { recursive: true });
    await fs.writeFile(path.join(dist, 'sentinel.js'), 'previous');

    await expect(
      runForgeBuild({
        packageRoot,
        stageRoot,
        target: 'react',
        runCommand: async () => {
          await fs.mkdir(stageRoot, { recursive: true });
          throw new Error('compiler failed');
        },
      }),
    ).rejects.toThrow('compiler failed');

    await expect(fs.readFile(path.join(dist, 'sentinel.js'), 'utf8')).resolves.toBe('previous');
    await expect(fs.stat(stageRoot)).rejects.toThrow();
  });

  it('atomically promotes a complete aggregate tree and removes stale output', async () => {
    const packageRoot = await fixturePackage();
    const stageRoot = path.join(packageRoot, 'node_modules/.cache/forge-build/run');
    const dist = path.join(packageRoot, 'dist');
    await fs.mkdir(dist, { recursive: true });
    await fs.writeFile(path.join(dist, 'stale.js'), 'stale');

    await runForgeBuild({
      packageRoot,
      stageRoot,
      target: 'all',
      runCommand: async ({ stageRoot: commandStageRoot, env }) => {
        expect(env.FORGE_FRAMEWORK_TARGET).toBeUndefined();
        await fs.mkdir(path.join(commandStageRoot, 'dist/react'), { recursive: true });
        await fs.writeFile(path.join(commandStageRoot, 'dist/react/index.js'), 'complete');
      },
    });

    await expect(fs.stat(path.join(dist, 'stale.js'))).rejects.toThrow();
    await expect(fs.readFile(path.join(dist, 'react/index.js'), 'utf8')).resolves.toBe('complete');
    await expect(fs.stat(stageRoot)).rejects.toThrow();
  });

  it('publishes real framework-generated modules for every aggregate target', async () => {
    const packageRoot = await fixturePackage();
    const stageRoot = path.join(packageRoot, 'node_modules/.cache/forge-build/run');
    const componentsDir = path.join(packageRoot, 'src/components');
    const componentDir = path.join(componentsDir, 'forge-card');
    const helpersDir = path.join(packageRoot, 'src/helpers');
    const sourceIndex = path.join(componentsDir, 'index.ts');
    const plugins = [
      ['react', forgeReactFramework(), '.tsx'],
      ['vue', forgeVueFramework(), '.vue'],
      ['solid', forgeSolidFramework(), '.tsx'],
      ['svelte', forgeSvelteFramework(), '.svelte'],
      ['web-components', forgeWebComponentsFramework(), '.ts'],
    ] as const;

    await fs.mkdir(componentDir, { recursive: true });
    await fs.mkdir(helpersDir, { recursive: true });
    await fs.writeFile(
      sourceIndex,
      ["export { ForgeCard } from './forge-card';", "export { createCard } from '../helpers/card';", ''].join('\n'),
    );
    await fs.writeFile(
      path.join(componentDir, 'forge-card.tsx'),
      [
        "import { h } from '@mission-platform/forge';",
        'export function ForgeCard() {',
        '  return <button data-build-marker="published-real-framework">ForgeCard published body</button>;',
        '}',
        '',
      ].join('\n'),
    );
    await fs.writeFile(
      path.join(helpersDir, 'card.ts'),
      'export function createCard(): string { return "published helper"; }\n',
    );

    for (const [id, plugin] of plugins) {
      generateFrameworkSources({
        plugin,
        componentsModule: sourceIndex,
        outDir: path.join(stageRoot, 'dist', id),
      });
    }

    await promoteAggregate({ packageRoot, stageRoot });

    for (const [id, plugin, extension] of plugins) {
      const publishedRoot = path.join(packageRoot, 'dist', id);
      const componentSource = await fs.readFile(
        path.join(publishedRoot, 'components/forge-card', `forge-card${extension}`),
        'utf8',
      );
      const entrySource = await fs.readFile(path.join(publishedRoot, `index${plugin.source.entryExtension}`), 'utf8');
      const helperSource = await fs.readFile(path.join(publishedRoot, 'helpers/card.ts'), 'utf8');
      expect(componentSource, `${id} published component`).toContain('ForgeCard');
      expect(componentSource, `${id} published body`).toContain('published-real-framework');
      expect(componentSource, `${id} published placeholder`).not.toContain('export const fixture = true;');
      expect(entrySource, `${id} published entry`).toContain('ForgeCard');
      expect(entrySource, `${id} published helper entry`).toContain('createCard');
      expect(helperSource, `${id} published helper`).toContain('published helper');

      const visit = async (directory: string): Promise<void> => {
        for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
          const fullPath = path.join(directory, entry.name);
          if (entry.isDirectory()) await visit(fullPath);
          else {
            expect(await fs.readFile(fullPath, 'utf8'), `${id} ${fullPath}`).not.toContain(
              'export const fixture = true;',
            );
          }
        }
      };
      await visit(publishedRoot);
    }
  });

  it('scopes the CMS selector to the requested framework so its wrapper subtree is regenerated', async () => {
    const packageRoot = await fixturePackage();
    const stageRoot = path.join(packageRoot, 'node_modules/.cache/forge-build/run');
    const dist = path.join(packageRoot, 'dist');
    await fs.mkdir(path.join(dist, 'cms/storyblok/vue'), { recursive: true });
    await fs.mkdir(path.join(dist, 'cms/storyblok/react'), { recursive: true });
    await fs.writeFile(path.join(dist, 'cms/storyblok/vue/index.js'), 'old-vue-wrapper');
    await fs.writeFile(path.join(dist, 'cms/storyblok/react/index.js'), 'old-react-wrapper');

    await runForgeBuild({
      packageRoot,
      stageRoot,
      target: 'vue',
      runCommand: async ({ stageRoot: commandStageRoot, env }: ForgeBuildCommandContext) => {
        // The shared runner must scope both the framework and the CMS
        // selectors to `vue` so the package's `defineTsdownForgeCmsAll`
        // wiring (e.g. `forgeStoryblokCmsTargets`) actually rebuilds the
        // matching CMS wrapper instead of skipping CMS output entirely.
        expect(env.FORGE_FRAMEWORK_TARGET).toBe('vue');
        expect(env.FORGE_CMS_STORYBLOK_TARGET).toBe('vue');
        await fs.mkdir(path.join(commandStageRoot, 'dist/vue'), { recursive: true });
        await fs.writeFile(path.join(commandStageRoot, 'dist/vue/index.js'), 'new-vue');
        await fs.mkdir(path.join(commandStageRoot, 'dist/cms/storyblok/vue'), { recursive: true });
        await fs.writeFile(path.join(commandStageRoot, 'dist/cms/storyblok/vue/index.js'), 'new-vue-wrapper');
      },
    });

    // The rebuilt Vue CMS wrapper is promoted...
    await expect(fs.readFile(path.join(dist, 'cms/storyblok/vue/index.js'), 'utf8')).resolves.toBe('new-vue-wrapper');
    // ...while the untouched React CMS wrapper survives (regression guard for
    // the framework-only build silently deleting a sibling CMS subtree).
    await expect(fs.readFile(path.join(dist, 'cms/storyblok/react/index.js'), 'utf8')).resolves.toBe(
      'old-react-wrapper',
    );
  });

  it('never deletes a CMS wrapper subtree that the stage does not regenerate', async () => {
    const packageRoot = await fixturePackage();
    const stageRoot = path.join(packageRoot, 'node_modules/.cache/forge-build/run');
    const dist = path.join(packageRoot, 'dist');
    await fs.mkdir(path.join(dist, 'cms/storyblok/vue'), { recursive: true });
    await fs.writeFile(path.join(dist, 'cms/storyblok/vue/index.js'), 'existing-vue-wrapper');

    await runForgeBuild({
      packageRoot,
      stageRoot,
      target: 'vue',
      runCommand: async ({ stageRoot: commandStageRoot }: ForgeBuildCommandContext) => {
        // Simulate a package build that does not stage a CMS wrapper for this
        // framework (e.g. CMS wiring failed to pick up the selector).
        await fs.mkdir(path.join(commandStageRoot, 'dist/vue'), { recursive: true });
        await fs.writeFile(path.join(commandStageRoot, 'dist/vue/index.js'), 'new-vue');
      },
    });

    // The pre-existing CMS wrapper must survive rather than be silently lost.
    await expect(fs.readFile(path.join(dist, 'cms/storyblok/vue/index.js'), 'utf8')).resolves.toBe(
      'existing-vue-wrapper',
    );
  });

  it('writes a complete checksum manifest only after the expected entry is staged', async () => {
    const packageRoot = await fixturePackage();
    const stageRoot = path.join(packageRoot, 'node_modules/.cache/forge-build/run');

    await runForgeBuild({
      packageRoot,
      stageRoot,
      target: 'react',
      runCommand: async ({ stageRoot: commandStageRoot }) => {
        await fs.mkdir(path.join(commandStageRoot, 'dist/react'), { recursive: true });
        await fs.writeFile(path.join(commandStageRoot, 'dist/react/index.js'), 'complete');
      },
    });

    const manifest = JSON.parse(
      await fs.readFile(path.join(packageRoot, 'dist/.forge-build-manifest.json'), 'utf8'),
    ) as ForgeStageManifest;
    expect(manifest).toMatchObject({ version: 1, target: 'react', complete: true });
    expect(manifest.entries).toContain('react/index.js');
    expect(manifest.artifacts.find((artifact) => artifact.fileName === 'react/index.js')?.hash).toHaveLength(64);
  });

  it('cancels a hanging build, preserves the last successful output, and removes only its stage', async () => {
    const packageRoot = await fixturePackage();
    const stageRoot = path.join(packageRoot, 'node_modules/.cache/forge-build/run');
    const dist = path.join(packageRoot, 'dist');
    await fs.mkdir(dist, { recursive: true });
    await fs.writeFile(path.join(dist, 'sentinel.js'), 'previous');

    await expect(
      runForgeBuild({
        packageRoot,
        stageRoot,
        target: 'react',
        timeoutMs: 10,
        runCommand: async ({ signal }) =>
          new Promise<void>((resolve) => {
            signal.addEventListener('abort', () => resolve(), { once: true });
          }),
      }),
    ).rejects.toThrow('cancelled');

    await expect(fs.readFile(path.join(dist, 'sentinel.js'), 'utf8')).resolves.toBe('previous');
    await expect(fs.stat(stageRoot)).rejects.toThrow();
  });
});
