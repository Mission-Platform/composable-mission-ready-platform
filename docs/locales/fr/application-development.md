# Développement d'applications

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/application-development.md: [docs/application-development.md](../../application-development.md)
> Langue: Français (fr)

Ce guide pratique explique comment exécuter, tester et déployer les applications dans `apps/`. Les applications composent réutilisable
forfaits; les composants partagés, les composables, les utilitaires et la configuration appartiennent à leur propre espace de travail au lieu d'être
copié dans une application.

## Choisissez une application

| Demande | Développement local | Construire | Déploiement |
|:---|:---|:---|:---|
| `@mission-platform/docs` | `pnpm --filter @mission-platform/docs dev` | `pnpm --filter @mission-platform/docs build` | Prévisualiser ou déployer via son hébergeur |
| `@mission-platform/website` | `pnpm --filter @mission-platform/website dev` | `pnpm --filter @mission-platform/website build` | `pnpm --filter @mission-platform/website deploy:staging` |
| `@mission-platform/my-care-notes` | `pnpm --filter @mission-platform/my-care-notes dev` | `pnpm --filter @mission-platform/my-care-notes build` | `pnpm --filter @mission-platform/my-care-notes deploy:staging` |
| `@mission-platform/service-monitor` | `pnpm --filter @mission-platform/service-monitor dev` | `pnpm --filter @mission-platform/service-monitor build` | `pnpm --filter @mission-platform/service-monitor deploy:staging` |
| `@mission-platform/storybook` | `pnpm --filter @mission-platform/storybook dev` | `pnpm --filter @mission-platform/storybook build` | Utiliser le flux de travail Storybook/Chromatic configuré |

Le dossier de candidature possède son Vite ou Wrangler configuration. Ne cours pas `wrangler deploy` d'un travailleur réutilisable
package sauf si ce package a son propre `wrangler.jsonc`.

## Développer un changement

1. Démarrez l'application cible avec son package `dev` scénario.
2. Apportez des modifications réutilisables dans `packages/` et les changements de composition spécifiques à l'application dans `apps/<name>/`.
3. Créez l'application modifiée et ses dépendances :

```bash
   pnpm exec turbo run build --filter @mission-platform/<app>...
   ```

4. Exécutez des tests, du lint, des vérifications de style et du formatage pour l'espace de travail concerné :

```bash
   pnpm exec turbo run test lint lint:style format --filter @mission-platform/<app>
   ```

Pour un changement de package partagé, remplacez `<app>` avec le nom du package et son utilisation `...` lorsque vous avez besoin d'espaces de travail dépendants
inclus dans le graphique de construction.

## Documentation statique et création de sites Web

Les documents et les applications de sites Web utilisent `vite-ssg`. Une version de production génère des routes statiques à partir du contenu source et
catalogues locaux. Vérifiez la sortie générée avec le package `preview` scénario:

```bash
pnpm --filter @mission-platform/docs build
pnpm --filter @mission-platform/docs preview

pnpm --filter @mission-platform/website build
pnpm --filter @mission-platform/website preview
```

Conserver la documentation Markdown sous `docs/` et les messages du site Web dans le catalogue local propriétaire. N'ajoutez pas une seconde
copie au moment du rendu de l'une ou l'autre source.

## Développement et déploiement Cloudflare

Les candidatures avec un `wrangler.jsonc` exposez les commandes sensibles à l'environnement :

```bash
pnpm --filter @mission-platform/website cf:dev
pnpm --filter @mission-platform/my-care-notes cf:dev
pnpm --filter @mission-platform/service-monitor dev

pnpm --filter @mission-platform/website deploy:staging
pnpm --filter @mission-platform/my-care-notes deploy:staging
pnpm --filter @mission-platform/service-monitor deploy:staging
```

Utiliser `wrangler secret put` pour les secrets. Conserver les liaisons et les valeurs par défaut non secrètes dans `wrangler.jsonc`, et vérifiez le
l'environnement sélectionné avant le déploiement.

## Guides associés

- [Configuration du développement](development-setup.md)
- [Structure de l'espace de travail](workspace-structure.md)
- [Construire un système](build-system.md)
- [Configuration du travailleur](packages/tooling/configs/workers-config.md)
- [Essai](testing.md)
