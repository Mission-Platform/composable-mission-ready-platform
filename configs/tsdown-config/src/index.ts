import fs from 'node:fs';
import path from 'node:path';

import Vue from 'unplugin-vue/rolldown';

import type { DtsOptions, TsdownPlugin, UserConfig } from 'tsdown';

/** Flatten tsdown's recursive `plugins` option into a plain array for merging. */
function flattenPlugins(plugins: UserConfig['plugins']): TsdownPlugin[] {
  if (plugins == undefined || plugins === false) {
    return [];
  }
  if (Array.isArray(plugins)) {
    return plugins.flatMap((entry) => flattenPlugins(entry as UserConfig['plugins']));
  }
  // Promises are resolved by tsdown itself — keep them as opaque plugin slots.
  return [plugins as TsdownPlugin];
}

/**
 * Default package names every shared library should treat as peer-provided.
 * Mirrors `@mission-platform/vite-config`'s {@link DEFAULT_LIBRARY_EXTERNALS}.
 */
export const DEFAULT_LIBRARY_EXTERNALS: readonly string[] = ['vue', 'vue-router', '@mission-platform/i18n'];

/**
 * Read the `dependencies` and `peerDependencies` declared in the package.json
 * located at `rootDirectory`. Used to keep a library's runtime dependencies out
 * of its own bundle so consumers can dedupe and tree-shake them.
 */
export function readPackageDependencyNames(rootDirectory: string): string[] {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.resolve(rootDirectory, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    return [...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.peerDependencies ?? {})];
  } catch {
    return [];
  }
}

/**
 * Build a Rolldown `external` / `deps.neverBundle` predicate that treats every
 * name in `names` (and any of their subpath imports, e.g. `pkg/sub`) as external.
 */
export function createExternalMatcher(names: readonly string[]): (id: string) => boolean {
  const exact = new Set(names);
  return (id: string): boolean => {
    if (exact.has(id)) {
      return true;
    }
    for (const name of exact) {
      if (id.startsWith(`${name}/`)) {
        return true;
      }
    }
    return false;
  };
}

/** Resolve a package-relative entry into absolute path(s) anchored at `rootDir`. */
function resolveEntry(
  rootDirectory: string,
  entry: string | string[] | Record<string, string>,
): string | string[] | Record<string, string> {
  if (typeof entry === 'string') {
    return path.resolve(rootDirectory, entry);
  }
  if (Array.isArray(entry)) {
    return entry.map((item) => path.resolve(rootDirectory, item));
  }
  return Object.fromEntries(Object.entries(entry).map(([key, value]) => [key, path.resolve(rootDirectory, value)]));
}

/** Deep-merge a base tsdown config with caller overrides (shallow for top-level, concat plugins). */
function mergeTsdownConfig(base: UserConfig, overrides?: UserConfig): UserConfig {
  if (!overrides) {
    return base;
  }

  const mergedPlugins = [...flattenPlugins(base.plugins), ...flattenPlugins(overrides.plugins)];

  return {
    ...base,
    ...overrides,
    deps: {
      ...base.deps,
      ...overrides.deps,
    },
    dts: overrides.dts === undefined ? base.dts : overrides.dts,
    hooks: overrides.hooks ?? base.hooks,
    inputOptions:
      typeof overrides.inputOptions === 'function' || typeof base.inputOptions === 'function'
        ? (overrides.inputOptions ?? base.inputOptions)
        : {
            ...(typeof base.inputOptions === 'object' ? base.inputOptions : {}),
            ...(typeof overrides.inputOptions === 'object' ? overrides.inputOptions : {}),
          },
    outputOptions:
      typeof overrides.outputOptions === 'function' || typeof base.outputOptions === 'function'
        ? (overrides.outputOptions ?? base.outputOptions)
        : {
            ...(typeof base.outputOptions === 'object' ? base.outputOptions : {}),
            ...(typeof overrides.outputOptions === 'object' ? overrides.outputOptions : {}),
          },
    plugins: mergedPlugins.length > 0 ? mergedPlugins : undefined,
  };
}

