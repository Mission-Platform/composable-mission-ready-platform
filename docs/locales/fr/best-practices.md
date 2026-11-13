# Meilleures pratiques de la plateforme de mission

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/best-practices.md: [docs/best-practices.md](../../best-practices.md)
> Langue: Français (fr)

Ce document décrit les principes fondamentaux, l'architecture et les normes de codage du monorepo Mission Platform. Il
sert d'**explication** des raisons pour lesquelles nous suivons certains modèles et de **ligne directrice** pour le développement quotidien.

## Principes fondamentaux

### Architecture composable

Mission Platform suit une architecture composable et pilotée par packages. Blocs de construction réutilisables (composants d'interface utilisateur,
composables, utilitaires) résident dans `packages/`, tandis que les applications déployables sont assemblées à partir de ces blocs dans `apps/`.

### Discipline de la dépendance

Pour maintenir un monorepo maintenable, nous appliquons un flux de dépendances unidirectionnel strict :

- **`apps`** → **`packages`**
- **`packages`** → packages de domaines de niveau inférieur tels que **`core`**, **`tooling`** et **`compiler`**

**Règle :** Le code dans `packages/` ne doit **jamais** être importé depuis `apps/`. Cela évite les dépendances circulaires et garantit
les emballages restent véritablement réutilisables.

### Livre d'histoires comme établi

Lors de l'ajout ou de la modification de composants dans `packages/`, utilisez l'application Storybook (`apps/storybook`) comme principal outil de développement.
environnement. L'application `apps/storybook` ne contient pas les histoires elle-même : c'est l'atelier d'agrégation qui
découvre et restitue les histoires qui vivent aux côtés de leurs composants.

- Co-localisez chaque fichier `.stories.tsx` avec son composant dans le répertoire du package de ce composant (par ex.
  `packages/ui/components/src/components/**/<component>/<component>.stories.tsx`), pas sous `apps/storybook`. Cela correspond
  la convention dans [Atomic Component Design](atomic-component-design.md).
- Vérifiez le comportement des composants dans Vue, React, Svelte, Solid et les composants Web en commutant le
  Variable d'environnement `STORYBOOK_FRAMEWORK`. Chaque mode doit consommer le même inventaire d’histoire neutre ; un disparu
  L'artefact de framework est un échec de package/d'exportation, pas une raison pour filtrer cette histoire.

La boucle de validation statique complète est :

```bash
for framework in vue react svelte solid web-component; do
  STORYBOOK_FRAMEWORK="$framework" pnpm --filter @mission-platform/storybook run build-storybook
done
```

## Normes de développement

### TypeScript Partout

Tout nouveau code source doit être écrit dans les SFC TypeScript (`.ts`) ou Vue avec `<script setup lang="ts">`.

- **Mode strict** : `strict: true` est appliqué à tous les fichiers `tsconfig.json`.
- **Types explicites** : fournissez des types explicites pour toutes les API publiques, fonctions exportées et composables.
- **Évitez `any`** : utilisez des types précis ou des génériques. Si un type est vraiment inconnu, utilisez `unknown` et effectuez un rétrécissement du type.

### Composants neutres par rapport au framework

Dans la mesure du possible, créez des composants d’interface utilisateur à l’aide du dialecte `@mission-platform/forge-jsx`. Cela permet aux composants d'être
compilé et utilisé dans Vue, React, Svelte, Solid et les composants Web sans réécrire la logique de base. Configurez le
résolveur du consommateur avec la condition correspondante `mp:vue`, `mp:react`, `mp:svelte`, `mp:solid` ou `mp:web-component`.

### Modèles de réactivité (Vue 3)

