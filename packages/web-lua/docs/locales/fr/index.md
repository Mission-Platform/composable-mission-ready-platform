# @mission-platform/web-lua

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/web-lua/docs/index.md: [packages/web-lua/docs/index.md](../../index.md)
> Langue: Français (fr)

Fondation d'exécution Lua appartenant à des invités, compilée à partir de Forge Web Script. Ce paquet
est propriétaire du contrat de compatibilité d'exécution et de sa limite de capacité d'hôte.

## Commencez ici

- [Référence de compatibilité Lua 5.5.1](reference/compatibility.md) — testé,
  comportement lié aux capacités et non résolu.
- [Guide de construction et de test](guides/development.md) — appareils d'exécution et sortie
  contraintes.
- Le README du package et la référence générée fournissent des notes concises sur l'API du package.

L'entrée du navigateur est `@mission-platform/web-lua` ; Les consommateurs Node utilisent le
exportation explicite `@mission-platform/web-lua/node`. Les effets de l'hôte sont refusés par
par défaut et nécessitent une politique de capacité explicite.
