/**
 * Env-driven Storybook framework preset for the Mission Platform write-once
 * ecosystem.
 *
 * A single Storybook app can render the platform's stories on any supported
 * framework: the `STORYBOOK_FRAMEWORK` env var (or the explicit `framework` option)
 * selects the Storybook renderer (`@storybook/vue3-vite`,
 * `@storybook/react-vite`, …) and the matching story glob suffix, while the
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
  // Solid uses the community `storybook-solidjs-vite` framework adapter (SB10
  // compatible): it mounts Solid components properly (wiring `vite-plugin-solid`
  // itself), unlike the generic html renderer which cannot mount Solid and
  // errors with "Expecting an HTML snippet or DOM node from the story".
  solid: 'storybook-solidjs-vite',
  svelte: '@storybook/svelte-vite',
  'web-component': '@storybook/web-components-vite',
};

/** The story-file infix a framework's per-framework stories use, e.g. `foo.vue.stories.tsx`. */
const FRAMEWORK_STORY_INFIX: Record<StorybookFramework, string> = {
  vue: 'vue',
  react: 'react',
  solid: 'solid',
  svelte: 'svelte',
  'web-component': 'web-component',
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
  // Node / config time (`main.ts`): read the `STORYBOOK_FRAMEWORK` env var set by
  // the `storybook:<fw>` scripts (or mirrored in `createStorybookConfig`).
  // `import.meta.env` is undefined here, so this branch must come first.
  if (typeof process !== 'undefined' && process.env && process.env.STORYBOOK_FRAMEWORK) {
    return process.env.STORYBOOK_FRAMEWORK;
  }
  // Browser preview: `process` does not exist. `createStorybookConfig` exposes
  // the framework to the preview as a `STORYBOOK_`-prefixed env var, which Vite
  // inlines into `import.meta.env` (it replaces `import.meta.env` in every
  // module, including this package's `dist`, unlike a custom `define`). The cast
  // is erased at build time so the emitted `dist` keeps the literal
  // `import.meta.env` expression Vite looks for.
  const environment = (import.meta as { env?: Record<string, string | undefined> }).env;
  if (environment && typeof environment.STORYBOOK_FRAMEWORK === 'string') {
    return environment.STORYBOOK_FRAMEWORK;
  }
  return undefined;
}

