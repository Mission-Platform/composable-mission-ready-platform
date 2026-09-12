/**
 * Worktree management utility for the Mission Platform monorepo.
 * Handles provisioning, synchronization of LSP configs, Turbo cache sharing,
 * dependency integrity, and validation across isolated Git worktrees.
 *
 * Usage:
 *   node --experimental-strip-types scripts/worktree-manager.ts list
 *   node --experimental-strip-types scripts/worktree-manager.ts setup [path]
 *   node --experimental-strip-types scripts/worktree-manager.ts create <branch> [path]
 *   node --experimental-strip-types scripts/worktree-manager.ts remove <path>
 */
import { execFile as execFileCallback } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);

interface WorktreeEntry {
  readonly path: string;
  readonly head: string;
  readonly branch: string;
  readonly isBare: boolean;
  readonly isDetached: boolean;
  readonly isMain: boolean;
  readonly hasNodeModules: boolean;
  readonly hasLspConfig: boolean;
  readonly hasTurboCache: boolean;
  readonly isClean: boolean;
}

async function runGit(args: readonly string[], cwd?: string): Promise<string> {
  const { stdout } = await execFile('git', [...args], {
    cwd: cwd ?? process.cwd(),
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout.trim();
}

async function getMainRepoRoot(): Promise<string> {
  const commonDir = await runGit(['rev-parse', '--git-common-dir']);
  return resolve(process.cwd(), commonDir, '..');
}

export async function listWorktrees(): Promise<readonly WorktreeEntry[]> {
  const porcelainOutput = await runGit(['worktree', 'list', '--porcelain']);
  const blocks = porcelainOutput.split('\n\n').filter((block) => block.trim().length > 0);
  const mainRoot = await getMainRepoRoot();

  const entries: WorktreeEntry[] = [];

  for (const block of blocks) {
    const lines = block.split('\n');
    let path = '';
    let head = '';
    let branch = '';
    let isBare = false;
    let isDetached = false;

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        path = line.slice('worktree '.length).trim();
      } else if (line.startsWith('HEAD ')) {
        head = line.slice('HEAD '.length).trim();
      } else if (line.startsWith('branch ')) {
        branch = line.slice('branch '.length).trim();
      } else if (line === 'bare') {
        isBare = true;
      } else if (line === 'detached') {
        isDetached = true;
      }
    }

    if (!path) continue;

    const hasNodeModules = existsSync(resolve(path, 'node_modules'));
    const hasLspConfig = existsSync(resolve(path, 'agent-lsp.json'));
    const hasTurboCache = existsSync(resolve(path, '.turbo')) || existsSync(resolve(mainRoot, '.turbo'));

    let isClean = true;
    try {
      const status = await runGit(['status', '--porcelain'], path);
      isClean = status.length === 0;
    } catch {
      isClean = false;
    }

    entries.push({
      path,
      head,
      branch: branch ? branch.replace('refs/heads/', '') : isDetached ? '(detached)' : '(bare)',
      isBare,
      isDetached,
      isMain: resolve(path) === resolve(mainRoot),
      hasNodeModules,
      hasLspConfig,
      hasTurboCache,
      isClean,
    });
  }

  return entries;
}

export async function setupWorktree(targetPathInput?: string): Promise<void> {
  const targetPath = targetPathInput ? resolve(targetPathInput) : process.cwd();
  console.log(`[worktree-manager] Setting up worktree at: ${targetPath}`);

  if (!existsSync(targetPath)) {
    throw new Error(`Target path does not exist: ${targetPath}`);
  }

  const mainRoot = await getMainRepoRoot();
  console.log(`[worktree-manager] Main repository detected at: ${mainRoot}`);

  // 1. Ensure Turbo cache folder exists in main repository so Turbo worktree cache-sharing functions seamlessly
  const mainTurboCache = resolve(mainRoot, '.turbo', 'cache');
  if (!existsSync(mainTurboCache)) {
    await mkdir(mainTurboCache, { recursive: true });
    console.log(`[worktree-manager] Initialized main Turbo cache directory: ${mainTurboCache}`);
  }

  // Also ensure target worktree has .turbo directory
  const targetTurbo = resolve(targetPath, '.turbo');
  if (!existsSync(targetTurbo)) {
    await mkdir(targetTurbo, { recursive: true });
    console.log(`[worktree-manager] Created worktree .turbo directory.`);
  }

  // 2. Synchronize agent-lsp.json if missing in worktree
  const mainLspConfig = resolve(mainRoot, 'agent-lsp.json');
  const targetLspConfig = resolve(targetPath, 'agent-lsp.json');

  if (existsSync(mainLspConfig)) {
    if (existsSync(targetLspConfig)) {
      console.log(`[worktree-manager] agent-lsp.json is already present.`);
    } else {
      await copyFile(mainLspConfig, targetLspConfig);
      console.log(`[worktree-manager] Synchronized agent-lsp.json from main repository.`);
    }
  }

  // 3. Verify node_modules / pnpm dependencies
  const targetNodeModules = resolve(targetPath, 'node_modules');
  if (existsSync(targetNodeModules)) {
    console.log(`[worktree-manager] node_modules directory confirmed.`);
  } else {
    const mainNodeModules = resolve(mainRoot, 'node_modules');
    if (existsSync(mainNodeModules) && process.platform === 'darwin') {
      try {
        console.log(`[worktree-manager] Fast APFS copy-on-write clone of node_modules...`);
        await execFile('cp', ['-cR', mainNodeModules, targetNodeModules]);
        console.log(`[worktree-manager] APFS clone complete.`);
      } catch (cloneError) {
        console.warn(`[worktree-manager] Fast clone fallback: ${String(cloneError)}`);
      }
    }
    console.log(`[worktree-manager] Executing 'pnpm install --frozen-lockfile'...`);
    await execFile('pnpm', ['install', '--frozen-lockfile'], {
      cwd: targetPath,
      stdio: 'inherit',
    });
    console.log(`[worktree-manager] pnpm dependencies successfully installed.`);
  }

  // 4. Verification check
  console.log(`[worktree-manager] Validating worktree build readiness...`);
  try {
    await execFile('pnpm', ['--filter', '@mission-platform/forge-web-script-regex', 'test'], {
      cwd: targetPath,
      stdio: 'pipe',
    });
    console.log(`[worktree-manager] Verification passed: @mission-platform/forge-web-script-regex tests green.`);
  } catch (error) {
    console.warn(`[worktree-manager] Warning: verification check encountered an issue: ${String(error)}`);
  }

  console.log(`[worktree-manager] Worktree setup complete and ready for development: ${targetPath}`);
}

