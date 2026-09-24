import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import { terminateProcessTree } from './runtime-validation/cleanup.ts';

export const FORGE_BUILD_TARGETS = ['forge', 'react', 'vue', 'svelte', 'solid', 'web-components'] as const;

export type ForgeBuildTarget = (typeof FORGE_BUILD_TARGETS)[number];
export type ForgeBuildSelection = ForgeBuildTarget | 'all';

export interface ForgeBuildOptions {
  readonly target: ForgeBuildSelection;
  readonly packageRoot: string;
  readonly stageRoot: string;
  /** Test seam and extension point for package-specific build executors. */
  readonly runCommand?: (context: ForgeBuildCommandContext) => Promise<void>;
  readonly command?: readonly string[];
  readonly env?: NodeJS.ProcessEnv;
  /** Abort an in-flight native build and remove only its stage. */
  readonly signal?: AbortSignal;
  /** Maximum duration of the native build, in milliseconds. */
  readonly timeoutMs?: number;
}

export interface ForgeBuildCommandContext {
  readonly packageRoot: string;
  readonly stageRoot: string;
  readonly command: readonly string[];
  readonly env: NodeJS.ProcessEnv;
  readonly signal: AbortSignal;
}

export interface ForgeStageManifest {
  readonly version: 1;
  readonly target: ForgeBuildSelection;
  readonly complete: true;
  readonly entries: readonly string[];
  readonly artifacts: readonly { readonly fileName: string; readonly hash: string; readonly size: number }[];
}

export interface BuildPromotion {
  readonly stagedPath: string;
  readonly destinationPath: string;
  readonly replaceMode: 'aggregate' | 'target';
}

const FRAMEWORK_DIRECTORIES = new Set<ForgeBuildTarget>(['react', 'vue', 'svelte', 'solid', 'web-components']);

/** Checks whether a candidate path is located inside the parent directory. */
function isPathInside(parent: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

/** Resolves real path for an existing directory prefix when trailing directories do not yet exist. */
function realPathWithMissingSuffix(candidate: string): string {
  const resolved = path.resolve(candidate);
  const missing: string[] = [];
  let existing = resolved;
  while (!fsSync.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) return resolved;
    missing.unshift(path.basename(existing));
    existing = parent;
  }
  return path.join(fsSync.realpathSync(existing), ...missing);
}

/** Asserts that a stage root directory resides safely beneath the package root. */
function assertSafeStageRoot(packageRoot: string, stageRoot: string): void {
  if (!isPathInside(realPathWithMissingSuffix(packageRoot), realPathWithMissingSuffix(stageRoot))) {
    throw new Error(`Forge stage root must be below the package root: ${stageRoot}`);
  }
}

/** Normalize the historical `none` selector and the unset aggregate selector. */
// skipcq: JS-R1005
export function normalizeForgeBuildTarget(value: string | undefined): ForgeBuildSelection {
  if (value === undefined || value === '') {
    return 'all';
  }
  if (value === 'none') {
    return 'forge';
  }
  if (value === 'all' || (FORGE_BUILD_TARGETS as readonly string[]).includes(value)) {
    return value as ForgeBuildSelection;
  }
  throw new Error(`Unknown Forge build target: ${value}`);
}

/** Map a final package path into the corresponding path in a build stage. */
export function deriveForgeStagePath(packageRoot: string, stageRoot: string, finalPath: string): string {
  const resolvedPackageRoot = path.resolve(packageRoot);
  const resolvedFinalPath = path.resolve(finalPath);
  if (!isPathInside(resolvedPackageRoot, resolvedFinalPath)) {
    throw new Error(`Forge output must be below the package root: ${finalPath}`);
  }
  assertSafeStageRoot(resolvedPackageRoot, stageRoot);
  return path.join(path.resolve(stageRoot), path.relative(resolvedPackageRoot, resolvedFinalPath));
}

/** Create a unique, package-local ignored stage directory for a build invocation. */
export function createForgeStageRoot(packageRoot: string): string {
  return path.join(packageRoot, 'node_modules/.cache/forge-build', `${Date.now()}-${randomUUID()}`);
}

