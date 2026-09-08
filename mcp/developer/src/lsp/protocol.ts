import { pathToFileURL } from 'node:url';

import type { ChildProcessWithoutNullStreams } from 'node:child_process';

const DEFAULT_TIMEOUT_MS = 5000;
const MAX_MESSAGE_BYTES = 2 * 1000 * 1000;

export interface LspDiagnostic {
  readonly range: unknown;
  readonly severity?: number;
  readonly code?: number | string;
  readonly source?: string;
  readonly message: string;
  readonly [key: string]: unknown;
}

interface JsonRpcMessage {
  readonly jsonrpc?: string;
  readonly id?: number;
  readonly method?: string;
  readonly params?: unknown;
  readonly result?: unknown;
  readonly error?: { readonly code?: number; readonly message?: string; readonly data?: unknown };
}

interface PendingRequest {
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
  readonly timer: NodeJS.Timeout;
}

interface DiagnosticWaiter {
  readonly resolve: (diagnostics: readonly LspDiagnostic[]) => void;
  readonly timer: NodeJS.Timeout;
}

export interface LspInitializeResult {
  readonly capabilities?: Record<string, unknown>;
  readonly serverInfo?: Record<string, unknown>;
  readonly [key: string]: unknown;
}

export interface LspWorkspaceFolder {
  readonly uri: string;
  readonly name: string;
}

export interface LspRequestErrorDetails {
  readonly code?: number;
  readonly data?: unknown;
}

/** A stable error shape for failures returned by a language server. */
export class LspRequestError extends Error {
  public readonly code: number | undefined;
  public readonly data: unknown;

  public constructor(message: string, details: LspRequestErrorDetails = {}) {
    super(message);
    this.name = 'LspRequestError';
    this.code = details.code;
    this.data = details.data;
  }
}

export interface LspProtocolClientOptions {
  readonly workspaceRoot: string;
  readonly onDiagnostics?: (uri: string, diagnostics: readonly LspDiagnostic[]) => void;
}

/** Minimal, bounded JSON-RPC transport for a language server's stdio stream. */
export class LspProtocolClient {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly options: LspProtocolClientOptions;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly diagnostics = new Map<string, readonly LspDiagnostic[]>();
  private readonly diagnosticWaiters = new Map<string, Set<DiagnosticWaiter>>();
  private input = Buffer.alloc(0);
  private nextRequestId = 1;
  private initializePromise: Promise<LspInitializeResult> | undefined;
  private workspaceFolders: readonly LspWorkspaceFolder[];
  private initializeResult: LspInitializeResult | undefined;
  private closed = false;

  public constructor(child: ChildProcessWithoutNullStreams, options: LspProtocolClientOptions) {
    this.child = child;
    this.options = options;
    this.workspaceFolders = [
      {
        uri: this.fileUri(options.workspaceRoot),
        name: options.workspaceRoot.split('/').at(-1) ?? 'workspace',
      },
    ];
    child.stdout.on('data', (chunk: Buffer | string) => this.consume(chunk));
    child.once('close', () => this.failPending(new Error('Language-server process closed.')));
    child.once('error', (error) => this.failPending(error));
  }

  public async initialize(): Promise<LspInitializeResult> {
    if (this.initializePromise) return this.initializePromise;

    this.initializePromise = this.request('initialize', {
      processId: process.pid,
      rootUri: this.fileUri(this.options.workspaceRoot),
      workspaceFolders: this.workspaceFolders,
      capabilities: {
        workspace: { workspaceFolders: true },
        textDocument: { publishDiagnostics: { relatedInformation: true } },
      },
    }).then(async (result) => {
      const initializeResult = isRecord(result) ? (result as LspInitializeResult) : {};
      this.initializeResult = initializeResult;
      this.notify('initialized', {});
      return initializeResult;
    });

    return this.initializePromise;
  }

