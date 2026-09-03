# @mission-platform/postcss-config

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/tooling/configs/postcss-config/docs/index.md: [packages/tooling/configs/postcss-config/docs/index.md](../../index.md)
> Langue: Français (fr)

Pipeline PostCSS partagé utilisé par les feuilles de style de Mission Platform.

## Installer et utiliser

```bash
pnpm add --save-dev @mission-platform/postcss-config
```

Référencez le package à partir de l'espace de travail `postcss.config.mjs` plutôt que
dupliquer le pipeline de plugins partagé. Les remplacements locaux appartiennent à cela
configuration de l'espace de travail.

## Contribuer

Courir `pnpm --filter @mission-platform/postcss-config lint` et
`pnpm --filter @mission-platform/postcss-config format`. Conserver le navigateur
comportement de compatibilité dans ce package et évitez les plugins spécifiques à l’application.
