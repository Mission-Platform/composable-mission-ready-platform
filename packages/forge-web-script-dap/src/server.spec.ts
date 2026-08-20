import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { DapFrameParser, encodeDapMessage, type DapMessage } from './protocol.js';
import { createForgeWebScriptDapServer } from './server.js';

const RUNTIME_FIXTURE = String.raw`
let input = '';
const send = (message) => process.stdout.write(JSON.stringify(message) + '\n');
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  input += chunk;
  let newline = input.indexOf('\n');
  while (newline !== -1) {
    const line = input.slice(0, newline).trim();
    input = input.slice(newline + 1);
    if (!line) { newline = input.indexOf('\n'); continue; }
    const request = JSON.parse(line);
    const reply = (body) => send({ type: 'response', requestId: request.requestId, success: true, body });
    if (request.command === 'launch') reply({ ready: true });
    else if (request.command === 'setBreakpoints') reply({ breakpoints: request.arguments.breakpoints.map((breakpoint, index) => ({ ...breakpoint, id: index + 1, verified: true })) });
    else if (request.command === 'configurationDone') {
      reply({});
      send({ type: 'output', category: 'stdout', output: 'fixture started\n' });
      send({ type: 'thread', reason: 'started', threadId: 1 });
      send({ type: 'stopped', reason: 'breakpoint', threadId: 1, source: { path: request.arguments?.program }, line: 2, column: 1 });
    } else if (request.command === 'stackTrace') reply({ stackFrames: [{ id: 10, name: 'main', line: 2, column: 1, source: { path: 'main.fws' } }], totalFrames: 1 });
    else if (request.command === 'scopes') reply({ scopes: [{ name: 'locals', variablesReference: 20 }] });
    else if (request.command === 'variables') reply({ variables: [{ name: 'answer', value: '42', type: 'i32' }] });
    else if (request.command === 'continue') { reply({}); send({ type: 'continued', threadId: 1 }); send({ type: 'stopped', reason: 'step', threadId: 1, source: { path: 'main.fws' }, line: 3, column: 1 }); }
    else if (request.command === 'terminate' || request.command === 'disconnect') { reply({}); process.exit(0); }
    newline = input.indexOf('\n');
  }
});
`;

const RUNTIME_REJECTS_LAUNCH = String.raw`
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  input += chunk;
  let newline = input.indexOf('\n');
  while (newline !== -1) {
    const line = input.slice(0, newline).trim();
    input = input.slice(newline + 1);
    if (!line) { newline = input.indexOf('\n'); continue; }
    const request = JSON.parse(line);
    const reply = (body) => process.stdout.write(JSON.stringify({ type: 'response', requestId: request.requestId, success: false, body }) + '\n');
    if (request.command === 'launch') {
      process.stdout.write(JSON.stringify({ type: 'response', requestId: request.requestId, success: false, message: 'fixture rejected launch' }) + '\n');
    }
    newline = input.indexOf('\n');
  }
});
`;

const RUNTIME_EXIT_ON_STACKTRACE = String.raw`
let input = '';
const send = (message) => process.stdout.write(JSON.stringify(message) + '\n');
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  input += chunk;
  let newline = input.indexOf('\n');
  while (newline !== -1) {
    const line = input.slice(0, newline).trim();
    input = input.slice(newline + 1);
    if (!line) { newline = input.indexOf('\n'); continue; }
    const request = JSON.parse(line);
    const reply = (body) => send({ type: 'response', requestId: request.requestId, success: true, body });
    if (request.command === 'launch') reply({ ready: true });
    else if (request.command === 'configurationDone') {
      reply({});
      send({ type: 'thread', reason: 'started', threadId: 1 });
      send({ type: 'stopped', reason: 'breakpoint', threadId: 1, source: { path: request.arguments?.program }, line: 2, column: 1 });
    } else if (request.command === 'stackTrace') {
      // Exit without answering a pending request.
      process.exit(0);
    }
    newline = input.indexOf('\n');
  }
});
`;