/** Safely removes a temporary stage directory. */
async function removeStage(packageRoot: string, stageRoot: string): Promise<void> {
  assertSafeStageRoot(packageRoot, stageRoot);
  await fs.rm(stageRoot, { recursive: true, force: true });
}

/** Collects lingering compiler artifacts (.d.ts, .js) directly under package source directories. */
// skipcq: JS-R1005
async function collectSourceCompilerArtifacts(directory: string, base = directory): Promise<Set<string>> {
  const artifacts = new Set<string>();
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'dist' || entry.name === 'node_modules') continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      for (const artifact of await collectSourceCompilerArtifacts(fullPath, base)) artifacts.add(artifact);
    } else if (entry.isFile() && (entry.name.endsWith('.d.ts') || entry.name.endsWith('.js'))) {
      artifacts.add(path.relative(base, fullPath));
    }
  }
  return artifacts;
}

/** Removes compiler artifact files generated directly in package source directories during build. */
async function removeNewSourceCompilerArtifacts(packageRoot: string, before: Set<string>): Promise<void> {
  const after = await collectSourceCompilerArtifacts(packageRoot);
  for (const artifact of after) {
    if (!before.has(artifact)) await fs.rm(path.join(packageRoot, artifact), { force: true });
  }
}

const STAGE_MANIFEST = '.forge-build-manifest.json';
const ENTRY_NAMES = new Set(['index.js', 'index.mjs', 'index.cjs', 'index.ts', 'index.tsx', 'index.d.ts']);

/** Computes the SHA-256 hash for a buffer. */
function fileHash(contents: Buffer): string {
  return createHash('sha256').update(contents).digest('hex');
}

/** Recursively collects all artifact files in a stage directory. */
async function collectStageFiles(directory: string, prefix = ''): Promise<ForgeStageManifest['artifacts']> {
  const artifacts: ForgeStageManifest['artifacts'] = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const fileName = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      artifacts.push(...(await collectStageFiles(fullPath, fileName)));
      continue;
    }
    if (fileName === STAGE_MANIFEST) continue;
    const contents = await fs.readFile(fullPath);
    artifacts.push({ fileName, hash: fileHash(contents), size: contents.byteLength });
  }
  return artifacts;
}

/** Validates artifact manifests produced within a stage directory. */
// skipcq: JS-R1005
async function validateForgeArtifactManifests(stageRoot: string, target: ForgeBuildSelection): Promise<void> {
  const artifacts = await collectStageFiles(stageRoot);
  const manifests = artifacts.filter((artifact) => artifact.fileName.endsWith('.forge-artifact-manifest.json'));
  for (const artifact of manifests) {
    const manifestPath = path.join(stageRoot, artifact.fileName);
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as {
      version?: number;
      targetId?: string;
      complete?: boolean;
      entries?: readonly string[];
      artifacts?: readonly { fileName: string }[];
    };
    if (manifest.complete === true && manifest.entries?.length === 0) {
      const manifestDir = path.dirname(manifestPath);
      const onDiskFiles = await fs.readdir(manifestDir).catch(() => []);
      const onDiskEntry =
        (ENTRY_NAMES.has('index.js') && onDiskFiles.includes('index.js') ? 'index.js' : undefined) ??
        onDiskFiles.find((f) => ENTRY_NAMES.has(f) && f.endsWith('.js')) ??
        manifest.artifacts?.find(
          (artifact) => artifact.fileName === 'index.js' || artifact.fileName.endsWith('/index.js'),
        )?.fileName ??
        manifest.artifacts?.find((artifact) => /(?:^|\/)entry(?:[:_]).+\.js$/.test(artifact.fileName))?.fileName ??
        manifest.artifacts?.find((artifact) => artifact.fileName.endsWith('.js'))?.fileName;
      if (onDiskEntry !== undefined) {
        const artifacts = await collectStageFiles(manifestDir);
        const updatedManifest = {
          ...manifest,
          entries: [onDiskEntry],
          artifacts: artifacts.length > 0 ? artifacts : (manifest.artifacts ?? []),
        };
        await fs.writeFile(manifestPath, `${JSON.stringify(updatedManifest, undefined, 2)}\n`, 'utf8');
        manifest.entries = [onDiskEntry];
      }
    }
    const targetMatches =
      target === 'all' ||
      manifest.targetId === target ||
      (manifest.targetId !== undefined && manifest.targetId.endsWith(`-${target}`));
    if (
      manifest.version !== 1 ||
      manifest.complete !== true ||
      !Array.isArray(manifest.entries) ||
      manifest.entries.length === 0 ||
      !targetMatches
    ) {
      throw new Error(`Forge artifact manifest is incomplete or targets the wrong output: ${manifestPath}`);
    }
  }
}

