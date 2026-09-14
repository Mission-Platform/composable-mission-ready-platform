#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { validateApps, validateAppsForFullRun } from './app-sweep.ts';
import { discoverInventory } from './inventory.ts';
import {
  writeManifest,
  createManifest,
  serializeManifest,
  summarizeFailureGroups,
  summarizeResults,
} from './manifest.ts';
import { createValidationManifest, type ValidationSelection } from './runner.ts';
import { validateStorybookFramework } from './storybook-sweep.ts';
import {
  STORYBOOK_FRAMEWORKS,
  type RepositoryInventory,
  type RuntimeManifest,
  type StorybookFramework,
} from './types.ts';

function repositoryRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
}

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function hasOption(args: string[], name: string): boolean {
  return args.includes(name);
}

function selection(args: string[], command: string): ValidationSelection {
  const framework = option(args, '--framework');
  if (framework && !STORYBOOK_FRAMEWORKS.includes(framework as StorybookFramework))
    throw new Error(`Unknown framework: ${framework}`);
  return {
    framework: framework as StorybookFramework | undefined,
    app: option(args, '--app'),
    packageName: option(args, '--package'),
    storyId: option(args, '--story'),
    includeStories: command !== 'app',
    includeApps: (command !== 'framework' && command !== 'target') || Boolean(option(args, '--app')),
  };
}

function printInventory(inventory: ReturnType<typeof discoverInventory>): void {
  console.log(
    `Inventory: ${inventory.workspacePackages.length} workspaces, ${inventory.packages.length} packages, ${inventory.apps.length} apps, ${inventory.stories.length} stories`,
  );
  console.log(`Storybook packages: ${inventory.storybookPackages.join(', ') || 'none'}`);
  for (const app of inventory.apps) console.log(`  ${app.name}: ${app.routes.length} routes`);
}

async function storybookManifest(
  root: string,
  inventory: RepositoryInventory,
  args: string[],
  command: string,
): Promise<RuntimeManifest> {
  const selectedFramework = option(args, '--framework') as StorybookFramework | undefined;
  const frameworks = selectedFramework ? [selectedFramework] : [...STORYBOOK_FRAMEWORKS];
  if (frameworks.length > 1 && hasOption(args, '--no-build'))
    throw new Error('The --no-build option requires --framework because Storybook static output is renderer-specific.');
  const results = [];
  for (const [index, framework] of frameworks.entries()) {
    const frameworkResults = await validateStorybookFramework(root, inventory, {
      framework,
      packageName: option(args, '--package'),
      storyId: option(args, '--story'),
      port: option(args, '--port') ? Number(option(args, '--port')) + index : undefined,
      browser: !hasOption(args, '--no-browser'),
      build: !hasOption(args, '--no-build'),
      maxStories: option(args, '--max-stories') ? Number(option(args, '--max-stories')) : undefined,
      workers: option(args, '--workers') ? Number(option(args, '--workers')) : undefined,
      timeoutMs: option(args, '--timeout-ms') ? Number(option(args, '--timeout-ms')) : undefined,
    });
    results.push(...frameworkResults);
    writeManifest(
      root,
      createManifest(inventory, frameworkResults),
      path.join(root, '.artifacts/runtime-validation', `runtime-validation-${framework}.json`),
    );
  }
  if (command === 'full') {
    const port = option(args, '--port');
    results.push(
      ...(await validateAppsForFullRun(root, inventory, {
        app: option(args, '--app'),
        port: port ? Number(port) + frameworks.length : undefined,
        browser: !hasOption(args, '--no-browser'),
        build: !hasOption(args, '--no-build'),
        timeoutMs: option(args, '--timeout-ms') ? Number(option(args, '--timeout-ms')) : undefined,
      })),
    );
  }
  return createManifest(inventory, results);
}

async function appManifest(root: string, inventory: RepositoryInventory, args: string[]): Promise<RuntimeManifest> {
  const results = await validateApps(root, inventory, {
    app: option(args, '--app'),
    route: option(args, '--route'),
    port: option(args, '--port') ? Number(option(args, '--port')) : undefined,
    browser: !hasOption(args, '--no-browser'),
    build: !hasOption(args, '--no-build'),
    timeoutMs: option(args, '--timeout-ms') ? Number(option(args, '--timeout-ms')) : undefined,
  });
  return createManifest(inventory, results);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] ?? 'inventory';
  const root = repositoryRoot();
  const inventory = discoverInventory(root);
  const json = args.includes('--json');
  if (command === 'inventory') {
    const output = option(args, '--output');
    const manifest = createManifest(inventory);
    const target = writeManifest(root, manifest, output ? path.resolve(root, output) : undefined);
    if (json) process.stdout.write(serializeManifest(manifest));
    else {
      printInventory(inventory);
      console.log(`Manifest: ${target}`);
    }
    return;
  }
  if (!['framework', 'app', 'target', 'full'].includes(command))
    throw new Error(`Unknown validation command: ${command}`);
  const manifest =
    command === 'app' || (command === 'target' && option(args, '--app') && !option(args, '--framework'))
      ? await appManifest(root, inventory, args)
      : command === 'framework' || command === 'full' || (command === 'target' && option(args, '--framework'))
        ? await storybookManifest(root, inventory, args, command)
        : createValidationManifest(inventory, selection(args, command));
  const output = writeManifest(
    root,
    manifest,
    option(args, '--output') ? path.resolve(root, option(args, '--output') as string) : undefined,
  );
  if (json) process.stdout.write(serializeManifest(manifest));
  else {
    console.log(`Manifest: ${output}`);
    console.log(`Results: ${summarizeResults(manifest.results)}`);
    const failureGroups = summarizeFailureGroups(manifest.results);
    if (failureGroups) console.log(`Failure groups:\n${failureGroups}`);
  }
  if (
    manifest.results.some((result) =>
      ['compile-failure', 'runtime-failure', 'interaction-failure', 'blocked'].includes(result.status),
    )
  )
    process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
