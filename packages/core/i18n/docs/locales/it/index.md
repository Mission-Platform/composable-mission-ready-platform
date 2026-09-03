# @mission-platform/i18n

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/core/i18n/docs/index.md: [packages/core/i18n/docs/index.md](../../index.md)
> Lingua: Italiano (it)

`@mission-platform/i18n` è un wrapper di internazionalizzazione indipendente dal framework (i18n) creato
su [i18successivo](https://www.i18next.com/). Fornisce un modo unificato per gestire le traduzioni attraverso la Mission Platform,
con adattatori dedicati sia per Vue 3 che per React.

## Punto di ingresso

Il pacchetto ha un singolo punto di ingresso, `@mission-platform/i18n`. Viene deciso quale adattatore si risolve
la condizione di esportazione attiva `mp:<framework>`, che selezioni **una volta** per l'intero progetto:
`resolve.conditions` in Vite (vedi `defineFrameworkAppConfig` / `frameworkResolveConditions` da
`@mission-platform/vite-config`) e `customConditions` in TypeScript (tramite il
preimpostazioni `@mission-platform/typescript-config/framework-<name>`). Ogni importazione rimane nuda.

| Condizione attiva | Si risolve in                                | Principali esportazioni                                                 |
| :---------------- | :------------------------------------------- | :---------------------------------------------------------------------- |
| _(nessuno)_       | Nucleo neutrale rispetto al quadro normativo | `createForgeI18N`, `forgeNamespace`, `localeNamespaces`, `mergeLocales` |
| `mp:vue`          | Vue 3 adattatori                             | il nucleo neutro più `createForgeI18NVue`, `useI18n`                    |
| `mp:react`        | Adattatore React                             | il nucleo neutro più `ForgeI18NProvider`, `useI18n`                     |

## Concetti fondamentali

### L'istanza i18n

Il core fornisce `createForgeI18N(options)`, che restituisce un'istanza i18next inizializzata in modo sincrono.

- **Interpolazione**: utilizza delimitatori a parentesi graffa singola (ad esempio, `{name}`).
- **Escaping HTML**: disabilitato per impostazione predefinita (`escapeValue: false`) per consentire ai framework di gestire l'escape in base a
  i propri modelli di sicurezza.

### Strategia di spaziatura dei nomi

Per evitare collisioni in un monorepo, le traduzioni sono raggruppate in spazi dei nomi utilizzando la convenzione `mp.<workspace>`:

- **Pacchetti**: utilizza `forgeNamespace('<package_name>')` (ad esempio, `@mission-platform/breakpoints` utilizza `mp.breakpoints`).
- **App**: utilizza `forgeNamespace('<app_name>')`.

#### Gerarchia e override dello spazio dei nomi

1. **Spazio dei nomi predefinito**: le app definiscono il proprio spazio dei nomi come predefinito.
2. **Fallback**: lo spazio dei nomi predefinito ricorre ad altri spazi dei nomi, consentendo al codice del componente di risolvere le proprie chiavi.
3. **Sostituzioni**: le app possono fornire un oggetto `overrides` nella configurazione per rietichettare stringhe specifiche da un pacchetto
   senza influenzare gli altri.

## Esempi di utilizzo

### 1. Configurazione principale

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

### 2. Vue 3 Integrazione

**Installazione:**

```ts
// With the mp:vue condition active.
import { createForgeI18N, createForgeI18NVue } from '@mission-platform/i18n';

const i18n = createForgeI18N({ messages: { en: { hello: 'Hello {name}' } } });
app.use(createForgeI18NVue(i18n));
```

**Utilizzo dei componenti:**

```vue
<script setup lang="ts">
  import { useI18n } from '@mission-platform/i18n';
  const { t, locale, setLocale } = useI18n();
</script>

<template>
  <button>{{ t('hello', { name: 'World' }) }}</button>
</template>
```

### 3. Integrazione React

**Impostazione fornitore:**

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

**Utilizzo dei componenti:**

```tsx
function Greeting() {
  const { t } = useI18n();
  return <button>{t('hello', { name: 'World' })}</button>;
}
```

## Riferimento API

### `forgeNamespace(workspace: string)`

Restituisce la stringa dello spazio dei nomi standardizzata per un dato spazio di lavoro (ad esempio, `'breakpoints'` $\rightarrow$
`'mp.breakpoints'`).

### `localeNamespaces(locale: string, bundles: any)`

Trasforma i file di traduzione grezzi con chiave dello spazio dei nomi (tipicamente da YAML) nel formato previsto da i18next.
