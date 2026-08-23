# Développer le proxy d'API

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> workers/api-proxy/docs/guides/development.md: [workers/api-proxy/docs/guides/development.md](../../../guides/development.md)
> Langue: Français (fr)

Exécutez les vérifications ciblées à partir de la racine du référentiel :

```bash
pnpm --filter @mission-platform/api-proxy build:check
pnpm --filter @mission-platform/api-proxy test
pnpm --filter @mission-platform/api-proxy build
```

La build émet `dist/index.js` et des déclarations. Gardez le gestionnaire compatible
avec le runtime Cloudflare Workers : utilisez l'objet typé `env` pour les liaisons
et n'ajoutez pas de composants intégrés Node.js. Ajouter des tests pour les listes d'autorisation d'itinéraire, nettoyés
en-têtes, transfert de requêtes et échecs en amont lors du changement de gestionnaire.
