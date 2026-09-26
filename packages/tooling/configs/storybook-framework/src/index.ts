/**
 * Env-driven Storybook framework preset for the Mission Platform write-once
 * ecosystem.
 *
 * A single Storybook app can render the platform's stories on any supported
 * framework: the `STORYBOOK_FRAMEWORK` env var (or the explicit `framework` option)
 * selects the Storybook renderer (`@storybook/vue3-vite`,
 * `@storybook/react-vite`, …) for the shared neutral story inventory, while the
 * shared `viteFinal` wires the common plugins (i18n, Vue JSX for the Vue
 * renderer), ES-module workers (for Monaco) and inlined CSS (so Chromatic can
 * extract stories). This removes the per-framework duplication that previously
 * lived in two separate `apps/storybook` / `apps/storybook-react` configs.
 */
import type { StorybookConfig } from '@storybook/vue3-vite';
import type { Plugin, UserConfig } from 'vite';

/** The frameworks a unified Storybook app can render stories on. */
export type StorybookFramework = 'vue' | 'react' | 'solid' | 'svelte' | 'web-component';

/** Storybook renderer package for each framework. */
const FRAMEWORK_RENDERER: Record<StorybookFramework, string> = {
  vue: '@storybook/vue3-vite',
  react: '@storybook/react-vite',
  // Solid uses Storybook's generic HTML renderer plus an explicit Solid JSX
  // transform and preview-side DOM mount bridge. This keeps the workspace on a
  // TS7-only dependency graph instead of pulling `@typescript/typescript6`
  // through the community `storybook-solidjs-vite` adapter.
  solid: '@storybook/html-vite',
  svelte: '@storybook/svelte-vite',
  'web-component': '@storybook/web-components-vite',
};

/**
 * Resolve the active framework from the explicit option or the
 * `STORYBOOK_FRAMEWORK` env var, defaulting to `vue`. Throws on an unrecognised
 * value so a typo fails fast rather than silently rendering the wrong framework.
 */
export function resolveStorybookFramework(explicit?: StorybookFramework): StorybookFramework {
  const raw = (explicit ?? readFrameworkEnvironment() ?? 'vue').trim();
  if (raw in FRAMEWORK_RENDERER) {
    return raw as StorybookFramework;
  }
  throw new Error(
    `[storybook-framework] Unknown STORYBOOK_FRAMEWORK "${raw}". Expected one of: ${Object.keys(FRAMEWORK_RENDERER).join(', ')}.`,
  );
}

/**
 * Read the configured framework in a way that is safe in **both** environments
 * this function runs in: Node (config time, e.g. `main.ts`) and the browser
 * preview (`preview.ts` branches on the framework to wire the right runtime).
 */
function readFrameworkEnvironment(): string | undefined {
  if (typeof process !== 'undefined') {
    return process.env?.STORYBOOK_FRAMEWORK;
  }
  const environment = (import.meta as { env?: Record<string, string | undefined> }).env;
  return typeof environment?.STORYBOOK_FRAMEWORK === 'string' ? environment.STORYBOOK_FRAMEWORK : undefined;
}

/** Options for {@link createStorybookConfig}. */
export interface CreateStorybookConfigOptions {
  /** Explicit framework; defaults to the `STORYBOOK_FRAMEWORK` env var, then `vue`. */
  framework?: StorybookFramework;
  /**
   * Package folder names under `packages/` whose neutral stories should be included
   * (e.g. `['components', 'icons']`).
   */
  packages: readonly string[];
  /**
   * Repo-relative depth from the app's `.storybook` dir to the monorepo root.
   * Defaults to `../../..` (an app at `apps/<name>/.storybook`).
   */
  packagesRoot?: string;
  /** Extra addons appended to the shared set. */
  addons?: readonly string[];
  /** Extra Vite config merged after the shared `viteFinal`. */
  viteFinal?: (config: UserConfig) => UserConfig | Promise<UserConfig>;
}

const SHARED_ADDONS: readonly string[] = [
  '@chromatic-com/storybook',
  // NOTE: `@storybook/addon-vitest` is intentionally NOT registered here.
  // Vitest 4 is powered by Rolldown, and the addon contributes a preview
  // annotation that transitively pulls the node-only `rolldown` package into
  // the browser preview's optimized deps. That bundle declares Vite's internal
  // `__vite__injectQuery` helper twice, throwing
  // `SyntaxError: Identifier '__vite__injectQuery' has already been declared`
  // which crashes the whole preview iframe (so no stories render and no CSS is
  // applied). The addon only powers the in-Storybook test runner — which was
  // already failing for the same reason — so it is omitted to keep the
  // interactive Storybook working across every framework.
  '@storybook/addon-a11y',
  '@storybook/addon-themes',
  '@storybook/addon-docs',
  '@storybook/addon-designs',
];

