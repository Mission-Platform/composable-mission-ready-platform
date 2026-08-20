# Référence API

Référence technique pour les packages de base et les adaptateurs de framework Mission Platform.

> **Les importations sont toujours nues.** Framework-shipping `@mission-platform/*` les packages exposent un seul `.`
> entrée gardée par le `mp:vue`, `mp:react`, `mp:solid`, et `mp:web-component` exporter
> conditions. Sélectionnez le framework **une fois** — via `resolve.conditions` (voir `defineFrameworkAppConfig` /
> `frameworkResolveConditions` depuis `@mission-platform/vite-config`) et `customConditions` (via le
> `@mission-platform/typescript-config/framework-<name>` presets) - puis importez le tout avec le nu
> spécificateur de package. Voir [Configuration du consommateur externe](external-consumer-setup.md).

## Core Framework

### @mission-platform/forge

La base de l'architecture « à écriture unique », fournissant un environnement d'exécution et des hooks JSX neutres en termes de framework.

| Exporter           | Type       | Forfait                                                                                                                        |
| :----------------- | :--------- | :----------------------------------------------------------------------------------------------------------------------------- |
| `h`, `Fragment`    | Fonction   | Usine JSX et fragment pour la création de composants.                                                          |
| `useState`         | Crochet    | Hook d’état indépendant du framework.                                                                          |
| `useEffect`        | Crochet    | Crochet à effet neutre pour le cadre.                                                                          |
| `useMemo`          | Crochet    | Crochet de mémorisation indépendant du framework.                                                              |
| `useRef`           | Crochet    | Crochet de référence indépendant du framework.                                                                 |
| `useContext`       | Crochet    | Hook contextuel indépendant du framework.                                                                      |
| `toVueComponent`   | Adaptateur | Convertit un composant de forge en un Vue 3 composants (de `@mission-platform/forge/vue`).  |
| `toReactComponent` | Adaptateur | Convertit un composant de forge en un React composant (de `@mission-platform/forge/react`). |

### @mission-platform/vite-plugin-forge

The compiler driver accepts explicit `FrameworkOutputPlugin` instances; it does
not provide a framework registry. `defineViteForgeComponents` and
`defineTsdownForgeComponents` (plus the hook and CMS helpers) share an in-process
`ForgeCompilerService` for one build or watch session.

| Capability         | Descriptif                                                                                                                                                                          |
| :----------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service lifecycle  | Reuse source, graph, parsed-source, semantic-IR, and target-artifact state across builds; dispose one-shot services after completion and watcher services on close. |
| Cache keys         | Source/dependency/config fingerprints, compiler and router options, `tsconfig` `baseUrl`/`paths`, target ID, plugin identity/version, and relevant conditions.      |
| Watch invalidation | Changed files invalidate reverse graph dependents, including transitive component and hook entries; unrelated target snapshots remain reusable.                     |
| Diagnostics/report | Reports phase timing, cache hit/miss counts, affected files, warnings, errors, and emitted artifact counts. Errors block promotion.                 |
| Artifact manifest  | Lists target-scoped entries, modules, declarations, source maps, assets, and checksums before atomic promotion.                                                     |
| Extension point    | Implement and pass a `FrameworkOutputPlugin` from a caller-owned `forge-plugin-*` package; do not add target branches to the neutral driver.                        |

Configure aliases through the project `tsconfig.json` (`baseUrl` and
`paths`); Vite and tsdown graph preparation use the same alias facts. Router
selection, router plugins, and conditions are forwarded through component and
hook helpers. A future worker/daemon may sit behind the service contract, but
the supported implementation is currently in-process.

### @mission-platform/router

Framework-neutral route contracts, pure matching helpers, and compiler markers for
shared packages. Applications own route records and native router instances; the
Forge router target selected by the application supplies the runtime capabilities.

