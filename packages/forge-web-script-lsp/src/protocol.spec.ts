import { PassThrough } from 'node:stream';

import { describe, expect, it } from 'vitest';
import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';

import { registerForgeWebScriptLsp } from './server.js';

interface JsonRpcMessage {
  readonly id?: number;
  readonly method?: string;
  readonly result?: { readonly capabilities?: Record<string, unknown>; readonly data?: readonly number[] } | null;
  readonly params?: {
    readonly diagnostics?: readonly Record<string, unknown>[];
    readonly message?: string;
    readonly token?: string | number;
    readonly value?: { readonly kind?: string; readonly percentage?: number };
  };
}

interface MessageReaderState {
  buffer: string;
  readonly waiters: Array<{
    readonly resolve: (message: JsonRpcMessage) => void;
    readonly reject: (error: unknown) => void;
  }>;
}

const messageReaders = new WeakMap<PassThrough, MessageReaderState>();

describe('Forge Web Script stdio protocol', () => {
  it('handles initialize, open diagnostics, shutdown, and exit over framed messages', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const connection = createConnection(ProposedFeatures.all, input, output);
    const server = registerForgeWebScriptLsp(connection, {
      workspaceHost: {
        readFile: async () => void 0,
        listFiles: async () => [],
        getOptions: async () => ({}),
      },
    });
    connection.listen();

    send(input, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        rootUri: 'file:///workspace',
        workspaceFolders: void 0,
        capabilities: { window: { workDoneProgress: true } },
      },
    });
    const initialized = await readUntil(output, (message) => message.id === 1);
    expect(initialized).toMatchObject({
      id: 1,
      result: {
        capabilities: {
          textDocumentSync: 1,
          hoverProvider: true,
          definitionProvider: true,
          declarationProvider: true,
          implementationProvider: true,
          referencesProvider: true,
          documentSymbolProvider: true,
          codeLensProvider: { resolveProvider: false },
          foldingRangeProvider: true,
          inlineValueProvider: true,
          inlayHintProvider: { resolveProvider: false },
          renameProvider: true,
          semanticTokensProvider: {
            full: true,
            legend: {
              tokenTypes: expect.arrayContaining(['comment', 'keyword', 'type']),
              tokenModifiers: [],
            },
          },
        },
      },
    });

    send(input, { jsonrpc: '2.0', method: 'initialized', params: {} });
    send(input, {
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri: 'file:///workspace/main.fws',
          languageId: 'fws',
          version: 1,
          text: 'fn helper() -> i32 { return 1; }\nexport fn entry() -> i32 { return helper(); }\nexport fn broken(',
        },
      },
    });
    const openMessages: JsonRpcMessage[] = [];
    const progressCreate = await readUntil(
      output,
      (message) => message.method === 'window/workDoneProgress/create',
      openMessages,
    );
    expect(progressCreate).toMatchObject({
      method: 'window/workDoneProgress/create',
      params: { token: expect.any(String) },
    });
    // eslint-disable-next-line unicorn/no-null -- JSON-RPC responses require an explicit null result.
    send(input, { jsonrpc: '2.0', id: progressCreate.id, result: null });
    await readUntil(
      output,
      (message) => message.method === '$/progress' && message.params?.value?.kind === 'end',
      openMessages,
    );
    const diagnostics =
      openMessages.find((message) => message.method === 'textDocument/publishDiagnostics') ??
      (await readUntil(output, (message) => message.method === 'textDocument/publishDiagnostics', openMessages));
    const progressMessages = openMessages.filter((message) => message.method === '$/progress');
    expect(progressMessages.map((message) => message.params?.value?.kind)).toEqual(['begin', 'report', 'end']);
    expect(progressMessages.map((message) => message.params?.token)).toEqual([
      progressCreate.params?.token,
      progressCreate.params?.token,
      progressCreate.params?.token,
    ]);
    expect(
      openMessages.some(
        (message) =>
          message.method === 'window/logMessage' &&
          message.params?.message?.includes('workspace.refresh.begin') === true,
      ),
    ).toBe(true);
    expect(diagnostics).toMatchObject({
      method: 'textDocument/publishDiagnostics',
      params: {
        diagnostics: expect.arrayContaining([
          expect.objectContaining({ source: 'forge-web-script', code: 'FWS-PARSE-017' }),
        ]),
      },
    });
    expect(diagnostics.params?.diagnostics).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ source: 'forge-web-script', code: 'FWS-ABI-003' })]),
    );

    const secondMessages = openMessages.filter(
      (message) =>
        message.method === 'window/workDoneProgress/create' && message.params?.token !== progressCreate.params?.token,
    );
    const secondProgressCreate =
      secondMessages[0] ??
      (await readUntil(output, (message) => message.method === 'window/workDoneProgress/create', secondMessages));
    expect(secondProgressCreate.params?.token).not.toBe(progressCreate.params?.token);
    // eslint-disable-next-line unicorn/no-null -- JSON-RPC responses require an explicit null result.
    send(input, { jsonrpc: '2.0', id: secondProgressCreate.id, result: null });
    await readUntil(
      output,
      (message) => message.method === '$/progress' && message.params?.value?.kind === 'end',
      secondMessages,
    );
    if (![...openMessages, ...secondMessages].some((message) => message.method === 'textDocument/publishDiagnostics')) {
      await readUntil(output, (message) => message.method === 'textDocument/publishDiagnostics', secondMessages);
    }
    const secondProgressMessages = secondMessages.filter((message) => message.method === '$/progress');
    expect(secondProgressMessages.map((message) => message.params?.value?.kind)).toEqual(['begin', 'report', 'end']);
    expect(secondProgressMessages.map((message) => message.params?.token)).toEqual([
      secondProgressCreate.params?.token,
      secondProgressCreate.params?.token,
      secondProgressCreate.params?.token,
    ]);

    send(input, {
      jsonrpc: '2.0',
      id: 3,
      method: 'textDocument/semanticTokens/full',
      params: { textDocument: { uri: 'file:///workspace/main.fws' } },
    });
    let semanticTokens = await readMessage(output);
    while (semanticTokens.id !== 3) semanticTokens = await readMessage(output);
    expect(semanticTokens).toMatchObject({ id: 3, result: { data: expect.any(Array) } });
    expect(semanticTokens.result?.data?.length).toBeGreaterThan(0);

    send(input, { jsonrpc: '2.0', id: 2, method: 'shutdown', params: void 0 });
    let shutdown = await readMessage(output);
    while (shutdown.id !== 2) shutdown = await readMessage(output);
    expect(shutdown).toMatchObject({ id: 2 });
    expect(shutdown.result).toBeNull();
    expect(() =>
      server.completion({ textDocument: { uri: 'file:///workspace/main.fws' }, position: { line: 0, character: 0 } }),
    ).toThrow(/disposed/u);
    connection.dispose();
  });
});

