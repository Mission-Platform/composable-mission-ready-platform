import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
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

  function findNativeEntryNames(directory: string): string[] {
    const entries: string[] = [];
    const visit = (currentDirectory: string): void => {
      for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
        const absolute = path.join(currentDirectory, entry.name);
        if (entry.isDirectory()) {
          if (!lstatSync(absolute).isSymbolicLink()) visit(absolute);
        } else if (
          entry.isFile() &&
          (/^index\.(?:js|mjs|cjs|ts|tsx|d\.ts)$/.test(entry.name) ||
            /^entry(?:[:_]).+\.(?:js|mjs|cjs|ts|tsx)$/.test(entry.name))
        ) {
          entries.push(path.relative(directory, absolute).split(path.sep).join('/'));
        }
      }
    };
    visit(directory);
    const runtimeEntries = entries.filter((entry) => !entry.endsWith('.d.ts'));
    return runtimeEntries.length > 0 ? runtimeEntries : entries;
  }

  function hasNativeJavaScript(directory: string): boolean {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory() && hasNativeJavaScript(absolute)) return true;
      if (entry.isFile() && entry.name.endsWith('.js')) return true;
    }
    return false;
  }

  function normalizeNativePaths(directory: string): void {
    if (options.generatedDirectory === undefined) return;
    const allFiles: string[] = [];
    const visit = (currentDirectory: string): void => {
      for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
        const absolute = path.join(currentDirectory, entry.name);
        if (entry.isDirectory()) visit(absolute);
        else if (entry.isFile()) allFiles.push(path.relative(directory, absolute).split(path.sep).join('/'));
      }
    };
    visit(directory);
    const renames = new Map<string, string>();

    for (const relativeFile of allFiles.filter((file) => file.endsWith('.js'))) {
      const source = readFileSync(path.join(directory, relativeFile), 'utf8');
      const vueScriptModule = relativeFile.match(/^(.*)\.vue\?vue&type=script&setup=true&lang\.js$/);
      if (vueScriptModule !== null) {
        renames.set(relativeFile, `${vueScriptModule[1]}.script.js`);
        continue;
      }
      const region = source.match(/\/\/#region .*?\/((?:components|composables|styles|utils)\/[^\n]+)/)?.[1];
      if (region === undefined) continue;
      const desired = region
        .replace(/\.(?:tsx?|jsx?|vue|svelte)$/, '.js')
        .replace(/\.module\.(?:scss|css)$/, '.module.js');
      if (desired !== relativeFile) renames.set(relativeFile, desired);
      if (/\.module\.(?:scss|css)$/.test(region)) {
        const desiredCss = region.replace(/\.module\.(?:scss|css)$/, '.css');
        for (const importedCss of source.matchAll(/import ["']\.\/([^"']+\.css)["'];/g)) {
          renames.set(path.posix.join(path.posix.dirname(relativeFile), importedCss[1]), desiredCss);
        }
      }
    }

    for (const [oldName, newName] of renames) {
      if (
        oldName === newName ||
        !existsSync(path.join(directory, oldName)) ||
        existsSync(path.join(directory, newName))
      )
        continue;
      mkdirSync(path.dirname(path.join(directory, newName)), { recursive: true });
      renameSync(path.join(directory, oldName), path.join(directory, newName));
    }

    for (const relativeFile of allFiles.filter((file) => file.endsWith('.js'))) {
      const absoluteFile = path.join(directory, renames.get(relativeFile) ?? relativeFile);
      if (!existsSync(absoluteFile)) continue;
      let source = readFileSync(absoluteFile, 'utf8');
      for (const [oldName, newName] of renames) {
        const oldSpecifier = path.posix.relative(path.posix.dirname(relativeFile), oldName);
        const newSpecifier = path.posix.relative(
          path.posix.dirname(renames.get(relativeFile) ?? relativeFile),
          newName,
        );
        source = source.replaceAll(`./${oldSpecifier}`, `./${newSpecifier}`);
      }
      writeFileSync(absoluteFile, source, 'utf8');
    }
  }

  async function finalize(): Promise<void> {
    if (writer === undefined || finalized) return;
    try {
      if (!existsSync(writer.stageDirectory)) {
        writer.recordTree();
        return;
      }
      for (let attempt = 0; attempt < 200 && !hasNativeJavaScript(writer.stageDirectory); attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      normalizeNativePaths(writer.stageDirectory);
      const nativeEntryNames = existsSync(writer.stageDirectory) ? findNativeEntryNames(writer.stageDirectory) : [];
      writer.recordTree(entryNames.length > 0 ? entryNames : nativeEntryNames);
      writer.commit();
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
    closeBundle() {
      if (aborted) {
        return;
      }
      return finalize();
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

/**
 * Connect one target plan to either Vite or Rolldown/tsdown. Generation is
 * deliberately awaited from lifecycle hooks, never while a config is created.
 */
export function forgeBuildLifecyclePlugin(options: ForgeBuildLifecycleOptions): Plugin {
  const virtualEntry = forgeVirtualEntry(options.target.targetId);
  let targetResult: ForgeTargetResult | undefined;
  let watchMode = false;
  let disposed = false;

  const ensureTarget = async (): Promise<ForgeTargetResult> => {
    targetResult ??= await options.session.ensureTarget(options.target);
    return targetResult;
  };
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    if (typeof options.disposeSession === 'function') {
      options.disposeSession();
    } else if (options.disposeSession === true) {
      void options.session.dispose();
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