- Utilisez exclusivement l'**API de composition**.
- Préférez `ref()` pour la plupart des états afin de maintenir la cohérence.
- Extrayez la logique avec état complexe dans **Composables** (`useXxx`).
- Assurez-vous que tous les effets secondaires (observateurs, intervalles, écouteurs d'événements) sont correctement nettoyés dans `onUnmounted`.

## Flux de travail Monorepo

### Isolement des préoccupations

- **Nouveaux composants de l'interface utilisateur** : appartiennent à `packages/`.
- **Utilitaires partagés** : appartiennent à `packages/`.
- **Lint/Format/Build Tooling** : les configurations partagées appartiennent à `packages/tooling/configs/`.

### Pelucheux et formatage

Un style de code cohérent est appliqué via ESLint et Prettier.

- Exécutez `pnpm lint` pour vérifier les violations.
- Exécutez `pnpm format:write` pour résoudre automatiquement les problèmes de formatage.
- Les messages de validation doivent suivre la spécification **Conventional Commits**.

### Amorçage des dépendances en amont et tests de packages

Dans un monorepo modulaire, les packages en aval importent fréquemment les sorties de build (`dist/`) des packages en amont. Pour éliminer les échecs des tests à l’état propre et éviter de suivre manuellement l’ordre de construction de plusieurs packages :

1. **Amorçage automatisé de la construction en amont (`^build`)** :
   Les graphiques de tâches `turbo.json` définissent `test`, `build:check` et les tâches de vérification avec `"dependsOn": ["^build"]`. L’exécution de n’importe quelle tâche de test ou de vérification de type via Turborepo crée automatiquement en premier toutes les dépendances de l’espace de travail en amont.

2. **Exécution à l'échelle du package** :
   Pour tester ou créer un package individuel sans compiler manuellement les prérequis :
   - Exécuter des tests avec amorçage :
     ```bash
     pnpm test:package <package-name>
     ```
     ou directement via Turborepo :
     ```bash
     pnpm exec turbo run test --filter <package-name>
     ```
   - Construire un package avec ses dépendances :
     ```bash
     pnpm build:package <package-name>
     ```
     ou directement via Turborepo :
     ```bash
     pnpm exec turbo run build --filter <package-name>
     ```

   Dans les filtres Turbo, `<package-name>...` sélectionne le package ET son amont
   dépendances, `...<package-name>` sélectionne le package ET son aval
   dépendants, et `<package-name>^...` sélectionne uniquement les éléments en amont du package
   dépendances (à l'exclusion du package lui-même). Les assistants de package s'exécutent explicitement
   le formulaire amont (`<package-name>^...`) en premier donc direct des workflows de package
   avoir un échauffement prévisible et pouvant être mis en cache ; la dépendance `^build` du graphe de tâches
   reste le filet de sécurité pour les invocations directes de Turborepo.

3. **Provisionnement de l'arbre de travail** :
   Lorsque de nouveaux arbres de travail Git sont provisionnés via `pnpm worktree:create` ou initialisés via `pnpm worktree:setup`, les dépendances en amont sont automatiquement amorcées avant d'exécuter des contrôles de validation, garantissant ainsi que les arbres de travail nouvellement créés sont immédiatement opérationnels.

## Optimisation des performances

- **Code Splitting** : utilisez `import()` dynamique pour les fonctionnalités non critiques et les grandes bibliothèques.
- **Optimisation des actifs** : préférez les formats d'image modernes (WebP/AVIF) et assurez-vous que tous les actifs statiques sont compressés.
- **Surcharge de réactivité** : utilisez `shallowRef` pour les objets volumineux qui ne nécessitent pas de réactivité importante.

## Tests et documentation

- **Développement piloté par les tests** : chaque nouvelle fonctionnalité ou correction de bug doit être accompagnée de tests unitaires (`.spec.ts`).
- **Documentation Diataxis** : Documentation d'auteur suivant le framework Diátaxis (Tutoriels, Comment faire, Référence,
  Explication).
- **TSDoc** : utilisez TSDoc/JSDoc pour toutes les méthodes et propriétés publiques afin d'alimenter l'intelligence de l'IDE.

## Ressources connexes

- [Guide de test](testing.md)
- [Meilleures pratiques du framework](framework-best-practices.md)
- [Structure de l'espace de travail](workspace-structure.md)
- [Dépannage](troubleshooting.md)
