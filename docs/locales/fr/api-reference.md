# Répertoire des API du package

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/api-reference.md: [docs/api-reference.md](../../api-reference.md)
> Langue: Français (fr)

Cette page à l'échelle du projet est un répertoire des fonctionnalités et de la compatibilité des packages.
contrats. L'installation canonique, l'utilisation, les limitations et les détails de l'API pour
chaque package vit à côté de ce package sous `packages/*/docs/`, `configs/*/docs/`,
et `forge-plugins/*/docs/`. Les références API générées doivent être ajoutées au propriétaire
package plutôt que cette page.

> **Les importations sont toujours nues.** Framework-shipping `@mission-platform/*` les packages exposent un seul `.`
> entrée gardée par le `mp:vue`, `mp:react`, `mp:solid`, et `mp:web-component` exporter
> conditions. Sélectionnez le framework **une fois** — via `resolve.conditions` (voir `defineFrameworkAppConfig` /
> `frameworkResolveConditions` depuis `@mission-platform/vite-config`) et `customConditions` (via le
> `@mission-platform/typescript-config/framework-<name>` presets) - puis importez le tout avec le nu
> spécificateur de package. Voir [Configuration du consommateur externe](external-consumer-setup.md).

## Cadre de base

### @mission-platform/forge

La base de l'architecture « à écriture unique », fournissant un environnement d'exécution et des hooks JSX neutres en termes de framework.

| Exporter | Tapez | Descriptif |
|:-------------------|:---------|:----------------------------------------------------------------------------------------|
| `h`, `Fragment`    | Fonction | Usine JSX et fragment pour la création de composants.                                      |
| `useState`         | Crochet | Hook d’état indépendant du framework.                                                           |
| `useEffect`        | Crochet | Crochet à effet neutre pour le cadre.                                                          |
| `useMemo`          | Crochet | Crochet de mémorisation indépendant du framework.                                                     |
| `useRef`           | Crochet | Hook de référence indépendant du framework.                                                       |
| `useContext`       | Crochet | Hook contextuel indépendant du framework.                                                         |
| `toVueComponent`   | Adaptateur | Convertit un composant de forge en un Vue 3 composants (de `@mission-platform/forge/vue`).   |
| `toReactComponent` | Adaptateur | Convertit un composant de forge en un React composant (de `@mission-platform/forge/react`). |

### @mission-platform/vite-plugin-forge

Le pilote du compilateur accepte les `FrameworkOutputPlugin` exemples ; ça fait
ne fournit pas de registre-cadre. `defineViteForgeComponents` et
`defineTsdownForgeComponents` (plus le hook et les assistants CMS) partagent un processus en cours
`ForgeCompilerService` pour une session de construction ou de surveillance.

| Capacité | Descriptif |
|:-----------|:------------|
| Cycle de vie des services | Réutilisez l’état de la source, du graphique, de la source analysée, de l’IR sémantique et de l’artefact cible dans toutes les versions ; disposez des services ponctuels une fois terminés et des services d'observation à la clôture. |
| Clés de cache | Empreintes sources/dépendances/configuration, options du compilateur et du routeur, `tsconfig` `baseUrl`/`paths`, ID cible, identité/version du plugin et conditions pertinentes. |
| Invalidation de la montre | Les fichiers modifiés invalident les dépendants du graphique inversé, y compris les composants transitifs et les entrées de hook ; les instantanés cibles non liés restent réutilisables. |
| Diagnostic/rapport | Rapporte la synchronisation des phases, le nombre d'échecs/échecs du cache, les fichiers concernés, les avertissements, les erreurs et le nombre d'artefacts émis. Des erreurs bloquent la promotion. |
| Manifeste d’artefact | Répertorie les entrées, les modules, les déclarations, les cartes sources, les actifs et les sommes de contrôle de portée cible avant la promotion atomique. |
| Point de rallonge | Mettre en œuvre et adopter un `FrameworkOutputPlugin` d'un appelant appartenant `forge-plugin-*` emballer; n'ajoutez pas de branches cibles au pilote neutre. |

