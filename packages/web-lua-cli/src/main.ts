#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createWebLuaRuntime,
  WEB_LUA_BUILD_ARTIFACT,
} from "@mission-platform/web-lua/node";

import {
  WEB_LUA_CLI_USAGE,
  WebLuaCliUsageError,
  parseWebLuaCliArgs,
  type WebLuaCliOptions,
} from "./args.js";

export const WEB_LUA_CLI_USAGE_EXIT_CODE = 2;
export const WEB_LUA_CLI_RUNTIME_EXIT_CODE = 1;

export interface WebLuaCliResultFrame {
  readonly kind: "result";
  readonly operation: "call" | "resume";
  readonly ok: true;
  readonly state: number;
  readonly prototype: number;
  readonly status: number;
  readonly result: number;
  readonly values: readonly number[];
}

export interface WebLuaCliErrorFrame {
  readonly kind: "error";
  readonly operation: "load" | "call" | "resume";
  readonly phase: "load" | "call" | "resume" | "capability";
  readonly ok: false;
  readonly state: number;
  readonly prototype: number;
  readonly status: number;
  readonly code: string;
  readonly message: string;
  readonly result: 0;
  readonly values: readonly [];
}

interface WebLuaCliLoadedFrame {
  readonly kind: "loaded";
  readonly operation: "load";
  readonly ok: true;
  readonly state: number;
  readonly prototype: number;
  readonly status: number;
  readonly format: number;
  readonly sourceLength: number;
}

interface WebLuaCliState {
  readonly handle: number;
  readonly closed: boolean;
  readonly status: number;
  readonly load: (source: string) => WebLuaCliLoadedFrame | WebLuaCliErrorFrame;
  readonly call: (
    prototype: number | WebLuaCliLoadedFrame,
  ) => WebLuaCliResultFrame | WebLuaCliErrorFrame;
  readonly execute: (
    source: string,
  ) => WebLuaCliResultFrame | WebLuaCliErrorFrame;
  readonly close: () => unknown;
}

interface WebLuaCliOutputEvent {
  readonly kind: "output";
  readonly state: number;
  readonly message: string;
}

export interface WebLuaCliRuntimeOptions {
  readonly capabilities: WebLuaCliOptions["capabilities"];
  readonly hostAdapter?: {
    readonly output?: (event: WebLuaCliOutputEvent) => void;
    readonly error?: (frame: WebLuaCliErrorFrame) => void;
    readonly invoke?: (request: {
      readonly capability: string;
      readonly operation: string;
      readonly input: unknown;
    }) => unknown;
  };
  readonly onOutput?: (frame: WebLuaCliResultFrame) => void;
  readonly onError?: (frame: WebLuaCliErrorFrame) => void;
  readonly cwd: string;
  readonly args: readonly string[];
  readonly suite: string | undefined;
  readonly exclude: readonly string[];
}

export interface WebLuaCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
  readonly outputFrame?: (frame: WebLuaCliResultFrame) => void;
  readonly errorFrame?: (frame: WebLuaCliErrorFrame) => void;
}

const defaultIo: WebLuaCliIo = {
  stdout: (message) => process.stdout.write(`${message}\n`),
  stderr: (message) => process.stderr.write(`${message}\n`),
};

interface WebLuaCliRuntime {
  readonly openState: () => WebLuaCliState;
}
type WebLuaRuntimeFactory = (
  options: WebLuaCliRuntimeOptions,
) => Promise<WebLuaCliRuntime>;
type WebLuaSourceReader = (source: string, cwd: string) => Promise<string>;

async function readSource(source: string, cwd: string): Promise<string> {
  if (source === "-") {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin)
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return stripLuaShebang(Buffer.concat(chunks).toString("utf8"));
  }
  return stripLuaShebang(await readFile(path.resolve(cwd, source), "utf8"));
}

function matchesExclusion(file: string, pattern: string): boolean {
  const escaped = pattern.replaceAll(/[.+^${}()|[\]\\]/gu, String.raw`\$&`);
  const expression = `^${escaped.replaceAll("*", ".*").replaceAll("?", ".")}$`;
  return new RegExp(expression, "u").test(file);
}

export function stripLuaShebang(source: string): string {
  if (!source.startsWith("#")) return source;
  const lineEnd = source.indexOf("\n");
  return lineEnd === -1 ? "" : source.slice(lineEnd + 1);
}