/** Asserts that a build stage directory contains complete target compilation artifacts. */
// skipcq: JS-R1005
export async function assertCompleteStage(stageRoot: string, target: ForgeBuildSelection): Promise<string> {
  const stagedDist = path.join(stageRoot, 'dist');
  const entries = await fs.readdir(stagedDist).catch(() => []);
  if (entries.length === 0) {
    throw new Error(`Forge build stage is empty: ${stagedDist}`);
  }
  const expectedRoot = target === 'all' || target === 'forge' ? stagedDist : path.join(stagedDist, target);
  const expectedEntries = await fs.readdir(expectedRoot, { withFileTypes: true }).catch(() => []);
  if (expectedEntries.length === 0) {
    throw new Error(`Forge build stage is missing expected target output "${target}": ${expectedRoot}`);
  }
  if (target !== 'all') {
    const rootHasEntry = expectedEntries.some((entry) => !entry.isDirectory() && ENTRY_NAMES.has(entry.name));
    const componentsHasEntry =
      target === 'forge' &&
      ((await pathExists(path.join(expectedRoot, 'components', 'index.js'))) ||
        (await pathExists(path.join(expectedRoot, 'components', 'index.d.ts'))));
    if (!rootHasEntry && !componentsHasEntry) {
      throw new Error(`Forge build stage is missing the expected ${target} entry (index.*): ${expectedRoot}`);
    }
  }
  if (target === 'all') {
    const artifacts = await collectStageFiles(stagedDist);
    const hasEntry = artifacts.some((artifact) => ENTRY_NAMES.has(path.basename(artifact.fileName)));
    if (!hasEntry) throw new Error(`Forge aggregate stage has no generated entry: ${stagedDist}`);
  }
  await validateForgeArtifactManifests(stagedDist, target);
  const artifacts = await collectStageFiles(stagedDist);
  const manifest: ForgeStageManifest = {
    version: 1,
    target,
    complete: true,
    entries: artifacts
      .filter((artifact) => ENTRY_NAMES.has(path.basename(artifact.fileName)))
      .map((artifact) => artifact.fileName),
    artifacts,
  };
  await fs.writeFile(path.join(stagedDist, STAGE_MANIFEST), `${JSON.stringify(manifest, undefined, 2)}\n`, 'utf8');
  const parsed = JSON.parse(await fs.readFile(path.join(stagedDist, STAGE_MANIFEST), 'utf8')) as ForgeStageManifest;
  if (parsed.version !== 1 || parsed.target !== target || parsed.complete !== true || parsed.entries.length === 0) {
    throw new Error(`Forge build stage manifest is incomplete: ${path.join(stagedDist, STAGE_MANIFEST)}`);
  }
  return stagedDist;
}

/** No-op handler for swallowed promise rejections. */
function noopCatch(): void {
  // Ignored cancellation or cleanup error
}

/** Atomically replaces destination directory with source using a backup directory. */
// skipcq: JS-R1005
async function atomicReplaceDirectory(source: string, destination: string): Promise<void> {
  const backup = `${destination}.forge-backup-${randomUUID()}`;
  const destinationExists = await fs.stat(destination).then(
    () => true,
    () => false,
  );
  try {
    if (destinationExists) {
      await fs.rename(destination, backup);
    }
    await fs.rename(source, destination);
  } catch (error) {
    const destinationStillExists = await fs.stat(destination).then(
      () => true,
      () => false,
    );
    const backupExists = await fs.stat(backup).then(
      () => true,
      () => false,
    );
    if (!destinationStillExists && destinationExists && backupExists) {
      await fs.rename(backup, destination).catch(noopCatch);
    }
    throw error;
  } finally {
    await fs.rm(backup, { recursive: true, force: true });
  }
}

