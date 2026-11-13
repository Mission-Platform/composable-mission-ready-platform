# Structure de l'espace de travail

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/workspace-structure.md: [docs/workspace-structure.md](../../workspace-structure.md)
> Langue: Français (fr)

Ce document fournit une référence technique pour la présentation monorepo de Mission Platform, à des fins d'annuaire et de données internes.
conventions de paquet.

## Référence de mise en page Monorepo

Mission Platform utilise les espaces de travail pnpm et Turborepo pour gérer un environnement multi-packages. Le référentiel est organisé
en niveaux fonctionnels :

```text
composable_mission_ready_platform/
├── apps/                   # Deployable products, docs, and workbenches
├── packages/core/          # Framework-neutral runtime, Forge JSX/adapters, routing, i18n, and scheduling
├── packages/ui/            # Components, forms, layouts, themes, and design tokens
├── packages/content/       # Content, email, search, and SEO pipelines
├── packages/integrations/  # Barcode, maps, media, 3D, and interoperability adapters
├── packages/compiler/      # Figma bridges and Forge compiler plugins
├── packages/tooling/       # Shared configs and Vite/build-time extensions
├── packages/edge/          # Reusable Cloudflare Worker edge functions
├── mcp/                    # Model Context Protocol servers
├── scripts/                # Repo-wide automation scripts
├── examples/               # Example implementations and demos
└── docs/                   # Canonical English and translated documentation
```

## Répertoires principaux

### 1. `apps/` (Applications)

Les applications sont des unités déployables qui composent les fonctionnalités du répertoire `packages/`. Ils sont généralement privés
et jamais publié dans un registre.

- **`docs/`** : Le site de documentation Vite + Vue pour le corpus Markdown.
- **`figma-forge-plugin/`** : Le plugin Figma qui intègre les composants créés par Forge aux flux de travail Figma.
- **`my-care-notes/`** : L'application phare des notes de soins.
- **`service-monitor/`** : Le tableau de bord de santé du service RedwoodSDK soutenu par un objet durable.
- **`website/`** : Le site Web marketing et produits de Mission Platform.
- **`storybook/`** : L'atelier de composants et la suite de tests visuels.

### 2. `packages/` (blocs de construction)

Bibliothèques réutilisables et versionnées consommées par les applications. Les répertoires de domaine rendent la propriété explicite sans modifier les noms de packages ou les importations.

- **`core/`** : environnement d'exécution indépendant du framework, Forge JSX/adaptateurs, routage, localisation, observabilité, RxJS et services de planification.
- **`ui/`** : composants, points d'arrêt, formulaires, mises en page, sélection, thèmes, jetons et typographie.
- **`content/`** : modèles de contenu, composants/rendu de courrier électronique, outils linguistiques et référencement.
- **`integrations/`** : codes-barres, numérisation de codes, D3, cartes, codes QR/matrice, parole, Three.js et vCards.
- **`compiler/`** : ponts Figma et plugins de compilateur framework/routeur/CMS.
- **`tooling/`** : Packages de configuration partagés et plugins Vite.
- **`edge/`** : Packages de travail utilisés par les applications et exemples locaux.

- **`@mission-platform/forge-jsx`** : le runtime JSX et les adaptateurs neutres en termes de framework.
- **`@mission-platform/components`** : La bibliothèque de composants multi-framework.
- **`@mission-platform/forms`** et **`@mission-platform/forms-core`** : primitives de formulaire basées sur un schéma.
- **`@mission-platform/content`** et **`@mission-platform/email-renderer`** : pipelines de contenu et de rendu.
- **`@mission-platform/tokens`** : source de vérité du jeton de conception.
- **`@mission-platform/router`** et **`@mission-platform/i18n`** : routage et localisation indépendants du framework.
- **`@mission-platform/barcode`**, **`@mission-platform/code-scanner`**, **`@mission-platform/matrix-code`** et
  **`@mission-platform/qr-code`** : packages d'analyse et d'encodage pris en charge par Wasm.

### 3. `packages/tooling/configs/` (Fondation d'outillage)

Configurations partagées qui garantissent la cohérence dans tous les espaces de travail. Les packages de ce répertoire sont généralement utilisés comme
`devDependencies`.

- **`eslint-config/`**, **`prettier-config/`** et **`stylelint-config/`** : règles de peluchage et de formatage.
- **`typescript-config/`** : fichiers de base `tsconfig.json` pour les consommateurs Node, DOM, bibliothèque et framework.
- **`tsdown-config/`** et **`vite-config/`** : bibliothèque commune, application, modèles de build Vite et Vitest.
- **`i18n-config/`** et **`storybook-framework/`** : paramètres d'extraction de paramètres régionaux partagés et de framework-workbench.

### 4. `packages/tooling/vite/` (extensions de construction)

Plugins personnalisés qui étendent le processus de construction Vite.

