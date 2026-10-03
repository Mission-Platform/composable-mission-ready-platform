import { describe, expect, it } from 'vitest';

import { Cursor, parseLimits } from './binary-parser.js';
import { compileFlintWasm } from './emitter.js';
import { sha256ArtifactHash } from './hash.js';
import { verifyFlintWasmArtifact } from './verifier.js';

import type { FlintTargetFeatures, FlintWasmModule, FlintWasmSourceSpan } from './contracts.js';

const span: FlintWasmSourceSpan = { start: 0, end: 1, line: 1, column: 1, endLine: 1, endColumn: 2 };
const memory = {
  pageSize: 65_536,
  addressType: 'u32' as const,
  ownership: 'caller-owned' as const,
  stringEncoding: 'utf8' as const,
  byteArrayRepresentation: 'pointer-length' as const,
  allocatorExport: 'fws_alloc',
  deallocatorExport: 'fws_dealloc',
  reallocatorExport: 'fws_realloc',
};

const manifest = {
  exports: [],
  imports: [],
  requiredCapabilities: [],
  memory,
};
const metadata = { compilerVersion: 'test', optimization: 'debug' as const, sourceFiles: ['entry.flint'] };

function moduleWith(
  functions: FlintWasmModule['functions'],
  imports: FlintWasmModule['imports'] = [],
): FlintWasmModule {
  return { name: 'entry', imports, sourceImports: [], functions, span };
}

function backendFor(module: FlintWasmModule, metadataOverride = metadata, targetFeatures?: FlintTargetFeatures) {
  const result = compileFlintWasm({
    ir: module,
    optimizedIr: module,
    abi: {},
    links: {},
    metadata: metadataOverride,
    ...(targetFeatures === undefined ? {} : { targetFeatures }),
  });
  if (result.wasm === undefined) throw new Error('Expected wasm output from emission');
  return { ...result, wasm: result.wasm };
}

function exportedModule(): FlintWasmModule {
  return moduleWith([
    {
      name: 'answer',
      exported: true,
      parameters: [],
      result: { name: 'i32' },
      body: [{ kind: 'return', value: { kind: 'literal', value: 42, type: 'i32', span }, span }],
      span,
    },
  ]);
}

function importedModule(): FlintWasmModule {
  return moduleWith(
    [
      {
        name: 'currentTime',
        exported: true,
        parameters: [],
        result: { name: 'i64' },
        body: [{ kind: 'return', value: { kind: 'call', callee: 'now', arguments: [], span }, span }],
        span,
      },
    ],
    [{ capability: 'clock.now', alias: 'now', parameters: [], result: { name: 'i64' } }],
  );
}

function unsignedLeb(value: number): number[] {
  const result: number[] = [];
  let remaining = value;
  do {
    const byte = remaining & 0x7f;
    remaining >>>= 7;
    result.push(remaining === 0 ? byte : byte | 0x80);
  } while (remaining !== 0);
  return result;
}

function appendCustomSection(bytes: Uint8Array, name: string): Uint8Array {
  const nameBytes = new TextEncoder().encode(name);
  const payload = [...unsignedLeb(nameBytes.byteLength), ...nameBytes];
  return Uint8Array.from([...bytes, 0, ...unsignedLeb(payload.length), ...payload]);
}