const STORY_EXTENSIONS = '@(js|jsx|mjs|ts|tsx)';

/**
 * Builds glob patterns for neutral stories in a directory.
 */
function patternsFor(base: string): string[] {
  return [`${base}/**/!(*.vue|*.react|*.solid|*.svelte|*.web-component).stories.${STORY_EXTENSIONS}`];
}

/**
 * Build the shared neutral story globs for requested packages.
 * Framework-specific story suffixes are intentionally not selected here: the
 * same write-once story inventory must render in every active workbench.
 */
export function storyGlobs(
  _framework: StorybookFramework,
  packages: readonly string[],
  packagesRoot: string,
): string[] {
  return [
    ...packages.flatMap((package_) => [
      ...patternsFor(`${packagesRoot}/packages/${package_}/src`),
      ...patternsFor(`${packagesRoot}/packages/*/${package_}/src`),
      ...patternsFor(`../../packages/${package_}/src`),
      ...patternsFor(`../../packages/*/${package_}/src`),
    ]),
  ];
}

/**
 * Façade-first packages: their per-framework component build (`dist/<fw>/…`) keeps
 * the framework-agnostic wasm façade EXTERNAL via the bare package name (to avoid
 * re-bundling the wasm into all five builds). Under the write-once
 * `resolve.conditions` the unified Storybook sets, that external self-import would
 * misroute to the component build (which lacks the façade exports), so we redirect
 * it back to the neutral façade build below.
 */
const FACADE_FIRST_PACKAGES: readonly string[] = ['code-scanner', 'barcode', 'qr-code', 'matrix-code'];

const PACKAGE_SUBDIRECTORIES: readonly string[] = [
  'ui',
  'compiler',
  'core',
  'tooling',
  'integrations',
  'content',
  'edge',
];

/**
 * Resolves the directory for a workspace package, checking nested subdirectories if needed.
 */
function resolvePackageRoot(repoRoot: string, packageName: string, exists: (filePath: string) => boolean): string {
  const direct = `${repoRoot}/packages/${packageName}`;
  if (exists(`${direct}/package.json`)) {
    return direct;
  }
  for (const sub of PACKAGE_SUBDIRECTORIES) {
    const candidate = `${repoRoot}/packages/${sub}/${packageName}`;
    if (exists(`${candidate}/package.json`)) {
      return candidate;
    }
  }
  return direct;
}

/**
 * Redirect a façade-first package's bare self-import to its neutral façade build
 * (`packages/<pkg>/dist/index.js`) — but ONLY when the importer is itself a built
 * `dist/` artifact (a framework component build re-importing the wasm façade, or
 * one façade package importing a sibling façade). Story/app source is never in
 * `dist/`, so its bare imports still resolve to the framework build via the
 * `mp:<framework>` conditions. This keeps the unified Storybook working for the
 * wasm packages without touching any published package.
 */
function facadeNeutralResolvePlugin(repoRoot: string, exists: (filePath: string) => boolean): Plugin {
  return {
    name: 'mission-platform:facade-neutral-resolve',
    enforce: 'pre',
    resolveId(source: string, importer: string | undefined) {
      let resolved: string | undefined;
      if (importer && /[/\\]dist[/\\]/.test(importer)) {
        const match = FACADE_FIRST_PACKAGES.find((package_) => source === `@mission-platform/${package_}`);
        if (match) {
          const packageRoot = resolvePackageRoot(repoRoot, match, exists);
          resolved = `${packageRoot}/dist/index.js`;
        }
      }
      return resolved;
    },
  };
}

/**
 * Resolves the primary framework or neutral entry file path within a package root.
 */
function resolvePackageArtifact(
  packageRoot: string,
  target: string,
  exists: (filePath: string) => boolean,
): string | undefined {
  const frameworkEntry = `${packageRoot}/dist/${target}/index.js`;
  if (exists(frameworkEntry)) {
    return frameworkEntry;
  }
  const frameworkFile = `${packageRoot}/dist/${target}.js`;
  if (exists(frameworkFile)) {
    return frameworkFile;
  }
  const neutralEntry = `${packageRoot}/dist/index.js`;
  return exists(neutralEntry) ? neutralEntry : undefined;
}

/**
 * Resolve workspace package roots to the active built artifact when the
 * Storybook/Rolldown resolver does not apply custom `mp:*` conditions to a
 * linked package. Packages without a framework build deliberately fall back
 * to their neutral artifact instead of borrowing another framework's output.
 */
