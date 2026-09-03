# Répertoire des API du package

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/api-reference.md: [docs/api-reference.md](../../api-reference.md)
> Langue: Français (fr)

Cette page à l'échelle du projet est un répertoire des fonctionnalités et de la compatibilité des packages.
contrats. L'installation canonique, l'utilisation, les limitations et les détails de l'API pour
chaque package se trouve à côté de ce package sous `packages/**/docs/`, ` `,
et ` `. Les références API générées doivent être ajoutées au propriétaire
package plutôt que cette page.

> **Les importations sont toujours nues.** Les packages `@mission-platform/*` expédiés par framework exposent un seul `.`
> entrée gardée par l'export `mp:vue`, `mp:react`, `mp:solid` et `mp:web-component`
> conditions. Sélectionnez le framework **une fois** — via `resolve.conditions` (voir `defineFrameworkAppConfig` /
> `frameworkResolveConditions` depuis `@mission-platform/vite-config`) et `customConditions` (via le
> Préréglages `@mission-platform/typescript-config/framework-<name>`) — puis importez le tout avec le nu
> spécificateur de package. Voir [Configuration du consommateur externe](external-consumer-setup.md).

## Cadre de base

### @mission-platform/forge

La base de l'architecture « à écriture unique », fournissant un environnement d'exécution et des hooks JSX neutres en termes de framework.

| Exporter | Tapez | Descriptif |
| :----------------- | :------- | :-------------------------------------------------------------------------------------- |
| `h`, `Fragment` | Fonction | Usine JSX et fragment pour la création de composants.                                      |
| `useState` | Crochet | Hook d’état indépendant du framework.                                                           |
| `useEffect` | Crochet | Crochet à effet neutre pour le cadre.                                                          |
| `useMemo` | Crochet | Crochet de mémorisation indépendant du framework.                                                     |
| `useRef` | Crochet | Crochet de référence indépendant du framework.                                                       |
| `useContext` | Crochet | Hook contextuel indépendant du framework.                                                         |
| `toVueComponent` | Adaptateur | Convertit un composant forge en composant Vue 3 (à partir de `@mission-platform/forge/vue`).   |
| `toReactComponent` | Adaptateur | Convertit un composant forge en composant React (à partir de `@mission-platform/forge/react`). |

### @mission-platform/vite-plugin-forge

Le pilote du compilateur accepte les instances `FrameworkOutputPlugin` explicites ; ça fait
ne fournit pas de registre-cadre. `defineViteForgeComponents` et
`defineTsdownForgeComponents` (plus le hook et les assistants CMS) partagent un processus en cours
`ForgeCompilerService` pour une session de génération ou de surveillance.

| Capacité | Descriptif |
| :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cycle de vie des services | Réutilisez l’état de la source, du graphique, de la source analysée, de l’IR sémantique et de l’artefact cible dans toutes les versions ; disposez des services ponctuels une fois terminés et des services d'observation à la clôture. |
| Clés de cache | Empreintes source/dépendance/configuration, options du compilateur et du routeur, `tsconfig` `baseUrl`/`paths`, ID cible, identité/version du plugin et conditions pertinentes.      |
| Invalidation de la montre | Les fichiers modifiés invalident les dépendants du graphique inversé, y compris les composants transitifs et les entrées de hook ; les instantanés cibles non liés restent réutilisables.                     |
| Diagnostic/rapport | Rapporte la synchronisation des phases, le nombre d'échecs/échecs du cache, les fichiers concernés, les avertissements, les erreurs et le nombre d'artefacts émis. Des erreurs bloquent la promotion.                                 |
| Manifeste d’artefact | Répertorie les entrées, les modules, les déclarations, les cartes sources, les actifs et les sommes de contrôle de portée cible avant la promotion atomique.                                                     |
| Point de rallonge | Implémentez et transmettez un `FrameworkOutputPlugin` à partir d'un package `forge-plugin-*` appartenant à l'appelant ; n'ajoutez pas de branches cibles au pilote neutre.                        |

