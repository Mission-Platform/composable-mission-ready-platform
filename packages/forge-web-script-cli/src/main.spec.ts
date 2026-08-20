import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runForgeWebScriptCli } from './main.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function project(source: string): Promise<{ readonly root: string; readonly entry: string }> {
  const root = await mkdtemp(path.join(tmpdir(), 'forge-web-script-cli-'));
  temporaryDirectories.push(root);
  const entry = path.join(root, 'main.fws');
  await writeFile(entry, source, 'utf8');
  return { root, entry };
}

async function readDirectoryIfPresent(directory: string): Promise<string[] | undefined> {
  try {
    return await readdir(directory);
  } catch {
    return undefined;
  }
}

function ioCapture(): {
  readonly io: { readonly stdout: (message: string) => void; readonly stderr: (message: string) => void };
  readonly stdout: string[];
  readonly stderr: string[];
} {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    io: { stdout: (message) => stdout.push(message), stderr: (message) => stderr.push(message) },
    stdout,
    stderr,
  };
}

describe('forge-web-script CLI', () => {
  it('checks a source graph without creating artifacts', async () => {
    const { root, entry } = await project('export fn answer() -> i32 { return 42; }');
    const capture = ioCapture();

    await expect(runForgeWebScriptCli(['check', entry, '--project-root', root], capture.io, root)).resolves.toBe(0);
    expect(capture.stdout).toEqual([`Checked ${entry}.`]);
    expect(capture.stderr).toEqual([]);
    const outputFiles = await readDirectoryIfPresent(path.join(root, 'dist'));
    expect(outputFiles).toBeUndefined();
  });

  it('writes exactly the deterministic six-file artifact set after compilation', async () => {
    const { root, entry } = await project('export fn answer() -> i32 { return 42; }');
    const outputDirectory = path.join(root, 'artifacts');
    const capture = ioCapture();

    await expect(
      runForgeWebScriptCli(['compile', entry, '--project-root', root, '--out-dir', outputDirectory], capture.io, root),
    ).resolves.toBe(0);
    expect(capture.stderr).toEqual([]);
    const outputFiles = await readdir(outputDirectory);
    expect(outputFiles.toSorted()).toEqual([
      'main.abi.json',
      'main.d.ts',
      'main.js',
      'main.map',
      'main.wasm',
      'main.wat',
    ]);
    expect(WebAssembly.validate(await readFile(path.join(outputDirectory, 'main.wasm')))).toBe(true);
    const wasm = await readFile(path.join(outputDirectory, 'main.wasm'));
    const instance = new WebAssembly.Instance(new WebAssembly.Module(wasm), {});
    expect((instance.exports.answer as () => number)()).toBe(42);
    const manifest = JSON.parse(await readFile(path.join(outputDirectory, 'main.abi.json'), 'utf8')) as unknown;
    expect(manifest).toMatchObject({
      languageVersion: '1.0',
      abiVersion: '1.2',
      exports: [{ name: 'answer', result: 'i32' }],
    });
  });

  it.each(['interpret', 'jit', 'aot'] as const)('keeps the Wasm artifact on the %s FWS VM path', async (vmMode) => {
    const { root, entry } = await project('export fn answer() -> i32 { return 42; }');
    const outputDirectory = path.join(root, vmMode);
    const capture = ioCapture();

    await expect(
      runForgeWebScriptCli(['compile', entry, '--out-dir', outputDirectory, '--vm-mode', vmMode], capture.io, root),
    ).resolves.toBe(0);
    expect(capture.stderr).toEqual([]);
    expect(WebAssembly.validate(await readFile(path.join(outputDirectory, 'main.wasm')))).toBe(true);
  });

  it('produces byte-for-byte identical artifacts across repeated CLI compiles', async () => {
    const { root, entry } = await project('export fn answer() -> i32 { return 42; }');
    const firstDirectory = path.join(root, 'first');
    const secondDirectory = path.join(root, 'second');

    await expect(
      runForgeWebScriptCli(['compile', entry, '--out-dir', firstDirectory], ioCapture().io, root),
    ).resolves.toBe(0);
    await expect(
      runForgeWebScriptCli(['compile', entry, '--out-dir', secondDirectory], ioCapture().io, root),
    ).resolves.toBe(0);

    for (const fileName of await readdir(firstDirectory)) {
      expect(await readFile(path.join(firstDirectory, fileName))).toEqual(
        await readFile(path.join(secondDirectory, fileName)),
      );
    }
  });

  it('returns a stable failure and writes no artifacts for invalid source', async () => {
    const { root, entry } = await project('export fn broken() -> i32 { return ; }');
    const outputDirectory = path.join(root, 'artifacts');
    const capture = ioCapture();

    await expect(
      runForgeWebScriptCli(['compile', entry, '--out-dir', outputDirectory], capture.io, root),
    ).resolves.toBe(1);
    expect(capture.stderr.join('\n')).toContain('[FWS-');
    const outputFiles = await readDirectoryIfPresent(outputDirectory);
    expect(outputFiles).toBeUndefined();
  });

  it('resolves relative source-module imports and compiles their reachable static exports', async () => {
    const { root, entry } = await project('import "./helper.fws" as helper; export fn main() -> i32 { return 1; }');
    await writeFile(path.join(root, 'helper.fws'), 'export fn helper() -> i32 { return 2; }', 'utf8');
    const outputDirectory = path.join(root, 'artifacts');
    const capture = ioCapture();

    const status = await runForgeWebScriptCli(
      [
        'compile',
        entry,
        '--project-root',
        root,
        '--link-mode',
        'static',
        '--optimization',
        'release',
        '-o',
        outputDirectory,
      ],
      capture.io,
      root,
    );
    expect(status, capture.stderr.join('\n')).toBe(0);
    const wasm = await readFile(path.join(outputDirectory, 'main.wasm'));
    expect(WebAssembly.Module.exports(new WebAssembly.Module(wasm)).map(({ name }) => name)).toContain('helper');
  });
});
