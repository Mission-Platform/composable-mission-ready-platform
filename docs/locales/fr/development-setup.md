# Configuration du développement

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/development-setup.md: [docs/development-setup.md](../../development-setup.md)
> Langue: Français (fr)

Ce guide fournit un didacticiel étape par étape pour configurer votre environnement local afin de contribuer à la plateforme de mission.
À la fin de ce guide, vous disposerez d’un monorepo fonctionnel et pourrez exécuter les outils de développement.

## Conditions préalables

Avant de cloner le référentiel, assurez-vous que votre système répond aux exigences suivantes.

### Configuration système requise

| Outil | Version requise | Objectif |
| :---------- | :--------------- | :---------------------------------------------- |
| **Node.js** | `24.19.0` | Environnement d'exécution (Active LTS) |
| **pnpm** | `12.4.2` | Gestionnaire de packages et orchestrateur d'espace de travail |
| **Git** | Dernière stable | Contrôle des versions |
| **Rouille** | Chaîne d'outils stable | Développement de benchmark Rust autonome en option |
| **Docker** | Dernière stable | Requis uniquement pour la version Emscripten Hunspell |

### Gestion des versions (recommandé)

Nous vous recommandons d'utiliser **nvm** (Node Version Manager) pour vous assurer que vous utilisez la version correcte de Node.js spécifiée dans le
fichier racine `.nvmrc`.

```bash
nvm install
nvm use
```

Activez **pnpm** à l'aide de Corepack :

```bash
corepack enable
corepack prepare pnpm@12.4.2 --activate
```

## Configuration initiale

Suivez ces étapes pour initialiser le monorepo sur votre machine.

### 1. Cloner le référentiel

```bash
git clone git@github.com:Mission-Platform/composable-mission-ready-platform.git
cd composable-mission-ready-platform
```

### 2. Installer les dépendances

Installez toutes les dépendances de l'espace de travail et configurez les hooks git :

```bash
pnpm install
```

Cette commande déclenche le script `prepare`, qui initialise **Husky** pour le commit lint et garantit que toutes les opérations internes
les liens des packages sont correctement établis.

### Serveur de langue SonarLint

Le `agent-lsp.json` du référentiel inclut le serveur de langage officiel SonarLint pour JavaScript et TypeScript. Le
Le serveur est distribué sous forme d'archive Java plutôt que de package npm, installez donc Java et créez ou téléchargez le
Archive `sonarlint-language-server` de [SonarSource](https://github.com/SonarSource/sonarlint-language-server).

Définissez l'archive du serveur et l'analyseur JavaScript avant de démarrer le LSP :

```bash
export SONARLINT_LS_JAR=/path/to/sonarlint-language-server.jar
export SONARLINT_ANALYZERS=/path/to/sonarjs.jar
```

La variable facultative `SONARLINT_JAVA` peut sélectionner un exécutable Java. Le lanceur de référentiel valide le configuré
chemins et transmet le protocole stdio du serveur sans nécessiter une commande installée globalement.

### 3. Vérifiez l'installation

Exécutez un test de fumée pour vous assurer que le système de build et l'environnement sont correctement configurés :

```bash
pnpm exec turbo run build --filter @mission-platform/forge-jsx...
```

Le filtre `...` crée également les dépendances Forge requises par le package. Le
le scanner de code neutre est compilé à partir de son graphique Flint ; ce n'est pas le cas
nécessitent une étape de construction Rust ou `wasm-pack`.

## Flux de travail de développement

La plateforme Mission utilise **Turborepo** pour orchestrer les tâches entre les applications et les packages.

### Développement de composants (Storybook)

Storybook est le principal atelier permettant de créer et de tester des composants de manière isolée. Vous pouvez cibler des frameworks spécifiques
en utilisant des variables d'environnement :

```bash
# Start Vue 3 Storybook
pnpm storybook:vue

# Start React Storybook
pnpm storybook:react

# Start Svelte Storybook
pnpm storybook:svelte

# Start Solid Storybook
pnpm storybook:solid

# Start Web Components Storybook
pnpm storybook:web-component
```

Les cinq modes utilisent le même inventaire d’histoire neutre. Pour valider chaque statique
Workbench construit en un seul passage :

```bash
for framework in vue react svelte solid web-component; do
  STORYBOOK_FRAMEWORK="$framework" pnpm --filter @mission-platform/storybook run build-storybook
done
```

Les packages basés sur Forge publient les correspondances `mp:vue`, `mp:react`, `mp:svelte`,
Conditions `mp:solid` et `mp:web-component`. La condition active doit être
configuré par le bundler consommateur ; voir [la référence du compilateur](../../../packages/tooling/vite/forge/docs/locales/fr/reference/compiler.md)
pour le plugin cible et le pipeline de déclaration.

### Développement d'applications

Pour démarrer une application spécifique en mode développement :

```bash
# Start My Care Notes (Vue 3)
pnpm exec turbo run dev --filter @mission-platform/my-care-notes
```

L'application sera généralement disponible sur `http://localhost:5173`.

### Commandes communes

| Tâche | Commande | Descriptif |
| :--------- | :------------ | :----------------------------- |
| **Construire** | `pnpm build` | Créez toutes les applications et tous les packages |
| **Tester** | `pnpm test` | Exécutez toutes les suites Vitest |
| **Charpie** | `pnpm lint` | Exécutez ESLint sur le monorepo |
| **Format** | `pnpm format` | Vérifiez le formatage avec Prettier |

## Dépannage

### Vider les caches

Si vous rencontrez des erreurs de build inattendues, effacez les caches Turborepo et Node :

```bash
# Remove Turborepo cache
rm -rf .turbo

# Deep clean all node_modules and reinstall
pnpm -r exec rm -rf node_modules
pnpm install
```

### Échecs de construction WASM

Si la construction d'un artefact Flint échoue, inspectez les diagnostics du compilateur
et vérifiez le profil de lien statique ou dynamique sélectionné. Le
La version `@mission-platform/hunspell` d'Emscripten nécessite en outre que Docker
être en train de courir.