export interface TsdownLibraryOptions {
  /** Absolute path of the consuming workspace (typically `import.meta.dirname`). */
  rootDir: string;
  /** Entry file(s) or name→path map, relative to `rootDir` (or absolute). Defaults to `src/index.ts`. */
  entry?: string | string[] | Record<string, string>;
  /** Extra package names to externalise on top of deps/peerDeps + {@link DEFAULT_LIBRARY_EXTERNALS}. */
  external?: readonly string[];
  /**
   * Emit declaration files. Defaults to `{ build: true }` so solution-style
   * `tsconfig.json` files that only contain `references` still emit `.d.ts`.
   * Set `false` when a custom dts plugin (e.g. forge hook/component dts) owns
   * declaration emit.
   */
  dts?: boolean | DtsOptions;
  /**
   * Path to the TypeScript config used for bundling + dts. Defaults to
   * `tsconfig.build.json` when present (the repo convention), otherwise tsdown's
   * auto-discovery.
   */
  tsconfig?: string | boolean;
  /**
   * Runtime platform. Defaults to `'neutral'` for shared libraries. Use
   * `'node'` for Vite plugins / Node tooling packages that import `node:*`
   * builtins so they are externalised cleanly.
   */
  platform?: 'neutral' | 'node' | 'browser';
  /**
   * Preserve the source module graph (one output file per module). Defaults to
   * `true`, matching the repo's historical `preserveModules: true`.
   */
  unbundle?: boolean;
  /** Output module formats. Defaults to `['esm']`. */
  format?: Array<'esm' | 'cjs'>;
  /** Output directory, relative to `rootDir` or absolute. Defaults to `dist`. */
  outDir?: string;
  /**
   * Whether to clean the output directory before emit. Defaults to `true`.
   * Multi-framework forge packages should set `false` (or a scoped glob) on
   * per-framework configs so sibling framework trees are not wiped.
   */
  clean?: boolean | string[];
  /**
   * Treat the package's own `dependencies` and `peerDependencies` as external.
   * Defaults to `true` when `unbundle` is enabled (library mode).
   */
  autoExternalDeps?: boolean;
  /** Working directory for tsdown (defaults to `rootDir`). */
  cwd?: string;
  /** Alternate source tree used when resolving TypeScript aliases (for generated caches). */
  tsconfigPathsRoot?: string;
  /**
   * Re-link each extracted `.css` asset to the JS module that owns it (see
   * {@link cssBundlePlugin}). Defaults to `true` so co-located component styles
   * load automatically when a component (or the package barrel) is imported —
   * Rolldown emits the stylesheets but does not re-inject their side-effect
   * imports. A no-op for packages that emit no CSS.
   */
  cssBundle?: boolean;
  /** Override or extend the generated config. */
  overrides?: UserConfig;
}

interface WriteBundleOptions {
  dir?: string;
}

/** Recursively collect every `.css` file under `directory` (relative POSIX paths). */
function collectCssFiles(directory: string, base: string = directory): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectCssFiles(absolute, base));
    } else if (entry.isFile() && entry.name.endsWith('.css')) {
      results.push(path.relative(base, absolute).split(path.sep).join('/'));
    }
  }
  return results;
}

/**
 * Resolve the JS module that "owns" an extracted stylesheet `cssRelative`, so a
 * side-effect import can be threaded back into a module that consumers actually
 * pull in.
 *
 * Every forge framework build (react/neutral/solid/svelte/web-components) emits
 * a CSS-Module class map `X.module.js` next to its extracted `X.css`, and every
 * component that uses those classes imports the class map — so the class map is
 * the natural owner (`forge-accordion.css` → `forge-accordion.module.js`, shared
 * `size.css` → `size.module.js`). Vue instead emits SFC-scoped stylesheets named
 * `X.vue_vue_type_style_index_*.css` alongside a plain `X.js` component chunk, so
 * that chunk is the owner. Returns the owner's path relative to the output dir,
 * or `undefined` when no owning chunk exists on disk.
 */
function resolveCssOwner(outputDirectory: string, cssRelative: string): string | undefined {
  const directory = path.posix.dirname(cssRelative);
  const fileName = path.posix.basename(cssRelative, '.css');
  const join = (name: string): string => (directory === '.' ? name : `${directory}/${name}`);

  const vueMarker = '.vue_vue_type_style';
  const candidates: string[] = fileName.includes(vueMarker)
    ? [join(`${fileName.slice(0, fileName.indexOf(vueMarker))}.js`)]
    : [join(`${fileName}.module.js`), join(`${fileName}.js`)];

  return candidates.find((candidate) => fs.existsSync(path.join(outputDirectory, candidate)));
}

