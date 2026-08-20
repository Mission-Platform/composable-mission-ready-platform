import fs from 'node:fs';
import path from 'node:path';

import {
  createForgeWebScriptCompilerService,
  type ForgeWebScriptArtifact,
  type ForgeWebScriptDiagnostic,
  type ForgeWebScriptModuleGraph,
  type ForgeWebScriptCompileInput,
  type ForgeWebScriptCompilerService,
  type ForgeWebScriptSelfHostedStageReport,
  type ForgeWebScriptVmExecutionMode,
  type ForgeWebScriptWatCache,
} from '@mission-platform/forge-web-script';
import {
  runForgeWebScriptSelfHostedCompiler,
  runForgeWebScriptSelfHostedLexStage,
  type ForgeWebScriptSelfHostedVmRun,
} from '@mission-platform/forge-web-script-runtime';
import { compileForgeWebScriptFile, compileForgeWebScriptGraph } from '@mission-platform/vite-plugin-forge-web-script';

import type {
  ForgeWebScriptCompiledModule,
  ForgeWebScriptPluginOptions,
} from '@mission-platform/vite-plugin-forge-web-script';

/** Compiler and fixture-root options shared by the conformance harness helpers. */
export interface ForgeWebScriptTestHarnessOptions extends ForgeWebScriptPluginOptions {
  /** Root used to resolve relative fixture names. Defaults to this package's fixtures directory. */
  readonly fixtureRoot?: string;
}

/** A host callback supplied for a manifest-declared capability import. */
export type ForgeWebScriptCapabilityFunction = (...arguments_: readonly unknown[]) => unknown;

/** Host functions keyed by capability and manifest alias; undeclared imports are rejected. */
export type ForgeWebScriptCapabilityImports = Readonly<
  Record<string, Readonly<Record<string, ForgeWebScriptCapabilityFunction>>>
>;

/** Compilation output plus diagnostics, suitable for valid and diagnostic fixtures. */
export interface ForgeWebScriptCompilationResult extends ForgeWebScriptCompiledModule {
  readonly diagnostics: readonly ForgeWebScriptDiagnostic[];
}

/** Artifact inspection result returned without instantiating Wasm. */
export interface ForgeWebScriptInspectionResult {
  readonly fileName: string;
  readonly source: string;
  readonly artifact: ForgeWebScriptArtifact;
  readonly diagnostics: readonly ForgeWebScriptDiagnostic[];
  readonly graph?: ForgeWebScriptModuleGraph;
  readonly sourceMap: string;
  readonly selfHosted?: ForgeWebScriptSelfHostedStageReport;
}

/** Type-level view of exports validated by the harness against the Wasm instance. */
export type ForgeWebScriptLoadedExports<TExports extends object> = TExports;

/** Base typed error for fixture resolution, compilation, import, and loading failures. */
export class ForgeWebScriptTestHarnessError extends Error {
  readonly code: string;

  constructor(message: string, code = 'FWS-HARNESS-001') {
    super(message);
    this.name = 'ForgeWebScriptTestHarnessError';
    this.code = code;
  }
}

/** Raised when a disposed harness is used again. */
export class ForgeWebScriptTestHarnessDisposedError extends ForgeWebScriptTestHarnessError {
  constructor() {
    super('The Forge Web Script test harness has been disposed.', 'FWS-HARNESS-002');
    this.name = 'ForgeWebScriptTestHarnessDisposedError';
  }
}

/**
 * Convert a fixture path to a stable test/module name. Relative paths are
 * rooted at fixtureRoot and separators are normalized to hyphens.
 */
export function forgeWebScriptFixtureName(fileName: string, fixtureRoot: string): string {
  const absoluteFileName = path.isAbsolute(fileName) ? fileName : path.resolve(fixtureRoot, fileName);
  const relativeFileName = path.relative(fixtureRoot, absoluteFileName);
  const name = relativeFileName.startsWith(`..${path.sep}`) ? absoluteFileName : relativeFileName;
  const withoutExtension = name.endsWith('.fws') ? name.slice(0, -4) : name;
  return withoutExtension
    .replaceAll(path.sep, '-')
    .replaceAll(/[^A-Za-z0-9_-]+/gu, '-')
    .replaceAll(/^-+|-+$/gu, '');
}