describe('Forge Web Script DAP server', () => {
  it('launches a separate runtime, stops on a source breakpoint, inspects state, steps, and terminates', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'fws-dap-'));
    const program = path.join(cwd, 'main.fws');
    await writeFile(program, 'fn main() {}\n', 'utf8');
    const input = new PassThrough();
    const output = new PassThrough();
    const parser = new DapFrameParser();
    const messages: DapMessage[] = [];
    const server = createForgeWebScriptDapServer({
      input,
      output,
      runtimeResponseTimeoutMs: 2000,
      spawnRuntime: (executable, arguments_, options) =>
        spawn(executable, [...arguments_], { cwd: options.cwd, env: options.env, stdio: ['pipe', 'pipe', 'pipe'] }),
    });
    server.start();

    sendRequest(input, 1, 'initialize');
    expect(await nextMessage(output, parser, messages)).toMatchObject({ request_seq: 1, success: true });
    expect(await nextMessage(output, parser, messages)).toMatchObject({ type: 'event', event: 'initialized' });

    sendRequest(input, 2, 'setBreakpoints', { source: { path: program }, breakpoints: [{ line: 2 }] });
    expect(await nextMessage(output, parser, messages)).toMatchObject({
      request_seq: 2,
      success: true,
      body: { breakpoints: [{ verified: false }] },
    });

    sendRequest(input, 3, 'launch', {
      program,
      cwd,
      runtimePath: process.execPath,
      runtimeArgs: ['--input-type=module', '-e', RUNTIME_FIXTURE],
    });
    expect(await nextMessage(output, parser, messages)).toMatchObject({ request_seq: 3, success: true });
    sendRequest(input, 4, 'configurationDone');
    expect(
      await nextMatching(
        output,
        parser,
        messages,
        (message) => message.type === 'response' && message.request_seq === 4,
      ),
    ).toMatchObject({
      request_seq: 4,
      success: true,
    });
    expect(await nextMessage(output, parser, messages)).toMatchObject({
      type: 'event',
      event: 'output',
      body: { output: 'fixture started\n' },
    });
    expect(await nextMessage(output, parser, messages)).toMatchObject({
      type: 'event',
      event: 'thread',
      body: { threadId: 1 },
    });
    expect(await nextMessage(output, parser, messages)).toMatchObject({
      type: 'event',
      event: 'stopped',
      body: { reason: 'breakpoint', threadId: 1, line: 2 },
    });

    sendRequest(input, 5, 'stackTrace', { threadId: 1 });
    expect(await nextMessage(output, parser, messages)).toMatchObject({
      request_seq: 5,
      body: { stackFrames: [{ name: 'main' }] },
    });
    sendRequest(input, 6, 'scopes', { frameId: 10 });
    expect(await nextMessage(output, parser, messages)).toMatchObject({
      request_seq: 6,
      body: { scopes: [{ variablesReference: 20 }] },
    });
    sendRequest(input, 7, 'variables', { variablesReference: 20 });
    expect(await nextMessage(output, parser, messages)).toMatchObject({
      request_seq: 7,
      body: { variables: [{ name: 'answer', value: '42' }] },
    });

    sendRequest(input, 8, 'continue', { threadId: 1 });
    expect(
      await nextMatching(
        output,
        parser,
        messages,
        (message) => message.type === 'event' && message.event === 'continued',
      ),
    ).toMatchObject({
      type: 'event',
      event: 'continued',
    });
    expect(
      await nextMatching(
        output,
        parser,
        messages,
        (message) => message.type === 'event' && message.event === 'stopped',
      ),
    ).toMatchObject({
      type: 'event',
      event: 'stopped',
      body: { reason: 'step', line: 3 },
    });
    expect(
      await nextMatching(
        output,
        parser,
        messages,
        (message) => message.type === 'response' && message.request_seq === 8,
      ),
    ).toMatchObject({ request_seq: 8, success: true });

    sendRequest(input, 9, 'terminate');
    expect(await nextMessage(output, parser, messages)).toMatchObject({ request_seq: 9, success: true });
    expect(await nextMessage(output, parser, messages)).toMatchObject({ type: 'event', event: 'exited' });
    expect(await nextMessage(output, parser, messages)).toMatchObject({ type: 'event', event: 'terminated' });
    server.dispose();
  }, 10_000);

  it('terminates the runtime process when adapter input closes without disconnect', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'fws-dap-'));
    const program = path.join(cwd, 'main.fws');
    await writeFile(program, 'fn main() {}\n', 'utf8');

    const input = new PassThrough();
    const output = new PassThrough();
    const parser = new DapFrameParser();
    const messages: DapMessage[] = [];

    let runtimeChild: ChildProcess | undefined;

    const server = createForgeWebScriptDapServer({
      input,
      output,
      runtimeResponseTimeoutMs: 2000,
      spawnRuntime: (executable, arguments_, options) => {
        runtimeChild = spawn(executable, [...arguments_], { cwd: options.cwd, env: options.env, stdio: ['pipe', 'pipe', 'pipe'] });
        return runtimeChild;
      },
    });

    server.start();

    sendRequest(input, 1, 'initialize');
    expect(await nextMessage(output, parser, messages)).toMatchObject({ request_seq: 1, success: true });
    expect(await nextMessage(output, parser, messages)).toMatchObject({ type: 'event', event: 'initialized' });

    sendRequest(input, 2, 'launch', {
      program,
      cwd,
      runtimePath: process.execPath,
      runtimeArgs: ['--input-type=module', '-e', RUNTIME_FIXTURE],
    });
    expect(await nextMessage(output, parser, messages)).toMatchObject({ request_seq: 2, success: true });

    input.end();
    const runtimeClosed = await waitForChildClose(runtimeChild, 2000);
    expect(runtimeClosed).toMatchObject({});

    server.dispose();
  }, 10_000);

  it('surfaces runtime launch rejection and terminates the runtime', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'fws-dap-'));
    const program = path.join(cwd, 'main.fws');
    await writeFile(program, 'fn main() {}\n', 'utf8');

    const input = new PassThrough();
    const output = new PassThrough();
    const parser = new DapFrameParser();
    const messages: DapMessage[] = [];

    let runtimeChild: ChildProcess | undefined;
    const server = createForgeWebScriptDapServer({
      input,
      output,
      runtimeResponseTimeoutMs: 2000,
      spawnRuntime: (executable, arguments_, options) => {
        runtimeChild = spawn(executable, [...arguments_], { cwd: options.cwd, env: options.env, stdio: ['pipe', 'pipe', 'pipe'] });
        return runtimeChild;
      },
    });
    server.start();

    sendRequest(input, 1, 'initialize');
    expect(await nextMessage(output, parser, messages)).toMatchObject({ request_seq: 1, success: true });
    expect(await nextMessage(output, parser, messages)).toMatchObject({ type: 'event', event: 'initialized' });

    sendRequest(input, 2, 'launch', {
      program,
      cwd,
      runtimePath: process.execPath,
      runtimeArgs: ['--input-type=module', '-e', RUNTIME_REJECTS_LAUNCH],
    });
    const response = await nextMatching(output, parser, messages, (message) => message.type === 'response' && message.request_seq === 2);
    expect(response).toMatchObject({ request_seq: 2, success: false });
    if (response.type === 'response') expect(response.message).toMatch(/fixture rejected launch/);

    const runtimeClosed = await waitForChildClose(runtimeChild, 2000);
    expect(runtimeClosed.code === 0 || runtimeClosed.signal !== null).toBe(true);

    server.dispose();
  }, 10_000);

  it('fails stackTrace when runtime exits before answering the pending request', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'fws-dap-'));
    const program = path.join(cwd, 'main.fws');
    await writeFile(program, 'fn main() {}\n', 'utf8');

    const input = new PassThrough();
    const output = new PassThrough();
    const parser = new DapFrameParser();
    const messages: DapMessage[] = [];

    let runtimeChild: ChildProcess | undefined;
    const server = createForgeWebScriptDapServer({
      input,
      output,
      runtimeResponseTimeoutMs: 2000,
      spawnRuntime: (executable, arguments_, options) => {
        runtimeChild = spawn(executable, [...arguments_], { cwd: options.cwd, env: options.env, stdio: ['pipe', 'pipe', 'pipe'] });
        return runtimeChild;
      },
    });
    server.start();

    sendRequest(input, 1, 'initialize');
    expect(await nextMessage(output, parser, messages)).toMatchObject({ request_seq: 1, success: true });
    expect(await nextMessage(output, parser, messages)).toMatchObject({ type: 'event', event: 'initialized' });

    sendRequest(input, 2, 'launch', {
      program,
      cwd,
      runtimePath: process.execPath,
      runtimeArgs: ['--input-type=module', '-e', RUNTIME_EXIT_ON_STACKTRACE],
    });
    expect(await nextMessage(output, parser, messages)).toMatchObject({ request_seq: 2, success: true });

    sendRequest(input, 3, 'stackTrace', { threadId: 1 });
    const response = await nextMatching(output, parser, messages, (message) => message.type === 'response' && message.request_seq === 3);
    expect(response).toMatchObject({ request_seq: 3, success: false });
    if (response.type === 'response') expect(response.message).toMatch(/exited before completing the request/);

    const runtimeClosed = await waitForChildClose(runtimeChild, 2000);
    expect(runtimeClosed).toBeDefined();

    server.dispose();
  }, 10_000);

  it('surfaces invalid program path as a launch failure', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const parser = new DapFrameParser();
    const messages: DapMessage[] = [];

    const cwd = await mkdtemp(path.join(tmpdir(), 'fws-dap-'));
    const program = path.join(cwd, 'missing.fws');

    let spawnCalled = false;
    const server = createForgeWebScriptDapServer({
      input,
      output,
      spawnRuntime: () => {
        spawnCalled = true;
        throw new Error('spawnRuntime must not be called');
      },
    });
    server.start();

    sendRequest(input, 1, 'launch', {
      program,
      cwd,
      runtimePath: process.execPath,
    });

    const response = await nextMessage(output, parser, messages);
    expect(response).toMatchObject({ request_seq: 1, success: false });
    if (response.type === 'response') expect(response.message).toMatch(/Launch program does not exist/);
    expect(spawnCalled).toBe(false);
    server.dispose();
  });

  it('returns actionable launch failures for missing runtime and program paths', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const parser = new DapFrameParser();
    const messages: DapMessage[] = [];
    const server = createForgeWebScriptDapServer({ input, output });
    server.start();
    sendRequest(input, 1, 'launch', { program: 'missing.fws', cwd: process.cwd() });
    expect(await nextMessage(output, parser, messages)).toMatchObject({
      request_seq: 1,
      success: false,
      message: "Launch requires 'runtimePath' or FORGE_WEB_SCRIPT_RUNTIME.",
    });
    server.dispose();
  });
});

