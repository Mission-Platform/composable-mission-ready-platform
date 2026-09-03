# @mission-platform/i18n

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/core/i18n/docs/index.md: [packages/core/i18n/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

`@mission-platform/i18n` is een framework-agnostische internationalisatie (i18n) wrapper gebouwd
op [i18volgende](https://www.i18next.com/). Het biedt een uniforme manier om vertalingen binnen het Mission Platform af te handelen,
met speciale adapters voor zowel Vue 3 als React.

## Ingangspunt

Het pakket heeft één toegangspunt, `@mission-platform/i18n`. Welke adapter het oplost, wordt bepaald door
de actieve `mp:<framework>`-exportvoorwaarde, die u **eenmalig** selecteert voor het hele project:
`resolve.conditions` in Vite (zie `defineFrameworkAppConfig` / `frameworkResolveConditions` van
`@mission-platform/vite-config`) en `customConditions` in TypeScript (via de
`@mission-platform/typescript-config/framework-<name>`-voorinstellingen). Elke import blijft kaal.

| Actieve toestand | Oplossing voor     | Belangrijkste exporten                                                  |
| :--------------- | :----------------- | :---------------------------------------------------------------------- |
| _(geen)_         | Kaderneutrale kern | `createForgeI18N`, `forgeNamespace`, `localeNamespaces`, `mergeLocales` |
| `mp:vue`         | Vue 3-adapter      | de neutrale kern plus `createForgeI18NVue`, `useI18n`                   |
| `mp:react`       | React-adapter      | de neutrale kern plus `ForgeI18NProvider`, `useI18n`                    |

## Kernconcepten

### Het i18n-exemplaar

De kern biedt `createForgeI18N(options)`, die een synchroon geïnitialiseerde i18next-instantie retourneert.

- **Interpolatie**: gebruikt scheidingstekens met enkele accolades (bijvoorbeeld `{name}`).
- **HTML-escaping**: standaard uitgeschakeld (`escapeValue: false`) zodat frameworks escapes kunnen verwerken volgens
  hun eigen beveiligingsmodellen.

### Strategie voor naamruimte

Om botsingen in een monorepo te voorkomen, worden vertalingen gegroepeerd in naamruimten met behulp van de `mp.<workspace>`-conventie:

- **Pakketten**: gebruik `forgeNamespace('<package_name>')` (`@mission-platform/breakpoints` gebruikt bijvoorbeeld `mp.breakpoints`).
- **Apps**: gebruik `forgeNamespace('<app_name>')`.

#### Naamruimtehiërarchie en overschrijvingen

1. **Standaardnaamruimte**: Apps definiëren hun eigen naamruimte als standaard.
2. **Fallback**: de standaardnaamruimte valt terug naar andere naamruimten, waardoor componentcode zijn eigen sleutels kan omzetten.
3. **Overschrijvingen**: Apps kunnen een `overrides`-object in de configuratie leveren om specifieke tekenreeksen uit een pakket opnieuw te labelen
   zonder anderen te beïnvloeden.

## Gebruiksvoorbeelden

### 1. Kernconfiguratie

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

### 2. Vue 3 Integratie

**Installatie:**

```ts
// With the mp:vue condition active.
import { createForgeI18N, createForgeI18NVue } from '@mission-platform/i18n';

const i18n = createForgeI18N({ messages: { en: { hello: 'Hello {name}' } } });
app.use(createForgeI18NVue(i18n));
```

**Componentgebruik:**

```vue
<script setup lang="ts">
  import { useI18n } from '@mission-platform/i18n';
  const { t, locale, setLocale } = useI18n();
</script>

<template>
  <button>{{ t('hello', { name: 'World' }) }}</button>
</template>
```

### 3. React-integratie

**Providerconfiguratie:**

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

**Componentgebruik:**

```tsx
function Greeting() {
  const { t } = useI18n();
  return <button>{t('hello', { name: 'World' })}</button>;
}
```

## API-referentie

### `forgeNamespace(workspace: string)`

Retourneert de gestandaardiseerde naamruimtetekenreeks voor een bepaalde werkruimte (bijvoorbeeld `'breakpoints'` $\rightarrow$
`'mp.breakpoints'`).

### `localeNamespaces(locale: string, bundles: any)`

Transformeert de onbewerkte, op naamruimte ingetoetste vertaalbestanden (meestal van YAML) naar het formaat dat door i18next wordt verwacht.