/**
 * Compile and load shared FWS fixtures through the same Wasm boundary used by
 * consumers. The harness also exposes WAT, manifest, graph, and self-hosted
 * inspection data for conformance tests.
 */
export class ForgeWebScriptTestHarness {
  readonly fixtureRoot: string;
  readonly options: ForgeWebScriptTestHarnessOptions;
  private readonly service: ForgeWebScriptCompilerService;
  private readonly ownsService: boolean;
  private disposed = false;

  /** Create a harness rooted at the package fixtures directory unless overridden. */
  constructor(options: ForgeWebScriptTestHarnessOptions = {}) {
    this.fixtureRoot = path.resolve(options.fixtureRoot ?? path.resolve(import.meta.dirname, '../fixtures'));
    this.options = { ...options, fixtureRoot: this.fixtureRoot };
    this.service =
      options.compilerService ??
      createForgeWebScriptCompilerService({
        selfHostedRunner: runForgeWebScriptSelfHostedCompilerStage,
        selfHostedVmMode: options.selfHostedVmMode,
      });
    this.ownsService = options.compilerService === undefined;
  }

  /** True after dispose; all subsequent fixture operations throw a typed error. */
  get isDisposed(): boolean {
    return this.disposed;
  }

  /** Resolve a relative fixture path without compiling it. */
  resolveFixture(fileName: string): string {
    this.assertActive();
    return path.isAbsolute(fileName) ? fileName : path.resolve(this.fixtureRoot, fileName);
  }

  /** Return the stable fixture name used by generated test modules. */
  fixtureName(fileName: string): string {
    this.assertActive();
    return forgeWebScriptFixtureName(fileName, this.fixtureRoot);
  }

  /** Compile one fixture and return diagnostics plus its ABI/WAT/Wasm artifact. */
  async compile(fileName: string): Promise<ForgeWebScriptCompilationResult> {
    this.assertActive();
    return this.withDiagnostics(compileForgeWebScriptFile(this.resolveFixture(fileName), this.options, this.service));
  }

  /** Compile an entry fixture together with its statically linked import graph. */
  async compileGraph(fileName: string): Promise<ForgeWebScriptCompilationResult> {
    this.assertActive();
    const entryFileName = this.resolveFixture(fileName);
    const resolver = {
      resolve: async (source: string, importer: string): Promise<string | undefined> =>
        (await this.options.resolveModule?.(source, importer)) ?? path.resolve(path.dirname(importer), source),
      load: (moduleFileName: string): string => fs.readFileSync(moduleFileName, 'utf8'),
    };
    return this.withDiagnostics(await compileForgeWebScriptGraph(entryFileName, this.options, resolver, this.service));
  }

  /** Compile inline FWS source while retaining a caller-supplied logical file name. */
  compileSource(source: string, fileName: string): ForgeWebScriptCompilationResult {
    this.assertActive();
    const capabilities = this.capabilitiesFor(fileName);
    const input: ForgeWebScriptCompileInput = {
      source,
      fileName,
      compilerVersion: this.options.compilerVersion ?? '0.1.0',
      ...(this.options.optimization === undefined ? {} : { optimization: this.options.optimization }),
      ...(capabilities === undefined ? {} : { requestedCapabilities: capabilities }),
      ...(this.options.root === undefined ? {} : { root: this.options.root }),
      watCache: watCacheFor(this.options),
    };
    const artifact = this.service.compile(input);
    return this.withDiagnostics({
      fileName,
      source,
      artifact,
      sourceMap: sourceMapFor(fileName, source),
      selfHosted: this.service.report().selfHosted,
    });
  }

  /** Inspect a fixture without instantiating its Wasm module. */
  async inspect(fileName: string): Promise<ForgeWebScriptInspectionResult> {
    return this.compile(fileName);
  }

  /**
   * Compile and asynchronously instantiate a fixture. The generic describes
   * the scalar exports promised by the fixture's ABI manifest.
   */
  async load<TExports extends object>(
    fileName: string,
    imports: ForgeWebScriptCapabilityImports = {},
  ): Promise<ForgeWebScriptLoadedExports<TExports>> {
    const compiled = await this.compile(fileName);
    const wasm = this.prepareLoad(compiled, imports, 'async');
    try {
      const instantiated = await WebAssembly.instantiate(
        wasm as unknown as BufferSource,
        this.wasmImports(compiled, imports, 'async'),
      );
      return this.validateExports<TExports>(compiled, instantiated.instance.exports);
    } catch (error) {
      throw this.loadError(compiled, 'async', error);
    }
  }

