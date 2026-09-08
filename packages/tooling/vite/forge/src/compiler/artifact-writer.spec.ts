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

  it('normalizes compiled Vue modules to JavaScript extensions', () => {
    const root = temporaryDirectory();
    const writer = createForgeArtifactWriter(root, 'vue');
    mkdirSync(path.join(writer.stageDirectory, 'components/example'), { recursive: true });
    writeFileSync(
      path.join(writer.stageDirectory, 'index.js'),
      'import component from "./components/example/generated.js";\nexport { component };\n',
      'utf8',
    );
    writeFileSync(
      path.join(writer.stageDirectory, 'components/example/generated.js'),
      '//#region generated/components/example/example.vue\nexport default {};\n//#endregion\n',
      'utf8',
    );
    writer.recordTree(['index.js']);
    writer.finalize(['index.js']);

    expect(existsSync(path.join(root, 'components/example/example.js'))).toBe(true);
    expect(existsSync(path.join(root, 'components/example/generated.js'))).toBe(false);
    expect(readFileSync(path.join(root, 'index.js'), 'utf8')).toContain('./components/example/example.js');
    expect(JSON.parse(readFileSync(path.join(root, '.forge-artifact-manifest.json'), 'utf8')).artifacts).toEqual(
      expect.arrayContaining([expect.objectContaining({ fileName: 'components/example/example.js', kind: 'module' })]),
    );
  });

  it('publishes Vue script virtual modules under stable JavaScript names', () => {
    const root = temporaryDirectory();
    const writer = createForgeArtifactWriter(root, 'vue');
    const scriptModule = 'components/example/example.vue?vue&type=script&setup=true&lang.js';
    mkdirSync(path.join(writer.stageDirectory, 'components/example'), { recursive: true });
    writeFileSync(
      path.join(writer.stageDirectory, 'components/example/example.js'),
      `import script from './${scriptModule.slice(scriptModule.lastIndexOf('/') + 1)}';\nexport default script;\n`,
      'utf8',
    );
    writeFileSync(path.join(writer.stageDirectory, scriptModule), 'export default {};\n', 'utf8');

    writer.recordTree(['components/example/example.js']);
    writer.finalize(['components/example/example.js']);

    expect(existsSync(path.join(root, 'components/example/example.script.js'))).toBe(true);
    expect(existsSync(path.join(root, scriptModule))).toBe(false);
    expect(readFileSync(path.join(root, 'components/example/example.js'), 'utf8')).toContain('./example.script.js');
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
