import { describe, expect, it } from 'vitest';

import {
  forgeWebScriptSoNPath,
  forgeWebScriptWatCacheKey,
  persistForgeWebScriptSoN,
  persistForgeWebScriptWat,
  readForgeWebScriptSoN,
  type ForgeWebScriptWatCache,
} from './cache.ts';
import { compileForgeWebScript } from './compiler.ts';
import { prepareForgeWebScriptFrontend } from './frontend.ts';
import { serializeForgeWebScriptSoN } from './son-cache.ts';

describe('Forge Web Script WAT cache', () => {
  it('keys graph, link mode, compiler, and optimization deterministically', () => {
    const base = {
      compilerVersion: '0.1.0',
      optimization: 'release' as const,
      graphHash: 'graph-a',
      sourceGraph: [
        { fileName: 'b.fws', moduleId: 'b', contentHash: 'b' },
        { fileName: 'a.fws', moduleId: 'a', contentHash: 'a' },
      ],
      linkConfiguration: { crossProjectLinkMode: 'static', defaultLinkMode: 'static' },
    };
    expect(forgeWebScriptWatCacheKey(base)).toBe(
      forgeWebScriptWatCacheKey({ ...base, sourceGraph: base.sourceGraph.toReversed() }),
    );
    expect(forgeWebScriptWatCacheKey(base)).not.toBe(forgeWebScriptWatCacheKey({ ...base, optimization: 'debug' }));
    expect(forgeWebScriptWatCacheKey(base)).not.toBe(forgeWebScriptWatCacheKey({ ...base, graphHash: 'graph-b' }));
    expect(forgeWebScriptWatCacheKey(base)).not.toBe(
      forgeWebScriptWatCacheKey({ ...base, targetFeatures: { threads: true, atomics: true } }),
    );
    expect(forgeWebScriptWatCacheKey(base)).not.toBe(
      forgeWebScriptWatCacheKey({ ...base, sonSchemaVersion: '1.0', sonGraphHash: 'son-a' }),
    );
    expect(forgeWebScriptWatCacheKey(base)).not.toBe(
      forgeWebScriptWatCacheKey({ ...base, memoryModel: 'region-arc-checked-linear' }),
    );
    expect(forgeWebScriptWatCacheKey(base)).not.toBe(
      forgeWebScriptWatCacheKey({ ...base, boundsChecks: 'excluded-by-profile' }),
    );
  });

  it('writes through the injected atomic writer and tolerates read-only roots', () => {
    const writes: string[] = [];
    const cache: ForgeWebScriptWatCache = {
      root: '/tmp/forge-web-script',
      writeAtomic: (fileName, wat) => writes.push(`${fileName}:${wat}`),
    };
    expect(persistForgeWebScriptWat(cache, 'abcd', '(module)')).toBe('/tmp/forge-web-script/abcd.wat');
    expect(writes).toEqual(['/tmp/forge-web-script/abcd.wat:(module)']);
    expect(
      persistForgeWebScriptWat(
        {
          root: '/readonly',
          writeAtomic: () => {
            throw new Error('read-only');
          },
        },
        'abcd',
        '(module)',
      ),
    ).toBeUndefined();
    expect(persistForgeWebScriptWat(undefined, 'abcd', '(module)')).toBeUndefined();
  });

  it('persists compiler WAT without importing filesystem APIs into the core compiler', () => {
    const writes: string[] = [];
    const artifact = compileForgeWebScript({
      source: 'export fn answer() -> i32 { return 42; }',
      fileName: 'answer.fws',
      compilerVersion: '0.1.0',
      optimization: 'debug',
      watCache: { root: '/cache', writeAtomic: (fileName, contents) => writes.push(`${fileName}:${contents}`) },
    });
    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.watPath).toMatch(/^\/cache\/[0-9a-f]+\.wat$/);
    expect(writes).toHaveLength(3);
    expect(writes[0]).toMatch(/^\/cache\/[0-9a-f]+\.sonir\.json:/);
    expect(writes[2]).toContain('(module');
  });

  it('persists all four debug artifacts when the cache supplies an atomic binary writer', () => {
    const writes: string[] = [];
    const binaryWrites: string[] = [];
    const artifact = compileForgeWebScript({
      source: 'export fn answer() -> i32 { return 42; }',
      fileName: 'answer.fws',
      compilerVersion: '0.1.0',
      optimization: 'debug',
      watCache: {
        root: '/cache',
        writeAtomic: (fileName, contents) => writes.push(`${fileName}:${contents}`),
        writeBinaryAtomic: (fileName, contents) => binaryWrites.push(`${fileName}:${contents.byteLength}`),
      },
    });
    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.watPath).toMatch(/^\/cache\/[0-9a-f]+\.optimized\.wat$/);
    expect(artifact.unoptimizedWatPath).toMatch(/^\/cache\/[0-9a-f]+\.unoptimized\.wat$/);
    expect(artifact.optimizedWasmPath).toMatch(/^\/cache\/[0-9a-f]+\.optimized\.wasm$/);
    expect(artifact.unoptimizedWasmPath).toMatch(/^\/cache\/[0-9a-f]+\.unoptimized\.wasm$/);
    expect(writes).toHaveLength(4);
    expect(writes[0]).toMatch(/^\/cache\/[0-9a-f]+\.sonir\.json:/);
    expect(binaryWrites).toHaveLength(2);
  });

  it('round-trips deterministic SoN JSON and rejects malformed or stale cache data', () => {
    const frontend = prepareForgeWebScriptFrontend({
      source: 'export fn answer() -> i32 { return 42; }',
      fileName: 'answer.fws',
      compilerVersion: '0.1.0',
      optimization: 'release',
    });
    const module = frontend.sonIr!;
    const values = new Map<string, string>();
    const cache: ForgeWebScriptWatCache = {
      root: '/cache',
      writeAtomic: (fileName, contents) => values.set(fileName, contents),
      read: (fileName) => values.get(fileName),
    };
    expect(persistForgeWebScriptSoN(cache, 'abcd', module)).toBe('/cache/abcd.sonir.json');
    expect(readForgeWebScriptSoN(cache, 'abcd', { compilerVersion: '0.1.0', sourceHash: module.sourceHash })).toEqual(
      module,
    );
    expect(values.get(forgeWebScriptSoNPath(cache, 'abcd'))).toBe(serializeForgeWebScriptSoN(module));
    values.set('/cache/bad.sonir.json', '{not-json');
    expect(readForgeWebScriptSoN(cache, 'bad')).toBeUndefined();
    values.set('/cache/stale.sonir.json', serializeForgeWebScriptSoN({ ...module, compilerVersion: 'old' }));
    expect(readForgeWebScriptSoN(cache, 'stale', { compilerVersion: '0.1.0' })).toBeUndefined();
  });
});
