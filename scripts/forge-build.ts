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
const CMS_TARGET_VARIABLES = ['FORGE_CMS_STORYBLOK_TARGET'] as const;

function isPathInside(parent: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

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

function assertSafeStageRoot(packageRoot: string, stageRoot: string): void {
  if (!isPathInside(realPathWithMissingSuffix(packageRoot), realPathWithMissingSuffix(stageRoot))) {
    throw new Error(`Forge stage root must be below the package root: ${stageRoot}`);
  }
}

/** Normalize the historical `none` selector and the unset aggregate selector. */
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

async function removeStage(packageRoot: string, stageRoot: string): Promise<void> {
  assertSafeStageRoot(packageRoot, stageRoot);
  await fs.rm(stageRoot, { recursive: true, force: true });
}

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

async function removeNewSourceCompilerArtifacts(packageRoot: string, before: Set<string>): Promise<void> {
  const after = await collectSourceCompilerArtifacts(packageRoot);
  for (const artifact of after) {
    if (!before.has(artifact)) await fs.rm(path.join(packageRoot, artifact), { force: true });
  }
}

async function removeCachedCompilerArtifacts(packageRoot: string): Promise<void> {
  const cacheRoot = path.join(packageRoot, 'node_modules/.cache');
  // `null` is the explicit missing-cache sentinel for this optional cleanup.
  // eslint-disable-next-line unicorn/no-null
  const cacheStats = await fs.stat(cacheRoot).catch(() => null);
  if (cacheStats?.isDirectory() !== true) return;
  const walk = async (directory: string): Promise<void> => {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(fullPath);
      else if (entry.name.endsWith('.d.ts') || entry.name.endsWith('.js')) await fs.rm(fullPath, { force: true });
    }
  };
  await walk(cacheRoot);
}

const STAGE_MANIFEST = '.forge-build-manifest.json';
const ENTRY_NAMES = new Set(['index.js', 'index.mjs', 'index.cjs', 'index.ts', 'index.tsx', 'index.d.ts']);

function fileHash(contents: Buffer): string {
  return createHash('sha256').update(contents).digest('hex');
}

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
    };
    if (
      manifest.version !== 1 ||
      manifest.complete !== true ||
      !Array.isArray(manifest.entries) ||
      manifest.entries.length === 0 ||
      (target !== 'all' && manifest.targetId !== target)
    ) {
      throw new Error(`Forge artifact manifest is incomplete or targets the wrong output: ${manifestPath}`);
    }
  }
}

async function assertCompleteStage(stageRoot: string, target: ForgeBuildSelection): Promise<string> {
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
    const hasEntry = expectedEntries.some((entry) => !entry.isDirectory() && ENTRY_NAMES.has(entry.name));
    if (!hasEntry) {
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
      await fs.rename(backup, destination).catch(() => {});
    }
    throw error;
  } finally {
    await fs.rm(backup, { recursive: true, force: true });
  }
}

function targetDestination(packageRoot: string, target: ForgeBuildTarget): string {
  return target === 'forge' ? path.join(packageRoot, 'dist') : path.join(packageRoot, `dist/${target}`);
}

async function pathExists(candidate: string): Promise<boolean> {
  return fs.stat(candidate).then(
    () => true,
    () => false,
  );
}

async function removeSelectedOutput(dist: string, target: ForgeBuildTarget, stagedDist: string): Promise<void> {
  if (target === 'forge') {
    for (const entry of await fs.readdir(dist, { withFileTypes: true })) {
      if (
        entry.isDirectory() &&
        (entry.name === 'cms' || entry.name === 'email' || FRAMEWORK_DIRECTORIES.has(entry.name as ForgeBuildTarget))
      ) {
        continue;
      }
      await fs.rm(path.join(dist, entry.name), { recursive: true, force: true });
    }
    return;
  }

  await fs.rm(path.join(dist, target), { recursive: true, force: true });
  const cmsRoot = path.join(dist, 'cms');
  const stagedCmsRoot = path.join(stagedDist, 'cms');
  for (const cms of await fs.readdir(cmsRoot, { withFileTypes: true }).catch(() => [])) {
    // Only clear a CMS wrapper subtree when the stage regenerates the exact
    // same subtree (see `commandEnvironment`'s `FORGE_CMS_STORYBLOK_TARGET`
    // wiring). Otherwise a framework-only build that does not rebuild CMS
    // output would delete a sibling artifact it can never replace.
    if (cms.isDirectory() && (await pathExists(path.join(stagedCmsRoot, cms.name, target)))) {
      await fs.rm(path.join(cmsRoot, cms.name, target), { recursive: true, force: true });
    }
  }
}

