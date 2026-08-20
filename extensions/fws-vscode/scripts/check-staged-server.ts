import { spawn } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const serverRoot = path.resolve(import.meta.dirname, '../server');
const serverPath = path.join(serverRoot, 'dist/main.js');
const dapRoot = path.join(serverRoot, 'dap');

interface RpcMessage {
  readonly id?: number;
  readonly method?: string;
  readonly result?: {
    readonly capabilities?: {
      readonly completionProvider?: unknown;
      readonly hoverProvider?: unknown;
      readonly semanticTokensProvider?: unknown;
    };
    readonly data?: readonly number[];
  } | null;
  readonly params?: {
    readonly diagnostics?: readonly { readonly code?: string }[];
  };
}

async function main(): Promise<void> {
  await access(serverPath);
  const manifest = JSON.parse(await readFile(path.join(serverRoot, 'package.json'), 'utf8')) as {
    type?: string;
  };
  if (manifest.type !== 'module') throw new Error('The staged server must be an ES module.');

  const major = Number(process.versions.node.split('.')[0]);
  if (!Number.isInteger(major) || major < 24) {
    throw new Error(`Forge Web Script LSP requires Node.js 24 or newer (found ${process.version}).`);
  }

  const child = spawn(process.execPath, [serverPath], {
    cwd: serverRoot,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const stderr = collectStderr(child);
  const messages = new RpcReader(child.stdout);
  try {
    await waitForReady(stderr);
    send(child, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        rootUri: 'file:///workspace',
        workspaceFolders: [
          { uri: 'file:///workspace', name: 'workspace' },
          { uri: 'file:///workspace/packages', name: 'packages' },
        ],
        capabilities: {},
      },
    });
    const initialized = await messages.next();
    assert(initialized.id === 1, 'The staged server did not answer initialize.');
    assert(initialized.result?.capabilities?.completionProvider !== undefined, 'Completion is not advertised.');
    assert(initialized.result?.capabilities?.hoverProvider === true, 'Hover is not advertised.');
    assert(
      initialized.result?.capabilities?.semanticTokensProvider !== undefined,
      'Semantic tokens are not advertised.',
    );

    send(child, { jsonrpc: '2.0', method: 'initialized', params: {} });
    send(child, {
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri: 'file:///workspace/main.fws',
          languageId: 'fws',
          version: 1,
          text: 'export fn broken(',
        },
      },
    });
    const diagnostics = await messages.until((message) => message.method === 'textDocument/publishDiagnostics');
    assert(
      diagnostics.params?.diagnostics?.some((diagnostic) => diagnostic.code === 'FWS-PARSE-017'),
      'The staged server did not publish the expected stable diagnostic code.',
    );

    const validSource = 'export fn add(value: i32) -> i32 {\n  return value;\n}';
    send(child, {
      jsonrpc: '2.0',
      method: 'textDocument/didChange',
      params: {
        textDocument: { uri: 'file:///workspace/main.fws', version: 2 },
        contentChanges: [{ text: validSource }],
      },
    });
    await messages.until((message) => message.method === 'textDocument/publishDiagnostics');
    send(child, {
      jsonrpc: '2.0',
      id: 2,
      method: 'textDocument/completion',
      params: { textDocument: { uri: 'file:///workspace/main.fws' }, position: { line: 1, character: 9 } },
    });
    const completion = await messages.until((message) => message.id === 2);
    assert(completion.result !== null, 'The staged server did not return completion results.');

    send(child, {
      jsonrpc: '2.0',
      id: 3,
      method: 'textDocument/hover',
      params: { textDocument: { uri: 'file:///workspace/main.fws' }, position: { line: 0, character: 12 } },
    });
    const hover = await messages.until((message) => message.id === 3);
    assert(hover.result !== null, 'The staged server did not return hover results.');

    send(child, {
      jsonrpc: '2.0',
      id: 4,
      method: 'textDocument/semanticTokens/full',
      params: { textDocument: { uri: 'file:///workspace/main.fws' } },
    });
    const semanticTokens = await messages.until((message) => message.id === 4);
    assert((semanticTokens.result?.data?.length ?? 0) > 0, 'The staged server did not return semantic tokens.');

    send(child, { jsonrpc: '2.0', id: 5, method: 'shutdown', params: undefined });
    const shutdown = await messages.until((message) => message.id === 5);
    assert(JSON.stringify(shutdown.result) === 'null', 'The staged server did not shut down cleanly.');
  } finally {
    child.kill();
  }
  await Promise.all(
    ['main.js', 'server.js', 'protocol.js', 'index.js'].map((module) => access(path.join(dapRoot, 'dist', module))),
  );
}

function collectStderr(child: ReturnType<typeof spawn>): {
  readonly text: () => string;
  readonly ready: Promise<void>;
} {
  if (child.stderr === null) throw new Error('The staged server process did not expose stderr.');
  const stderrStream = child.stderr;
  let value = '';
  let resolveReady: (() => void) | undefined;
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });
  stderrStream.setEncoding('utf8');
  stderrStream.on('data', (chunk: string) => {
    value += chunk;
    if (value.includes('language server ready')) resolveReady?.();
  });
  return { text: () => value, ready };
}

async function waitForReady(stderr: { readonly text: () => string; readonly ready: Promise<void> }): Promise<void> {
  await Promise.race([
    stderr.ready,
    new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Staged Forge Web Script LSP did not report readiness: ${stderr.text()}`)),
        5000,
      );
    }),
  ]);
}

function send(child: ReturnType<typeof spawn>, message: Record<string, unknown>): void {
  if (child.stdin === null) throw new Error('The staged server process did not expose stdin.');
  const body = JSON.stringify(message);
  child.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

class RpcReader {
  private buffer = '';
  private readonly queue: RpcMessage[] = [];
  private readonly waiters: Array<(message: RpcMessage) => void> = [];

  public constructor(stream: NodeJS.ReadableStream) {
    stream.setEncoding('utf8');
    stream.on('data', (chunk: string) => this.push(chunk));
  }

  public next(): Promise<RpcMessage> {
    const message = this.queue.shift();
    if (message !== undefined) return Promise.resolve(message);
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  public async until(predicate: (message: RpcMessage) => boolean): Promise<RpcMessage> {
    let message = await this.next();
    while (!predicate(message)) message = await this.next();
    return message;
  }

  private push(chunk: string): void {
    this.buffer += chunk;
    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) return;
      const length = Number(/Content-Length: (\d+)/iu.exec(this.buffer.slice(0, headerEnd))?.[1]);
      const bodyStart = headerEnd + 4;
      if (!Number.isInteger(length) || Buffer.byteLength(this.buffer.slice(bodyStart)) < length) return;
      const body = this.buffer.slice(bodyStart, bodyStart + length);
      this.buffer = this.buffer.slice(bodyStart + length);
      const message = JSON.parse(body) as RpcMessage;
      const waiter = this.waiters.shift();
      if (waiter === undefined) this.queue.push(message);
      else waiter(message);
    }
  }
}

await main();