/**
 * Re-link each extracted CSS asset to the JS module that owns it.
 *
 * tsdown/Rolldown extracts co-located `*.module.scss` / `*.scss` imports into
 * standalone `.css` assets — with the class-name hashing already applied and the
 * resolved names baked into the sibling class maps — but, unlike Vite, does
 * **not** re-inject the matching `import './x.css'` into the JS chunk (it leaves
 * an `/* empty css *\/` placeholder instead) and writes those assets straight to
 * disk rather than through the Rollup bundle. A consumer importing a component
 * therefore gets its markup without its styles, and Rolldown exposes no
 * `viteMetadata.importedCss` to reconstruct the per-chunk CSS graph.
 *
 * So, in `writeBundle` (after every asset is on disk), this plugin prepends a
 * side-effect `import './x.css'` to each stylesheet's owning module (see
 * {@link resolveCssOwner}) — the CSS-Module class map (or, for Vue, the component
 * chunk) that consumers already import. Because the stylesheet is threaded into a
 * module that is actually used (not a pure re-export barrel that a named import
 * would tree-shake away), importing a single component reliably pulls in exactly
 * that component's styles, and the whole library's styles when the barrel is
 * imported — matching the historical Vite library build's automatic per-component
 * CSS loading. The stylesheets are already hashed once, so downstream bundlers
 * ship them verbatim.
 */
function cssBundlePlugin(): TsdownPlugin {
  const plugin = {
    name: '@mission-platform/tsdown-config:css-relink',
    enforce: 'post',
    writeBundle(this: unknown, options: WriteBundleOptions): void {
      const outputDirectory = options.dir;
      if (outputDirectory === undefined || !fs.existsSync(outputDirectory)) {
        return;
      }

      for (const cssRelative of collectCssFiles(outputDirectory)) {
        const owner = resolveCssOwner(outputDirectory, cssRelative);
        if (owner === undefined) {
          continue;
        }
        const specifier = `./${path.posix.basename(cssRelative)}`;
        const importStatement = `import ${JSON.stringify(specifier)};`;
        const ownerPath = path.join(outputDirectory, owner);
        const code = fs.readFileSync(ownerPath, 'utf8');
        if (code.includes(importStatement)) {
          continue;
        }
        fs.writeFileSync(ownerPath, `${importStatement}\n${code}`);
      }
    },
  };

  return plugin as unknown as TsdownPlugin;
}

/** Resolve the default dts option so project-references packages still emit. */
function resolveDtsOption(dts: boolean | DtsOptions): boolean | DtsOptions {
  if (dts === false) {
    return false;
  }
  if (dts === true) {
    // Most Mission Platform packages use a solution-style root `tsconfig.json`
    // that only lists `references`. `build: true` makes rolldown-plugin-dts run
    // `tsc -b` against those projects (or we point `tsconfig` at tsconfig.build.json).
    return { build: true };
  }
  return { build: true, ...dts };
}

/** Prefer the package's `tsconfig.build.json` when present. */
function resolveTsconfigOption(rootDirectory: string, tsconfig: string | boolean | undefined): string | boolean {
  if (tsconfig !== undefined) {
    return tsconfig;
  }
  const buildConfig = path.resolve(rootDirectory, 'tsconfig.build.json');
  return fs.existsSync(buildConfig) ? buildConfig : true;
}

interface TsconfigAlias {
  pattern: string;
  targets: string[];
}