  /** Synchronously compile and instantiate a fixture with the same checks as load. */
  loadSync<TExports extends object>(
    fileName: string,
    imports: ForgeWebScriptCapabilityImports = {},
  ): ForgeWebScriptLoadedExports<TExports> {
    this.assertActive();
    const compiled = this.withDiagnostics(
      compileForgeWebScriptFile(this.resolveFixture(fileName), this.options, this.service),
    );
    const wasm = this.prepareLoad(compiled, imports, 'sync');
    try {
      const instance = new WebAssembly.Instance(
        new WebAssembly.Module(wasm as unknown as BufferSource),
        this.wasmImports(compiled, imports, 'sync'),
      );
      return this.validateExports<TExports>(compiled, instance.exports);
    } catch (error) {
      throw this.loadError(compiled, 'sync', error);
    }
  }

  /** Run the self-hosted compiler/VM for parity checks without loading Wasm. */
  async checkVmParity(fileName: string, mode: ForgeWebScriptVmExecutionMode): Promise<ForgeWebScriptSelfHostedVmRun> {
    this.assertActive();
    const resolvedFileName = this.resolveFixture(fileName);
    const source = fs.readFileSync(resolvedFileName, 'utf8');
    try {
      return runForgeWebScriptSelfHostedCompiler(
        {
          source,
          fileName: resolvedFileName,
          compilerVersion: this.options.compilerVersion ?? '0.1.0',
          ...(this.options.optimization === undefined ? {} : { optimization: this.options.optimization }),
          ...(this.capabilitiesFor(resolvedFileName) === undefined
            ? {}
            : { requestedCapabilities: this.capabilitiesFor(resolvedFileName) }),
          ...(this.options.root === undefined ? {} : { root: this.options.root }),
        },
        mode,
      );
    } catch (error) {
      throw new ForgeWebScriptTestHarnessError(
        `${resolvedFileName} [mode=${mode}] self-hosted VM parity failed: ${error instanceof Error ? error.message : String(error)}`,
        'FWS-HARNESS-005',
      );
    }
  }

  /** Dispose owned compiler resources; repeated disposal is safe. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.ownsService) this.service.dispose();
  }

  /** Throw ForgeWebScriptTestHarnessDisposedError when the harness is inactive. */
  assertActive(): void {
    if (this.disposed) throw new ForgeWebScriptTestHarnessDisposedError();
  }

  private capabilitiesFor(fileName: string): readonly string[] | undefined {
    return typeof this.options.requestedCapabilities === 'function'
      ? this.options.requestedCapabilities(fileName)
      : this.options.requestedCapabilities;
  }

  private withDiagnostics(compiled: ForgeWebScriptCompiledModule): ForgeWebScriptCompilationResult {
    return { ...compiled, diagnostics: compiled.artifact.diagnostics };
  }

  private prepareLoad(
    compiled: ForgeWebScriptCompilationResult,
    imports: ForgeWebScriptCapabilityImports,
    mode: 'async' | 'sync',
  ): Uint8Array {
    const error = compiled.artifact.diagnostics.find(({ severity }) => severity === 'error');
    if (error !== undefined)
      throw new ForgeWebScriptTestHarnessError(
        `${compiled.fileName} [mode=${mode}] cannot load: ${error.code}/${error.phase} at ${error.span.line}:${error.span.column}; ${error.message} (artifact=${compiled.artifact.contentHash})`,
        'FWS-HARNESS-003',
      );
    if (compiled.artifact.wasm === undefined || compiled.artifact.manifest === undefined)
      throw new ForgeWebScriptTestHarnessError(
        `${compiled.fileName} [mode=${mode}] cannot load: compilation produced no Wasm or ABI manifest (artifact=${compiled.artifact.contentHash})`,
        'FWS-HARNESS-004',
      );
    this.wasmImports(compiled, imports, mode);
    return compiled.artifact.wasm;
  }

