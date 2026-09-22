import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { forgeArtifactPublishPlugin, forgeBuildLifecyclePlugin } from './build-integration';
import { createForgeArtifactWriter } from './compiler/artifact-writer';

import type { ForgeBuildSession } from './compiler/session';

/** Resolves a callable handler from a hook function or object. */
function resolveHookHandler(hook: unknown): unknown {
  if (typeof hook === 'function') return hook;
  if (hook !== null && typeof hook === 'object' && 'handler' in hook) {
    return Reflect.get(hook, 'handler');
  }
  return undefined;
}

/** Invokes a hook or hook object if a valid handler is present. */
function invokeHook(hook: unknown, receiver: object, ...args: unknown[]): Promise<unknown> | undefined {
  const handler = resolveHookHandler(hook);
  if (typeof handler !== 'function') return undefined;
  return Reflect.apply(handler, receiver, args);
}

describe('Forge Vite compiler service lifecycle', () => {
  it('publishes native artifacts through a manifest and preserves them on declaration failure', async () => {
    const packageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-publish-'));
    const publishedDirectory = path.join(packageDir, 'dist', 'react');
    const attemptDirectory = path.join(packageDir, 'attempt');
    try {
      const previous = createForgeArtifactWriter(publishedDirectory, 'react');
      previous.writeText('index.js', 'export const version = "old";\n', 'entry');
      previous.commit();

      const plugin = forgeArtifactPublishPlugin({
        publishedDirectory,
        attemptDirectory,
        targetId: 'react',
      });
      await invokeHook(plugin.buildStart, plugin);
      fs.writeFileSync(path.join(attemptDirectory, 'index.js'), 'export const version = "new";\n');
      fs.writeFileSync(path.join(attemptDirectory, 'index.d.ts'), 'export declare const version: string;\n');
      fs.writeFileSync(path.join(attemptDirectory, 'index.js.map'), '{}');
      fs.writeFileSync(path.join(attemptDirectory, 'styles.css'), '.forge {}');
      await invokeHook(plugin.generateBundle, plugin, {}, {});
      await invokeHook(plugin.closeBundle, plugin);

      expect(fs.readFileSync(path.join(publishedDirectory, 'index.js'), 'utf8')).toContain('new');
      const manifest = JSON.parse(
        fs.readFileSync(path.join(publishedDirectory, '.forge-artifact-manifest.json'), 'utf8'),
      ) as {
        entries: string[];
        artifacts: Array<{ fileName: string; kind: string }>;
      };
      expect(manifest.entries).toContain('index.js');
      expect(manifest.artifacts).toEqual(
        expect.arrayContaining([
          { fileName: 'index.d.ts', kind: 'declaration', hash: expect.any(String), size: expect.any(Number) },
          { fileName: 'index.js.map', kind: 'map', hash: expect.any(String), size: expect.any(Number) },
          { fileName: 'styles.css', kind: 'style', hash: expect.any(String), size: expect.any(Number) },
        ]),
      );

      const failedAttempt = path.join(packageDir, 'failed-attempt');
      const failedPlugin = forgeArtifactPublishPlugin({
        publishedDirectory,
        attemptDirectory: failedAttempt,
        targetId: 'react',
      });
      await invokeHook(failedPlugin.buildStart, failedPlugin);
      fs.writeFileSync(path.join(failedAttempt, 'index.js'), 'export const version = "broken";\n');
      await invokeHook(failedPlugin.buildEnd, failedPlugin, new Error('declaration generation failed'));
      // After abort, closeBundle must be a no-op (not rethrow) so Rolldown/Vite
      // do not surface an unhandled rejection that masks the original build error.
      expect(() => invokeHook(failedPlugin.closeBundle, failedPlugin)).not.toThrow();

      expect(fs.readFileSync(path.join(publishedDirectory, 'index.js'), 'utf8')).toContain('new');
      expect(fs.existsSync(failedAttempt)).toBe(false);
    } finally {
      fs.rmSync(packageDir, { recursive: true, force: true });
    }
  });

  it('invalidates changed files and disposes an owned one-shot session', async () => {
    const session = {
      prepare: vi.fn(() => Promise.resolve({ fingerprint: 'fixture' })),
      ensureTarget: vi.fn(() =>
        Promise.resolve({
          targetId: 'react',
          entry: '/workspace/.forge/react.ts',
          manifest: { targetId: 'react', artifacts: [], complete: true },
          cache: { hit: false, affectedFiles: [] },
        }),
      ),
      invalidate: vi.fn(() => ({ changedFiles: [], invalidatedFiles: [], invalidatedEntries: 0 })),
      report: vi.fn(),
      dispose: vi.fn(() => Promise.resolve()),
    } as unknown as ForgeBuildSession;
    const target = {
      targetId: 'react',
      kind: 'component' as const,
      entryModule: '/workspace/src/index.ts',
      generate: vi.fn(() => Promise.resolve('/workspace/.forge/react.ts')),
    };
    const plugin = forgeBuildLifecyclePlugin({
      session,
      plan: { rootDir: '/workspace', targets: [target] },
      target,
      adapter: 'vite',
      disposeSession: true,
    });

    await invokeHook(plugin.handleHotUpdate, plugin, { file: '/workspace/src/button.tsx' });
    await invokeHook(plugin.closeBundle, plugin);

    expect(session.invalidate).toHaveBeenCalledWith(['/workspace/src/button.tsx']);
    expect(session.dispose).toHaveBeenCalledOnce();
  });

  it('keeps an owned session alive across watch rebuilds', async () => {
    const session = {
      prepare: vi.fn(),
      ensureTarget: vi.fn(),
      invalidate: vi.fn(),
      report: vi.fn(),
      dispose: vi.fn(() => Promise.resolve()),
    } as unknown as ForgeBuildSession;
    const target = {
      targetId: 'vue',
      kind: 'component' as const,
      entryModule: '/workspace/src/index.ts',
      generate: vi.fn(() => Promise.resolve('/workspace/.forge/vue.ts')),
    };
    const plugin = forgeBuildLifecyclePlugin({
      session,
      plan: { rootDir: '/workspace', targets: [target] },
      target,
      adapter: 'vite',
      disposeSession: true,
    });

    await invokeHook(plugin.configResolved, plugin, { command: 'serve', server: { watch: {} } });
    await invokeHook(plugin.closeBundle, plugin);

    expect(session.dispose).not.toHaveBeenCalled();
  });

  it('publishes staged artifacts purely without altering filenames or mutating source chunks', async () => {
    const packageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-pure-staging-'));
    const publishedDirectory = path.join(packageDir, 'dist', 'vue');
    const attemptDirectory = path.join(packageDir, 'attempt');
    try {
      const plugin = forgeArtifactPublishPlugin({
        publishedDirectory,
        attemptDirectory,
        targetId: 'vue',
      });
      await invokeHook(plugin.buildStart, plugin);

      const componentDir = path.join(attemptDirectory, 'components', 'card');
      fs.mkdirSync(componentDir, { recursive: true });
      const entrySource = 'export { Card } from "./components/card/card.js";\n';
      const cardSource = 'export const Card = () => "card";\n';
      const scriptSource = 'export const setup = () => {};\n';
      fs.writeFileSync(path.join(attemptDirectory, 'index.js'), entrySource);
      fs.writeFileSync(path.join(componentDir, 'card.js'), cardSource);
      fs.writeFileSync(path.join(componentDir, 'card.script.js'), scriptSource);

      await invokeHook(
        plugin.generateBundle,
        plugin,
        {},
        {
          'index.js': { type: 'chunk', isEntry: true, fileName: 'index.js' },
        },
      );
      await invokeHook(plugin.closeBundle, plugin);

      expect(fs.existsSync(path.join(publishedDirectory, 'index.js'))).toBe(true);
      expect(fs.existsSync(path.join(publishedDirectory, 'components/card/card.js'))).toBe(true);
      expect(fs.existsSync(path.join(publishedDirectory, 'components/card/card.script.js'))).toBe(true);
      expect(fs.readFileSync(path.join(publishedDirectory, 'index.js'), 'utf8')).toBe(entrySource);
      expect(fs.readFileSync(path.join(publishedDirectory, 'components/card/card.js'), 'utf8')).toBe(cardSource);
      expect(fs.readFileSync(path.join(publishedDirectory, 'components/card/card.script.js'), 'utf8')).toBe(
        scriptSource,
      );

      const manifest = JSON.parse(
        fs.readFileSync(path.join(publishedDirectory, '.forge-artifact-manifest.json'), 'utf8'),
      ) as {
        entries: string[];
        artifacts: Array<{ fileName: string; kind: string }>;
      };
      expect(manifest.entries).toEqual(['index.js']);
      expect(manifest.artifacts).toHaveLength(3);
    } finally {
      fs.rmSync(packageDir, { recursive: true, force: true });
    }
  });
});
