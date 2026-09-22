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
 * Parses and verifies the action argument.
 *
 * @param actionArg - Raw action token.
 * @returns Validated action type.
 */
function parseAction(actionArg: string | undefined): 'test' | 'build' {
  if (actionArg === 'build' || actionArg === 'test') {
    return actionArg;
  }
  throw new Error('Action must be either "test" or "build". Usage: pnpm test:package <package-name> [turbo-options]');
}

/**
 * Evaluates whether an argument token corresponds to a filter flag or positional package name.
 *
 * @param argument - Current argument token.
 * @param nextArgument - Next argument token if present.
 * @param currentPackage - Currently resolved package name.
 * @returns Object with resolved package and consumed token indicator.
 */
function resolveArgumentToken(
  argument: string,
  nextArgument: string | undefined,
  currentPackage: string | undefined,
): { foundPackage?: string; consumed: boolean } {
  const filter = extractPackageFilter(argument, nextArgument);
  if (filter.packageName) {
    return { foundPackage: filter.packageName, consumed: filter.consumed };
  }
  if (!currentPackage && !argument.startsWith('-')) {
    return { foundPackage: argument, consumed: false };
  }
  return { consumed: false };
}

/**
 * Scans tokens to extract target package name and extra options.
 *
 * @param tokens - Argument tokens excluding action.
 * @returns Object with parsed package name and extra argument list.
 */
function extractPackageAndArgs(tokens: readonly string[]): { packageName?: string; extraArgs: string[] } {
  let packageName: string | undefined;
  const extraArgs: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const argument = tokens[index];
    if (!argument) continue;

    const result = resolveArgumentToken(argument, tokens[index + 1], packageName);
    if (result.foundPackage) {
      packageName = result.foundPackage;
      if (result.consumed) index += 1;
    } else {
      extraArgs.push(argument);
    }
  }

  return { packageName, extraArgs };
}

/**
 * Parses and validates arguments for running package-scoped test or build commands.
 *
 * @param rawArgs - Raw CLI arguments passed to the script.
 * @returns Strongly-typed parsed action and package configuration.
 */
export function parsePackageTaskArgs(rawArgs: readonly string[]): ParsedPackageTaskArgs {
  const [actionArg, ...remaining] = rawArgs;
  const action = parseAction(actionArg);
  const { packageName, extraArgs } = extractPackageAndArgs(remaining);

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
 * Orchestrates package task execution utilizing Turborepo's dependency graph.
 *
 * @param rawArgs - Raw command line arguments.
 */
export function runPackageTask(rawArgs: readonly string[] = process.argv.slice(2)): void {
  const { action, packageName, extraArgs } = parsePackageTaskArgs(rawArgs);

  const filterTarget = action === 'build' ? `${packageName}...` : packageName;
  console.log(`[package-task] Executing '${action}' on '${packageName}'...`);
  const taskResult = spawnSync('pnpm', ['exec', 'turbo', 'run', action, `--filter=${filterTarget}`, ...extraArgs], {
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