/** Read the package's path aliases, tolerating the comments used by tsconfig files. */
function readTsconfigAliases(rootDirectory: string, targetRoot: string): TsconfigAlias[] {
  const configFile = [path.join(rootDirectory, 'tsconfig.build.json'), path.join(rootDirectory, 'tsconfig.json')].find(
    (file) => fs.existsSync(file),
  );
  if (configFile === undefined) {
    return [];
  }

  try {
    const source = fs
      .readFileSync(configFile, 'utf8')
      .replaceAll(/\/\/.*$/gmu, '')
      // Do not treat the `/*` wildcard in a JSON path alias such as `@/*` as
      // the start of a block comment.
      .replaceAll(/\/\*(?!["'])[^]*?\*\//gu, '')
      .replaceAll(/,\s*([}\]])/gu, '$1');
    const config = JSON.parse(source) as {
      compilerOptions?: { baseUrl?: string; paths?: Record<string, string[]> };
    };
    const compilerOptions = config.compilerOptions;
    if (compilerOptions?.paths === undefined) {
      return [];
    }

    // Resolve authored aliases here, but only return explicit absolute targets
    // to the tsdown plugin; `baseUrl` is never forwarded to generated config.
    const baseUrl = path.resolve(path.dirname(configFile), compilerOptions.baseUrl ?? '.');
    const sourceRoot = path.resolve(rootDirectory, 'src');
    return Object.entries(compilerOptions.paths).map(([pattern, targets]) => ({
      pattern,
      targets: targets.map((target) => {
        const wildcard = target.indexOf('*');
        const targetPrefix = wildcard === -1 ? target : target.slice(0, wildcard);
        const targetPath = path.resolve(baseUrl, targetPrefix);
        if (targetPath === sourceRoot || targetPath.startsWith(`${sourceRoot}${path.sep}`)) {
          const relativeToSource = path.relative(sourceRoot, targetPath);
          return path.join(targetRoot, relativeToSource, target.slice(targetPrefix.length));
        }
        return path.resolve(baseUrl, target);
      }),
    }));
  } catch {
    return [];
  }
}

/** Resolve TypeScript path aliases, optionally against a generated cache tree. */
function tsconfigPathsPlugin(rootDirectory: string, targetRoot = path.resolve(rootDirectory, 'src')): TsdownPlugin {
  const aliases = readTsconfigAliases(rootDirectory, targetRoot);
  return {
    name: '@mission-platform/tsdown-config:tsconfig-paths',
    resolveId(source) {
      const [specifier, query = ''] = source.split(/(?=[?#])/u);
      for (const alias of aliases) {
        const wildcard = alias.pattern.indexOf('*');
        const suffix = wildcard === -1 ? '' : alias.pattern.slice(wildcard + 1);
        const prefix = wildcard === -1 ? alias.pattern : alias.pattern.slice(0, wildcard);
        if (!specifier.startsWith(prefix) || !specifier.endsWith(suffix)) {
          continue;
        }
        const match = specifier.slice(prefix.length, specifier.length - suffix.length || undefined);
        const candidates = alias.targets.flatMap((target) => {
          const resolvedTarget = target.replace('*', match);
          return [
            `${resolvedTarget}.ts`,
            `${resolvedTarget}.tsx`,
            `${resolvedTarget}.vue`,
            `${resolvedTarget}.svelte`,
            `${resolvedTarget}.css`,
            `${resolvedTarget}.scss`,
            `${resolvedTarget}.module.css`,
            `${resolvedTarget}.module.scss`,
            `${resolvedTarget}/index.ts`,
            `${resolvedTarget}/index.tsx`,
            `${resolvedTarget}/index.vue`,
            `${resolvedTarget}/index.svelte`,
            resolvedTarget,
          ];
        });
        const resolved = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
        return `${resolved ?? candidates[0]}${query}`;
      }
    },
  } as TsdownPlugin;
}

/**
 * Build a tsdown config for a plain TypeScript (or single-bundle) library —
 * Archetype A/B. Mirrors `defineLibraryConfig` externalisation semantics from
 * `@mission-platform/vite-config`.
 */
export function defineTsdownLibrary(options: TsdownLibraryOptions): UserConfig {
  const {
    rootDir,
    entry = 'src/index.ts',
    external = [],
    dts = true,
    unbundle = true,
    format = ['esm'],
    outDir: outDirectory = 'dist',
    clean = true,
    autoExternalDeps = unbundle,
    cwd = rootDir,
    tsconfig,
    tsconfigPathsRoot,
    platform = 'neutral',
    cssBundle = true,
    overrides,
  } = options;

  const externalNames = [
    ...DEFAULT_LIBRARY_EXTERNALS,
    ...external,
    ...(autoExternalDeps ? readPackageDependencyNames(rootDir) : []),
  ];

  const base: UserConfig = {
    cwd,
    entry: resolveEntry(rootDir, entry),
    format,
    platform,
    dts: resolveDtsOption(dts),
    tsconfig: resolveTsconfigOption(rootDir, tsconfig),
    clean,
    // Match the historical Vite/tsc library artifacts (no `.map` files in `dist/`).
    sourcemap: false,
    // Keep `.js`/`.d.ts` even when `platform: 'node'` (tsdown defaults node to
    // `.mjs`/`.d.mts`, which would break every package's existing `exports` map).
    fixedExtension: false,
    outDir: path.isAbsolute(outDirectory) ? outDirectory : path.resolve(rootDir, outDirectory),
    unbundle,
    css: {
      transformer: 'lightningcss',
      splitting: true,
      minify: false,
    },
    // Re-link the extracted per-module stylesheets (which Rolldown emits but does
    // not import back into the JS) to the modules that own them.
    plugins: [tsconfigPathsPlugin(rootDir, tsconfigPathsRoot), ...(cssBundle ? [cssBundlePlugin()] : [])],
    deps: {
      neverBundle: createExternalMatcher(externalNames),
    },
  };

  return mergeTsdownConfig(base, overrides);
}

/**
 * Like {@link defineTsdownLibrary}, but wires `unplugin-vue` and Vue-aware dts
 * for packages that ship `.vue` SFCs (`i18n`, `router`, …).
 */
export function defineTsdownVueLibrary(options: TsdownLibraryOptions): UserConfig {
  const { dts = { vue: true, build: true }, overrides, ...rest } = options;

  return defineTsdownLibrary({
    ...rest,
    dts,
    overrides: mergeTsdownConfig(
      {
        plugins: [Vue({ isProduction: true }) as TsdownPlugin],
      },
      overrides,
    ),
  });
}

export { type UserConfig } from 'tsdown';
