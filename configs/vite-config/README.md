# @mission-platform/vite-config

Shared Vite and Vitest configuration helpers for Mission Platform packages and
apps. Provides standard-ised library and app builds (the Vue plugin, the shared
PostCSS pipeline, peer-dependency externals, and an `ignoreVueI18nBlocksPlugin`
that keeps SFC `<i18n>` custom blocks inert) and a Vitest factory preconfigured
for Vue components.

## Exports

| Subpath                                | Helpers                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `@mission-platform/vite-config`        | `defineLibraryConfig`, `defineAppConfig`, `ignoreVueI18nBlocksPlugin`, default externals/globals |
| `@mission-platform/vite-config/vitest` | `defineVitestConfig`                                                                             |

## Library package usage

```ts
// packages/<name>/vite.config.ts
import { defineLibraryConfig } from '@mission-platform/vite-config';

export default defineLibraryConfig({
  rootDir: __dirname,
  entry: { ui: 'src/index.ts' },
  name: 'MissionPlatformUi',
});
```

Pass `external`, `globals`, or `overrides` to extend the defaults without
re-declaring the shared Vue / PostCSS / lib-build boilerplate:

```ts
import { defineLibraryConfig } from '@mission-platform/vite-config';

export default defineLibraryConfig({
  rootDir: __dirname,
  entry: 'src/index.ts',
  name: 'MissionPlatformMap',
  external: ['maplibre-gl'],
  globals: { 'maplibre-gl': 'maplibregl' },
});
```

## App usage

```ts
// apps/<app-name>/vite.config.ts
import { defineAppConfig } from '@mission-platform/vite-config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineAppConfig({
  overrides: {
    plugins: [
      VitePWA({
        /* ... */
      }),
    ],
    worker: { format: 'es' },
  },
});
```

## Vitest usage

```ts
// packages/<name>/vitest.config.ts
import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig();

// Customise:
export default defineVitestConfig({
  include: ['src/**/*.spec.ts'],
  coverageInclude: ['src/**/*.vue', 'src/**/*.ts'],
});
```

## Conventions

- Always supply `rootDir: __dirname` to `defineLibraryConfig` — it resolves
  `entry` paths absolutely.
- Use the `overrides` option instead of copy-pasting the shared boilerplate.
  This guarantees workspaces stay in lock-step with platform defaults.
- The library helper externalises `vue`, `vue-router`, and
  `@mission-platform/i18n` by default; declare any additional peer deps via
  `external`.
- Vue SFC `<i18n>` custom blocks are turned into inert no-op modules by the
  bundled `ignoreVueI18nBlocksPlugin` (they are consumed only by
  `scripts/i18n-extract.ts`; runtime translations load from i18next).
