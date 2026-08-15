# Configuration du consommateur externe

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> Source anglaise: [docs/external-consumer-setup.md](../../external-consumer-setup.md)
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

Si vous utilisez Vite, vous pouvez utiliser les fonctions d'assistance de `@mission-platform/vite-config` pour définir automatiquement les conditions de résolution correctes.

```ts
import { defineConfig } from 'vite';
import { frameworkResolveConditions } from '@mission-platform/vite-config';

export default defineConfig({
  resolve: {
    // This places 'mp:vue' at the top of the condition list
    conditions: frameworkResolveConditions('mp:vue'),
  },
});
```

### 2. TypeScript Configuration

Pour assurer la TypeScript Language Service (LSP) résout les types pour le framework correct, vous devez étendre un framework prédéfini à partir de `@mission-platform/typescript-config`.

```json
{
  "extends": "@mission-platform/typescript-config/framework-vue",
  "compilerOptions": {
    "customConditions": ["mp:vue"]
  }
}
```

## Installation du paquet

Installez les packages requis à partir de votre registre :

```bash
pnpm add @mission-platform/components @mission-platform/tokens
```

### Dépendances entre pairs

La plupart des packages Mission Platform externalisent leurs dépendances d'exécution. Assurez-vous que le framework et les bibliothèques partagées correspondants sont installés dans votre projet :

```bash
# Example for a Vue 3 project
pnpm add vue vue-router @mission-platform/i18n
```

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
