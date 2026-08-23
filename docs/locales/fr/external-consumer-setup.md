# Configuration du consommateur externe

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/external-consumer-setup.md: [docs/external-consumer-setup.md](../../external-consumer-setup.md)
> Langue: Français (fr)

Ce guide explique comment utiliser les packages Mission Platform dans des projets situés en dehors du monorepo principal. Il se concentre sur l’utilisation de versions spécifiques au framework et sur la gestion des jetons de conception.

## Sélection du cadre via les conditions

Les composants de Mission Platform sont créés une fois en utilisant `@mission-platform/forge` et distribué sous forme de plusieurs bundles spécifiques au framework (Vue 3, React, Solidet composants Web) au sein d'un seul package.

Pour sélectionner le bon bundle, vous devez configurer votre outil de build et TypeScript pour utiliser les **Conditions d'exportation personnalisées**.

### Conditions cadres prises en charge

| Cadre | Conditions d'exportation |
| :--- | :--- |
| **Vue 3** | `mp:vue` |
| **React** | `mp:react` |
| **Solid** | `mp:solid` |
| **Composants Web** | `mp:web-component` |

## Configuration du projet

### 1. Vite Configuration

Si vous utilisez Vite, vous pouvez utiliser les fonctions d'assistance de `@mission-platform/vite-config` pour définir automatiquement les conditions de résolution correctes. Une application sans framework doit sélectionner `mp:web-component`; n'installez pas et ne configurez pas de Vue plugin pour cette cible.

```ts
import { defineConfig } from 'vite';
import { frameworkResolveConditions } from '@mission-platform/vite-config';

export default defineConfig({
  resolve: {
    // This places the Web Components build at the top of the condition list.
    conditions: frameworkResolveConditions('web-component'),
  },
});
```

### 2. TypeScript Configuration

Pour assurer le TypeScript Language Service (LSP) résout les types pour le framework correct, vous devez étendre un framework prédéfini à partir de `@mission-platform/typescript-config`.

```json
{
  "extends": "@mission-platform/typescript-config/framework-web-component",
  "compilerOptions": {
    "customConditions": ["mp:web-component"]
  }
}
```

## Installation du paquet

Installez les packages requis à partir de votre registre :

```bash
pnpm add @mission-platform/components @mission-platform/tokens @mission-platform/router @mission-platform/forge-router-web-components
```

### Dépendances entre pairs

La plupart des packages Mission Platform externalisent leurs dépendances d'exécution. Assurez-vous que le framework et les bibliothèques partagées correspondants sont installés dans votre projet :

```bash
# Example for a Vue 3 project
pnpm add @mission-platform/i18n
```

Le package de routeur neutre n’a pas de dépendances d’exécution de framework ou de bibliothèque de routeur. Installez le routeur natif sélectionné par
votre application et la cible Forge correspondante (`@mission-platform/forge-router-vue`, `-react`, `-solid`, `-svelte`,
`-redwood`, ou `-web-components`). L'application possède des définitions d'itinéraire, des fournisseurs, des gardes, des chargeurs et le natif
instance de routeur ; les packages réutilisables importent uniquement les capacités de `@mission-platform/router`.

## Utilisation des composants

Avec les conditions correctement configurées, vous pouvez importer des composants depuis la racine du package. L'outil de construction sélectionnera automatiquement le bundle correspondant à votre `mp:*` condition.

```vue
<script setup lang="ts">
import { ForgeButton } from '@mission-platform/components';
</script>

<template>
  <ForgeButton variant="primary">Click Me</ForgeButton>
</template>
```

### Routage sans framework

Utiliser l'historique de la mémoire pour les tests et le pré-rendu, ou omettre `history` dans un navigateur pour utiliser l'historique du navigateur. Enregistrer le routeur
éléments une fois ; attribuez des cibles d'itinéraire en tant que propriétés lorsqu'elles contiennent des paramètres, des valeurs de requête ou des hachages :

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from '@mission-platform/forge-router-web-components/runtime';

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory('/'),
  routes: [
    { path: '/', redirect: '/docs/intro' },
    { path: '/docs/*', name: 'doc', component: () => document.createTextNode('Docs') },
  ],
});
setForgeRouter(router);

const outlet = document.querySelector('forge-router-outlet');
outlet?.setRouter(router);
```

## Personnalisation des jetons de conception

Mission Platform utilise des propriétés personnalisées CSS (variables) pour les jetons de conception. Vous pouvez remplacer ces jetons globalement dans la feuille de style racine de votre application.

```css
/* App.css */
:root {
  /* Override the brand primary color */
  --mp-color-brand-primary: #007bff;
  
  /* Override a spacing token */
  --mp-spacing-md: 1.5rem;
}
```

Tous les composants de Mission Platform consomment ces variables, donc les changements au niveau `:root` Le niveau se propagera dans toute l’interface utilisateur.
