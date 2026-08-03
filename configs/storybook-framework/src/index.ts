/**
 * Env-driven Storybook framework preset for the Mission Platform write-once
 * ecosystem.
 *
 * A single Storybook app can render the platform's stories on any supported
 * framework: the `FRAMEWORK` env var (or the explicit `framework` option)
 * selects the Storybook renderer (`@storybook/vue3-vite`,
 * `@storybook/react-vite`, …) and the matching story glob suffix, while the
 * shared `viteFinal` wires the common plugins (i18n, Vue JSX for the Vue
 * renderer), ES-module workers (for Monaco) and inlined CSS (so Chromatic can
 * extract stories). This removes the per-framework duplication that previously
 * lived in two separate `apps/storybook` / `apps/storybook-react` configs.
 */
import { ignoreVueI18nBlocksPlugin } from '@mission-platform/vite-config';
import i18nPlugin from '@mission-platform/vite-plugin-i18n';
import { mergeConfig, type Plugin, type UserConfig } from 'vite';

import type { StorybookConfig } from '@storybook/vue3-vite';

/** The frameworks a unified Storybook app can render stories on. */
export type StorybookFramework = 'vue' | 'react' | 'solid' | 'svelte' | 'web-component';

/** Storybook renderer package for each framework. */
const FRAMEWORK_RENDERER: Record<StorybookFramework, string> = {
  vue: '@storybook/vue3-vite',
  react: '@storybook/react-vite',
  // Solid/Svelte/Web-Component renderers are wired as their Storybook framework
  // packages are adopted; they fall back to the html renderer until then.
  solid: '@storybook/html-vite',
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
 * Resolve the active framework from the explicit option or the `FRAMEWORK` env
 * var, defaulting to `vue`. Throws on an unrecognised value so a typo fails
 * fast rather than silently rendering the wrong framework.
 */
export function resolveStorybookFramework(explicit?: StorybookFramework): StorybookFramework {
  const raw = (explicit ?? process.env.FRAMEWORK ?? 'vue').trim();
  if (raw in FRAMEWORK_RENDERER) {
    return raw as StorybookFramework;
  }
  throw new Error(
    `[storybook-framework] Unknown FRAMEWORK "${raw}". Expected one of: ${Object.keys(FRAMEWORK_RENDERER).join(', ')}.`,
  );
}

/** Options for {@link createStorybookConfig}. */
export interface CreateStorybookConfigOptions {
  /** Explicit framework; defaults to the `FRAMEWORK` env var, then `vue`. */
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
  '@storybook/addon-vitest',
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
    ...packages.flatMap((pkg) => patternsFor(`${packagesRoot}/packages/${pkg}/src`)),
  ];
}

/** The shared `viteFinal` every Mission Platform Storybook build layers on. */
async function sharedViteFinal(framework: StorybookFramework, config: UserConfig): Promise<UserConfig> {
  const plugins: Plugin[] = [i18nPlugin({ defaultLocale: 'en' }) as Plugin];

  // The Vue renderer compiles `.vue.stories.tsx` via the Vue JSX transform and
  // needs the `<i18n>` custom-block no-op; other renderers do not.
  if (framework === 'vue') {
    const { default: vueJsx } = await import('@vitejs/plugin-vue-jsx');
    plugins.push(vueJsx() as Plugin, ignoreVueI18nBlocksPlugin());
  }

  return mergeConfig(config, {
    plugins,
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
 * `apps/storybook` consumes this so `FRAMEWORK=vue|react pnpm storybook`
 * renders the same story set on the selected framework.
 */
export function createStorybookConfig(options: CreateStorybookConfigOptions): StorybookConfig {
  const framework = resolveStorybookFramework(options.framework);
  const packagesRoot = options.packagesRoot ?? '../../..';

  return {
    stories: storyGlobs(framework, options.packages, packagesRoot),
    addons: [...SHARED_ADDONS, ...(options.addons ?? [])],
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
