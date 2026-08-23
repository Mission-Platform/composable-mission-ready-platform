import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';

import {
  DapFrameParser,
  encodeDapMessage,
  encodeLineMessage,
  isRecord,
  RuntimeLineParser,
  type DapBreakpoint,
  type DapEvent,
  type DapRequest,
  type DapResponse,
  type DapSourceBreakpoint,
  type ForgeWebScriptDapLaunchArguments,
  type ForgeWebScriptRuntimeCommand,
  type ForgeWebScriptRuntimeMessage,
  type ForgeWebScriptRuntimeProcess,
  type ForgeWebScriptRuntimeRequest,
  type ForgeWebScriptRuntimeResponse,
  type ForgeWebScriptRuntimeSpawner,
} from './protocol.js';

import type { Readable, Writable } from 'node:stream';

export interface ForgeWebScriptDapServerOptions {
  readonly input: Readable;
  readonly output: Writable;
  readonly spawnRuntime?: ForgeWebScriptRuntimeSpawner;
  readonly runtimeResponseTimeoutMs?: number;
  readonly environment?: NodeJS.ProcessEnv;
}

export interface ForgeWebScriptDapServer {
  readonly start: () => void;
  readonly dispose: () => void;
}

interface PendingRuntimeRequest {
  readonly resolve: (response: ForgeWebScriptRuntimeResponse) => void;
  readonly reject: (error: Error) => void;
  readonly timeout: NodeJS.Timeout;
}

interface RuntimeBreakpointResult {
  readonly breakpoints?: readonly DapBreakpoint[];
}

interface RuntimeStackResult {
  readonly stackFrames?: readonly Record<string, unknown>[];
  readonly totalFrames?: number;
}

interface RuntimeScopesResult {
  readonly scopes?: readonly Record<string, unknown>[];
}

interface RuntimeVariablesResult {
  readonly variables?: readonly Record<string, unknown>[];
}

const DEFAULT_RESPONSE_TIMEOUT_MS = 10_000;

