# @mission-platform/vite-plugin-forge

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> vite-plugins/forge/docs/index.md: [vite-plugins/forge/docs/index.md](../../index.md)
> Langue: Français (fr)

Le pilote du compilateur Forge indépendant du framework pour Vite et tsdown. Ce paquet
possède l'analyse, la normalisation, l'analyse sémantique, l'optimisation neutre, la mise en cache,
répartition cible et orchestration de build générique ; framework et sortie CMS
les packages possèdent leur abaissement et leur génération spécifiques à la cible.

## Commencez ici

- [Référence du pipeline du compilateur](reference/compiler.md) — contrats d'étape,
  propriété de la cible, mise en cache, diagnostics et artefacts générés.
- [Guide de construction et de test](guides/development.md) — développement local et
  contrôles d'intégration.
- [`README.md`](../../../README.md) — configuration consommateur et représentant
  Exemples Vite/tsdown.
- [`llms.txt`](../../../llms.txt) — Notes concises sur l'API du package et le pipeline.

Le pilote nécessite un `FrameworkOutputPlugin` explicite ; il ne sélectionne jamais un
framework à partir d’une chaîne ou importez chaque package cible. Les modules générés sont
artefacts intermédiaires et doivent être compilés par le développeur natif de la cible sélectionnée.
adaptateur.
