import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createFlintCompilerService,
  resolveFlintModuleGraph,
} from '../../../../flint/core/dist/index.js';

const foundationDirectory = resolve(import.meta.dirname);
const projectRoots = [foundationDirectory];

function loadTree(directory: string, files: Record<string, string>): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fileName = join(directory, entry.name);
    if (entry.isDirectory()) loadTree(fileName, files);
    else if (entry.name.endsWith('.fws') || entry.name.endsWith('.flint')) files[resolve(fileName)] = readFileSync(fileName, 'utf8');
  }
}

describe('compiled ZXing foundation graph', () => {
  it('emits valid WebAssembly for deterministic foundation probes', async () => {
    const files: Record<string, string> = {};
    loadTree(foundationDirectory, files);
    const entry = resolve(foundationDirectory, 'foundation-entry.flint');
    const resolver = {
      resolve(source: string, importer: string): string | undefined {
        const target = resolve(dirname(importer), source);
        return files[target] === undefined ? undefined : target;
      },
      load(fileName: string): string {
        return files[fileName] ?? '';
      },
    };
    const linkConfiguration = {
      projectRoots,
      defaultLinkMode: 'static' as const,
      crossProjectLinkMode: 'static' as const,
      linkProfile: 'static' as const,
    };
    const graph = await resolveFlintModuleGraph([entry], resolver, linkConfiguration);
    const artifact = createFlintCompilerService().compileGraph({
      graph: graph.graph,
      entryFileName: entry,
      compilerVersion: '0.1.0',
      linkConfiguration,
    });
    const errors = artifact.diagnostics.filter(({ severity }) => severity === 'error');
    expect(errors, errors.map((error) => JSON.stringify(error)).join('\n')).toHaveLength(0);
    expect(artifact.wasm).toBeDefined();
    if (artifact.wasm === undefined) throw new Error('Artifact wasm was not emitted');
    const instance = new WebAssembly.Instance(new WebAssembly.Module(artifact.wasm));
    const exports = instance.exports as unknown as {
      readonly foundation_probe_dimensions: (width: number, height: number, stride: number) => number;
      readonly foundation_probe_gf256: (left: number, right: number) => number;
    };
    expect(exports.foundation_probe_dimensions(32, 32, 32)).toBe(2);
    expect(exports.foundation_probe_dimensions(0, 32, 32)).toBe(-1);
    expect(exports.foundation_probe_dimensions(4097, 1, 4097)).toBe(-1);
    expect(exports.foundation_probe_gf256(0, 0x83)).toBe(0);
    expect(exports.foundation_probe_gf256(1, 1)).toBe(1);
  });
});
