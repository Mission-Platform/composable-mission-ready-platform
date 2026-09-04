# Meilleures pratiques de la plateforme de mission

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/best-practices.md: [docs/best-practices.md](../../best-practices.md)
> Langue: Français (fr)

Ce document décrit les principes fondamentaux, l'architecture et les normes de codage du monorepo Mission Platform. Il
sert d'**explication** des raisons pour lesquelles nous suivons certains modèles et de **ligne directrice** pour le développement quotidien.

## Principes fondamentaux

### Architecture composable

Mission Platform suit une architecture composable et pilotée par packages. Blocs de construction réutilisables (composants d'interface utilisateur,
composables, utilitaires) vivent dans `packages/`, tandis que les applications déployables sont assemblées à partir de ces blocs dans `apps/`.

### Discipline de la dépendance

Pour maintenir un monorepo maintenable, nous appliquons un flux de dépendances unidirectionnel strict :

- **`apps`** → **`packages`** / **`packages/tooling/vite`** / **`packages/edge/workers`**
- **`packages`** / **`packages/tooling/vite`** / **`packages/edge/workers`** → **`packages/tooling/configs`**
- **`apps`** → **`packages/tooling/configs`** (Directement pour la configuration d'outillage/build)

**Règle :** Coder dans `packages/` ne doit **jamais** importer depuis `apps/`. Cela évite les dépendances circulaires et garantit
les emballages restent véritablement réutilisables.

### Livre d'histoires comme établi

Lors de l'ajout ou de la modification de composants dans `packages/`, utilisez l'application Storybook (`apps/storybook`) comme votre développement principal
environnement. Le `apps/storybook` l'application ne contient pas les histoires elle-même - c'est l'atelier d'agrégation qui
découvre et restitue les histoires qui vivent aux côtés de leurs composants.

- Co-localiser chacun `.stories.tsx` fichier avec son composant dans le répertoire du package de ce composant (par ex.
  `packages/ui/components/src/components/**/<component>/<component>.stories.tsx`), pas sous `apps/storybook`. Cela correspond
  la convention en [Conception de composants atomiques](atomic-component-design.md).
- Vérifier le comportement des composants Vue, React, Svelte, Solidet les composants Web en commutant le
  `STORYBOOK_FRAMEWORK` variable d'environnement. Chaque mode doit consommer le même inventaire d’histoire neutre ; un disparu
  L'artefact de framework est un échec de package/d'exportation, pas une raison pour filtrer cette histoire.

La boucle de validation statique complète est :

```bash
for framework in vue react svelte solid web-component; do
  STORYBOOK_FRAMEWORK="$framework" pnpm --filter @mission-platform/storybook run build-storybook
done
```

## Normes de développement

### TypeScript Partout

Tout nouveau code source doit être écrit en TypeScript (`.ts`) ou Vue SFC avec `<script setup lang="ts">`.

- **Mode strict** : `strict: true` est appliqué dans tous `tsconfig.json` fichiers.
- **Types explicites** : fournissez des types explicites pour toutes les API publiques, fonctions exportées et composables.
- **Éviter `any`** : Utilisez des types précis ou des génériques. Si un type est vraiment inconnu, utilisez `unknown` et effectuez un rétrécissement du type.

### Composants neutres par rapport au framework

Dans la mesure du possible, créez des composants d'interface utilisateur à l'aide du `@mission-platform/forge-jsx` dialecte. Cela permet aux composants d'être
compilé et utilisé dans Vue, React, Svelte, Solidet les composants Web sans réécrire la logique de base. Configurez le
le résolveur du consommateur avec la correspondance `mp:vue`, `mp:react`, `mp:svelte`, `mp:solid`, ou `mp:web-component` condition.

### Modèles de réactivité (Vue 3)

- Utilisez exclusivement l'**API de composition**.
- Préférer `ref()` pour la plupart des États de maintenir la cohérence.
- Extraire une logique avec état complexe dans **Composables** (`useXxx`).
- Assurez-vous que tous les effets secondaires (observateurs, intervalles, auditeurs d'événements) sont correctement nettoyés dans `onUnmounted`.

## Flux de travail Monorepo

### Isolement des préoccupations

- **Nouveaux composants de l'interface utilisateur** : appartiennent à `packages/`.
- **Utilitaires partagés** : appartiennent à `packages/`.
- **Lint/Format/Build Tooling** : les configurations partagées appartiennent à `packages/tooling/configs/`.

### Pelucheux et formatage

Un style de code cohérent est appliqué via ESLint et Prettier.

- Courir `pnpm lint` pour vérifier les violations.
- Courir `pnpm format:write` pour résoudre automatiquement les problèmes de formatage.
- Les messages de validation doivent suivre la spécification **Conventional Commits**.

## Optimisation des performances

- **Code Splitting** : utiliser la dynamique `import()` pour les fonctionnalités non critiques et les grandes bibliothèques.
- **Optimisation des actifs** : préférez les formats d'image modernes (WebP/AVIF) et assurez-vous que tous les actifs statiques sont compressés.
- **Surcharge de réactivité** : Utilisation `shallowRef` pour les objets volumineux qui ne nécessitent pas de réactivité profonde.

## Tests et documentation

- **Développement piloté par les tests** : chaque nouvelle fonctionnalité ou correction de bug doit être accompagnée de tests unitaires (`.spec.ts`).
- **Documentation Diataxis** : Documentation d'auteur suivant le framework Diátaxis (Tutoriels, Comment faire, Référence,
  Explication).
- **TSDoc** : utilisez TSDoc/JSDoc pour toutes les méthodes et propriétés publiques afin d'alimenter l'intelligence de l'IDE.

## Ressources connexes

- [Guide de test](testing.md)
- [Meilleures pratiques du cadre](framework-best-practices.md)
- [Structure de l'espace de travail](workspace-structure.md)
- [Dépannage](troubleshooting.md)