export async function createWorktree(
  branchName: string,
  targetPathInput?: string,
  baseRef = 'origin/main',
): Promise<void> {
  const mainRoot = await getMainRepoRoot();
  const sanitizedBranch = branchName.replaceAll(/[^a-zA-Z0-9._-]/g, '-');
  const defaultPath = resolve(mainRoot, '..', `composable_mission_ready_platform_${sanitizedBranch}`);
  const targetPath = targetPathInput ? resolve(targetPathInput) : defaultPath;

  console.log(`[worktree-manager] Creating worktree for branch '${branchName}' (base: ${baseRef}) at: ${targetPath}`);

  if (existsSync(targetPath)) {
    throw new Error(`Target path already exists: ${targetPath}`);
  }

  // Check if branch already exists
  let branchExists = false;
  try {
    await runGit(['rev-parse', '--verify', branchName]);
    branchExists = true;
  } catch {
    branchExists = false;
  }

  const gitArgs = branchExists
    ? ['worktree', 'add', targetPath, branchName]
    : ['worktree', 'add', '-b', branchName, targetPath, baseRef];

  console.log(`[worktree-manager] Executing: git ${gitArgs.join(' ')}`);
  await runGit(gitArgs);

  // Setup the newly created worktree
  await setupWorktree(targetPath);
  console.log(`[worktree-manager] New worktree successfully provisioned at: ${targetPath}`);
  console.log(`To switch to the worktree: cd "${targetPath}"`);
}

export async function removeWorktree(targetPathInput: string, force = false): Promise<void> {
  const targetPath = resolve(targetPathInput);
  console.log(`[worktree-manager] Removing worktree at: ${targetPath}`);

  if (!existsSync(targetPath)) {
    throw new Error(`Target path does not exist: ${targetPath}`);
  }

  if (!force) {
    const status = await runGit(['status', '--porcelain'], targetPath);
    if (status.trim().length > 0) {
      throw new Error(`Worktree has uncommitted modifications. Commit, stash, or pass --force to remove.`);
    }
  }

  const gitArgs = force ? ['worktree', 'remove', '--force', targetPath] : ['worktree', 'remove', targetPath];
  await runGit(gitArgs);
  console.log(`[worktree-manager] Worktree removed: ${targetPath}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] ?? 'list';

  switch (command) {
    case 'list': {
      const worktrees = await listWorktrees();
      console.log('\n=== Monorepo Git Worktrees ===\n');
      for (const wt of worktrees) {
        const flags = [
          wt.isMain ? 'MAIN' : 'LINKED',
          wt.isClean ? 'clean' : 'modified',
          wt.hasLspConfig ? 'LSP:ready' : 'LSP:missing',
          wt.hasNodeModules ? 'deps:installed' : 'deps:missing',
        ].join(' | ');
        console.log(`* [${wt.branch}] ${wt.path}`);
        console.log(`  HEAD: ${wt.head.slice(0, 8)} (${flags})\n`);
      }
      break;
    }

    case 'setup': {
      const target = args[1];
      if (target === '--all') {
        const worktrees = await listWorktrees();
        console.log(`[worktree-manager] Setting up all ${worktrees.length} worktrees...`);
        for (const wt of worktrees) {
          console.log(`\n--- Setting up: ${wt.path} (${wt.branch}) ---`);
          await setupWorktree(wt.path);
        }
      } else {
        await setupWorktree(target);
      }
      break;
    }

    case 'create': {
      const branch = args[1];
      if (!branch) {
        console.error('Error: branch name is required. Usage: worktree-manager.ts create <branch> [path] [baseRef]');
        process.exit(1);
      }
      const targetPath = args[2];
      const baseRef = args[3] ?? 'origin/main';
      await createWorktree(branch, targetPath, baseRef);
      break;
    }

    case 'remove': {
      const target = args[1];
      if (!target) {
        console.error('Error: target path is required. Usage: worktree-manager.ts remove <path> [--force]');
        process.exit(1);
      }
      const force = args.includes('--force');
      await removeWorktree(target, force);
      break;
    }

    default: {
      console.log(`Usage: node --experimental-strip-types scripts/worktree-manager.ts [list|setup|create|remove]`);
      break;
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  try {
    await main();
  } catch (error) {
    console.error(`[worktree-manager] Fatal error:`, error);
    process.exit(1);
  }
}