| Exporter                                                             | Type             | Descriptif                                                                                                                                            |
| :------------------------------------------------------------------- | :--------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MpRoute`                                                            | Types            | Route records, params, query/hash state, metadata, and navigation targets.                                                            |
| `defineRoutes`                                                       | Fonction         | Define route trees and resolve paths without a DOM or framework runtime.                                                              |
| `MpNavigationResult`, `MpRouteGuard`, `MpHistory`, `MpRouterAdapter` | Types            | Navigation outcomes/events, guards, pluggable history, and adapter contracts.                                                         |
| `useMpRoute`                                                         | Compiler markers | Neutral link, route-state, navigation, resolution, and outlet capabilities consumed by shared packages.                               |
| `@mission-platform/forge-router-*`                                   | Objectif         | Independently selected native router targets for Vue Router, React Router, SolidJS Router, SvelteKit, RedwoodSDK, and Web Components. |

Runtime packages own history and reactive state; the neutral package never imports a UI framework. For Web Components,
register the elements once and pass complex targets through DOM properties rather than serialized attributes:

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from '@mission-platform/forge-router-web-components/runtime';

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory('/overview'),
  routes: [{ path: '/overview', component: () => 'Documentation' }],
});
setForgeRouter(router);
const link = document.createElement('forge-router-link');
link.to = { path: '/overview', query: { q: 'router' }, hash: 'results' };
link.router = router;
```

## Interface utilisateur et conception

### @mission-platform/tokens

Jetons de conception centralisés pour les couleurs, la typographie et l'espacement.

| Exporter      | Descriptif                                                                                                                    |
| :------------ | :---------------------------------------------------------------------------------------------------------------------------- |
| `tokens`      | Objet JS/TS contenant tous les jetons de conception (par exemple, `tokens.color.primary`). |
| `tokens.scss` | Variables SCSS à utiliser dans les feuilles de style.                                                         |

### @mission-platform/breakpoints

Utilitaires réactifs et composants de visibilité.

| Exporter         | Type      | Descriptif                                                                                        |
| :--------------- | :-------- | :------------------------------------------------------------------------------------------------ |
| `useBreakpoints` | Crochet   | Renvoie l'état du point d'arrêt réactif.                                          |
| `ShowIf`         | Composant | Restitue les enfants uniquement lorsqu'une condition de point d'arrêt correspond. |
| `HideIf`         | Composant | Masque les enfants lorsqu’une condition de point d’arrêt correspond.              |

### @mission-platform/components

Composants d'interface utilisateur partagés créés une seule fois et disponibles pour plusieurs frameworks.

- **Importer** : toujours `@mission-platform/components`; l'actif `mp:<framework>` la condition décide si vous obtenez le
  Vue 3, React, Solid, ou la construction d'un composant Web.
- **Sous-chemins par composant** : `@mission-platform/components/<path>` (e.g.
  `@mission-platform/components/atoms/forge-badge/forge-badge`) est également sensible aux conditions et charge uniquement le composant de ce composant.
- **Composants** : `ForgeButton`, `ForgeInput`, `ForgeModal`, et plus encore.

## Ensembles de fonctionnalités

### @mission-platform/i18n

Système d'internationalisation basé sur i18next.

| Exporter          | Descriptif                                                                                              |
| :---------------- | :------------------------------------------------------------------------------------------------------ |
| `createForgeI18N` | Initialise l'instance i18n avec les valeurs par défaut de la plateforme.                |
| `useI18n`         | Hook pour les traductions et le changement de paramètres régionaux dans les composants. |

### @mission-platform/seo

Meta tag and SEO management.

| Exporter | Descriptif                                                                                                                          |
| :------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| `useSeo` | Accrochez-vous pour définir de manière déclarative le titre de la page, les balises méta et les données Open Graph. |

### @mission-platform/map

Wrapper réactif pour MapLibre GL.

| Composant       | Descriptif                                                                 |
| :-------------- | :------------------------------------------------------------------------- |
| `<MpMap>`       | Composant principal du conteneur de carte.                 |
| `<MpMapMarker>` | Composant permettant de placer des marqueurs sur la carte. |

### @mission-platform/code-scanner

Numérisation de codes-barres et de codes QR par caméra.

| Composant         | Descriptif                                                                                        |
| :---------------- | :------------------------------------------------------------------------------------------------ |
| `<MpCodeScanner>` | Composant qui initialise le flux de la caméra et émet les résultats de l'analyse. |

## Intégrations

### @mission-platform/rxjs

Relie les observables RxJS à l’état du composant.

| Crochet         | Descriptif                                                                                      |
| :-------------- | :---------------------------------------------------------------------------------------------- |
| `useObservable` | S'abonne à un observable et renvoie sa dernière valeur en tant qu'état réactif. |

