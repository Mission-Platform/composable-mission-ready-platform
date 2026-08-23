# ESLint Configuration

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> configs/eslint-config/docs/reference/eslint.md: [configs/eslint-config/docs/reference/eslint.md](../../../reference/eslint.md)
> Langue: Français (fr)

Le `@mission-platform/eslint-config` Le package fournit un emplacement centralisé et plat ESLint configuration pour l’ensemble du monorepo.

## Aperçu

Mission Platform utilise le ESLint Format de configuration plate (`eslint.config.js`). La configuration partagée applique une cohérence
la qualité du code, l'accessibilité et les règles architecturales dans tous les packages, applications et travailleurs.

## Principales fonctionnalités

- **TypeScript Prise en charge** : linting sensible au type alimenté par `typescript-eslint`.
- **Vue 3 SFC** : applique `<script setup>` et les bonnes pratiques via `eslint-plugin-vue`.
- **Accessibilité** : vérifications d'accessibilité intégrées pour Vue modèles avec `eslint-plugin-vuejs-accessibility`.
- **Import Organisation** : Tri et validation automatique des importations via `eslint-plugin-import-x`.
- **Monorepo Awareness** : intégration avec `eslint-config-turbo` pour garantir que les variables d'environnement sont correctement déclarées.

## Plugins intégrés

La configuration comprend les plugins et ensembles de règles suivants :

| Plugin | Objectif |
|:-------------------------|:-------------------------------------------------------|
| `typescript-eslint`      | Standard TypeScript règles et peluchage sensible au type.      |
| `eslint-plugin-vue`      | Vue 3 Linting SFC et validation du modèle.             |
| `eslint-plugin-sonarjs`  | Détection des odeurs de code et des risques de bugs.                |
| `eslint-plugin-unicorn`  | Des dizaines de petites règles communautaires utiles.               |
| `eslint-plugin-i18next`  | S'assure que les clés de traduction sont utilisées correctement.           |
| `eslint-config-prettier` | Désactive les règles qui entrent en conflit avec Prettier formatage. |

## Usage

Pour appliquer la configuration partagée à un espace de travail, créez un `eslint.config.js` fichier à la racine de l'espace de travail :

```js
import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  // Add workspace-specific overrides here
];
```

## Exécuter le Linter

Utilisez Turborepo pour exécuter le linting sur un ou plusieurs espaces de travail :

```bash
# Lint the entire monorepo
pnpm exec turbo run lint

# Lint a specific package
pnpm exec turbo run lint --filter <package-name>

# Automatically fix fixable issues
pnpm exec turbo run lint:fix
```
