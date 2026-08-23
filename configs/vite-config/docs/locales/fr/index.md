# @mission-platform/vite-config

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> configs/vite-config/docs/index.md: [configs/vite-config/docs/index.md](../../index.md)
> Langue: Français (fr)

Commun Vite et Vitest aides à la configuration pour les packages Mission Platform et
candidatures.

## Installer et utiliser

```bash
pnpm add --save-dev @mission-platform/vite-config
```

Utiliser `defineLibraryConfig` pour les colis, `defineAppConfig` pour les candidatures, et
`defineVitestConfig` de la `/vitest` sous-chemin. Les applications-cadres devraient
sélectionnez-en un `defineFrameworkAppConfig` condition puis importer les packages partagés
via leurs spécificateurs de package nus.

## Contribuer

Courir `pnpm --filter @mission-platform/vite-config lint` et vérifications de format. Garder
les valeurs par défaut de l'assistant sont réutilisables et préservent le partage Vite, PostCSS et
comportement d'externalisation décrit dans le package README.