Configurez les alias via le projet `tsconfig.json` (`baseUrl` et
`paths`); Vite et la préparation du graphique tsdown utilisent les mêmes faits d'alias. Routeur
la sélection, les plugins de routeur et les conditions sont transmis via le composant et
aides au crochet. Un futur travailleur/démon peut être assis derrière le contrat de service, mais
la mise en œuvre prise en charge est actuellement en cours.

### @mission-platform/router

Contrats de route neutres, aides à la correspondance pure et marqueurs du compilateur pour
forfaits partagés. Les applications possèdent des enregistrements de routage et des instances de routeur natives ; le
La cible du routeur Forge sélectionnée par l'application fournit les capacités d'exécution.

| Exportation/emballage | Tapez | Descriptif |
| :----------------------------------------------------------------------- | :--------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| `MpRoute`, `MpRouteLocationRaw`, `MpResolvedLocation` | Types | Enregistrements d'itinéraire, paramètres, état de requête/hachage, métadonnées et cibles de navigation.                                                            |
| `defineRoutes`, `matchRoutes`, `resolveLocation` | Fonctions | Définissez des arborescences de routes et résolvez les chemins sans DOM ou framework runtime.                                                              |
| `MpNavigationResult`, `MpRouteGuard`, `MpHistory`, `MpRouterAdapter` | Types | Résultats/événements de navigation, gardes, historique enfichable et contrats d'adaptateur.                                                         |
| `MpLink`, `useMpRoute`, `useMpRouter`, `useMpNavigation`, `MpRouterView` | Marqueurs du compilateur | Capacités neutres de liaison, d’état d’itinéraire, de navigation, de résolution et de sortie consommées par les packages partagés.                               |
| `@mission-platform/forge-router-*` | Forger des cibles | Cibles de routeur natives sélectionnées indépendamment pour le routeur Vue, le routeur React, le routeur SolidJS, SvelteKit, RedwoodSDK et les composants Web. |

