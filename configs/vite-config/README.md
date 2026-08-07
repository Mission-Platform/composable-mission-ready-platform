# @mission-platform/vite-config

Shared Vite and Vitest configuration helpers for Mission Platform packages and
apps. Provides standard-ised library and app builds (the Vue plugin, the shared
PostCSS pipeline, peer-dependency externals, and an `ignoreVueI18nBlocksPlugin`
that keeps SFC `<i18n>` custom blocks inert) and a Vitest factory preconfigured
for Vue components.

## Exports

| Subpath                                | Helpers                                                                                                                                                                          |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@mission-platform/vite-config`        | `defineLibraryConfig`, `defineAppConfig`, `defineFrameworkAppConfig`, `frameworkResolveConditions`, `frameworkCondition`, `ignoreVueI18nBlocksPlugin`, default externals/globals |
| `@mission-platform/vite-config/vitest` | `defineVitestConfig`                                                                                                                                                             |

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
    plugins: [VitePWA({/* ... */})],
    worker: { format: 'es' },
  },
});
```

## Framework auto-resolution

Every framework-shipping `@mission-platform/*` package declares custom export
conditions (`mp:vue`, `mp:react`, `mp:solid`, `mp:web-component`)
on its bare `.` entry that point at the matching built artifact. An app selects
**one** framework and then imports packages with **no** framework subpath:

```ts
// apps/<app-name>/vite.config.ts
import { defineFrameworkAppConfig } from '@mission-platform/vite-config';

export default defineFrameworkAppConfig({
  framework: 'react', // 'vue' | 'react' | 'solid' | 'web-component'
});
```

```ts
// Anywhere in the app — resolves to the React build automatically:
import { ForgeButton } from '@mission-platform/components';
```

Pair it with the matching TypeScript preset so the editor/LSP resolves the same
build (see `@mission-platform/typescript-config/framework-<name>`).

### External projects (no shared config)

Projects outside this monorepo do not need the helper — set the same ordered
`resolve.conditions` directly in Vite, and `customConditions` in tsconfig:

```ts
// vite.config.ts
export default {
  resolve: {
    // mirrors frameworkResolveConditions('vue')
    conditions: ['mp:vue', 'module', 'browser', 'import', 'default'],
  },
};
```

```jsonc
// tsconfig.json (requires "moduleResolution": "bundler" | "node16" | "nodenext")
{
  "compilerOptions": { "customConditions": ["mp:vue"] },
}
```

Bundlers or tools that ignore custom conditions fall back to the explicit
`@mission-platform/<pkg>/<framework>` subpath exports, which remain available.

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
