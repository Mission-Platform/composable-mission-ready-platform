import type { ForgeWebScriptVmDebugSpan, ForgeWebScriptVmValue } from './vm.js';

export type ForgeWebScriptTraceCaptureMode = 'summary' | 'events' | 'snapshot';

export interface ForgeWebScriptTraceLimits {
  readonly maxEvents?: number;
  readonly maxTraceBytes?: number;
  readonly maxSnapshotBytes?: number;
}

export interface ForgeWebScriptTraceOptions extends ForgeWebScriptTraceLimits {
  /** Tracing is opt-in. No report is produced when this option is omitted. */
  readonly capture?: ForgeWebScriptTraceCaptureMode;
  /** Stable caller-provided identifier used to correlate a replay. */
  readonly replayId?: string;
  readonly artifactHash?: string;
  readonly sourceHash?: string;
  /** Redacts capability arguments and other value summaries. It must not mutate the value. */
  readonly redact?: (value: ForgeWebScriptVmValue) => string;
}

export interface ForgeWebScriptTraceSourceLocation extends ForgeWebScriptVmDebugSpan {}

export type ForgeWebScriptTraceEventType =
  'instruction' | 'call' | 'capability' | 'memory' | 'range-check' | 'trap' | 'resource';

export interface ForgeWebScriptTraceEvent {
  readonly sequence: number;
  readonly type: ForgeWebScriptTraceEventType;
  readonly step: number;
  readonly functionName?: string;
  readonly instruction?: number;
  readonly source?: ForgeWebScriptTraceSourceLocation;
  readonly operation?: string;
  readonly capability?: string;
  readonly decision?: 'allowed' | 'denied' | 'failed';
  readonly pointer?: number;
  readonly length?: number;
  readonly ownership?: string;
  readonly resource?: string;
  readonly value?: string;
  readonly detail?: string;
}

export interface ForgeWebScriptTraceCounters {
  readonly instructions: number;
  readonly calls: number;
  readonly capabilityCalls: number;
  readonly allocations: number;
  readonly reallocations: number;
  readonly deallocations: number;
  readonly rangeChecks: number;
  readonly memoryBytes: number;
  readonly peakMemoryBytes: number;
  readonly droppedEvents: number;
}

export interface ForgeWebScriptTraceReport {
  readonly version: '1.0';
  readonly replayId: string;
  readonly artifactHash?: string;
  readonly sourceHash?: string;
  readonly capture: ForgeWebScriptTraceCaptureMode;
  readonly events: readonly ForgeWebScriptTraceEvent[];
  readonly counters: ForgeWebScriptTraceCounters;
  readonly steps: number;
  readonly memoryBytes: number;
  readonly snapshot?: Uint8Array;
  readonly termination: 'returned' | 'trapped' | 'step-limit' | 'cancelled';
  readonly trap?: { readonly code: string; readonly message: string; readonly capability?: string };
  readonly traceHash: string;
}

export interface ForgeWebScriptTraceRecorder {
  readonly record: (event: Omit<ForgeWebScriptTraceEvent, 'sequence'>) => void;
  readonly recordInstruction: (
    functionName: string,
    instruction: number,
    step: number,
    source?: ForgeWebScriptTraceSourceLocation,
  ) => void;
  readonly recordMemory: (operation: string, pointer: number, length: number, step: number, ownership?: string) => void;
  readonly recordRangeCheck: (pointer: number, length: number, step: number, detail?: string) => void;
  readonly recordCapability: (
    capability: string,
    decision: 'allowed' | 'denied' | 'failed',
    step: number,
    value?: string,
  ) => void;
  readonly recordCall: (functionName: string, step: number) => void;
  readonly recordTrap: (code: string, message: string, step: number, capability?: string) => void;
  readonly recordResource: (resource: string, step: number, detail?: string) => void;
  readonly noteAllocation: (operation: 'allocate' | 'reallocate' | 'deallocate', bytes: number) => void;
  readonly finish: (options: {
    readonly steps: number;
    readonly memory: Uint8Array;
    readonly termination: ForgeWebScriptTraceReport['termination'];
    readonly trap?: { readonly code: string; readonly message: string; readonly capability?: string };
  }) => ForgeWebScriptTraceReport;
}

const DEFAULT_LIMITS: Required<ForgeWebScriptTraceLimits> = {
  maxEvents: 512,
  maxTraceBytes: 65_536,
  maxSnapshotBytes: 4_096,
};