Les packages d'exécution possèdent leur propre historique et leur état réactif ; le package neutre n’importe jamais de framework d’interface utilisateur. Pour les composants Web,
enregistrez les éléments une fois et transmettez les cibles complexes via les propriétés DOM plutôt que les attributs sérialisés :

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from "@mission-platform/forge-router-web-components/runtime";

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/overview"),
  routes: [{ path: "/overview", component: () => "Documentation" }],
});
setForgeRouter(router);
const link = document.createElement("forge-router-link");
link.to = { path: "/overview", query: { q: "router" }, hash: "results" };
link.router = router;
```

### Vues d'itinéraire asynchrones et `Suspense`

Le compilateur neutre de Forge reconnaît `Suspense` et le réduit au niveau natif
limite asynchrone pour la cible sélectionnée. Conserver la solution de secours dans la source partagée
donc chaque cible présente le même état de chargement sans importer de framework
adaptateur :

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

React, Vue, Solid et Svelte reçoivent leur limite d'attente native. Un
l'application sans framework utilise la solution de secours du routeur Web Components
pour les vues d'itinéraire asynchrones à la place :

```ts
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/overview"),
  loadingFallback: () => {
    const spinner = document.createElement("span");
    spinner.className = "docs-loading-spinner";
    spinner.setAttribute("aria-label", "Loading documentation");
    return spinner;
  },
  routes: [{ path: "/:slug(.*)", component: loadDocumentationView }],
});
```

Le routeur émet une superposition de chargement depuis `forge-router-outlet` tandis que l'async
la vue de l'itinéraire est résolue. La vue actuelle reste montée jusqu'à ce que la destination soit
prêt et la superposition est supprimée après succès, redirection, annulation ou
échec.

## Interface utilisateur et conception

### @mission-platform/tokens

Jetons de conception centralisés pour les couleurs, la typographie et l'espacement.

| Exporter | Descriptif |
| :------------ | :------------------------------------------------------------------------ |
| `tokens` | Objet JS/TS contenant tous les jetons de conception (par exemple, `tokens.color.primary`). |
| `tokens.scss` | Variables SCSS à utiliser dans les feuilles de style.                                    |

### @mission-platform/breakpoints

Utilitaires réactifs et composants de visibilité.

| Exporter | Tapez | Descriptif |
| :--------------- | :-------- | :--------------------------------------------------------- |
| `useBreakpoints` | Crochet | Renvoie l'état du point d'arrêt réactif.                        |
| `ShowIf` | Composant | Restitue les enfants uniquement lorsqu'une condition de point d'arrêt correspond. |
| `HideIf` | Composant | Masque les enfants lorsqu’une condition de point d’arrêt correspond.        |

### @mission-platform/components

Composants d'interface utilisateur partagés créés une seule fois et disponibles pour plusieurs frameworks.

- **Importer** : toujours `@mission-platform/components` ; la condition active `mp:<framework>` décide si vous obtenez le
  Vue 3, React, Solid ou version de composant Web.
- **Sous-chemins par composant** : `@mission-platform/components/<path>` (par ex.
  `@mission-platform/components/atoms/forge-badge/forge-badge`) est également sensible aux conditions et charge uniquement les composants de ce composant.
  morceau.
- **Composants** : `ForgeButton`, `ForgeInput`, `ForgeModal`, et plus encore.

## Ensembles de fonctionnalités

### @mission-platform/i18n

Système d'internationalisation basé sur i18next.

| Exporter | Descriptif |
| :---------------- | :-------------------------------------------------------- |
| `createForgeI18N` | Initialise l'instance i18n avec les valeurs par défaut de la plateforme.     |
| `useI18n` | Hook pour les traductions et le changement de paramètres régionaux dans les composants. |

### @mission-platform/seo

Gestion des balises méta et du référencement.

| Exporter | Descriptif |
| :------- | :-------------------------------------------------------------------- |
| `useSeo` | Accrochez-vous pour définir de manière déclarative le titre de la page, les balises méta et les données Open Graph. |

### @mission-platform/map

Wrapper réactif pour MapLibre GL.

| Composant | Descriptif |
| :-------------- | :---------------------------------------- |
| `<MpMap>` | Composant principal du conteneur de carte.             |
| `<MpMapMarker>` | Composant permettant de placer des marqueurs sur la carte. |

### @mission-platform/code-scanner

Numérisation de codes-barres et de codes QR par caméra.

| Composant | Descriptif |
| :---------------- | :--------------------------------------------------------------- |
| `<MpCodeScanner>` | Composant qui initialise le flux de la caméra et émet les résultats de l'analyse. |

## Intégrations

### @mission-platform/rxjs

Relie les observables RxJS à l’état du composant.

| Crochet | Descriptif |
| :-------------- | :-------------------------------------------------------------------------- |
| `useObservable` | S'abonne à un observable et renvoie sa dernière valeur en tant qu'état réactif. |

### @mission-platform/d3

Intégration D3.js neutre en termes de framework.

| Crochet | Descriptif |
| :------ | :----------------------------------------------------------------- |
| `useD3` | Lie une sélection D3 à une référence de composant avec gestion du cycle de vie. |

### @mission-platform/hunspell

Vérification orthographique basée sur WebAssembly.

| Exporter | Descriptif |
| :------------- | :------------------------------------------------------ |
| `initHunspell` | Charge et instancie le module Hunspell WebAssembly. |
| `spell` | Vérifie si un mot est correctement orthographié.                  |
| `suggest` | Fournit des suggestions orthographiques pour un mot.               |

## Surveillance des services

### API du moniteur de services

L'application de surveillance des services fournit des points de terminaison publics et authentifiés pour surveiller l'état du service.

#### Points de terminaison publics

Les points de terminaison publics n'exposent que des informations d'état minimales et ne nécessitent pas d'authentification :

- **`GET /api/services`** : renvoie l'état cumulé pour chaque service surveillé. La réponse inclut uniquement `{ id, name, type }` pour chaque service, ainsi que `now` et `intervalSeconds`. Aucune configuration cible, URL, hôtes, requêtes, en-têtes, seuils ou topologie n'est exposé.
- **`GET /api/metrics?service=<id>&since=<ms>`** : renvoie les métriques brutes de séries chronologiques pour un service. Le paramètre `since` est limité par la fenêtre de rétention configurée. La réponse inclut uniquement `service`, `now`, `since` et `samples`.

#### Points de terminaison authentifiés

Les points de terminaison authentifiés nécessitent le jeton de porteur `MONITOR_API_TOKEN` et exposent la configuration complète du moniteur :

- **`POST /api/check`** : Déclenche un cycle de sonde immédiat.
- **`GET /api/monitors`** : répertorie tous les moniteurs avec une configuration complète.
- **`POST /api/monitors`** : Créez un nouveau moniteur.
- **`PATCH /api/monitors/<id>`** : Mettre à jour un moniteur existant.
- **`DELETE /api/monitors/<id>`** : Supprimez un moniteur et effacez ses compteurs historiques.

#### Politique de sonde et de destination

Service-monitor impose des limites strictes au comportement de la sonde :

- **Schémas autorisés** : les sondes d'URL par défaut sont `https://` (et le port 443), sauf si le mode privé approuvé est activé ; `http://` est autorisé en mode sécurisé.
- **Ports autorisés** : les sondes d'URL autorisent le port 443 ; les sondes hôtes permettent une base de référence de ports [53, 80, 123, 443, 1883, 8883].
- **Destinations interdites** : adresses privées/lien-local (127.0.0.1, ::1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fe80::/10), sauf si elles sont explicitement approuvées.
- **Limites des requêtes/réponses** : les requêtes de sonde sont limitées à 64 Ko ; les réponses sont limitées à 256 Ko. Les tests de vitesse sont limités à 25 Mo.
- **Politique de redirection** : les redirections doivent rester dans les mêmes préfixes d'origine et de chemin approuvés ; Les redirections d’origine croisée ou de chemin interdit sont rejetées.
- **Conservation de l'historique** : l'historique des incidents, des mises à jour et de la maintenance est limité par des plafonds de nombre d'éléments (maximum 100 éléments par moniteur). La conservation par défaut des données de métriques est de 24 heures.

