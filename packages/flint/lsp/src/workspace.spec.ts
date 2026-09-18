import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import nodePath from 'node:path';

import { describe, expect, it } from 'vitest';

import { RootBoundedFlintWorkspaceHost } from './workspace.js';

describe('RootBoundedFlintWorkspaceHost', () => {
  it('enumerates only source files and skips dependency and build directories', async () => {
    const root = await mkdtemp(nodePath.join(tmpdir(), 'flint-lsp-'));
    try {
      await mkdir(nodePath.join(root, 'src'), { recursive: true });
      await mkdir(nodePath.join(root, 'node_modules', 'dependency'), { recursive: true });
      await mkdir(nodePath.join(root, 'dist'), { recursive: true });
      await mkdir(nodePath.join(root, '.git'), { recursive: true });
      await writeFile(nodePath.join(root, 'src', 'main.flint'), 'fn main() {}');
      await writeFile(nodePath.join(root, 'src', 'notes.txt'), 'not Forge Web Script');
      await writeFile(nodePath.join(root, 'node_modules', 'dependency', 'ignored.flint'), 'fn ignored() {}');
      await writeFile(nodePath.join(root, 'dist', 'ignored.flint'), 'fn ignored() {}');
      await writeFile(nodePath.join(root, '.git', 'ignored.flint'), 'fn ignored() {}');

      const host = new RootBoundedFlintWorkspaceHost({ roots: [root] });

      await expect(host.listFiles()).resolves.toEqual([`file://${root}/src/main.flint`]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('allows only files inside configured roots and resolves symlink escapes', async () => {
    const reads: string[] = [];
    const host = new RootBoundedFlintWorkspaceHost({
      roots: ['/workspace/project'],
      fileSystem: {
        async readFile(path) {
          reads.push(path);
          return 'content';
        },
        async listFiles() {
          return ['/workspace/project/main.flint', '/workspace/project/../secret.flint'];
        },
        async realpath(path) {
          return path.endsWith('escape.flint') ? '/workspace/secret.flint' : path;
        },
        watch: () => ({ dispose: () => false }),
      },
    });

    await expect(host.readFile('file:///workspace/project/main.flint')).resolves.toBe('content');
    await expect(host.readFile('file:///workspace/secret.flint')).resolves.toBeUndefined();
    await expect(host.readFile('file:///workspace/project/escape.flint')).resolves.toBeUndefined();
    await expect(host.readFile('untitled:main.flint')).resolves.toBeUndefined();
    expect(reads).toEqual(['/workspace/project/main.flint']);
    await expect(host.listFiles()).resolves.toEqual(['file:///workspace/project/main.flint']);
  });

  it('publishes bounded file changes and disposes every watcher', () => {
    const listeners: Array<(path: string) => void> = [];
    const disposed: string[] = [];
    const host = new RootBoundedFlintWorkspaceHost({
      roots: ['/workspace/project', '/workspace/other'],
      fileSystem: {
        readFile: async () => void 0,
        listFiles: async () => [],
        realpath: async (path) => path,
        watch: (root, listener) => {
          listeners.push(listener);
          return { dispose: () => disposed.push(root) };
        },
      },
    });
    const changes: Array<{ uri?: string; kind: string }> = [];
    const subscription = host.watch((change) => changes.push(change));

    listeners[0]?.('/workspace/project/main.flint');
    listeners[0]?.('/workspace/project/notes.txt');
    listeners[0]?.('/workspace/project/node_modules/dependency/ignored.flint');
    listeners[0]?.('/workspace/outside.flint');
    listeners[1]?.('/workspace/other/secondary.flint');
    subscription.dispose();

    expect(changes).toEqual([
      { uri: 'file:///workspace/project/main.flint', kind: 'changed' },
      { uri: 'file:///workspace/other/secondary.flint', kind: 'changed' },
    ]);
    expect(disposed).toEqual(['/workspace/project', '/workspace/other']);
  });

  it('returns per-document options without exposing node-only configuration', async () => {
    const host = new RootBoundedFlintWorkspaceHost({
      roots: ['/workspace'],
      requestedCapabilities: ['clock.now'],
      requireExports: true,
      capabilityNames: ['clock.now'],
      optionsForUri: async () => ({ requireExports: false }),
      fileSystem: {
        readFile: async () => void 0,
        listFiles: async () => [],
        realpath: async (path) => path,
        watch: () => ({ dispose: () => false }),
      },
    });

    await expect(host.getOptions('file:///workspace/main.flint')).resolves.toEqual({ requireExports: false });
  });

  it('preserves the omitted export policy for the language-service default', async () => {
    const host = new RootBoundedFlintWorkspaceHost({
      roots: ['/workspace'],
      fileSystem: {
        readFile: async () => void 0,
        listFiles: async () => [],
        realpath: async (path) => path,
        watch: () => ({ dispose: () => false }),
      },
    });

    await expect(host.getOptions('file:///workspace/main.flint')).resolves.toEqual({
      requestedCapabilities: undefined,
      requireExports: undefined,
      capabilitySignatures: undefined,
      capabilityNames: undefined,
      selfHostedVmMode: undefined,
      selfHostedRunner: undefined,
    });
  });
});