function hashText(value: string): string {
  let hash = 2_166_136_261;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= byte;
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function canonicalize(value: unknown): unknown {
  if (value instanceof Uint8Array) return [...value];
  if (Array.isArray(value)) return value.map((entry) => canonicalize(entry));
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .toSorted(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  return value;
}

function safeLimits(options: ForgeWebScriptTraceOptions): Required<ForgeWebScriptTraceLimits> {
  const positive = (value: number | undefined, fallback: number): number =>
    value === undefined || !Number.isFinite(value) ? fallback : Math.max(0, Math.trunc(value));
  return {
    maxEvents: positive(options.maxEvents, DEFAULT_LIMITS.maxEvents),
    maxTraceBytes: positive(options.maxTraceBytes, DEFAULT_LIMITS.maxTraceBytes),
    maxSnapshotBytes: positive(options.maxSnapshotBytes, DEFAULT_LIMITS.maxSnapshotBytes),
  };
}

function defaultSummary(value: ForgeWebScriptVmValue): string {
  switch (value.kind) {
    case 'unit':
      return 'unit';
    case 'bool':
      return 'bool';
    case 'number':
      return value.type;
    case 'bytes':
      return `bytes:${value.length}`;
    case 'aggregate':
      return `aggregate:${value.layout}:${value.bytes.byteLength}`;
    case 'function':
      return `function:${value.functionName}`;
  }
}

export function createForgeWebScriptTraceRecorder(
  options: ForgeWebScriptTraceOptions,
  functionName: string,
): ForgeWebScriptTraceRecorder {
  const limits = safeLimits(options);
  const capture = options.capture ?? 'events';
  const events: ForgeWebScriptTraceEvent[] = [];
  let eventBytes = 0;
  let sequence = 0;
  let droppedEvents = 0;
  let instructions = 0;
  let calls = 0;
  let capabilityCalls = 0;
  let allocations = 0;
  let reallocations = 0;
  let deallocations = 0;
  let rangeChecks = 0;
  let memoryBytes = 0;
  let peakMemoryBytes = 0;

  const record = (event: Omit<ForgeWebScriptTraceEvent, 'sequence'>): void => {
    if (capture === 'summary') return;
    try {
      const candidate = { sequence: sequence++, ...event };
      const bytes = new TextEncoder().encode(JSON.stringify(candidate)).byteLength;
      if (events.length >= limits.maxEvents || eventBytes + bytes > limits.maxTraceBytes) {
        droppedEvents += 1;
        return;
      }
      eventBytes += bytes;
      events.push(candidate);
    } catch {
      droppedEvents += 1;
    }
  };
  const recorder: ForgeWebScriptTraceRecorder = {
    record,
    recordInstruction: (name, instruction, step, source) => {
      instructions += 1;
      record({
        type: 'instruction',
        step,
        functionName: name,
        instruction,
        ...(source === undefined ? {} : { source }),
      });
    },
    recordMemory: (operation, pointer, length, step, ownership) =>
      record({
        type: 'memory',
        step,
        operation,
        pointer,
        length,
        ...(ownership === undefined ? {} : { ownership }),
      }),
    recordRangeCheck: (pointer, length, step, detail) => {
      rangeChecks += 1;
      record({ type: 'range-check', step, pointer, length, ...(detail === undefined ? {} : { detail }) });
    },
    recordCapability: (capability, decision, step, value) => {
      capabilityCalls += 1;
      record({ type: 'capability', step, capability, decision, ...(value === undefined ? {} : { value }) });
    },
    recordCall: (name, step) => {
      calls += 1;
      record({ type: 'call', step, functionName: name });
    },
    recordTrap: (code, message, step, capability) =>
      record({ type: 'trap', step, detail: message, value: code, ...(capability === undefined ? {} : { capability }) }),
    recordResource: (resource, step, detail) =>
      record({ type: 'resource', step, resource, ...(detail === undefined ? {} : { detail }) }),
    noteAllocation: (operation, bytes) => {
      if (operation === 'allocate') allocations += 1;
      if (operation === 'reallocate') reallocations += 1;
      if (operation === 'deallocate') deallocations += 1;
      memoryBytes = Math.max(0, memoryBytes + (operation === 'deallocate' ? -bytes : bytes));
      peakMemoryBytes = Math.max(peakMemoryBytes, memoryBytes);
    },
    finish: ({ steps, memory, termination, trap }) => {
      const snapshot = capture === 'snapshot' ? memory.slice(0, limits.maxSnapshotBytes) : undefined;
      const reportWithoutHash = {
        version: '1.0' as const,
        replayId: options.replayId ?? hashText(`${options.sourceHash ?? ''}:${functionName}`),
        ...(options.artifactHash === undefined ? {} : { artifactHash: options.artifactHash }),
        ...(options.sourceHash === undefined ? {} : { sourceHash: options.sourceHash }),
        capture,
        events,
        counters: {
          instructions,
          calls,
          capabilityCalls,
          allocations,
          reallocations,
          deallocations,
          rangeChecks,
          memoryBytes,
          peakMemoryBytes,
          droppedEvents,
        },
        steps,
        memoryBytes: memory.byteLength,
        ...(snapshot === undefined ? {} : { snapshot }),
        termination,
        ...(trap === undefined ? {} : { trap }),
      };
      return { ...reportWithoutHash, traceHash: hashText(JSON.stringify(canonicalize(reportWithoutHash))) };
    },
  };
  return recorder;
}

export function summarizeForgeWebScriptVmValue(
  value: ForgeWebScriptVmValue,
  redact?: (value: ForgeWebScriptVmValue) => string,
): string {
  try {
    return redact?.(value) ?? defaultSummary(value);
  } catch {
    return '<redacted>';
  }
}