describe('Forge Web Script Wasm artifact verifier', () => {
  it('uses the versioned SHA-256 artifact identity format', () => {
    expect(sha256ArtifactHash(new TextEncoder().encode('abc'))).toBe(
      'sha256-v1:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
  it('accepts a valid deterministic artifact with an exported function and checks both variants', () => {
    const backend = backendFor(exportedModule());
    expect(backend.wasm).toBeDefined();
    expect(WebAssembly.validate(backend.wasm)).toBe(true);
    const first = verifyFlintWasmArtifact({
      wasm: backend.wasm,
      unoptimizedWasm: backend.unoptimizedWasm,
      manifest: { ...manifest, exports: [{ name: 'answer', parameters: [], result: 'i32' }] },
      metadata,
      expectedContentHash: backend.contentHash,
    });
    const second = verifyFlintWasmArtifact({
      wasm: backend.wasm,
      manifest: { ...manifest, exports: [{ name: 'answer', parameters: [], result: 'i32' }] },
      metadata,
      expectedContentHash: backend.contentHash,
    });
    expect(first.verified).toBe(true);
    expect(first.checkedVariants).toEqual(['optimized', 'unoptimized']);
    expect(first.contentHash).toBe(second.contentHash);
    expect(first.diagnostics).toEqual([]);
  });

  it('rejects a content-hash mismatch even when the binary passes engine validation', () => {
    const backend = backendFor(exportedModule());
    expect(WebAssembly.validate(backend.wasm.buffer as ArrayBuffer)).toBe(true);
    const expectedContentHash = backend.contentHash === '00000000' ? 'ffffffff' : '00000000';
    const result = verifyFlintWasmArtifact({
      wasm: backend.wasm,
      manifest: { ...manifest, exports: [{ name: 'answer', parameters: [], result: 'i32' }] },
      metadata,
      expectedContentHash,
    });
    expect(result.verified).toBe(false);
    expect(result.diagnostics.some(({ code }) => code === 'FLINT-ARTIFACT-024')).toBe(true);
  });

  it('rejects unexpected exports and ABI signature mismatches on valid binaries', () => {
    const backend = backendFor(exportedModule());
    const unexpected = verifyFlintWasmArtifact({
      wasm: backend.wasm,
      manifest,
      metadata,
    });
    const wrongSignature = verifyFlintWasmArtifact({
      wasm: backend.wasm,
      manifest: { ...manifest, exports: [{ name: 'answer', parameters: [], result: 'f64' }] },
      metadata,
    });
    expect(unexpected.diagnostics.some(({ code }) => code === 'FLINT-ARTIFACT-007')).toBe(true);
    expect(wrongSignature.diagnostics.some(({ code }) => code === 'FLINT-ARTIFACT-008')).toBe(true);
  });

  it('rejects undeclared capability policy, feature, memory, and contract mismatches', () => {
    const backend = backendFor(importedModule());
    const importedManifest = {
      ...manifest,
      exports: [{ name: 'currentTime', parameters: [], result: 'i64' }],
      imports: [{ capability: 'clock.now', alias: 'now', function: { name: 'now', parameters: [], result: 'i64' } }],
      requiredCapabilities: ['clock.now'],
    };
    const denied = verifyFlintWasmArtifact({
      wasm: backend.wasm,
      manifest: importedManifest,
      metadata,
      policy: { allowedCapabilities: ['text.transform'] },
    });
    const featureMismatch = verifyFlintWasmArtifact({
      wasm: backend.wasm,
      manifest: importedManifest,
      metadata,
      targetFeatures: { simd: true },
    });
    const memoryMismatch = verifyFlintWasmArtifact({
      wasm: backend.wasm,
      manifest: { ...importedManifest, memory: { ...memory, minimumPages: 2 } },
      metadata,
    });
    const iteratorMismatch = verifyFlintWasmArtifact({
      wasm: backend.wasm,
      manifest: {
        ...importedManifest,
        iteratorDescriptors: [
          {
            id: 'Iterator<i64>',
            nextFunction: 'currentTime.next',
            elementType: 'i64',
            representation: 'descriptor-boundary' as const,
            ownership: 'borrowed' as const,
          },
        ],
      },
      metadata,
      iteratorExports: [],
    });
    const asyncMismatch = verifyFlintWasmArtifact({
      wasm: backend.wasm,
      manifest: {
        ...importedManifest,
        async: {
          capabilities: ['scheduler.microtask'],
          deterministic: true,
          taskIdRepresentation: 'u32',
          messageRepresentation: 'owned-bytes',
          ordering: 'sequence',
        },
      },
      metadata,
    });
    expect(denied.diagnostics.some(({ code }) => code === 'FLINT-ARTIFACT-004')).toBe(true);
    expect(featureMismatch.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'FLINT-ARTIFACT-020' }),
        expect.objectContaining({ code: 'FLINT-ARTIFACT-035' }),
      ]),
    );
    expect(memoryMismatch.diagnostics.some(({ code }) => code === 'FLINT-ARTIFACT-015')).toBe(true);
    expect(iteratorMismatch.diagnostics.some(({ code }) => code === 'FLINT-ARTIFACT-036')).toBe(true);
    expect(asyncMismatch.diagnostics.some(({ code }) => code === 'FLINT-ARTIFACT-038')).toBe(true);
  });

  it('rejects metadata mismatches and unrecognized custom sections while retaining engine validity', () => {
    const backend = backendFor(exportedModule());
    const forged = backend.wasm;
    const forgedMetadata = { ...metadata, sourceFiles: ['other.flint'] };
    expect(WebAssembly.validate(forged.buffer as ArrayBuffer)).toBe(true);
    const forgedResult = verifyFlintWasmArtifact({
      wasm: forged,
      manifest: { ...manifest, exports: [{ name: 'answer', parameters: [], result: 'i32' }] },
      metadata: forgedMetadata,
    });
    const extraSection = appendCustomSection(backend.wasm, 'fws.unknown');
    expect(WebAssembly.validate(extraSection.buffer as ArrayBuffer)).toBe(true);
    const extraResult = verifyFlintWasmArtifact({
      wasm: extraSection,
      manifest: { ...manifest, exports: [{ name: 'answer', parameters: [], result: 'i32' }] },
      metadata,
    });
    expect(forgedResult.diagnostics.some(({ code }) => code === 'FLINT-ARTIFACT-022')).toBe(true);
    expect(extraResult.diagnostics.some(({ code }) => code === 'FLINT-ARTIFACT-019')).toBe(true);
  });

  it('accepts emitter-normalized source-file metadata ordering', () => {
    const unorderedMetadata = { ...metadata, sourceFiles: ['z.flint', 'a.flint'] };
    const backend = backendFor(exportedModule(), unorderedMetadata);
    const result = verifyFlintWasmArtifact({
      wasm: backend.wasm,
      manifest: { ...manifest, exports: [{ name: 'answer', parameters: [], result: 'i32' }] },
      metadata: unorderedMetadata,
      expectedContentHash: backend.contentHash,
    });
    expect(result.verified).toBe(true);
  });

  it('rejects a mutated binary after engine validation fails', () => {
    const backend = backendFor(exportedModule());
    const mutated = [...backend.wasm];
    mutated[0] = 0xff;
    const result = verifyFlintWasmArtifact({ wasm: mutated, manifest, metadata });
    expect(result.verified).toBe(false);
    expect(result.diagnostics.some(({ code }) => code === 'FLINT-ARTIFACT-001')).toBe(true);
  });

  it('accepts and verifies a valid deterministic SIMD artifact when simd is enabled', () => {
    const simdModule = moduleWith([
      {
        name: 'simdCheck',
        exported: true,
        parameters: [],
        result: { name: 'i32' },
        body: [
          {
            kind: 'let',
            name: 'v',
            type: { name: 'v128', span },
            value: {
              kind: 'call',
              callee: 'fws_simd_i8x16_splat',
              standardLibrary: 'simd-i8x16-splat',
              arguments: [{ kind: 'literal', value: 1, type: 'i32', span }],
              span,
            },
            span,
          },
          {
            kind: 'return',
            value: {
              kind: 'call',
              callee: 'fws_simd_i8x16_bitmask',
              standardLibrary: 'simd-i8x16-bitmask',
              arguments: [{ kind: 'identifier', name: 'v', span }],
              span,
            },
            span,
          },
        ],
        span,
      },
    ]);

    const backend = backendFor(simdModule, metadata, { simd: true });
    expect(backend.wasm).toBeDefined();
    expect(backend.targetFeatures.simd).toBe(true);
    expect(WebAssembly.validate(backend.wasm)).toBe(true);

    const verification = verifyFlintWasmArtifact({
      wasm: backend.wasm,
      unoptimizedWasm: backend.unoptimizedWasm,
      manifest: {
        ...manifest,
        exports: [{ name: 'simdCheck', parameters: [], result: 'i32' }],
        targetFeatures: { simd: true },
      },
      metadata: { ...metadata, targetFeatures: { simd: true } },
      targetFeatures: { simd: true },
      expectedContentHash: backend.contentHash,
    });
    expect(verification.verified).toBe(true);
    expect(verification.diagnostics).toEqual([]);
  });

  it('safely decodes 64-bit LEB128 integers without floating point precision truncation', () => {
    // 64-bit integer exceeding 2^53 - 1 ((1n << 56n) | 1n) encoded in LEB128:
    // In 7-bit chunks:
    // byte 0: 0x01 | 0x80 = 0x81
    // bytes 1..7: 0x80
    // byte 8: 0x01
    const expectedValue = (1n << 56n) | 1n;
    const lebBytes = new Uint8Array([0x81, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x01]);
    const cursor = new Cursor(lebBytes);
    const value = cursor.leb64(10);
    expect(value).toBe(expectedValue);

    // Test parseLimits with memory64 flag (flags = 0x04)
    const memory64Bytes = new Uint8Array([
      0x04, // memory64 = true, hasMaximum = false
      ...lebBytes,
    ]);
    const parsed = parseLimits(new Cursor(memory64Bytes));
    expect(parsed.memory64).toBe(true);
    expect(parsed.minimum).toBe(expectedValue);
  });
});