  public request<TResult = unknown>(method: string, params: unknown, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<TResult> {
    if (this.closed) return Promise.reject(new Error('Language-server process is closed.'));
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000) {
      return Promise.reject(new Error('LSP request timeout must be an integer between 1 and 60000 ms.'));
    }
    const id = this.nextRequestId++;
    const message = { jsonrpc: '2.0', id, method, params };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        try {
          this.write({ jsonrpc: '2.0', method: '$/cancelRequest', params: { id } });
        } catch {
          // The original timeout is the actionable error; cancellation is best effort.
        }
        reject(new Error(`LSP request "${method}" timed out after ${timeoutMs} ms.`));
      }, timeoutMs);
      this.pending.set(id, { resolve: (value) => resolve(value as TResult), reject, timer });
      try {
        this.write(message);
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  public notify<TParams = unknown>(method: string, params: TParams): void {
    if (this.closed) throw new Error('Language-server process is closed.');
    this.write({ jsonrpc: '2.0', method, params });
  }

  public getCapabilities(): Readonly<Record<string, unknown>> {
    return this.initializeResult?.capabilities ?? {};
  }

  public getInitializeResult(): LspInitializeResult | undefined {
    return this.initializeResult;
  }

  public getWorkspaceFolders(): readonly LspWorkspaceFolder[] {
    return this.workspaceFolders;
  }

  public addWorkspaceFolder(folder: LspWorkspaceFolder): void {
    if (this.workspaceFolders.some((existing) => existing.uri === folder.uri)) return;
    const previous = this.workspaceFolders;
    this.workspaceFolders = [...previous, folder];
    try {
      this.notify('workspace/didChangeWorkspaceFolders', {
        event: { added: [folder], removed: [] },
      });
    } catch (error) {
      this.workspaceFolders = previous;
      throw error;
    }
  }

  public diagnosticsFor(uri: string): readonly LspDiagnostic[] | undefined {
    return this.diagnostics.get(uri);
  }

  public clearDiagnostics(uri: string): void {
    this.diagnostics.delete(uri);
  }

  public waitForDiagnostics(uri: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<readonly LspDiagnostic[]> {
    const existing = this.diagnostics.get(uri);
    if (existing) return Promise.resolve(existing);

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.diagnosticWaiters.get(uri)?.delete(waiter);
        resolve(this.diagnostics.get(uri) ?? []);
      }, timeoutMs);
      const waiter: DiagnosticWaiter = { resolve, timer };
      const waiters = this.diagnosticWaiters.get(uri) ?? new Set<DiagnosticWaiter>();
      waiters.add(waiter);
      this.diagnosticWaiters.set(uri, waiters);
    });
  }

  public dispose(): void {
    this.closed = true;
    this.failPending(new Error('Language-server session was shut down.'));
    for (const waiters of this.diagnosticWaiters.values()) {
      for (const waiter of waiters) {
        clearTimeout(waiter.timer);
        waiter.resolve([]);
      }
    }
    this.diagnosticWaiters.clear();
  }

  private write(message: Record<string, unknown>): void {
    const body = JSON.stringify(message);
    const bodyBytes = Buffer.byteLength(body, 'utf8');
    if (bodyBytes > MAX_MESSAGE_BYTES) throw new Error('LSP message exceeds the 2 MiB limit.');
    this.child.stdin.write(`Content-Length: ${bodyBytes}\r\n\r\n${body}`);
  }

  private consume(chunk: Buffer | string): void {
    this.input = Buffer.concat([this.input, Buffer.from(chunk)]);
    if (this.input.length > MAX_MESSAGE_BYTES * 2) {
      this.failPending(new Error('LSP input buffer exceeds the 4 MiB limit.'));
      this.input = Buffer.alloc(0);
      return;
    }

    while (true) {
      const separator = this.input.indexOf('\r\n\r\n');
      if (separator === -1) return;
      const header = this.input.subarray(0, separator).toString('ascii');
      const match = /^Content-Length:\s*(\d+)$/im.exec(header);
      if (!match) {
        this.failPending(new Error('LSP message is missing a valid Content-Length header.'));
        this.input = Buffer.alloc(0);
        return;
      }
      const length = Number(match[1]);
      const bodyStart = separator + 4;
      if (!Number.isSafeInteger(length) || length > MAX_MESSAGE_BYTES) {
        this.failPending(new Error('LSP message length exceeds the 2 MiB limit.'));
        this.input = Buffer.alloc(0);
        return;
      }
      if (this.input.length < bodyStart + length) return;
      const body = this.input.subarray(bodyStart, bodyStart + length).toString('utf8');
      this.input = this.input.subarray(bodyStart + length);
      try {
        this.handle(JSON.parse(body) as JsonRpcMessage);
      } catch (error) {
        this.failPending(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  private handle(message: JsonRpcMessage): void {
    if (message.method === 'textDocument/publishDiagnostics') {
      const params = isRecord(message.params) ? message.params : {};
      const uri = typeof params.uri === 'string' ? params.uri : undefined;
      const diagnostics = Array.isArray(params.diagnostics) ? (params.diagnostics as LspDiagnostic[]) : [];
      if (!uri) return;
      this.diagnostics.set(uri, diagnostics);
      this.options.onDiagnostics?.(uri, diagnostics);
      const waiters = this.diagnosticWaiters.get(uri);
      if (!waiters) return;
      this.diagnosticWaiters.delete(uri);
      for (const waiter of waiters) {
        clearTimeout(waiter.timer);
        waiter.resolve(diagnostics);
      }
      return;
    }

    if (typeof message.id !== 'number') return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    clearTimeout(pending.timer);
    if (message.error) {
      pending.reject(
        new LspRequestError(
          message.error.message ?? `LSP request failed with code ${message.error.code ?? 'unknown'}.`,
          { code: message.error.code, data: message.error.data },
        ),
      );
    } else {
      pending.resolve(message.result);
    }
  }

  private failPending(error: Error): void {
    this.closed = true;
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(error);
      this.pending.delete(id);
    }
  }

  private fileUri(filePath: string): string {
    return pathToFileURL(filePath).href;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