Configurer les alias via le projet `tsconfig.json` (`baseUrl` et
`paths`); Vite et la préparation du graphique tsdown utilise les mêmes faits d'alias. Routeur
la sélection, les plugins de routeur et les conditions sont transmis via le composant et
aides au crochet. Un futur travailleur/démon peut être assis derrière le contrat de service, mais
la mise en œuvre prise en charge est actuellement en cours.

### @mission-platform/router

Contrats de route neutres, aides à la correspondance pure et marqueurs du compilateur pour
forfaits partagés. Les applications possèdent des enregistrements de routage et des instances de routeur natives ; le
La cible du routeur Forge sélectionnée par l'application fournit les capacités d'exécution.

| Exportation/emballage | Tapez | Descriptif |
|:-----------------|:-----|:------------|
| `MpRoute`, `MpRouteLocationRaw`, `MpResolvedLocation` | Types | Enregistrements d'itinéraire, paramètres, état de requête/hachage, métadonnées et cibles de navigation. |
| `defineRoutes`, `matchRoutes`, `resolveLocation` | Fonctions | Définissez des arborescences de routes et résolvez les chemins sans DOM ou framework runtime. |
| `MpNavigationResult`, `MpRouteGuard`, `MpHistory`, `MpRouterAdapter` | Types | Résultats/événements de navigation, gardes, historique enfichable et contrats d'adaptateur. |
| `MpLink`, `useMpRoute`, `useMpRouter`, `useMpNavigation`, `MpRouterView` | Marqueurs du compilateur | Capacités de liaison neutre, d’état d’itinéraire, de navigation, de résolution et de sortie consommées par les packages partagés. |
| `@mission-platform/forge-router-*` | Forger des cibles | Cibles de routeur natives sélectionnées indépendamment pour Vue Routeur, React Routeur, routeur SolidJS, SvelteKit, RedwoodSDK et composants Web. |

Les packages d'exécution possèdent leur propre historique et leur état réactif ; le package neutre n’importe jamais de framework d’interface utilisateur. Pour les composants Web,
enregistrez les éléments une fois et transmettez les cibles complexes via les propriétés DOM plutôt que les attributs sérialisés :

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

| Exporter | Descriptif |
|:--------------|:--------------------------------------------------------------------------|
| `tokens`      | Objet JS/TS contenant tous les jetons de conception (par exemple, `tokens.color.primary`). |
| `tokens.scss` | Variables SCSS à utiliser dans les feuilles de style.                                    |

### @mission-platform/breakpoints

Utilitaires réactifs et composants de visibilité.

| Exporter | Tapez | Descriptif |
|:-----------------|:----------|:-----------------------------------------------------------|
| `useBreakpoints` | Crochet | Renvoie l’état du point d’arrêt réactif.                        |
| `ShowIf`         | Composant | Restitue les enfants uniquement lorsqu'une condition de point d'arrêt correspond. |
| `HideIf`         | Composant | Masque les enfants lorsqu’une condition de point d’arrêt correspond.        |

### @mission-platform/components

Composants d'interface utilisateur partagés créés une seule fois et disponibles pour plusieurs frameworks.

- **Importer** : toujours `@mission-platform/components`; l'actif `mp:<framework>` la condition décide si vous obtenez le
  Vue 3, React, Solid, ou la construction d'un composant Web.
- **Sous-chemins par composant** : `@mission-platform/components/<path>` (e.g.
  `@mission-platform/components/atoms/forge-badge/forge-badge`) est également sensible aux conditions et charge uniquement le composant de ce composant.
  morceau.
- **Composants** : `ForgeButton`, `ForgeInput`, `ForgeModal`, et plus encore.

## Ensembles de fonctionnalités

### @mission-platform/i18n

Système d'internationalisation basé sur i18next.

| Exporter | Descriptif |
|:------------------|:----------------------------------------------------------|
| `createForgeI18N` | Initialise l'instance i18n avec les paramètres par défaut de la plateforme.     |
| `useI18n`         | Hook pour les traductions et le changement de paramètres régionaux dans les composants. |

### @mission-platform/seo

Gestion des balises méta et du référencement.

| Exporter | Descriptif |
|:---------|:----------------------------------------------------------------------|
| `useSeo` | Accrochez-vous pour définir de manière déclarative le titre de la page, les balises méta et les données Open Graph. |

### @mission-platform/map

Wrapper réactif pour MapLibre GL.

