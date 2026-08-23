# @mission-platform/api-proxy

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> workers/api-proxy/docs/index.md: [workers/api-proxy/docs/index.md](../../index.md)
> Langue: Français (fr)

Un exemple de Cloudflare Worker qui proxy les routes d'API en lecture seule approuvées vers un
service fixe en amont. Cet espace de travail est propriétaire de la politique de demande, en-tête
désinfection et limite d'erreur pour le gestionnaire de proxy.

## Utiliser le travailleur

Le package exporte son gestionnaire fourni à partir de `@mission-platform/api-proxy`.
Construisez-le avant de référencer `dist/index.js` à partir d'une configuration Wrangler :

```bash
pnpm --filter @mission-platform/api-proxy build
```

Seules les requêtes `GET` et `HEAD` adressées à `/users` et `/v1` sont acceptées. Requête
les chaînes sont transmises ; informations d'identification, le `Host` d'origine et saut par saut
les en-têtes sont supprimés. Les échecs en amont ou lors de la construction de la demande renvoient `502`.

## Limites

Le package n'a pas de configuration de déploiement Wrangler archivée et n'est pas un
proxy inverse à usage général. Ajoutez une configuration de déploiement explicite et
examinez les modifications d’authentification, en amont et de mise en cache avant de les exposer.

- [Guide de développement](guides/development.md)
- [`README.md`](../../../README.md)
