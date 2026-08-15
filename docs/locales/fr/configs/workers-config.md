# Configuration et développement des travailleurs

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> Source anglaise: [docs/configs/workers-config.md](../../../configs/workers-config.md)
> Langue: Français (fr)

Ce document décrit les Cloudflare Workers dans le monorepo Mission Platform, leur TypeScript points d'entrée, et le
fichiers de configuration utilisés pour les exécuter ou les déployer.

## Inventaire des travailleurs

Les packages de travailleurs autonomes se trouvent sous `workers/`:

| Travailleur | Gestionnaire | Configuration | Objectif |
| :----- | :------ | :------------ | :------ |
| `api-proxy` | `workers/api-proxy/src/index.ts` | Aucun; consommé sous forme de forfait groupé | Proxy API en lecture seule contraint |
| `email-sender` | `workers/email-sender/src/index.ts` | `workers/email-sender/wrangler.jsonc` | Travailleur de vitrine de courrier électronique soutenu par MailPit |
| `forge-spa` | `workers/forge-spa/src/index.ts` | Aucun; consommé sous forme de forfait groupé | `ASSETS`gestionnaire de secours SPA de liaison |

Les Workers d'application déployables sont :

| Demande | Gestionnaire | Configuration |
| :---------- | :------ | :------------ |
| Site Web | `workers/forge-spa/dist/index.js` | `apps/website/wrangler.jsonc` |
| Mes notes de soins | `workers/forge-spa/dist/index.js` | `apps/my-care-notes/wrangler.jsonc` |
| Moniteur de services | `apps/service-monitor/src/worker.tsx` | `apps/service-monitor/wrangler.jsonc` |

`api-proxy` et `forge-spa` je n'ai pas de système autonome Wrangler fichiers de configuration : leur `src/index.ts` les gestionnaires sont
regroupé par `tsdown` et référencé par l'application Wrangler configurations ou un déploiement consommateur.

## Construire un système

Utilisation des packages de travail `tsdown` pour le regroupement. Utilisez la tâche de package via Turborepo ou pnpm donc les dépendances de l'espace de travail sont
résolu de manière cohérente :

```bash
pnpm exec turbo run build --filter=@mission-platform/api-proxy
pnpm exec turbo run build --filter=@mission-platform/forge-spa
pnpm exec turbo run build --filter=@mission-platform/email-sender
```

Utilisation des tests de travailleurs Vitest:

```bash
pnpm --filter @mission-platform/api-proxy test
pnpm --filter @mission-platform/email-sender test
pnpm --filter @mission-platform/forge-spa test
```

Utiliser `@cloudflare/workers-types` pour les types de gestionnaire et de liaison. Les déclarations de liaison générées par l'expéditeur de l'e-mail sont
écrit à `workers/email-sender/src/worker-configuration.d.ts` par son `types` scénario.

## Configuration et développement local

Les travailleurs reçoivent des valeurs d'exécution via le `env` objet et liaisons Cloudflare. Ne mettez pas de secrets dans le suivi
`wrangler.jsonc` fichiers; utiliser `wrangler secret put` pour les valeurs sensibles.

Pour l'expéditeur d'e-mail autonome, exécutez son Wrangler serveur de développement à partir du package workspace :

```bash
pnpm --filter @mission-platform/email-sender dev
```

Pour les applications déployables, utilisez les scripts de chaque package d'application. Par exemple, le site Web et Mes notes de soins Wrangler
les fichiers fournissent `staging` et `production` environnements, tandis que Service Monitor fournit un `staging` environnement:

```bash
pnpm --filter @mission-platform/website cf:dev
pnpm --filter @mission-platform/my-care-notes cf:dev
pnpm --filter @mission-platform/service-monitor dev
```

## Déploiement

Déployer à partir du package d'application dont `wrangler.jsonc` est propriétaire de l'itinéraire et de l'environnement :

```bash
pnpm --filter @mission-platform/website deploy:staging
pnpm --filter @mission-platform/my-care-notes deploy:staging
pnpm --filter @mission-platform/service-monitor deploy:staging
```

Les packages de travail autonomes sans Wrangler configuration ne sont pas déployées directement avec `wrangler deploy`; construire
leurs gestionnaires et les déployer via la configuration de l'application consommatrice.

## Meilleures pratiques

- Regroupez les dépendances dans la sortie du travailleur pour une exécution Edge prévisible.
- Utilisez le `env` objet transmis au `fetch` gestionnaire au lieu de variables de processus globales.
- Éviter NodeIntégrés .js non pris en charge par le runtime Workers, tels que `fs` et `child_process`, chez les manutentionnaires.
- Gardez les bundles de travailleurs petits pour minimiser les démarrages à froid et rester dans les limites des ressources Cloudflare.
