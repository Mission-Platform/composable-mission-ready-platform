import { describe, expect, it } from 'vitest';

import { ForgeWebScriptTrap } from './traps.js';
import { prepareForgeWebScriptVmWasm } from './vm-wasm.js';
import {
  createForgeWebScriptVmAotArtifact,
  createForgeWebScriptVmExecutor,
  executeForgeWebScriptVmAotArtifact,
  runForgeWebScriptVmBootstrap,
} from './vm.js';

import type { ForgeWebScriptVmModule, ForgeWebScriptVmValue } from './vm.js';

const number = (value: number): ForgeWebScriptVmValue => ({ kind: 'number', type: 'i32', value });

const module: ForgeWebScriptVmModule = {
  format: 'forge-web-script-vm-module',
  version: '1.0',
  sourceHash: 'seed-module',
  functions: [
    {
      name: 'add',
      parameters: ['i32', 'i32'],
      result: 'i32',
      registers: 3,
      debugSpans: [],
      code: [
        { opcode: 'binary', operation: '+', destination: 2, left: 0, right: 1 },
        { opcode: 'return', source: 2 },
      ],
    },
    {
      name: 'choose',
      parameters: ['bool', 'i32', 'i32'],
      result: 'i32',
      registers: 3,
      debugSpans: [],
      code: [
        { opcode: 'branch', condition: 0, ifTrue: 1, ifFalse: 2 },
        { opcode: 'return', source: 1 },
        { opcode: 'return', source: 2 },
      ],
    },
    {
      name: 'memory',
      parameters: [],
      result: 'i32',
      registers: 2,
      debugSpans: [],
      code: [
        { opcode: 'const', constant: 0 },
        { opcode: 'store', address: 16, source: 0 },
        { opcode: 'load', destination: 1, address: 16, type: 'number', numberType: 'i32' },
        { opcode: 'return', source: 1 },
      ],
    },
    {
      name: 'clock',
      parameters: [],
      result: 'i32',
      registers: 1,
      debugSpans: [],
      code: [
        { opcode: 'call-capability', destination: 0, importName: 'now', arguments: [] },
        { opcode: 'return', source: 0 },
      ],
    },
  ],
  constants: [number(40), number(2)],
  aggregateLayouts: [],
  specializations: [],
  capabilityImports: [{ name: 'now', capability: 'clock.now', parameters: [], result: 'i32' }],
  memory: {
    pageSize: 65_536,
    addressType: 'u32',
    allocatorExport: 'fws_alloc',
    deallocatorExport: 'fws_dealloc',
    reallocatorExport: 'fws_realloc',
  },
};

const artifactModule: ForgeWebScriptVmModule = {
  ...module,
  sourceHash: 'artifact-module',
  functions: [
    {
      name: 'bytes',
      parameters: [],
      result: 'i32',
      registers: 7,
      debugSpans: [],
      code: [
        { opcode: 'const', destination: 0, constant: 2 },
        { opcode: 'const', destination: 1, constant: 1 },
        { opcode: 'const', destination: 2, constant: 0 },
        { opcode: 'alloc', destination: 3, size: 1 },
        { opcode: 'write-bytes', pointer: 3, source: 0 },
        { opcode: 'bytes-from-memory', destination: 4, pointer: 3, length: 1 },
        { opcode: 'len', destination: 5, source: 4 },
        { opcode: 'byte-at', destination: 6, source: 4, index: 2 },
        { opcode: 'return', source: 6 },
      ],
    },
    {
      name: 'aggregate',
      parameters: [],
      result: 'Payload',
      registers: 5,
      debugSpans: [],
      code: [
        { opcode: 'const', destination: 0, constant: 2 },
        { opcode: 'const', destination: 1, constant: 1 },
        { opcode: 'alloc', destination: 2, size: 1 },
        { opcode: 'write-bytes', pointer: 2, source: 0 },
        { opcode: 'aggregate-from-memory', destination: 3, layout: 'Payload', pointer: 2, length: 1 },
        { opcode: 'return', source: 3 },
      ],
    },
    {
      name: 'bytesArtifact',
      parameters: [],
      result: 'bytes',
      registers: 4,
      debugSpans: [],
      code: [
        { opcode: 'const', destination: 0, constant: 2 },
        { opcode: 'const', destination: 1, constant: 1 },
        { opcode: 'alloc', destination: 2, size: 1 },
        { opcode: 'write-bytes', pointer: 2, source: 0 },
        { opcode: 'bytes-from-memory', destination: 3, pointer: 2, length: 1 },
        { opcode: 'return', source: 3 },
      ],
    },
  ],
  constants: [
    number(1),
    number(2),
    { kind: 'aggregate', layout: 'Payload', bytes: new Uint8Array([7, 9]), ownership: 'owned' },
  ],
};

