import { createHash } from 'node:crypto';
import path from 'node:path';

import { throwOnCompilerErrors } from '@mission-platform/forge-plugin-api';

import { createForgeArtifactManifest, type ForgeArtifactRecord } from './artifact-manifest.js';
import {
  DEFAULT_FORGE_CACHE_LIMITS,
  createEmptyForgeCacheStats,
  type ForgeCacheLimits,
  type ForgeCacheStats,
} from './cache.js';
import { parseFrontendModule, type FrontendModule } from './frontends.js';
import {
  buildForgeFileGraph,
  collectForgeDependents,
  type ForgeFileGraph,
  type ForgeFileGraphOptions,
} from './graph.js';
import { inferSemanticModule } from './infer.js';
import { createForgeSemanticCacheKey } from './keys.js';
import { optimizeForgeModule } from './optimize.js';
import { diagnosticKey, type ForgeCompilationReport, type ForgePhaseTiming } from './report.js';
import { compileRouterModule } from './router.js';

import type { OxcParsedModule } from './oxc.js';
import type { CompilerInput } from './pipeline.js';
import type {
  CompilerDiagnostic,
  FrameworkOutputPlugin,
  GeneratedModule,
  SemanticModule,
  TargetContext,
  TargetOptimizeOptions,
} from '@mission-platform/forge-plugin-api';

/** Project-level inputs that affect source preparation and cache identity. */
export interface ForgeProjectInput {
  readonly sourceRoot?: string;
  readonly configFingerprint?: string;
  /** Optional graph entry; supplying it lets the service retain graph indexes. */
  readonly entry?: string;
  readonly tsconfig?: string;
  readonly paths?: ForgeFileGraphOptions['paths'];
  readonly baseUrl?: string;
}

/** Immutable snapshot associated with a prepared compiler project. */
export interface ForgeProjectSnapshot extends ForgeProjectInput {
  readonly fingerprint: string;
  readonly graph?: ForgeFileGraph;
}

/** Request for one explicit target compilation. */
export interface ForgeCompileRequest {
  readonly input: CompilerInput;
  readonly framework: FrameworkOutputPlugin;
  readonly project?: ForgeProjectSnapshot;
}

/** Target output plus service metadata, without changing GeneratedModule itself. */
export interface CompiledArtifact {
  readonly module: GeneratedModule;
  readonly targetId: string;
  readonly cacheKey: string;
}

export interface ForgeInvalidationResult {
  readonly changedFiles: readonly string[];
  readonly invalidatedFiles: readonly string[];
  readonly invalidatedEntries: number;
}

export interface ForgeCompilerService {
  prepare(input: ForgeProjectInput): ForgeProjectSnapshot;
  analyze(input: CompilerInput): SemanticModule;
  compile(request: ForgeCompileRequest): CompiledArtifact;
  invalidate(changedFiles: readonly string[]): ForgeInvalidationResult;
  report(): ForgeCompilationReport;
  dispose(): void;
}

interface MutableCacheStats {
  semanticHits: number;
  semanticMisses: number;
  semanticEvictions: number;
  invalidations: number;
  invalidatedEntries: number;
}

