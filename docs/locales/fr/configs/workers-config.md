# Répertoire de déploiement des nœuds de calcul

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/packages/tooling/configs/workers-config.md: [docs/packages/tooling/configs/workers-config.md](../../../packages/tooling/configs/workers-config.md)
> Langue: Français (fr)

La documentation d'implémentation du Worker appartient à côté de chaque Worker publiable :

- [`@mission-platform/api-proxy`](../../../../packages/edge/workers/api-proxy/docs/locales/fr/index.md) - proxy API en lecture seule contraint.
- [`@mission-platform/email-sender`](../../../../packages/edge/workers/email-sender/docs/locales/fr/index.md) - expéditeur local soutenu par MailPit.
- [`@mission-platform/forge-spa`](../../../../packages/edge/workers/forge-spa/docs/locales/fr/index.md) - partagé `ASSETS` Gestionnaire de secours SPA.

Cette page de projet conserve uniquement la carte de déploiement inter-espaces de travail. Ouvrier
les packages possèdent leurs contrats de gestionnaire, leurs exemples, leurs tests et leurs instructions de construction ;
les packages d'application possèdent des routes, des domaines, des liaisons et un déploiement
environnements.

## Carte de déploiement d'applications

| Demande | Gestionnaire | Configuration | Actifs |
| :---------- | :------ | :------------ | :----- |
| Site Web | `packages/edge/workers/forge-spa/dist/index.js` | `apps/website/wrangler.jsonc` | `apps/website/dist/`, lié comme `ASSETS` |
| Mes notes de soins | `packages/edge/workers/forge-spa/dist/index.js` | `apps/my-care-notes/wrangler.jsonc` | `apps/my-care-notes/dist/`, lié comme `ASSETS` |
| Moniteur de services | `apps/service-monitor/src/worker.tsx` | `apps/service-monitor/wrangler.jsonc` | `apps/service-monitor/public/`, lié comme `ASSETS` |
| Documents | Actifs statiques | `apps/docs/wrangler.jsonc` | `apps/docs/dist/` |

Le site Web et mes notes de soins consomment le travailleur Forge SPA partagé. Moniteur de services
possède son point d’entrée Worker et sa liaison Durable Object. Le site de documentation est un
statique Vite déploiement et n’a pas de point d’entrée Worker ; Le livre d'histoires n'est pas un
cible de déploiement.

Déployer à partir du package d'application dont Wrangler configuration est propriétaire du
itinéraire et environnement. Gardez les secrets de la configuration et de l'utilisation suivies
Stockage secret Cloudflare pour les valeurs sensibles. Voir les informations spécifiques à l'application
les scripts de déploiement et les guides des travailleurs locaux du package pour la mise en œuvre
détails.
