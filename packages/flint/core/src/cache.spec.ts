import { describe, expect, it } from 'vitest';

import {
  flintSoNPath,
  flintWatCacheKey,
  persistFlintSoN,
  persistFlintWat,
  pruneOrphanedFlintCacheFiles,
  pruneStaleFlintCache,
  readFlintCacheIndex,
  readFlintSoN,
  type FlintWatCache,
} from './cache.ts';
import { compileFlint } from './compiler.ts';
import { prepareFlintFrontend } from './frontend.ts';
import { serializeFlintSoN } from './son-cache.ts';

describe('Forge Web Script WAT cache', () => {
  it('keys graph, link mode, compiler, and optimization deterministically', () => {
    const base = {
      compilerVersion: '0.1.0',
      optimization: 'release' as const,
      graphHash: 'graph-a',
      sourceGraph: [
        { fileName: 'b.flint', moduleId: 'b', contentHash: 'b' },
        { fileName: 'a.flint', moduleId: 'a', contentHash: 'a' },
      ],
      linkConfiguration: { crossProjectLinkMode: 'static', defaultLinkMode: 'static' },
    };
    expect(flintWatCacheKey(base)).toBe(flintWatCacheKey({ ...base, sourceGraph: base.sourceGraph.toReversed() }));
    expect(flintWatCacheKey(base)).not.toBe(flintWatCacheKey({ ...base, optimization: 'debug' }));
    expect(flintWatCacheKey(base)).not.toBe(flintWatCacheKey({ ...base, graphHash: 'graph-b' }));
    expect(flintWatCacheKey(base)).not.toBe(
      flintWatCacheKey({ ...base, targetFeatures: { threads: true, atomics: true } }),
    );
    expect(flintWatCacheKey(base)).not.toBe(
      flintWatCacheKey({ ...base, sonSchemaVersion: '1.0', sonGraphHash: 'son-a' }),
    );
    expect(flintWatCacheKey(base)).not.toBe(flintWatCacheKey({ ...base, memoryModel: 'region-arc-checked-linear' }));
    expect(flintWatCacheKey(base)).not.toBe(flintWatCacheKey({ ...base, boundsChecks: 'excluded-by-profile' }));
  });

  it('writes through the injected atomic writer and tolerates read-only roots', () => {
    const writes: string[] = [];
    const cache: FlintWatCache = {
      root: '/tmp/forge-web-script',
      writeAtomic: (fileName, wat) => writes.push(`${fileName}:${wat}`),
    };
    expect(persistFlintWat(cache, 'abcd', '(module)')).toBe('/tmp/forge-web-script/abcd.wat');
    expect(writes).toEqual(['/tmp/forge-web-script/abcd.wat:(module)']);
    expect(
      persistFlintWat(
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
    expect(persistFlintWat(undefined, 'abcd', '(module)')).toBeUndefined();
  });

  it('persists compiler WAT without importing filesystem APIs into the core compiler', () => {
    const writes: string[] = [];
    const artifact = compileFlint({
      source: 'export fn answer() -> i32 { return 42; }',
      fileName: 'answer.flint',
      compilerVersion: '0.1.0',
      optimization: 'debug',
      watCache: { root: '/cache', writeAtomic: (fileName, contents) => writes.push(`${fileName}:${contents}`) },
    });
    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.watPath).toMatch(/^\/cache\/[0-9a-f]+\.wat$/);
    expect(writes).toHaveLength(4);
    expect(writes[0]).toMatch(/^\/cache\/[0-9a-f]+\.sonir\.json:/);
    expect(writes[2]).toContain('(module');
    expect(writes[3]).toMatch(/^\/cache\/\.flint-cache-index\.json:/);
  });

  it('persists all four debug artifacts when the cache supplies an atomic binary writer', () => {
    const writes: string[] = [];
    const binaryWrites: string[] = [];
    const artifact = compileFlint({
      source: 'export fn answer() -> i32 { return 42; }',
      fileName: 'answer.flint',
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
    expect(writes).toHaveLength(5);
    expect(writes[0]).toMatch(/^\/cache\/[0-9a-f]+\.sonir\.json:/);
    expect(binaryWrites).toHaveLength(2);
    expect(writes[4]).toMatch(/^\/cache\/\.flint-cache-index\.json:/);
  });

  it('round-trips deterministic SoN JSON and rejects malformed or stale cache data', () => {
    const frontend = prepareFlintFrontend({
      source: 'export fn answer() -> i32 { return 42; }',
      fileName: 'answer.flint',
      compilerVersion: '0.1.0',
      optimization: 'release',
    });
    if (frontend.sonIr === undefined) throw new Error('frontend.sonIr is undefined');
    const module = frontend.sonIr;
    const values = new Map<string, string>();
    const cache: FlintWatCache = {
      root: '/cache',
      writeAtomic: (fileName, contents) => values.set(fileName, contents),
      read: (fileName) => values.get(fileName),
    };
    expect(persistFlintSoN(cache, 'abcd', module)).toBe('/cache/abcd.sonir.json');
    expect(readFlintSoN(cache, 'abcd', { compilerVersion: '0.1.0', sourceHash: module.sourceHash })).toEqual(module);
    expect(values.get(flintSoNPath(cache, 'abcd'))).toBe(serializeFlintSoN(module));
    values.set('/cache/bad.sonir.json', '{not-json');
    expect(readFlintSoN(cache, 'bad')).toBeUndefined();
    values.set('/cache/stale.sonir.json', serializeFlintSoN({ ...module, compilerVersion: 'old' }));
    expect(readFlintSoN(cache, 'stale', { compilerVersion: '0.1.0' })).toBeUndefined();
  });

  it('prunes previous version artifacts and updates cache index on new version compilation', () => {
    const files = new Map<string, string>();
    const removed: string[] = [];
    const cache: FlintWatCache = {
      root: '/cache',
      writeAtomic: (fileName, contents) => files.set(fileName, contents),
      read: (fileName) => files.get(fileName),
      remove: (fileName) => {
        files.delete(fileName);
        removed.push(fileName);
      },
    };

    // First version write
    pruneStaleFlintCache(cache, 'module-a', 'key-v1', ['/cache/key-v1.wat', '/cache/key-v1.sonir.json']);
    expect(readFlintCacheIndex(cache)?.entries['module-a']?.key).toBe('key-v1');
    expect(removed).toEqual([]);

    // Second version write: should prune v1 artifacts
    pruneStaleFlintCache(cache, 'module-a', 'key-v2', ['/cache/key-v2.wat', '/cache/key-v2.sonir.json']);
    expect(readFlintCacheIndex(cache)?.entries['module-a']?.key).toBe('key-v2');
    expect(removed).toEqual(['/cache/key-v1.wat', '/cache/key-v1.sonir.json']);
  });

  it('prunes orphaned temp files and unindexed cache artifacts', () => {
    const files = new Map<string, string>([
      [
        '/cache/.flint-cache-index.json',
        JSON.stringify({ version: 1, entries: { 'mod-a': { key: 'a1', files: ['/cache/a1.wat'] } } }),
      ],
      ['/cache/a1.wat', '(module)'],
      ['/cache/orphaned.wat', '(module)'],
      ['/cache/temp.tmp', 'in-flight'],
    ]);
    const removed: string[] = [];
    const cache: FlintWatCache = {
      root: '/cache',
      writeAtomic: (fileName, contents) => files.set(fileName, contents),
      read: (fileName) => files.get(fileName),
      remove: (fileName) => {
        files.delete(fileName);
        removed.push(fileName);
      },
      listFiles: () => [...files.keys()],
    };

    const pruned = pruneOrphanedFlintCacheFiles(cache);
    expect(pruned).toContain('/cache/temp.tmp');
    expect(pruned).toContain('/cache/orphaned.wat');
    expect(files.has('/cache/a1.wat')).toBe(true);
    expect(files.has('/cache/temp.tmp')).toBe(false);
    expect(removed).toEqual(pruned);
  });
});