#### Rendu côté serveur (SSR)

La couche SSR du moniteur de service nécessite une authentification avant de sérialiser la configuration du moniteur privé dans les accessoires client. Les demandes non authentifiées reçoivent uniquement le statut public DTO.

### Travailleur de l'expéditeur d'e-mails

Le travailleur expéditeur d'e-mails fournit une vitrine de développement local pour le rendu et la livraison des e-mails.

#### Modes de déploiement

- **Développement local** (par défaut) : Envoie à MailPit sur `localhost:1025`. Aucune authentification requise.
- **Déploiement non local** : nécessite une autorisation explicite du porteur `EMAIL_DEPLOYMENT_TOKEN`, une liste d'autorisation `EMAIL_ALLOWED_ORIGINS` et une liste d'autorisation `EMAIL_ALLOWED_RECIPIENTS`. La limitation du débit via `EMAIL_RATE_LIMITER` est appliquée.

#### Validation de la demande

Toutes les demandes par courrier électronique doivent :

- Utilisez `Content-Type: application/json`.
- Incluez une adresse e-mail de destinataire valide (champ `to`, 254 caractères maximum).
- Incluez un nom de destinataire (`recipientName`, 1 à 100 caractères).
- Inclure l'e-mail HTML complété (`html`, max 240 Ko).
- Réussissez les contrôles de compatibilité HTML via `assertCompatibleEmailHtml`.

#### Valeurs par défaut de fermeture en cas d'échec

Les déploiements non locaux sans configuration explicite rejetteront toutes les demandes. Les déploiements locaux restent illimités pour faciliter le développement.

## Vérification des artefacts de script Web Forge

### Identité du contenu de l'artefact

Les artefacts Forge Web Script utilisent une identité de contenu SHA-256 versionnée au format `sha256-v1:<hex>`. Ce résumé est calculé sur le binaire complet de l'artefact et est stocké dans le champ `contentHash` du manifeste de l'artefact.

#### Intégrité vs authenticité

Un hachage de contenu **détecte les modifications de contenu accidentelles ou non autorisées** par rapport à une valeur attendue fiable. Ce n'est **pas** :

