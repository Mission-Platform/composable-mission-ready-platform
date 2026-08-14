import { afterEach, describe, expect, it, vi } from 'vitest';

import type { UserConfig } from 'vite';

vi.mock('@storybook/addon-vitest/vitest-plugin', () => ({
  storybookTest: () => ({ name: 'mock-storybook-test' }),
}));
vi.mock('@vitest/browser-playwright', () => ({
  playwright: () => ({ name: 'mock-playwright' }),
}));

const previousFramework = process.env.STORYBOOK_FRAMEWORK;

function pluginNames(config: UserConfig): string[] {
  return (config.plugins ?? []).flatMap((plugin) => {
    if (typeof plugin !== 'object' || plugin === null || Array.isArray(plugin) || !('name' in plugin)) {
      return [];
    }
    return typeof plugin.name === 'string' ? [plugin.name] : [];
  });
}

afterEach(() => {
  if (previousFramework === undefined) {
    delete process.env.STORYBOOK_FRAMEWORK;
  } else {
    process.env.STORYBOOK_FRAMEWORK = previousFramework;
  }
});

async function loadConfig(framework: string): Promise<UserConfig> {
  process.env.STORYBOOK_FRAMEWORK = framework;
  vi.resetModules();
  const module = await import('../vite.config');
  return module.default;
}

describe('Storybook Vite shell', () => {
  it.each(['react', 'solid', 'svelte', 'web-component'] as const)(
    'keeps Vue JSX out of the %s shell while selecting its export condition',
    async (framework) => {
      const config = await loadConfig(framework);

      expect(config.resolve?.conditions?.[0]).toBe(`mp:${framework}`);
      expect(pluginNames(config)).not.toContain('vite:vue-jsx');
    },
  );

  it('keeps Vue JSX in the Vue shell', async () => {
    const config = await loadConfig('vue');

    expect(config.resolve?.conditions?.[0]).toBe('mp:vue');
    expect(pluginNames(config)).toContain('vite:vue-jsx');
  });
});
