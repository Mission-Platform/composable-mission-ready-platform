# `@mission-platform/i18n`

Framework-agnostic internationalization (i18n) wrapper built on top of [i18next](https://www.i18next.com/) for Mission
Platform, with dedicated Vue 3 (`@mission-platform/i18n/vue`) and React (`@mission-platform/i18n/react`) adapters.

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

### Vue 3 (`@mission-platform/i18n/vue`)

```ts
// main.ts
import { createForgeI18N } from '@mission-platform/i18n';
import { createForgeI18NVue } from '@mission-platform/i18n/vue';
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
  import { useI18n } from '@mission-platform/i18n/vue';

  const { t, locale, setLocale } = useI18n();
</script>

<template>
  <div>
    <p>{{ t('hello', { name: 'User' }) }}</p>
    <button @click="setLocale('es')">Spanish</button>
  </div>
</template>
```

### React (`@mission-platform/i18n/react`)

```tsx
import { createForgeI18N } from '@mission-platform/i18n';
import { ForgeI18NProvider, useI18n } from '@mission-platform/i18n/react';

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

## Subpath Exports

- `@mission-platform/i18n`: Framework-neutral entry exporting `createForgeI18N`, `forgeNamespace`, `localeNamespaces`, and
  `deepMergeLocales`.
- `@mission-platform/i18n/vue`: Vue 3 adapter exporting `createForgeI18NVue` and `useI18n`.
- `@mission-platform/i18n/react`: React adapter exporting `ForgeI18NProvider` and `useI18n`.

For full namespacing and fallback architecture details, see [docs/index.md](docs/index.md).
