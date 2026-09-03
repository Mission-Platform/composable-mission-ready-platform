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

- **Pipeline défini dans `turbo.json`** : tâches telles que `build`, `test`, et `lint` sont définis avec leurs dépendances
  (par exemple, `build` dépend de `^build`, ce qui signifie que toutes les dépendances doivent être construites en premier).
- **Hashing** : Turborepo hache les fichiers sources, les variables d'environnement et les dépendances globales pour déterminer si une tâche est exécutée.
  la sortie peut être réutilisée à partir du cache.
- **Parallélisme** : les tâches indépendantes sont exécutées simultanément pour maximiser l'utilisation du processeur.

### 2. Compilation de packages (tsdown)

La plupart des packages de bibliothèques dans `packages/` utilisez **tsdown** pour la compilation.

- **Vitesse** : construit sur **Rolldown** (le successeur de Rollup basé sur Rust), permettant des builds quasi instantanés.
- **Dégroupage** : les packages sont construits avec `unbundle: true`, en préservant la structure originale du module dans `dist/`. Ceci
  garantit un tremblement d'arborescence optimal et un meilleur débogage dans les applications grand public.
- **CSS Threading** : un plugin personnalisé relie les feuilles de style extraites à leurs modules JS propriétaires, garantissant ainsi que
  l'importation d'un composant extrait automatiquement ses styles.

### 3. Regroupement d'applications (Vite)

Applications déployables dans `apps/` utiliser **Vite** pour le regroupement de développement et de production.

- **Configurations partagées** : les applications s'étendent `@mission-platform/vite-config` pour garantir la cohérence des pipelines PostCSS et
  résolution indépendante du framework.
- **Prise en charge SSR/SSG** : applications telles que `my-care-notes` utiliser `vite-ssg` pour la génération de sites statiques.

### Constructions de packages Forge

Les versions du package Forge ajoutent un frontal de compilateur neutre au normal `tsdown` ou Vite couler. Un package consommateur importe
les plugins de framework qu'il souhaite et transmet des instances explicites à `defineTsdownForgeComponents` ou
`defineTsdownForgeHooks`. Le pilote neutre crée une IR sémantique une fois, puis le plugin sélectionné possède l'abaissement de la cible,
génération de sources, déclarations, externes d'exécution et son natif Vite/tsdown adaptateur.

La sortie de la plateforme de contenu est un deuxième axe orthogonal configuré via `@mission-platform/forge-cms-plugin-api`. Un
laissez-passer grand public `defineTsdownForgeCms` (ou `defineTsdownForgeCmsAll`) une liste de `CmsOutputPlugin` instances, chacun de
qui _compose_ un plugin de framework — `forgeStoryblokCms({ packageName, plugin, storyblokRuntime })`,
`forgeAstroCms({ packageName, plugin })`, et ainsi de suite pour Ghost, Jekyll et Webflow. Parce que la plateforme et le
les cadres sont choisis indépendamment, `storyblok × vue` et `astro × solid` sont une configuration plutôt qu'un nouveau code.

Les builds CMS émettent vers `dist/cms/<cms>/<framework>/**`, avec des manifestes et autres side-cars de plate-forme reflétés dans
`dist/cms/<cms>/`. Les cibles qui nécessitent un runtime hydraté (Astro, Webflow) co-générent une arborescence d'îlots à partir de la limite
plugin framework dans la même version. La répartition complète des responsabilités et les limites des étapes sont décrites dans
[Pipeline du compilateur Forge](../../../packages/tooling/vite/forge/docs/locales/fr/reference/compiler.md).

## Contrat de construction

`pnpm build` est la construction globale canonique. Il délègue à Turboau niveau du package `build` tâche sans définir de
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

Les alias utilisent le même coureur typé que `build`; ils ne contiennent pas d'informations indépendantes `tsdown` mises en œuvre. `build:forge`
sélectionne la cible neutre, tandis que les alias du framework sélectionnent le répertoire du framework correspondant. Spécifique au package
Les commandes du mode artefact du CMS restent disponibles lorsqu'elles sont exposées, y compris la commande des ressources Storyblok partagées et la
commandes du wrapper Storyblok par framework.

### Mise en scène et promotion

Chaque invocation de Forge écrit dans une étape locale de package unique sous `node_modules/.cache/forge-build/`. La scène est
ignoré par Turboet n'est jamais publié. La sortie d'une build réussie est vérifiée avant la promotion :

- Le **mode agrégat** remplace atomiquement le système complet appartenant à Forge. `dist` arbre. Fichiers neutres, framework et CMS obsolètes
  sont donc supprimés au lieu de satisfaire les exportations accidentellement.
