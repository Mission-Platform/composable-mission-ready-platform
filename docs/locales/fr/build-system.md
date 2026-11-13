# Construire un système

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/build-system.md: [docs/build-system.md](../../build-system.md)
> Langue: Français (fr)

Ce document explique l'architecture et les mécanismes du système de construction de Mission Platform. Il est conçu pour les hautes
performances, builds incrémentielles et distribution de packages multi-framework.

## Architecture de base

La plateforme de mission utilise un système de construction à plusieurs niveaux qui sépare l'orchestration des tâches de la compilation d'espaces de travail individuels.

### 1. Orchestration des tâches (Turborepo)

**Turborepo** est l'orchestrateur de haut niveau. Il gère le graphique de dépendances entre les espaces de travail et fournit une mise en cache pour
toutes les tâches.

- **Pipeline défini dans `turbo.json`** : des tâches telles que `build`, `test` et `lint` sont définies avec leurs dépendances
  (par exemple, `build` dépend de `^build`, ce qui signifie que toutes les dépendances doivent être construites en premier).
- **Hashing** : Turborepo hache les fichiers sources, les variables d'environnement et les dépendances globales pour déterminer si une tâche est exécutée.
  la sortie peut être réutilisée à partir du cache.
- **Parallélisme** : les tâches indépendantes sont exécutées simultanément pour maximiser l'utilisation du processeur.

### 2. Compilation de packages (tsdown)

La plupart des packages de bibliothèque dans `packages/` utilisent **tsdown** pour la compilation.

- **Vitesse** : construit sur **Rolldown** (le successeur de Rollup basé sur Rust), permettant des builds quasi instantanés.
- **Dégroupage** : les packages sont construits avec `unbundle: true`, en préservant la structure de module d'origine dans `dist/`. Ceci
  garantit un tremblement d'arborescence optimal et un meilleur débogage dans les applications grand public.
- **CSS Threading** : un plugin personnalisé relie les feuilles de style extraites à leurs modules JS propriétaires, garantissant ainsi que
  l'importation d'un composant extrait automatiquement ses styles.

### 3. Regroupement d'applications (Vite)

Les applications déployables dans `apps/` utilisent **Vite** pour le regroupement de développement et de production.

- **Configurations partagées** : les applications étendent `@mission-platform/vite-config` pour garantir des pipelines PostCSS cohérents et
  résolution indépendante du framework.
- **Prise en charge SSR/SSG** : des applications telles que `my-care-notes` utilisent `vite-ssg` pour la génération de sites statiques.

### Constructions de packages Forge

Les versions du package Forge ajoutent un frontal de compilateur neutre au flux `tsdown` ou Vite normal. Un package consommateur importe
les plugins de framework qu'il souhaite et transmet des instances explicites à `tsdownForgeComponentPlugins` ou
`tsdownForgeHookPlugins` dans un appel `defineTsdownLibrary`. Le pilote neutre crée une IR sémantique une fois, puis le plugin sélectionné possède l'abaissement de la cible,
génération de sources, déclarations, externes d'exécution et son adaptateur natif Vite/tsdown.

La sortie de la plateforme de contenu est un deuxième axe orthogonal configuré via `@mission-platform/forge-cms-plugin-api`. Un
Le consommateur transmet à `tsdownForgeCmsPlugins` une liste d'instances `CmsOutputPlugin`, chacune des
qui _compose_ un plugin framework — `forgeStoryblokCms({ packageName, plugin, storyblokRuntime })`,
`forgeAstroCms({ packageName, plugin })`, et ainsi de suite pour Ghost, Jekyll et Webflow. Parce que la plateforme et le
framework sont choisis indépendamment, `storyblok × vue` et `astro × solid` sont une configuration plutôt qu'un nouveau code.

Les builds CMS émettent vers `dist/cms/<cms>/<framework>/**`, avec des manifestes et autres side-cars de plate-forme reflétés dans
`dist/cms/<cms>/`. Les cibles qui nécessitent un runtime hydraté (Astro, Webflow) co-générent une arborescence d'îlots à partir de la limite
plugin framework dans la même version. La répartition complète des responsabilités et les limites des étapes sont décrites dans
[Pipeline du compilateur Forge](../../../packages/tooling/vite/forge/docs/locales/fr/reference/compiler.md).

## Contrat de construction

`pnpm build` est la version globale canonique. Il délègue à la tâche `build` au niveau du package de Turbo sans définir de
sélecteur de framework, de sorte que chaque package Forge émet sa sortie neutre et chaque cible de framework configurée par celui-ci
paquet. Les packages avec des projections CMS émettent ces projections et leurs side-cars partagés dans la même version par étapes.

```bash
pnpm build
pnpm build:force                 # the same aggregate build, ignoring Turbo's cache
pnpm exec turbo run build --filter @mission-platform/components
```

Les packages Forge conservent également des alias de compatibilité fine pour reconstruire une cible :

```bash
pnpm --filter @mission-platform/components run build:forge
pnpm --filter @mission-platform/components run build:vue
pnpm --filter @mission-platform/components run build:react
pnpm --filter @mission-platform/components run build:svelte
pnpm --filter @mission-platform/components run build:solid
pnpm --filter @mission-platform/components run build:web-components
```

