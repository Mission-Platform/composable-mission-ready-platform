# Structure de l'espace de travail

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> Source anglaise: [docs/workspace-structure.md](../../workspace-structure.md)
> Langue: Français (fr)

Ce document fournit une référence technique pour la présentation monorepo de Mission Platform, à des fins d'annuaire et pour les informations internes.
conventions de paquet.

## Référence de mise en page Monorepo

Mission Platform utilise pnpm espaces de travail et Turborepo pour gérer un environnement multi-packages. Le référentiel est organisé
en niveaux fonctionnels :

```text
composable_mission_ready_platform/
├── apps/                   # Deployable products, docs, and workbenches
├── configs/                # Shared tooling and base configurations
├── packages/               # Reusable libraries and building blocks
├── vite-plugins/           # Build-time extensions and compilers
├── workers/                # Reusable Cloudflare Worker edge functions
├── crates/                 # Rust crates (including Wasm-compiled ones)
├── mcp/                    # Model Context Protocol servers
├── scripts/                # Repo-wide automation scripts
├── examples/               # Example implementations and demos
└── docs/                   # Canonical English and translated documentation
```

## Répertoires principaux

### 1. `apps/` (Candidatures)

Les applications sont des unités déployables qui composent les fonctionnalités du `packages/` annuaire. Ils sont généralement privés
et jamais publié dans un registre.

- **`docs/`**: Le Vite + Vue site de documentation pour le corpus Markdown.
- **`my-care-notes/`** : L'application phare des notes de soins.
- **`service-monitor/`** : le tableau de bord de l'état du service RedwoodSDK soutenu par un objet durable.
- **`website/`** : Le site Web de marketing et de produits de Mission Platform.
- **`storybook/`** : L'atelier de composants et la suite de tests visuels.

### 2. `packages/` (Blocs de construction)

Bibliothèques réutilisables et versionnées consommées par les applications. Ceux-ci sont destinés à être indépendants du framework dans la mesure du possible.

- **`@mission-platform/forge`** : Le runtime et les adaptateurs JSX neutres en termes de framework.
- **`@mission-platform/components`** : La bibliothèque de composants multi-framework.
- **`@mission-platform/forms`** et **`@mission-platform/forms-core`** : primitives de formulaire basées sur un schéma.
- **`@mission-platform/content`** et **`@mission-platform/email-renderer`** : pipelines de contenu et de rendu.
- **`@mission-platform/tokens`** : Conception d'une source de vérité symbolique.
- **`@mission-platform/router`** et **`@mission-platform/i18n`** : routage et localisation indépendants du framework.
- **`@mission-platform/barcode`**, **`@mission-platform/code-scanner`**, **`@mission-platform/matrix-code`**, et
  **`@mission-platform/qr-code`** : packages d'analyse et d'encodage pris en charge par Wasm.

### 3. `configs/` (Fondation d'outillage)

Configurations partagées qui garantissent la cohérence dans tous les espaces de travail. Les packages de ce répertoire sont généralement utilisés comme
`devDependencies`.

- **`eslint-config/`**, **`prettier-config/`**, et **`stylelint-config/`** : Règles de peluchage et de formatage.
- **`typescript-config/`**: Base `tsconfig.json` fichiers pour Node, DOM, bibliothèque et consommateurs de framework.
- **`tsdown-config/`** et **`vite-config/`** : Bibliothèque commune, application, Vite, et Vitest construire des modèles.
- **`i18n-config/`** et **`storybook-framework/`** : Extraction des paramètres régionaux partagés et paramètres du framework-workbench.

### 4. `vite-plugins/` (Construire des extensions)

Plugins personnalisés qui étendent le Vite processus de construction.

- **`forge/`** : Le compilateur multi-étapes pour les composants Forge.
- **`tokens/`** : génère des artefacts de code à partir des définitions de jetons DTCG.
- **`i18n/`** : Gère le chargement des paramètres régionaux et l'extraction statique.

### 5. `workers/` (Services de périphérie)

Cloudflare Workers pour une logique côté serveur et une livraison optimisée des actifs.

- **`api-proxy/`** : Fournit un accès limité en lecture seule aux routes API approuvées.
- **`email-sender/`** : outil de présentation de courrier électronique local soutenu par MailPit.
- **`forge-spa/`** : sert des actifs statiques avec un `ASSETS`-reliure de secours SPA.

Les travailleurs d'application déployables sont configurés par `apps/website/wrangler.jsonc`,
`apps/my-care-notes/wrangler.jsonc`, et `apps/service-monitor/wrangler.jsonc`. Le
`api-proxy` et `forge-spa` les packages sont des dépendances regroupées plutôt que autonomes Wrangler déploiements.

## Conventions internes des packages

Pour maintenir un environnement prévisible, tous les packages et applications suivent une présentation interne standard.

### Standard `src/` Hiérarchie

Le code source est organisé par type fonctionnel :

- **`components/`** : logique UI (SFC ou TSX).
- **`composables/`** : Logique réactive et hooks.
- **`utils/`** : fonctions pures et assistants indépendants du framework.
- **`locales/`** : fichiers de traduction JSON/YAML.
- **`styles/`** : partiels SCSS et intégrations de systèmes de conception.

### Modèle d'exportation de baril

Chaque répertoire à l'intérieur `src/` doit contenir un `index.ts` (lime tonneau).

- Les sous-répertoires exportent leurs symboles internes via leur local `index.ts`.
- La racine `src/index.ts` agit comme point d’entrée public pour l’ensemble du membre de l’espace de travail.

## Registre de configuration racine

Les fichiers clés à la racine du référentiel régissent le comportement du monorepo :

| Fichier | Objectif |
|:------------------------|:---------------------------------------------------------------------|
| `pnpm-workspace.yaml`   | Définit les limites de l'espace de travail, les globes de membres et les catalogues de dépendances. |
| `turbo.json`            | Orchestre le pipeline de build et la mise en cache des tâches.                    |
| `package.json`          | Scripts au niveau racine et dépendances de développement à l'échelle du monorepo.                |
| `commitlint.config.mjs` | Applique la spécification Conventional Commits.                     |

## Gestion des dépendances et de l'espace de travail

Mission Platform utilise le `workspace:*` protocole pour les dépendances internes. Cela garantit que les packages utilisent toujours le
version locale des autres membres de l'espace de travail pendant le développement.

### PNPM Catalogues

Le référentiel exploite **pnpm catalogues** (définis dans `pnpm-workspace.yaml`) pour centraliser les versions de dépendances
le monorepo. Cela évite la dérive de version et simplifie la maintenance.

### Exécution des tâches

Les tâches inter-espaces de travail sont exécutées via la racine `package.json` en utilisant Turborepo :

- `pnpm build`: Créez tous les espaces de travail dans le bon ordre de dépendance.
- `pnpm test`: Exécutez les suites de tests pour tous les espaces de travail avec un `test` tâche. Utiliser `pnpm exec turbo run test --affected` pour
  la portée CI de l’espace de travail modifié.
- `pnpm lint`: Courir ESLint à travers les espaces de travail.
- `pnpm lint:style`: Courir Stylelint pour les styles d’application et de package.
- `pnpm format`: Vérifiez le formatage avec Prettier.
- `pnpm i18n:extract`: Extrayez les clés de traduction pour les espaces de travail qui possèdent des catalogues.
