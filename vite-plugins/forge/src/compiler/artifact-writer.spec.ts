import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { createForgeArtifactWriter } from './artifact-writer.js';

import type { ForgeArtifactManifest } from './artifact-manifest.js';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function temporaryDirectory(prefix = 'forge-artifact-writer-'): string {
  const directory = mkdtempSync(path.join(os.tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

describe('createForgeArtifactWriter', () => {
  it.each([
    '',
    '.',
    './artifact.js',
    '../artifact.js',
    'a/../artifact.js',
    'a//artifact.js',
    '/tmp/artifact.js',
    'C:/tmp/artifact.js',
    'a\\artifact.js',
  ])('rejects unsafe artifact name %j', (name) => {
    const output = temporaryDirectory();
    const writer = createForgeArtifactWriter(output, 'test');

    expect(() => writer.writeText(name, 'content', 'module')).toThrow(/strict relative path/);
  });

  it('rejects symlinked artifact directories', () => {
    const root = temporaryDirectory();
    const outside = temporaryDirectory('forge-artifact-outside-');
    mkdirSync(root, { recursive: true });
    const writer = createForgeArtifactWriter(root, 'test');
    symlinkSync(outside, path.join(root, 'linked'), 'dir');

    expect(() => writer.writeText('linked/escaped.js', 'content', 'module')).toThrow(/symlink/);
    expect(() => readFileSync(path.join(outside, 'escaped.js'))).toThrow();
  });

  it('rejects an output root that is itself a symlink', () => {
    const parent = temporaryDirectory();
    const outside = temporaryDirectory('forge-artifact-outside-');
    const root = path.join(parent, 'output');
    symlinkSync(outside, root, 'dir');

    expect(() => createForgeArtifactWriter(root, 'test')).toThrow(/root contains a symlink/);
  });

  it('fails closed on an unsafe path in a previous manifest', () => {
    const root = temporaryDirectory();
    const outside = path.join(path.dirname(root), 'escaped.js');
    writeFileSync(
      path.join(root, '.forge-artifact-manifest.json'),
      JSON.stringify({
        version: 1,
        targetId: 'test',
        complete: true,
        artifacts: [{ fileName: '../escaped.js', kind: 'module', hash: '', size: 0 }],
      } satisfies ForgeArtifactManifest),
      'utf8',
    );

    expect(() => createForgeArtifactWriter(root, 'test')).toThrow(/strict relative path/);
    expect(() => readFileSync(outside)).toThrow();
  });

  it('writes valid nested artifacts and records their normalized manifest names', () => {
    const root = temporaryDirectory();
    const writer = createForgeArtifactWriter(root, 'test');
    writer.writeText('nested/artifact.js', 'content', 'module');
    writer.finalize(['nested/artifact.js']);

    expect(readFileSync(path.join(root, 'nested/artifact.js'), 'utf8')).toBe('content');
    expect(JSON.parse(readFileSync(path.join(root, '.forge-artifact-manifest.json'), 'utf8'))).toMatchObject({
      entries: ['nested/artifact.js'],
    });
  });
});