/** Computes the target destination path within a package distribution directory. */
function targetDestination(packageRoot: string, target: ForgeBuildTarget): string {
  return target === 'forge' ? path.join(packageRoot, 'dist') : path.join(packageRoot, `dist/${target}`);
}

/** Checks whether a path exists asynchronously. */
async function pathExists(candidate: string): Promise<boolean> {
  try {
    await fs.stat(candidate);
    return true;
  } catch {
    return false;
  }
}

/** Promote one target without deleting unrelated framework, email, or CMS output. */
// skipcq: JS-R1005
export async function promoteTarget(options: {
  readonly packageRoot: string;
  readonly stageRoot: string;
  readonly target: ForgeBuildTarget;
}): Promise<BuildPromotion> {
  const { packageRoot, stageRoot, target } = options;
  assertSafeStageRoot(packageRoot, stageRoot);
  const stagedDist = await assertCompleteStage(stageRoot, target);
  const destination = path.join(packageRoot, 'dist');
  await fs.mkdir(destination, { recursive: true });

  if (target === 'forge') {
    const stagedComponents = path.join(stagedDist, 'components');
    if (await pathExists(stagedComponents)) {
      await atomicReplaceDirectory(stagedComponents, path.join(destination, 'components'));
    }
    const stagedEntries = await fs.readdir(stagedDist, { withFileTypes: true }).catch(() => []);
    for (const entry of stagedEntries) {
      if (entry.name === 'components' || entry.name.startsWith('.')) continue;
      const src = path.join(stagedDist, entry.name);
      const dest = path.join(destination, entry.name);
      await (entry.isDirectory() ? atomicReplaceDirectory(src, dest) : fs.copyFile(src, dest));
    }
  } else {
    const stagedTarget = path.join(stagedDist, target);
    await ((await pathExists(stagedTarget))
      ? atomicReplaceDirectory(stagedTarget, path.join(destination, target))
      : fs.cp(stagedDist, destination, { recursive: true, force: true }));
    const stagedManifest = path.join(stagedDist, STAGE_MANIFEST);
    if (await pathExists(stagedManifest)) {
      await fs.copyFile(stagedManifest, path.join(destination, STAGE_MANIFEST));
    }
    const stagedCmsRoot = path.join(stagedDist, 'cms');
    if (await pathExists(stagedCmsRoot)) {
      for (const cms of await fs.readdir(stagedCmsRoot, { withFileTypes: true })) {
        if (cms.isDirectory()) {
          const stagedCmsTarget = path.join(stagedCmsRoot, cms.name, target);
          if (await pathExists(stagedCmsTarget)) {
            const destCmsTarget = path.join(destination, 'cms', cms.name, target);
            await fs.mkdir(path.dirname(destCmsTarget), { recursive: true });
            await atomicReplaceDirectory(stagedCmsTarget, destCmsTarget);
          }
        }
      }
    }
  }

  return {
    stagedPath: path.join(stageRoot, 'dist', target === 'forge' ? '' : target),
    destinationPath: targetDestination(packageRoot, target),
    replaceMode: 'target',
  };
}

/** Atomically replace the complete Forge-owned distribution tree. */
export async function promoteAggregate(options: {
  readonly packageRoot: string;
  readonly stageRoot: string;
}): Promise<BuildPromotion> {
  const { packageRoot, stageRoot } = options;
  assertSafeStageRoot(packageRoot, stageRoot);
  const stagedDist = await assertCompleteStage(stageRoot, 'all');
  const destination = path.join(packageRoot, 'dist');
  await atomicReplaceDirectory(stagedDist, destination);
  return { stagedPath: stagedDist, destinationPath: destination, replaceMode: 'aggregate' };
}