async function waitForChildClose(
  child: ChildProcess | undefined,
  timeoutMs: number,
): Promise<{ readonly code: number | null; readonly signal: NodeJS.Signals | undefined }> {
  if (child === undefined) throw new Error('Runtime process was not spawned.');
  if (child.exitCode !== null) return { code: child.exitCode, signal: undefined };
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for child process to close within ${timeoutMs}ms.`)), timeoutMs);
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal: signal ?? undefined });
    });
  });
}

function sendRequest(input: PassThrough, seq: number, command: string, arguments_?: unknown): void {
  input.write(
    encodeDapMessage({ seq, type: 'request', command, ...(arguments_ === undefined ? {} : { arguments: arguments_ }) }),
  );
}

interface MessageQueueState {
  readonly messages: DapMessage[];
  readonly waiters: Array<MessageWaiter>;
}

interface MessageWaiter {
  readonly predicate: (message: DapMessage) => boolean;
  readonly resolve: (message: DapMessage) => void;
}

const messageQueues = new WeakMap<PassThrough, MessageQueueState>();

function nextMessage(output: PassThrough, parser: DapFrameParser, messages: DapMessage[]): Promise<DapMessage> {
  return nextMatching(output, parser, messages, () => true);
}

function nextMatching(
  output: PassThrough,
  parser: DapFrameParser,
  messages: DapMessage[],
  predicate: (message: DapMessage) => boolean,
): Promise<DapMessage> {
  let state = messageQueues.get(output);
  if (state === undefined) {
    state = { messages, waiters: [] };
    messageQueues.set(output, state);
    output.on('data', (chunk: Buffer | string) => {
      for (const message of parser.push(chunk)) {
        const waiterIndex = state?.waiters.findIndex((waiter) => waiter.predicate(message)) ?? -1;
        if (waiterIndex === -1) state?.messages.push(message);
        else state?.waiters.splice(waiterIndex, 1)[0]?.resolve(message);
      }
    });
  }
  const queuedIndex = state.messages.findIndex((message) => predicate(message));
  const queued = queuedIndex === -1 ? undefined : state.messages.splice(queuedIndex, 1)[0];
  if (queued !== undefined) return Promise.resolve(queued);
  return new Promise((resolve) => state?.waiters.push({ predicate, resolve }));
}
