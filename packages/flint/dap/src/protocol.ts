import type { Readable, Writable } from 'node:stream';

/** Arguments provided in DAP launch requests for starting a debugged process. */
export interface FlintDapLaunchArguments {
  readonly program: string;
  readonly cwd?: string;
  /** Executable that implements the Flint runtime debug bridge. */
  readonly runtimePath?: string;
  /** Arguments passed before the runtime debug bridge receives its request stream. */
  readonly runtimeArgs?: readonly string[];
  readonly args?: readonly string[];
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly stopOnEntry?: boolean;
}

/** DAP descriptor representing a source code document or file. */
export interface DapSource {
  readonly name?: string;
  readonly path?: string;
}

/** Breakpoint location specified in a source document. */
export interface DapSourceBreakpoint {
  readonly line: number;
  readonly column?: number;
}

/** Resolved and verified DAP breakpoint state. */
export interface DapBreakpoint extends DapSourceBreakpoint {
  readonly id?: number;
  readonly verified?: boolean;
  readonly message?: string;
  readonly source?: DapSource;
}

/** DAP call stack frame descriptor with source coordinates. */
export interface DapStackFrame {
  readonly id: number;
  readonly name: string;
  readonly source?: DapSource;
  readonly line: number;
  readonly column: number;
  readonly endLine?: number;
  readonly endColumn?: number;
}

/** DAP variable evaluation scope. */
export interface DapScope {
  readonly name: string;
  readonly variablesReference: number;
  readonly expensive?: boolean;
}

/** DAP variable descriptor providing name, formatted value, and child reference. */
export interface DapVariable {
  readonly name: string;
  readonly value: string;
  readonly variablesReference?: number;
  readonly type?: string;
}

/** Standard Debug Adapter Protocol request message envelope. */
export interface DapRequest<TArguments = unknown> {
  readonly seq: number;
  readonly type: 'request';
  readonly command: string;
  readonly arguments?: TArguments;
}

/** Standard Debug Adapter Protocol response message envelope. */
export interface DapResponse<TBody = unknown> {
  readonly seq: number;
  readonly type: 'response';
  readonly request_seq: number;
  readonly success: boolean;
  readonly command: string;
  readonly message?: string;
  readonly body?: TBody;
}

/** Standard Debug Adapter Protocol event notification envelope. */
export interface DapEvent<TBody = unknown> {
  readonly seq: number;
  readonly type: 'event';
  readonly event: string;
  readonly body?: TBody;
}

/** Union of all standard DAP message envelopes. */
export type DapMessage = DapRequest | DapResponse | DapEvent;

/** Commands dispatched from DAP adapter to the underlying Flint runtime process. */
export type FlintRuntimeCommand =
  | 'launch'
  | 'setBreakpoints'
  | 'configurationDone'
  | 'continue'
  | 'next'
  | 'stepIn'
  | 'stepOut'
  | 'pause'
  | 'threads'
  | 'stackTrace'
  | 'scopes'
  | 'variables'
  | 'fwsTraceSummary'
  | 'fwsTraceEvents'
  | 'fwsMemoryState'
  | 'fwsCapabilityCalls'
  | 'fwsTrapEvidence'
  | 'terminate'
  | 'disconnect';

/** Request dispatched from DAP server to the Flint runtime debug process. */
export interface FlintRuntimeRequest {
  readonly type: 'request';
  readonly requestId: number;
  readonly command: FlintRuntimeCommand;
  readonly arguments?: unknown;
}

/** Response returned from the Flint runtime debug process to DAP server. */
export interface FlintRuntimeResponse {
  readonly type: 'response';
  readonly requestId: number;
  readonly success: boolean;
  readonly body?: unknown;
  readonly message?: string;
}

/** Arguments for requesting execution trace capture in DAP sessions. */
export interface FlintDapTraceArguments {
  readonly maxEvents?: number;
  readonly maxTraceBytes?: number;
  readonly maxSnapshotBytes?: number;
  readonly capture?: 'summary' | 'events' | 'snapshot';
}

/** DAP request for querying execution trace summaries and event lists. */
export interface FlintDapTraceRequest extends DapRequest<FlintDapTraceArguments> {
  readonly command: 'fwsTraceSummary' | 'fwsTraceEvents';
}

/** DAP request for querying memory state, capability calls, and trap evidence. */
export interface FlintDapForensicRequest extends DapRequest<Record<string, unknown>> {
  readonly command: 'fwsMemoryState' | 'fwsCapabilityCalls' | 'fwsTrapEvidence';
}

/** Output event emitted by the runtime debug process. */
export interface FlintRuntimeOutputEvent {
  readonly type: 'output';
  readonly category?: 'console' | 'stdout' | 'stderr' | 'telemetry';
  readonly output: string;
}

