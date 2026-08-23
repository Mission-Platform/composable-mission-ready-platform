# Développer le plugin Forge Vite

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> vite-plugins/forge/docs/guides/development.md: [vite-plugins/forge/docs/guides/development.md](../../../guides/development.md)
> Langue: Français (fr)

## Installer et vérifier

Exécutez des vérifications ciblées à partir de la racine du référentiel :

```bash
pnpm install
pnpm --filter @mission-platform/vite-plugin-forge build:check
pnpm --filter @mission-platform/vite-plugin-forge test
```

Construisez avec `pnpm --filter @mission-platform/vite-plugin-forge build`. Forfaits
et les déclarations sont émises vers `dist/` ; ne validez pas la sortie de construction locale.

## Changer le compilateur

Gardez l’analyse, la normalisation, l’IR sémantique, la mise en cache et les diagnostics neutres.
L'abaissement de la cible et la génération de la source appartiennent au groupe sélectionné.
Package `@mission-platform/forge-plugin-*`. Ajouter une couverture de régression pour le cache
identité, invalidation, diagnostics, artefacts générés et plug-in de l'appelant
préservation lors du changement de pilote.

Le package doit rester utilisable à la fois depuis Vite et tsdown. Ne pas ajouter de cible
basculez la dépendance d’exécution de la table ou du framework vers le pilote neutre. Mettre à jour le
[référence du pipeline du compilateur](../reference/compiler.md) lorsqu'une scène publique ou
modifications du contrat d’artefact.
