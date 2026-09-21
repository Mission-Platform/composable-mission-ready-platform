import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createFlintCompilerService,
  resolveFlintModuleGraph,
} from '../../../../flint/core/dist/index.js';

const fwsDirectory = resolve(import.meta.dirname);
const linkConfiguration = {
  projectRoots: [fwsDirectory],
  defaultLinkMode: 'static' as const,
  crossProjectLinkMode: 'static' as const,
  linkProfile: 'static' as const,
};

function loadTree(directory: string, files: Record<string, string>): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fileName = join(directory, entry.name);
    if (entry.isDirectory()) loadTree(fileName, files);
    else if (entry.name.endsWith('.fws') || entry.name.endsWith('.flint')) files[resolve(fileName)] = readFileSync(fileName, 'utf8');
  }
}

describe('QR decoder graph', () => {
  it('emits valid Wasm and executes the QR adapter failure path', async () => {
    const files: Record<string, string> = {};
    loadTree(fwsDirectory, files);
    const entry = resolve(fwsDirectory, 'decoders.flint');
    const resolver = {
      resolve(source: string, importer: string): string | undefined {
        const target = resolve(dirname(importer), source);
        return files[target] === undefined ? undefined : target;
      },
      load(fileName: string): string {
        return files[fileName] ?? '';
      },
    };
    const graph = await resolveFlintModuleGraph([entry], resolver, linkConfiguration);
    const service = createFlintCompilerService();
    try {
      const artifact = service.compileGraph({
        graph: graph.graph,
        entryFileName: entry,
        compilerVersion: '0.1.0',
        linkConfiguration,
      });
      const errors = artifact.diagnostics.filter(({ severity }) => severity === 'error');
      expect(errors, errors.map((error) => JSON.stringify(error)).join('\n')).toHaveLength(0);
      expect(artifact.wasm).toBeDefined();
      if (artifact.wasm === undefined) throw new Error('Artifact wasm was not emitted');
      const wasmModule = new WebAssembly.Module(artifact.wasm);
      expect(WebAssembly.Module.exports(wasmModule)).toEqual(
        expect.arrayContaining([
          { name: 'decode_qr_modules', kind: 'function' },
          { name: 'decode_qr_packed', kind: 'function' },
        ]),
      );
      const module = await import(`data:text/javascript;base64,${Buffer.from(artifact.esmSource).toString('base64')}`);
      const api = await module.load({
        'qr.decode.utf8': { matrix_decode_utf8: () => '', decode_utf8: () => '' },
      });
      expect(api.decode_qr_modules(21, new Array(441).fill(0), new Array(442).fill(0))).toBe('');
    } finally {
      service.dispose();
    }
  });
});