function uniqueDiagnostics(diagnostics: readonly CompilerDiagnostic[]): CompilerDiagnostic[] {
  const seen = new Set<string>();
  return diagnostics.filter((diagnostic) => {
    const key = diagnosticKey(diagnostic);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function projectFingerprint(input: ForgeProjectInput): string {
  return JSON.stringify({
    baseUrl: input.baseUrl,
    configFingerprint: input.configFingerprint,
    entry: input.entry,
    paths: input.paths,
    sourceRoot: input.sourceRoot,
    tsconfig: input.tsconfig,
  });
}

function now(): number {
  return globalThis.performance?.now() ?? Date.now();
}

/** Long-lived, synchronous compiler state for one process/build session. */
export class PersistentForgeCompilerService implements ForgeCompilerService {
  private readonly semanticCache = new Map<string, SemanticModule>();
  private readonly frontendCache = new Map<string, FrontendModule>();
  private readonly optimizedCache = new Map<string, OxcParsedModule>();
  private readonly graphCache = new Map<string, ForgeFileGraph>();
  private readonly cacheKeysByFile = new Map<string, Set<string>>();
  private readonly diagnostics: CompilerDiagnostic[] = [];
  private readonly phaseTimings: ForgePhaseTiming[] = [];
  private readonly affectedFiles = new Set<string>();
  private readonly artifacts = new Map<string, Map<string, ForgeArtifactRecord>>();
  private readonly limits: Required<ForgeCacheLimits>;
  private readonly mutableStats: MutableCacheStats = { ...createEmptyForgeCacheStats() };
  private disposed = false;
  private preparedProject?: ForgeProjectSnapshot;

  constructor(limits: ForgeCacheLimits = {}) {
    this.limits = { ...DEFAULT_FORGE_CACHE_LIMITS, ...limits };
    if (this.limits.semanticModules < 1) {
      throw new RangeError('Forge semantic cache limit must be at least 1.');
    }
  }

  prepare(input: ForgeProjectInput): ForgeProjectSnapshot {
    this.assertActive();
    const fingerprint = projectFingerprint(input);
    const graph =
      input.entry === undefined
        ? undefined
        : (this.graphCache.get(fingerprint) ??
          (() => {
            const nextGraph = buildForgeFileGraph({
              entry: input.entry,
              sourceRoot: input.sourceRoot,
              tsconfig: input.tsconfig,
              paths: input.paths,
              baseUrl: input.baseUrl,
            });
            this.graphCache.set(fingerprint, nextGraph);
            return nextGraph;
          })());
    const snapshot = { ...input, fingerprint, ...(graph === undefined ? {} : { graph }) };
    this.preparedProject = snapshot;
    return snapshot;
  }

  analyze(input: CompilerInput): SemanticModule {
    this.assertActive();
    const key = createForgeSemanticCacheKey(input);
    const cached = this.semanticCache.get(key.value);
    if (cached !== undefined) {
      this.mutableStats.semanticHits += 1;
      this.semanticCache.delete(key.value);
      this.semanticCache.set(key.value, cached);
      return cached;
    }

    this.mutableStats.semanticMisses += 1;
    this.affectedFiles.add(input.fileName);
    const frontendKey = JSON.stringify({
      componentName: input.componentName,
      fileName: input.fileName,
      moduleKind: input.moduleKind,
      source: input.source,
    });
    const frontend = this.frontendCache.get(frontendKey);
    let parsedFrontend: FrontendModule;
    if (frontend !== undefined) {
      parsedFrontend = frontend;
    } else {
      const frontendStart = now();
      parsedFrontend = parseFrontendModule(input.fileName, input.source, input.moduleKind, input.componentName);
      this.frontendCache.set(frontendKey, parsedFrontend);
      this.recordPhase('frontend', frontendStart);
    }
    const optimizedKey = `${key.value}:optimized`;
    const cachedOptimized = input.optimize === false ? undefined : this.optimizedCache.get(optimizedKey);
    let analyzedModule: OxcParsedModule;
    if (input.optimize === false) {
      analyzedModule = parsedFrontend.oxc;
    } else if (cachedOptimized !== undefined) {
      analyzedModule = cachedOptimized;
    } else {
      const optimizeStart = now();
      analyzedModule = optimizeForgeModule(parsedFrontend.oxc, input.optimize ?? {});
      this.optimizedCache.set(optimizedKey, analyzedModule);
      this.recordPhase('optimization', optimizeStart);
    }
    const inferenceStart = now();
    const semantic = inferSemanticModule(analyzedModule, input.moduleKind, input.componentName, input.optimize);
    this.recordPhase('inference', inferenceStart);
    const diagnostics = [...parsedFrontend.diagnostics, ...(semantic.diagnostics ?? [])];
    const result = diagnostics.length > 0 ? { ...semantic, diagnostics } : semantic;
    this.semanticCache.set(key.value, result);
    const fileKeys = this.cacheKeysByFile.get(key.fileName) ?? new Set<string>();
    fileKeys.add(key.value);
    this.cacheKeysByFile.set(key.fileName, fileKeys);
    const canonicalFileName = path.resolve(key.fileName);
    const canonicalKeys = this.cacheKeysByFile.get(canonicalFileName) ?? new Set<string>();
    canonicalKeys.add(key.value);
    this.cacheKeysByFile.set(canonicalFileName, canonicalKeys);
    this.evictIfNeeded();
    this.recordDiagnostics(diagnostics);
    return result;
  }

  compile(request: ForgeCompileRequest): CompiledArtifact {
    this.assertActive();
    const { framework, input } = request;
    if (typeof framework !== 'object' || framework === null) {
      throw new TypeError('An explicit Forge output plugin is required to compile a module.');
    }

    const routerStart = now();
    const router = compileRouterModule({
      source: input.source,
      fileName: input.fileName,
      moduleKind: input.moduleKind,
      uiFramework: framework.id,
      sourceRoot: input.sourceRoot,
      conditions: input.routerConditions,
      router: input.router,
      routerPlugins: input.routerPlugins,
      optimize: input.optimize,
    });
    this.recordPhase('frontend', routerStart);
    this.recordDiagnostics(router.diagnostics ?? []);
    throwOnCompilerErrors(router.diagnostics);

    const project = request.project ?? this.preparedProject;
    const semantic = this.analyze({
      ...input,
      configFingerprint: project?.fingerprint,
      source: router.code,
    });
    throwOnCompilerErrors(semantic.diagnostics);
    const context: TargetContext = {
      framework: framework.id,
      moduleKind: input.moduleKind,
      componentName: input.componentName,
      componentFolders: input.componentFolders,
      componentHosts: input.componentHosts,
    };

    const lowerStart = now();
    const lowered = framework.lower(semantic, context);
    this.recordPhase('target-lowering', lowerStart);
    this.recordDiagnostics(lowered.diagnostics ?? []);
    throwOnCompilerErrors(lowered.diagnostics);

    const optimizeStart = now();
    const optimized = framework.optimize(lowered, {
      neutral: input.optimize === false ? {} : (input.optimize ?? {}),
    } satisfies TargetOptimizeOptions);
    this.recordPhase('optimization', optimizeStart);
    this.recordDiagnostics(optimized.diagnostics ?? []);
    throwOnCompilerErrors(optimized.diagnostics);

    const generateStart = now();
    const generated = framework.generate(optimized, context);
    this.recordPhase('generation', generateStart);
    this.recordDiagnostics(generated.diagnostics ?? []);
    throwOnCompilerErrors(generated.diagnostics);

    const diagnostics = uniqueDiagnostics([
      ...(router.diagnostics ?? []),
      ...(semantic.diagnostics ?? []),
      ...(lowered.diagnostics ?? []),
      ...(optimized.diagnostics ?? []),
      ...(generated.diagnostics ?? []),
    ]);
    const module = {
      ...generated,
      map: generated.map ?? router.map,
      declarations: generated.declarations ?? router.declarations,
      ...(diagnostics.length > 0 ? { diagnostics } : {}),
    };
    this.recordArtifacts(framework.id, input.fileName, module);
    return {
      module,
      targetId: framework.id,
      cacheKey: `${request.project?.fingerprint ?? this.preparedProject?.fingerprint ?? ''}:${framework.id}:${framework.version ?? ''}:${input.fileName}`,
    };
  }

  invalidate(changedFiles: readonly string[]): ForgeInvalidationResult {
    this.assertActive();
    const files = [...new Set(changedFiles)];
    const graph = this.preparedProject?.graph;
    const affected = graph === undefined ? files : collectForgeDependents(graph, files);
    const invalidatedKeys = new Set<string>();
    for (const fileName of affected) {
      for (const alias of [fileName, path.resolve(fileName)]) {
        const keys = this.cacheKeysByFile.get(alias);
        if (keys === undefined) continue;
        for (const key of keys) invalidatedKeys.add(key);
        this.cacheKeysByFile.delete(alias);
      }
      for (const [key, cached] of this.frontendCache) {
        if (cached.fileName === fileName || path.resolve(cached.fileName) === path.resolve(fileName)) {
          this.frontendCache.delete(key);
        }
      }
      for (const key of this.optimizedCache.keys()) {
        if (key.includes(fileName)) this.optimizedCache.delete(key);
      }
    }
    for (const key of invalidatedKeys) {
      if (this.semanticCache.delete(key)) {
        // Count each semantic entry once even though it is indexed by both path forms.
      }
    }
    if (this.preparedProject !== undefined) this.graphCache.delete(this.preparedProject.fingerprint);
    const invalidatedEntries = invalidatedKeys.size;
    this.mutableStats.invalidations += files.length > 0 ? 1 : 0;
    this.mutableStats.invalidatedEntries += invalidatedEntries;
    for (const fileName of affected) this.affectedFiles.add(fileName);
    return { changedFiles: files, invalidatedFiles: affected, invalidatedEntries };
  }

  report(): ForgeCompilationReport {
    const diagnostics = uniqueDiagnostics(this.diagnostics);
    const artifacts = [...this.artifacts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([targetId, records]) => createForgeArtifactManifest(targetId, [...records.values()]));
    return {
      diagnostics,
      warnings: diagnostics.filter((diagnostic) => diagnostic.severity === 'warning'),
      errors: diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
      phaseTimings: [...this.phaseTimings],
      cache: { ...this.mutableStats } satisfies ForgeCacheStats,
      affectedFiles: [...this.affectedFiles],
      artifacts,
      emittedArtifactCount: artifacts.reduce((total, manifest) => total + manifest.artifacts.length, 0),
    };
  }

  dispose(): void {
    this.semanticCache.clear();
    this.frontendCache.clear();
    this.optimizedCache.clear();
    this.graphCache.clear();
    this.cacheKeysByFile.clear();
    this.diagnostics.length = 0;
    this.phaseTimings.length = 0;
    this.affectedFiles.clear();
    this.artifacts.clear();
    this.disposed = true;
  }

  private assertActive(): void {
    if (this.disposed) throw new Error('Forge compiler service has been disposed.');
  }

  private evictIfNeeded(): void {
    while (this.semanticCache.size > this.limits.semanticModules) {
      const oldest = this.semanticCache.keys().next().value;
      if (oldest === undefined) return;
      this.semanticCache.delete(oldest);
      this.mutableStats.semanticEvictions += 1;
      for (const [fileName, keys] of this.cacheKeysByFile) {
        keys.delete(oldest);
        if (keys.size === 0) this.cacheKeysByFile.delete(fileName);
      }
    }
  }

  private recordDiagnostics(diagnostics: readonly CompilerDiagnostic[]): void {
    this.diagnostics.push(...diagnostics);
  }

  private recordArtifacts(targetId: string, sourceFileName: string, module: GeneratedModule): void {
    const targetArtifacts = this.artifacts.get(targetId) ?? new Map<string, ForgeArtifactRecord>();
    const add = (fileName: string, kind: ForgeArtifactRecord['kind'], content: string): void => {
      targetArtifacts.set(fileName, {
        fileName,
        kind,
        hash: createHash('sha256').update(content).digest('hex'),
      });
    };
    add(sourceFileName, 'module', module.code);
    for (const extra of module.extraModules ?? []) add(extra.name, 'module', extra.code);
    for (const declaration of module.declarations ?? []) add(declaration.name, 'declaration', declaration.code);
    if (module.map !== undefined) {
      add(`${sourceFileName}.map`, 'map', typeof module.map === 'string' ? module.map : JSON.stringify(module.map));
    }
    this.artifacts.set(targetId, targetArtifacts);
  }

  private recordPhase(phase: ForgePhaseTiming['phase'], start: number): void {
    this.phaseTimings.push({ phase, durationMs: Math.max(0, now() - start) });
  }
}

export function createForgeCompilerService(limits: ForgeCacheLimits = {}): ForgeCompilerService {
  return new PersistentForgeCompilerService(limits);
}
