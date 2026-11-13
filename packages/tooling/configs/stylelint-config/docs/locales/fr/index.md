# @mission-platform/stylelint-config

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/tooling/configs/stylelint-config/docs/index.md: [packages/tooling/configs/stylelint-config/docs/index.md](../../index.md)
> Langue: Français (fr)

Règles Stylelint partagées pour CSS et SCSS dans Mission Platform.

## Installer et utiliser

```bash
pnpm add --save-dev @mission-platform/stylelint-config postcss-html postcss-scss \
  stylelint stylelint-config-recommended-vue stylelint-config-standard-scss
```

Les espaces de travail portant un style utilisent un `stylelint.config.mjs` local d'espace de travail dans ESM
formater. Importez et diffusez la configuration partagée plutôt que de la dupliquer
Entrées `extends` :

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

La configuration partagée étend `stylelint-config-standard-scss` et
`stylelint-config-recommended-vue`. Il utilise `postcss-html` par défaut, utilise
`postcss-scss` pour `**/*.scss` et utilise `postcss-html` pour Vue Style SFC
blocs. Cela prend en charge les styles CSS, SCSS et Vue sans spécificités de l'espace de travail.
configuration de la syntaxe.

Ajoutez les dépendances de support direct ci-dessus aux dépendances de l'espace de travail
`devDependencies` utilisant les versions `catalog:stylelint`, ainsi que le
package de configuration partagé utilisant `workspace:*`. Ajoutez des scripts qui couvrent le
les sources de style de l'espace de travail, par exemple :

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

Gardez les styles de composants proches de leur composant et utilisez les remplacements locaux uniquement pour
une contrainte d’espace de travail documentée.

## Contribuer

Exécutez `pnpm --filter @mission-platform/stylelint-config lint` et
`pnpm --filter @mission-platform/stylelint-config format`. Tester les modifications des règles
par rapport aux styles de package SCSS et d’application.