Les alias utilisent le même exécuteur typé que `build` ; ils ne contiennent pas d'implémentations `tsdown` indépendantes. `build:forge`
sélectionne la cible neutre, tandis que les alias du framework sélectionnent le répertoire du framework correspondant. Spécifique au package
Les commandes du mode artefact du CMS restent disponibles lorsqu'elles sont exposées, y compris la commande des ressources Storyblok partagées et la
commandes du wrapper Storyblok par framework.

### Mise en scène et promotion

Chaque appel Forge écrit dans une étape locale de package unique sous `node_modules/.cache/forge-build/`. La scène est
ignoré par les entrées de Turbo et n'est jamais publié. La sortie d'une build réussie est vérifiée avant la promotion :

- Le **Mode agrégat** remplace atomiquement l'arborescence `dist` complète appartenant à Forge. Fichiers neutres, framework et CMS obsolètes
  sont donc supprimés au lieu de satisfaire les exportations accidentellement.
- **Le mode ciblé** remplace atomiquement uniquement le sous-arbre de framework sélectionné (et son sous-arbre wrapper CMS correspondant),
  en préservant les sorties neutres, framework, e-mail et CMS non liées déjà dans `dist`. Le coureur étend la portée du sélecteur CMS
  (par exemple `FORGE_CMS_STORYBLOK_TARGET`) au framework demandé aux côtés de `FORGE_FRAMEWORK_TARGET`, donc le CMS d'un package
  le câblage (`forgeStoryblokCmsTargets`, etc.) reconstruit en fait le wrapper correspondant dans la même étape au lieu d'être
  silencieusement abandonné de la promotion. La promotion efface uniquement un sous-arbre de wrapper CMS que l'étape a régénéré ; ce n'est jamais
  supprime un wrapper CMS frère que la version actuelle n'a pas reconstruit.
- Les actifs partagés CMS tels que les schémas Storyblok et `components.json` ont une destination partagée et ne sont pas supprimés par un
  promotion ultérieure du cadre.
- Un échec du compilateur, une étape vide ou un échec de promotion laisse l'arborescence publiée précédente intacte et supprime le
  scène temporaire et répertoire de promotion.

La sortie publiée reste sous le contrat `dist` existant : modules et déclarations neutres, répertoires-cadres
(`vue`, `react`, `svelte`, `solid`, `web-components`) et projections CMS sous `cms/<cms>/<framework>`. Exportation de packages
les cartes, y compris les conditions `mp:*` et les sous-chemins CMS, continuent d'être résolues par rapport à ces chemins promus.

### Tâches de package

| Tâche | Descriptif |
| :----------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `build` | Agrégez les sorties neutres, de cadre, de déclaration, de courrier électronique et de CMS configurées via le programme d'exécution Forge partagé. |
| `build:forge` | Alias ​​de compatibilité de sortie Forge neutre ciblé.                                                           |
| `build:react`, `build:vue`, `build:svelte` | Alias ​​de compatibilité de framework ciblés.                                                                    |
| `build:solid`, `build:web-components` | Alias ​​de compatibilité de framework ciblés.                                                                    |
| `build:check` | Valide les types pour un espace de travail sans publier la sortie.                                                   |
| `build:watch` | Démarre une génération incrémentielle en mode surveillance pour un espace de travail.                                                   |

Turbo hache les sélecteurs cibles (`FORGE_BUILD_TARGET` et les anciens sélecteurs Forge/CMS) avec les sélecteurs partagés.
sources de coureur et de mise en scène. Par conséquent, les builds agrégées et ciblées ne peuvent pas réutiliser les résultats mis en cache les uns des autres. Finale
La sortie `dist/**` est mise en cache ; les répertoires temporaires de mise en scène et de promotion sont explicitement exclus.

### Étapes de création d'applications

Les applications qui ont des étapes de construction significatives de manière indépendante exposent ces étapes sous forme de tâches Turbo plutôt que de chaînage.
les dans `build` :

- `@mission-platform/docs` exécute `build:check`, `build:bundle`, `build:prerender` et `build:verify` dans l'ordre.
- `@mission-platform/figma-forge-plugin` exécute `build:check`, `build:ui` et `build:main` via sa tâche agrégée `build`.
- `@mission-platform/icons` exécute `build:check`, `build:generate` et `build:sprite` via sa tâche agrégée `build`.

Les scripts d'agrégation vérifient uniquement que la sortie appartenant à la tâche existe ; Turbo possède la planification, l'ordre des dépendances et
restauration du cache. Cela permet de conserver les étapes individuelles observables et d'éviter les invocations Turbo imbriquées ou la construction au niveau du shell.
orchestration.

### Stratégie de mise en cache

Turborepo met en cache les artefacts suivants :

- `dist/**` : Création d'artefacts JS/CSS.
- `.vite/**` : Cache interne de Vite.
- `coverage/**` : Rapports de couverture des tests.

Pour contourner le cache et forcer une nouvelle build, utilisez l'indicateur `--force` :

```bash
pnpm build:force
```

