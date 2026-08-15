# Configuration du développement

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> Source anglaise: [docs/development-setup.md](../../development-setup.md)
> Langue: Français (fr)

Ce guide fournit un didacticiel étape par étape pour configurer votre environnement local afin de contribuer à la plateforme de mission.
À la fin de ce guide, vous disposerez d’un monorepo fonctionnel et pourrez exécuter les outils de développement.

## Conditions préalables

Avant de cloner le référentiel, assurez-vous que votre système répond aux exigences suivantes.

### Configuration système requise

| Outil | Version requise | Objectif |
| :------------ | :---------------- | :---------------------------------------------------- |
| **Node.js** | `24.19.0`         | Environnement d'exécution (Active LTS) |
| **pnpm**      | `11.21.0`         | Gestionnaire de packages et orchestrateur d'espace de travail |
| **Git** | Dernière stable | Contrôle des versions |
| **Rouille** | Chaîne d'outils stable | Tests natifs et développement de caisses Rust/WASM |
| **wasm-pack** | `0.15.0` via pnpm | Emballage des caisses Rust en tant qu'espaces de travail WebAssembly typés |
| **Docker** | Dernière stable | Requis uniquement pour la version Emscripten Hunspell |

### Gestion des versions (recommandé)

Nous vous recommandons d'utiliser **nvm** (Node Gestionnaire de versions) pour vous assurer que vous utilisez le bon NodeVersion .js spécifiée dans le
racine `.nvmrc` déposer.

```bash
nvm install
nvm use
```

Activer **pnpm** en utilisant Corepack :

```bash
corepack enable
corepack prepare pnpm@11.21.0 --activate
```

Installez la cible Rust lorsque vous travaillez sur des caisses Rust. Le packager WebAssembly est fourni par le fichier épinglé `wasm-pack` npm
dépendance pendant `pnpm install`:

```bash
rustup target add wasm32-unknown-unknown
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

Cette commande déclenche le `prepare` script, qui initialise **Husky** pour le commit linting et garantit tous les
les liens des packages sont correctement établis.

### 3. Vérifiez l'installation

Exécutez un test de fumée pour vous assurer que le système de build et l'environnement sont correctement configurés :

```bash
pnpm exec turbo run build --filter @mission-platform/forge...
```

Le `...` construit également les dépendances Forge requises par le package. Les caisses de décodeurs et d'encodeurs Rust sont testées
nativement avec `cargo test`; leur
`wasm-pack` les sorties sont écrites dans le fichier correspondant `packages/*-wasm/`
workspace par la tâche de package de la caisse, qui est le contrat de package/build archivé utilisé par Turborepo.

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

Les packages basés sur Forge publient la correspondance `mp:vue`, `mp:react`, `mp:svelte`,
`mp:solid`, et `mp:web-component` conditions. La condition active doit être
configuré par le bundler consommateur ; voir [la référence du compilateur](forge-compiler.md)
pour le plugin cible et le pipeline de déclaration.

### Développement d'applications

Pour démarrer une application spécifique en mode développement :

```bash
# Start My Care Notes (Vue 3)
pnpm exec turbo run dev --filter @mission-platform/my-care-notes
```

L'application sera généralement disponible à l'adresse `http://localhost:5173`.

### Commandes communes

| Tâche | Commande | Descriptif |
| :--------- | :------------ | :----------------------------- |
| **Construire** | `pnpm build`  | Créez toutes les applications et tous les packages |
| **Tester** | `pnpm test`   | Exécutez tout Vitest suites |
| **Charpie** | `pnpm lint`   | Courir ESLint à travers le monorepo |
| **Format** | `pnpm format` | Vérifiez le formatage avec Prettier |

## Dépannage

### Vider les caches

Si vous rencontrez des erreurs de build inattendues, effacez le Turborepo et Node caches :

```bash
# Remove Turborepo cache
rm -rf .turbo

# Deep clean all node_modules and reinstall
pnpm -r exec rm -rf node_modules
pnpm install
```

### Échecs de construction WASM

Si la construction des packages Rust/WASM échoue, vérifiez que la chaîne d'outils Rust stable et
`wasm32-unknown-unknown` la cible est installée, puis exécutez `pnpm install` pour restaurer l'épinglé `wasm-pack` npm dépendance.
Le
`@mission-platform/hunspell` La version Emscripten nécessite en outre que Docker soit en cours d'exécution ; les autres caisses Rust construites
avec la chaîne d'outils Rust locale.
