# Développement de packages

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> Source anglaise: [docs/package-development.md](../../package-development.md)
> Langue: Français (fr)

Ce guide décrit comment créer, développer et publier des packages réutilisables dans le monorepo Mission Platform.
Les packages sont les éléments fondamentaux de la plateforme, résidant dans le `packages/` répertoire et géré via
pnpm espaces de travail et Turborepo.

## Création d'un nouveau package

La méthode recommandée pour créer un package consiste à utiliser l'outil MCP Mission Platform Developer, qui garantit que tous
les configurations, les scripts et les structures de dossiers suivent les normes de la plateforme.

### 1. Échafaudage avec MCP

Utilisez le `scaffold_package` outil pour générer le squelette.

```bash
# Example: Creating a new 'date-utils' package
# The tool defaults to a dry-run; set apply=true to write files
scaffold_package(name="date-utils", description="Shared date manipulation utilities", apply=true)
```

Cela génère un résultat conforme à la convention `packages/date-utils/` répertoire avec :

- `package.json` avec des scripts prêts pour l'espace de travail et des configurations partagées.
- `tsconfig.json` étendre les paramètres par défaut de la plateforme.
- `vite.config.ts` pour des builds optimisés.
- `src/index.ts` lime à barillet.
- `llms.txt` pour la documentation assistée par l'IA.

### 2. Configuration manuelle (facultatif)

Si vous n'utilisez pas l'outil MCP, assurez-vous que votre `package.json` utilise [pnpm catalogues](https://pnpm.io/catalogs) pour
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
├── llms.txt                        # Technical overview for LLMs
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Flux de travail de développement

### Règles de création

1. **TypeScript Partout** : tout le code source doit être dans `.ts` ou `.tsx` (en utilisant `@mission-platform/forge`).
2. **Neutralité du framework** : privilégier une logique indépendante du framework. Les composants doivent être créés une fois dans Forge JSX pour cibler
   plusieurs cadres.
3. **Isolement** : les packages ne doivent jamais être importés depuis `apps/`.
4. **Test** : Chaque unité (composable, magasin, util, composant) DOIT avoir un `.spec.ts` déposer.

Pour obtenir des instructions de création détaillées, voir :

- [Conception de composants atomiques](atomic-component-design.md)
- [Création composable](composable-authoring.md)
- [Création de magasin](store-authoring.md)
- [Création utilitaire](util-authoring.md)

### Bâtiment

Construisez le package en utilisant Turbo pour garantir que les dépendances sont construites dans le bon ordre :

```bash
pnpm exec turbo run build --filter @mission-platform/<name>
```

### Essai

Exécutez des tests en utilisant Vitest:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

## Documents (`llms.txt`)

Chaque forfait comprend un `llms.txt` fichier à sa racine. Ce fichier fournit une description technique concise du
les API, les composants et le comportement du package, permettant aux assistants IA de mieux comprendre et utiliser le package.

- **Titre** : utilisez le nom du package étendu.
- **Composants/API** : Tableau ou liste des symboles disponibles avec leurs accessoires et responsabilités.
- **Exemples** : extraits de code court pour les cas d'utilisation courants.

## Édition

La Plateforme Mission utilise [Ensembles de modifications](https://github.com/changesets/changesets) pour la gestion des versions et la publication.

1. **Ajouter un ensemble de modifications** : après avoir apporté des modifications, exécutez :
```bash
   pnpm changeset
   ```
   Sélectionnez le package et le type de modification (correctif, mineur, majeur).
2. **Commit the Changeset** : validez le généré `.changeset/*.md` déposer.
3. **Version et publication** : CI/CD gère la publication proprement dite, mais vous pouvez prévisualiser localement les versions avec :
```bash
   pnpm changeset version
   ```
