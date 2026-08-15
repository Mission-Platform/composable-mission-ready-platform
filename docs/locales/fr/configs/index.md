# Paquets de configuration

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> Source anglaise: [docs/configs/index.md](../../../configs/index.md)
> Langue: Français (fr)

La plateforme de mission utilise des packages de configuration centralisés dans le `configs/` répertoire pour garantir la cohérence à travers
le monorepo.

## Aperçu

La centralisation des configurations permet d'avoir une source unique de vérité pour les règles d'outillage, les processus de construction et le style de code.
Les packages et les applications consomment ces configurations en les étendant dans leurs fichiers de configuration locaux.

## Résumé du package

| Forfait | Objectif | Surface de configuration principale |
|:---|:---|:---|
| [`@mission-platform/eslint-config`](eslint-config.md) | Plat ESLint règles pour JS/TS et Vue. | `eslint.config.js` |
| `@mission-platform/prettier-config` | Paramètres par défaut du formatage du référentiel. | `prettier.config.mjs` |
| `@mission-platform/typescript-config` | TypeScript préréglages du compilateur. | `tsconfig.json` |
| `@mission-platform/stylelint-config` | Pelucheux CSS et SCSS. | `stylelint.config.mjs` |
| `@mission-platform/vite-config` | Vite et Vitest aides à la configuration. | `vite.config.ts` |
| `@mission-platform/tsdown-config` | Aides au regroupement de bibliothèques. | `tsdown.config.ts` |
| `@mission-platform/postcss-config` | Pipeline PostCSS partagé. | `postcss.config.mjs` |
| `@mission-platform/i18n-config` | Paramètres régionaux et d’extraction partagés. | `i18next.config.ts` |
| `@mission-platform/storybook-framework` | Préréglage du framework Storybook sélectionné par l'environnement. | `.storybook/main.ts` |
| [Configuration des travailleurs](workers-config.md) | Conventions Cloudflare Worker. | `wrangler.jsonc` |

## Outillage de base

### ESLint (`@mission-platform/eslint-config`)

Standardise les règles de qualité du code dans tous les espaces de travail. Il utilise le format Flat Config et inclut la prise en charge de
TypeScript, Vue 3 et l’accessibilité.

### Prettier (`@mission-platform/prettier-config`)

Applique un style de code cohérent (tabulations, guillemets, points-virgules) sur l'ensemble du monorepo.

### TypeScript (`@mission-platform/typescript-config`)

Fournit une base `tsconfig` préréglages pour différentes cibles :

- `base`: Paramètres généraux par défaut.
- `vue`: optimisé pour Vue 3 SFC.
- `node`: optimisé pour NodeEnvironnements .js.
- `framework-<name>`: Ajoute la correspondance `mp:<framework>` condition d’exportation pour les consommateurs externes.

## Construire un système

### Vite (`@mission-platform/vite-config`)

Fournit des fonctions d'usine pour créer Vite configurations pour les applications et les bibliothèques.

```ts
import { defineAppConfig, defineLibraryConfig } from '@mission-platform/vite-config';
```

- `defineAppConfig`: Pour les applications de haut niveau (SPA, ouvriers).
- `defineLibraryConfig`: Pour les forfaits partagés avec un regroupement et un arborescence optimaux.

### PostCSS (`@mission-platform/postcss-config`)

Partage le pipeline du plugin PostCSS (y compris Autoprefixer) pour garantir que le CSS est traité de manière cohérente, quel que soit l'endroit.
il est écrit.

## Modèle d'utilisation

Pour utiliser une configuration dans un espace de travail :

1. Ajoutez le package de configuration en tant que `devDependency` dans `package.json`.
2. Créez un fichier de configuration local (par exemple, `eslint.config.js`).
3. Importez et exportez/étendez la configuration de base.

```js
// Example: eslint.config.js
import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  // local overrides
];
```

## Choisir une configuration

Utilisez le package propriétaire du problème plutôt que de copier les règles dans un espace de travail. Fichiers de construction d'applications et de bibliothèques
peut ajouter des remplacements locaux, mais les valeurs par défaut partagées doivent rester dans `configs/`. Pour un nouveau package, commencez par le package
échafaudage, puis exécutez les vérifications de l'espace de travail :

```bash
pnpm exec turbo run build:check --filter @mission-platform/<name>
pnpm exec turbo run lint --filter @mission-platform/<name>
pnpm exec turbo run format --filter @mission-platform/<name>
```
