import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

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
}

export interface ForgeBuildCommandContext {
  readonly packageRoot: string;
  readonly stageRoot: string;
  readonly command: readonly string[];
  readonly env: NodeJS.ProcessEnv;
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

function assertSafeStageRoot(packageRoot: string, stageRoot: string): void {
  if (!isPathInside(packageRoot, stageRoot)) {
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

async function assertCompleteStage(stageRoot: string): Promise<string> {
  const stagedDist = path.join(stageRoot, 'dist');
  const entries = await fs.readdir(stagedDist);
  if (entries.length === 0) {
    throw new Error(`Forge build stage is empty: ${stagedDist}`);
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
  const stagedDist = await assertCompleteStage(stageRoot);
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
  const stagedDist = await assertCompleteStage(stageRoot);
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
  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, arguments_, {
      cwd: context.packageRoot,
      env: context.env,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(`Forge build failed${signal === null ? ` with exit code ${code}` : ` with signal ${signal}`}`),
        );
      }
    });
  });
}

/** Execute tsdown in an isolated stage and promote only after a complete build. */
export async function runForgeBuild(options: ForgeBuildOptions): Promise<BuildPromotion> {
  const packageRoot = path.resolve(options.packageRoot);
  const stageRoot = path.resolve(options.stageRoot);
  assertSafeStageRoot(packageRoot, stageRoot);
  await removeStage(packageRoot, stageRoot);
  await fs.mkdir(stageRoot, { recursive: true });
  const command = options.command ?? ['pnpm', 'exec', 'tsdown'];
  const context: ForgeBuildCommandContext = {
    packageRoot,
    stageRoot,
    command,
    env: commandEnvironment(options, stageRoot),
  };

  try {
    await (options.runCommand ?? executeCommand)(context);
    if (options.target === 'all') {
      return await promoteAggregate({ packageRoot, stageRoot });
    }
    return await promoteTarget({ packageRoot, stageRoot, target: options.target });
  } finally {
    await removeStage(packageRoot, stageRoot);
  }
}

export function isForgeBuildTarget(value: string): value is ForgeBuildTarget {
  return (FORGE_BUILD_TARGETS as readonly string[]).includes(value);
}
