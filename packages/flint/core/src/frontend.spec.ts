import { describe, expect, it } from 'vitest';

import { FLINT_SECURITY_SOURCE_TOO_LARGE, MAX_SOURCE_INPUT_BYTES } from './diagnostics.ts';
import { prepareFlintFrontend } from './frontend.ts';

describe('Forge Web Script frontend/backend boundary', () => {
  it('returns checked IR, optimized IR, and ABI metadata without emitting runtime bytes', () => {
    const result = prepareFlintFrontend({
      source: 'export fn answer() -> i32 { return 40 + 2; }',
      fileName: '/workspace/answer.flint',
      compilerVersion: '0.1.0',
      optimization: 'release',
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.module?.kind).toBe('module');
    expect(result.ir?.kind).toBe('module');
    expect(result.optimizedIr?.kind).toBe('module');
    expect(result.unoptimizedSonIr?.schemaVersion).toBe('1.0');
    expect(result.sonIr?.nodes.length).toBeGreaterThan(0);
    expect(result.sonIr?.graphHash).toMatch(/^[0-9a-f]{8}$/);
    expect(result.sonOptimizationReport?.passes.map(({ name }) => name)).toEqual([
      'constant-propagation',
      'copy-propagation',
      'global-value-numbering',
      'cfg-simplification',
      'dead-node-elimination',
      'reachability-pruning',
      'purity-analysis',
      'inlining',
      'escape-analysis',
      'switch-density',
      'bounds-proof',
    ]);

    // The SoN graph is built from the unoptimized IR (which still has the
    // `40 + 2` binary node), so it starts out larger than the optimized graph.
    expect(result.unoptimizedSonIr?.nodes.length).toBeGreaterThan(result.sonIr?.nodes.length ?? 0);
    // Constant-propagation genuinely runs (not a no-op) and folds `40 + 2` to `42`.
    const constantPropagation = result.sonOptimizationReport?.passes.find(
      ({ name }) => name === 'constant-propagation',
    );
    expect(constantPropagation?.applied).toBeGreaterThan(0);
    // The backend-facing tree is derived from the optimized SoN, not from the
    // legacy tree-IR optimizer: the folded literal appears directly in the
    // compatibility-lowered `optimizedIr`, proving SoN drives the compiler path.
    expect(result.optimizedIr?.functions[0]?.body[0]).toMatchObject({
      kind: 'return',
      value: { kind: 'literal', value: 42 },
    });

    expect(result.optimizationReport?.mode).toBe('release');
    expect(result.abi?.exports).toEqual([{ name: 'answer', parameters: [], result: 'i32' }]);
    expect(result.sourceFiles).toEqual(['/workspace/answer.flint']);
    expect(result.links.linkedModules).toEqual([]);
  });

  it('prunes an unreferenced private function via SoN reachability and reflects it in optimizedIr', () => {
    const result = prepareFlintFrontend({
      source:
        'export fn used() -> i32 { return helper(); } fn helper() -> i32 { return 7; } fn dead() -> i32 { return 8; }',
      fileName: '/workspace/reachability.flint',
      compilerVersion: '0.1.0',
      optimization: 'release',
      requireExports: false,
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.optimizedIr?.functions.map(({ name }) => name).toSorted()).toEqual(['helper', 'used']);
    expect(result.sonIr?.functions.map(({ name }) => name).toSorted()).toEqual(['helper', 'used']);
    const reachabilityPruning = result.sonOptimizationReport?.passes.find(
      ({ name }) => name === 'reachability-pruning',
    );
    expect(reachabilityPruning?.applied).toBe(1);
  });

  it('keeps invalid programs in the diagnostic-only frontend path', () => {
    const result = prepareFlintFrontend({
      source: 'export fn broken() -> i32 { return true; }',
      fileName: '/workspace/broken.flint',
      compilerVersion: '0.1.0',
    });

    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.optimizedIr).toBeUndefined();
    expect(result.abi).toBeUndefined();
  });

  it('keeps frontend results deterministic for the same input', () => {
    const input = {
      source: 'export fn answer() -> i32 { return 42; }',
      fileName: '/workspace/answer.flint',
      compilerVersion: '0.1.0',
    } as const;

    const first = prepareFlintFrontend(input);
    const second = prepareFlintFrontend(input);

    expect(first).toEqual(second);
    expect(first.sonIr).toEqual(second.sonIr);
  });

  it('rejects source files exceeding MAX_SOURCE_INPUT_BYTES with FLINT-SECURITY-001', () => {
    const hugeSource = 'a'.repeat(MAX_SOURCE_INPUT_BYTES + 10);
    const result = prepareFlintFrontend({
      source: hugeSource,
      fileName: '/workspace/huge.flint',
      compilerVersion: '0.1.0',
    });

    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0]?.code).toBe(FLINT_SECURITY_SOURCE_TOO_LARGE);
    expect(result.module).toBeUndefined();
    expect(result.optimizedIr).toBeUndefined();
  });

  it('rejects non-ASCII oversized sources based on actual byte count, not character count', () => {
    // Each emoji (e.g., '😀') is 1 character but 4 bytes in UTF-8.
    // Create a source that is under the character limit but exceeds the byte limit.
    // MAX_SOURCE_INPUT_BYTES = 16_777_216 bytes
    // If we use 4-byte characters, we need 16_777_216 / 4 = 4_194_304 characters to exceed the limit.
    // We'll create a source with 4_194_305 emoji characters (16_777_220 bytes, exceeding the 16 MiB limit).
    const emojiChar = '😀'; // 4 bytes in UTF-8
    const charCount = Math.floor(MAX_SOURCE_INPUT_BYTES / 4) + 1; // This will exceed the byte limit
    const hugeNonAsciiSource = emojiChar.repeat(charCount);

    const result = prepareFlintFrontend({
      source: hugeNonAsciiSource,
      fileName: '/workspace/huge-emoji.flint',
      compilerVersion: '0.1.0',
    });

    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0]?.code).toBe(FLINT_SECURITY_SOURCE_TOO_LARGE);
    expect(result.module).toBeUndefined();
    expect(result.optimizedIr).toBeUndefined();
  });

  it('evaluates passing top-level comptime static assertions before lowering', () => {
    const result = prepareFlintFrontend({
      source: `
        struct BytePacket {
          id: u8;
          offset: i8;
        }

        comptime {
          assert(size_of("BytePacket") == 2);
          assert(align_of("BytePacket") == 1);
        }

        export fn getPacketSize() -> u32 {
          return 2;
        }
      `,
      fileName: '/workspace/packet.flint',
      compilerVersion: '0.1.0',
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.optimizedIr).toBeDefined();
    expect(result.abi?.exports).toEqual([{ name: 'getPacketSize', parameters: [], result: 'u32' }]);
  });

  it('emits FLINT-COMPTIME-ASSERT when a top-level comptime assertion fails', () => {
    const result = prepareFlintFrontend({
      source: `
        struct BytePacket {
          id: u8;
          offset: i8;
        }

        comptime {
          assert(size_of("BytePacket") == 10, "BytePacket must be 10 bytes");
        }

        export fn getPacketSize() -> u32 {
          return 2;
        }
      `,
      fileName: '/workspace/failing_packet.flint',
      compilerVersion: '0.1.0',
    });

    expect(result.diagnostics.length).toBeGreaterThan(0);
    const assertDiag = result.diagnostics.find((d) => d.code === 'FLINT-COMPTIME-ASSERT');
    expect(assertDiag).toBeDefined();
    expect(assertDiag?.message).toBe('BytePacket must be 10 bytes');
    expect(result.optimizedIr).toBeUndefined();
  });
});