| Composant | Descriptif |
|:----------------|:------------------------------------------|
| `<MpMap>`       | Composant principal du conteneur de carte.             |
| `<MpMapMarker>` | Composant permettant de placer des marqueurs sur la carte. |

### @mission-platform/code-scanner

Numérisation de codes-barres et de codes QR par caméra.

| Composant | Descriptif |
|:------------------|:-----------------------------------------------------------------|
| `<MpCodeScanner>` | Composant qui initialise le flux de la caméra et émet les résultats de l'analyse. |

## Intégrations

### @mission-platform/rxjs

Relie les observables RxJS à l’état du composant.

| Crochet | Descriptif |
|:----------------|:----------------------------------------------------------------------------|
| `useObservable` | S'abonne à un observable et renvoie sa dernière valeur en tant qu'état réactif. |

### @mission-platform/d3

Intégration D3.js neutre en termes de framework.

| Crochet | Descriptif |
|:--------|:-------------------------------------------------------------------|
| `useD3` | Lie une sélection D3 à une référence de composant avec gestion du cycle de vie. |

### @mission-platform/hunspell

Vérification orthographique basée sur WebAssembly.

| Exporter | Descriptif |
|:---------------|:--------------------------------------------------------|
| `initHunspell` | Charge et instancie le module Hunspell WebAssembly. |
| `spell`        | Vérifie si un mot est correctement orthographié.                  |
| `suggest`      | Fournit des suggestions orthographiques pour un mot.               |

## Lectures complémentaires