/** Prepares environment variables for child Forge build invocations. */
function commandEnvironment(options: ForgeBuildOptions, stageRoot: string): NodeJS.ProcessEnv {
  const {
    FORGE_FRAMEWORK_TARGET: _removedFramework,
    FORGE_CMS_STORYBLOK_TARGET: _removedCms,
    ...restEnv
  } = {
    ...process.env,
    ...options.env,
  };
  const env: NodeJS.ProcessEnv = {
    ...restEnv,
    FORGE_BUILD_STAGE_ROOT: stageRoot,
  };
  if (options.target !== 'all') {
    env.FORGE_FRAMEWORK_TARGET = options.target === 'forge' ? 'none' : options.target;
    // A framework-only build must also stage (and later promote) its matching
    // CMS wrapper subtree. Without this, clearing output would delete
    // `dist/cms/<cms>/<target>` while the stage never regenerates it, losing
    // the sibling artifact. Setting the CMS selector here scopes the CMS
    // build config (e.g. `forgeStoryblokCmsTargets`) to the same target.
    if (FRAMEWORK_DIRECTORIES.has(options.target)) {
      env.FORGE_CMS_STORYBLOK_TARGET = options.target;
    }
  }
  env.FORGE_BUILD_TARGET = options.target;
  return env;
}

/** Executes a build command context as a child process and handles cancellation. */
async function executeCommand(context: ForgeBuildCommandContext): Promise<void> {
  const [executable, ...arguments_] = context.command;
  if (executable === undefined) throw new Error('Forge build command must not be empty.');
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let aborting = false;
    const child = spawn(executable, arguments_, {
      cwd: context.packageRoot,
      env: context.env,
      stdio: 'inherit',
      detached: true,
    });
    /** Finalizes execution and cleans up process signal handlers. */
    const finish = (error?: Error): void => {
      if (settled) return;
      settled = true;
      if (error === undefined) resolve();
      else reject(error);
    };
    /** Aborts child process execution upon cancellation. */
    const abort = (): void => {
      if (settled || aborting) return;
      aborting = true;
      terminateProcessTree(child, { graceMs: 2000 })
        .then(
          () => finish(new Error('Forge build was cancelled.')),
          (error: unknown) => finish(new Error(`Forge build cancellation cleanup failed: ${String(error)}`)),
        )
        .catch(noopCatch);
    };
    child.once('error', (error) => {
      context.signal.removeEventListener('abort', abort);
      finish(error);
    });
    child.once('exit', (code, signal) => {
      if (settled || aborting) return;
      context.signal.removeEventListener('abort', abort);
      if (code === 0) {
        finish();
      } else {
        finish(
          new Error(`Forge build failed${signal === null ? ` with exit code ${code}` : ` with signal ${signal}`}`),
        );
      }
    });
    if (context.signal.aborted) abort();
    else context.signal.addEventListener('abort', abort, { once: true });
  });
}

/**
 * Resolve the tsdown execution command for the target.
 * Uses `tsdown.<target>.config.ts` if present, falling back to standard `tsdown`.
 */
export function resolveTargetCommand(packageRoot: string, target: ForgeBuildSelection): string[] {
  if (target === 'all') {
    return ['pnpm', 'exec', 'tsdown'];
  }
  const targetConfig = path.join(packageRoot, `tsdown.${target}.config.ts`);
  if (fsSync.existsSync(targetConfig)) {
    return ['pnpm', 'exec', 'tsdown', '--config', `tsdown.${target}.config.ts`];
  }
  return ['pnpm', 'exec', 'tsdown'];
}