/** Options for {@link createStorybookConfig}. */
export interface CreateStorybookConfigOptions {
  /** Explicit framework; defaults to the `STORYBOOK_FRAMEWORK` env var, then `vue`. */
  framework?: StorybookFramework;
  /**
   * Package folder names under `packages/` whose stories should be included
   * (e.g. `['components', 'icons']`). The app's own `../src` stories are always
   * included.
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
];

const STORY_EXTENSIONS = '@(js|jsx|mjs|ts|tsx)';

/**
 * Build the story globs for a framework: the app's own stories plus each
 * requested package's stories, matching both the per-framework infix
 * (`*.<framework>.stories.*`) and neutral (`*.stories.*`, no infix) files so
 * write-once neutral stories render on the active framework too.
 */
export function storyGlobs(framework: StorybookFramework, packages: readonly string[], packagesRoot: string): string[] {
  const infix = FRAMEWORK_STORY_INFIX[framework];
  const patternsFor = (base: string): string[] => [
    `${base}/**/*.${infix}.stories.${STORY_EXTENSIONS}`,
    `${base}/**/!(*.vue|*.react|*.solid|*.svelte|*.web-component).stories.${STORY_EXTENSIONS}`,
  ];
  return [
    '../src/**/*.mdx',
    ...patternsFor('../src'),
    ...packages.flatMap((package_) => patternsFor(`${packagesRoot}/packages/${package_}/src`)),
  ];
}

/**
 * Keep only the packages that actually ship a build for the active framework.
 *
 * Every package ships Vue and React builds, but a few (e.g. `wysiwyg`,
 * `breakpoints`) do not yet emit Solid/Svelte/Web-Component builds, so their bare
 * `@mission-platform/<pkg>` import falls through the `mp:<framework>` conditions
 * to the package's neutral/source entry — whose barrel exports only the `Base*`
 * names, not the friendly aliases the neutral stories import — and the preview
 * build fails with `MISSING_EXPORT`. Dropping those packages' stories for the
 * frameworks they don't build lets the non-Vue/React Storybooks build and render
 * the supported subset instead of hard-crashing. Reads `package.json` lazily via
 * a dynamic `node:fs` import so this module stays browser-safe for `preview.ts`.
 */
async function packagesForFramework(
  framework: StorybookFramework,
  packages: readonly string[],
  repoRoot: string,
): Promise<string[]> {
  // Vue and React are shipped by every package — no filtering needed.
  if (framework === 'vue' || framework === 'react') {
    return [...packages];
  }
  const { readFileSync } = await import('node:fs');
  const condition = `mp:${framework}`;
  return packages.filter((package_) => {
    try {
      const manifest = JSON.parse(
        readFileSync(`${repoRoot}/packages/${package_}/package.json`, 'utf8'),
      ) as { exports?: { '.'?: Record<string, unknown> } };
      const entry = manifest.exports?.['.'] ?? {};
      return condition in entry;
    } catch {
      return false;
    }
  });
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

/**
 * Redirect a façade-first package's bare self-import to its neutral façade build
 * (`packages/<pkg>/dist/index.js`) — but ONLY when the importer is itself a built
 * `dist/` artifact (a framework component build re-importing the wasm façade, or
 * one façade package importing a sibling façade). Story/app source is never in
 * `dist/`, so its bare imports still resolve to the framework build via the
 * `mp:<framework>` conditions. This keeps the unified Storybook working for the
 * wasm packages without touching any published package.
 */
function facadeNeutralResolvePlugin(): Plugin {
  // The unified Storybook always runs from `apps/storybook`, so the repo root is
  // two segments up. POSIX string ops avoid a top-level `node:path` import, which
  // would break this barrel's browser-safety (it is re-imported by `preview.ts`).
  const repoRoot = process.cwd().split('/').slice(0, -2).join('/');
  return {
    name: 'mission-platform:facade-neutral-resolve',
    enforce: 'pre',
    resolveId(source: string, importer: string | undefined) {
      if (!importer || !/[/\\]dist[/\\]/.test(importer)) {
        return;
      }
      const match = FACADE_FIRST_PACKAGES.find((package_) => source === `@mission-platform/${package_}`);
      if (!match) {
        return;
      }
      return `${repoRoot}/packages/${match}/dist/index.js`;
    },
  };
}

/** The shared `viteFinal` every Mission Platform Storybook build layers on. */
async function sharedViteFinal(framework: StorybookFramework, config: UserConfig): Promise<UserConfig> {
  // Import the node-only build tooling lazily *inside* this config-time function
  // rather than at module top level. The browser preview imports this package
  // (for `resolveStorybookFramework` and the shared preview config, re-exported
  // below), so any top-level `import ... from 'vite'` / vite plugin would be
  // pulled into the preview's optimized deps and evaluated in the browser —
  // dragging in Vite's bundled Rolldown, whose node internals declare
  // `__vite__injectQuery` a second time and crash the whole preview iframe with
  // `SyntaxError: Identifier '__vite__injectQuery' has already been declared`.
  // Keeping these imports lazy means `sharedViteFinal` still runs at config time
  // in Node while the browser never eagerly loads Vite.
  const [{ mergeConfig }, { ignoreVueI18nBlocksPlugin, frameworkResolveConditions }, { default: i18nPlugin }] =
    await Promise.all([
      import('vite'),
      import('@mission-platform/vite-config'),
      import('@mission-platform/vite-plugin-i18n'),
    ]);

  const plugins: Plugin[] = [facadeNeutralResolvePlugin(), i18nPlugin({ defaultLocale: 'en' }) as Plugin];

  // Every framework needs a JSX transform for the shared neutral `*.stories.tsx`
  // files. Storybook 10's renderer packages (`@storybook/react-vite`, …) no
  // longer bundle the framework's Vite JSX plugin, so without an explicit plugin
  // Vite's core esbuild transforms the story JSX using the stories tsconfig's
  // `jsxImportSource: "vue"` — emitting Vue vnodes for *every* framework. Under
  // the Vue renderer that happens to be correct, but under React/Solid it hands a
  // Vue vnode to the wrong runtime (`Objects are not valid as a React child …
  // __v_isVNode`). Registering the matching JSX transform per framework makes the
  // story JSX compile to the active framework's element factory.
  switch (framework) {
    case 'vue': {
      // The Vue renderer compiles `.vue.stories.tsx` via the Vue JSX transform
      // and needs the `<i18n>` custom-block no-op; other renderers do not.
      const { default: vueJsx } = await import('@vitejs/plugin-vue-jsx');
      plugins.push(vueJsx() as Plugin, ignoreVueI18nBlocksPlugin());
      break;
    }
    case 'react': {
      const { default: react } = await import('@vitejs/plugin-react');
      plugins.push(...(react() as unknown as Plugin[]));
      break;
    }
    // Solid needs no explicit plugin here: the `storybook-solidjs-vite` framework
    // adapter registers `vite-plugin-solid` itself, so the shared neutral
    // `*.stories.tsx` compile through Solid's JSX transform. Adding it again would
    // double-transform the story JSX.
    case 'svelte': {
      // The Svelte renderer ships its decorator/preview harness as `.svelte`
      // components; register `@sveltejs/vite-plugin-svelte` so those (and any
      // `*.svelte.stories.*`) are compiled instead of being handed to the JS
      // parser. Web-Components use the html/lit renderer with no extra transform.
      const { svelte } = await import('@sveltejs/vite-plugin-svelte');
      plugins.push(...(svelte() as unknown as Plugin[]));
      break;
    }
    default: {
      break;
    }
  }

  return mergeConfig(config, {
    plugins,
    // Resolve bare `@mission-platform/*` imports in stories to the build for the
    // active framework via the `mp:<framework>` export conditions (the same
    // mechanism in-repo apps and external consumers use). Without this the
    // preview resolves the framework-agnostic default build, whose barrel only
    // exports the `Base*` names — so a neutral story importing the friendly alias
    // (`Accordion`, `Avatar`, …) fails with `MISSING_EXPORT`.
    resolve: { conditions: frameworkResolveConditions(framework) },
    optimizeDeps: { exclude: ['i18next-vue'] },
    // Emit Monaco's `?worker` entries as ES-module workers so their internal
    // `import` statements resolve.
    worker: { format: 'es' },
    // Inline component CSS into JS chunks so Chromatic's headless browser does
    // not fail to preload lazily-loaded CSS chunks during story extraction.
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

  // The unified Storybook always runs from `apps/storybook`, so the repo root is
  // two segments up from `process.cwd()` (matching `facadeNeutralResolvePlugin`).
  const repoRoot = process.cwd().split('/').slice(0, -2).join('/');

  return {
    // Resolve the story globs lazily so we can drop packages that don't ship a
    // build for the active framework (Storybook allows an async `stories`
    // function). This keeps `packagesForFramework`'s `node:fs` read out of the
    // browser-safe module top level.
    stories: async () =>
      storyGlobs(framework, await packagesForFramework(framework, options.packages, repoRoot), packagesRoot),
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
