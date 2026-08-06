import { cloudflare } from '@cloudflare/vite-plugin';
import { frameworkCondition } from '@mission-platform/vite-config';
import i18nPlugin from '@mission-platform/vite-plugin-i18n';
import { tokenOverridesPlugin } from '@mission-platform/vite-plugin-token-overrides';
import { redwood } from 'rwsdk/vite';
import { defineConfig } from 'vite';

import type { Plugin } from 'vite';

const ssrMonacoId = '\0service-monitor:ssr-monaco';
const styleSsrId = /^(?:\/@id\/)?virtual:rwsdk:ssr:.*\.(?:css|scss|sass|less|styl)(?:\?.*)?$/;
const syntheticStyleSsrId = /^(?:\/@id\/)?virtual:rwsdk:ssr:.*\.(?:css|scss|sass|less|styl)\.js(?:\?.*)?$/;

// This app targets React and is built by RedwoodSDK as several isolated Vite
// environments (client, ssr, worker). A single top-level `resolve.conditions`
// does not propagate into those child environments, so inject the framework's
// `mp:react` export condition into every environment individually — prepended,
// so it *merges* with (rather than replaces) the Cloudflare/worker conditions.
// This makes bare `@mission-platform/<pkg>` imports resolve to each package's
// React build across the client, SSR and worker builds alike.
function frameworkConditionsPlugin(): Plugin {
  const condition = frameworkCondition('react');
  return {
    name: 'service-monitor:framework-conditions',
    configEnvironment(_name, options) {
      const resolve = (options.resolve ??= {});
      const existing = resolve.conditions ?? [];
      if (!existing.includes(condition)) {
        resolve.conditions = [condition, ...existing];
      }
    },
  };
}

function excludeMonacoFromSsr(): Plugin {
  return {
    name: 'service-monitor:ssr-monaco',
    enforce: 'pre',
    resolveId(source, _importer, options) {
      if (options.ssr && source === 'monaco-editor') return ssrMonacoId;
    },
    load(id) {
      if (id === ssrMonacoId) return 'export {};';
    },
  };
}

function supportStyleSsrModules(plugin: Plugin): Plugin {
  if (
    plugin.name !== 'rwsdk:ssr-bridge' ||
    typeof plugin.resolveId !== 'function' ||
    typeof plugin.load !== 'function'
  ) {
    return plugin;
  }

  const resolveId = plugin.resolveId;
  const load = plugin.load;

  return {
    ...plugin,
    async resolveId(source, importer, options) {
      const result = await resolveId.call(this, source, importer, options);
      if (typeof result === 'string' && styleSsrId.test(result) && !result.endsWith('.js')) {
        return `${result}.js`;
      }
      if (result !== null && typeof result === 'object' && styleSsrId.test(result.id) && !result.id.endsWith('.js')) {
        return { ...result, id: `${result.id}.js` };
      }
      return result;
    },
    load(id, options) {
      if (syntheticStyleSsrId.test(id)) {
        const targetId = id.replace(/\.js(\?.*)?$/, '$1');
        return load.call(this, targetId, options);
      }
      return load.call(this, id, options);
    },
  };
}

// RedwoodSDK server/client app.
// - `cloudflare()` wires the Worker runtime (Durable Objects, bindings) into Vite.
// - `redwood()` adds SSR, React Server Components and Server Functions.
// React is handled by the redwood plugin, so no separate React plugin is required.
export default defineConfig(async ({ mode }) => ({
  optimizeDeps: {
    include: ['ajv', 'ajv-formats', 'd3', 'd3-selection', 'i18next', 'react-i18next', 'react', 'react-dom', 'rxjs'],
  },
  ssr: {
    optimizeDeps: {
      include: ['ajv', 'ajv-formats', 'd3', 'd3-selection', 'i18next', 'react-i18next', 'react', 'react-dom', 'rxjs'],
    },
    noExternal: [/^d3-/, 'd3', 'react-i18next', 'i18next', '@mission-platform/*'],
  },
  plugins:
    mode === 'test'
      ? []
      : [
          frameworkConditionsPlugin(),
          i18nPlugin({ defaultLocale: 'en', localesDir: 'locales' }),
          tokenOverridesPlugin({ source: 'design-tokens/overrides.tokens.json' }),
          excludeMonacoFromSsr(),
          cloudflare({
            viteEnvironment: { name: 'worker' },
          }),
          ...((await redwood()) as Plugin[]).map((plugin) => supportStyleSsrModules(plugin)),
        ],
}));
