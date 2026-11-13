# @mission-platform/vite-config

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/tooling/configs/vite-config/docs/index.md: [packages/tooling/configs/vite-config/docs/index.md](../../index.md)
> Langue: Français (fr)

Assistants de configuration Vite et Vitest partagés pour les packages Mission Platform et
candidatures.

## Installer et utiliser

```bash
pnpm add --save-dev @mission-platform/vite-config
```

Utilisez `defineLibraryConfig` pour les packages, `defineAppConfig` pour les applications et
`defineVitestConfig` à partir du sous-chemin `/vitest`. Les applications-cadres devraient
sélectionnez une condition `defineFrameworkAppConfig`, puis importez les packages partagés
via leurs spécificateurs de package nus.

## Contribuer

Exécutez `pnpm --filter @mission-platform/vite-config lint` et vérifiez le format. Garder
les valeurs par défaut de l'assistant sont réutilisables et préservent les Vite, PostCSS et partagés
comportement d'externalisation décrit dans le package README.
