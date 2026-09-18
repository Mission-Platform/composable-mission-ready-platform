import {
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

import {
  createFlintCompilerService,
  pruneOrphanedFlintCacheFiles,
  resolveFlintModuleGraph,
  type FlintGraphResult,
  type FlintLinkConfiguration,
  type FlintLinkProfile,
  type FlintModuleGraph,
  type FlintModuleResolver,
  type FlintArtifact,
  type FlintCompilerService,
  type FlintCompileInput,
  type FlintCompilerHints,
  type FlintSelfHostedStageReport,
  type FlintTargetFeatures,
  type FlintVmExecutionMode,
  type FlintWatCache,
} from "@mission-platform/flint";
import { runFlintSelfHostedLexStage } from "@mission-platform/flint-runtime";

export interface FlintPluginOptions {
  /** Root used when resolving relative FWS entry points and graph imports. */
  readonly root?: string;
  /** Require every function declaration to opt into the Wasm ABI. */
  readonly requireExports?: boolean;
  /** Additional roots used to decide whether graph links may cross projects. */
  readonly projectRoots?: readonly string[];
  /** Default static-link mode for modules without an explicit link mode. */
  readonly defaultLinkMode?: FlintLinkConfiguration["defaultLinkMode"];
  /** Link mode applied when a graph crosses a project boundary. */
  readonly crossProjectLinkMode?: FlintLinkConfiguration["crossProjectLinkMode"];
  /** Per-module link-mode overrides keyed by module name or path. */
  readonly linkModes?: FlintLinkConfiguration["linkModes"];
  /** Select static flattening or explicit dynamic source-module linking. */
  readonly linkProfile?: FlintLinkProfile;
  /** Resolve an imported Flint module before falling back to Vite/path resolution. */
  readonly resolveModule?: FlintModuleResolver["resolve"];
  /** Compiler version recorded in artifact and manifest metadata. */
  readonly compilerVersion?: string;
  /** Optimization profile passed to the Flint compiler. */
  readonly optimization?: FlintCompileInput["optimization"];
  /** WebAssembly target features required by the compiled artifact. */
  readonly targetFeatures?: FlintTargetFeatures;
  /** Backend lowering hints applied to the compiled artifact. */
  readonly compilerHints?: FlintCompilerHints;
  /** Capabilities requested by the source, or a function selecting them per file. */
  readonly requestedCapabilities?:
    readonly string[] | ((fileName: string) => readonly string[] | undefined);
  /** Reuse a compiler service when compiling multiple files or test fixtures. */
  readonly compilerService?: FlintCompilerService;
  /** Reuse resolved module graphs across plugin instances that share a build. */
  readonly graphCache?: FlintGraphCache;
  /** Stable namespace for a graph resolver shared by multiple plugin instances. */
  readonly graphCacheKey?: string;
  /** Directory used for persisted WAT cache entries. */
  readonly watCacheRoot?: string;
  /** Disable WAT persistence when false; enabled by default for stable inspection. */
  readonly persistWat?: boolean;
  /** Execution mode used by the optional self-hosted compiler stage. */
  readonly selfHostedVmMode?: FlintVmExecutionMode;
}

/** Shared, in-memory graph results used by multiple Flint targets. */
export interface FlintGraphCache {
  get(key: string): Promise<FlintGraphResult> | undefined;
  set(key: string, result: Promise<FlintGraphResult>): void;
  invalidate(files: readonly string[]): void;
  clear(): void;
  /** Optional shared compiler service associated with this graph cache. */
  compilerService?: FlintCompilerService;
}

/** Create a graph cache that deduplicates both sequential and concurrent graph resolution. */
export function createFlintGraphCache(options?: {
  readonly compilerService?: FlintCompilerService;
  readonly selfHostedVmMode?: FlintVmExecutionMode;
}): FlintGraphCache {
  const entries = new Map<string, Promise<FlintGraphResult>>();
  const compilerService =
    options?.compilerService ??
    createFlintCompilerService({
      selfHostedRunner: runFlintSelfHostedLexStage,
      selfHostedVmMode: options?.selfHostedVmMode ?? "aot",
    });

  return {
    compilerService,
    get(key): Promise<FlintGraphResult> | undefined {
      return entries.get(key);
    },
    set(key, result): void {
      entries.set(key, result);
      void result.catch(() => {
        if (entries.get(key) === result) entries.delete(key);
      });
    },
    invalidate(files): void {
      // A pending graph has no module list yet; clear synchronously to avoid
      // serving stale results during the next rebuild.
      entries.clear();
      compilerService.invalidate(files);
    },
    clear(): void {
      entries.clear();
    },
  };
}

/** Compiled source, artifact metadata, source map, and optional graph reports. */
export interface FlintCompiledModule {
  readonly fileName: string;
  readonly source: string;
  readonly artifact: FlintArtifact;
  readonly sourceMap: string;
  readonly graph?: FlintModuleGraph;
  readonly selfHosted?: FlintSelfHostedStageReport;
}

/** Resolve a plugin path relative to root unless value is already absolute. */
export function resolveFlintPath(root: string, value: string): string {
  return isAbsolute(value) ? value : resolve(root, value);
}

function sourceMapFor(
  fileName: string,
  source: string,
  graph?: FlintModuleGraph,
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

function watCacheFor(options: FlintPluginOptions): FlintWatCache | undefined {
  if (options.persistWat === false) return undefined;
  const root =
    options.watCacheRoot ??
    resolve(options.root ?? process.cwd(), "node_modules/.cache/flint");
  const cache: FlintWatCache = {
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
    writeBinaryAtomic(fileName, contents): void {
      mkdirSync(dirname(fileName), { recursive: true });
      const temporary = `${fileName}.${process.pid}.${watTemporaryFile++}.tmp`;
      writeFileSync(temporary, contents);
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
    read(fileName): string | undefined {
      try {
        return readFileSync(fileName, "utf8");
      } catch {
        return undefined;
      }
    },
    remove(fileName): void {
      try {
        unlinkSync(fileName);
      } catch {
        // Silently ignore removal errors for missing or locked cache files.
      }
    },
    listFiles(): readonly string[] {
      try {
        return readdirSync(root).map((entry) => resolve(root, entry));
      } catch {
        return [];
      }
    },
  };
  pruneOrphanedFlintCacheFiles(cache);
  return cache;
}

const graphResolverIds = new WeakMap<
  NonNullable<FlintPluginOptions["resolveModule"]>,
  number
>();
let nextGraphResolverId = 1;

function graphResolverKey(options: FlintPluginOptions): string | undefined {
  if (options.graphCacheKey !== undefined) return options.graphCacheKey;
  if (options.resolveModule === undefined) return undefined;
  const resolver = options.resolveModule;
  let id = graphResolverIds.get(resolver);
  if (id === undefined) {
    id = nextGraphResolverId++;
    graphResolverIds.set(resolver, id);
  }
  return `resolver-${id}`;
}

function graphCacheKey(
  fileName: string,
  options: FlintPluginOptions,
): string | undefined {
  const resolverKey = graphResolverKey(options);
  if (resolverKey === undefined) return undefined;
  return JSON.stringify({
    resolverKey,
    fileName,
    root: options.root,
    projectRoots: options.projectRoots,
    defaultLinkMode: options.defaultLinkMode,
    crossProjectLinkMode: options.crossProjectLinkMode,
    linkModes: options.linkModes,
    linkProfile: options.linkProfile,
  });
}

/** Compile one FWS file and return its artifact plus source-map metadata. */
export function compileFlintFile(
  fileName: string,
  options: FlintPluginOptions,
  service: FlintCompilerService = options.compilerService ??
    options.graphCache?.compilerService ??
    createFlintCompilerService({
      selfHostedRunner: runFlintSelfHostedLexStage,
      selfHostedVmMode: options.selfHostedVmMode ?? "aot",
    }),
): FlintCompiledModule {
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
    ...(options.linkProfile === undefined
      ? {}
      : { linkProfile: options.linkProfile }),
    ...(options.targetFeatures === undefined
      ? {}
      : { targetFeatures: options.targetFeatures }),
    ...(options.compilerHints === undefined
      ? {}
      : { compilerHints: options.compilerHints }),
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
export async function compileFlintGraph(
  fileName: string,
  options: FlintPluginOptions,
  resolver: FlintModuleResolver,
  service: FlintCompilerService = options.compilerService ??
    options.graphCache?.compilerService ??
    createFlintCompilerService({
      selfHostedRunner: runFlintSelfHostedLexStage,
      selfHostedVmMode: options.selfHostedVmMode ?? "aot",
    }),
): Promise<FlintCompiledModule> {
  const resolveGraph = (): Promise<FlintGraphResult> =>
    resolveFlintModuleGraph([fileName], resolver, {
      projectRoots:
        options.projectRoots ??
        (options.root === undefined ? undefined : [options.root]),
      defaultLinkMode: options.defaultLinkMode,
      crossProjectLinkMode: options.crossProjectLinkMode,
      linkModes: options.linkModes,
      linkProfile: options.linkProfile,
    });
  const key = graphCacheKey(fileName, options);
  const cached = key === undefined ? undefined : options.graphCache?.get(key);
  let result: FlintGraphResult;
  if (cached === undefined) {
    const pending = resolveGraph();
    if (key !== undefined) options.graphCache?.set(key, pending);
    result = await pending;
  } else {
    result = await cached;
  }
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
    ...(options.linkProfile === undefined
      ? {}
      : { linkProfile: options.linkProfile }),
    ...(options.targetFeatures === undefined
      ? {}
      : { targetFeatures: options.targetFeatures }),
    ...(options.compilerHints === undefined
      ? {}
      : { compilerHints: options.compilerHints }),
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
      linkProfile: options.linkProfile,
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
