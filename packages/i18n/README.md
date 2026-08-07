# `@mission-platform/i18n`

Framework-agnostic internationalization (i18n) wrapper built on top of [i18next](https://www.i18next.com/) for Mission
Platform, with dedicated Vue 3 and React adapters served from the single bare `@mission-platform/i18n`
entry point.

## Features

- **Framework-Neutral Core**: Standardized `createForgeI18N` factory that builds and returns an i18next instance.
- **Hierarchical Namespacing**: Uses `mp.<workspace>` namespace conventions (`forgeNamespace('components')`,
  `forgeNamespace('my-app')`) with fallback and override support.
- **Vue 3 Adapter**: `createForgeI18NVue` plugin and reactive `useI18n` composable built on `i18next-vue`.
- **React Adapter**: `ForgeI18NProvider` context provider and `useI18n` hook built on `react-i18next`.

## Installation

```bash
pnpm add @mission-platform/i18n
```

## Usage

There is one entry point, `@mission-platform/i18n`. The adapter you get is decided by the active
`mp:<framework>` export condition — selected **once** through `resolve.conditions` (see
`defineFrameworkAppConfig` / `frameworkResolveConditions` from `@mission-platform/vite-config`) and
`customConditions` (via the `@mission-platform/typescript-config/framework-<name>` presets). The neutral
core (`createForgeI18N`, `forgeNamespace`, …) is available from the same specifier in every case.

### Framework-Neutral Core

```ts
import { createForgeI18N, forgeNamespace } from '@mission-platform/i18n';

const i18n = createForgeI18N({
  namespace: forgeNamespace('my-app'),
  messages: {
    en: {
      welcome: 'Welcome {name}',
    },
  },
});
```

### Vue 3 (`mp:vue`)

```ts
// main.ts
import { createForgeI18N, createForgeI18NVue } from '@mission-platform/i18n';
import { createApp } from 'vue';

const app = createApp(App);
const i18n = createForgeI18N({
  messages: { en: { hello: 'Hello {name}' } },
});

app.use(createForgeI18NVue(i18n));
```

```vue
<!-- Component.vue -->
<script setup lang="ts">
  import { useI18n } from '@mission-platform/i18n';

  const { t, locale, setLocale } = useI18n();
</script>

<template>
  <div>
    <p>{{ t('hello', { name: 'User' }) }}</p>
    <button @click="setLocale('es')">Spanish</button>
  </div>
</template>
```

### React (`mp:react`)

```tsx
import { createForgeI18N, ForgeI18NProvider, useI18n } from '@mission-platform/i18n';

const i18n = createForgeI18N({
  messages: { en: { hello: 'Hello {name}' } },
});

function Greeting() {
  const { t } = useI18n();
  return <p>{t('hello', { name: 'User' })}</p>;
}

export function App() {
  return (
    <ForgeI18NProvider i18n={i18n}>
      <Greeting />
    </ForgeI18NProvider>
  );
}
```

## Exports

`@mission-platform/i18n` is the only entry point. It always exports the framework-neutral
`createForgeI18N`, `forgeNamespace`, `localeNamespaces`, and `deepMergeLocales`, plus the adapter for the
active condition:

| Condition  | Additional exports              |
| :--------- | :------------------------------ |
| `mp:vue`   | `createForgeI18NVue`, `useI18n` |
| `mp:react` | `ForgeI18NProvider`, `useI18n`  |
| _(none)_   | framework-neutral core only     |

For full namespacing and fallback architecture details, see [docs/index.md](docs/index.md).