/** Promote one target without deleting unrelated framework, email, or CMS output. */
export async function promoteTarget(options: {
  readonly packageRoot: string;
  readonly stageRoot: string;
  readonly target: ForgeBuildTarget;
}): Promise<BuildPromotion> {
  const { packageRoot, stageRoot, target } = options;
  assertSafeStageRoot(packageRoot, stageRoot);
  const stagedDist = await assertCompleteStage(stageRoot, target);
  const destination = path.join(packageRoot, 'dist');
  const promotionRoot = await fs.mkdtemp(path.join(packageRoot, '.forge-promotion-'));
  const promotionDist = path.join(promotionRoot, 'dist');

  try {
    const destinationExists = await fs.stat(destination).then(
      () => true,
      () => false,
    );
    await (destinationExists
      ? fs.cp(destination, promotionDist, { recursive: true })
      : fs.mkdir(promotionDist, { recursive: true }));
    await removeSelectedOutput(promotionDist, target, stagedDist);
    await fs.cp(stagedDist, promotionDist, { recursive: true, force: true });
    await atomicReplaceDirectory(promotionDist, destination);
  } finally {
    await fs.rm(promotionRoot, { recursive: true, force: true });
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

function commandEnvironment(options: ForgeBuildOptions, stageRoot: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, ...options.env, FORGE_BUILD_STAGE_ROOT: stageRoot };
  delete env.FORGE_FRAMEWORK_TARGET;
  for (const variable of CMS_TARGET_VARIABLES) {
    delete env[variable];
  }
  if (options.target !== 'all') {
    env.FORGE_FRAMEWORK_TARGET = options.target === 'forge' ? 'none' : options.target;
    // A framework-only build must also stage (and later promote) its matching
    // CMS wrapper subtree. Without this, `removeSelectedOutput` would delete
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
    const finish = (error?: Error): void => {
      if (settled) return;
      settled = true;
      context.signal.removeEventListener('abort', abort);
      if (error === undefined) resolve();
      else reject(error);
    };
    const abort = (): void => {
      if (settled || aborting) return;
      aborting = true;
      void terminateProcessTree(child, { graceMs: 2000 }).then(
        () => finish(new Error('Forge build was cancelled.')),
        (error: unknown) => finish(new Error(`Forge build cancellation cleanup failed: ${String(error)}`)),
      );
    };
    child.once('error', (error) => finish(error));
    child.once('exit', (code, signal) => {
      if (settled || aborting) return;
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

/** Execute tsdown in an isolated stage and promote only after a complete build. */
export async function runForgeBuild(options: ForgeBuildOptions): Promise<BuildPromotion> {
  const packageRoot = path.resolve(options.packageRoot);
  const stageRoot = path.resolve(options.stageRoot);
  const target = normalizeForgeBuildTarget(options.target);
  assertSafeStageRoot(packageRoot, stageRoot);
  await removeStage(packageRoot, stageRoot);
  await fs.mkdir(stageRoot, { recursive: true });
  const command = options.command ?? ['pnpm', 'exec', 'tsdown'];
  const controller = new AbortController();
  const abortParent = (): void => controller.abort();
  options.signal?.addEventListener('abort', abortParent, { once: true });
  const timeout = options.timeoutMs === undefined ? undefined : setTimeout(() => controller.abort(), options.timeoutMs);
  const sourceCompilerArtifacts = await collectSourceCompilerArtifacts(packageRoot);
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
      await Promise.race([buildPromise.catch(() => {}), new Promise<void>((resolve) => setTimeout(resolve, 2500))]);
    }
    if (timeout !== undefined) clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abortParent);
    await removeStage(packageRoot, stageRoot);
    await removeNewSourceCompilerArtifacts(packageRoot, sourceCompilerArtifacts);
    await removeCachedCompilerArtifacts(packageRoot);
  }
}

export function isForgeBuildTarget(value: string): value is ForgeBuildTarget {
  return (FORGE_BUILD_TARGETS as readonly string[]).includes(value);
}
