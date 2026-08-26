import { spawn } from "node:child_process";
import { access, constants, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { WEB_LUA_STATUS } from "./abi.js";
import { createWebLuaRuntime, type WebLuaRuntime } from "./runtime.js";

const NATIVE_LUA_ENV = "WEB_LUA_NATIVE_LUA";
const NATIVE_LUA_TIMEOUT_MS = 5000;
const RESULT_PREFIX = "WEB_LUA_RESULT\t";

export type LuaDifferentialExpected =
  | { readonly kind: "value"; readonly value: number }
  | { readonly kind: "syntax-error" }
  | { readonly kind: "runtime-error" };

export interface LuaDifferentialFixture {
  readonly name: string;
  readonly source: string;
  readonly expected: LuaDifferentialExpected;
}

const NATIVE_WRAPPER = String.raw`
local chunk, syntax_error = loadfile(arg[1], "t", _ENV)
if chunk == nil then
  io.write("WEB_LUA_RESULT\tsyntax-error\n")
  return
end
local ok, value = pcall(chunk)
if not ok then
  io.write("WEB_LUA_RESULT\truntime-error\n")
  return
end
if value == nil then
  io.write("WEB_LUA_RESULT\tvalue\t0\n")
elseif type(value) == "boolean" then
  io.write("WEB_LUA_RESULT\tvalue\t", value and "1" or "0", "\n")
elseif type(value) == "number" and math.tointeger(value) ~= nil then
  io.write("WEB_LUA_RESULT\tvalue\t", tostring(math.tointeger(value)), "\n")
else
  io.write("WEB_LUA_RESULT\tunsupported\t", type(value), "\n")
end
`;

export type LuaDifferentialResultKind =
  "value" | "syntax-error" | "runtime-error";

export interface LuaDifferentialResult {
  readonly kind: LuaDifferentialResultKind;
  readonly value?: number;
}

export interface LuaDifferentialCaseResult {
  readonly name: string;
  readonly expected: LuaDifferentialExpected;
  readonly web: LuaDifferentialResult;
  readonly native?: LuaDifferentialResult;
  readonly webMatches: boolean;
  readonly nativeMatches?: boolean;
}

export type LuaOracleStatus =
  | { readonly status: "available"; readonly executable: string }
  | { readonly status: "unavailable"; readonly reason: string };

export interface LuaDifferentialReport {
  readonly oracle: LuaOracleStatus;
  readonly results: readonly LuaDifferentialCaseResult[];
}

function expectedMatches(
  result: LuaDifferentialResult,
  expected: LuaDifferentialExpected,
): boolean {
  if (result.kind !== expected.kind) return false;
  return expected.kind !== "value" || result.value === expected.value;
}

function statusResult(status: number): LuaDifferentialResult {
  if (status === WEB_LUA_STATUS.syntaxError) return { kind: "syntax-error" };
  return { kind: "runtime-error" };
}

export async function resolveNativeLuaExecutable(): Promise<
  string | undefined
> {
  const configured = process.env[NATIVE_LUA_ENV];
  const candidates = configured
    ? [configured]
    : [
        "/Users/rogan/Developer/sources/lua-5.5.1/src/lua",
        ...(process.env.PATH ?? "")
          .split(path.delimiter)
          .filter(Boolean)
          .flatMap((directory) => [
            path.join(directory, "lua5.5"),
            path.join(directory, "lua"),
          ]),
      ];

  for (const candidate of candidates) {
    const resolved = configured ? path.resolve(candidate) : candidate;
    try {
      await access(resolved, constants.X_OK);
      return resolved;
    } catch {
      if (configured)
        throw new Error(
          `${NATIVE_LUA_ENV} does not point to an executable: ${candidate}`,
        );
    }
  }
  return undefined;
}

interface NativeProcessResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
}

