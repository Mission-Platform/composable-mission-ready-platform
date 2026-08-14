import { frameworkResolveConditions } from '@mission-platform/vite-config';
import { describe, expect, it } from 'vitest';

import {
  createStorybookConfig,
  resolveStorybookFramework,
  sharedPreviewParameters,
  sharedPreviewParametersFor,
  storyGlobs,
} from './index';

import type { UserConfig } from 'vite';

describe('storybook framework preset', () => {
  it.each(['vue', 'react', 'svelte', 'solid', 'web-component'] as const)('accepts %s', (framework) => {
    expect(resolveStorybookFramework(framework)).toBe(framework);
  });

  it.each([
    ['vue', '@storybook/vue3-vite'],
    ['react', '@storybook/react-vite'],
    ['solid', 'storybook-solidjs-vite'],
    ['svelte', '@storybook/svelte-vite'],
    ['web-component', '@storybook/web-components-vite'],
  ] as const)('selects the %s renderer', (framework, renderer) => {
    expect(createStorybookConfig({ framework, packages: [] }).framework).toBe(renderer);
  });

  it.each(['vue', 'react', 'solid', 'svelte', 'web-component'] as const)(
    'orders %s export conditions first',
    (framework) => {
      expect(frameworkResolveConditions(framework)).toEqual([
        `mp:${framework}`,
        'module',
        'browser',
        'import',
        'default',
      ]);
    },
  );

  it('uses one neutral story inventory for every framework', () => {
    const packages = ['components', 'icons'];
    const expected = storyGlobs('vue', packages, '../..');

    expect(expected).toEqual(storyGlobs('react', packages, '../..'));
    expect(expected).toEqual(storyGlobs('svelte', packages, '../..'));
    expect(expected).toEqual(storyGlobs('solid', packages, '../..'));
    expect(expected).toEqual(storyGlobs('web-component', packages, '../..'));
    expect(expected.every((glob) => !glob.includes('.mdx'))).toBe(true);
    expect(expected.every((glob) => glob.includes('!(*.vue|*.react|*.solid|*.svelte|*.web-component)'))).toBe(true);
  });

  it('configures the Svelte story JSX factory through Vite 8 Oxc', async () => {
    const config = createStorybookConfig({ framework: 'svelte', packages: [] });
    const viteConfig = await config.viteFinal?.({} as UserConfig);
    const oxc = viteConfig?.oxc as
      | {
          jsx?: {
            runtime?: string;
            pragma?: string;
            pragmaFrag?: string;
          };
          jsxInject?: string;
        }
      | undefined;

    expect(oxc?.jsx).toMatchObject({ runtime: 'classic', pragma: 'node', pragmaFrag: 'MpFragment' });
    expect(oxc?.jsxInject).toContain("from '@mission-platform/storybook-framework/slots'");
    expect(viteConfig?.esbuild).toBeUndefined();
  });

  it('forces the React story JSX transform to react/jsx-runtime through Vite 8 Oxc', async () => {
    // Regression: without this override Vite 8's built-in Oxc transform strips
    // `.tsx` syntax using the shared stories tsconfig's `jsxImportSource: 'vue'`
    // *before* `@vitejs/plugin-react`'s Babel step ever sees raw JSX, so every
    // neutral `*.stories.tsx` compiled to a Vue `VNode` under the React
    // renderer and crashed with "Objects are not valid as a React child".
    const config = createStorybookConfig({ framework: 'react', packages: [] });
    const viteConfig = await config.viteFinal?.({} as UserConfig);
    const oxc = viteConfig?.oxc as { jsx?: { runtime?: string; importSource?: string } } | undefined;

    expect(oxc?.jsx).toMatchObject({ runtime: 'automatic', importSource: 'react' });
  });

  it.each(['vue', 'solid'] as const)('does not override the story JSX transform for %s', async (framework) => {
    const config = createStorybookConfig({ framework, packages: [] });
    const viteConfig = await config.viteFinal?.({} as UserConfig);

    expect(viteConfig?.oxc).toBeUndefined();
  });

  it.each(['vue', 'react', 'solid', 'svelte', 'web-component'] as const)(
    'keeps %s as the active export condition in the final config',
    async (framework) => {
      const config = createStorybookConfig({ framework, packages: [] });
      const viteConfig = await config.viteFinal?.({} as UserConfig);

      expect(viteConfig?.resolve?.conditions).toEqual(frameworkResolveConditions(framework));
    },
  );

  it.each(['vue', 'react', 'solid', 'svelte', 'web-component'] as const)(
    'does not leak the Vue JSX plugin into the %s renderer',
    async (framework) => {
      const config = createStorybookConfig({ framework, packages: [] });
      const viteConfig = await config.viteFinal?.({} as UserConfig);
      const pluginNames = (viteConfig?.plugins ?? [])
        .filter((plugin): plugin is { name?: string } => typeof plugin === 'object' && plugin !== null)
        .map((plugin) => plugin.name);

      if (framework === 'vue') {
        expect(pluginNames).toContain('vite:vue-jsx');
      } else {
        expect(pluginNames).not.toContain('vite:vue-jsx');
      }
    },
  );

  it('forces static docs source for Svelte so useArgs stories skip the docs re-render', () => {
    // Regression: @storybook/svelte sourceDecorator calls originalStoryFn inside
    // useEffect; CSF render + useArgs then throws outside the hooks context.
    expect(sharedPreviewParametersFor('svelte')).toMatchObject({
      docs: { source: { type: 'code' } },
    });
  });

  it.each(['vue', 'react', 'solid', 'web-component'] as const)(
    'keeps shared docs parameters unchanged for %s',
    (framework) => {
      expect(sharedPreviewParametersFor(framework)).toEqual(sharedPreviewParameters);
      expect(sharedPreviewParametersFor(framework)).not.toHaveProperty('docs.source');
    },
  );
});
