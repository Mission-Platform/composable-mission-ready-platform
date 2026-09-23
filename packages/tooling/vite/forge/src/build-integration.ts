import { existsSync, lstatSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { validateForgeOutputPlugin, validateForgeOutputPluginSelection } from '@mission-platform/forge-plugin-api';

import { createForgeArtifactWriter, type ForgeArtifactWriter } from './compiler/artifact-writer.js';

import type { ForgeBuildPlan, ForgeBuildSession, ForgeTargetPlan, ForgeTargetResult } from './compiler/session.js';
import type { FrameworkOutputPlugin } from '@mission-platform/forge-plugin-api';
import type { Plugin } from 'vite';

const FORGE_VIRTUAL_ENTRY_PREFIX = '\0@mission-platform/forge/entry:';

/** Stable virtual entry used until the target has been prepared by buildStart. */
export function forgeVirtualEntry(targetId: string): string {
  return `${FORGE_VIRTUAL_ENTRY_PREFIX}${encodeURIComponent(targetId)}`;
}

export interface ForgeArtifactPublishOptions {
  /** The previously successful target output. */
  readonly publishedDirectory: string;
  /** The native bundler output directory for this attempt. */
  readonly attemptDirectory: string;
  /** Generated source root used to restore preserved module paths. */
  readonly generatedDirectory?: string;
  readonly targetId: string;
}

const NATIVE_ENTRY_PATTERN = /^(?:index\.(?:js|mjs|cjs|ts|tsx|d\.ts)|entry(?:[:_]).+\.(?:js|mjs|cjs|ts|tsx))$/;

/** Check if a file name matches standard Forge entry naming conventions. */
function isNativeEntryFile(name: string): boolean {
  return NATIVE_ENTRY_PATTERN.test(name);
}

/** Recurse into a child directory during entry collection when it is not a symlink. */
function collectFromChildDirectory(
  rootDirectory: string,
  currentDirectory: string,
  name: string,
  entries: string[],
): void {
  const absolute = path.join(currentDirectory, name);
  if (!lstatSync(absolute).isSymbolicLink()) {
    collectNativeEntries(rootDirectory, absolute, entries);
  }
}

/** Check if a directory entry is a valid candidate native entry file. */
function isCandidateEntryFile(entry: { isFile(): boolean; name: string }): boolean {
  return entry.isFile() && isNativeEntryFile(entry.name);
}

/** Walk directory tree to find candidate native entry relative paths. */
function collectNativeEntries(rootDirectory: string, currentDirectory: string, entries: string[]): void {
  for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      collectFromChildDirectory(rootDirectory, currentDirectory, entry.name, entries);
    } else if (isCandidateEntryFile(entry)) {
      const absolute = path.join(currentDirectory, entry.name);
      entries.push(path.relative(rootDirectory, absolute).split(path.sep).join('/'));
    }
  }
}

/** Find all candidate native entry file names relative to the directory root. */
function findNativeEntryNames(directory: string): string[] {
  const entries: string[] = [];
  collectNativeEntries(directory, directory, entries);
  const runtimeEntries = entries.filter((entry) => !entry.endsWith('.d.ts'));
  return runtimeEntries.length > 0 ? runtimeEntries : entries;
}

/** Check if a directory entry represents a native JavaScript file. */
function isJavaScriptEntry(entry: { isFile(): boolean; name: string }): boolean {
  return entry.isFile() && entry.name.endsWith('.js');
}

/** Check if a directory entry or its children contain compiled JavaScript. */
function entryHasNativeJavaScript(
  directory: string,
  entry: { isDirectory(): boolean; isFile(): boolean; name: string },
): boolean {
  if (isJavaScriptEntry(entry)) return true;
  if (!entry.isDirectory()) return false;
  return hasNativeJavaScript(path.join(directory, entry.name));
}

/** Recursively check if a directory contains at least one compiled JavaScript file. */
function hasNativeJavaScript(directory: string): boolean {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entryHasNativeJavaScript(directory, entry)) return true;
  }
  return false;
}

/** Wait for native JavaScript artifacts to appear in the staging directory. */
async function waitForNativeJavaScript(stageDirectory: string, maxAttempts = 1500, intervalMs = 20): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (hasNativeJavaScript(stageDirectory)) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return hasNativeJavaScript(stageDirectory);
}

/** Resolve effective entry point names from bundle entries or native files. */
function resolveNativeEntries(stageDirectory: string, entryNames: readonly string[]): string[] {
  if (entryNames.length > 0) return [...entryNames];
  if (!existsSync(stageDirectory)) return [];
  return findNativeEntryNames(stageDirectory);
}

/** Record and commit published artifacts from the stage directory. */
async function commitPublishedArtifacts(
  writer: ForgeArtifactWriter,
  targetId: string,
  entryNames: readonly string[],
): Promise<void> {
  if (!existsSync(writer.stageDirectory)) {
    writer.recordTree();
    return;
  }
  const hasJs = await waitForNativeJavaScript(writer.stageDirectory);
  if (!hasJs) {
    throw new Error(
      `Forge artifact target "${targetId}" produced no native JavaScript artifacts in ${writer.stageDirectory} after build completion.`,
    );
  }
  const resolvedEntries = resolveNativeEntries(writer.stageDirectory, entryNames);
  if (resolvedEntries.length === 0) {
    throw new Error(`Forge artifact target "${targetId}" produced no entry points in ${writer.stageDirectory}.`);
  }
  writer.recordTree(resolvedEntries);
  writer.commit();
}

