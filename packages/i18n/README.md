# `@mission-platform/i18n`

Framework-agnostic internationalization (i18n) wrapper built on top of [i18next](https://www.i18next.com/) for Mission Platform, with dedicated Vue 3 (`@mission-platform/i18n/vue`) and React (`@mission-platform/i18n/react`) adapters.

## Features

- **Framework-Neutral Core**: Standardized `createMpI18n` factory that builds and returns an i18next instance.
- **Hierarchical Namespacing**: Uses `mp.<workspace>` namespace conventions (`mpNamespace('components')`, `mpNamespace('my-app')`) with fallback and override support.
- **Vue 3 Adapter**: `createMpI18nVue` plugin and reactive `useI18n` composable built on `i18next-vue`.
- **React Adapter**: `MpI18nProvider` context provider and `useI18n` hook built on `react-i18next`.

## Installation

```bash
pnpm add @mission-platform/i18n
```

## Usage

### Framework-Neutral Core

```ts
import { createMpI18n, mpNamespace } from '@mission-platform/i18n';

const i18n = createMpI18n({
  namespace: mpNamespace('my-app'),
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
import { createMpI18n } from '@mission-platform/i18n';
import { createMpI18nVue } from '@mission-platform/i18n/vue';
import { createApp } from 'vue';

const app = createApp(App);
const i18n = createMpI18n({
  messages: { en: { hello: 'Hello {name}' } },
});

app.use(createMpI18nVue(i18n));
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
import { createMpI18n } from '@mission-platform/i18n';
import { MpI18nProvider, useI18n } from '@mission-platform/i18n/react';

const i18n = createMpI18n({
  messages: { en: { hello: 'Hello {name}' } },
});

function Greeting() {
  const { t } = useI18n();
  return <p>{t('hello', { name: 'User' })}</p>;
}

export function App() {
  return (
    <MpI18nProvider i18n={i18n}>
      <Greeting />
    </MpI18nProvider>
  );
}
```

## Subpath Exports

- `@mission-platform/i18n`: Framework-neutral entry exporting `createMpI18n`, `mpNamespace`, `localeNamespaces`, and `deepMergeLocales`.
- `@mission-platform/i18n/vue`: Vue 3 adapter exporting `createMpI18nVue` and `useI18n`.
- `@mission-platform/i18n/react`: React adapter exporting `MpI18nProvider` and `useI18n`.

For full namespacing and fallback architecture details, see [docs/index.md](docs/index.md).
