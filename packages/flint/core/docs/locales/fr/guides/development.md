# Développer le silex

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/flint/core/docs/guides/development.md: [packages/flint/core/docs/guides/development.md](../../../guides/development.md)
> Langue: Français (fr)

Ce guide est destiné aux contributeurs modifiant l'analyseur Flint, vérifié
contrats ou conditions de conformité.

## Installez et vérifiez le package

Depuis la racine du référentiel, installez les dépendances et exécutez les vérifications du package :

```bash
pnpm install
pnpm --filter @mission-platform/flint build:check
pnpm --filter @mission-platform/flint test
```

Exécutez `pnpm --filter @mission-platform/flint build` avant la publication.
La version émet le bundle sécurisé pour le navigateur et les fichiers de déclaration sous `dist/`.

## Ajouter un changement de langue

Mettez à jour la grammaire et le frontend vérifié ensemble. Ajoutez un appareil ciblé à
`src/fixtures/` et un test de régression pour les diagnostics ou le comportement généré.
Conservez la version linguistique `1.0` et la version ABI `1.2` explicites, sauf si la modification est
une révision de compatibilité intentionnelle. Les modifications ABI doivent mettre à jour les manifestes,
chargeurs et la documentation de compatibilité.

Le package est sécurisé pour le navigateur. N'ajoutez pas d'API Node uniquement à la façade publique ;
Les outils spécifiques à Node appartiennent à `@mission-platform/flint-cli`.

## Artefacts générés et sources

Les sources `.flint` enregistrées sous `src/self-hosted/fws/` sont des artefacts source,
pas de JavaScript copié à la main. Conserver la sortie générée dans `dist/` et ne pas valider
sortie de construction locale. La référence à la documentation du package est conservée à côté
le package et sera régénéré par le workflow d’extraction de la documentation.

## Inspection du pipeline à deux étages

La limite canonique de l’interface frontale est le graphe déterministe Sea-of-Nodes. Le
le graphique est optimisé avant de descendre à Wasm IR, où un deuxième optimiseur s'applique
propagation sécurisée pour le backend, suppression des codes morts, simplification des adresses, changement
abaissement et disposition déterministe. Gardez les deux étapes auditables : optimiseur
les rapports et la politique de limites sélectionnée doivent être conservés dans les artefacts du compilateur.

Utilisez des contrôles de limites d'exécution à moins qu'une règle de production de preuves n'établisse chaque
accès aussi sûr. `proven-safe` et `excluded-by-profile` sont des politiques explicites
valeurs, pas un comportement de version implicite. Un artefact de cache `.sonir.json` est
données de diagnostic uniquement ; les lecteurs doivent valider son schéma, ses hachages, sa politique et
limites avant de l’afficher, et ne doit jamais exécuter le contenu du graphique.

Pour les contrôles de fumée CLI :

```bash
flint check src/example.flint --bounds-checks runtime --optimizer-report --format json
flint inspect-sonir .cache/example.sonir.json --format json
```

Lorsque vous modifiez l'analyse, ajoutez des faits et un test de diagnostic stable avant de modifier
une règle d'optimisation. L'analyse du développement doit exposer des plages inconnues,
États d'alias/durée de vie, changement de couverture et transmission des métadonnées ; une analyse rigoureuse doit
bloquer les demandes de politiques de limites dangereuses et les violations de région/propriété.