/**
 * Publish all native output through the same manifest transaction as Forge
 * generated sources. Native bundlers and declaration tools may write freely
 * inside `attemptDirectory`; that directory is never the published target.
 */
export function forgeArtifactPublishPlugin(options: ForgeArtifactPublishOptions): Plugin {
  let writer: ForgeArtifactWriter | undefined;
  let entryNames: string[] = [];
  let finalized = false;
  let aborted = false;

  /** Finalize the artifact publication by committing staged artifacts. */
  async function finalize(): Promise<void> {
    if (writer === undefined || finalized) return;
    try {
      await commitPublishedArtifacts(writer, options.targetId, entryNames);
      finalized = true;
    } catch (error) {
      writer.abort();
      throw error;
    }
  }

  return {
    name: `@mission-platform/vite-plugin-forge:publish-${options.targetId}`,
    enforce: 'post',
    buildStart() {
      writer = createForgeArtifactWriter(options.publishedDirectory, options.targetId, {
        attemptDirectory: options.attemptDirectory,
      });
    },
    generateBundle(_outputOptions, bundle) {
      entryNames = Object.values(bundle)
        .filter((file): file is typeof file & { isEntry: true } => file.type === 'chunk' && file.isEntry)
        .map((file) => file.fileName);
    },
    buildEnd(error) {
      if (error !== undefined) {
        aborted = true;
        writer?.abort();
      }
    },
    async writeBundle() {
      if (aborted) return;
      await finalize();
    },
    async closeBundle() {
      if (aborted) return;
      await finalize();
    },
  };
}

export interface ForgeBuildLifecycleOptions {
  readonly session: ForgeBuildSession;
  readonly plan: ForgeBuildPlan;
  readonly target: ForgeTargetPlan;
  /** The adapter determines only the plugin type; lifecycle behavior is shared. */
  readonly adapter: 'vite' | 'tsdown';
  /** The config that created the session owns its eventual disposal. */
  readonly disposeSession?: boolean | (() => void);
}

/** Suppresses unhandled rejection during asynchronous session disposal. */
function ignoreDisposalRejection(): void {
  // Background fire-and-forget session disposal
}

/**
 * Connect one target plan to either Vite or Rolldown/tsdown. Generation is
 * deliberately awaited from lifecycle hooks, never while a config is created.
 */
export function forgeBuildLifecyclePlugin(options: ForgeBuildLifecycleOptions): Plugin {
  const virtualEntry = forgeVirtualEntry(options.target.targetId);
  let targetResult: ForgeTargetResult | undefined;
  let watchMode = false;
  let disposed = false;

  /** Ensure the target has been prepared and return cached target result. */
  const ensureTarget = async (): Promise<ForgeTargetResult> => {
    targetResult ??= await options.session.ensureTarget(options.target);
    return targetResult;
  };
  /** Dispose of the owned build session unless in watch mode. */
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    if (typeof options.disposeSession === 'function') {
      options.disposeSession();
    } else if (options.disposeSession === true) {
      options.session.dispose().catch(ignoreDisposalRejection);
    }
  };

  return {
    name: `@mission-platform/vite-plugin-forge:build-${options.adapter}-${options.target.targetId}`,
    enforce: 'pre',
    configResolved(config) {
      watchMode = config.command === 'serve' && config.server?.watch !== null;
    },
    async buildStart() {
      await options.session.prepare(options.plan);
      await ensureTarget();
    },
    async resolveId(source) {
      // tsdown may resolve a virtual input relative to root before invoking
      // plugins, leaving the absolute prefix in front of the id.
      if (source !== virtualEntry && !source.endsWith(virtualEntry)) return undefined;
      const result = await ensureTarget();
      return result.entry;
    },
    handleHotUpdate(context) {
      targetResult = undefined;
      options.session.invalidate([context.file]);
      return undefined;
    },
    configureServer(server) {
      server.httpServer?.once('close', dispose);
    },
    closeBundle() {
      if (!watchMode) dispose();
    },
  };
}

/** Validate a caller-owned target and the adapter required by a build helper. */
export function validateForgeBuildPlugin(plugin: FrameworkOutputPlugin, adapter: 'vite' | 'tsdown'): void {
  validateForgeOutputPlugin(plugin);
  if (typeof plugin.build[adapter] !== 'function') {
    throw new TypeError(`Forge output plugin "${plugin.id}" does not provide a ${adapter} build adapter.`);
  }
}

/** Validate all selected targets before environment filtering or native builds. */
export function validateForgeBuildSelection(
  plugins: readonly FrameworkOutputPlugin[],
  adapter: 'vite' | 'tsdown',
): readonly FrameworkOutputPlugin[] {
  const validated = validateForgeOutputPluginSelection(plugins);
  for (const plugin of validated) validateForgeBuildPlugin(plugin, adapter);
  return validated;
}
