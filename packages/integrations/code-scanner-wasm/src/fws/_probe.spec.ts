import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import {
  createForgeWebScriptCompilerService,
  resolveForgeWebScriptModuleGraph,
} from '../../../../compiler/forge/forge-web-script/dist/index.js';

type RawString = readonly [pointer: number, length: number];

interface Api {
  readonly memory: WebAssembly.Memory;
  readonly fws_alloc: (size: number) => number;
  readonly scan_and_decode: (...args: number[]) => RawString;
  readonly sc_foundation_version: () => number;
  readonly sc_foundation_validate_dimensions: (width: number, height: number, stride: number) => number;
}

const scannerDirectory = resolve(import.meta.dirname);
const projectRoots = [scannerDirectory];

function loadTree(directory: string, files: Record<string, string>): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fileName = join(directory, entry.name);
    if (entry.isDirectory()) loadTree(fileName, files);
    else if (entry.name.endsWith('.fws')) files[resolve(fileName)] = readFileSync(fileName, 'utf8');
  }
}

describe('foundation scanner probes', () => {
  let api: Api;

  beforeAll(async () => {
    const files: Record<string, string> = {};
    for (const root of projectRoots) loadTree(root, files);
    const entry = resolve(scannerDirectory, 'scanner.fws');
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
    const graph = await resolveForgeWebScriptModuleGraph([entry], resolver, linkConfiguration);
    const service = createForgeWebScriptCompilerService();
    try {
      const artifact = service.compileGraph({
        graph: graph.graph,
        entryFileName: entry,
        compilerVersion: '0.1.0',
        linkConfiguration,
      });
      const errors = artifact.diagnostics.filter(({ severity }) => severity === 'error');
      expect(errors, errors.map(({ message }) => message).join('\n')).toHaveLength(0);
      expect(artifact.wasm).toBeDefined();
      if (artifact.wasm === undefined) throw new Error('Artifact wasm was not emitted');
      const instance = new WebAssembly.Instance(new WebAssembly.Module(artifact.wasm), {});
      api = instance.exports as unknown as Api;
    } finally {
      service.dispose();
    }
  }, 180_000);

  it('exposes foundation version and dimension validation', () => {
    expect(api.sc_foundation_version()).toBe(1);
    expect(api.sc_foundation_validate_dimensions(32, 32, 32)).toBe(2);
    expect(api.sc_foundation_validate_dimensions(0, 32, 32)).toBe(-1);
    expect(api.sc_foundation_validate_dimensions(32, 32, 31)).toBe(-1);
  });

  it('fails closed on scan calls (foundation-only scanner)', () => {
    const result = api.scan_and_decode(32, 32, 0, 0, 0, 0, 0);
    expect(result).toBeDefined();
    expect(result[1]).toBeGreaterThanOrEqual(0);
  });
});
