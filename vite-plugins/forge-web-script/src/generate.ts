import type { ForgeWebScriptCompiledModule } from "./compile.js";

/** Query that returns the compiled ABI manifest as an ES module. */
export const FORGE_WEB_SCRIPT_MANIFEST_QUERY = "forge-web-script-manifest";
/** Query that returns linked declarations and graph metadata as an ES module. */
export const FORGE_WEB_SCRIPT_DECLARATIONS_QUERY =
  "forge-web-script-declarations";
/** Query that returns the compiled Wasm bytes as the module default export. */
export const FORGE_WEB_SCRIPT_WASM_QUERY = "forge-web-script-wasm";
/** Query that returns all compiled artifact data from one graph compilation. */
export const FORGE_WEB_SCRIPT_ARTIFACT_QUERY = "forge-web-script-artifact";
/** Query that returns generated WAT, including branch-table lowering, as a string. */
export const FORGE_WEB_SCRIPT_WAT_QUERY = "forge-web-script-wat";
/** Query that returns the generated source map as the module default export. */
export const FORGE_WEB_SCRIPT_SOURCE_MAP_QUERY = "forge-web-script-source-map";

/**
 * Generate the normal consumer module. The generated module re-exports the
 * compiled functions, exposes the same ABI manifest through `abiManifest`, and
 * provides a synchronous library loader as its default export.
 */
export function createForgeWebScriptModuleSource(
  compiled: ForgeWebScriptCompiledModule,
): string {
  return `${compiled.artifact.esmSource}\nconst library = loadSync;\nexport default library;\nexport const abiManifest = manifest;\n`;
}

/** Generate a module containing the JSON-serializable ABI manifest. */
export function createForgeWebScriptManifestSource(
  compiled: ForgeWebScriptCompiledModule,
): string {
  const manifest = compiled.artifact.manifest;
  if (manifest === undefined)
    throw new Error(
      "Cannot generate a manifest for an unsuccessful compilation.",
    );
  return `const manifest = ${JSON.stringify(manifest)};\nexport { manifest };\nexport default manifest;\n`;
}

/**
 * Generate a module containing declarations, link metadata, and optional
 * self-hosted compiler metadata for fixture and tooling consumers.
 */
export function createForgeWebScriptDeclarationsSource(
  compiled: ForgeWebScriptCompiledModule,
): string {
  const graphMetadata = {
    contentHash: compiled.artifact.contentHash,
    graphHash: compiled.artifact.graphHash,
    linkMode: compiled.artifact.linkMode,
    linkedModules: compiled.artifact.linkedModules,
    linkProfile: compiled.artifact.linkProfile,
    optimizationProfile: compiled.artifact.optimizationProfile,
    dynamicLinkMetadata: compiled.artifact.dynamicLinkMetadata,
  };
  return `export const declarations = ${JSON.stringify(compiled.artifact.declarations)};\nexport const graphMetadata = ${JSON.stringify(graphMetadata)};\nexport const selfHostedMetadata = ${JSON.stringify(compiled.selfHosted ?? null)};\nexport default declarations;\n`;
}

/** Generate a module whose default export is the compiled Wasm byte array. */
export function createForgeWebScriptWasmSource(
  compiled: ForgeWebScriptCompiledModule,
): string {
  if (compiled.artifact.wasm === undefined)
    throw new Error("Cannot generate WASM for an unsuccessful compilation.");
  return `const wasm = Uint8Array.from([${[...compiled.artifact.wasm].join(",")}]);\nexport default wasm;\n`;
}

/** Generate one self-contained module for build-time artifact embedding. */
export function createForgeWebScriptArtifactSource(
  compiled: ForgeWebScriptCompiledModule,
): string {
  if (compiled.artifact.wasm === undefined)
    throw new Error(
      "Cannot generate an artifact for an unsuccessful compilation.",
    );
  const manifest = compiled.artifact.manifest;
  if (manifest === undefined)
    throw new Error("Cannot generate an artifact without an ABI manifest.");
  const graphMetadata = {
    contentHash: compiled.artifact.contentHash,
    graphHash: compiled.artifact.graphHash,
    linkMode: compiled.artifact.linkMode,
    linkedModules: compiled.artifact.linkedModules,
  };
  return `const wasm = Uint8Array.from([${[...compiled.artifact.wasm].join(",")}]);\nconst manifest = ${JSON.stringify(manifest)};\nconst declarations = ${JSON.stringify(compiled.artifact.declarations)};\nconst graphMetadata = ${JSON.stringify(graphMetadata)};\nexport { wasm, manifest, declarations, graphMetadata };\n`;
}

/**
 * Generate a module whose default export is the compiled WAT text. This is
 * intended for inspection and conformance assertions, not Wasm execution.
 */
export function createForgeWebScriptWatSource(
  compiled: ForgeWebScriptCompiledModule,
): string {
  if (compiled.artifact.wat === undefined)
    throw new Error("Cannot generate WAT for an unsuccessful compilation.");
  return `const wat = ${JSON.stringify(compiled.artifact.wat)};\nexport default wat;\n`;
}

/** Generate a module whose default export is the generated source-map object. */
export function createForgeWebScriptSourceMapSource(
  compiled: ForgeWebScriptCompiledModule,
): string {
  return `const sourceMap = ${compiled.sourceMap};\nexport { sourceMap };\nexport default sourceMap;\n`;
}
