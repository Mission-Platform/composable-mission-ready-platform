import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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

  it('records pure staging directory into manifest without altering file names or contents', () => {
    const root = temporaryDirectory();
    const writer = createForgeArtifactWriter(root, 'vue');
    mkdirSync(path.join(writer.stageDirectory, 'components/example'), { recursive: true });
    const componentCode = 'export default { name: "Example" };\n';
    const scriptCode = 'export const setup = () => {};\n';
    writeFileSync(
      path.join(writer.stageDirectory, 'index.js'),
      'export { default as Example } from "./components/example/example.js";\n',
      'utf8',
    );
    writeFileSync(path.join(writer.stageDirectory, 'components/example/example.js'), componentCode, 'utf8');
    writeFileSync(path.join(writer.stageDirectory, 'components/example/example.script.js'), scriptCode, 'utf8');
    writer.recordTree(['index.js']);
    writer.finalize(['index.js']);

    // Pure staging: file names and contents are unchanged on disk
    expect(existsSync(path.join(root, 'index.js'))).toBe(true);
    expect(existsSync(path.join(root, 'components/example/example.js'))).toBe(true);
    expect(existsSync(path.join(root, 'components/example/example.script.js'))).toBe(true);
    expect(readFileSync(path.join(root, 'components/example/example.js'), 'utf8')).toBe(componentCode);
    expect(readFileSync(path.join(root, 'components/example/example.script.js'), 'utf8')).toBe(scriptCode);

    const manifest = JSON.parse(
      readFileSync(path.join(root, '.forge-artifact-manifest.json'), 'utf8'),
    ) as ForgeArtifactManifest;
    expect(manifest.entries).toEqual(['index.js']);
    expect(manifest.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: 'index.js',
          kind: 'entry',
          size: expect.any(Number),
          hash: expect.any(String),
        }),
        expect.objectContaining({
          fileName: 'components/example/example.js',
          kind: 'module',
          size: componentCode.length,
        }),
        expect.objectContaining({
          fileName: 'components/example/example.script.js',
          kind: 'module',
          size: scriptCode.length,
        }),
      ]),
    );
  });

  it('detects tampered or corrupt staging artifacts during validation and aborts commit', () => {
    const root = temporaryDirectory();
    const writer = createForgeArtifactWriter(root, 'test');
    writer.writeText('entry.js', 'original entry content', 'entry');
    writer.recordTree(['entry.js']);

    // Tamper with the file in the staging directory before validation
    writeFileSync(path.join(writer.stageDirectory, 'entry.js'), 'corrupted entry content', 'utf8');

    expect(() => writer.validate(['entry.js'])).toThrow(/failed validation: entry\.js/);
    writer.abort();
    expect(existsSync(writer.stageDirectory)).toBe(false);
    expect(existsSync(path.join(root, 'entry.js'))).toBe(false);
  });

  it('preserves the last successful output when an attempt cannot be validated', () => {
    const root = temporaryDirectory();
    const first = createForgeArtifactWriter(root, 'test');
    first.writeText('entry.js', 'old', 'entry');
    first.finalize(['entry.js']);

    const second = createForgeArtifactWriter(root, 'test');
    second.writeText('entry.js', 'new', 'entry');
    expect(() => second.validate(['missing.js'])).toThrow(/not recorded/);
    second.abort();
    expect(() => second.commit()).toThrow(/attempt has been aborted/);

    expect(readFileSync(path.join(root, 'entry.js'), 'utf8')).toBe('old');
    expect(JSON.parse(readFileSync(path.join(root, '.forge-artifact-manifest.json'), 'utf8'))).toMatchObject({
      complete: true,
      targetId: 'test',
    });
    expect(existsSync(second.stageDirectory)).toBe(false);
  });
});
