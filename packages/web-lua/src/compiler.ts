import {
  createForgeWebScriptCompilerService,
  resolveForgeWebScriptModuleGraph,
  type ForgeWebScriptArtifact,
  type ForgeWebScriptModuleResolver,
} from "@mission-platform/forge-web-script";
import {
  WEB_LUA_ABI_MANIFEST,
  WEB_LUA_GUEST_EXPORTS,
  WEB_LUA_REQUIRED_EXPORTS,
  type WebLuaAbiManifest,
} from "./abi.js";

const foundationUrl = new URL("../fws/foundation.fws", import.meta.url);

interface CompilerNodeModules {
  readonly existsSync: typeof import("node:fs").existsSync;
  readonly readFileSync: typeof import("node:fs").readFileSync;
  readonly resolve: typeof import("node:path").resolve;
  readonly fileURLToPath: typeof import("node:url").fileURLToPath;
}

async function nodeModules(): Promise<CompilerNodeModules> {
  const [{ existsSync, readFileSync }, { resolve }, { fileURLToPath }] =
    await Promise.all([
      import("node:fs"),
      import("node:path"),
      import("node:url"),
    ]);
  return { existsSync, readFileSync, resolve, fileURLToPath };
}

function resolver(
  modules: Pick<CompilerNodeModules, "readFileSync" | "resolve">,
  foundationRoot: string,
): ForgeWebScriptModuleResolver {
  return {
    resolve(source, importer) {
      const base = importer.slice(0, importer.lastIndexOf("/"));
      const resolved = modules.resolve(base, source);
      return resolved.startsWith(foundationRoot) ? resolved : undefined;
    },
    load(fileName) {
      return modules.readFileSync(fileName, "utf8");
    },
  };
}

export interface WebLuaArtifact {
  readonly artifact: ForgeWebScriptArtifact;
  readonly contentHash: string;
  readonly graphHash: string;
  readonly abi: WebLuaAbiManifest;
}

export async function compileWebLua(): Promise<WebLuaArtifact> {
  const modules = await nodeModules();
  const foundationCandidates = [
    foundationUrl.protocol === "file:"
      ? modules.fileURLToPath(foundationUrl)
      : decodeURIComponent(foundationUrl.pathname),
    modules.resolve(process.cwd(), "fws/foundation.fws"),
    modules.resolve(process.cwd(), "packages/web-lua/fws/foundation.fws"),
  ];
  const foundationFile =
    foundationCandidates.find((candidate) => modules.existsSync(candidate)) ??
    foundationCandidates[0];
  const foundationRoot = foundationFile.slice(
    0,
    foundationFile.lastIndexOf("/"),
  );
  const resolved = await resolveForgeWebScriptModuleGraph(
    [foundationFile],
    resolver(modules, foundationRoot),
    { projectRoots: [foundationRoot] },
  );
  if (resolved.diagnostics.length > 0)
    throw new Error(
      resolved.diagnostics.map(({ message }) => message).join("\n"),
    );
  const service = createForgeWebScriptCompilerService();
  try {
    const artifact = service.compileGraph({
      graph: resolved.graph,
      entryFileName: foundationFile,
      compilerVersion: "0.1.0",
      linkConfiguration: {
        projectRoots: [foundationRoot],
        crossProjectLinkMode: "static",
      },
    });
    if (artifact.diagnostics.length > 0 || artifact.wasm === undefined)
      throw new Error(
        artifact.diagnostics.map(({ message }) => message).join("\n") ||
          "WebLua compilation produced no Wasm.",
      );
    const exports = new Set(artifact.manifest?.exports.map(({ name }) => name));
    const missing = [
      ...WEB_LUA_REQUIRED_EXPORTS,
      ...WEB_LUA_GUEST_EXPORTS,
    ].filter(
      (name, index, names) =>
        names.indexOf(name) === index && !exports.has(name),
    );
    if (missing.length > 0)
      throw new Error(`WebLua ABI is missing exports: ${missing.join(", ")}`);
    return {
      artifact,
      contentHash: artifact.contentHash,
      graphHash: artifact.manifest?.graphHash ?? "",
      abi: WEB_LUA_ABI_MANIFEST,
    };
  } finally {
    service.dispose();
  }
}
