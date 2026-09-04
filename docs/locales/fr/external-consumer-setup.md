# Configuration du consommateur externe

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/external-consumer-setup.md: [docs/external-consumer-setup.md](../../external-consumer-setup.md)
> Langue: Français (fr)

Ce guide explique comment utiliser les packages Mission Platform dans des projets situés en dehors du monorepo principal. Il se concentre sur l’utilisation de versions spécifiques au framework et sur la gestion des jetons de conception.

## Sélection du cadre via les conditions

Les composants de Mission Platform sont créés une seule fois à l'aide de `@mission-platform/forge-jsx` et distribués sous forme de plusieurs ensembles spécifiques au framework (Vue 3, React, Solid et composants Web) au sein d'un seul package.

Pour sélectionner le bon bundle, vous devez configurer votre outil de génération et TypeScript pour utiliser les **Conditions d'exportation personnalisées**.

### Conditions cadres prises en charge

| Cadre | Conditions d'exportation |
| :----------------- | :----------------- |
| **Vue 3** | `mp:vue` |
| **React** | `mp:react` |
| **Solid** | `mp:solid` |
| **Composants Web** | `mp:web-component` |

## Configuration du projet

### 1. Configuration Vite

Si vous utilisez Vite, vous pouvez utiliser les fonctions d'assistance de `@mission-platform/vite-config` pour définir automatiquement les conditions de résolution correctes. Une application sans framework doit sélectionner `mp:web-component` ; n'installez pas et ne configurez pas de plugin Vue pour cette cible.

```ts
import { defineConfig } from "vite";
import { frameworkResolveConditions } from "@mission-platform/vite-config";

export default defineConfig({
  resolve: {
    // This places the Web Components build at the top of the condition list.
    conditions: frameworkResolveConditions("web-component"),
  },
});
```

### 2. Configuration TypeScript

Pour garantir que le service de langage TypeScript (LSP) résout les types pour le framework correct, vous devez étendre un paramètre prédéfini de framework à partir de `@mission-platform/typescript-config`.

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

Le package de routeur neutre n'a pas de dépendances d'exécution de framework ou de bibliothèque de routeur. Installez le routeur natif sélectionné par
votre application et la cible Forge correspondante (`@mission-platform/forge-router-vue`, `-react`, `-solid`, `-svelte`,
`-redwood` ou `-web-components`). L'application possède des définitions d'itinéraire, des fournisseurs, des gardes, des chargeurs et le natif
instance de routeur ; les packages réutilisables importent uniquement les fonctionnalités de `@mission-platform/router`.

## Component Usage

Avec les conditions correctement configurées, vous pouvez importer des composants depuis la racine du package. L'outil de construction sélectionnera automatiquement le bundle correspondant à votre condition `mp:*`.

```vue
<script setup lang="ts">
import { ForgeButton } from "@mission-platform/components";
</script>

<template>
  <ForgeButton variant="primary">Click Me</ForgeButton>
</template>
```

### Routage sans framework

Utilisez l'historique de la mémoire pour les tests et le prérendu, ou omettez `history` dans un navigateur pour utiliser l'historique du navigateur. Enregistrer le routeur
éléments une fois ; attribuez des cibles d'itinéraire en tant que propriétés lorsqu'elles contiennent des paramètres, des valeurs de requête ou des hachages :

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from "@mission-platform/forge-router-web-components/runtime";

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/"),
  routes: [
    { path: "/", redirect: "/docs/intro" },
    {
      path: "/docs/*",
      name: "doc",
      component: () => document.createTextNode("Docs"),
    },
  ],
});
setForgeRouter(router);

const outlet = document.querySelector("forge-router-outlet");
outlet?.setRouter(router);
```

### Navigation asynchrone avec un spinner de chargement

Les composants de route asynchrone peuvent garder la page actuelle visible pendant la vue suivante
charges. Configurez le repli de la prise lors de la création du routeur de composants Web ;
`forge-router-link` effectue ensuite la navigation SPA avec `pushState` (ou remplace
historique lorsque `replace` est activé) :

```ts
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/docs/intro"),
  loadingFallback: () => {
    const spinner = document.createElement("span");
    spinner.className = "docs-loading-spinner";
    spinner.setAttribute("aria-label", "Loading documentation");
    return spinner;
  },
  routes: [
    {
      path: "/docs/*",
      component: async () => (await import("./views/docs-view")).default(),
    },
  ],
});
setForgeRouter(router);
document.querySelector("forge-router-outlet")?.setRouter(router);
```

```html
<forge-router-link to="/docs/advanced"
  >Advanced documentation</forge-router-link
>
<forge-router-outlet></forge-router-outlet>
```

Le point de vente est propriétaire de la superposition de chargement et ne supprime pas le fichier actuellement monté.
afficher jusqu'à ce que la destination soit résolue. Il efface la superposition pour réussir,
navigation redirigée, annulée et échouée. Clics modifiés, téléchargements,
les URL externes et les liens avec une autre cible conservent le comportement natif du navigateur.

Lors de la création d'une source Forge partagée, utilisez directement la limite neutre et laissez
chaque compilateur sélectionne son implémentation native :

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
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

Tous les composants de Mission Platform consomment ces variables, de sorte que les modifications au niveau `:root` se propageront dans l'ensemble de l'interface utilisateur.
