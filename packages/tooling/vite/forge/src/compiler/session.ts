import { createForgeArtifactManifest, type ForgeArtifactManifest } from './artifact-manifest.js';
import { createForgeCompilerService } from './service.js';

import type { ForgePathAliases } from './graph.js';
import type {
  ForgeCompilerService,
  ForgeInvalidationResult,
  ForgeProjectInput,
  ForgeProjectSnapshot,
} from './service.js';

/** Build policies supported by the shared Forge lifecycle. */
export type ForgeBuildKind = 'component' | 'hook' | 'neutral' | 'router' | 'cms-island';

/** The result returned by a target's lazy source-generation stage. */
export interface ForgeTargetGenerationResult {
  readonly entry: string;
  /** A generator may provide a manifest when it owns additional artifacts. */
  readonly manifest?: ForgeArtifactManifest;
}

/** Context passed to a target generation callback after project preparation. */
export interface ForgeTargetGenerationContext {
  readonly service: ForgeCompilerService;
  readonly project: ForgeProjectSnapshot;
  readonly target: ForgeTargetPlan;
}

/** One caller-owned target in a Forge build session. */
export interface ForgeTargetPlan {
  readonly targetId: string;
  readonly kind: ForgeBuildKind;
  readonly entryModule: string;
  readonly sourceRoot?: string;
  readonly tsconfig?: string;
  readonly paths?: ForgePathAliases;
  readonly baseUrl?: string;
  readonly generate: (
    context: ForgeTargetGenerationContext,
  ) => ForgeTargetGenerationResult | string | Promise<ForgeTargetGenerationResult | string>;
}

/** The neutral project and selected targets coordinated by one lifecycle. */
export interface ForgeBuildPlan {
  readonly rootDir: string;
  readonly targets: readonly ForgeTargetPlan[];
}

export interface ForgeTargetResult {
  readonly targetId: string;
  readonly entry: string;
  readonly manifest: ForgeArtifactManifest;
  readonly cache: {
    readonly hit: boolean;
    readonly affectedFiles: readonly string[];
  };
}

export interface ForgeBuildSession {
  prepare(plan: ForgeBuildPlan): Promise<ForgeProjectSnapshot>;
  ensureTarget(target: ForgeTargetPlan): Promise<ForgeTargetResult>;
  invalidate(files: readonly string[]): ForgeInvalidationResult;
  report(): ReturnType<ForgeCompilerService['report']>;
  dispose(): Promise<void>;
}

export interface CreateForgeBuildSessionOptions {
  /** A caller-owned service can be shared by several sessions/configs. */
  readonly service?: ForgeCompilerService;
}

function projectInput(target: ForgeTargetPlan): ForgeProjectInput {
  return {
    entry: target.entryModule,
    sourceRoot: target.sourceRoot,
    tsconfig: target.tsconfig,
    paths: target.paths,
    baseUrl: target.baseUrl,
  };
}

function targetKey(target: ForgeTargetPlan): string {
  return `${target.kind}:${target.targetId}`;
}

/**
 * Create the explicit lifecycle owner used by Vite and tsdown adapters.
 * Construction only records service ownership; graph discovery starts in
 * `prepare`, which adapters call from a bundler lifecycle hook.
 */
export function createForgeBuildSession(options: CreateForgeBuildSessionOptions = {}): ForgeBuildSession {
  const service = options.service ?? createForgeCompilerService();
  const ownsService = options.service === undefined;
  const projects = new Map<string, ForgeProjectSnapshot>();
  const results = new Map<string, ForgeTargetResult>();
  const inFlight = new Map<string, Promise<ForgeTargetResult>>();
  let invalidationVersion = 0;
  let disposed = false;
  let disposePromise: Promise<void> | undefined;

  const assertActive = (): void => {
    if (disposed) throw new Error('Forge build session has been disposed.');
  };

  const prepare = async (plan: ForgeBuildPlan): Promise<ForgeProjectSnapshot> => {
    assertActive();
    let first: ForgeProjectSnapshot | undefined;
    for (const target of plan.targets) {
      const input = projectInput(target);
      const snapshot = service.prepare(input);
      projects.set(targetKey(target), snapshot);
      first ??= snapshot;
    }
    // A plan with no targets is useful for a neutral-only adapter and still
    // prepares the caller's project at the lifecycle boundary.
    return first ?? service.prepare({ sourceRoot: plan.rootDir });
  };

  const ensureTarget = async (target: ForgeTargetPlan): Promise<ForgeTargetResult> => {
    assertActive();
    const key = targetKey(target);
    const cached = results.get(key);
    if (cached !== undefined) {
      return { ...cached, cache: { ...cached.cache, hit: true } };
    }
    const active = inFlight.get(key);
    if (active !== undefined) return active;

    const generation = (async (): Promise<ForgeTargetResult> => {
      const generationVersion = invalidationVersion;
      let project = projects.get(key);
      if (project === undefined) {
        project = service.prepare(projectInput(target));
        projects.set(key, project);
      }
      const generated = await target.generate({ service, project, target });
      const entry = typeof generated === 'string' ? generated : generated.entry;
      const manifest =
        typeof generated === 'string'
          ? (service.report().artifacts.find((candidate) => candidate.targetId === target.targetId) ??
            createForgeArtifactManifest(target.targetId, []))
          : (generated.manifest ??
            service.report().artifacts.find((candidate) => candidate.targetId === target.targetId) ??
            createForgeArtifactManifest(target.targetId, []));
      const result: ForgeTargetResult = {
        targetId: target.targetId,
        entry,
        manifest,
        cache: { hit: false, affectedFiles: service.report().affectedFiles },
      };
      // A watch edit may arrive while generation is running. Do not publish
      // an artifact produced from the pre-invalidation snapshot.
      if (generationVersion === invalidationVersion) results.set(key, result);
      return result;
    })();
    inFlight.set(key, generation);
    try {
      return await generation;
    } finally {
      inFlight.delete(key);
    }
  };

  const invalidate = (files: readonly string[]): ForgeInvalidationResult => {
    assertActive();
    invalidationVersion += 1;
    const invalidation = service.invalidate(files);
    for (const targetId of invalidation.invalidatedFiles.length > 0 ? results.keys() : []) {
      results.delete(targetId);
    }
    return invalidation;
  };

  const dispose = (): Promise<void> => {
    if (disposePromise !== undefined) return disposePromise;
    disposed = true;
    disposePromise = Promise.allSettled(inFlight.values()).then(() => {
      inFlight.clear();
      results.clear();
      projects.clear();
      if (ownsService) service.dispose();
    });
    return disposePromise;
  };

  return { prepare, ensureTarget, invalidate, report: () => service.report(), dispose };
}
