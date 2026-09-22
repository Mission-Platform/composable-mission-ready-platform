import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/** Reads package scripts declared in package.json at the target directory. */
function readPackageScripts(packageRoot: string): Record<string, string> {
  const packageJsonPath = path.join(packageRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return {};
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return parsed.scripts || {};
  } catch {
    return {};
  }
}

/** Discovers tsdown configuration files in the root package directory. */
function findTsdownConfigs(packageRoot: string): string[] {
  return fs
    .readdirSync(packageRoot)
    .filter((file) => file.startsWith('tsdown.') && file.endsWith('.config.ts'))
    .sort();
}

/** Cleans non-dotfiles from the dist directory before launching builders. */
function cleanDistNonDotfiles(packageRoot: string): void {
  const distDir = path.join(packageRoot, 'dist');
  if (!fs.existsSync(distDir)) {
    return;
  }
  for (const file of fs.readdirSync(distDir)) {
    if (!file.startsWith('.')) {
      fs.rmSync(path.join(distDir, file), { recursive: true, force: true });
    }
  }
}

/**
 * Concurrently builds a package across all its discrete targets or sub-tasks.
 * If no target configs exist, falls back to standard tsdown.
 */
export async function buildPackage(packageRoot: string = process.cwd()): Promise<void> {
  const scripts = readPackageScripts(packageRoot);
  const tsdownConfigs = findTsdownConfigs(packageRoot);

  if (tsdownConfigs.length > 0) {
    await runConcurrentCommands(
      tsdownConfigs.map((config) => ({
        command: 'pnpm',
        args: ['exec', 'tsdown', '--config', config],
      })),
      packageRoot,
    );

    if (scripts['build:sprite']) {
      await runSingleCommand('pnpm', ['run', 'build:sprite'], packageRoot);
    }
    return;
  }

  if (fs.existsSync(path.join(packageRoot, 'vite.config.ts'))) {
    cleanDistNonDotfiles(packageRoot);
    const commands: Array<{ command: string; args: string[] }> = [{ command: 'pnpm', args: ['exec', 'vite', 'build'] }];
    if (scripts['build:types']) {
      commands.push({ command: 'pnpm', args: ['run', 'build:types'] });
    }

    await runConcurrentCommands(commands, packageRoot);
    return;
  }

  await runSingleCommand('pnpm', ['exec', 'tsdown'], packageRoot);
}

/** Executes a single command in child process and resolves when finished. */
function runSingleCommand(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command "${command} ${args.join(' ')}" failed with exit code ${code}`));
      }
    });
    child.on('error', reject);
  });
}

/** Kills any active child processes that are still running. */
function killActiveChildren(activeChildren: readonly ChildProcess[]): void {
  for (const child of activeChildren) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
}

/** Executes multiple child commands concurrently with unified abort signal handling. */
function runConcurrentCommands(commands: Array<{ command: string; args: string[] }>, cwd: string): Promise<void> {
  const activeChildren: ChildProcess[] = [];
  let isAborting = false;

  const cleanup = (): void => {
    if (isAborting) return;
    isAborting = true;
    killActiveChildren(activeChildren);
  };

  process.once('SIGINT', cleanup);
  process.once('SIGTERM', cleanup);

  return new Promise<void>((resolve, reject) => {
    Promise.all(
      commands.map(
        ({ command, args }) =>
          new Promise<void>((res, rej) => {
            const child = spawn(command, args, {
              cwd,
              stdio: 'inherit',
              env: process.env,
            });
            activeChildren.push(child);

            child.on('exit', (code) => {
              if (code === 0) {
                res();
              } else {
                cleanup();
                rej(new Error(`Command "${command} ${args.join(' ')}" failed with exit code ${code}`));
              }
            });
            child.on('error', (error) => {
              cleanup();
              rej(error);
            });
          }),
      ),
    )
      .then(() => resolve())
      .catch((error) => reject(error))
      .finally(() => {
        process.removeListener('SIGINT', cleanup);
        process.removeListener('SIGTERM', cleanup);
      });
  });
}

if (process.argv[1]?.endsWith('build-package.ts')) {
  try {
    await buildPackage();
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
