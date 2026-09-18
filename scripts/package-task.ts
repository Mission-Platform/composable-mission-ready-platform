import { spawnSync } from 'node:child_process';
import process from 'node:process';

export interface ParsedPackageTaskArgs {
  readonly action: 'test' | 'build';
  readonly packageName: string;
  readonly extraArgs: readonly string[];
}

export function parsePackageTaskArgs(rawArgs: readonly string[]): ParsedPackageTaskArgs {
  const [actionArg, ...remaining] = rawArgs;
  const action = actionArg === 'build' ? 'build' : actionArg === 'test' ? 'test' : undefined;

  if (!action) {
    console.error('Error: Action must be either "test" or "build".');
    console.error('Usage: pnpm test:package <package-name> [turbo-options]');
    console.error('       pnpm build:package <package-name> [turbo-options]');
    process.exit(1);
  }

  let packageName: string | undefined;
  const extraArgs: string[] = [];

  for (let index = 0; index < remaining.length; index += 1) {
    const argument = remaining[index];
    if (argument === '--filter') {
      const nextArgument = remaining[index + 1];
      if (nextArgument && !nextArgument.startsWith('-')) {
        packageName = nextArgument;
        index += 1;
      }
    } else if (argument.startsWith('--filter=')) {
      packageName = argument.slice('--filter='.length);
    } else if (!packageName && !argument.startsWith('-')) {
      packageName = argument;
    } else {
      extraArgs.push(argument);
    }
  }

  if (!packageName) {
    console.error(`Error: A target package name is required for ${action}:package.`);
    console.error(`Usage: pnpm ${action}:package <package-name> [turbo-options]`);
    console.error(`Example: pnpm ${action}:package @mission-platform/forge-web-script-regex`);
    process.exit(1);
  }

  // Strip trailing glob or filter selectors like '...' or '^...' if provided
  const cleanedPackageName = packageName.replace(/\^?\.\.\.$/, '');

  return {
    action,
    packageName: cleanedPackageName,
    extraArgs,
  };
}

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
    process.exit(primeResult.status ?? 1);
  }

  console.log(`[package-task] Executing '${action}' on '${packageName}'...`);
  const taskResult = spawnSync('pnpm', ['exec', 'turbo', 'run', action, `--filter=${packageName}`, ...extraArgs], {
    stdio: 'inherit',
  });

  if (taskResult.status !== 0) {
    process.exit(taskResult.status ?? 1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('package-task.ts')) {
  runPackageTask();
}
