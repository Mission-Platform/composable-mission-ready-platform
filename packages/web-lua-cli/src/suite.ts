import { runWebLuaCli, type WebLuaCliIo } from "./main.js";

export const DEFAULT_WEB_LUA_SUITE_DIRECTORY =
  "/Users/rogan/Developer/sources/lua-5.5.1-tests";
export const WEB_LUA_5_5_1_SUITE_NAME = "lua-5.5.1";
export const WEB_LUA_SUITE_ENTRY_FILE = "all.lua";
export const WEB_LUA_SUITE_FINAL_MARKER = "final OK !!!";
export const WEB_LUA_SUITE_DEFAULT_EXCLUSIONS = [
  "gc.lua",
  "tracegc.lua",
  "db.lua",
  "calls.lua",
  "big.lua",
  "cstack.lua",
  "api.lua",
  "memerr.lua",
  "files.lua",
] as const;

export type WebLuaSuiteCaseKind =
  "portable" | "capability-gated" | "unsupported";

export interface WebLuaSuiteManifestEntry {
  readonly file: string;
  readonly kind: WebLuaSuiteCaseKind;
  readonly capabilities?: readonly string[];
  readonly reason?: string;
}

const portable = (file: string): WebLuaSuiteManifestEntry => ({
  file,
  kind: "portable",
});

/** The files loaded directly or indirectly by upstream Lua 5.5.1 `all.lua`. */
export const LUA_5_5_1_SUITE_MANIFEST = [
  portable("all.lua"),
  portable("main.lua"),
  {
    file: "gc.lua",
    kind: "unsupported",
    reason:
      "The bounded guest GC stress case currently corrupts runtime state.",
  },
  {
    file: "tracegc.lua",
    kind: "unsupported",
    reason: "The current debug/GC stress behavior is not supported.",
  },
  {
    file: "db.lua",
    kind: "unsupported",
    reason:
      "The case requires native/debug database internals that are not supported.",
  },
  {
    file: "calls.lua",
    kind: "unsupported",
    reason: "The current bounded call-stack/function stress is unsupported.",
  },
  portable("strings.lua"),
  portable("literals.lua"),
  portable("tpack.lua"),
  portable("attrib.lua"),
  portable("gengc.lua"),
  portable("locals.lua"),
  portable("constructs.lua"),
  portable("code.lua"),
  {
    file: "big.lua",
    kind: "unsupported",
    reason: "Upstream all.lua skips this long-running case when _U=true.",
  },
  {
    file: "cstack.lua",
    kind: "unsupported",
    reason: "The case requires Lua C-stack overflow and recovery semantics.",
  },
  portable("nextvar.lua"),
  portable("pm.lua"),
  portable("utf8.lua"),
  {
    file: "api.lua",
    kind: "unsupported",
    reason: "The case requires the native Lua C API test library.",
  },
  {
    file: "memerr.lua",
    kind: "unsupported",
    reason: "The case requires native allocator and testC controls.",
  },
  portable("events.lua"),
  portable("vararg.lua"),
  portable("closure.lua"),
  portable("coroutine.lua"),
  portable("goto.lua"),
  portable("errors.lua"),
  portable("math.lua"),
  portable("sort.lua"),
  portable("bitwise.lua"),
  portable("verybig.lua"),
  {
    file: "files.lua",
    kind: "capability-gated",
    capabilities: ["lua.io.read", "lua.io.write"],
    reason: "The case requires host filesystem read and write capabilities.",
  },
] as const satisfies readonly WebLuaSuiteManifestEntry[];

export const WEB_LUA_SUITE_MANIFEST = LUA_5_5_1_SUITE_MANIFEST;

export type WebLuaSuiteSourceReader = (
  source: string,
  cwd: string,
) => Promise<string>;

export type WebLuaSuiteCliRunner = (
  argv: readonly string[],
  io: WebLuaCliIo,
  cwd: string,
  sourceReader?: WebLuaSuiteSourceReader,
) => Promise<number>;

export interface WebLuaSuiteRunOptions {
  readonly suiteDirectory?: string;
  readonly exclude?: readonly string[];
  readonly cliRunner?: WebLuaSuiteCliRunner;
  readonly sourceReader?: WebLuaSuiteSourceReader;
  readonly io?: Pick<WebLuaCliIo, "stdout" | "stderr">;
}