/** Execute tsdown in an isolated stage and promote only after a complete build. */
// skipcq: JS-R1005
export async function runForgeBuild(options: ForgeBuildOptions): Promise<BuildPromotion> {
  const packageRoot = path.resolve(options.packageRoot);
  const stageRoot = path.resolve(options.stageRoot);
  const target = normalizeForgeBuildTarget(options.target);
  assertSafeStageRoot(packageRoot, stageRoot);
  await removeStage(packageRoot, stageRoot);
  await fs.mkdir(stageRoot, { recursive: true });
  const command = options.command ?? resolveTargetCommand(packageRoot, target);
  const controller = new AbortController();
  /** Forwards parent abort signal to the internal build controller. */
  const abortParent = (): void => controller.abort();
  options.signal?.addEventListener('abort', abortParent, { once: true });
  const timeout = options.timeoutMs === undefined ? undefined : setTimeout(() => controller.abort(), options.timeoutMs);
  const sourceCompilerArtifacts = await collectSourceCompilerArtifacts(packageRoot);

  if (
    target === 'all' &&
    options.command === undefined &&
    !fsSync.existsSync(path.join(packageRoot, 'tsdown.config.ts'))
  ) {
    const candidateTargets: readonly (ForgeBuildTarget | 'cms')[] = [
      'forge',
      'react',
      'vue',
      'svelte',
      'solid',
      'web-components',
      'cms',
    ];
    const availableTargets = candidateTargets.filter((candidate) =>
      fsSync.existsSync(path.join(packageRoot, `tsdown.${candidate}.config.ts`)),
    );
    if (availableTargets.length > 0) {
      try {
        for (const currentTarget of availableTargets) {
          if (controller.signal.aborted) throw new Error('Forge build was cancelled.');
          const targetContext: ForgeBuildCommandContext = {
            packageRoot,
            stageRoot,
            command: ['pnpm', 'exec', 'tsdown', '--config', `tsdown.${currentTarget}.config.ts`],
            env:
              currentTarget === 'cms'
                ? {
                    ...process.env,
                    ...options.env,
                    FORGE_BUILD_STAGE_ROOT: stageRoot,
                    FORGE_BUILD_TARGET: 'all',
                  }
                : commandEnvironment({ ...options, target: currentTarget }, stageRoot),
            signal: controller.signal,
          };
          const stepPromise = (options.runCommand ?? executeCommand)(targetContext);
          await new Promise<void>((resolve, reject) => {
            /** Rejects the build step when the abort signal triggers. */
            const onAbort = (): void => reject(new Error('Forge build was cancelled.'));
            controller.signal.addEventListener('abort', onAbort, { once: true });
            stepPromise.then(resolve, reject).finally(() => controller.signal.removeEventListener('abort', onAbort));
          });
        }
        return await promoteAggregate({ packageRoot, stageRoot });
      } finally {
        if (timeout !== undefined) clearTimeout(timeout);
        options.signal?.removeEventListener('abort', abortParent);
        await removeStage(packageRoot, stageRoot);
        await removeNewSourceCompilerArtifacts(packageRoot, sourceCompilerArtifacts);
      }
    }
  }

  const context: ForgeBuildCommandContext = {
    packageRoot,
    stageRoot,
    command,
    env: commandEnvironment({ ...options, target }, stageRoot),
    signal: controller.signal,
  };
  let buildPromise: Promise<void> | undefined;

  try {
    if (controller.signal.aborted) throw new Error('Forge build was cancelled.');
    buildPromise = (options.runCommand ?? executeCommand)(context);
    await new Promise<void>((resolve, reject) => {
      /** Rejects the build when the abort signal triggers. */
      const onAbort = (): void => reject(new Error('Forge build was cancelled.'));
      controller.signal.addEventListener('abort', onAbort, { once: true });
      buildPromise.then(resolve, reject).finally(() => controller.signal.removeEventListener('abort', onAbort));
    });
    if (target === 'all') {
      return await promoteAggregate({ packageRoot, stageRoot });
    }
    return await promoteTarget({ packageRoot, stageRoot, target });
  } finally {
    if (controller.signal.aborted && buildPromise !== undefined) {
      await Promise.race([buildPromise.catch(noopCatch), new Promise<void>((resolve) => setTimeout(resolve, 2500))]);
    }
    if (timeout !== undefined) clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abortParent);
    await removeStage(packageRoot, stageRoot);
    await removeNewSourceCompilerArtifacts(packageRoot, sourceCompilerArtifacts);
  }
}

/** Validates whether a value is a valid ForgeBuildTarget string. */
export function isForgeBuildTarget(value: string): value is ForgeBuildTarget {
  return (FORGE_BUILD_TARGETS as readonly string[]).includes(value);
}