function runNativeProcess(
  executable: string,
  arguments_: readonly string[],
  cwd: string,
): Promise<NativeProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, arguments_, {
      cwd,
      env: { PATH: process.env.PATH ?? "", LANG: "C" },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let settled = false;
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      if (!settled) {
        settled = true;
        reject(
          new Error(
            `Native Lua oracle timed out after ${NATIVE_LUA_TIMEOUT_MS}ms.`,
          ),
        );
      }
    }, NATIVE_LUA_TIMEOUT_MS);
    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.once("error", (error) => {
      clearTimeout(timeout);
      if (!settled) {
        settled = true;
        reject(error);
      }
    });
    child.once("close", (code, signal) => {
      clearTimeout(timeout);
      if (!settled) {
        settled = true;
        resolve({
          stdout: Buffer.concat(stdout).toString("utf8"),
          stderr: Buffer.concat(stderr).toString("utf8"),
          code,
          signal,
        });
      }
    });
  });
}

function parseNativeResult(
  processResult: NativeProcessResult,
  fixture: LuaDifferentialFixture,
): LuaDifferentialResult {
  if (processResult.code !== 0 || processResult.signal !== null) {
    throw new Error(
      `Native Lua oracle failed for '${fixture.name}' (code=${processResult.code}, signal=${processResult.signal}): ${processResult.stderr.trim()}`,
    );
  }
  const records = processResult.stdout
    .split(/\r?\n/u)
    .filter((line) => line.startsWith(RESULT_PREFIX));
  if (records.length !== 1)
    throw new Error(
      `Native Lua oracle emitted ${records.length} result records for '${fixture.name}'.`,
    );
  const fields = records[0]!.split("\t");
  if (fields[1] === "syntax-error" || fields[1] === "runtime-error")
    return { kind: fields[1] };
  if (fields[1] === "value") {
    const value = Number(fields[2]);
    if (!Number.isSafeInteger(value))
      throw new Error(
        `Native Lua oracle returned a non-integer value for '${fixture.name}'.`,
      );
    return { kind: "value", value };
  }
  throw new Error(
    `Native Lua oracle returned unsupported result '${fields.slice(1).join("/")}' for '${fixture.name}'.`,
  );
}

async function runNativeFixture(
  executable: string,
  fixture: LuaDifferentialFixture,
): Promise<LuaDifferentialResult> {
  const directory = await mkdtemp(path.join(tmpdir(), "web-lua-differential-"));
  const sourceFile = path.join(directory, "fixture.lua");
  const wrapperFile = path.join(directory, "wrapper.lua");
  try {
    await Promise.all([
      writeFile(sourceFile, fixture.source, "utf8"),
      writeFile(wrapperFile, NATIVE_WRAPPER, "utf8"),
    ]);
    return parseNativeResult(
      await runNativeProcess(
        executable,
        ["-E", wrapperFile, sourceFile],
        directory,
      ),
      fixture,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function runWebFixture(
  runtime: WebLuaRuntime,
  fixture: LuaDifferentialFixture,
): Promise<LuaDifferentialResult> {
  const state = runtime.createState();
  try {
    const prototype = runtime.load(state, fixture.source);
    const loadStatus = runtime.status(state);
    if (loadStatus !== WEB_LUA_STATUS.ok) return statusResult(loadStatus);
    const value = runtime.call(state, prototype);
    const callStatus = runtime.status(state);
    if (callStatus !== WEB_LUA_STATUS.ok) return statusResult(callStatus);
    return { kind: "value", value };
  } finally {
    runtime.close(state);
  }
}

export async function runWebLuaDifferential(
  fixtures: readonly LuaDifferentialFixture[],
): Promise<LuaDifferentialReport> {
  const executable = await resolveNativeLuaExecutable();
  const oracle: LuaOracleStatus = executable
    ? { status: "available", executable }
    : {
        status: "unavailable",
        reason: `Set ${NATIVE_LUA_ENV} to a built Lua 5.5.1 executable. The source checkout is not built automatically.`,
      };
  const runtime = await createWebLuaRuntime();
  const results: LuaDifferentialCaseResult[] = [];
  for (const fixture of fixtures) {
    const web = await runWebFixture(runtime, fixture);
    const native = executable
      ? await runNativeFixture(executable, fixture)
      : undefined;
    results.push({
      name: fixture.name,
      expected: fixture.expected,
      web,
      ...(native === undefined ? {} : { native }),
      webMatches: expectedMatches(web, fixture.expected),
      ...(native === undefined
        ? {}
        : { nativeMatches: expectedMatches(native, fixture.expected) }),
    });
  }
  return { oracle, results };
}
