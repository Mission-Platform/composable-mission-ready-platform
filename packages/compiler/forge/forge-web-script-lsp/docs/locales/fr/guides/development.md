# Développer le serveur du langage Forge Web Script

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/forge-web-script-lsp/docs/guides/development.md: [packages/forge-web-script-lsp/docs/guides/development.md](../../../guides/development.md)
> Langue: Français (fr)

## Installer et vérifier

Exécutez les vérifications ciblées des packages à partir de la racine du référentiel :

```bash
pnpm install
pnpm --filter @mission-platform/forge-web-script-lsp build:check
pnpm --filter @mission-platform/forge-web-script-lsp test
```

Construisez avec `pnpm --filter @mission-platform/forge-web-script-lsp build`. Le
le résultat est émis vers `dist/` ; la sortie locale n’est pas un artefact source.

## Modifications du protocole

Conserver les diagnostics, les plages UTF-16, les symboles, l'achèvement, le survol et le jeton sémantique
comportement aligné sur le package de services linguistiques. Ajouter une régression de protocole
accessoire pour chaque nouvelle demande ou capacité. Le LSP ne fournit pas actuellement
accès à la définition, références, renommage, formatage, actions de code, fichiers croisés
des importations de langue ou un transport hébergé par un navigateur.

Le serveur est basé sur stdio et uniquement Node. L'intégration de l'éditeur de navigateur appartient à
l'adaptateur local du package de service de langue plutôt que ce serveur.