### @mission-platform/d3

Intégration D3.js neutre en termes de framework.

| Crochet | Descriptif                                                                                      |
| :------ | :---------------------------------------------------------------------------------------------- |
| `useD3` | Lie une sélection D3 à une référence de composant avec gestion du cycle de vie. |

### @mission-platform/hunspell

Vérification orthographique basée sur WebAssembly.

| Exporter       | Descriptif                                                           |
| :------------- | :------------------------------------------------------------------- |
| `initHunspell` | Charge et instancie le module Hunspell WebAssembly.  |
| `spell`        | Vérifie si un mot est correctement orthographié.     |
| `suggest`      | Fournit des suggestions orthographiques pour un mot. |

## Lectures complémentaires

- [Vue 2 à Vue 3 Guide de migration](migration-guides/vue2-to-vue3.md)
- [Présentation de la configuration du projet](configs/index.md)
- [Structure de l'espace de travail](workspace-structure.md)

## Index complet des packages d'espace de travail

L'index suivant est généré à partir des manifestes du package et est conservé ici afin que la référence de l'API publique couvre chaque
paquet dans `packages/`, y compris les façades typées WebAssembly.

### Core and UI

| Package                        | Objectif                                                                                           |
| :----------------------------- | :------------------------------------------------------------------------------------------------- |
| `@mission-platform/forge`      | Exécution et adaptateurs JSX indépendants du framework.                            |
| `@mission-platform/components` | Composants d'interface utilisateur à écriture unique.                              |
| `@mission-platform/icons`      | Composants d'icône SVG à écriture unique.                                          |
| `@mission-platform/layouts`    | Composants d’application, de conteneur et de mise en page réactive.                |
| `@mission-platform/forms`      | Formulaires de schéma et composants de création de formulaires visuels.            |
| `@mission-platform/forms-core` | Dérivation de schéma, validation et logique de domaine de création de formulaires. |
| `@mission-platform/tokens`     | Propriétés personnalisées CSS et jetons de conception SCSS.                        |

### Composables et intégrations

| Package                                         | Forfait                                                                                                                              |
| :---------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| `@mission-platform/breakpoints`                 | État du point d’arrêt réactif et aides à la visibilité.                                                              |
| `@mission-platform/d3`                          | Utilitaires composables et marges du cycle de vie de sélection D3.                                                   |
| `@mission-platform/i18n`                        | Assistants d'intégration d'état et de framework i18next.                                                             |
| `@mission-platform/map`                         | Composants cartographiques et composables MapLibre.                                                                  |
| `@mission-platform/observers`                   | Composables d'intersection, de mutation et d'observateur de performances.                                            |
| `@mission-platform/phone-number`                | Analyse et formatage du numéro de téléphone WebAssembly saisi.                                                       |
| `@mission-platform/router`                      | Framework-neutral route contracts and compiler capabilities.                                                         |
| `@mission-platform/forge-router-web-components` | Web Components router target and framework-free runtime.                                                             |
| `@mission-platform/rxjs`                        | Observables RxJS et composables par abonnement.                                                                      |
| `@mission-platform/scheduler`                   | Logique de domaine de l’interface utilisateur du planificateur, de la récurrence et de la disposition du calendrier. |
| `@mission-platform/vcard`                       | Données et composants RFC 6350 vCard et RFC 5545 iCalendar.                                                          |
| `@mission-platform/content`                     | Contenu AST, constructeurs, composants Monaco, Markdown et WYSIWYG.                                                  |
| `@mission-platform/seo`                         | Métadonnées, Open Graph et composables de données structurées.                                                       |
| `@mission-platform/speech-audio`                | Composables vocaux, audio et Web MIDI.                                                                               |
| `@mission-platform/three`                       | Canevas Three.js et composables de cycle de vie.                                                     |

### Packages Code et WebAssembly

| Package                                     | Objectif                                                                    |
| :------------------------------------------ | :-------------------------------------------------------------------------- |
| `@mission-platform/barcode`                 | Code-barres 1D encodant/décodant la façade et le composant. |
| `@mission-platform/code-scan-wasm`          | Module WebAssembly du scanner d'images généré.              |
| `@mission-platform/code-scanner`            | Composant d'analyse de code d'appareil photo et d'image.    |
| `@mission-platform/matrix-code`             | Façade d'encodage/décodage Data Matrix et Aztec.            |
| `@mission-platform/matrix-code-decode-wasm` | Module WebAssembly de décodeur de code matriciel généré.    |
| `@mission-platform/matrix-code-encode-wasm` | Module WebAssembly d'encodeur Matrix Code généré.           |
| `@mission-platform/qr-code`                 | QR encodage/décodage de la façade et du composant.          |
| `@mission-platform/qr-code-decode-wasm`     | Module WebAssembly d'encodeur QR généré.                    |
| `@mission-platform/qr-code-encode-wasm`     | Module WebAssembly de décodeur QR généré.                   |
| `@mission-platform/harper`                  | Intégration de la grammaire et du style Harper pour Monaco. |
| `@mission-platform/hunspell`                | Wrapper de vérification orthographique Emscripten Hunspell. |

### Cibles du compilateur Forge

Ceux-ci vivent dans `forge-plugins/` plutôt que `packages/`. Un plugin **framework** décide quel runtime est un composant neutre
est abaissé à ; une cible **CMS** décide sur quelle plateforme de contenu elle est projetée. Les deux axes composent, donc n'importe quel CMS
target peut être lié à n’importe quel plugin de framework. Voir [Pipeline du compilateur Forge](forge-compiler.md).

| Package                                         | Objectif                                                                                                      |
| :---------------------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| `@mission-platform/forge-plugin-api`            | `FrameworkOutputPlugin` contrat, types IR sémantiques et types d’adaptateur de construction.  |
| `@mission-platform/forge-plugin-react`          | React cible de sortie.                                                                        |
| `@mission-platform/forge-plugin-vue`            | Vue 3 cibles de sortie.                                                                       |
| `@mission-platform/forge-plugin-solid`          | Solid cible de sortie.                                                                        |
| `@mission-platform/forge-plugin-svelte`         | Svelte 5 objectifs de sortie.                                                                 |
| `@mission-platform/forge-plugin-web-components` | Cible de sortie des composants Web.                                                           |
| `@mission-platform/forge-cms-plugin-api`        | `CmsOutputPlugin` contrat, modèle de contenu neutre, pilote CMS et aides à la création.       |
| `@mission-platform/forge-cms-storyblok`         | Objets de composant Storyblok, wrappers de blok et `components.json`.                         |
| `@mission-platform/forge-cms-astro`             | Statique `.astro` modèles et `client:load` îles-cadres.                                       |
| `@mission-platform/forge-cms-ghost`             | Des partiels de guidon Ghost et un `config.custom` fragment de thème.                         |
| `@mission-platform/forge-cms-jekyll`            | Jekyll Liquid comprend, `_data` schéma, et un `_config.yml` fragment.                         |
| `@mission-platform/forge-cms-webflow`           | Flux Web `declareComponent` composants de code et un `webflow.json` fragment de bibliothèque. |

#### @mission-platform/forge-cms-plugin-api

| Exporter                  | Type     | Descriptif                                                                                                               |
| :------------------------ | :------- | :----------------------------------------------------------------------------------------------------------------------- |
| `analyzeContentComponent` | Fonction | Projette les accessoires d'un composant neutre sur le modèle de contenu neutre en termes de plate-forme. |
| `ContentComponent`        | Type     | Ordonné `ContentField`s, emplacements et le `interactive` drapeau.                                       |
| `ContentFieldKind`        | Type     | `text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`.                          |
| `CmsOutputPlugin`         | Type     | Le contrat cible : un plugin de framework lié plus les quatre émetteurs.                 |
| `defineForgeCmsPlugin`    | Fonction | Valide une cible CMS au moment de la configuration.                                                      |
| `generateCmsArtifacts`    | Fonction | Le pilote générique découverte → IR → modèle de contenu → émission → pilote d'écriture.                  |
| `defineTsdownForgeCms`    | Fonction | configuration tsdown pour une cible CMS, émettant `dist/cms/<cms>/<framework>/**`.                       |
| `defineTsdownForgeCmsAll` | Fonction | configurations tsdown pour une liste de cibles CMS.                                                      |
