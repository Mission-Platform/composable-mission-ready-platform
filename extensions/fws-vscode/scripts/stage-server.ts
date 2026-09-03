import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

type PackageManifest = {
  name: string;
  version?: string;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  files?: string[];
};

const extensionRoot = path.resolve(import.meta.dirname, '..');
const repositoryRoot = path.resolve(extensionRoot, '../..');
const lspRoot = path.join(repositoryRoot, 'packages/compiler/forge/forge-web-script-lsp');
const dapRoot = path.join(repositoryRoot, 'packages/compiler/forge/forge-web-script-dap');
const outputRoot = path.join(extensionRoot, 'server');
const outputNodeModules = path.join(outputRoot, 'node_modules');

async function readManifest(filePath: string): Promise<PackageManifest> {
  return JSON.parse(await readFile(filePath, 'utf8')) as PackageManifest;
}

/**
 * Resolve a dependency package root the same way Node walks node_modules,
 * following pnpm workspace/package symlinks to their real locations.
 */
function resolvePackageRoot(packageName: string, fromDirectory: string): string {
  let current = fromDirectory;
  while (true) {
    const candidate = path.join(current, 'node_modules', ...packageName.split('/'));
    const manifestPath = path.join(candidate, 'package.json');
    if (existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as PackageManifest;
        if (manifest.name === packageName) {
          return realpathSync(candidate);
        }
      } catch {
        // Ignore unreadable candidates and keep walking.
      }
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  throw new Error(
    `Could not resolve package "${packageName}" from "${fromDirectory}". Ensure workspace dependencies are installed and built.`,
  );
}

function isWorkspacePackage(packageRoot: string): boolean {
  const relative = path.relative(repositoryRoot, packageRoot);
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    return false;
  }
  return !relative.split(path.sep).includes('node_modules');
}

async function stageWorkspacePackage(
  packageRoot: string,
  destination: string,
  manifest: PackageManifest,
): Promise<void> {
  await mkdir(destination, { recursive: true });
  await cp(path.join(packageRoot, 'package.json'), path.join(destination, 'package.json'));

  const publishedEntries = manifest.files ?? ['dist'];
  for (const entry of publishedEntries) {
    const source = path.join(packageRoot, entry);
    if (!existsSync(source)) {
      continue;
    }
    await cp(source, path.join(destination, entry), { recursive: true });
  }

  // Always include dist when present even if `files` is customized oddly.
  const distributionSource = path.join(packageRoot, 'dist');
  const distributionDestination = path.join(destination, 'dist');
  if (existsSync(distributionSource) && !existsSync(distributionDestination)) {
    await cp(distributionSource, distributionDestination, { recursive: true });
  }
}

async function stagePackage(packageName: string, requireFrom: string, visited: Set<string>): Promise<void> {
  if (visited.has(packageName)) {
    return;
  }
  visited.add(packageName);

  const resolvedPackageRoot = resolvePackageRoot(packageName, requireFrom);
  const destination = path.join(outputNodeModules, ...packageName.split('/'));
  const manifest = await readManifest(path.join(resolvedPackageRoot, 'package.json'));

  if (isWorkspacePackage(resolvedPackageRoot)) {
    await stageWorkspacePackage(resolvedPackageRoot, destination, manifest);
  } else {
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(resolvedPackageRoot, destination, { recursive: true, dereference: true });
  }

  const dependencies = {
    ...manifest.dependencies,
    ...manifest.optionalDependencies,
  };
  for (const dependency of Object.keys(dependencies)) {
    await stagePackage(dependency, resolvedPackageRoot, visited);
  }
}

async function main(): Promise<void> {
  for (const [name, root, entrypoint] of [
    ['LSP', lspRoot, path.join(lspRoot, 'dist/main.js')],
    ['DAP', dapRoot, path.join(dapRoot, 'dist/main.js')],
  ] as const) {
    try {
      await readFile(entrypoint);
    } catch {
      throw new Error(
        `The shared ${name} has not been built. Run ` +
          '`pnpm exec turbo run build --filter fws-vscode` from the repository root.',
      );
    }
    await readFile(path.join(root, 'package.json'));
  }

  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputNodeModules, { recursive: true });
  await cp(path.join(lspRoot, 'dist'), path.join(outputRoot, 'dist'), { recursive: true });
  await writeFile(
    path.join(outputRoot, 'package.json'),
    `${JSON.stringify({ private: true, type: 'module' }, undefined, 2)}\n`,
  );

  const dapManifest = await readManifest(path.join(dapRoot, 'package.json'));
  await stageWorkspacePackage(dapRoot, path.join(outputRoot, 'dap'), dapManifest);

  const lspManifest = await readManifest(path.join(lspRoot, 'package.json'));
  const dependencies = Object.keys(lspManifest.dependencies ?? {});
  const dapDependencies = Object.keys(dapManifest.dependencies ?? {});
  const visited = new Set<string>();
  for (const dependency of dependencies) {
    await stagePackage(dependency, lspRoot, visited);
  }
  for (const dependency of dapDependencies) {
    await stagePackage(dependency, dapRoot, visited);
  }
}

await main();
