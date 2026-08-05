# @mission-platform/i18n

`@mission-platform/i18n` is a framework-agnostic internationalization (i18n) wrapper built
on [i18next](https://www.i18next.com/). It provides a unified way to handle translations across the Mission Platform,
with dedicated adapters for both Vue 3 and React.

## Entry Points

The package is divided into three main entry points:

| Import                         | Purpose                | Key Exports                                                             |
| :----------------------------- | :--------------------- | :---------------------------------------------------------------------- |
| `@mission-platform/i18n`       | Framework-neutral core | `createForgeI18N`, `forgeNamespace`, `localeNamespaces`, `mergeLocales` |
| `@mission-platform/i18n/vue`   | Vue 3 adapter          | `createForgeI18NVue`, `useI18n`                                         |
| `@mission-platform/i18n/react` | React adapter          | `ForgeI18NProvider`, `useI18n`                                          |

## Core Concepts

### The i18n Instance

The core provides `createForgeI18N(options)`, which returns a synchronously initialized i18next instance.

- **Interpolation**: Uses single-brace delimiters (e.g., `{name}`).
- **HTML Escaping**: Disabled by default (`escapeValue: false`) to allow frameworks to handle escaping according to
  their own security models.

### Namespacing Strategy

To avoid collisions in a monorepo, translations are grouped into namespaces using the `mp.<workspace>` convention:

- **Packages**: Use `forgeNamespace('<package_name>')` (e.g., `@mission-platform/breakpoints` uses `mp.breakpoints`).
- **Apps**: Use `forgeNamespace('<app_name>')`.

#### Namespace Hierarchy & Overrides

1. **Default Namespace**: Apps define their own namespace as the default.
2. **Fallback**: The default namespace falls back to other namespaces, allowing component code to resolve its own keys.
3. **Overrides**: Apps can provide an `overrides` object in the config to relabel specific strings from a package
   without affecting others.

## Usage Examples

### 1. Core Configuration

```ts
import { createForgeI18N, localeNamespaces, forgeNamespace } from '@mission-platform/i18n';

const i18n = createForgeI18N({
  namespace: forgeNamespace('my-care-notes'),
  namespaces: localeNamespaces('en', enBundles), // Turn YAML bundles into i18next shape
  overrides: {
    [forgeNamespace('breakpoints')]: {
      en: { breakpoint: 'Viewport:' },
    },
  },
});
```

### 2. Vue 3 Integration

**Installation:**

```ts
import { createForgeI18N } from '@mission-platform/i18n';
import { createForgeI18NVue } from '@mission-platform/i18n/vue';

const i18n = createForgeI18N({ messages: { en: { hello: 'Hello {name}' } } });
app.use(createForgeI18NVue(i18n));
```

**Component Usage:**

```vue
<script setup lang="ts">
  import { useI18n } from '@mission-platform/i18n/vue';
  const { t, locale, setLocale } = useI18n();
</script>

<template>
  <button>{{ t('hello', { name: 'World' }) }}</button>
</template>
```

### 3. React Integration

**Provider Setup:**

```tsx
import { createForgeI18N } from '@mission-platform/i18n';
import { ForgeI18NProvider, useI18n } from '@mission-platform/i18n/react';

const i18n = createForgeI18N({ messages: { en: { hello: 'Hello {name}' } } });

root.render(
  <ForgeI18NProvider i18n={i18n}>
    <App />
  </ForgeI18NProvider>,
);
```

**Component Usage:**

```tsx
function Greeting() {
  const { t } = useI18n();
  return <button>{t('hello', { name: 'World' })}</button>;
}
```

## API Reference

### `forgeNamespace(workspace: string)`

Returns the standardized namespace string for a given workspace (e.g., `'breakpoints'` $\rightarrow$
`'mp.breakpoints'`).

### `localeNamespaces(locale: string, bundles: any)`

Transforms the raw, namespace-keyed translation files (typically from YAML) into the format expected by i18next.
