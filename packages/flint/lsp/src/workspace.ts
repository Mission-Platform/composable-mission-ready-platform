import { watch as watchFileSystem } from 'node:fs';
import { readdir, readFile, realpath } from 'node:fs/promises';
import nodePath from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type {
  FlintDisposable,
  FlintWorkspaceChange,
  FlintWorkspaceHost,
  FlintWorkspaceOptions,
} from '@mission-platform/flint-language-service';

export interface FlintNodeFileSystem {
  readFile(path: string): Promise<string | undefined>;
  listFiles(root: string): Promise<readonly string[]>;
  realpath(path: string): Promise<string>;
  watch(root: string, listener: (path: string) => void): FlintDisposable;
}

export interface FlintNodeWorkspaceOptions extends FlintWorkspaceOptions {
  readonly roots: readonly string[];
  readonly optionsForUri?: (uri: string) => FlintWorkspaceOptions | Promise<FlintWorkspaceOptions>;
  readonly fileSystem?: FlintNodeFileSystem;
}

const emptyDisposable: FlintDisposable = { dispose: () => false };
const excludedDirectoryNames = new Set([
  '.artifacts',
  '.cache',
  '.git',
  '.hg',
  '.output',
  '.turbo',
  '.vite',
  '.wrangler',
  '.svn',
  'coverage',
  'dist',
  'node_modules',
  'target',
]);

const defaultFileSystem: FlintNodeFileSystem = {
  async readFile(path) {
    try {
      return await readFile(path, 'utf8');
    } catch (error) {
      if (isFileNotFound(error)) return void 0;
      throw error;
    }
  },
  async listFiles(root) {
    const files: string[] = [];
    await collectFiles(root, files);
    return files;
  },
  realpath,
  watch(root, listener) {
    try {
      const watcher = watchFileSystem(root, { recursive: true }, (_event, name) => {
        if (name !== null) listener(nodePath.resolve(root, name.toString()));
      });
      return { dispose: () => watcher.close() };
    } catch {
      return emptyDisposable;
    }
  },
};

export class RootBoundedFlintWorkspaceHost implements FlintWorkspaceHost {
  readonly #roots: readonly string[];
  readonly #options: FlintNodeWorkspaceOptions;
  readonly #fileSystem: FlintNodeFileSystem;

  public constructor(options: FlintNodeWorkspaceOptions) {
    this.#roots = options.roots.map((root) => canonicalPath(toFilePath(root)));
    this.#options = options;
    this.#fileSystem = options.fileSystem ?? defaultFileSystem;
  }

  public async readFile(uri: string): Promise<string | undefined> {
    const path = await this.#safePath(uri, true);
    return path === undefined ? undefined : this.#fileSystem.readFile(path);
  }

  public async listFiles(): Promise<readonly string[]> {
    const files = await Promise.all(this.#roots.map((root) => this.#fileSystem.listFiles(root)));
    return files
      .flat()
      .filter((path) => this.#isInside(path) && isRelevantSourcePath(path))
      .map((path) => pathToFileURL(path).href);
  }

  public async getOptions(uri: string): Promise<FlintWorkspaceOptions> {
    if ((await this.#safePath(uri, false)) === undefined) return {};
    const workspaceOptions: FlintWorkspaceOptions = {
      requestedCapabilities: this.#options.requestedCapabilities,
      requireExports: this.#options.requireExports,
      capabilitySignatures: this.#options.capabilitySignatures,
      capabilityNames: this.#options.capabilityNames,
      selfHostedVmMode: this.#options.selfHostedVmMode,
      selfHostedRunner: this.#options.selfHostedRunner,
    };
    return this.#options.optionsForUri?.(uri) ?? workspaceOptions;
  }

  public watch(listener: (change: FlintWorkspaceChange) => void): FlintDisposable {
    const disposables = this.#roots.map((root) =>
      this.#fileSystem.watch(root, (path) => {
        if (this.#isInside(path) && isRelevantSourcePath(path))
          listener({ uri: pathToFileURL(path).href, kind: 'changed' });
      }),
    );
    return {
      dispose: () => {
        for (const disposable of disposables) disposable.dispose();
      },
    };
  }

  async #safePath(uri: string, resolveSymlink: boolean): Promise<string | undefined> {
    let path: string;
    try {
      path = toFilePath(uri);
    } catch {
      return undefined;
    }
    const candidate = nodePath.resolve(path);
    if (!this.#isInside(candidate)) return undefined;
    if (!resolveSymlink) return candidate;
    try {
      const resolvedPath = await this.#fileSystem.realpath(candidate);
      return this.#isInside(resolvedPath) ? resolvedPath : undefined;
    } catch (error) {
      return isFileNotFound(error) ? candidate : undefined;
    }
  }

  #isInside(path: string): boolean {
    const candidate = canonicalPath(path);
    return this.#roots.some(
      (root) => candidate === root || !nodePath.relative(root, candidate).startsWith(`..${pathSeparator}`),
    );
  }
}

export function createFlintNodeWorkspaceHost(options: FlintNodeWorkspaceOptions): RootBoundedFlintWorkspaceHost {
  return new RootBoundedFlintWorkspaceHost(options);
}

function toFilePath(value: string): string {
  if (!value.startsWith('file:') && !nodePath.isAbsolute(value) && /^[a-z][a-z\d+.-]*:/iu.test(value))
    throw new Error(`Unsupported workspace URI: ${value}`);
  return value.startsWith('file:')
    ? fileURLToPath(value)
    : nodePath.isAbsolute(value)
      ? value
      : nodePath.resolve(value);
}

function canonicalPath(path: string): string {
  return nodePath.resolve(path);
}

function isRelevantSourcePath(path: string): boolean {
  const normalizedPath = path.replaceAll('\\', '/');
  return (
    normalizedPath.endsWith('.flint') &&
    !normalizedPath.split('/').some((segment) => excludedDirectoryNames.has(segment))
  );
}

async function collectFiles(root: string, files: string[]): Promise<void> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        if (entry.isDirectory() && excludedDirectoryNames.has(entry.name)) return;
        const path = nodePath.resolve(root, entry.name);
        if (entry.isDirectory()) await collectFiles(path, files);
        else if (entry.isFile() && entry.name.endsWith('.flint')) files.push(path);
      }),
    );
  } catch (error) {
    if (!isFileNotFound(error)) throw error;
  }
}

function isFileNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === 'ENOENT' || error.code === 'EACCES')
  );
}

const pathSeparator = process.platform === 'win32' ? '\\' : '/';
