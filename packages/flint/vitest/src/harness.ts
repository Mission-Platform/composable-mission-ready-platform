import fs from 'node:fs';
import path from 'node:path';

import {
  createFlintCompilerService,
  pruneOrphanedFlintCacheFiles,
  type FlintArtifact,
  type FlintDiagnostic,
  type FlintModuleGraph,
  type FlintCompileInput,
  type FlintCompilerService,
  type FlintSelfHostedStageReport,
  type FlintVmExecutionMode,
  type FlintWatCache,
} from '@mission-platform/flint';
import {
  runFlintSelfHostedCompiler,
  runFlintSelfHostedLexStage,
  type FlintSelfHostedVmRun,
} from '@mission-platform/flint-runtime';
import { compileFlintFile, compileFlintGraph } from '@mission-platform/vite-plugin-flint';

import type { FlintCompiledModule, FlintPluginOptions } from '@mission-platform/vite-plugin-flint';

/** Compiler and fixture-root options shared by the conformance harness helpers. */
export interface FlintTestHarnessOptions extends FlintPluginOptions {
  /** Root used to resolve relative fixture names. Defaults to this package's fixtures directory. */
  readonly fixtureRoot?: string;
}

/** A host callback supplied for a manifest-declared capability import. */
export type FlintCapabilityFunction = (...arguments_: readonly unknown[]) => unknown;

/** Host functions keyed by capability and manifest alias; undeclared imports are rejected. */
export type FlintCapabilityImports = Readonly<Record<string, Readonly<Record<string, FlintCapabilityFunction>>>>;

/** Compilation output plus diagnostics, suitable for valid and diagnostic fixtures. */
export interface FlintCompilationResult extends FlintCompiledModule {
  readonly diagnostics: readonly FlintDiagnostic[];
}

/** Artifact inspection result returned without instantiating Wasm. */
export interface FlintInspectionResult {
  readonly fileName: string;
  readonly source: string;
  readonly artifact: FlintArtifact;
  readonly diagnostics: readonly FlintDiagnostic[];
  readonly graph?: FlintModuleGraph;
  readonly sourceMap: string;
  readonly selfHosted?: FlintSelfHostedStageReport;
}

/** Type-level view of exports validated by the harness against the Wasm instance. */
export type FlintLoadedExports<TExports extends object> = TExports;

/** Base typed error for fixture resolution, compilation, import, and loading failures. */
export class FlintTestHarnessError extends Error {
  readonly code: string;

  /**
   * Constructs a new FlintTestHarnessError.
   *
   * @param message - Diagnostic failure message.
   * @param code - Error code identifier.
   */
  constructor(message: string, code = 'FLINT-HARNESS-001') {
    super(message);
    this.name = 'FlintTestHarnessError';
    this.code = code;
  }
}

/** Raised when a disposed harness is used again. */
export class FlintTestHarnessDisposedError extends FlintTestHarnessError {
  /**
   * Constructs a new FlintTestHarnessDisposedError.
   */
  constructor() {
    super('The Flint test harness has been disposed.', 'FLINT-HARNESS-002');
    this.name = 'FlintTestHarnessDisposedError';
  }
}

/**
 * Convert a fixture path to a stable test/module name. Relative paths are
 * rooted at fixtureRoot and separators are normalized to hyphens.
 */
