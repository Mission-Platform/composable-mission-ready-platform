# Paquets de configuration

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/packages/tooling/configs/index.md: [docs/packages/tooling/configs/index.md](../../../packages/tooling/configs/index.md)
> Langue: Français (fr)

La plateforme de mission utilise des packages de configuration centralisés dans le `packages/tooling/configs/` répertoire pour garantir la cohérence à travers
le monorepo.

## Aperçu

La centralisation des configurations permet d'avoir une source unique de vérité pour les règles d'outillage, les processus de construction et le style de code.
Les packages et les applications consomment ces configurations en les étendant dans leurs fichiers de configuration locaux.

## Résumé du package

La documentation du package de configuration appartient à chaque package. Les liens ci-dessous
sont aujourd'hui des liens de fichiers de référentiel et deviennent des routes avec espace de noms de package dans le
site de documentation :

| Forfait | Objectif | Surface de configuration principale |
|:---|:---|:---|
| [`@mission-platform/eslint-config`](../../../../packages/tooling/configs/eslint-config/docs/locales/fr/index.md) | Plat ESLint règles pour JS/TS et Vue. | `eslint.config.js` |
| [`@mission-platform/prettier-config`](../../../../packages/tooling/configs/prettier-config/docs/locales/fr/index.md) | Paramètres par défaut du formatage du référentiel. | `prettier.config.js` |
| [`@mission-platform/typescript-config`](../../../../packages/tooling/configs/typescript-config/docs/locales/fr/index.md) | TypeScript préréglages du compilateur. | `tsconfig.json` |
| [`@mission-platform/stylelint-config`](../../../../packages/tooling/configs/stylelint-config/docs/locales/fr/index.md) | Pelucheux CSS et SCSS. | `stylelint.config.mjs` |
| [`@mission-platform/vite-config`](../../../../packages/tooling/configs/vite-config/docs/locales/fr/index.md) | Vite et Vitest aides à la configuration. | `vite.config.ts` |
| [`@mission-platform/tsdown-config`](../../../../packages/tooling/configs/tsdown-config/docs/locales/fr/index.md) | Aides au regroupement de bibliothèques. | `tsdown.config.ts` |
| [`@mission-platform/postcss-config`](../../../../packages/tooling/configs/postcss-config/docs/locales/fr/index.md) | Pipeline PostCSS partagé. | `postcss.config.mjs` |
| [`@mission-platform/i18n-config`](../../../../packages/tooling/configs/i18n-config/docs/locales/fr/index.md) | Paramètres régionaux et d’extraction partagés. | `i18next.config.ts` |
| [`@mission-platform/storybook-framework`](../../../../packages/tooling/configs/storybook-framework/docs/locales/fr/index.md) | Préréglage du framework Storybook sélectionné par l'environnement. | `.storybook/main.ts` |
| [Configuration des travailleurs](workers-config.md) | Conventions Cloudflare Worker inter-espaces de travail. | `wrangler.jsonc` |

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

Pour Stylelint, utilisez le même modèle ESM d'importation et de spread dans `stylelint.config.mjs` :

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

## Choisir une configuration

Utilisez le package propriétaire du problème plutôt que de copier les règles dans un espace de travail. Fichiers de construction d'applications et de bibliothèques
peut ajouter des remplacements locaux, mais les valeurs par défaut partagées doivent rester dans `packages/tooling/configs/`. Pour un nouveau package, commencez par le package
échafaudage, puis exécutez les vérifications de l'espace de travail :

```bash
pnpm exec turbo run build:check --filter @mission-platform/<name>
pnpm exec turbo run lint --filter @mission-platform/<name>
pnpm exec turbo run format --filter @mission-platform/<name>
```
