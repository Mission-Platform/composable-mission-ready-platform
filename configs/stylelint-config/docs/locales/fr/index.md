# @mission-platform/stylelint-config

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> configs/stylelint-config/docs/index.md: [configs/stylelint-config/docs/index.md](../../index.md)
> Langue: Français (fr)

Commun Stylelint règles pour CSS et SCSS dans Mission Platform.

## Installer et utiliser

```bash
pnpm add --save-dev @mission-platform/stylelint-config postcss-html postcss-scss \
  stylelint stylelint-config-recommended-vue stylelint-config-standard-scss
```

Les workspaces contenant des styles utilisent un fichier ESM local `stylelint.config.mjs`. Importez et diffusez la configuration partagée au lieu de dupliquer ses entrées `extends` :

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

La configuration partagée étend `stylelint-config-standard-scss` et `stylelint-config-recommended-vue`. Elle utilise `postcss-html` par défaut, `postcss-scss` pour `**/*.scss` et `postcss-html` pour les blocs de style Vue. Ajoutez les dépendances directes avec les versions `catalog:stylelint` et le package de configuration partagé avec `workspace:*` dans `devDependencies`.

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

Étendre le package à partir de l'espace de travail `stylelint.config.mjs`. Conserver le composant
styles proches de leur composant et utilisent des remplacements locaux uniquement pour un
contrainte d'espace de travail.

## Contribuer

Courir `pnpm --filter @mission-platform/stylelint-config lint` et
`pnpm --filter @mission-platform/stylelint-config format`. Tester les modifications des règles
par rapport aux styles de package SCSS et d’application.
