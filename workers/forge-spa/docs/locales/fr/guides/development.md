# Développer le travailleur Forge SPA

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> workers/forge-spa/docs/guides/development.md: [workers/forge-spa/docs/guides/development.md](../../../guides/development.md)
> Langue: Français (fr)

Exécutez les vérifications des packages à partir de la racine du référentiel :

```bash
pnpm --filter @mission-platform/forge-spa build:check
pnpm --filter @mission-platform/forge-spa test
pnpm --filter @mission-platform/forge-spa build
```

La build émet `dist/index.js` et des déclarations. Gardez le gestionnaire limité à
la délégation tapée `ASSETS.fetch(request)` et la redirection de demande de test. Tester
et déployer des routes d'application à partir de l'application consommatrice ; ne pas ajouter d'application
configuration ou actifs à ce travailleur partagé.
