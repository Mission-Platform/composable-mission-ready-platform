import { describe, expect, it } from 'vitest';

import { compileForgeWebScriptWasm } from './emitter.js';
import { verifyForgeWebScriptWasmArtifact } from './verifier.js';

import type {
  ForgeWebScriptTargetFeatures,
  ForgeWebScriptWasmModule,
  ForgeWebScriptWasmSourceSpan,
} from './contracts.js';

const span: ForgeWebScriptWasmSourceSpan = { start: 0, end: 1, line: 1, column: 1, endLine: 1, endColumn: 2 };
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
const metadata = { compilerVersion: 'test', optimization: 'debug' as const, sourceFiles: ['entry.fws'] };

function moduleWith(
  functions: ForgeWebScriptWasmModule['functions'],
  imports: ForgeWebScriptWasmModule['imports'] = [],
): ForgeWebScriptWasmModule {
  return { name: 'entry', imports, sourceImports: [], functions, span };
}

function backendFor(
  module: ForgeWebScriptWasmModule,
  metadataOverride = metadata,
  targetFeatures?: ForgeWebScriptTargetFeatures,
) {
  return compileForgeWebScriptWasm({
    ir: module,
    optimizedIr: module,
    abi: {},
    links: {},
    metadata: metadataOverride,
    ...(targetFeatures === undefined ? {} : { targetFeatures }),
  });
}

