# Développer le package de jetons

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/tokens/docs/guides/development.md: [packages/tokens/docs/guides/development.md](../../../guides/development.md)
> Langue: Français (fr)

## Installer et vérifier

Exécutez les vérifications des packages à partir de la racine du référentiel :

```bash
pnpm install
pnpm --filter @mission-platform/tokens lint
pnpm --filter @mission-platform/tokens lint:style
pnpm --filter @mission-platform/tokens build
```

La build produit du JavaScript et une sortie de déclaration dans `dist/`. Généré
Les sources SCSS et TypeScript sous `src/generated/` sont des artefacts dérivés et
doit rester déterministe.

## Changer un jeton

Modifiez le JSON source sous `tokens/` et conservez son chemin DTCG stable à moins que le
le changement est intentionnel et documenté. Les contrats de composants sont régis par
`tokens/component/<atomic-level>/` ; les sources de composants ne doivent pas dupliquer
chemins de jetons partagés. Utilisez les scripts de génération de jetons existants et examinez les deux
Sortie SCSS et TypeScript avant la publication.

Le package est neutre en termes de framework. Le comportement du thème est sélectionné par le consommateur
feuille de style via les points d’entrée SCSS exportés ; ce paquet ne possède pas
état du thème d’application ou balisage des composants.
