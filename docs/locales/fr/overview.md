# Présentation de la plateforme de mission

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> Source anglaise: [docs/overview.md](../../overview.md)
> Langue: Français (fr)

Mission Platform est une plate-forme de composants composable, basée sur des packages et neutre en termes de framework, conçue pour créer
applications prêtes pour la production avec des blocs de construction réutilisables. Il s'appuie sur une architecture monorepo moderne pour fournir un
environnement de développement hautement efficace pour les écosystèmes complexes et multi-applications.

## La philosophie composable

À la base, Mission Platform repose sur le principe de la **composition plutôt que de l'héritage**. Au lieu de fournir un
cadre monolithique qui dicte la structure des applications, la plate-forme offre une suite de petites applications ciblées et hautement
paquets interopérables.

### Blocs de construction composables

Les applications sont assemblées à partir de packages partagés, garantissant ainsi une logique commune, des composants de l'interface utilisateur à l'internationalisation.
et le routage – est créé une seule fois et réutilisé partout. Cette approche réduit la duplication, simplifie la maintenance et
garantit une expérience utilisateur cohérente sur l’ensemble de la suite de produits.

### Multi-framework par conception

Mission Platform introduit un paradigme de développement neutre en termes de cadre. En utilisant le `@mission-platform/forge` Dialecte JSX,
les développeurs peuvent créer des composants une fois et les compiler vers des sorties natives pour Vue 3, React, Solid, Svelteet Internet
Composants. Cela pérennise la base de code et permet une intégration transparente dans divers environnements frontaux.

### Fondation de type sécurisé

L'ensemble de la plateforme est rédigé en **TypeScript**, offrant une expérience de développeur robuste et auto-documentée. Explicite
la saisie dans toutes les API publiques garantit que les erreurs sont détectées au moment de la compilation, augmentant ainsi considérablement le développement
vitesse et qualité du code.

## Principales fonctionnalités

| Fonctionnalité | Descriptif |
|:----------------------|:---------------------------------------------------------------------------------------------------------------------------------------|
| **Forge JSX Runtime** | Un dialecte JSX indépendant du framework : créez une fois et construisez pour Vue 3, React, Svelte, Solidet des composants Web sans aucune surcharge d'exécution. |
| **Bibliothèque de composants** | Un ensemble complet de composants de mise en page, de typographie et interactifs créés une seule fois pour plusieurs frameworks.                           |
| **Jetons de conception** | Un système de jetons conforme au DTCG qui génère du SCSS et TypeScript artefacts pour une thématique cohérente.                                     |
| **Routage agnostique** | Un système de routage de type sécurisé qui fonctionne indépendamment du framework d'interface utilisateur.                                                               |
| **Universel I18n** | Un wrapper d'internationalisation indépendant du framework basé sur i18next avec des Vue et React adaptateurs.                              |
| **Utilitaires Wasm** | Utilitaires hautes performances pour la numérisation de codes-barres, la vérification orthographique et bien plus encore, optimisés par WebAssembly.                                     |

## Pile technologique

Mission Platform est construite sur une pile moderne et performante :

- **Forger JSX (`@mission-platform/forge`)** : le framework d'interface utilisateur principal – un environnement d'exécution JSX indépendant du framework dans lequel tous
  les composants partagés (tout sauf les applications) sont créés.
- **Vue 3** : Le cadre dans lequel les applications `apps/` sont construits avec, et l'une des nombreuses cibles de rendu natives pour
  Forger des composants.
- **TypeScript** : La norme pour tout le code source.
- **Vite** : L'outil de construction permettant une HMR rapide et des bundles de production optimisés.
- **pnpm Espaces de travail** : gestion efficace des dépendances avec fichiers de verrouillage partagés.
- **Turborepo** : orchestration et mise en cache des tâches hautes performances.
- **Cloudflare Workers/Pages** : cible principale de déploiement pour les applications et les API.
- **Storybook** : L'atelier pour le développement de composants et les tests visuels.

## Structure de l'écosystème

Le référentiel est organisé en plusieurs zones distinctes :

- **`apps/`** : applications déployables (par exemple, `my-care-notes`, `website`) qui composent des packages en produits.
- **`packages/`** : Les éléments de base, y compris `@mission-platform/components`, `@mission-platform/router`, et
  `@mission-platform/i18n`.
- **`configs/`** : Configurations partagées pour ESLint, Prettier, TypeScript, et Vite.
- **`vite-plugins/`** : outils de construction personnalisés pour les jetons de conception, la compilation Forge et le référencement.
- **`workers/`** : Cloudflare Workers fournissant une logique backend et des capacités de service SPA.

## Prochaines étapes

Pour commencer à développer sur la plateforme Mission, veuillez vous référer aux guides suivants :

- **[Configuration du développement](development-setup.md)** : Préparez votre environnement et installez les dépendances.
- **[Architecture](architecture.md)** : Plongez en profondeur dans les principes de conception et le flux de dépendances de la plateforme.
- **[Structure de l'espace de travail](workspace-structure.md)** : Comprendre la disposition des répertoires et les conventions des packages.
- **[Essai](testing.md)** : Découvrez nos stratégies et outils de test.
