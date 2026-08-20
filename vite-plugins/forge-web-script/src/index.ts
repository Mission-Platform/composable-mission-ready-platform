import { existsSync, readFileSync, realpathSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";

import {
  createForgeWebScriptCompilerService,
  type ForgeWebScriptDiagnostic,
} from "@mission-platform/forge-web-script";
import { runForgeWebScriptSelfHostedLexStage } from "@mission-platform/forge-web-script-runtime";

import {
  compileForgeWebScriptFile,
  compileForgeWebScriptGraph,
  type ForgeWebScriptCompiledModule,
  type ForgeWebScriptPluginOptions,
} from "./compile.js";
import {
  createForgeWebScriptDeclarationsSource,
  createForgeWebScriptManifestSource,
  createForgeWebScriptModuleSource,
  createForgeWebScriptSourceMapSource,
  createForgeWebScriptWatSource,
  createForgeWebScriptWasmSource,
  FORGE_WEB_SCRIPT_DECLARATIONS_QUERY,
  FORGE_WEB_SCRIPT_MANIFEST_QUERY,
  FORGE_WEB_SCRIPT_SOURCE_MAP_QUERY,
  FORGE_WEB_SCRIPT_WAT_QUERY,
  FORGE_WEB_SCRIPT_WASM_QUERY,
} from "./generate.js";

import type { HmrContext, Plugin, ResolvedConfig } from "vite";

export * from "./compile.js";
export * from "./generate.js";

const QUERY_NAMES = new Set([
  FORGE_WEB_SCRIPT_MANIFEST_QUERY,
  FORGE_WEB_SCRIPT_DECLARATIONS_QUERY,
  FORGE_WEB_SCRIPT_WASM_QUERY,
  FORGE_WEB_SCRIPT_WAT_QUERY,
  FORGE_WEB_SCRIPT_SOURCE_MAP_QUERY,
]);

function splitForgeWebScriptId(
  id: string,
): { fileName: string; query?: string } | undefined {
  const [fileName, query] = id.split("?", 2);
  if (!fileName.endsWith(".fws")) return undefined;
  if (query === "import") return { fileName };
  if (query !== undefined && !QUERY_NAMES.has(query)) return undefined;
  return query === undefined ? { fileName } : { fileName, query };
}

function formatDiagnostic(diagnostic: ForgeWebScriptDiagnostic): string {
  const location = `${diagnostic.fileName}:${diagnostic.span.line}:${diagnostic.span.column}`;
  const hint = diagnostic.hint === undefined ? "" : ` Hint: ${diagnostic.hint}`;
  return `${location} [${diagnostic.code}] ${diagnostic.severity} ${diagnostic.phase}: ${diagnostic.message}.${hint}`;
}

/** Vite-facing diagnostic that preserves the compiler code, source location, and phase. */
export class ForgeWebScriptViteError extends Error {
  readonly code: string;
  readonly diagnostic: ForgeWebScriptDiagnostic;
  readonly id: string;
  readonly loc: { readonly line: number; readonly column: number };

  constructor(diagnostic: ForgeWebScriptDiagnostic) {
    super(formatDiagnostic(diagnostic));
    this.name = "ForgeWebScriptViteError";
    this.code = diagnostic.code;
    this.diagnostic = diagnostic;
    this.id = diagnostic.fileName;
    this.loc = {
      line: diagnostic.span.line,
      column: Math.max(0, diagnostic.span.column - 1),
    };
  }
}

function getFirstError(
  diagnostics: readonly ForgeWebScriptDiagnostic[],
): ForgeWebScriptDiagnostic | undefined {
  return diagnostics.find((diagnostic) => diagnostic.severity === "error");
}

function assetStem(fileName: string): string {
  return basename(fileName, extname(fileName));
}

function canonicalFileName(fileName: string): string {
  return existsSync(fileName) ? realpathSync(fileName) : fileName;
}

/**
 * Install Forge Web Script compilation and virtual artifact queries in Vite.
 * The plugin preserves the scalar Wasm export ABI while exposing manifest,
 * declarations, Wasm, WAT, and source-map queries for tooling and fixtures.
 */
export function forgeWebScriptPlugin(
  options: ForgeWebScriptPluginOptions = {},
): Plugin {
  const service =
    options.compilerService ??
    createForgeWebScriptCompilerService({
      selfHostedRunner: runForgeWebScriptSelfHostedLexStage,
      selfHostedVmMode: options.selfHostedVmMode,
    });
  const ownsService = options.compilerService === undefined;
  const compiled = new Map<string, ForgeWebScriptCompiledModule>();
  let config: ResolvedConfig | undefined;

  const compile = async (
    fileName: string,
    pluginContext?: {
      resolve: (
        source: string,
        importer?: string,
        options?: { skipSelf?: boolean },
      ) => Promise<{ id: string } | null>;
    },
  ): Promise<ForgeWebScriptCompiledModule> => {
    const canonicalEntry = canonicalFileName(fileName);
    const existing = compiled.get(fileName) ?? compiled.get(canonicalEntry);
    if (existing !== undefined) return existing;
    const graphResolver = {
      resolve: async (
        source: string,
        importer: string,
      ): Promise<string | undefined> => {
        if (options.resolveModule !== undefined)
          return options.resolveModule(source, importer);
        const viaVite =
          pluginContext === undefined
            ? null
            : await pluginContext.resolve(source, importer, { skipSelf: true });
        if (viaVite !== null) return canonicalFileName(viaVite.id);
        return canonicalFileName(resolve(dirname(importer), source));
      },
      load: (id: string): string => readFileSync(canonicalFileName(id), "utf8"),
    };
    const result =
      pluginContext === undefined
        ? compileForgeWebScriptFile(fileName, options, service)
        : await compileForgeWebScriptGraph(
            canonicalEntry,
            {
              ...options,
              ...(options.root === undefined
                ? {}
                : { root: canonicalFileName(options.root) }),
              ...(options.projectRoots === undefined
                ? {}
                : {
                    projectRoots: options.projectRoots.map(canonicalFileName),
                  }),
            },
            graphResolver,
            service,
          );
    const error = getFirstError(result.artifact.diagnostics);
    if (error !== undefined) throw new ForgeWebScriptViteError(error);
    compiled.set(fileName, result);
    compiled.set(result.fileName, result);
    return result;
  };

  return {
    name: "@mission-platform/vite-plugin-forge-web-script",
    enforce: "pre",
    configResolved(resolved): void {
      config = resolved;
    },
    resolveId(source, importer): string | null {
      const split = splitForgeWebScriptId(source);
      if (split === undefined) return null;
      const root = options.root ?? config?.root ?? process.cwd();
      const fileName =
        importer === undefined
          ? resolve(root, split.fileName)
          : resolve(dirname(importer), split.fileName);
      return split.query === undefined
        ? fileName
        : `${fileName}?${split.query}`;
    },
    async load(id): Promise<{ code: string; map: string } | string | null> {
      const split = splitForgeWebScriptId(id);
      if (split === undefined) return null;
      const result = await compile(split.fileName, this);
      if (split.query === FORGE_WEB_SCRIPT_MANIFEST_QUERY)
        return createForgeWebScriptManifestSource(result);
      if (split.query === FORGE_WEB_SCRIPT_DECLARATIONS_QUERY)
        return createForgeWebScriptDeclarationsSource(result);
      if (split.query === FORGE_WEB_SCRIPT_WASM_QUERY)
        return createForgeWebScriptWasmSource(result);
      if (split.query === FORGE_WEB_SCRIPT_WAT_QUERY)
        return createForgeWebScriptWatSource(result);
      if (split.query === FORGE_WEB_SCRIPT_SOURCE_MAP_QUERY)
        return createForgeWebScriptSourceMapSource(result);
      return {
        code: createForgeWebScriptModuleSource(result),
        map: result.sourceMap,
      };
    },
    handleHotUpdate(context: HmrContext): void | HmrContext["modules"] {
      const split = splitForgeWebScriptId(context.file);
      if (split === undefined) return undefined;
      const canonicalChanged = canonicalFileName(split.fileName);
      const invalidated = new Set([split.fileName, canonicalChanged]);
      for (const [fileName, result] of compiled) {
        if (
          result.graph?.edges.some(
            (edge) => edge.resolved === split.fileName || edge.resolved === canonicalChanged,
          )
        ) {
          invalidated.add(fileName);
          compiled.delete(fileName);
        }
      }
      service.invalidate([...invalidated]);
      compiled.delete(split.fileName);
      return context.modules;
    },
    generateBundle(): void {
      for (const result of compiled.values()) {
        if (
          result.artifact.wasm === undefined ||
          result.artifact.manifest === undefined
        )
          continue;
        const stem = assetStem(result.fileName);
        const hash = result.artifact.contentHash.slice(0, 12);
        this.emitFile({
          type: "asset",
          fileName: `${stem}.${hash}.wasm`,
          source: result.artifact.wasm,
        });
        this.emitFile({
          type: "asset",
          fileName: `${stem}.${hash}.abi.json`,
          source: JSON.stringify(result.artifact.manifest, null, 2),
        });
        this.emitFile({
          type: "asset",
          fileName: `${stem}.${hash}.d.ts`,
          source: result.artifact.declarations,
        });
        this.emitFile({
          type: "asset",
          fileName: `${stem}.${hash}.map`,
          source: result.sourceMap,
        });
      }
    },
    closeBundle(): void {
      if (ownsService) service.dispose();
      compiled.clear();
    },
  };
}

export default forgeWebScriptPlugin;
