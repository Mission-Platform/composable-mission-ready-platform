# @mission-platform/i18n

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/i18n/docs/index.md: [packages/i18n/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

`@mission-platform/i18n` ist ein Framework-unabhängiger Internationalisierungs-Wrapper (i18n).
auf [i18next](https://www.i18next.com/). Es bietet eine einheitliche Möglichkeit, Übersetzungen auf der gesamten Missionsplattform abzuwickeln.
mit dedizierten Adaptern für Vue 3 und React.

## Einstiegspunkt

Das Paket verfügt über einen einzigen Einstiegspunkt, `@mission-platform/i18n`. In welchen Adapter es aufgelöst wird, entscheidet der Benutzer
die aktive Exportbedingung `mp:<framework>`, die Sie **einmal** für das gesamte Projekt auswählen:
`resolve.conditions` in Vite (siehe `defineFrameworkAppConfig` / `frameworkResolveConditions` von
`@mission-platform/vite-config`) und `customConditions` in TypeScript (über die
`@mission-platform/typescript-config/framework-<name>`-Voreinstellungen). Jeder Import bleibt leer.

| Aktiver Zustand | Wird zu | aufgelöst Wichtige Exporte |
| :--------------- | :--------------------- | :---------------------------------------------------------------------- |
| _(keine)_ | Framework-neutraler Kern | `createForgeI18N`, `forgeNamespace`, `localeNamespaces`, `mergeLocales` |
| `mp:vue` | Vue 3 Adapter | der neutrale Kern plus `createForgeI18NVue`, `useI18n` |
| `mp:react` | React-Adapter | der neutrale Kern plus `ForgeI18NProvider`, `useI18n` |

## Kernkonzepte

### Die i18n-Instanz

Der Kern stellt `createForgeI18N(options)` bereit, das eine synchron initialisierte i18next-Instanz zurückgibt.

- **Interpolation**: Verwendet Trennzeichen mit einer Klammer (z. B. `{name}`).
- **HTML-Escape-Funktion**: Standardmäßig deaktiviert (`escapeValue: false`), damit Frameworks die Escape-Funktion entsprechend verarbeiten können
  ihre eigenen Sicherheitsmodelle.

### Namespace-Strategie

Um Kollisionen in einem Monorepo zu vermeiden, werden Übersetzungen mithilfe der `mp.<workspace>`-Konvention in Namespaces gruppiert:

- **Pakete**: Verwenden Sie `forgeNamespace('<package_name>')` (z. B. `@mission-platform/breakpoints` verwendet `mp.breakpoints`).
- **Apps**: Verwenden Sie `forgeNamespace('<app_name>')`.

#### Namespace-Hierarchie und Überschreibungen

1. **Standard-Namespace**: Apps definieren ihren eigenen Namespace als Standard.
2. **Fallback**: Der Standard-Namespace greift auf andere Namespaces zurück, sodass der Komponentencode seine eigenen Schlüssel auflösen kann.
3. **Überschreibungen**: Apps können ein `overrides`-Objekt in der Konfiguration bereitstellen, um bestimmte Zeichenfolgen aus einem Paket neu zu kennzeichnen
   ohne andere zu beeinträchtigen.

## Anwendungsbeispiele

### 1. Kernkonfiguration

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
// With the mp:vue condition active.
import { createForgeI18N, createForgeI18NVue } from '@mission-platform/i18n';

const i18n = createForgeI18N({ messages: { en: { hello: 'Hello {name}' } } });
app.use(createForgeI18NVue(i18n));
```

**Komponentenverwendung:**

```vue
<script setup lang="ts">
  import { useI18n } from '@mission-platform/i18n';
  const { t, locale, setLocale } = useI18n();
</script>

<template>
  <button>{{ t('hello', { name: 'World' }) }}</button>
</template>
```

### 3. React-Integration

**Anbieter-Setup:**

```tsx
// With the mp:react condition active — same bare specifier as the Vue example.
import { createForgeI18N, ForgeI18NProvider, useI18n } from '@mission-platform/i18n';

const i18n = createForgeI18N({ messages: { en: { hello: 'Hello {name}' } } });

root.render(
  <ForgeI18NProvider i18n={i18n}>
    <App />
  </ForgeI18NProvider>,
);
```

**Komponentenverwendung:**

```tsx
function Greeting() {
  const { t } = useI18n();
  return <button>{t('hello', { name: 'World' })}</button>;
}
```

## API-Referenz

### `forgeNamespace(workspace: string)`

Gibt die standardisierte Namespace-Zeichenfolge für einen bestimmten Arbeitsbereich zurück (z. B. `'breakpoints'` $\rightarrow$
`'mp.breakpoints'`).

### `localeNamespaces(locale: string, bundles: any)`

Wandelt die rohen, mit Namespaces versehenen Übersetzungsdateien (normalerweise aus YAML) in das von i18next erwartete Format um.