function send(stream: PassThrough, message: Record<string, unknown>): void {
  const body = JSON.stringify(message);
  stream.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
}

function readMessage(stream: PassThrough): Promise<JsonRpcMessage> {
  let state = messageReaders.get(stream);
  if (state === undefined) {
    state = { buffer: '', waiters: [] };
    messageReaders.set(stream, state);
    stream.on('data', (chunk: Buffer | string) => {
      state!.buffer += chunk.toString();
      flushMessages(state!);
    });
  }
  return new Promise((resolve, reject) => {
    state!.waiters.push({ resolve, reject });
    flushMessages(state!);
  });
}

function flushMessages(state: MessageReaderState): void {
  while (state.waiters.length > 0) {
    const headerEnd = state.buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) return;
    const length = Number(/Content-Length: (\d+)/iu.exec(state.buffer.slice(0, headerEnd))?.[1]);
    const bodyStart = headerEnd + 4;
    if (!Number.isFinite(length) || state.buffer.length - bodyStart < length) return;
    const body = state.buffer.slice(bodyStart, bodyStart + length);
    state.buffer = state.buffer.slice(bodyStart + length);
    const waiter = state.waiters.shift();
    if (waiter === undefined) return;
    try {
      waiter.resolve(JSON.parse(body) as JsonRpcMessage);
    } catch (error: unknown) {
      waiter.reject(error);
    }
  }
}

async function readUntil(
  stream: PassThrough,
  predicate: (message: JsonRpcMessage) => boolean,
  seen: JsonRpcMessage[] = [],
): Promise<JsonRpcMessage> {
  const message = await readMessage(stream);
  seen.push(message);
  return predicate(message) ? message : readUntil(stream, predicate, seen);
}