- [Vue 2 à Vue 3 Guide de migration](migration-guides/vue2-to-vue3.md)
- [Présentation de la configuration du projet](configs/index.md)
- [Structure de l'espace de travail](workspace-structure.md)

## Index complet des packages d'espace de travail

L'index suivant est généré à partir des manifestes du package et est conservé ici afin que la référence de l'API publique couvre chaque
paquet dans `packages/`, y compris les façades typées WebAssembly.

### Noyau et interface utilisateur

| Forfait | Objectif |
|:-------------------------------|:--------------------------------------------------------------|
| `@mission-platform/forge`      | Exécution et adaptateurs JSX indépendants du framework.                   |
| `@mission-platform/components` | Composants d'interface utilisateur à écriture unique.                                     |
| `@mission-platform/icons`      | Composants d'icône SVG à écriture unique.                               |
| `@mission-platform/layouts`    | Composants d’application, de conteneur et de mise en page réactive.     |
| `@mission-platform/forms`      | Formulaires de schéma et composants de création de formulaires visuels.              |
| `@mission-platform/forms-core` | Dérivation de schéma, validation et logique de domaine de création de formulaires. |
| `@mission-platform/tokens`     | Propriétés personnalisées CSS et jetons de conception SCSS.                 |

### Composables et intégrations

| Forfait | Objectif |
|:-----------------------------------|:--------------------------------------------------------------|
| `@mission-platform/breakpoints`    | État du point d’arrêt réactif et aides à la visibilité.           |
| `@mission-platform/d3`             | Utilitaires composables et marges du cycle de vie de sélection D3.       |
| `@mission-platform/i18n`           | Assistants d'intégration d'état et de framework i18next.              |
| `@mission-platform/map`            | Composants cartographiques et composables MapLibre.                      |
| `@mission-platform/observers`      | Composables d'intersection, de mutation et d'observateur de performances. |
| `@mission-platform/phone-number`   | Analyse et formatage du numéro de téléphone WebAssembly saisi.        |
| `@mission-platform/router`         | Contrats de routage et capacités du compilateur neutres en termes de cadre. |
| `@mission-platform/forge-router-web-components` | Cible de routeur de composants Web et environnement d'exécution sans framework. |
| `@mission-platform/rxjs`           | Observables RxJS et composables par abonnement.                 |
| `@mission-platform/scheduler`     | Logique de domaine de l’interface utilisateur du planificateur, de la récurrence et de la disposition du calendrier. |
| `@mission-platform/vcard`         | Données et composants RFC 6350 vCard et RFC 5545 iCalendar.  |
| `@mission-platform/content`       | Contenu AST, constructeurs, composants Monaco, Markdown et WYSIWYG. |
| `@mission-platform/seo`            | Métadonnées, Open Graph et composables de données structurées.        |
| `@mission-platform/speech-audio`   | Composables vocaux, audio et Web MIDI.                      |
| `@mission-platform/three`          | Canevas Three.js et composables de cycle de vie.                    |

### Packages Code et WebAssembly

| Forfait | Objectif |
|:--------------------------------------------|:--------------------------------------------------|
| `@mission-platform/barcode`                 | Code-barres 1D encodant/décodant la façade et le composant.    |
| `@mission-platform/code-scanner`            | Composant d'analyse de code d'appareil photo et d'image.         |
| `@mission-platform/matrix-code`             | Façade d'encodage/décodage Data Matrix et Aztec.       |
| `@mission-platform/qr-code`                 | QR encodage/décodage de la façade et du composant.            |
| `@mission-platform/harper`                  | Intégration de la grammaire et du style Harper pour Monaco.  |
| `@mission-platform/hunspell`                | Wrapper de vérification orthographique Emscripten Hunspell.       |

### Cibles du compilateur Forge

Ceux-ci vivent dans `forge-plugins/` plutôt que `packages/`. Un plugin **framework** décide quel runtime est un composant neutre
est abaissé à ; une cible **CMS** décide sur quelle plateforme de contenu elle est projetée. Les deux axes composent, donc n'importe quel CMS
target peut être lié à n’importe quel plugin de framework. Voir le [Pipeline du compilateur Forge](../../../vite-plugins/forge/docs/locales/fr/reference/compiler.md).

| Forfait | Objectif |
|:-------------------------------------------------|:--------------------------------------------------------------------------------|
| `@mission-platform/forge-plugin-api`             | `FrameworkOutputPlugin` contrat, types IR sémantiques et types d’adaptateur de construction.   |
| `@mission-platform/forge-plugin-react`           | React cible de sortie.                                                            |
| `@mission-platform/forge-plugin-vue`             | Vue 3 cibles de sortie.                                                            |
| `@mission-platform/forge-plugin-solid`           | Solid cible de sortie.                                                            |
| `@mission-platform/forge-plugin-svelte`          | Svelte 5 objectifs de sortie.                                                         |
| `@mission-platform/forge-plugin-web-components`  | Cible de sortie des composants Web.                                                   |
| `@mission-platform/forge-cms-plugin-api`         | `CmsOutputPlugin` contrat, modèle de contenu neutre, pilote CMS et aides à la création. |
| `@mission-platform/forge-cms-storyblok`          | Objets de composant Storyblok, wrappers de blok et `components.json`.              |
| `@mission-platform/forge-cms-astro`              | Statique `.astro` modèles et `client:load` îles-cadres.                  |
| `@mission-platform/forge-cms-ghost`              | Des partiels de guidon Ghost et un `config.custom` fragment de thème.                 |
| `@mission-platform/forge-cms-jekyll`             | Jekyll Liquid comprend, `_data` schéma, et un `_config.yml` fragment.           |
| `@mission-platform/forge-cms-webflow`            | Flux Web `declareComponent` composants de code et un `webflow.json` fragment de bibliothèque. |

#### @mission-platform/forge-cms-plugin-api

| Exporter | Tapez | Descriptif |
|:---------------------------|:---------|:--------------------------------------------------------------------------------|
| `analyzeContentComponent`  | Fonction | Projette les accessoires d'un composant neutre sur le modèle de contenu neutre en termes de plate-forme.  |
| `ContentComponent`         | Tapez | Ordonné `ContentField`s, emplacements et le `interactive` drapeau.                    |
| `ContentFieldKind`         | Tapez | `text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`. |
| `CmsOutputPlugin`          | Tapez | Le contrat cible : un plugin de framework lié plus les quatre émetteurs.          |
| `defineForgeCmsPlugin`     | Fonction | Valide une cible CMS au moment de la configuration.                                  |
| `generateCmsArtifacts`     | Fonction | Le pilote générique découverte → IR → modèle de contenu → émission → pilote d'écriture.               |
| `defineTsdownForgeCms`     | Fonction | configuration tsdown pour une cible CMS, émettant `dist/cms/<cms>/<framework>/**`.    |
| `defineTsdownForgeCmsAll`  | Fonction | configurations tsdown pour une liste de cibles CMS.                                      |
