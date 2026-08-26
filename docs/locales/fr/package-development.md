# Développement de packages

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/package-development.md: [docs/package-development.md](../../package-development.md)
> Langue: Français (fr)

Ce guide décrit comment créer, développer et publier des packages réutilisables dans le monorepo Mission Platform.
Les packages sont les éléments fondamentaux de la plateforme, résidant dans le répertoire `packages/` et gérés via
Espaces de travail pnpm et Turborepo.

## Création d'un nouveau package

La méthode recommandée pour créer un package consiste à utiliser l'outil MCP Mission Platform Developer, qui garantit que tous
les configurations, les scripts et les structures de dossiers suivent les normes de la plateforme.

### 1. Échafaudage avec MCP

Utilisez l'outil `scaffold_package` pour générer le squelette.

```bash
# Example: Creating a new 'date-utils' package
# The tool defaults to a dry-run; set apply=true to write files
scaffold_package(name="date-utils", description="Shared date manipulation utilities", apply=true)
```

Cela génère un répertoire `packages/date-utils/` conforme à la convention avec :

- `package.json` avec des scripts prêts pour l'espace de travail et des configurations partagées.
- `tsconfig.json` étendant les paramètres par défaut de la plateforme.
- `vite.config.ts` pour des builds optimisés.
- Lime barillet `src/index.ts`.
- `llms.txt` pour la documentation assistée par l'IA.

### 2. Configuration manuelle (facultatif)

