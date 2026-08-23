# @mission-platform/tsdown-config

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> configs/tsdown-config/docs/index.md: [configs/tsdown-config/docs/index.md](../../index.md)
> Langue: Français (fr)

Aides à la création de bibliothèques tsdown partagées pour les espaces de travail publiables.

## Installer et utiliser

```bash
pnpm add --save-dev @mission-platform/tsdown-config
```

Utiliser le package depuis un espace de travail `tsdown.config.ts` et garder les points d'entrée,
les dépendances externes et les contraintes de sortie locales au package en cours de construction.
Les déclarations et les bundles générés appartiennent au package de ce package. `dist/` annuaire.

## Contribuer

Courir `pnpm --filter @mission-platform/tsdown-config lint` et sa vérification de format.
Préserver la sortie déterministe et n’ajouter pas de branches cibles spécifiques au framework
à l'assistant de construction neutre.
