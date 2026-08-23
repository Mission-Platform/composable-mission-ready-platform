import type { Readable, Writable } from 'node:stream';

export interface ForgeWebScriptDapLaunchArguments {
  readonly program: string;
  readonly cwd?: string;
  /** Executable that implements the Forge Web Script runtime debug bridge. */
  readonly runtimePath?: string;
  /** Arguments passed before the runtime debug bridge receives its request stream. */
  readonly runtimeArgs?: readonly string[];
  readonly args?: readonly string[];
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly stopOnEntry?: boolean;
}

export interface DapSource {
  readonly name?: string;
  readonly path?: string;
}

export interface DapSourceBreakpoint {
  readonly line: number;
  readonly column?: number;
}

export interface DapBreakpoint extends DapSourceBreakpoint {
  readonly id?: number;
  readonly verified?: boolean;
  readonly message?: string;
  readonly source?: DapSource;
}

export interface DapStackFrame {
  readonly id: number;
  readonly name: string;
  readonly source?: DapSource;
  readonly line: number;
  readonly column: number;
  readonly endLine?: number;
  readonly endColumn?: number;
}

export interface DapScope {
  readonly name: string;
  readonly variablesReference: number;
  readonly expensive?: boolean;
}

export interface DapVariable {
  readonly name: string;
  readonly value: string;
  readonly variablesReference?: number;
  readonly type?: string;
}

export interface DapRequest<TArguments = unknown> {
  readonly seq: number;
  readonly type: 'request';
  readonly command: string;
  readonly arguments?: TArguments;
}

export interface DapResponse<TBody = unknown> {
  readonly seq: number;
  readonly type: 'response';
  readonly request_seq: number;
  readonly success: boolean;
  readonly command: string;
  readonly message?: string;
  readonly body?: TBody;
}

export interface DapEvent<TBody = unknown> {
  readonly seq: number;
  readonly type: 'event';
  readonly event: string;
  readonly body?: TBody;
}

export type DapMessage = DapRequest | DapResponse | DapEvent;

export type ForgeWebScriptRuntimeCommand =
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

export interface ForgeWebScriptRuntimeRequest {
  readonly type: 'request';
  readonly requestId: number;
  readonly command: ForgeWebScriptRuntimeCommand;
  readonly arguments?: unknown;
}

export interface ForgeWebScriptRuntimeResponse {
  readonly type: 'response';
  readonly requestId: number;
  readonly success: boolean;
  readonly body?: unknown;
  readonly message?: string;
}

export interface ForgeWebScriptDapTraceArguments {
  readonly maxEvents?: number;
  readonly maxTraceBytes?: number;
  readonly maxSnapshotBytes?: number;
  readonly capture?: 'summary' | 'events' | 'snapshot';
}

export interface ForgeWebScriptDapTraceRequest extends DapRequest<ForgeWebScriptDapTraceArguments> {
  readonly command: 'fwsTraceSummary' | 'fwsTraceEvents';
}

export interface ForgeWebScriptDapForensicRequest extends DapRequest<Record<string, unknown>> {
  readonly command: 'fwsMemoryState' | 'fwsCapabilityCalls' | 'fwsTrapEvidence';
}

export interface ForgeWebScriptRuntimeOutputEvent {
  readonly type: 'output';
  readonly category?: 'console' | 'stdout' | 'stderr' | 'telemetry';
  readonly output: string;
}

export interface ForgeWebScriptRuntimeStoppedEvent {
  readonly type: 'stopped';
  readonly reason: 'breakpoint' | 'step' | 'entry' | 'pause' | 'exception';
  readonly threadId: number;
  readonly source?: DapSource;
  readonly line?: number;
  readonly column?: number;
  readonly description?: string;
}

export interface ForgeWebScriptRuntimeContinuedEvent {
  readonly type: 'continued';
  readonly threadId?: number;
}

export interface ForgeWebScriptRuntimeThreadEvent {
  readonly type: 'thread';
  readonly reason: 'started' | 'exited';
  readonly threadId: number;
}

export interface ForgeWebScriptRuntimeTerminatedEvent {
  readonly type: 'terminated';
  readonly exitCode?: number;
}

export interface ForgeWebScriptRuntimeErrorEvent {
  readonly type: 'error';
  readonly message: string;
}

export type ForgeWebScriptRuntimeMessage =
  | ForgeWebScriptRuntimeResponse
  | ForgeWebScriptRuntimeOutputEvent
  | ForgeWebScriptRuntimeStoppedEvent
  | ForgeWebScriptRuntimeContinuedEvent
  | ForgeWebScriptRuntimeThreadEvent
  | ForgeWebScriptRuntimeTerminatedEvent
  | ForgeWebScriptRuntimeErrorEvent;

export interface ForgeWebScriptRuntimeProcess {
  readonly stdin: Writable;
  readonly stdout: Readable;
  readonly stderr: Readable;
  on(event: 'error', listener: (error: Error) => void): this;
  on(event: 'close', listener: (code: number | null, signal: NodeJS.Signals | null) => void): this;
  kill(signal?: NodeJS.Signals): boolean;
}

export interface ForgeWebScriptRuntimeSpawnOptions {
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
}

export type ForgeWebScriptRuntimeSpawner = (
  executable: string,
  arguments_: readonly string[],
  options: ForgeWebScriptRuntimeSpawnOptions,
) => ForgeWebScriptRuntimeProcess;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function encodeLineMessage(message: ForgeWebScriptRuntimeRequest): string {
  return `${JSON.stringify(message)}\n`;
}

export function encodeDapMessage(message: DapMessage): Buffer {
  const body = Buffer.from(JSON.stringify(message), 'utf8');
  return Buffer.concat([Buffer.from(`Content-Length: ${body.byteLength}\r\n\r\n`, 'ascii'), body]);
}

export class DapFrameParser {
  private buffer = Buffer.alloc(0);

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

export class RuntimeLineParser {
  private buffer = '';

  public push(chunk: Buffer | string): ForgeWebScriptRuntimeMessage[] {
    this.buffer += chunk.toString();
    const messages: ForgeWebScriptRuntimeMessage[] = [];
    let newline = this.buffer.indexOf('\n');
    while (newline !== -1) {
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      if (line.length > 0) {
        const parsed: unknown = JSON.parse(line);
        if (!isRecord(parsed) || typeof parsed.type !== 'string') throw new Error('Runtime message has no type.');
        messages.push(parsed as unknown as ForgeWebScriptRuntimeMessage);
      }
      newline = this.buffer.indexOf('\n');
    }
    return messages;
  }
}