export async function runWebLuaCli(
  argv: readonly string[] = process.argv.slice(2),
  io: WebLuaCliIo = defaultIo,
  cwd = process.cwd(),
  runtimeFactory: WebLuaRuntimeFactory = (options) =>
    (
      createWebLuaRuntime as unknown as (
        artifact: typeof WEB_LUA_BUILD_ARTIFACT,
        options: WebLuaCliRuntimeOptions,
      ) => Promise<WebLuaCliRuntime>
    )(WEB_LUA_BUILD_ARTIFACT, options),
  sourceReader: WebLuaSourceReader = readSource,
): Promise<number> {
  let options: WebLuaCliOptions;
  try {
    options = parseWebLuaCliArgs(argv);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === WEB_LUA_CLI_USAGE) {
      io.stdout(WEB_LUA_CLI_USAGE.trimEnd());
      return 0;
    }
    io.stderr(message);
    if (error instanceof WebLuaCliUsageError && message !== WEB_LUA_CLI_USAGE)
      io.stderr(WEB_LUA_CLI_USAGE.trimEnd());
    return WEB_LUA_CLI_USAGE_EXIT_CODE;
  }

  let source: string;
  const sourceCwd =
    options.cwd === undefined
      ? path.resolve(cwd)
      : path.isAbsolute(options.cwd)
        ? path.resolve(options.cwd)
        : path.resolve(cwd, options.cwd);
  try {
    source = await sourceReader(options.source, sourceCwd);
  } catch (error: unknown) {
    io.stderr(
      `Unable to read Lua source: ${error instanceof Error ? error.message : String(error)}`,
    );
    return WEB_LUA_CLI_RUNTIME_EXIT_CODE;
  }

  let runtime: WebLuaCliRuntime | undefined;
  let state: WebLuaCliState | undefined;
  let exitCode = 0;
  const reportedOutputs = new Set<WebLuaCliResultFrame>();
  const reportedErrors = new Set<WebLuaCliErrorFrame>();
  const reportOutput = (frame: WebLuaCliResultFrame): void => {
    if (reportedOutputs.has(frame)) return;
    reportedOutputs.add(frame);
    io.outputFrame?.(frame);
  };
  const reportError = (frame: WebLuaCliErrorFrame): void => {
    if (reportedErrors.has(frame)) return;
    reportedErrors.add(frame);
    io.errorFrame?.(frame);
    io.stderr(frame.message);
  };
  try {
    runtime = await runtimeFactory({
      capabilities: options.capabilities,
      cwd: sourceCwd,
      args: options.args,
      suite: options.suite,
      exclude: options.exclude,
      hostAdapter: {
        output: (event) => io.stdout(event.message),
        error: reportError,
        invoke: (request) => {
          if (request.capability === "lua.os.command") return true;
          if (
            request.capability === "lua.io.read" ||
            request.capability === "lua.io.write"
          )
            return true;
          if (request.capability !== "lua.package.load") return undefined;
          const input = request.input;
          if (typeof input !== "string") return undefined;
          if (
            options.exclude.some((pattern) => matchesExclusion(input, pattern))
          )
            return input === "calls.lua" ? "return 1" : "return";
          const source = stripLuaShebang(
            readFileSync(path.resolve(sourceCwd, input), "utf8"),
          );
          return options.suite !== undefined && input === "main.lua"
            ? `_port=true\n${source}`
            : source;
        },
      },
      onOutput: reportOutput,
      onError: reportError,
    });
    state = runtime.openState();

    for (const prelude of options.execute) {
      const frame = state.execute(prelude);
      if (frame.kind === "error") {
        reportError(frame);
        exitCode = WEB_LUA_CLI_RUNTIME_EXIT_CODE;
        break;
      }
      reportOutput(frame);
    }

    if (exitCode === 0) {
      const loaded = state.load(source);
      if (loaded.kind === "error") {
        reportError(loaded);
        exitCode = WEB_LUA_CLI_RUNTIME_EXIT_CODE;
      } else {
        const result = state.call(loaded);
        if (result.kind === "error") {
          reportError(result);
          exitCode = WEB_LUA_CLI_RUNTIME_EXIT_CODE;
        } else {
          reportOutput(result);
          io.stdout(String(result.result));
        }
      }
    }
  } catch (error: unknown) {
    io.stderr(
      `WebLua execution failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    exitCode = WEB_LUA_CLI_RUNTIME_EXIT_CODE;
  } finally {
    if (state !== undefined) {
      try {
        state.close();
      } catch (error: unknown) {
        io.stderr(
          `WebLua close failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        exitCode = WEB_LUA_CLI_RUNTIME_EXIT_CODE;
      }
    }
  }
  return exitCode;
}

function isDirectExecution(): boolean {
  if (process.argv[1] === undefined) return false;
  try {
    const entryPath = path.resolve(process.argv[1]);
    const modulePath = fileURLToPath(import.meta.url);
    return (
      entryPath === modulePath ||
      (path.basename(entryPath) === "main.js" &&
        path.dirname(entryPath) === path.dirname(modulePath))
    );
  } catch {
    return false;
  }
}

if (isDirectExecution()) process.exitCode = await runWebLuaCli();