export function createForgeWebScriptDapServer(options: ForgeWebScriptDapServerOptions): ForgeWebScriptDapServer {
  let sequence = 1;
  let runtimeRequestId = 1;
  let runtime: ForgeWebScriptRuntimeProcess | undefined;
  let started = false;
  let disposed = false;
  let terminationEventSent = false;
  let currentThreadId = 1;
  const threads = new Set<number>();
  const breakpoints = new Map<string, readonly DapSourceBreakpoint[]>();
  const pending = new Map<number, PendingRuntimeRequest>();
  const dapParser = new DapFrameParser();
  const runtimeParser = new RuntimeLineParser();
  const responseTimeout = options.runtimeResponseTimeoutMs ?? DEFAULT_RESPONSE_TIMEOUT_MS;
  const spawnRuntime = options.spawnRuntime ?? defaultSpawnRuntime;

  function onInputEnded(): void {
    dispose();
  }

  function onInputClosed(): void {
    dispose();
  }

  function onInputError(error: Error): void {
    // If the IDE closes our pipe without sending disconnect/terminate, we must still clean up.
    // Avoid relying on DAP requests to trigger dispose().
    void error;
    dispose();
  }

  const send = (message: DapResponse | DapEvent): void => {
    if (!disposed) options.output.write(encodeDapMessage(message));
  };

  const respond = <T>(request: DapRequest, success: boolean, body?: T, message?: string): void => {
    send({
      seq: sequence++,
      type: 'response',
      request_seq: request.seq,
      success,
      command: request.command,
      ...(body === undefined ? {} : { body }),
      ...(message === undefined ? {} : { message }),
    });
  };

  const event = <T>(name: string, body?: T): void => {
    send({ seq: sequence++, type: 'event', event: name, ...(body === undefined ? {} : { body }) });
  };

  const rejectPending = (error: Error): void => {
    for (const [requestId, request] of pending) {
      clearTimeout(request.timeout);
      pending.delete(requestId);
      request.reject(error);
    }
  };

  const handleRuntimeMessage = (message: ForgeWebScriptRuntimeMessage): void => {
    if (message.type === 'response') {
      const request = pending.get(message.requestId);
      if (request === undefined) return;
      pending.delete(message.requestId);
      clearTimeout(request.timeout);
      request.resolve(message);
      return;
    }
    if (message.type === 'output') {
      event('output', { category: message.category ?? 'console', output: message.output });
      return;
    }
    if (message.type === 'stopped') {
      currentThreadId = message.threadId;
      threads.add(message.threadId);
      event('stopped', {
        reason: message.reason,
        threadId: message.threadId,
        ...(message.description === undefined ? {} : { description: message.description }),
        ...(message.source === undefined ? {} : { source: message.source }),
        ...(message.line === undefined ? {} : { line: message.line }),
        ...(message.column === undefined ? {} : { column: message.column }),
      });
      return;
    }
    if (message.type === 'continued') {
      event('continued', { threadId: message.threadId ?? currentThreadId, allThreadsContinued: true });
      return;
    }
    if (message.type === 'thread') {
      if (message.reason === 'started') threads.add(message.threadId);
      else threads.delete(message.threadId);
      event('thread', { reason: message.reason, threadId: message.threadId });
      return;
    }
    if (message.type === 'terminated') {
      sendTermination(message.exitCode);
      return;
    }
    event('output', { category: 'stderr', output: message.message });
  };

  const attachRuntime = (process_: ForgeWebScriptRuntimeProcess): void => {
    runtime = process_;
    process_.stdout.on('data', (chunk: Buffer | string) => {
      try {
        for (const message of runtimeParser.push(chunk)) handleRuntimeMessage(message);
      } catch (error: unknown) {
        event('output', { category: 'stderr', output: `Invalid runtime message: ${String(error)}\n` });
      }
    });
    process_.stderr.on('data', (chunk: Buffer | string) => {
      event('output', { category: 'stderr', output: chunk.toString() });
    });
    process_.on('error', (error) => {
      rejectPending(error);
      event('output', { category: 'stderr', output: `${error.message}\n` });
    });
    process_.on('close', (code) => {
      rejectPending(new Error('Forge Web Script runtime exited before completing the request.'));
      if (runtime === process_) runtime = undefined;
      if (code !== null && code !== 0)
        event('output', { category: 'stderr', output: `Runtime exited with code ${code}.\n` });
      sendTermination(code);
    });
  };

  const sendRuntimeRequest = (
    command: ForgeWebScriptRuntimeCommand,
    arguments_: unknown,
  ): Promise<ForgeWebScriptRuntimeResponse> => {
    if (runtime === undefined) return Promise.reject(new Error('The Forge Web Script runtime is not running.'));
    const requestId = runtimeRequestId++;
    const request: ForgeWebScriptRuntimeRequest = {
      type: 'request',
      requestId,
      command,
      ...(arguments_ === undefined ? {} : { arguments: arguments_ }),
    };
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error(`Runtime did not respond to '${command}' within ${responseTimeout}ms.`));
      }, responseTimeout);
      pending.set(requestId, { resolve, reject, timeout });
      runtime?.stdin.write(encodeLineMessage(request), (error?: Error | null) => {
        if (error !== undefined && error !== null) {
          clearTimeout(timeout);
          pending.delete(requestId);
          reject(error);
        }
      });
    });
  };

  const handleRequest = async (request: DapRequest): Promise<void> => {
    try {
      if (request.command === 'initialize') {
        respond(request, true, {
          supportsConfigurationDoneRequest: true,
          supportsTerminateRequest: true,
          supportsSteppingGranularity: false,
          supportsSetVariable: false,
        });
        event('initialized');
        return;
      }
      if (request.command === 'launch') {
        if (!isRecord(request.arguments)) throw new Error('Launch arguments are required.');
        const launch = await normalizeLaunchArguments(request.arguments);
        if (runtime !== undefined) throw new Error('A Forge Web Script debug session is already running.');
        attachRuntime(
          spawnRuntime(launch.runtimePath, [...launch.runtimeArgs], {
            cwd: launch.cwd,
            env: { ...process.env, ...options.environment, ...launch.env },
          }),
        );
        const result = await sendRuntimeRequest('launch', launch);
        if (!result.success) throw new Error(result.message ?? 'The Forge Web Script runtime rejected launch.');
        for (const [source, sourceBreakpoints] of breakpoints) {
          const breakpointResult = await sendRuntimeRequest('setBreakpoints', {
            source,
            breakpoints: sourceBreakpoints,
          });
          if (!breakpointResult.success)
            throw new Error(breakpointResult.message ?? `The runtime rejected source breakpoints for ${source}.`);
        }
        respond(request, true);
        return;
      }
      if (request.command === 'setBreakpoints') {
        const arguments_ = request.arguments;
        if (!isRecord(arguments_) || !isRecord(arguments_.source) || typeof arguments_.source.path !== 'string')
          throw new Error('setBreakpoints requires source.path.');
        const sourcePath = path.resolve(arguments_.source.path);
        const requested = Array.isArray(arguments_.breakpoints)
          ? arguments_.breakpoints
              .filter(isRecord)
              .flatMap((value) =>
                typeof value.line === 'number'
                  ? [{ line: value.line, ...(typeof value.column === 'number' ? { column: value.column } : {}) }]
                  : [],
              )
          : [];
        breakpoints.set(sourcePath, requested);
        if (runtime === undefined) {
          respond(request, true, { breakpoints: requested.map((breakpoint) => ({ ...breakpoint, verified: false })) });
          return;
        }
        const result = await sendRuntimeRequest('setBreakpoints', { source: sourcePath, breakpoints: requested });
        if (!result.success) throw new Error(result.message ?? 'The runtime rejected source breakpoints.');
        const body = isRecord(result.body) ? (result.body as RuntimeBreakpointResult) : {};
        respond(request, true, {
          breakpoints: body.breakpoints ?? requested.map((breakpoint) => ({ ...breakpoint, verified: true })),
        });
        return;
      }
      if (request.command === 'configurationDone') {
        const result = await sendRuntimeRequest('configurationDone', {});
        if (!result.success) throw new Error(result.message ?? 'The runtime rejected configurationDone.');
        respond(request, true);
        return;
      }
      if (request.command === 'threads') {
        const result = await sendRuntimeRequest('threads', {});
        if (!result.success) throw new Error(result.message ?? 'The runtime rejected threads.');
        respond(request, true, result.body ?? { threads: [...threads].map((id) => ({ id, name: `Thread ${id}` })) });
        return;
      }
      if (request.command === 'stackTrace' || request.command === 'scopes' || request.command === 'variables') {
        const arguments_ = isRecord(request.arguments) ? request.arguments : {};
        const command = request.command;
        const result = await sendRuntimeRequest(command, arguments_);
        if (!result.success) throw new Error(result.message ?? `The runtime rejected ${command}.`);
        const body = result.body ?? {};
        if (command === 'stackTrace') {
          const stack = isRecord(body) ? (body as RuntimeStackResult) : {};
          respond(request, true, {
            stackFrames: stack.stackFrames ?? [],
            ...(stack.totalFrames === undefined ? {} : { totalFrames: stack.totalFrames }),
          });
        } else if (command === 'scopes') {
          const scopes = isRecord(body) ? (body as RuntimeScopesResult) : {};
          respond(request, true, { scopes: scopes.scopes ?? [] });
        } else {
          const variables = isRecord(body) ? (body as RuntimeVariablesResult) : {};
          respond(request, true, { variables: variables.variables ?? [] });
        }
        return;
      }
      if (
        request.command === 'continue' ||
        request.command === 'next' ||
        request.command === 'stepIn' ||
        request.command === 'stepOut' ||
        request.command === 'pause'
      ) {
        const result = await sendRuntimeRequest(request.command, isRecord(request.arguments) ? request.arguments : {});
        if (!result.success) throw new Error(result.message ?? `The runtime rejected ${request.command}.`);
        respond(request, true, result.body);
        return;
      }
      if (
        request.command === 'fwsTraceSummary' ||
        request.command === 'fwsTraceEvents' ||
        request.command === 'fwsMemoryState' ||
        request.command === 'fwsCapabilityCalls' ||
        request.command === 'fwsTrapEvidence'
      ) {
        const result = await sendRuntimeRequest(request.command, isRecord(request.arguments) ? request.arguments : {});
        if (!result.success) throw new Error(result.message ?? `The runtime rejected ${request.command}.`);
        respond(request, true, result.body ?? {});
        return;
      }
      if (request.command === 'terminate' || request.command === 'disconnect') {
        if (runtime !== undefined) {
          const result = await sendRuntimeRequest(
            request.command,
            isRecord(request.arguments) ? request.arguments : {},
          );
          if (!result.success) throw new Error(result.message ?? `The runtime rejected ${request.command}.`);
          runtime.kill('SIGTERM');
        }
        respond(request, true);
        if (request.command === 'disconnect') dispose();
        return;
      }
      throw new Error(`Unsupported DAP request '${request.command}'.`);
    } catch (error: unknown) {
      if (request.command === 'launch' && runtime !== undefined) {
        runtime.kill('SIGTERM');
        runtime = undefined;
      }
      respond(request, false, undefined, error instanceof Error ? error.message : String(error));
    }
  };

  const onData = (chunk: Buffer | string): void => {
    try {
      for (const message of dapParser.push(chunk)) {
        if (message.type === 'request') void handleRequest(message);
      }
    } catch (error: unknown) {
      event('output', { category: 'stderr', output: `Invalid DAP message: ${String(error)}\n` });
    }
  };

  function sendTermination(exitCode: number | undefined | null): void {
    if (terminationEventSent || disposed) return;
    terminationEventSent = true;
    event('exited', { exitCode: exitCode ?? 0 });
    event('terminated');
  }

  function start(): void {
    if (started) return;
    started = true;
    options.input.on('data', onData);
    options.input.once('end', onInputEnded);
    options.input.once('close', onInputClosed);
    options.input.once('error', onInputError);
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    options.input.off('data', onData);
    options.input.off('end', onInputEnded);
    options.input.off('close', onInputClosed);
    options.input.off('error', onInputError);
    rejectPending(new Error('DAP server disposed.'));
    runtime?.kill('SIGTERM');
    runtime = undefined;
  }

  return { start, dispose };
}