export interface WebLuaSuiteSummary {
  readonly executedFiles: readonly string[];
  readonly unexecutedFiles: readonly string[];
  readonly errors: readonly string[];
  readonly passed: boolean;
  readonly capabilityGated: readonly string[];
  readonly unsupported: readonly string[];
  readonly excluded: readonly string[];
  readonly finalMarker: boolean;
  readonly exitCode: number;
}

export interface WebLuaSuiteResult {
  readonly summary: WebLuaSuiteSummary;
  readonly serializedJson: string;
}

const defaultCliRunner: WebLuaSuiteCliRunner = (argv, io, cwd, sourceReader) =>
  runWebLuaCli(argv, io, cwd, undefined, sourceReader);

function matchesExclusion(file: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/gu, "\\$&");
  const expression = `^${escaped.replaceAll("*", ".*").replaceAll("?", ".")}$`;
  return new RegExp(expression, "u").test(file);
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function serializeSummary(summary: WebLuaSuiteSummary): string {
  return JSON.stringify(summary);
}

function extractExecutedFiles(
  output: readonly string[],
  exclusions: readonly string[],
): readonly string[] {
  const files: string[] = [];
  const marker = /\*+ FILE '([^']+)'\*+/gu;
  for (const message of output) {
    for (const match of message.matchAll(marker)) {
      const file = match[1];
      if (
        file !== undefined &&
        !exclusions.some((pattern) => matchesExclusion(file, pattern))
      )
        files.push(file);
    }
  }
  return unique(files);
}

export async function runWebLuaSuite(
  options: WebLuaSuiteRunOptions = {},
): Promise<WebLuaSuiteResult> {
  const suiteDirectory =
    options.suiteDirectory ?? DEFAULT_WEB_LUA_SUITE_DIRECTORY;
  const exclusions = unique([
    ...WEB_LUA_SUITE_DEFAULT_EXCLUSIONS,
    ...(options.exclude ?? []),
  ]);
  const excluded = LUA_5_5_1_SUITE_MANIFEST.filter((entry) =>
    exclusions.some((pattern) => matchesExclusion(entry.file, pattern)),
  ).map((entry) => entry.file);
  const capabilityGated = LUA_5_5_1_SUITE_MANIFEST.filter(
    (entry) => entry.kind === "capability-gated",
  ).map((entry) => entry.file);
  const unsupported = LUA_5_5_1_SUITE_MANIFEST.filter(
    (entry) => entry.kind === "unsupported",
  ).map((entry) => entry.file);
  const argv = [
    "-e",
    "_U=true; _port=true; deep=1",
    "--cwd",
    suiteDirectory,
    "--suite",
    WEB_LUA_5_5_1_SUITE_NAME,
    "--capability",
    "lua.io.write",
    "--capability",
    "lua.io.read",
    "--capability",
    "lua.os.command",
    "--capability",
    "lua.package.load",
    ...exclusions.flatMap((exclusion) => ["--exclude", exclusion]),
    WEB_LUA_SUITE_ENTRY_FILE,
  ] as const;
  const output: string[] = [];
  const errors: string[] = [];
  const io: WebLuaCliIo = {
    stdout: (message) => {
      output.push(message);
      options.io?.stdout(message);
    },
    stderr: (message) => {
      errors.push(message);
      options.io?.stderr(message);
    },
  };
  const exitCode = await (options.cliRunner ?? defaultCliRunner)(
    argv,
    io,
    suiteDirectory,
    options.sourceReader,
  );
  const finalMarker = output.some((message) =>
    message.includes(WEB_LUA_SUITE_FINAL_MARKER),
  );
  const executedFiles = extractExecutedFiles(output, exclusions);
  const unexecutedFiles = LUA_5_5_1_SUITE_MANIFEST.filter(
    (entry) =>
      entry.kind === "portable" &&
      !exclusions.some((pattern) => matchesExclusion(entry.file, pattern)) &&
      !executedFiles.includes(entry.file),
  ).map((entry) => entry.file);
  const summary: WebLuaSuiteSummary = {
    executedFiles,
    unexecutedFiles,
    errors,
    passed: exitCode === 0 && finalMarker && unexecutedFiles.length === 0,
    capabilityGated,
    unsupported,
    excluded,
    finalMarker,
    exitCode,
  };
  return { summary, serializedJson: serializeSummary(summary) };
}
