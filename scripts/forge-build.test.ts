import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { assertCompleteStage, resolveTargetCommand, runForgeBuild } from './forge-build.ts';

describe('forge-build runner', () => {
  describe('resolveTargetCommand', () => {
    it('returns default tsdown for aggregate "all" target', () => {
      const packageRoot = '/tmp/fake-pkg';
      expect(resolveTargetCommand(packageRoot, 'all')).toEqual(['pnpm', 'exec', 'tsdown']);
    });

    it('resolves target-specific config when tsdown.<target>.config.ts exists', async () => {
      const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-cmd-test-'));
      try {
        await fs.writeFile(path.join(temporaryDirectory, 'tsdown.react.config.ts'), 'export default [];\n');
        await fs.writeFile(path.join(temporaryDirectory, 'tsdown.forge.config.ts'), 'export default [];\n');

        expect(resolveTargetCommand(temporaryDirectory, 'react')).toEqual([
          'pnpm',
          'exec',
          'tsdown',
          '--config',
          'tsdown.react.config.ts',
        ]);
        expect(resolveTargetCommand(temporaryDirectory, 'forge')).toEqual([
          'pnpm',
          'exec',
          'tsdown',
          '--config',
          'tsdown.forge.config.ts',
        ]);
        expect(resolveTargetCommand(temporaryDirectory, 'vue')).toEqual(['pnpm', 'exec', 'tsdown']);
      } finally {
        await fs.rm(temporaryDirectory, { recursive: true, force: true });
      }
    });
  });

  describe('assertCompleteStage', () => {
    it('validates stage when target is "forge" and output is in dist/components/index.js', async () => {
      const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-stage-test-'));
      try {
        const stagedDist = path.join(temporaryDirectory, 'dist');
        const componentsDirectory = path.join(stagedDist, 'components');
        await fs.mkdir(componentsDirectory, { recursive: true });
        await fs.writeFile(path.join(componentsDirectory, 'index.js'), 'export const a = 1;\n');

        const result = await assertCompleteStage(temporaryDirectory, 'forge');
        expect(result).toBe(stagedDist);

        const manifestRaw = await fs.readFile(path.join(stagedDist, '.forge-build-manifest.json'), 'utf8');
        const manifest = JSON.parse(manifestRaw);
        expect(manifest.complete).toBe(true);
        expect(manifest.target).toBe('forge');
        expect(manifest.entries).toContain('components/index.js');
      } finally {
        await fs.rm(temporaryDirectory, { recursive: true, force: true });
      }
    });

    it('validates stage when framework target output is in dist/<target>/index.js', async () => {
      const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-stage-test-'));
      try {
        const stagedDist = path.join(temporaryDirectory, 'dist');
        const reactDirectory = path.join(stagedDist, 'react');
        await fs.mkdir(reactDirectory, { recursive: true });
        await fs.writeFile(path.join(reactDirectory, 'index.js'), 'export const ReactComponent = () => null;\n');

        const result = await assertCompleteStage(temporaryDirectory, 'react');
        expect(result).toBe(stagedDist);

        const manifestRaw = await fs.readFile(path.join(stagedDist, '.forge-build-manifest.json'), 'utf8');
        const manifest = JSON.parse(manifestRaw);
        expect(manifest.complete).toBe(true);
        expect(manifest.target).toBe('react');
        expect(manifest.entries).toContain('react/index.js');
      } finally {
        await fs.rm(temporaryDirectory, { recursive: true, force: true });
      }
    });

    it('throws when target output entry is missing', async () => {
      const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-stage-test-'));
      try {
        const stagedDist = path.join(temporaryDirectory, 'dist');
        const vueDirectory = path.join(stagedDist, 'vue');
        await fs.mkdir(vueDirectory, { recursive: true });
        await fs.writeFile(path.join(vueDirectory, 'other.js'), 'export const b = 2;\n');

        await expect(assertCompleteStage(temporaryDirectory, 'vue')).rejects.toThrow(
          /Forge build stage is missing the expected vue entry/,
        );
      } finally {
        await fs.rm(temporaryDirectory, { recursive: true, force: true });
      }
    });
  });

  describe('runForgeBuild', () => {
    it('executes each target config in sequence for target "all" when tsdown.config.ts is absent', async () => {
      const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-build-all-test-'));
      const stageRoot = path.join(temporaryDirectory, 'node_modules/.cache/forge-build/test-stage');
      const executedCommands: string[][] = [];

      try {
        await fs.mkdir(path.join(temporaryDirectory, 'src'), { recursive: true });
        await fs.writeFile(path.join(temporaryDirectory, 'tsdown.forge.config.ts'), 'export default [];\n');
        await fs.writeFile(path.join(temporaryDirectory, 'tsdown.react.config.ts'), 'export default [];\n');

        const promotion = await runForgeBuild({
          packageRoot: temporaryDirectory,
          stageRoot,
          target: 'all',
          runCommand: async (context) => {
            executedCommands.push([...context.command]);
            const stagedDist = path.join(context.stageRoot, 'dist');
            await fs.mkdir(stagedDist, { recursive: true });
            await fs.writeFile(path.join(stagedDist, 'index.js'), 'export const all = true;\n');
          },
        });

        expect(executedCommands).toEqual([
          ['pnpm', 'exec', 'tsdown', '--config', 'tsdown.forge.config.ts'],
          ['pnpm', 'exec', 'tsdown', '--config', 'tsdown.react.config.ts'],
        ]);
        expect(promotion.replaceMode).toBe('aggregate');
      } finally {
        await fs.rm(temporaryDirectory, { recursive: true, force: true });
      }
    });
  });
});
