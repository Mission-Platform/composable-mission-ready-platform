# Configuration ESLint

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/tooling/configs/eslint-config/docs/reference/eslint.md: [packages/tooling/configs/eslint-config/docs/reference/eslint.md](../../../reference/eslint.md)
> Langue: Français (fr)

Le package `@mission-platform/eslint-config` fournit une configuration ESLint centralisée et plate pour l'ensemble du monorepo.

## Aperçu

Mission Platform utilise le format ESLint Flat Config (`eslint.config.js`). La configuration partagée applique une cohérence
la qualité du code, l'accessibilité et les règles architecturales dans tous les packages, applications et travailleurs.

## Principales fonctionnalités

- **Prise en charge TypeScript** : peluchage sensible au type optimisé par `typescript-eslint`.
- **Vue 3 SFC** : applique `<script setup>` et les meilleures pratiques via `eslint-plugin-vue`.
- **Accessibilité** : vérifications d'accessibilité intégrées pour les modèles Vue avec `eslint-plugin-vuejs-accessibility`.
- **Organisation Import** : Tri et validation automatique des importations via `eslint-plugin-import-x`.
- **Monorepo Awareness** : intégration avec `eslint-config-turbo` pour garantir que les variables d'environnement sont correctement déclarées.

## Plugins intégrés

La configuration comprend les plugins et ensembles de règles suivants :

| Plugin | Objectif |
| :----------------------- | :----------------------------------------------------- |
| `typescript-eslint` | Règles TypeScript standard et peluchage sensible au type.      |
| `eslint-plugin-vue` | Vue 3 Linting SFC et validation de modèle.             |
| `eslint-plugin-sonarjs` | Détection des odeurs de code et des risques de bugs.                |
| `eslint-plugin-unicorn` | Des dizaines de petites règles communautaires utiles.               |
| `eslint-plugin-i18next` | S'assure que les clés de traduction sont utilisées correctement.           |
| `eslint-config-prettier` | Désactive les règles qui entrent en conflit avec le formatage Prettier. |

## Saisie stricte et respecte les règles

Le `missionTypeScriptPlugin` personnalisé fournit des vérifications rapides de la syntaxe AST appliquant les normes de typage strictes de Mission Platform :

| Règle | Gravité | Objectif |
| :--------------------------------------------- | :------------------------------ | :------------------------------------------------------------------------------------------------------- |
| `@typescript-eslint/no-explicit-any` | `error` (`warn` pour `**/*.vue`) | Interdit le mot-clé `any` dans le code TypeScript (`error`), `warn` étant appliqué aux modèles SFC Vue. |
| `@typescript-eslint/prefer-satisfies` | `warn` | Recommande `satisfies` plutôt que les assertions `as` pour préserver les littéraux étroits et interdit strictement `as any`.  |
| `@typescript-eslint/no-unconstrained-generics` | `warn` | Nécessite que tous les paramètres de type générique déclarent une contrainte `extends`.                                 |
| `@typescript-eslint/no-implicit-unknown` | `warn` | Interdit la fuite de `unknown` non validé au-delà des limites de l'API exportée.                                  |
| `@typescript-eslint/consistent-type-imports` | `error` | Mandate les déclarations `import type` de niveau supérieur pour les importations de type uniquement.                                     |

## Usage

Pour appliquer la configuration partagée à un espace de travail, créez un fichier `eslint.config.js` à la racine de l'espace de travail :

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
