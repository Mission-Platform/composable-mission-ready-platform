# @mission-platform/prettier-config

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/tooling/configs/prettier-config/docs/index.md: [packages/tooling/configs/prettier-config/docs/index.md](../../index.md)
> Langue: Français (fr)

Paramètres par défaut de formatage du référentiel partagés par les packages et les applications.

## Installer et utiliser

```bash
pnpm add --save-dev @mission-platform/prettier-config
```

Exportez la configuration partagée depuis le `prettier.config.js` de l'espace de travail.
Utilisez les remplacements locaux avec parcimonie afin que Markdown, TypeScript, Vue et la configuration
les fichiers restent cohérents dans tout le monorepo.

## Contribuer

Exécutez `pnpm --filter @mission-platform/prettier-config format` après avoir modifié le
configuration. Les modifications doivent s'appliquer de manière cohérente à chaque espace de travail qui utilise
le colis.