describe('Forge Web Script VM', () => {
  it('has equivalent interpreter, JIT, and AOT results', () => {
    const executor = createForgeWebScriptVmExecutor({ compilerVersion: 'test', jitThreshold: 1 });
    const arguments_ = [number(40), number(2)];
    const results = (['interpret', 'jit', 'aot'] as const).map((mode) =>
      executor.execute(module, 'add', arguments_, { mode }),
    );

    expect(results.map(({ value }) => value)).toEqual([number(42), number(42), number(42)]);
    expect(results.map(({ memory }) => memory.byteLength)).toEqual([65_536, 65_536, 65_536]);
    expect(results.map(({ steps }) => steps)).toEqual([2, 2, 2]);
    expect(results.map(({ mode }) => mode)).toEqual(['interpret', 'jit', 'aot']);
    expect(executor.getJitCache?.().entries.add).toMatchObject({ mode: 'jit', sourceHash: 'seed-module' });
  });

  it('executes branches, memory operations, and declared capabilities', () => {
    const executor = createForgeWebScriptVmExecutor();
    expect(
      executor.execute(module, 'choose', [{ kind: 'bool', value: true }, number(1), number(2)], { mode: 'interpret' })
        .value,
    ).toEqual(number(1));
    expect(executor.execute(module, 'memory', [], { mode: 'jit' }).value).toEqual(number(40));
    expect(
      executor.execute(module, 'clock', [], {
        mode: 'aot',
        capabilities: { now: () => number(7) },
      }).value,
    ).toEqual(number(7));
  });

  it.each(['interpret', 'jit', 'aot'] as const)('constructs and reads variable-size bytes in %s mode', (mode) => {
    const result = runForgeWebScriptVmBootstrap(artifactModule, 'bytes', [], mode);
    expect(result.value).toEqual(number(9));
    expect(result.memory.slice(8, 10)).toEqual(new Uint8Array([7, 9]));
  });

  it('rejects artifact opcodes during WASM lowering and falls back consistently', () => {
    expect(() => prepareForgeWebScriptVmWasm(artifactModule, { compilerVersion: 'test' })).toThrow(
      "VM WASM lowering failed: unsupported opcode 'alloc'",
    );

    const interpreted = createForgeWebScriptVmExecutor({ compilerVersion: 'test' }).execute(
      artifactModule,
      'bytesArtifact',
      [],
      { mode: 'interpret' },
    );
    const aotExecutor = createForgeWebScriptVmExecutor({ compilerVersion: 'test' });
    expect(() => aotExecutor.prepare(artifactModule, 'aot')).toThrow(
      "VM WASM lowering failed: unsupported opcode 'alloc'",
    );
    const aot = aotExecutor.execute(artifactModule, 'bytesArtifact', [], { mode: 'aot' });

    const jitExecutor = createForgeWebScriptVmExecutor({ compilerVersion: 'test', jitThreshold: 2 });
    expect(jitExecutor.execute(artifactModule, 'bytesArtifact', [], { mode: 'jit' }).value).toEqual(interpreted.value);
    const jit = jitExecutor.execute(artifactModule, 'bytesArtifact', [], { mode: 'jit' });

    expect(aot.value).toEqual(interpreted.value);
    expect(jit.value).toEqual(interpreted.value);
    expect(aot.memory).toEqual(interpreted.memory);
    expect(jit.memory).toEqual(interpreted.memory);
    expect(jit.mode).toBe('jit');
  });

  it.each(['interpret', 'jit', 'aot'] as const)(
    'copies a bounded memory range into an aggregate in %s mode',
    (mode) => {
      const result = runForgeWebScriptVmBootstrap(artifactModule, 'aggregate', [], mode);
      expect(result.value).toEqual({
        kind: 'aggregate',
        layout: 'Payload',
        bytes: new Uint8Array([7, 9]),
        ownership: 'owned',
      });
    },
  );

  it('executes the prepared WASM backend with reusable state', () => {
    const prepared = prepareForgeWebScriptVmWasm(module, { compilerVersion: 'test' });
    const interpreted = createForgeWebScriptVmExecutor().execute(module, 'add', [number(8), number(5)], {
      mode: 'interpret',
    });
    const compiled = prepared.execute('add', [number(8), number(5)]);
    expect(compiled.value).toEqual(interpreted.value);
    expect(prepared.metadata.backend).toBe('wasm');
    expect(prepared.metadata.instancePolicy).toBe('reusable-with-reset');
    expect(prepared.execute('memory', []).value).toEqual(number(40));
    prepared.reset();
    expect(prepared.execute('memory', []).value).toEqual(number(40));
  });

  it('caches prepared JIT and AOT contexts and preserves mode labels', () => {
    const thresholdExecutor = createForgeWebScriptVmExecutor({ compilerVersion: 'test', jitThreshold: 2 });
    thresholdExecutor.execute(module, 'add', [number(1), number(2)], { mode: 'jit' });
    expect(thresholdExecutor.getJitCache?.().entries.add).toBeUndefined();
    thresholdExecutor.execute(module, 'add', [number(3), number(4)], { mode: 'jit' });
    expect(thresholdExecutor.getJitCache?.().entries.add).toBeDefined();

    const executor = createForgeWebScriptVmExecutor({ compilerVersion: 'test', jitThreshold: 2 });
    const jitFirst = executor.prepare(module, 'jit');
    const jitSecond = executor.prepare(module, 'jit');
    expect(jitSecond).toBe(jitFirst);
    expect(jitFirst.mode).toBe('jit');
    expect(jitFirst.execute('add', [number(2), number(3)]).mode).toBe('jit');
    expect(jitFirst.execute('add', [number(4), number(5)]).value).toEqual(number(9));

    const artifact = createForgeWebScriptVmAotArtifact(module, 'test');
    const aotFirst = executor.prepare(module, 'aot', { aotArtifact: artifact });
    const aotSecond = executor.prepare(module, 'aot', { aotArtifact: artifact });
    expect(aotSecond).toBe(aotFirst);
    expect(aotFirst.mode).toBe('aot');
    expect(aotFirst.execute('add', [number(6), number(7)]).mode).toBe('aot');
    expect(aotFirst.execute('add', [number(8), number(9)]).value).toEqual(number(17));
    expect(() =>
      executor.prepare(module, 'aot', {
        aotArtifact: createForgeWebScriptVmAotArtifact(module, 'different-compiler'),
      }),
    ).toThrow('compiler version');
  });

  it('creates reproducible AOT artifacts and runs the bootstrap entrypoint', () => {
    const first = createForgeWebScriptVmAotArtifact(module, 'seed-compiler');
    const second = createForgeWebScriptVmAotArtifact(module, 'seed-compiler');
    const changed = createForgeWebScriptVmAotArtifact({ ...module, sourceHash: 'changed' }, 'seed-compiler');
    expect(first).toEqual(second);
    expect(runForgeWebScriptVmBootstrap(module, 'add', [number(1), number(2)], 'interpret').value).toEqual(number(3));
    expect(changed).not.toEqual(first);
    expect(() => createForgeWebScriptVmExecutor().execute(module, 'clock', [], { mode: 'interpret' })).toThrowError(
      ForgeWebScriptTrap,
    );
    expect(() =>
      executeForgeWebScriptVmAotArtifact({ ...first, reproducibilityHash: 'tampered' }, 'add', [number(1), number(2)]),
    ).toThrowError(ForgeWebScriptTrap);
  });

  it('traps on maxSteps overrun', () => {
    const executor = createForgeWebScriptVmExecutor();
    const arguments_ = [number(40), number(2)];
    expect(() => executor.execute(module, 'add', arguments_, { mode: 'interpret', maxSteps: 1 })).toThrow(
      ForgeWebScriptTrap,
    );
  });

  it('accepts a valid JIT cache produced by the same executor', () => {
    const executor = createForgeWebScriptVmExecutor({ compilerVersion: 'test-v1', jitThreshold: 1 });
    const arguments_ = [number(40), number(2)];
    // First execution builds the cache
    executor.execute(module, 'add', arguments_, { mode: 'jit' });
    const cache = executor.getJitCache?.();
    expect(cache).toBeDefined();
    expect(cache?.compilerVersion).toBe('test-v1');
    expect(cache?.entries.add).toBeDefined();

    // Second executor with same version accepts the cache
    const executor2 = createForgeWebScriptVmExecutor({ compilerVersion: 'test-v1' });
    const result = executor2.execute(module, 'add', arguments_, { mode: 'interpret', jitCache: cache });
    expect(result.value).toEqual(number(42));
  });

  it('rejects JIT cache with mismatched compiler version', () => {
    const executor = createForgeWebScriptVmExecutor({ compilerVersion: 'v1', jitThreshold: 1 });
    const arguments_ = [number(40), number(2)];
    executor.execute(module, 'add', arguments_, { mode: 'jit' });
    const cache = executor.getJitCache?.();

    // Executor with different version rejects the cache
    const executor2 = createForgeWebScriptVmExecutor({ compilerVersion: 'v2' });
    expect(() => executor2.execute(module, 'add', arguments_, { mode: 'interpret', jitCache: cache })).toThrow(
      ForgeWebScriptTrap,
    );
  });

  it('rejects JIT cache with mismatched source hash', () => {
    const executor = createForgeWebScriptVmExecutor({ compilerVersion: 'test', jitThreshold: 1 });
    const arguments_ = [number(40), number(2)];
    executor.execute(module, 'add', arguments_, { mode: 'jit' });
    const cache = executor.getJitCache?.();

    // Module with different source hash rejects the cache
    const changedModule = { ...module, sourceHash: 'different-hash' };
    const executor2 = createForgeWebScriptVmExecutor({ compilerVersion: 'test' });
    expect(() => executor2.execute(changedModule, 'add', arguments_, { mode: 'interpret', jitCache: cache })).toThrow(
      ForgeWebScriptTrap,
    );
  });

  it('rejects JIT cache with mismatched entry name', () => {
    const executor = createForgeWebScriptVmExecutor({ compilerVersion: 'test', jitThreshold: 1 });
    const arguments_ = [number(40), number(2)];
    executor.execute(module, 'add', arguments_, { mode: 'jit' });
    const cache = executor.getJitCache?.();

    // Manually corrupt the cache entry name
    const corruptedCache = {
      compilerVersion: cache?.compilerVersion ?? 'test',
      entries: {
        add: { ...cache?.entries.add, functionName: 'wrong-name' },
      },
    };

    const executor2 = createForgeWebScriptVmExecutor({ compilerVersion: 'test' });
    expect(() => executor2.execute(module, 'add', arguments_, { mode: 'interpret', jitCache: corruptedCache })).toThrow(
      ForgeWebScriptTrap,
    );
  });
});
