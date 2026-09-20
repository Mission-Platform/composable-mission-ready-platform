import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createFlintCompilerService } from "@mission-platform/flint";
import { build } from "vite";
import { afterEach, describe, expect, it } from "vitest";

import { FlintViteError, createFlintGraphCache, flintPlugin } from ".";

const temporaryDirectories: string[] = [];

async function createFixture(source: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "flint-vite-"));
  temporaryDirectories.push(root);
  await writeFile(
    join(root, "index.html"),
    '<!doctype html><script type="module" src="/main.ts"></script>',
    "utf8",
  );
  await writeFile(
    join(root, "main.ts"),
    "import { manifest } from './runtime.flint';\nconsole.log(manifest.moduleName);\n",
    "utf8",
  );
  await writeFile(join(root, "runtime.flint"), source, "utf8");
  return root;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("flintPlugin", () => {
  it("resolves and bundles a .flint module with typed artifact assets", async () => {
    const fixtureSource = await readFile(
      join(import.meta.dirname, "fixtures/import-contract.flint"),
      "utf8",
    );
    const root = await createFixture(fixtureSource);

    await build({
      root,
      plugins: [flintPlugin({ root })],
      build: { outDir: join(root, "dist") },
    });

    const files = await readdir(join(root, "dist"));
    expect(files.some((file) => file.endsWith(".wasm"))).toBe(true);
    expect(files.some((file) => file.endsWith(".abi.json"))).toBe(true);
    expect(files.some((file) => file.endsWith(".d.ts"))).toBe(true);
    const manifestAsset = files.find((file) => file.endsWith(".abi.json"));
    expect(manifestAsset).toBeDefined();
    if (manifestAsset === undefined)
      throw new Error("Expected manifest asset to be defined");
    await expect(
      readFile(join(root, "dist", manifestAsset), "utf8"),
    ).resolves.toContain("runtime");
  });

  it("exposes manifest and wasm as explicit virtual queries", async () => {
    const root = await createFixture(`export fn answer() -> i32 {
  return 42;
}`);
    const plugin = flintPlugin({ root });
    const resolved = plugin.resolveId;
    if (typeof resolved !== "function")
      throw new Error("Expected a resolveId hook.");
    const moduleId = await resolved("./runtime.flint", join(root, "main.ts"));
    expect(moduleId).toBe(join(root, "runtime.flint"));
    const load = plugin.load;
    if (typeof load !== "function" || moduleId === null)
      throw new Error("Expected a load hook.");
    const moduleSource = await load(`${moduleId}?import`);
    const manifest = await load(`${moduleId}?flint-manifest`);
    const wasm = await load(`${moduleId}?flint-wasm`);
    const sourceMap = await load(`${moduleId}?flint-source-map`);
    const declarations = await load(`${moduleId}?flint-declarations`);
    const artifact = await load(`${moduleId}?flint-artifact`);
    expect(manifest).toContain("export default manifest");
    expect(moduleSource).toMatchObject({
      code: expect.stringContaining("export const abiManifest = manifest;"),
    });
    expect(moduleSource).toMatchObject({
      code: expect.stringContaining("export async function load"),
    });
    expect(moduleSource).toMatchObject({
      code: expect.stringContaining("export function loadSync"),
    });
    expect(moduleSource).toMatchObject({
      code: expect.stringContaining(
        "const library = loadSync;\nexport default library;",
      ),
    });
    expect(wasm).toContain("Uint8Array.from");
    expect(sourceMap).toContain("sourcesContent");
    expect(declarations).toContain("graphMetadata");
    expect(artifact).toContain(
      "export { wasm, manifest, declarations, graphMetadata }",
    );
    expect(declarations).toContain("selfHostedMetadata");
  });

  it.each(["interpret", "jit", "aot"] as const)(
    "uses the bounded FWS %s path while preserving source maps",
    async (selfHostedVmMode) => {
      const root = await createFixture(`export fn answer() -> i32 {
  return 42;
}`);
      const plugin = flintPlugin({ root, selfHostedVmMode });
      const resolved = plugin.resolveId;
      if (typeof resolved !== "function")
        throw new Error("Expected a resolveId hook.");
      const moduleId = await resolved("./runtime.flint", join(root, "main.ts"));
      const load = plugin.load;
      if (typeof load !== "function" || moduleId === null)
        throw new Error("Expected a load hook.");
      const sourceMap = await load(`${moduleId}?flint-source-map`);
      const wasm = await load(`${moduleId}?flint-wasm`);
      expect(sourceMap).toContain("sourcesContent");
      expect(wasm).toContain("Uint8Array.from");
    },
  );

  it("statically links same-project files into one Vite artifact", async () => {
    const root = await createFixture(`import "./helper.flint" as helper;
export fn answer() -> i32 {
  return 42;
}`);
    const canonicalRoot = await realpath(root);
    await writeFile(
      join(root, "helper.flint"),
      "export fn helper() -> i32 { return 7; }",
      "utf8",
    );

    await build({
      root,
      plugins: [flintPlugin({ root })],
      build: { outDir: join(root, "dist") },
    });

    const files = await readdir(join(root, "dist"));
    const manifestAsset = files.find((file) => file.endsWith(".abi.json"));
    const declarationAsset = files.find((file) => file.endsWith(".d.ts"));
    const sourceMapAsset = files.find((file) => file.endsWith(".map"));
    if (
      manifestAsset === undefined ||
      declarationAsset === undefined ||
      sourceMapAsset === undefined
    ) {
      throw new Error("Expected assets to be defined");
    }
    const manifest = JSON.parse(
      await readFile(join(root, "dist", manifestAsset), "utf8"),
    ) as {
      readonly linkMode: string;
      readonly linkProfile: string;
      readonly optimizationProfile: string;
      readonly linkedExports: readonly { readonly name: string }[];
    };
    expect(manifest.linkMode).toBe("static");
    expect(manifest.linkProfile).toBe("static");
    expect(manifest.optimizationProfile).toBe("static-aggressive");
    expect(manifest.linkedExports.map(({ name }) => name)).toEqual(
      expect.arrayContaining(["answer", "helper"]),
    );
    await expect(
      readFile(join(root, "dist", declarationAsset), "utf8"),
    ).resolves.toContain("FlintExports");
    const sourceMap = JSON.parse(
      await readFile(join(root, "dist", sourceMapAsset), "utf8"),
    ) as {
      readonly sources: readonly string[];
    };
    expect(sourceMap.sources).toEqual(
      expect.arrayContaining([
        join(canonicalRoot, "runtime.flint"),
        join(canonicalRoot, "helper.flint"),
      ]),
    );
  });

  it("reuses a resolved graph across plugin instances", async () => {
    const root = await createFixture(`import "./helper.flint" as helper;
export fn answer() -> i32 {
  return helper.value();
}`);
    await writeFile(
      join(root, "helper.flint"),
      "export fn value() -> i32 { return 7; }",
      "utf8",
    );
    const graphCache = createFlintGraphCache();
    let resolveCount = 0;
    const options = {
      root,
      graphCache,
      graphCacheKey: "shared-fixture",
      resolveModule: (source: string, importer: string): string | undefined => {
        resolveCount += 1;
        return join(
          importer.slice(0, importer.lastIndexOf("/")),
          source.slice(2),
        );
      },
    };
    const loadWith = (plugin: ReturnType<typeof flintPlugin>) => {
      if (typeof plugin.load !== "function")
        throw new Error("Expected a load hook.");
      return (plugin.load as (id: string) => Promise<unknown>).call(
        { resolve: () => Promise.resolve(null) },
        `${join(root, "runtime.flint")}?import`,
      );
    };

    await loadWith(flintPlugin(options));
    await loadWith(flintPlugin(options));

    expect(resolveCount).toBe(1);
  });

  it("resolves shared modules from a package-local src/fws root", async () => {
    const root = await createFixture(`import "./src/fws/shared.flint" as shared;
export fn answer() -> i32 {
  return 42;
}`);
    const fwsRoot = join(root, "src", "fws");
    await mkdir(fwsRoot, { recursive: true });
    await writeFile(
      join(fwsRoot, "shared.flint"),
      "export fn shared() -> i32 { return 7; }",
      "utf8",
    );

    await build({
      root,
      plugins: [flintPlugin({ root })],
      build: { outDir: join(root, "dist") },
    });

    const files = await readdir(join(root, "dist"));
    const manifestAsset = files.find((file) => file.endsWith(".abi.json"));
    expect(manifestAsset).toBeDefined();
    if (manifestAsset === undefined)
      throw new Error("Expected manifest asset to be defined");
    const manifest = JSON.parse(
      await readFile(join(root, "dist", manifestAsset), "utf8"),
    ) as {
      readonly sourceImports: readonly {
        readonly source: string;
        readonly resolvedModuleId?: string;
        readonly linkMode?: string;
      }[];
    };
    expect(manifest.sourceImports).toEqual([
      expect.objectContaining({
        source: "./src/fws/shared.flint",
        resolvedModuleId: "src/fws/shared",
        linkMode: "static",
      }),
    ]);
  });

  it("preserves an explicit cross-project dynamic source link in Vite metadata", async () => {
    const root = await createFixture(`import "./shared/helper.flint" as helper;
export fn answer() -> i32 {
  return 42;
}`);
    const canonicalRoot = await realpath(root);
    const sharedRoot = join(canonicalRoot, "shared");
    await mkdir(sharedRoot, { recursive: true });
    await writeFile(
      join(sharedRoot, "helper.flint"),
      "export fn helper() -> i32 { return 7; }",
      "utf8",
    );

    await build({
      root,
      plugins: [
        flintPlugin({
          root,
          projectRoots: [canonicalRoot, sharedRoot],
          crossProjectLinkMode: "dynamic",
        }),
      ],
      build: { outDir: join(root, "dist") },
    });

    const files = await readdir(join(root, "dist"));
    const manifestAsset = files.find((file) => file.endsWith(".abi.json"));
    if (manifestAsset === undefined)
      throw new Error("Expected manifest asset to be defined");
    const manifest = JSON.parse(
      await readFile(join(root, "dist", manifestAsset), "utf8"),
    ) as {
      readonly linkProfile: string;
      readonly optimizationProfile: string;
      readonly dynamicLinkMetadata?: { readonly modules: readonly unknown[] };
      readonly sourceImports: readonly { readonly linkMode?: string }[];
    };
    expect(manifest.linkProfile).toBe("dynamic");
    expect(manifest.optimizationProfile).toBe("dynamic-conservative");
    expect(manifest.sourceImports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ linkMode: "dynamic" }),
      ]),
    );
    const declarationAsset = files.find((file) => file.endsWith(".d.ts"));
    if (declarationAsset === undefined)
      throw new Error("Expected declaration asset to be defined");
    await expect(
      readFile(join(root, "dist", declarationAsset), "utf8"),
    ).resolves.toContain("FlintDynamicModuleLoaders");
  });

  it("surfaces structured compiler diagnostics through Vite", async () => {
    const root = await createFixture(`export fn value() -> i32 {
  return true;
}`);

    const failure = await build({
      root,
      plugins: [flintPlugin({ root })],
      build: { outDir: join(root, "dist") },
    }).then(
      () => null,
      (error: unknown) => error as { readonly errors?: readonly unknown[] },
    );
    expect(failure).toBeDefined();
    const diagnosticError = failure?.errors?.[0];
    expect(diagnosticError).toMatchObject({
      pluginCode: "FLINT-TYPE-005",
      name: "FlintViteError",
      diagnostic: { code: "FLINT-TYPE-005", phase: "type-check" },
    });
  });

  it("invalidates only the changed module through the compiler service", async () => {
    const root = await createFixture(`export fn answer() -> i32 {
  return 42;
}`);
    const service = createFlintCompilerService();
    const plugin = flintPlugin({ root, compilerService: service });
    const resolved = plugin.resolveId;
    const load = plugin.load;
    if (typeof resolved !== "function" || typeof load !== "function")
      throw new Error("Expected Vite hooks.");
    const moduleId = await resolved("./runtime.flint", join(root, "main.ts"));
    if (moduleId === null) throw new Error("Expected a module id.");
    await load(moduleId);
    expect(service.report().cacheMisses).toBe(1);
    await writeFile(
      join(root, "runtime.flint"),
      `export fn answer() -> i32 {
  return 7;
}`,
      "utf8",
    );
    const update = plugin.handleHotUpdate;
    if (typeof update !== "function") throw new Error("Expected a HMR hook.");
    await update({
      file: join(root, "runtime.flint"),
      modules: [],
      timestamp: Date.now(),
    });
    await load(moduleId);
    expect(service.report().cacheMisses).toBe(2);
    service.dispose();
  });

  it("uses a Vite error with the original source location", () => {
    const diagnostic = {
      code: "FLINT-TEST-001",
      severity: "error" as const,
      phase: "parse" as const,
      message: "test failure",
      fileName: "/tmp/runtime.flint",
      span: { start: 0, end: 1, line: 3, column: 5, endLine: 3, endColumn: 6 },
    };
    const error = new FlintViteError(diagnostic);
    expect(error.message).toContain("/tmp/runtime.flint:3:5");
    expect(error.loc).toEqual({ line: 3, column: 4 });
  });
});