/** Stopped event emitted by the runtime debug process when execution pauses. */
export interface FlintRuntimeStoppedEvent {
  readonly type: 'stopped';
  readonly reason: 'breakpoint' | 'step' | 'entry' | 'pause' | 'exception';
  readonly threadId: number;
  readonly source?: DapSource;
  readonly line?: number;
  readonly column?: number;
  readonly description?: string;
}

/** Continued event emitted when runtime execution resumes. */
export interface FlintRuntimeContinuedEvent {
  readonly type: 'continued';
  readonly threadId?: number;
}

/** Thread lifecycle event emitted when a runtime thread starts or exits. */
export interface FlintRuntimeThreadEvent {
  readonly type: 'thread';
  readonly reason: 'started' | 'exited';
  readonly threadId: number;
}

/** Terminated event emitted when runtime debug execution finishes. */
export interface FlintRuntimeTerminatedEvent {
  readonly type: 'terminated';
  readonly exitCode?: number;
}

/** Error event emitted when an unexpected runtime debugging error occurs. */
export interface FlintRuntimeErrorEvent {
  readonly type: 'error';
  readonly message: string;
}

/** Union of message envelopes exchanged with the runtime debug process. */
export type FlintRuntimeMessage =
  | FlintRuntimeResponse
  | FlintRuntimeOutputEvent
  | FlintRuntimeStoppedEvent
  | FlintRuntimeContinuedEvent
  | FlintRuntimeThreadEvent
  | FlintRuntimeTerminatedEvent
  | FlintRuntimeErrorEvent;

/** Child process interface representing an active runtime debug target. */
export interface FlintRuntimeProcess {
  readonly stdin: Writable;
  readonly stdout: Readable;
  readonly stderr: Readable;
  on(event: 'error', listener: (error: Error) => void): this;
  on(event: 'close', listener: (code: number | null, signal: NodeJS.Signals | null) => void): this;
  kill(signal?: NodeJS.Signals): boolean;
}

/** Options configuring child process spawning for runtime debugging. */
export interface FlintRuntimeSpawnOptions {
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
}

/** Factory callback spawning runtime debug process instances. */
export type FlintRuntimeSpawner = (
  executable: string,
  arguments_: readonly string[],
  options: FlintRuntimeSpawnOptions,
) => FlintRuntimeProcess;

/** Type guard checking whether an unknown value is a non-null object record. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Serializes a runtime request into a newline-delimited JSON line. */
export function encodeLineMessage(message: FlintRuntimeRequest): string {
  return `${JSON.stringify(message)}\n`;
}

/** Serializes a DAP message into a Content-Length framed binary buffer. */
export function encodeDapMessage(message: DapMessage): Buffer {
  const body = Buffer.from(JSON.stringify(message), 'utf8');
  return Buffer.concat([Buffer.from(`Content-Length: ${body.byteLength}\r\n\r\n`, 'ascii'), body]);
}

/** Stream frame parser decoding Content-Length delimited DAP messages. */
export class DapFrameParser {
  private buffer = Buffer.alloc(0);

  /** Pushes incoming stream chunks and decodes complete DAP messages. */
  public push(chunk: Buffer | string): DapMessage[] {
    this.buffer = Buffer.concat([this.buffer, Buffer.from(chunk)]);
    const messages: DapMessage[] = [];
    while (true) {
      const separator = this.buffer.indexOf('\r\n\r\n');
      if (separator === -1) break;
      const header = this.buffer.subarray(0, separator).toString('ascii');
      const lengthMatch = /^Content-Length:\s*(\d+)$/im.exec(header);
      if (lengthMatch === null) throw new Error('DAP message is missing a valid Content-Length header.');
      const length = Number(lengthMatch[1]);
      const bodyStart = separator + 4;
      if (this.buffer.byteLength < bodyStart + length) break;
      const body = this.buffer.subarray(bodyStart, bodyStart + length).toString('utf8');
      this.buffer = this.buffer.subarray(bodyStart + length);
      const parsed: unknown = JSON.parse(body);
      if (!isRecord(parsed) || (parsed.type !== 'request' && parsed.type !== 'response' && parsed.type !== 'event'))
        throw new Error('DAP message has an invalid type.');
      messages.push(parsed as unknown as DapMessage);
    }
    return messages;
  }
}

/** Stream line parser decoding newline-delimited JSON messages from the runtime. */
export class RuntimeLineParser {
  private buffer = '';

  /** Pushes incoming stream chunks and decodes complete runtime messages. */
  public push(chunk: Buffer | string): FlintRuntimeMessage[] {
    this.buffer += chunk.toString();
    const messages: FlintRuntimeMessage[] = [];
    let newline = this.buffer.indexOf('\n');
    while (newline !== -1) {
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      if (line.length > 0) {
        const parsed: unknown = JSON.parse(line);
        if (!isRecord(parsed) || typeof parsed.type !== 'string') throw new Error('Runtime message has no type.');
        messages.push(parsed as unknown as FlintRuntimeMessage);
      }
      newline = this.buffer.indexOf('\n');
    }
    return messages;
  }
}
