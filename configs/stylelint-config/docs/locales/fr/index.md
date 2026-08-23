# @mission-platform/stylelint-config

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> configs/stylelint-config/docs/index.md: [configs/stylelint-config/docs/index.md](../../index.md)
> Langue: Français (fr)

Commun Stylelint règles pour CSS et SCSS dans Mission Platform.

## Installer et utiliser

```bash
pnpm add --save-dev @mission-platform/stylelint-config
```

Étendre le package à partir de l'espace de travail `stylelint.config.mjs`. Conserver le composant
styles proches de leur composant et utilisent des remplacements locaux uniquement pour un
contrainte d'espace de travail.

## Contribuer

Courir `pnpm --filter @mission-platform/stylelint-config lint` et
`pnpm --filter @mission-platform/stylelint-config format`. Tester les modifications des règles
par rapport aux styles de package SCSS et d’application.