function frameworkPackageResolvePlugin(
  framework: StorybookFramework,
  repoRoot: string,
  exists: (filePath: string) => boolean,
): Plugin {
  const target = framework === 'web-component' ? 'web-components' : framework;
  return {
    name: 'mission-platform:framework-package-resolve',
    enforce: 'pre',
    resolveId(source: string, importer: string | undefined) {
      let resolved: string | undefined;
      const match = /^@mission-platform\/([^/]+)$/.exec(source);
      if (match) {
        const isFacadeSelfImport =
          FACADE_FIRST_PACKAGES.includes(match[1]) && Boolean(importer && /[/\\]dist[/\\]/.test(importer));
        if (!isFacadeSelfImport) {
          const packageRoot = resolvePackageRoot(repoRoot, match[1], exists);
          resolved = resolvePackageArtifact(packageRoot, target, exists);
        }
      }
      return resolved;
    },
  };
}

/**
 * Rolldown/Vite's built-in Oxc JSX transform strips `.tsx` syntax *before* any
 * user Babel plugin's `transform` hook runs, using the nearest tsconfig's
 * `jsxImportSource`. Every neutral `*.stories.tsx` resolves to the shared
 * stories tsconfig (`@vue/tsconfig/tsconfig.dom.json` via
 * `tsconfig.stories.json`), which sets `jsxImportSource: 'vue'` for the Vue
 * Storybook shell's type-check — so without an explicit override Oxc always
 * emits Vue vnodes, and a framework's own Babel JSX plugin (`@vitejs/plugin-react`,
 * …) then has no JSX syntax left to transform. Frameworks whose Storybook
 * preset installs no JSX transform of their own (`svelte`, `web-component`)
 * compile the story JSX through the slot helper's `node()` factory instead;
 * `react` forces Oxc's own automatic runtime to `react/jsx-runtime` so the
 * story compiles to real React elements rather than a leaked Vue `VNode`
 * (`Objects are not valid as a React child … __v_isVNode`).
 */
function storyJsxOxcOverride(
  framework: StorybookFramework,
): { jsx: Record<string, unknown>; jsxInject?: string } | undefined {
  if (framework === 'svelte' || framework === 'web-component') {
    return {
      jsx: { runtime: 'classic', pragma: 'node', pragmaFrag: 'MpFragment' },
      jsxInject: "import { node, Fragment as MpFragment } from '@mission-platform/storybook-framework/slots'",
    };
  }
  if (framework === 'react') {
    return { jsx: { runtime: 'automatic', importSource: 'react' } };
  }
  return undefined;
}

/**
 * The web-components renderer uses `meta.component` for arg-type extraction and
 * requires the registered custom-element tag name, whereas neutral stories
 * quite correctly annotate that field with the framework component export.
 * Adapt only that metadata at Vite transform time; the story's render function
 * and its neutral source contract remain unchanged.
 */
function webComponentStoryMetadataPlugin(): Plugin {
  return {
    name: 'mission-platform:web-component-story-metadata',
    enforce: 'pre',
    transform(code, id) {
      let transformed: { code: string } | undefined;
      const sourceId = id.split('?')[0];
      if (/\.stories\.[cm]?[jt]sx?$/.test(sourceId)) {
        const componentMetadata = /component:\s*([A-Za-z_$][\w$]*)/g;
        if (componentMetadata.test(code)) {
          componentMetadata.lastIndex = 0;
          transformed = {
            code: `import { customElementTag as __mpStoryComponentTag } from '@mission-platform/storybook-framework/slots';\n${code.replace(
              componentMetadata,
              'component: __mpStoryComponentTag($1)',
            )}`,
          };
        }
      }
      return transformed;
    },
  };
}

/**
 * Loads Vue or React plugins.
 */
async function loadVueOrReactPlugins(
  framework: 'vue' | 'react',
  ignoreVueI18nBlocksPlugin: () => Plugin,
): Promise<Plugin[]> {
  if (framework === 'vue') {
    const { default: vueJsx } = await import('@vitejs/plugin-vue-jsx');
    return [vueJsx() as Plugin, ignoreVueI18nBlocksPlugin()];
  }
  const { default: react } = await import('@vitejs/plugin-react');
  return [...(react() as unknown as Plugin[])];
}

/**
 * Loads Solid, Svelte, or Web-Component plugins.
 */