  private wasmImports(
    compiled: ForgeWebScriptCompilationResult,
    imports: ForgeWebScriptCapabilityImports,
    mode: 'async' | 'sync',
  ): WebAssembly.Imports {
    const manifest = compiled.artifact.manifest;
    if (manifest === undefined) return {};
    const declaredCapabilities = new Set(manifest.requiredCapabilities);
    for (const capability of Object.keys(imports)) {
      if (!declaredCapabilities.has(capability))
        throw new ForgeWebScriptTestHarnessError(
          `${compiled.fileName} [mode=${mode}] undeclared capability import '${capability}' (artifact=${compiled.artifact.contentHash})`,
          'FWS-HARNESS-006',
        );
    }
    const result: Record<string, Record<string, ForgeWebScriptCapabilityFunction>> = {};
    for (const declaration of manifest.imports) {
      const capability = imports[declaration.capability];
      const hostFunction = capability?.[declaration.alias];
      if (hostFunction === undefined)
        throw new ForgeWebScriptTestHarnessError(
          `${compiled.fileName} [mode=${mode}] missing capability import '${declaration.capability}.${declaration.alias}' (artifact=${compiled.artifact.contentHash})`,
          'FWS-HARNESS-007',
        );
      result[declaration.capability] ??= {};
      result[declaration.capability]![declaration.alias] = hostFunction;
    }
    return result;
  }

  private validateExports<TExports extends object>(
    compiled: ForgeWebScriptCompilationResult,
    exports: WebAssembly.Exports,
  ): ForgeWebScriptLoadedExports<TExports> {
    const manifest = compiled.artifact.manifest;
    if (manifest !== undefined) {
      for (const declaration of [
        ...manifest.exports,
        manifest.memory.allocatorExport,
        manifest.memory.deallocatorExport,
        manifest.memory.reallocatorExport,
        'fws_reset',
      ]) {
        if (typeof exports[typeof declaration === 'string' ? declaration : declaration.name] !== 'function')
          throw new ForgeWebScriptTestHarnessError(
            `${compiled.fileName} [mode=wasm] export '${typeof declaration === 'string' ? declaration : declaration.name}' is missing or is not callable (artifact=${compiled.artifact.contentHash})`,
            'FWS-HARNESS-008',
          );
      }
    }
    return exports as ForgeWebScriptLoadedExports<TExports>;
  }

  private loadError(
    compiled: ForgeWebScriptCompilationResult,
    mode: 'async' | 'sync',
    error: unknown,
  ): ForgeWebScriptTestHarnessError {
    return new ForgeWebScriptTestHarnessError(
      `${compiled.fileName} [mode=${mode}] Wasm load failed: ${error instanceof Error ? error.message : String(error)} (artifact=${compiled.artifact.contentHash}, graph=${compiled.artifact.graphHash ?? 'none'})`,
      'FWS-HARNESS-009',
    );
  }
}

function sourceMapFor(fileName: string, source: string): string {
  return JSON.stringify({
    version: 3,
    file: fileName,
    sources: [fileName],
    sourcesContent: [source],
    names: [],
    mappings: '',
  });
}

function watCacheFor(options: ForgeWebScriptTestHarnessOptions): ForgeWebScriptWatCache | undefined {
  if (options.persistWat === false) return undefined;
  const root =
    options.watCacheRoot ?? path.resolve(options.root ?? process.cwd(), 'node_modules/.cache/forge-web-script');
  return {
    root,
    writeAtomic(fileName: string, contents: string): void {
      fs.mkdirSync(path.dirname(fileName), { recursive: true });
      fs.writeFileSync(fileName, contents, 'utf8');
    },
  };
}

function runForgeWebScriptSelfHostedCompilerStage(
  input: Pick<ForgeWebScriptCompileInput, 'source' | 'fileName' | 'compilerVersion' | 'requestedCapabilities'>,
  mode: ForgeWebScriptVmExecutionMode,
): ForgeWebScriptSelfHostedStageReport {
  return runForgeWebScriptSelfHostedLexStage(input, mode);
}

/** Create a shared-fixture harness with optional compiler, capability, and target settings. */
export function createForgeWebScriptTestHarness(
  options: ForgeWebScriptTestHarnessOptions = {},
): ForgeWebScriptTestHarness {
  return new ForgeWebScriptTestHarness(options);
}