Si vous n'utilisez pas l'outil MCP, assurez-vous que votre `package.json` utilise [Catalogues pnpm](https://pnpm.io/catalogs) pour
gestion des dépendances et suit la convention de dénomination étendue :

```json
{
  "name": "@mission-platform/your-package-name",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "pnpm exec turbo run build --filter @mission-platform/your-package-name",
    "test": "vitest run",
    "lint": "eslint .",
    "format": "prettier --check ."
  },
  "devDependencies": {
    "@mission-platform/eslint-config": "workspace:*",
    "@mission-platform/prettier-config": "workspace:*"
  }
}
```

## Structure du paquet

Chaque package suit une disposition interne stricte. Les unités de code (composants, composables, magasins ou utilitaires) DOIVENT résider dans
leurs propres sous-répertoires nommés avec des tests colocalisés.

```text
packages/<name>/
├── src/
│   ├── components/                 # Atomic components (atoms, molecules, etc.)
│   │   ├── atoms/
│   │   │   └── forge-button/        # forge-button.tsx + .stories.tsx + .spec.ts
│   │   └── index.ts                # Component re-exports
│   ├── composables/
│   │   └── use-date-format/        # use-date-format.ts + .spec.ts
│   ├── stores/
│   │   └── date-store/             # date-store.ts + .spec.ts
│   ├── utils/
│   │   └── date-validator/         # date-validator.ts + .spec.ts
│   ├── locales/                    # i18n JSON files
│   └── index.ts                    # Package public API (barrel)
├── docs/                           # Package-owned guides and generated API reference
│   └── reference/generated/        # Regenerated during prebuild
├── llms.txt                        # Technical overview for LLMs
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Stylelint pour les packages contenant des styles

Les packages contenant `CSS`, `SCSS` ou des blocs de style `Vue` doivent fournir une configuration Stylelint et des scripts de lint :

```text
packages/<name>/
├── src/
│   └── styles/                     # CSS, SCSS, and Vue style sources
├── stylelint.config.mjs            # Workspace-local ESM configuration
└── package.json                    # Stylelint scripts and devDependencies
```

Ajoutez la configuration partagée et ses dépendances directes de syntaxe et de configuration à `devDependencies` :

```json
{
  "devDependencies": {
    "@mission-platform/stylelint-config": "workspace:*",
    "postcss-html": "catalog:stylelint",
    "postcss-scss": "catalog:stylelint",
    "stylelint": "catalog:stylelint",
    "stylelint-config-recommended-vue": "catalog:stylelint",
    "stylelint-config-standard-scss": "catalog:stylelint"
  }
}
```

Utilisez la configuration partagée depuis `stylelint.config.mjs` au lieu de dupliquer les entrées `extends` :

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

Ajoutez des scripts couvrant les sources de styles réelles du workspace, puis exécutez la vérification avant publication :

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

```bash
pnpm exec turbo run lint:style --filter @mission-platform/<name>
```

## Flux de travail de développement

### Règles de création

1. **TypeScript Partout** : tout le code source doit être au format `.ts` ou `.tsx` (en utilisant `@mission-platform/forge`).
2. **Neutralité du framework** : privilégier une logique indépendante du framework. Les composants doivent être créés une fois dans Forge JSX pour cibler
   plusieurs cadres.
3. **Isolement** : les packages ne doivent jamais être importés à partir de `apps/`.
4. **Test** : Chaque unité (composable, magasin, util, composant) DOIT avoir un fichier `.spec.ts` colocalisé.

Pour obtenir des instructions de création détaillées, voir :

- [Conception de composants atomiques](atomic-component-design.md)
- [Création composable](composable-authoring.md)
- [Création de magasin](store-authoring.md)
- [Création utilitaire](util-authoring.md)

### Bâtiment

Créez le package à l'aide de Turbo pour garantir que les dépendances sont créées dans le bon ordre :

```bash
pnpm exec turbo run build --filter @mission-platform/<name>
```

### Essai

Exécutez des tests à l'aide de Vitest :

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

### Packages de routeur et cibles de composants Web

Utilisez `@mission-platform/router` pour les cibles de routes structurées, les assistants d'URL purs et les marqueurs de compilateur neutres. Partagé
les packages ne doivent pas définir ou enregistrer des routes d’application. Les applications sélectionnent une cible de routeur Forge indépendamment de
leur cible d'interface utilisateur, conservent la propriété des enregistrements de route natifs et des instances de routeur, et lient tout environnement d'exécution spécifique à la cible
contexte pendant le bootstrap. Les cibles initiales sont `@mission-platform/forge-router-vue`, `-react`, `-solid`, `-svelte`,
`-redwood` et `-web-components` ; les combinaisons de fonctionnalités non prises en charge doivent rester des diagnostics du compilateur.

Pour un package ou une application sans framework, sélectionnez la condition Forge Web Components dans les configurations build et TypeScript :

```ts
import { frameworkResolveConditions } from "@mission-platform/vite-config";

export default {
  resolve: { conditions: frameworkResolveConditions("web-component") },
};
```

Pour les applications Web Components, importez le runtime depuis `@mission-platform/forge-router-web-components/runtime`, appelez
`registerRouterElements()` une fois, appelez `setForgeRouter(appRouter)` après avoir créé le routeur appartenant à l'application, passez structuré
Valeurs `to` en tant que propriétés DOM et utilisation `MpMemoryHistory` dans les pré-rendus/tests. Un package qui ajoute un routeur réutilisable
L'élément ou les modifications du comportement des composants Web doivent ajouter une histoire neutre sous `src/**/*.stories.ts` et inclure la cible dans
l'atelier Storybook des composants Web.

## Documentation (`llms.txt`)

Chaque package inclut un fichier `llms.txt` à sa racine. Ce fichier fournit une description technique concise du
les API, les composants et le comportement du package, permettant aux assistants IA de mieux comprendre et utiliser le package.

- **Titre** : utilisez le nom du package étendu.
- **Composants/API** : Tableau ou liste des symboles disponibles avec leurs accessoires et responsabilités.
- **Exemples** : extraits de code court pour les cas d'utilisation courants.

## Propriété de la documentation du package

L'installation, l'utilisation, les limitations, les flux de travail des contributeurs et les pages de référence de l'API spécifiques au package appartiennent au
répertoire `docs/` du package, pas dans l'arborescence `docs/` à l'échelle du référentiel. Le site de documentation ingère ces fichiers directement et
les publie sous un espace de noms de package stable tel que `/packages/barcode/index` ou `/configs/eslint-config/index`.
Les concepts, l'architecture, les flux de travail de l'espace de travail et le dépannage entre packages à l'échelle du projet restent à la racine `docs/`.

Les pages API générées se trouvent sous `docs/reference/generated/` et sont actualisées par le hook du package `prebuild` ; ne pas modifier
ces fichiers manuellement. Pour prévisualiser la documentation du package via le site, exécutez la version de l'application Documents ou utilisez l'espace de travail complet
extracteur décrit dans l'application de documentation README.

## Édition

La Plateforme Mission utilise [Ensembles de modifications](https://github.com/changesets/changesets) pour la gestion des versions et la publication.

1. **Ajouter un ensemble de modifications** : après avoir apporté des modifications, exécutez :
```bash
   pnpm changeset
   ```
   Sélectionnez le package et le type de modification (correctif, mineur, majeur).
2. **Commit the Changeset** : validez le fichier `.changeset/*.md` généré.
3. **Version et publication** : CI/CD gère la publication proprement dite, mais vous pouvez prévisualiser localement les versions avec :
```bash
   pnpm changeset version
   ```
