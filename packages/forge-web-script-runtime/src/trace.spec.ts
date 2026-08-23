import { describe, expect, it } from 'vitest';

import { createForgeWebScriptTraceRecorder, summarizeForgeWebScriptVmValue } from './trace.js';

describe('Forge Web Script trace recorder', () => {
  it('redacts values and keeps capability events bounded', () => {
    const recorder = createForgeWebScriptTraceRecorder(
      { capture: 'events', maxEvents: 1, maxTraceBytes: 256, replayId: 'stable' },
      'entry',
    );
    const secret = { kind: 'bytes', pointer: 8, length: 12, ownership: 'borrowed' } as const;
    recorder.recordCapability(
      'host.sink',
      'allowed',
      1,
      summarizeForgeWebScriptVmValue(secret, () => '<redacted>'),
    );
    recorder.recordCapability('host.sink', 'allowed', 2, 'must-not-be-retained');
    const report = recorder.finish({ steps: 2, memory: new Uint8Array([1, 2, 3]), termination: 'returned' });

    expect(report.replayId).toBe('stable');
    expect(report.events).toHaveLength(1);
    expect(report.events[0]?.value).toBe('<redacted>');
    expect(report.counters.droppedEvents).toBe(1);
    const repeat = createForgeWebScriptTraceRecorder(
      { capture: 'events', maxEvents: 1, maxTraceBytes: 256, replayId: 'stable' },
      'entry',
    );
    repeat.recordCapability('host.sink', 'allowed', 1, '<redacted>');
    repeat.recordCapability('host.sink', 'allowed', 2, 'must-not-be-retained');
    expect(report.traceHash).toBe(
      repeat.finish({ steps: 2, memory: new Uint8Array([1, 2, 3]), termination: 'returned' }).traceHash,
    );
  });

  it('limits opt-in snapshots and preserves summary counters', () => {
    const recorder = createForgeWebScriptTraceRecorder(
      { capture: 'snapshot', maxSnapshotBytes: 2, maxTraceBytes: 1 },
      'entry',
    );
    recorder.noteAllocation('allocate', 8);
    recorder.noteAllocation('deallocate', 3);
    recorder.recordInstruction('entry', 0, 1);
    const report = recorder.finish({ steps: 1, memory: new Uint8Array([1, 2, 3]), termination: 'returned' });

    expect(report.snapshot).toEqual(new Uint8Array([1, 2]));
    expect(report.counters.allocations).toBe(1);
    expect(report.counters.deallocations).toBe(1);
    expect(report.counters.memoryBytes).toBe(5);
    expect(report.counters.droppedEvents).toBe(1);
  });
});