function defaultSpawnRuntime(
  executable: string,
  arguments_: readonly string[],
  options_: { cwd: string; env: NodeJS.ProcessEnv },
): ForgeWebScriptRuntimeProcess {
  return spawn(executable, [...arguments_], { cwd: options_.cwd, env: options_.env, stdio: ['pipe', 'pipe', 'pipe'] });
}

async function normalizeLaunchArguments(arguments_: Record<string, unknown>): Promise<
  ForgeWebScriptDapLaunchArguments & {
    readonly cwd: string;
    readonly runtimePath: string;
    readonly runtimeArgs: readonly string[];
  }
> {
  if (typeof arguments_.program !== 'string' || arguments_.program.trim().length === 0)
    throw new Error("Launch requires a non-empty 'program' path.");
  if (arguments_.cwd !== undefined && typeof arguments_.cwd !== 'string')
    throw new Error("'cwd' must be a path string.");
  const cwd =
    typeof arguments_.cwd === 'string' && arguments_.cwd.length > 0 ? path.resolve(arguments_.cwd) : process.cwd();
  const program = path.resolve(cwd, arguments_.program);
  if (arguments_.runtimePath !== undefined && typeof arguments_.runtimePath !== 'string')
    throw new Error("'runtimePath' must be an executable path string.");
  const runtimePathValue =
    typeof arguments_.runtimePath === 'string' && arguments_.runtimePath.trim().length > 0
      ? arguments_.runtimePath
      : // The environment fallback is intentionally explicit and only supplies the runtime executable.
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        process.env.FORGE_WEB_SCRIPT_RUNTIME;
  if (runtimePathValue === undefined) throw new Error("Launch requires 'runtimePath' or FORGE_WEB_SCRIPT_RUNTIME.");
  if (
    arguments_.runtimeArgs !== undefined &&
    (!Array.isArray(arguments_.runtimeArgs) || !arguments_.runtimeArgs.every((value) => typeof value === 'string'))
  )
    throw new Error("'runtimeArgs' must be an array of strings.");
  if (
    arguments_.args !== undefined &&
    (!Array.isArray(arguments_.args) || !arguments_.args.every((value) => typeof value === 'string'))
  )
    throw new Error("'args' must be an array of strings.");
  if (arguments_.stopOnEntry !== undefined && typeof arguments_.stopOnEntry !== 'boolean')
    throw new Error("'stopOnEntry' must be a boolean.");
  if (
    arguments_.env !== undefined &&
    (!isRecord(arguments_.env) ||
      Object.values(arguments_.env).some((value) => value !== undefined && typeof value !== 'string'))
  )
    throw new Error("'env' must be an object containing string values.");
  await access(cwd).catch(() => {
    throw new Error(`Launch working directory does not exist: ${cwd}`);
  });
  await access(program).catch(() => {
    throw new Error(`Launch program does not exist: ${program}`);
  });
  return {
    program,
    cwd,
    runtimePath: runtimePathValue,
    runtimeArgs: Array.isArray(arguments_.runtimeArgs) ? (arguments_.runtimeArgs as string[]) : [],
    args: Array.isArray(arguments_.args) ? (arguments_.args as string[]) : [],
    ...(isRecord(arguments_.env)
      ? {
          env: Object.fromEntries(
            Object.entries(arguments_.env).filter(
              (entry): entry is [string, string | undefined] => typeof entry[1] === 'string' || entry[1] === undefined,
            ),
          ),
        }
      : {}),
    ...(typeof arguments_.stopOnEntry === 'boolean' ? { stopOnEntry: arguments_.stopOnEntry } : {}),
  };
}
