# Développer WebLua

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/web-lua/docs/guides/development.md: [packages/web-lua/docs/guides/development.md](../../../guides/development.md)
> Langue: Français (fr)

## Installer et vérifier

Exécutez les vérifications ciblées à partir de la racine du référentiel :

```bash
pnpm install
pnpm --filter @mission-platform/web-lua build:check
pnpm --filter @mission-platform/web-lua test
```

Construisez avec `pnpm --filter @mission-platform/web-lua build`. Sortie du navigateur,
Sortie Node et les déclarations sont émises vers `dist/` et `dist-node/`.

## Modifications de compatibilité

Ajoutez des preuves déterministes au niveau de l'invité avant de modifier une ligne de compatibilité.
Mettez à jour `src/compatibility.ts`, ses tests et la table de référence ensemble.
Utilisez `matched` uniquement pour les comportements couverts par un accessoire déterministe ;
`capability-gated` pour les exigences explicites de la politique d'hôte ; et `unresolved` pour
comportement qui ne doit pas être traité comme passager.

Conservez le runtime comme propriété des invités et avec refus de capacité par défaut. Adaptateurs Node uniquement
appartiennent à l'export `./node` et ne doivent pas s'infiltrer dans l'entrée du navigateur.
