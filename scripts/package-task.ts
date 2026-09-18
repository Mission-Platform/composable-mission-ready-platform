import { spawnSync } from 'node:child_process';
import process from 'node:process';

export interface ParsedPackageTaskArgs {
  readonly action: 'test' | 'build';
  readonly packageName: string;
  readonly extraArgs: readonly string[];
}

/**
 * Parses a single CLI argument token to determine if it defines a target package filter.
 *
 * @param argument - Current CLI argument token.
 * @param nextArgument - Subsequent CLI argument token if available.
 * @returns Object indicating parsed package name and whether next argument was consumed.
 */
function extractPackageFilter(argument: string, nextArgument?: string): { packageName?: string; consumed: boolean } {
  if (argument === '--filter') {
    const valid = Boolean(nextArgument && !nextArgument.startsWith('-'));
    return { packageName: valid ? nextArgument : undefined, consumed: valid };
  }
  if (argument.startsWith('--filter=')) {
    return { packageName: argument.slice('--filter='.length), consumed: false };
  }
  return { consumed: false };
}

/**
 * Parses and validates arguments for running package-scoped test or build commands.
 *
 * @param rawArgs - Raw CLI arguments passed to the script.
 * @returns Strongly-typed parsed action and package configuration.
 */
export function parsePackageTaskArgs(rawArgs: readonly string[]): ParsedPackageTaskArgs {
  const [actionArg, ...remaining] = rawArgs;
  const action = actionArg === 'build' ? 'build' : actionArg === 'test' ? 'test' : undefined;

  if (!action) {
    throw new Error('Action must be either "test" or "build". Usage: pnpm test:package <package-name> [turbo-options]');
  }

  let packageName: string | undefined;
  const extraArgs: string[] = [];

  for (let index = 0; index < remaining.length; index += 1) {
    const argument = remaining[index]!;
    const filter = extractPackageFilter(argument, remaining[index + 1]);
    if (filter.packageName) {
      packageName = filter.packageName;
      if (filter.consumed) index += 1;
    } else if (!packageName && !argument.startsWith('-')) {
      packageName = argument;
    } else {
      extraArgs.push(argument);
    }
  }

  if (!packageName) {
    throw new Error(
      `A target package name is required for ${action}:package. Usage: pnpm ${action}:package <package-name> [turbo-options]`,
    );
  }

  // Strip trailing glob or filter selectors like '...' or '^...' if provided
  const cleanedPackageName = packageName.replace(/\^?\.\.\.$/, '');

  return {
    action,
    packageName: cleanedPackageName,
    extraArgs,
  };
}

/**
 * Orchestrates upstream dependency priming followed by package task execution.
 *
 * @param rawArgs - Raw command line arguments.
 */
export function runPackageTask(rawArgs: readonly string[] = process.argv.slice(2)): void {
  const { action, packageName, extraArgs } = parsePackageTaskArgs(rawArgs);

  // Keep the helper-level warm-up explicit for both actions. The task graph also
  // declares ^build for test-related tasks, so repeated work is cacheable and
  // the graph remains the safety net for direct Turbo invocations.
  console.log(`[package-task] Priming upstream dependencies for '${packageName}' (cached when already built)...`);
  const primeResult = spawnSync('pnpm', ['exec', 'turbo', 'run', 'build', `--filter=${packageName}^...`], {
    stdio: 'inherit',
  });

  if (primeResult.status !== 0) {
    throw new Error(`Upstream build priming failed with status ${primeResult.status ?? 1}`);
  }

  console.log(`[package-task] Executing '${action}' on '${packageName}'...`);
  const taskResult = spawnSync('pnpm', ['exec', 'turbo', 'run', action, `--filter=${packageName}`, ...extraArgs], {
    stdio: 'inherit',
  });

  if (taskResult.status !== 0) {
    throw new Error(`Execution of '${action}' on '${packageName}' failed with status ${taskResult.status ?? 1}`);
  }
}

if (process.argv[1]?.endsWith('package-task.ts')) {
  try {
    runPackageTask();
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exitCode = 1;
  }
}
