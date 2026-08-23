# @mission-platform/i18n

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/i18n/docs/index.md: [packages/i18n/docs/index.md](../../index.md)
> Langue: Français (fr)

`@mission-platform/i18n` est un wrapper d'internationalisation indépendant du framework (i18n) construit
sur [i18suivant](https://www.i18next.com/). Il fournit un moyen unifié de gérer les traductions sur la plateforme de mission,
avec des adaptateurs dédiés pour Vue 3 et React.

## Point d'entrée

Le package possède un seul point d’entrée, `@mission-platform/i18n`. L'adaptateur auquel il se résout est décidé par
la condition d'export `mp:<framework>` active, que vous sélectionnez **une fois** pour l'ensemble du projet :
`resolve.conditions` dans Vite (voir `defineFrameworkAppConfig` / `frameworkResolveConditions` de
`@mission-platform/vite-config`) et `customConditions` dans TypeScript (via le
`@mission-platform/typescript-config/framework-<name>` préréglages). Chaque importation reste nue.

| État actif | Décide de | Exportations clés |
| :--------------- | :--------------------- | :---------------------------------------------------------------------- |
| _(aucun)_ | Noyau neutre | `createForgeI18N`, `forgeNamespace`, `localeNamespaces`, `mergeLocales` |
| `mp:vue` | Vue 3 adaptateurs | le noyau neutre plus `createForgeI18NVue`, `useI18n` |
| `mp:react` | Adaptateur React | le noyau neutre plus `ForgeI18NProvider`, `useI18n` |

## Concepts de base

### L'instance i18n

Le noyau fournit `createForgeI18N(options)`, qui renvoie une instance i18next initialisée de manière synchrone.

- **Interpolation** : utilise des délimiteurs à une seule accolade (par exemple, `{name}`).
- **Échappage HTML** : désactivé par défaut (`escapeValue: false`) pour permettre aux frameworks de gérer l'échappement en fonction de
  leurs propres modèles de sécurité.

### Stratégie d'espacement de noms

Pour éviter les collisions dans un monorepo, les traductions sont regroupées en espaces de noms en utilisant la convention `mp.<workspace>` :

- **Packages** : utilisez `forgeNamespace('<package_name>')` (par exemple, `@mission-platform/breakpoints` utilise `mp.breakpoints`).
- **Applications** : utilisez `forgeNamespace('<app_name>')`.

#### Hiérarchie et remplacements des espaces de noms

1. **Espace de noms par défaut** : les applications définissent leur propre espace de noms par défaut.
2. **Retour** : l'espace de noms par défaut revient à d'autres espaces de noms, permettant au code du composant de résoudre ses propres clés.
3. **Remplacements** : les applications peuvent fournir un objet `overrides` dans la configuration pour réétiqueter des chaînes spécifiques d'un package.
   sans affecter les autres.

## Exemples d'utilisation

### 1. Configuration de base

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

### 2. Vue 3 Intégration

**Installation:**

```ts
// With the mp:vue condition active.
import { createForgeI18N, createForgeI18NVue } from '@mission-platform/i18n';

const i18n = createForgeI18N({ messages: { en: { hello: 'Hello {name}' } } });
app.use(createForgeI18NVue(i18n));
```

**Utilisation des composants :**

```vue
<script setup lang="ts">
  import { useI18n } from '@mission-platform/i18n';
  const { t, locale, setLocale } = useI18n();
</script>

<template>
  <button>{{ t('hello', { name: 'World' }) }}</button>
</template>
```

### 3. Intégration React

**Configuration du fournisseur :**

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

**Utilisation des composants :**

```tsx
function Greeting() {
  const { t } = useI18n();
  return <button>{t('hello', { name: 'World' })}</button>;
}
```

## Référence API

### `forgeNamespace(workspace: string)`

Renvoie la chaîne d'espace de noms standardisée pour un espace de travail donné (par exemple, `'breakpoints'` $\rightarrow$
`'mp.breakpoints'`).

### `localeNamespaces(locale: string, bundles: any)`

Transforme les fichiers de traduction bruts à clé d'espace de noms (généralement à partir de YAML) dans le format attendu par i18next.