export function flintFixtureName(fileName: string, fixtureRoot: string): string {
  const absoluteFileName = path.isAbsolute(fileName) ? fileName : path.resolve(fixtureRoot, fileName);
  const relativeFileName = path.relative(fixtureRoot, absoluteFileName);
  const name = relativeFileName.startsWith(`..${path.sep}`) ? absoluteFileName : relativeFileName;
  const extension = path.extname(name);
  const withoutExtension = extension === '.flint' || extension === '.flt' ? name.slice(0, -extension.length) : name;
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
export class FlintTestHarness {
  readonly fixtureRoot: string;
  readonly options: FlintTestHarnessOptions;
  private readonly service: FlintCompilerService;
  private readonly ownsService: boolean;
  private disposed = false;

  /** Create a harness rooted at the package fixtures directory unless overridden. */
  constructor(options: FlintTestHarnessOptions = {}) {
    this.fixtureRoot = path.resolve(options.fixtureRoot ?? path.resolve(import.meta.dirname, '../fixtures'));
    this.options = { ...options, fixtureRoot: this.fixtureRoot };
    this.service =
      options.compilerService ??
      createFlintCompilerService({
        selfHostedRunner: runFlintSelfHostedCompilerStage,
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
    return flintFixtureName(fileName, this.fixtureRoot);
  }

  /** Compile one fixture and return diagnostics plus its ABI/WAT/Wasm artifact. */
  compile(fileName: string): Promise<FlintCompilationResult> {
    this.assertActive();
    return Promise.resolve(
      FlintTestHarness.withDiagnostics(compileFlintFile(this.resolveFixture(fileName), this.options, this.service)),
    );
  }

  /** Compile an entry fixture together with its statically linked import graph. */
  async compileGraph(fileName: string): Promise<FlintCompilationResult> {
    this.assertActive();
    const entryFileName = this.resolveFixture(fileName);
    const resolver = {
      resolve: async (source: string, importer: string): Promise<string | undefined> =>
        (await this.options.resolveModule?.(source, importer)) ?? path.resolve(path.dirname(importer), source),
      load: (moduleFileName: string): string => fs.readFileSync(moduleFileName, 'utf8'),
    };
    return FlintTestHarness.withDiagnostics(
      await compileFlintGraph(entryFileName, this.options, resolver, this.service),
    );
  }

  /** Compile inline FWS source while retaining a caller-supplied logical file name. */
  compileSource(source: string, fileName: string): FlintCompilationResult {
    this.assertActive();
    const capabilities = this.capabilitiesFor(fileName);
    const input: FlintCompileInput = {
      source,
      fileName,
      compilerVersion: this.options.compilerVersion ?? '0.1.0',
      ...(this.options.optimization === undefined ? {} : { optimization: this.options.optimization }),
      ...(capabilities === undefined ? {} : { requestedCapabilities: capabilities }),
      ...(this.options.root === undefined ? {} : { root: this.options.root }),
      watCache: watCacheFor(this.options),
    };
    const artifact = this.service.compile(input);
    return FlintTestHarness.withDiagnostics({
      fileName,
      source,
      artifact,
      sourceMap: sourceMapFor(fileName, source),
      selfHosted: this.service.report().selfHosted,
    });
  }

  /** Inspect a fixture without instantiating its Wasm module. */
  inspect(fileName: string): Promise<FlintInspectionResult> {
    return this.compile(fileName);
  }

  /**
   * Compile and asynchronously instantiate a fixture. The generic describes
   * the scalar exports promised by the fixture's ABI manifest.
   */
  async load<TExports extends object>(
    fileName: string,
    imports: FlintCapabilityImports = {},
  ): Promise<FlintLoadedExports<TExports>> {
    const compiled = await this.compile(fileName);
    const wasm = this.prepareLoad(compiled, imports, 'async');
    try {
      const instantiated = await WebAssembly.instantiate(
        wasm as unknown as BufferSource,
        FlintTestHarness.wasmImports(compiled, imports, 'async'),
      );
      return FlintTestHarness.validateExports<TExports>(compiled, instantiated.instance.exports);
    } catch (error) {
      throw FlintTestHarness.loadError(compiled, 'async', error);
    }
  }

  /** Synchronously compile and instantiate a fixture with the same checks as load. */
  loadSync<TExports extends object>(
    fileName: string,
    imports: FlintCapabilityImports = {},
  ): FlintLoadedExports<TExports> {
    this.assertActive();
    const compiled = FlintTestHarness.withDiagnostics(
      compileFlintFile(this.resolveFixture(fileName), this.options, this.service),
    );
    const wasm = this.prepareLoad(compiled, imports, 'sync');
    try {
      const instance = new WebAssembly.Instance(
        new WebAssembly.Module(wasm as unknown as BufferSource),
        FlintTestHarness.wasmImports(compiled, imports, 'sync'),
      );
      return FlintTestHarness.validateExports<TExports>(compiled, instance.exports);
    } catch (error) {
      throw FlintTestHarness.loadError(compiled, 'sync', error);
    }
  }

  /** Run the self-hosted compiler/VM for parity checks without loading Wasm. */
  // skipcq: JS-R1005
  checkVmParity(fileName: string, mode: FlintVmExecutionMode): Promise<FlintSelfHostedVmRun> {
    this.assertActive();
    const resolvedFileName = this.resolveFixture(fileName);
    const source = fs.readFileSync(resolvedFileName, 'utf8');
    try {
      return Promise.resolve(
        runFlintSelfHostedCompiler(
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
        ),
      );
    } catch (error) {
      return Promise.reject(
        new FlintTestHarnessError(
          `${resolvedFileName} [mode=${mode}] self-hosted VM parity failed: ${error instanceof Error ? error.message : String(error)}`,
          'FLINT-HARNESS-005',
        ),
      );
    }
  }

  /** Dispose owned compiler resources; repeated disposal is safe. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.ownsService) this.service.dispose();
  }

  /** Throw FlintTestHarnessDisposedError when the harness is inactive. */
  assertActive(): void {
    if (this.disposed) throw new FlintTestHarnessDisposedError();
  }

  /**
   * Resolves requested capabilities for a given fixture file.
   *
   * @param fileName - Fixture file name.
   * @returns Requested capabilities array or undefined.
   */
  private capabilitiesFor(fileName: string): readonly string[] | undefined {
    return typeof this.options.requestedCapabilities === 'function'
      ? this.options.requestedCapabilities(fileName)
      : this.options.requestedCapabilities;
  }

  /**
   * Attaches compilation diagnostics to a compiled module result.
   *
   * @param compiled - Compiled module structure.
   * @returns Compilation result with diagnostics array.
   */
  // skipcq: JS-0105
  private static withDiagnostics(compiled: FlintCompiledModule): FlintCompilationResult {
    return { ...compiled, diagnostics: compiled.artifact.diagnostics };
  }

  /**
   * Validates compilation success and returns WebAssembly binary bytes for loading.
   *
   * @param compiled - Compilation result.
   * @param imports - Host capability imports.
   * @param mode - Loading mode.
   * @returns WebAssembly binary byte array.
   */
  private prepareLoad(
    compiled: FlintCompilationResult,
    imports: FlintCapabilityImports,
    mode: 'async' | 'sync',
  ): Uint8Array {
    const error = compiled.artifact.diagnostics.find(({ severity }) => severity === 'error');
    if (error !== undefined)
      throw new FlintTestHarnessError(
        `${compiled.fileName} [mode=${mode}] cannot load: ${error.code}/${error.phase} at ${error.span.line}:${error.span.column}; ${error.message} (artifact=${compiled.artifact.contentHash})`,
        'FLINT-HARNESS-003',
      );
    if (compiled.artifact.wasm === undefined || compiled.artifact.manifest === undefined)
      throw new FlintTestHarnessError(
        `${compiled.fileName} [mode=${mode}] cannot load: compilation produced no Wasm or ABI manifest (artifact=${compiled.artifact.contentHash})`,
        'FLINT-HARNESS-004',
      );
    FlintTestHarness.wasmImports(compiled, imports, mode);
    return compiled.artifact.wasm;
  }

  /**
   * Builds the WebAssembly imports object matching declared manifest capabilities.
   *
   * @param compiled - Compilation result.
   * @param imports - Host capability imports.
   * @param mode - Loading mode.
   * @returns WebAssembly imports object.
   */
  // skipcq: JS-0105, JS-R1005
  private static wasmImports(
    compiled: FlintCompilationResult,
    imports: FlintCapabilityImports,
    mode: 'async' | 'sync',
  ): WebAssembly.Imports {
    const manifest = compiled.artifact.manifest;
    if (manifest === undefined) return {};
    const declaredCapabilities = new Set(manifest.requiredCapabilities);
    for (const capability of Object.keys(imports)) {
      if (!declaredCapabilities.has(capability))
        throw new FlintTestHarnessError(
          `${compiled.fileName} [mode=${mode}] undeclared capability import '${capability}' (artifact=${compiled.artifact.contentHash})`,
          'FLINT-HARNESS-006',
        );
    }
    const result: Record<string, Record<string, FlintCapabilityFunction>> = {};
    for (const declaration of manifest.imports) {
      const capability = imports[declaration.capability];
      const hostFunction = capability?.[declaration.alias];
      if (hostFunction === undefined)
        throw new FlintTestHarnessError(
          `${compiled.fileName} [mode=${mode}] missing capability import '${declaration.capability}.${declaration.alias}' (artifact=${compiled.artifact.contentHash})`,
          'FLINT-HARNESS-007',
        );
      result[declaration.capability] ??= {};
      const target = result[declaration.capability];
      if (target !== undefined) {
        target[declaration.alias] = hostFunction;
      }
    }
    return result;
  }

  /**
   * Validates that all declared ABI exports exist and are callable on the Wasm instance.
   *
   * @param compiled - Compilation result.
   * @param exports - WebAssembly instance exports.
   * @returns Validated typed exports.
   */
  // skipcq: JS-0105, JS-R1005
  private static validateExports<TExports extends object>(
    compiled: FlintCompilationResult,
    exports: WebAssembly.Exports,
  ): FlintLoadedExports<TExports> {
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
          throw new FlintTestHarnessError(
            `${compiled.fileName} [mode=wasm] export '${typeof declaration === 'string' ? declaration : declaration.name}' is missing or is not callable (artifact=${compiled.artifact.contentHash})`,
            'FLINT-HARNESS-008',
          );
      }
    }
    return exports as FlintLoadedExports<TExports>;
  }

  /**
   * Wraps an unknown loading error into a FlintTestHarnessError.
   *
   * @param compiled - Compilation result.
   * @param mode - Loading mode.
   * @param error - Caught error.
   * @returns Formatted harness error.
   */
  // skipcq: JS-0105
  private static loadError(
    compiled: FlintCompilationResult,
    mode: 'async' | 'sync',
    error: unknown,
  ): FlintTestHarnessError {
    return new FlintTestHarnessError(
      `${compiled.fileName} [mode=${mode}] Wasm load failed: ${error instanceof Error ? error.message : String(error)} (artifact=${compiled.artifact.contentHash}, graph=${compiled.artifact.graphHash ?? 'none'})`,
      'FLINT-HARNESS-009',
    );
  }
}

/**
 * Emits a JSON-serialized v3 source map for a source file.
 *
 * @param fileName - Source file path.
 * @param source - Source code text.
 * @returns Serialized v3 source map string.
 */
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

/**
 * Resolves or creates a file-backed WAT cache based on harness options.
 *
 * @param options - Harness configuration options.
 * @returns Configured WAT cache or undefined if disabled.
 */
function watCacheFor(options: FlintTestHarnessOptions): FlintWatCache | undefined {
  if (options.persistWat === false) return undefined;
  const root = options.watCacheRoot ?? path.resolve(options.root ?? process.cwd(), 'node_modules/.cache/flint');
  const cache: FlintWatCache = {
    root,
    /**
     * Atomically writes string contents to a cache file.
     *
     * @param fileName - Cache file path.
     * @param contents - File contents string.
     */
    writeAtomic(fileName: string, contents: string): void {
      fs.mkdirSync(path.dirname(fileName), { recursive: true });
      fs.writeFileSync(fileName, contents, 'utf8');
    },
    /**
     * Atomically writes binary bytes to a cache file.
     *
     * @param fileName - Cache file path.
     * @param contents - Binary byte buffer.
     */
    writeBinaryAtomic(fileName: string, contents: Uint8Array): void {
      fs.mkdirSync(path.dirname(fileName), { recursive: true });
      fs.writeFileSync(fileName, contents);
    },
    /**
     * Reads string contents from a cache file if it exists.
     *
     * @param fileName - Cache file path.
     * @returns File contents string or undefined.
     */
    read(fileName: string): string | undefined {
      try {
        return fs.readFileSync(fileName, 'utf8');
      } catch {
        return undefined;
      }
    },
    /**
     * Removes a cache file from disk.
     *
     * @param fileName - Cache file path.
     */
    remove(fileName: string): void {
      try {
        fs.unlinkSync(fileName);
      } catch {
        // Silently ignore unlink errors during test harness cache removal.
      }
    },
    /**
     * Lists all cached file paths in the cache root directory.
     *
     * @returns Array of absolute file paths.
     */
    listFiles(): readonly string[] {
      try {
        return fs.readdirSync(root).map((entry) => path.resolve(root, entry));
      } catch {
        return [];
      }
    },
  };
  pruneOrphanedFlintCacheFiles(cache);
  return cache;
}

/**
 * Executes a self-hosted compiler stage for testing.
 *
 * @param input - Compilation input specification.
 * @param mode - VM execution mode.
 * @returns Self-hosted stage execution report.
 */
function runFlintSelfHostedCompilerStage(
  input: Pick<FlintCompileInput, 'source' | 'fileName' | 'compilerVersion' | 'requestedCapabilities'>,
  mode: FlintVmExecutionMode,
): FlintSelfHostedStageReport {
  return runFlintSelfHostedLexStage(input, mode);
}

/** Create a shared-fixture harness with optional compiler, capability, and target settings. */
export function createFlintTestHarness(options: FlintTestHarnessOptions = {}): FlintTestHarness {
  return new FlintTestHarness(options);
}
