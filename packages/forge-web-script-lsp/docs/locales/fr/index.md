# @mission-platform/forge-web-script-lsp

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/forge-web-script-lsp/docs/index.md: [packages/forge-web-script-lsp/docs/index.md](../../index.md)
> Langue: Français (fr)

Le serveur stdio Language Server Protocol pour Forge Web Script v1. Le paquet
possède le comportement de transport et d'espace de travail face à l'éditeur ; la sémantique du langage demeure
propriété de `@mission-platform/forge-web-script`.

## Commencez ici

- [Référence des outils linguistiques](reference/language-service.md) — diagnostic,
  achèvement, survol, jetons sémantiques et limites prises en charge.
- [Guide de construction et de test](guides/development.md) — vérifications du serveur local et
  montages protocolaires.
- [`llms.txt` dans le package de langue](../../../../forge-web-script/llms.txt) — noyau
  Notes sur l'API du langage.

Le serveur nécessite Node.js `>=24.0.0` et expose le `forge-web-script-lsp`
binaire avec les sous-chemins des modules `server` et `workspace`.
