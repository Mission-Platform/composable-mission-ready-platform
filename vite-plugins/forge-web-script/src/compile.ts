import {
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

import {
  createForgeWebScriptCompilerService,
  resolveForgeWebScriptModuleGraph,
  type ForgeWebScriptLinkConfiguration,
  type ForgeWebScriptModuleGraph,
  type ForgeWebScriptModuleResolver,
  type ForgeWebScriptArtifact,
  type ForgeWebScriptCompilerService,
  type ForgeWebScriptCompileInput,
  type ForgeWebScriptSelfHostedStageReport,
  type ForgeWebScriptVmExecutionMode,
  type ForgeWebScriptWatCache,
} from "@mission-platform/forge-web-script";
import { runForgeWebScriptSelfHostedLexStage } from "@mission-platform/forge-web-script-runtime";

export interface ForgeWebScriptPluginOptions {
  /** Root used when resolving relative FWS entry points and graph imports. */
  readonly root?: string;
  /** Require every function declaration to opt into the Wasm ABI. */
  readonly requireExports?: boolean;
  /** Additional roots used to decide whether graph links may cross projects. */
  readonly projectRoots?: readonly string[];
  /** Default static-link mode for modules without an explicit link mode. */
  readonly defaultLinkMode?: ForgeWebScriptLinkConfiguration["defaultLinkMode"];
  /** Link mode applied when a graph crosses a project boundary. */
  readonly crossProjectLinkMode?: ForgeWebScriptLinkConfiguration["crossProjectLinkMode"];
  /** Per-module link-mode overrides keyed by module name or path. */
  readonly linkModes?: ForgeWebScriptLinkConfiguration["linkModes"];
  /** Resolve an imported FWS module before falling back to Vite/path resolution. */
  readonly resolveModule?: ForgeWebScriptModuleResolver["resolve"];
  /** Compiler version recorded in artifact and manifest metadata. */
  readonly compilerVersion?: string;
  /** Optimization profile passed to the Forge Web Script compiler. */
  readonly optimization?: ForgeWebScriptCompileInput["optimization"];
  /** Capabilities requested by the source, or a function selecting them per file. */
  readonly requestedCapabilities?:
    readonly string[] | ((fileName: string) => readonly string[] | undefined);
  /** Reuse a compiler service when compiling multiple files or test fixtures. */
  readonly compilerService?: ForgeWebScriptCompilerService;
  /** Directory used for persisted WAT cache entries. */
  readonly watCacheRoot?: string;
  /** Disable WAT persistence when false; enabled by default for stable inspection. */
  readonly persistWat?: boolean;
  /** Execution mode used by the optional self-hosted compiler stage. */
  readonly selfHostedVmMode?: ForgeWebScriptVmExecutionMode;
}

/** Compiled source, artifact metadata, source map, and optional graph reports. */
export interface ForgeWebScriptCompiledModule {
  readonly fileName: string;
  readonly source: string;
  readonly artifact: ForgeWebScriptArtifact;
  readonly sourceMap: string;
  readonly graph?: ForgeWebScriptModuleGraph;
  readonly selfHosted?: ForgeWebScriptSelfHostedStageReport;
}

/** Resolve a plugin path relative to root unless value is already absolute. */
export function resolveForgeWebScriptPath(root: string, value: string): string {
  return isAbsolute(value) ? value : resolve(root, value);
}

function sourceMapFor(
  fileName: string,
  source: string,
  graph?: ForgeWebScriptModuleGraph,
): string {
  const sources = graph?.modules.map(
    ({ fileName: moduleFileName }) => moduleFileName,
  ) ?? [fileName];
  const sourcesContent = graph?.modules.map(
    ({ source: moduleSource }) => moduleSource,
  ) ?? [source];
  return JSON.stringify({
    version: 3,
    file: fileName,
    sources,
    sourcesContent,
    names: [],
    mappings: "",
  });
}

let watTemporaryFile = 0;

function watCacheFor(
  options: ForgeWebScriptPluginOptions,
): ForgeWebScriptWatCache | undefined {
  if (options.persistWat === false) return undefined;
  const root =
    options.watCacheRoot ??
    resolve(
      options.root ?? process.cwd(),
      "node_modules/.cache/forge-web-script",
    );
  return {
    root,
    writeAtomic(fileName, contents): void {
      mkdirSync(dirname(fileName), { recursive: true });
      const temporary = `${fileName}.${process.pid}.${watTemporaryFile++}.tmp`;
      writeFileSync(temporary, contents, "utf8");
      try {
        renameSync(temporary, fileName);
      } catch (error) {
        try {
          unlinkSync(temporary);
        } catch {
          // Preserve the original atomic-write failure when cleanup is unavailable.
        }
        throw error;
      }
    },
  };
}

/** Compile one FWS file and return its artifact plus source-map metadata. */
export function compileForgeWebScriptFile(
  fileName: string,
  options: ForgeWebScriptPluginOptions,
  service: ForgeWebScriptCompilerService = options.compilerService ??
    createForgeWebScriptCompilerService({
      selfHostedRunner: runForgeWebScriptSelfHostedLexStage,
      selfHostedVmMode: options.selfHostedVmMode,
    }),
): ForgeWebScriptCompiledModule {
  const source = readFileSync(fileName, "utf8");
  const capabilities =
    typeof options.requestedCapabilities === "function"
      ? options.requestedCapabilities(fileName)
      : options.requestedCapabilities;
  const artifact = service.compile({
    source,
    fileName,
    compilerVersion: options.compilerVersion ?? "0.1.0",
    requireExports: options.requireExports ?? false,
    ...(options.optimization === undefined
      ? {}
      : { optimization: options.optimization }),
    ...(capabilities === undefined
      ? {}
      : { requestedCapabilities: capabilities }),
    ...(options.root === undefined ? {} : { root: options.root }),
    watCache: watCacheFor(options),
  });
  return {
    fileName,
    source,
    artifact,
    sourceMap: sourceMapFor(fileName, source),
    selfHosted: service.report().selfHosted,
  };
}

/** Resolve, link, and compile an imported FWS module graph. */
export async function compileForgeWebScriptGraph(
  fileName: string,
  options: ForgeWebScriptPluginOptions,
  resolver: ForgeWebScriptModuleResolver,
  service: ForgeWebScriptCompilerService = options.compilerService ??
    createForgeWebScriptCompilerService({
      selfHostedRunner: runForgeWebScriptSelfHostedLexStage,
      selfHostedVmMode: options.selfHostedVmMode,
    }),
): Promise<ForgeWebScriptCompiledModule> {
  const result = await resolveForgeWebScriptModuleGraph([fileName], resolver, {
    projectRoots:
      options.projectRoots ??
      (options.root === undefined ? undefined : [options.root]),
    defaultLinkMode: options.defaultLinkMode,
    crossProjectLinkMode: options.crossProjectLinkMode,
    linkModes: options.linkModes,
  });
  const source = readFileSync(fileName, "utf8");
  const capabilities =
    typeof options.requestedCapabilities === "function"
      ? options.requestedCapabilities(fileName)
      : options.requestedCapabilities;
  const artifact = service.compileGraph({
    graph: result.graph,
    entryFileName: fileName,
    compilerVersion: options.compilerVersion ?? "0.1.0",
    requireExports: options.requireExports ?? false,
    ...(options.optimization === undefined
      ? {}
      : { optimization: options.optimization }),
    ...(capabilities === undefined
      ? {}
      : { requestedCapabilities: capabilities }),
    linkConfiguration: {
      projectRoots:
        options.projectRoots ??
        (options.root === undefined ? undefined : [options.root]),
      defaultLinkMode: options.defaultLinkMode,
      crossProjectLinkMode: options.crossProjectLinkMode,
      linkModes: options.linkModes,
    },
    watCache: watCacheFor(options),
  });
  return {
    fileName,
    source,
    artifact: {
      ...artifact,
      diagnostics: [...result.diagnostics, ...artifact.diagnostics],
    },
    graph: result.graph,
    sourceMap: sourceMapFor(fileName, source, result.graph),
    selfHosted: service.report().selfHosted,
  };
}
