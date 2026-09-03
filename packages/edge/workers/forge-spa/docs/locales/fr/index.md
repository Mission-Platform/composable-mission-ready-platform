# @mission-platform/forge-spa

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/edge/workers/forge-spa/docs/index.md: [packages/edge/workers/forge-spa/docs/index.md](../../index.md)
> Langue: Français (fr)

Le point d'entrée Cloudflare Worker partagé pour Mission Platform SPA et SSG
déploiements. Il délègue les requêtes à la liaison `ASSETS` et est consommé par
applications plutôt que déployées indépendamment.

## Intégrer le travailleur

Créez le package, puis référencez son gestionnaire compilé à partir du fichier d'une application consommatrice.
Configuration Wrangler :

```bash
pnpm --filter @mission-platform/forge-spa build
```

La configuration du consommateur doit définir `main` sur
`packages/edge/workers/forge-spa/dist/index.js` et liez son répertoire d'application `dist/` comme
`ASSETS` avec gestion de secours SPA. Le site Web et mes notes de soins sont à jour
consommateurs.

Le travailleur ne possède aucune route d'application, actif, domaine ou environnement.
secrets. Ceux-ci restent dans le package d’application consommateur.

- [Guide de développement](guides/development.md)
- [`README.md`](../../../README.md)