- Authentifier le producteur ou l'origine de l'artefact.
- Remplacez les signatures cryptographiques ou les contrôles d'accès au déploiement.
- Garantir que l'artefact peut être exécuté en toute sécurité.

#### Flux de travail de vérification

1. **Obtenez le hachage attendu** à partir d'une source fiable (par exemple, un manifeste signé, un journal de build CI ou une configuration sécurisée).
2. **Calculez le hachage de l'artefact** à l'aide du vérificateur : `fws_verify_artifact(artifact)` renvoie le `contentHash`.
3. **Comparez les hachages** : s'ils correspondent, l'artefact n'a pas été modifié accidentellement ou malicieusement depuis l'enregistrement de la valeur attendue.
4. **Vérifiez le manifeste** : utilisez `fws_inspect_manifest` pour vérifier indépendamment les importations, les exportations, les métadonnées et la conformité aux politiques.

#### Gestion des versions

Le préfixe `sha256-v1` permet de futures mises à niveau de l'algorithme de hachage sans ambiguïté. Les appelants doivent gérer correctement les formats de résumé existants (le cas échéant) et actuels.

## Lectures complémentaires

- [Guide de migration de Vue 2 vers Vue 3](migration-guides/vue2-to-vue3.md)
- [Aperçu de la configuration du projet](packages/tooling/configs/index.md)
- [Structure de l'espace de travail](workspace-structure.md)

## Index complet des packages d'espace de travail

L'index suivant est généré à partir des manifestes du package et est conservé ici afin que la référence de l'API publique couvre chaque
package dans `packages/`, incluant les façades typées WebAssembly.

### Noyau et interface utilisateur

| Forfait | Objectif |
| :----------------------------- | :------------------------------------------------------------ |
| `@mission-platform/forge` | Exécution et adaptateurs JSX indépendants du framework.                   |
| `@mission-platform/components` | Composants d'interface utilisateur à écriture unique.                                     |
| `@mission-platform/icons` | Composants d'icône SVG à écriture unique.                               |
| `@mission-platform/layouts` | Composants d’application, de conteneur et de mise en page réactive.     |
| `@mission-platform/forms` | Formulaires de schéma et composants de création de formulaires visuels.              |
| `@mission-platform/forms-core` | Dérivation de schéma, validation et logique de domaine de création de formulaires. |
| `@mission-platform/tokens` | Propriétés personnalisées CSS et jetons de conception SCSS.                 |

### Composables et intégrations

| Forfait | Objectif |
| :---------------------------------------------- | :--------------------------------------------------------------- |
| `@mission-platform/breakpoints` | État du point d’arrêt réactif et aides à la visibilité.              |
| `@mission-platform/d3` | Utilitaires composables et marges du cycle de vie de sélection D3.          |
| `@mission-platform/i18n` | Assistants d'intégration d'état et de framework i18next.                 |
| `@mission-platform/map` | Composants cartographiques et composables MapLibre.                         |
| `@mission-platform/observers` | Composables d'intersection, de mutation et d'observateur de performances.    |
| `@mission-platform/phone-number` | Analyse et formatage du numéro de téléphone WebAssembly saisi.           |
| `@mission-platform/router` | Contrats de routage et capacités du compilateur neutres en termes de cadre.     |
| `@mission-platform/forge-router-web-components` | Cible de routeur de composants Web et environnement d'exécution sans framework.         |
| `@mission-platform/rxjs` | Observables RxJS et composables par abonnement.                    |
| `@mission-platform/scheduler` | Logique de domaine de l’interface utilisateur du planificateur, de la récurrence et de la disposition du calendrier.      |
| `@mission-platform/vcard` | Données et composants RFC 6350 vCard et RFC 5545 iCalendar.       |
| `@mission-platform/content` | Contenu AST, constructeurs, composants Monaco, Markdown et WYSIWYG. |
| `@mission-platform/seo` | Métadonnées, Open Graph et composables de données structurées.           |
| `@mission-platform/speech-audio` | Composables vocaux, audio et Web MIDI.                         |
| `@mission-platform/three` | Canevas Three.js et composables de cycle de vie.                       |

### Packages Code et WebAssembly

| Forfait | Objectif |
| :------------------------------- | :----------------------------------------------- |
| `@mission-platform/barcode` | Code-barres 1D encodant/décodant la façade et le composant.   |
| `@mission-platform/code-scanner` | Composant d'analyse de code d'appareil photo et d'image.        |
| `@mission-platform/matrix-code` | Façade d'encodage/décodage Data Matrix et Aztec.      |
| `@mission-platform/qr-code` | QR encodage/décodage de la façade et du composant.           |
| `@mission-platform/harper` | Intégration de la grammaire et du style Harper pour Monaco. |
| `@mission-platform/hunspell` | Wrapper de vérification orthographique Emscripten Hunspell.      |

### Cibles du compilateur Forge

Ceux-ci se trouvent dans `packages/compiler/plugins/` plutôt que dans `packages/`. Un plugin **framework** décide quel runtime est un composant neutre
est abaissé à ; une cible **CMS** décide sur quelle plateforme de contenu elle est projetée. Les deux axes composent, donc n'importe quel CMS
target peut être lié à n’importe quel plugin de framework. Voir le [Pipeline du compilateur Forge](../../../packages/tooling/vite/forge/docs/locales/fr/reference/compiler.md).

| Forfait | Objectif |
| :---------------------------------------------- | :-------------------------------------------------------------------------------- |
| `@mission-platform/forge-plugin-api` | Contrat `FrameworkOutputPlugin`, types IR sémantiques et types d’adaptateur de build.     |
| `@mission-platform/forge-plugin-react` | Cible de sortie React.                                                              |
| `@mission-platform/forge-plugin-vue` | Vue 3 cibles de sortie.                                                              |
| `@mission-platform/forge-plugin-solid` | Cible de sortie Solid.                                                              |
| `@mission-platform/forge-plugin-svelte` | Svelte 5 cible de sortie.                                                           |
| `@mission-platform/forge-plugin-web-components` | Cible de sortie des composants Web.                                                     |
| `@mission-platform/forge-cms-plugin-api` | Contrat `CmsOutputPlugin`, modèle de contenu neutre, pilote CMS et aides à la construction. |
| `@mission-platform/forge-cms-storyblok` | Objets de composant Storyblok, wrappers de blok et `components.json`.                |
| `@mission-platform/forge-cms-astro` | Modèles statiques `.astro` et îlots-cadres `client:load`.                    |
| `@mission-platform/forge-cms-ghost` | Partiels de Ghost Handles et un fragment de thème `config.custom`.                   |
| `@mission-platform/forge-cms-jekyll` | Jekyll Liquid comprend le schéma `_data` et un fragment `_config.yml`.             |
| `@mission-platform/forge-cms-webflow` | Composants de code Webflow `declareComponent` et fragment de bibliothèque `webflow.json`. |

#### @mission-platform/forge-cms-plugin-api

| Exporter | Tapez | Descriptif |
| :------------------------ | :------- | :------------------------------------------------------------------------------ |
| `analyzeContentComponent` | Fonction | Projette les accessoires d'un composant neutre sur le modèle de contenu neutre en termes de plate-forme.   |
| `ContentComponent` | Tapez | J'ai commandé des `ContentField`, des emplacements et l'indicateur `interactive`.                     |
| `ContentFieldKind` | Tapez | `text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`. |
| `CmsOutputPlugin` | Tapez | Le contrat cible : un plugin de framework lié plus les quatre émetteurs.           |
| `defineForgeCmsPlugin` | Fonction | Valide une cible CMS au moment de la configuration.                                   |
| `generateCmsArtifacts` | Fonction | Le pilote générique découverte → IR → modèle de contenu → émission → pilote d'écriture.                |
| `defineTsdownForgeCms` | Fonction | configuration tsdown pour une cible CMS, émettant `dist/cms/<cms>/<framework>/**`.     |
| `defineTsdownForgeCmsAll` | Fonction | configurations tsdown pour une liste de cibles CMS.                                       |