function exportedModule(): ForgeWebScriptWasmModule {
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

function importedModule(): ForgeWebScriptWasmModule {
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
  it('accepts a valid deterministic artifact with an exported function and checks both variants', () => {
    const backend = backendFor(exportedModule());
    expect(backend.wasm).toBeDefined();
    expect(WebAssembly.validate(backend.wasm!)).toBe(true);
    const first = verifyForgeWebScriptWasmArtifact({
      wasm: backend.wasm!,
      unoptimizedWasm: backend.unoptimizedWasm,
      manifest: { ...manifest, exports: [{ name: 'answer', parameters: [], result: 'i32' }] },
      metadata,
      expectedContentHash: backend.contentHash,
    });
    const second = verifyForgeWebScriptWasmArtifact({
      wasm: backend.wasm!,
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
    expect(WebAssembly.validate(backend.wasm!.buffer as ArrayBuffer)).toBe(true);
    const expectedContentHash = backend.contentHash === '00000000' ? 'ffffffff' : '00000000';
    const result = verifyForgeWebScriptWasmArtifact({
      wasm: backend.wasm!,
      manifest: { ...manifest, exports: [{ name: 'answer', parameters: [], result: 'i32' }] },
      metadata,
      expectedContentHash,
    });
    expect(result.verified).toBe(false);
    expect(result.diagnostics.some(({ code }) => code === 'FWS-ARTIFACT-024')).toBe(true);
  });

  it('rejects unexpected exports and ABI signature mismatches on valid binaries', () => {
    const backend = backendFor(exportedModule());
    const unexpected = verifyForgeWebScriptWasmArtifact({
      wasm: backend.wasm!,
      manifest,
      metadata,
    });
    const wrongSignature = verifyForgeWebScriptWasmArtifact({
      wasm: backend.wasm!,
      manifest: { ...manifest, exports: [{ name: 'answer', parameters: [], result: 'f64' }] },
      metadata,
    });
    expect(unexpected.diagnostics.some(({ code }) => code === 'FWS-ARTIFACT-007')).toBe(true);
    expect(wrongSignature.diagnostics.some(({ code }) => code === 'FWS-ARTIFACT-008')).toBe(true);
  });

  it('rejects undeclared capability policy, feature, memory, and contract mismatches', () => {
    const backend = backendFor(importedModule());
    const importedManifest = {
      ...manifest,
      exports: [{ name: 'currentTime', parameters: [], result: 'i64' }],
      imports: [{ capability: 'clock.now', alias: 'now', function: { name: 'now', parameters: [], result: 'i64' } }],
      requiredCapabilities: ['clock.now'],
    };
    const denied = verifyForgeWebScriptWasmArtifact({
      wasm: backend.wasm!,
      manifest: importedManifest,
      metadata,
      policy: { allowedCapabilities: ['text.transform'] },
    });
    const featureMismatch = verifyForgeWebScriptWasmArtifact({
      wasm: backend.wasm!,
      manifest: importedManifest,
      metadata,
      targetFeatures: { simd: true },
    });
    const memoryMismatch = verifyForgeWebScriptWasmArtifact({
      wasm: backend.wasm!,
      manifest: { ...importedManifest, memory: { ...memory, minimumPages: 2 } },
      metadata,
    });
    const iteratorMismatch = verifyForgeWebScriptWasmArtifact({
      wasm: backend.wasm!,
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
    const asyncMismatch = verifyForgeWebScriptWasmArtifact({
      wasm: backend.wasm!,
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
    expect(denied.diagnostics.some(({ code }) => code === 'FWS-ARTIFACT-004')).toBe(true);
    expect(featureMismatch.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'FWS-ARTIFACT-020' }),
        expect.objectContaining({ code: 'FWS-ARTIFACT-035' }),
      ]),
    );
    expect(memoryMismatch.diagnostics.some(({ code }) => code === 'FWS-ARTIFACT-015')).toBe(true);
    expect(iteratorMismatch.diagnostics.some(({ code }) => code === 'FWS-ARTIFACT-036')).toBe(true);
    expect(asyncMismatch.diagnostics.some(({ code }) => code === 'FWS-ARTIFACT-038')).toBe(true);
  });

  it('rejects metadata mismatches and unrecognized custom sections while retaining engine validity', () => {
    const backend = backendFor(exportedModule());
    const forged = backend.wasm!;
    const forgedMetadata = { ...metadata, sourceFiles: ['other.fws'] };
    expect(WebAssembly.validate(forged.buffer as ArrayBuffer)).toBe(true);
    const forgedResult = verifyForgeWebScriptWasmArtifact({
      wasm: forged,
      manifest: { ...manifest, exports: [{ name: 'answer', parameters: [], result: 'i32' }] },
      metadata: forgedMetadata,
    });
    const extraSection = appendCustomSection(backend.wasm!, 'fws.unknown');
    expect(WebAssembly.validate(extraSection.buffer as ArrayBuffer)).toBe(true);
    const extraResult = verifyForgeWebScriptWasmArtifact({
      wasm: extraSection,
      manifest: { ...manifest, exports: [{ name: 'answer', parameters: [], result: 'i32' }] },
      metadata,
    });
    expect(forgedResult.diagnostics.some(({ code }) => code === 'FWS-ARTIFACT-022')).toBe(true);
    expect(extraResult.diagnostics.some(({ code }) => code === 'FWS-ARTIFACT-019')).toBe(true);
  });

  it('accepts emitter-normalized source-file metadata ordering', () => {
    const unorderedMetadata = { ...metadata, sourceFiles: ['z.fws', 'a.fws'] };
    const backend = backendFor(exportedModule(), unorderedMetadata);
    const result = verifyForgeWebScriptWasmArtifact({
      wasm: backend.wasm!,
      manifest: { ...manifest, exports: [{ name: 'answer', parameters: [], result: 'i32' }] },
      metadata: unorderedMetadata,
      expectedContentHash: backend.contentHash,
    });
    expect(result.verified).toBe(true);
  });

  it('rejects a mutated binary after engine validation fails', () => {
    const backend = backendFor(exportedModule());
    const mutated = [...backend.wasm!];
    mutated[0] = 0xff;
    const result = verifyForgeWebScriptWasmArtifact({ wasm: mutated, manifest, metadata });
    expect(result.verified).toBe(false);
    expect(result.diagnostics.some(({ code }) => code === 'FWS-ARTIFACT-001')).toBe(true);
  });
});