Les tâches de déclaration uniquement peuvent également être mises en cache : `build:types` enregistre `dist/**/*.d.ts` et les mappages de déclaration en tant que sorties, donc
les builds de type ciblé restaurent les fichiers requis par les packages en aval.

Les alias de compatibilité et les tâches en mode artefact CMS sont des tâches de package, donc Turbo applique toujours leur graphe de dépendances et
entrées de cache spécifiques à la cible. Les étapes temporaires ne sont pas des sorties de cache ; seule l'arborescence `dist` promue est publiée ou
restauré à partir du cache.

## Configurations partagées

Les configurations de build sont centralisées dans le répertoire `packages/tooling/configs/` pour maintenir la cohérence dans le monorepo.

| Forfait | Objectif |
| :------------------------------------ | :----------------------------------------------------------- |
| `@mission-platform/vite-config` | Logique Vite partagée pour les applications et les versions spécifiques à Vue.          |
| `@mission-platform/tsdown-config` | Logique tsdown partagée pour les packages de bibliothèque.                    |
| `@mission-platform/typescript-config` | Basez les préréglages `tsconfig.json` pour les applications, les bibliothèques et les tests. |
| `@mission-platform/postcss-config` | Traitement CSS standardisé (Autoprefixer, etc.).            |

## Chaîne d'outils TypeScript 7

Le catalogue de l'espace de travail épingle le compilateur sur TypeScript stable `7.0.2`. Les vérifications de l'espace de travail et les constructions de déclarations utilisent le
exécutable natif `tsc`, tandis que les intégrations de l'éditeur utilisent le serveur de langue native de TypeScript :

```bash
pnpm exec tsc --version
pnpm exec tsc --lsp --stdio
```

Les préréglages partagés dans `@mission-platform/typescript-config` restent la source de vérité pour la cible, la résolution du module,
types ambiants, rigueur, références de projet et sortie de déclaration. Les outils Forge et CMS n'utilisent pas les éléments supprimés
API du compilateur TypeScript ; il consomme à la place les contrats neutres par l'analyseur/OXC appartenant au référentiel. Cette frontière alimente également
le scanner de documentation du package et conserve la sortie Forge générée indépendamment des composants internes de l'API du compilateur.

Les fichiers JavaScript et de déclaration compilés sont émis uniquement dans le répertoire `dist` du package propriétaire. Forge est générée
L'arborescence source du framework est une entrée de construction temporaire et est supprimée une fois le bundle terminé ; il ne doit pas quitter `*.js` ou
Fichiers `*.d.ts` sous `src` ou répertoires de cache au niveau du package.

Les déclarations du package Vue-target sont synthétisées par le plugin de déclaration Forge `tsdown`. Ce chemin émet un package
déclarations sans invoquer `vue-tsc` ; il ne fournit pas de vérification de type pour les modèles SFC d'application arbitraires.
Les contrôles SFC des applications restent une porte d'acceptation explicite et nécessitent actuellement un TypeScript 7 en amont compatible
Version `vue-tsc`. Le `vue-tsc@3.3.11` disponible échoue par rapport à TypeScript `7.0.2` avec
`ERR_PACKAGE_PATH_NOT_EXPORTED` pour `typescript/lib/tsc`, alors que `tsc` natif ne vérifie pas intentionnellement `.vue`
fichiers. N'ajoutez pas d'alias de compatibilité TypeScript 6 pour contourner cette limite.

La configuration partagée ESLint utilise `@babel/eslint-parser` pour la syntaxe TypeScript, TSX et Vue et un petit
plugin de compatibilité appartenant au référentiel pour les `@typescript-eslint/no-explicit-any` et conservés
`@typescript-eslint/consistent-type-imports` ID de règle. Il s'agit intentionnellement uniquement de syntaxe : le courant
La version `typescript-eslint` rejette TypeScript 7, donc les règles de charpie sensibles au type sont remplacées par le TypeScript partagé
`noUnusedLocals` et `noUnusedParameters` vérifient jusqu'à ce qu'une version en amont compatible soit disponible.

## Développement local vs production

### Développement (tâche `dev`)

Le serveur de développement de Vite fournit le remplacement de module à chaud (HMR). Lorsque la tâche `dev` d'une application démarre, Turborepo s'exécute également
la tâche `build:watch` de la bibliothèque de composants à côté (via la clé `with` de la tâche), donc les modifications sont apportées à
`@mission-platform/components` sont recompilés automatiquement et récupérés par l'application en cours d'exécution sans reconstruction manuelle.

### Production (tâche `build`)

Turborepo exécute les builds dans l'ordre topologique. Un package n'est construit qu'une fois que toutes ses dépendances internes ont été créées.
construit avec succès. La sortie dans `dist/` correspond à ce qui est finalement publié ou déployé.

## Avancé : intégration WASM

Certains packages (par exemple, `@mission-platform/hunspell`, scanners de codes-barres) impliquent du code Rust compilé sur WebAssembly. Ces
les builds sont orchestrées via des tâches spécialisées qui utilisent `wasm-pack` pour garantir la cohérence et l'optimisation de l'environnement
performances.