- **`forge/`** : Le compilateur multi-étapes pour les composants Forge.
- **`tokens/`** : génère des artefacts de code à partir des définitions de jetons DTCG.
- **`i18n/`** : gère le chargement des paramètres régionaux et l'extraction statique.

### 5. `packages/edge/workers/` (Services de périphérie)

Cloudflare Workers pour une logique côté serveur et une livraison optimisée des actifs.

- **`api-proxy/`** : fournit un accès limité en lecture seule aux routes API approuvées.
- **`email-sender/`** : outil de présentation de courrier électronique local soutenu par MailPit.
- **`forge-spa/`** : sert des actifs statiques avec une solution de repli SPA de liaison `ASSETS`.

Les travailleurs d'application déployables sont configurés par `apps/website/wrangler.jsonc`,
`apps/my-care-notes/wrangler.jsonc` et `apps/service-monitor/wrangler.jsonc`. Le
Les packages `api-proxy` et `forge-spa` sont des dépendances groupées plutôt que des déploiements Wrangler autonomes.

### 6. `packages/compiler/plugins/` (Plugins du compilateur Forge)

Plugins et adaptateurs de sortie spécifiques au framework pour le compilateur Forge.

- **`forge-cms-plugin-api/`** : génération d'artefacts CMS et intégration de l'adaptateur Vite/tsdown.
- **`forge-cms-astro/`**, **`forge-cms-ghost/`**, **`forge-cms-jekyll/`**, **`forge-cms-storyblok/`**, **`forge-cms-webflow/`** : adaptateurs d'intégration spécifiques au CMS.
- **`forge-plugin-api/`** : Interfaces du plugin du compilateur Forge partagées.
- **`forge-vue/`**, **`forge-react/`**, **`forge-solid/`**, **`forge-svelte/`**, **`forge-web-components/`** : génération de code et adaptateurs d'exécution spécifiques au framework.
- **`forge-router-plugin-api/`**, **`forge-router-vue/`**, **`forge-router-react/`**, **`forge-router-solid/`**, **`forge-router-svelte/`**, **`forge-router-web-components/`**, **`forge-router-redwood/`** : adaptateurs d'intégration spécifiques au framework de routeur.

## Conventions internes des packages

Pour maintenir un environnement prévisible, tous les packages et applications suivent une présentation interne standard.

### Hiérarchie standard `src/`

Le code source est organisé par type fonctionnel :

- **`components/`** : Logique UI (SFC ou TSX).
- **`composables/`** : Logique réactive et hooks.
- **`utils/`** : fonctions pures et assistants indépendants du framework.
- **`locales/`** : fichiers de traduction JSON/YAML.
- **`styles/`** : partiels SCSS et intégrations de systèmes de conception.

### Modèle d'exportation de baril

Chaque répertoire de `src/` doit contenir un `index.ts` (fichier baril).

- Les sous-répertoires exportent leurs symboles internes via leur `index.ts` local.
- La racine `src/index.ts` fait office de point d'entrée public pour l'ensemble du membre de l'espace de travail.

## Registre de configuration racine

Les fichiers clés à la racine du référentiel régissent le comportement du monorepo :

| Fichier | Objectif |
| :---------------------- | :------------------------------------------------------------------- |
| `pnpm-workspace.yaml` | Définit les limites de l'espace de travail, les globes de membres et les catalogues de dépendances. |
| `turbo.json` | Orchestre le pipeline de build et la mise en cache des tâches.                    |
| `package.json` | Scripts au niveau racine et dépendances de développement à l'échelle du monorepo.                |
| `commitlint.config.mjs` | Applique la spécification Conventional Commits.                     |

## Gestion des dépendances et de l'espace de travail

Mission Platform utilise le protocole `workspace:*` pour les dépendances internes. Cela garantit que les packages utilisent toujours le
version locale des autres membres de l'espace de travail pendant le développement.

### PNPM Catalogues

Le référentiel exploite les **catalogues pnpm** (définis dans `pnpm-workspace.yaml`) pour centraliser les versions de dépendances dans
le monorepo. Cela évite la dérive de version et simplifie la maintenance.

### Exécution des tâches

Les tâches inter-espaces de travail sont exécutées via la racine `package.json` à l'aide de Turborepo :

- `pnpm build` : créez tous les espaces de travail dans le bon ordre de dépendance.
- `pnpm test` : Exécutez les suites de tests pour tous les espaces de travail avec une tâche `test`. Utilisez `pnpm exec turbo run test --affected` pour
  la portée CI de l’espace de travail modifié.
- `pnpm lint` : exécutez ESLint dans les espaces de travail.
- `pnpm lint:style` : exécutez Stylelint pour les styles d'application et de package.
- `pnpm format` : Vérifiez le formatage avec Prettier.
- `pnpm i18n:extract` : Extraire les clés de traduction pour les espaces de travail propriétaires de catalogues.