- **Le mode ciblé** remplace atomiquement uniquement le sous-arbre de framework sélectionné (et son sous-arbre wrapper CMS correspondant),
  en préservant les sorties neutres, framework, e-mail et CMS sans rapport déjà présentes `dist`. Le coureur étend la portée du sélecteur CMS
  (par ex. `FORGE_CMS_STORYBLOK_TARGET`) au cadre demandé aux côtés `FORGE_FRAMEWORK_TARGET`, donc le CMS d'un package
  câblage (`forgeStoryblokCmsTargets`, etc.) reconstruit en fait le wrapper correspondant au cours de la même étape au lieu d'être
  silencieusement abandonné de la promotion. La promotion efface uniquement un sous-arbre de wrapper CMS que l'étape a régénéré ; ce n'est jamais
  supprime un wrapper CMS frère que la version actuelle n'a pas reconstruit.
- Actifs partagés CMS tels que les schémas Storyblok et `components.json` ont une destination partagée et ne sont pas supprimés par un
  promotion ultérieure du cadre.
- Un échec du compilateur, une étape vide ou un échec de promotion laisse l'arborescence publiée précédente intacte et supprime le
  scène temporaire et répertoire de promotion.

La sortie publiée reste sous la forme existante `dist` contrat : modules et déclarations neutres, répertoires-cadres
(`vue`, `react`, `svelte`, `solid`, `web-components`), et projections CMS sous `cms/<cms>/<framework>`. Exportation de packages
des cartes, y compris `mp:*` conditions et sous-chemins CMS, continuez à résoudre ces chemins promus.

### Tâches de package

| Tâche | Descriptif |
| :------------ | :------------------------------------------------------------------------------------------------------- |
| `build`       | Agrégez les sorties neutres, de cadre, de déclaration, de courrier électronique et de CMS configurées via le programme d'exécution Forge partagé. |
| `build:forge` | Alias ​​de compatibilité de sortie Forge neutre ciblé.                                                      |
| `build:react`, `build:vue`, `build:svelte` | Alias ​​de compatibilité de framework ciblés.                                      |
| `build:solid`, `build:web-components` | Alias ​​de compatibilité de framework ciblés.                                         |
| `build:check` | Valide les types pour un espace de travail sans publier la sortie.                                               |
| `build:watch` | Démarre une génération incrémentielle en mode surveillance pour un espace de travail.                                               |

Turbo hache les sélecteurs cibles (`FORGE_BUILD_TARGET` et les anciens sélecteurs Forge/CMS) ainsi que les
sources de coureur et de mise en scène. Par conséquent, les builds agrégées et ciblées ne peuvent pas réutiliser les résultats mis en cache les uns des autres. Final
`dist/**` la sortie est mise en cache ; les répertoires temporaires de mise en scène et de promotion sont explicitement exclus.

### Stratégie de mise en cache

Turborepo met en cache les artefacts suivants :

- `dist/**`: Construit des artefacts JS/CSS.
- `.vite/**`: Vitele cache interne de.
- `coverage/**`: Rapports de couverture des tests.

Pour contourner le cache et forcer une nouvelle build, utilisez le `--force` drapeau:

```bash
pnpm build:force
```

Les alias de compatibilité et les tâches en mode artefact du CMS sont des tâches de package. Turbo applique toujours leur graphe de dépendance et
entrées de cache spécifiques à la cible. Les étapes temporaires ne sont pas des sorties de cache ; seulement les promus `dist` l'arbre est publié ou
restauré à partir du cache.

## Configurations partagées

Les configurations de build sont centralisées dans le `packages/tooling/configs/` répertoire pour maintenir la cohérence dans le monorepo.

| Forfait | Objectif |
| :------------------------------------ | :----------------------------------------------------------- |
| `@mission-platform/vite-config`       | Commun Vite logique pour les applications et Vue-versions spécifiques.          |
| `@mission-platform/tsdown-config`     | Logique tsdown partagée pour les packages de bibliothèque.                    |
| `@mission-platform/typescript-config` | Base `tsconfig.json` préréglages pour les applications, les bibliothèques et les tests. |
| `@mission-platform/postcss-config`    | Traitement CSS standardisé (Autoprefixer, etc.).            |

## Développement local vs production

### Développement (`dev` tâche)

ViteLe serveur de développement de fournit le remplacement de module à chaud (HMR). Lorsqu'une application `dev` la tâche démarre, Turborepo s'exécute également
la bibliothèque de composants `build:watch` tâche à côté (via le `with` clé), donc modifie à
`@mission-platform/components` sont recompilés automatiquement et récupérés par l'application en cours d'exécution sans reconstruction manuelle.

### Production (`build` tâche)

Turborepo exécute les builds dans l'ordre topologique. Un package n'est construit qu'une fois que toutes ses dépendances internes ont été créées.
construit avec succès. La sortie dans `dist/` c'est ce qui est finalement publié ou déployé.

## Avancé : intégration WASM

Certains forfaits (par ex. `@mission-platform/hunspell`, scanners de codes-barres) impliquent du code Rust compilé dans WebAssembly. Ces
les builds sont orchestrés via des tâches spécialisées qui utilisent `wasm-pack` pour assurer la cohérence et l'optimisation de l'environnement
performances.