async function loadNonReactPlugins(framework: 'solid' | 'svelte' | 'web-component'): Promise<Plugin[]> {
  if (framework === 'solid') {
    const { default: solid } = await import('vite-plugin-solid');
    return [solid() as unknown as Plugin];
  }
  if (framework === 'svelte') {
    const { svelte } = await import('@sveltejs/vite-plugin-svelte');
    return [svelte() as unknown as Plugin];
  }
  return [webComponentStoryMetadataPlugin()];
}

/**
 * Loads framework-specific Vite transform plugins.
 */
async function loadFrameworkPlugins(
  framework: StorybookFramework,
  ignoreVueI18nBlocksPlugin: () => Plugin,
): Promise<Plugin[]> {
  if (framework === 'vue' || framework === 'react') {
    return await loadVueOrReactPlugins(framework, ignoreVueI18nBlocksPlugin);
  }
  return await loadNonReactPlugins(framework);
}

/** The shared `viteFinal` every Mission Platform Storybook build layers on. */
async function sharedViteFinal(framework: StorybookFramework, config: UserConfig): Promise<UserConfig> {
  const [
    { mergeConfig },
    { ignoreVueI18nBlocksPlugin, frameworkResolveConditions, DEFAULT_CSS_CONFIG },
    { default: i18nPlugin },
    { existsSync },
  ] = await Promise.all([
    import('vite'),
    import('@mission-platform/vite-config'),
    import('@mission-platform/vite-plugin-i18n'),
    import('node:fs'),
  ]);

  const repoRoot = process.cwd().split('/').slice(0, -2).join('/');
  const frameworkPlugins = await loadFrameworkPlugins(framework, ignoreVueI18nBlocksPlugin);
  const plugins: Plugin[] = [
    frameworkPackageResolvePlugin(framework, repoRoot, existsSync),
    facadeNeutralResolvePlugin(repoRoot, existsSync),
    i18nPlugin({ defaultLocale: 'en', localesDir: 'locales' }) as Plugin,
    ...frameworkPlugins,
  ];

  const conditions = frameworkResolveConditions(framework);
  const slotsEntry = `${process.cwd().split('/').slice(0, -2).join('/')}/packages/tooling/configs/storybook-framework/dist/slots.${framework}.js`;

  return mergeConfig(config, {
    css: DEFAULT_CSS_CONFIG,
    plugins,
    ...(storyJsxOxcOverride(framework) ? { oxc: storyJsxOxcOverride(framework) } : {}),
    resolve: {
      alias: { '@mission-platform/storybook-framework/slots': slotsEntry },
      conditions,
      tsconfigPaths: true,
    },
    optimizeDeps: { exclude: ['i18next-vue'] },
    ssr: {
      noExternal: [/^@mission-platform\//],
      resolve: { conditions, externalConditions: conditions },
    },
    worker: { format: 'es' },
    build: { cssCodeSplit: false },
  });
}

/**
 * Build a unified {@link StorybookConfig} for the active framework. One
 * `apps/storybook` consumes this so `STORYBOOK_FRAMEWORK=vue|react pnpm storybook`
 * renders the same story set on the selected framework.
 */
export function createStorybookConfig(options: CreateStorybookConfigOptions): StorybookConfig {
  const framework = resolveStorybookFramework(options.framework);
  const packagesRoot = options.packagesRoot ?? '../../..';

  // Mirror the resolved framework onto a `STORYBOOK_`-prefixed env var. Storybook
  // exposes `STORYBOOK_*` env vars to the browser preview via `import.meta.env`,
  // which is how `resolveStorybookFramework()` (called from `preview.ts`) learns
  // the active framework at render time without access to `process`.
  process.env.STORYBOOK_FRAMEWORK = framework;

  return {
    // Keep the neutral and framework-specific story inventory identical in every
    // mode. Missing package artifacts are export-validation failures, not a
    // reason to silently hide stories from a framework's workbench.
    stories: storyGlobs(framework, options.packages, packagesRoot),
    addons: [...SHARED_ADDONS, ...(options.addons ?? [])],
    env: (config: Record<string, string>) => ({ ...config, STORYBOOK_FRAMEWORK: framework }),
    features: {
      developmentModeForBuild: false,
      sidebarOnboardingChecklist: false,
    },
    framework: FRAMEWORK_RENDERER[framework] as StorybookConfig['framework'],
    core: {
      disableTelemetry: true,
      enableCrashReports: false,
    },
    viteFinal: async (config) => {
      const shared = await sharedViteFinal(framework, config);
      return options.viteFinal ? options.viteFinal(shared) : shared;
    },
  };
}

export * from './preview.js';
export type { Meta, StoryObj } from './types.js';
export type { StorybookConfig } from '@storybook/vue3-vite';
