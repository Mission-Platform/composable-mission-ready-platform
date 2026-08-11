import { describe, expect, it } from 'vitest';

import { createStorybookConfig, resolveStorybookFramework, storyGlobs } from './index';

import type { UserConfig } from 'vite';

describe('storybook framework preset', () => {
  it.each(['vue', 'react', 'svelte', 'solid', 'web-component'] as const)('accepts %s', (framework) => {
    expect(resolveStorybookFramework(framework)).toBe(framework);
  });

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
});
