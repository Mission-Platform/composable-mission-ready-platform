# Package API Directory

This project-wide page is a directory of package capabilities and compatibility
contracts. The canonical installation, usage, limitations, and API details for
each package live beside that package under its full `packages/**/docs/` path. Generated API references must be added to the owning
package rather than this page.

> **Les importations sont toujours nues.** Framework-shipping `@mission-platform/*` les packages exposent un seul `.`
> entrée gardée par le `mp:vue`, `mp:react`, `mp:solid`, et `mp:web-component` exporter
> conditions. Sélectionnez le framework **une fois** — via `resolve.conditions` (voir `defineFrameworkAppConfig` /
> `frameworkResolveConditions` depuis `@mission-platform/vite-config`) et `customConditions` (via le
> `@mission-platform/typescript-config/framework-<name>` presets) - puis importez le tout avec le nu
> spécificateur de package. Voir [Configuration du consommateur externe](external-consumer-setup.md).

## Core Framework

### @mission-platform/forge-jsx

La base de l'architecture « à écriture unique », fournissant un environnement d'exécution et des hooks JSX neutres en termes de framework.

| Exporter        | Type     | Forfait                                                               |
| :-------------- | :------- | :-------------------------------------------------------------------- |
| `h`, `Fragment` | Fonction | Usine JSX et fragment pour la création de composants. |
| `useState`      | Crochet  | Hook d’état indépendant du framework.                 |
| `useEffect`     | Crochet  | Crochet à effet neutre pour le cadre.                 |
| `useMemo`       | Crochet  | Crochet de mémorisation indépendant du framework.     |
| `useRef`        | Crochet  | Crochet de référence indépendant du framework.        |
| `useContext`    | Crochet  | Hook contextuel indépendant du framework.             |

### @mission-platform/forge-adapters

Framework-specific adapters for rendering neutral Forge JSX components. Each
framework is exposed as an independent subpath so applications can select only
the runtime they use.

| Exporter           | Type       | Descriptif                                                                                                         |
| :----------------- | :--------- | :----------------------------------------------------------------------------------------------------------------- |
| `toVueComponent`   | Adaptateur | Converts a Forge component to a Vue 3 component from `@mission-platform/forge-adapters/vue`.       |
| `toReactComponent` | Adaptateur | Converts a Forge component to a React component from `@mission-platform/forge-adapters/react`.     |
| SolidJS primitives | Adapter    | `Teleport`, `Transition`, and `TransitionGroup` from `@mission-platform/forge-adapters/solid`.     |
| Svelte primitives  | Adapter    | Raw HTML and transition helpers from `@mission-platform/forge-adapters/svelte`.                    |
| Web Components     | Runtime    | Native custom-element rendering primitives from `@mission-platform/forge-adapters/web-components`. |

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

| Exporter                                                             | Type             | Description                                                                                                                                           |
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

### Async route views and `Suspense`

Forge's neutral compiler recognizes `Suspense` and lowers it to the native
async boundary for the selected target. Keep the fallback in the shared source
so every target presents the same loading state without importing a framework
adapter:

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

React, Vue, Solid, and Svelte receive their native suspense boundary. A
framework-free application uses the Web Components router's outlet fallback
for async route views instead:

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

The router emits a loading overlay from `forge-router-outlet` while the async
route view resolves. The current view remains mounted until the destination is
ready, and the overlay is removed after success, redirect, cancellation, or
failure.

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

| Composant         | Description                                                                                       |
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

## Service Monitoring

### Service Monitor API

The service-monitor application provides both public and authenticated endpoints for monitoring service health.

#### Public Endpoints

Public endpoints expose only minimal status information and do not require authentication:

- **`GET /api/services`**: Returns rolled-up status for every monitored service. Response includes only `{ id, name, type }` for each service, plus `now` and `intervalSeconds`. No target configuration, URLs, hosts, queries, headers, thresholds, or topology is exposed.
- **`GET /api/metrics?service=<id>&since=<ms>`**: Returns raw time-series metrics for one service. The `since` parameter is bounded by the configured retention window. Response includes only `service`, `now`, `since`, and `samples`.

#### Authenticated Endpoints

Authenticated endpoints require the `MONITOR_API_TOKEN` bearer token and expose full monitor configuration:

- **`POST /api/check`**: Trigger an immediate probe cycle.
- **`GET /api/monitors`**: List all monitors with full configuration.
- **`POST /api/monitors`**: Create a new monitor.
- **`PATCH /api/monitors/<id>`**: Update an existing monitor.
- **`DELETE /api/monitors/<id>`**: Delete a monitor and clear its historical counters.

#### Probe and Destination Policy

Service-monitor enforces strict bounds on probe behavior:

- **Allowed schemes**: URL probes default to `https://` (and port 443) unless trusted private mode is enabled; `http://` is allowed in trusted mode.
- **Allowed ports**: URL probes allow port 443; host probes allow a baseline of ports [53, 80, 123, 443, 1883, 8883].
- **Forbidden destinations**: Private/link-local addresses (127.0.0.1, ::1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fe80::/10) unless explicitly trusted.
- **Request/response bounds**: Probe requests are limited to 64 KB; responses are limited to 256 KB. Speed tests are limited to 25 MB.
- **Redirect policy**: Redirects must remain within the same origin and approved path prefixes; cross-origin or disallowed-path redirects are rejected.
- **History retention**: Incident, update, and maintenance history is bounded by item-count caps (max 100 items per monitor). Default retention for metric data is 24 hours.

#### Server-Side Rendering (SSR)

The service-monitor SSR layer requires authentication before serializing private monitor configuration into client props. Unauthenticated requests receive only the public status DTO.

### Email Sender Worker

The email-sender worker provides a local development showcase for email rendering and delivery.

#### Deployment Modes

- **Local development** (default): Sends to MailPit on `localhost:1025`. No authentication required.
- **Non-local deployment**: Requires explicit `EMAIL_DEPLOYMENT_TOKEN` bearer authorization, `EMAIL_ALLOWED_ORIGINS` allowlist, and `EMAIL_ALLOWED_RECIPIENTS` allowlist. Rate limiting via `EMAIL_RATE_LIMITER` is enforced.

#### Request Validation

All email requests must:

- Use `Content-Type: application/json`.
- Include a valid recipient email address (`to` field, max 254 characters).
- Include a recipient name (`recipientName`, 1–100 characters).
- Include completed email HTML (`html`, max 240 KB).
- Pass HTML compatibility checks via `assertCompatibleEmailHtml`.

#### Fail-Closed Defaults

Non-local deployments without explicit configuration will reject all requests. Local deployments remain unrestricted for development convenience.

## Forge Web Script Artifact Verification

### Artifact Content Identity

Forge Web Script artifacts use a versioned SHA-256 content identity in the format `sha256-v1:<hex>`. This digest is computed over the complete artifact binary and is stored in the artifact manifest's `contentHash` field.

#### Integrity vs. Authenticity

A content hash **detects accidental or unauthorized content changes** when compared with a trusted expected value. It does **not**:

- Authenticate the producer or origin of the artifact.
- Replace cryptographic signatures or deployment access controls.
- Guarantee the artifact is safe to execute.

#### Verification Workflow

1. **Obtain the expected hash** from a trusted source (e.g., a signed manifest, CI build log, or secure configuration).
2. **Compute the artifact hash** using the verifier: `fws_verify_artifact(artifact)` returns the `contentHash`.
3. **Compare hashes**: If they match, the artifact has not been accidentally or maliciously altered since the expected value was recorded.
4. **Verify the manifest**: Use `fws_inspect_manifest` to check capability imports, exports, metadata, and policy compliance independently.

#### Versioning

The `sha256-v1` prefix allows for future hash algorithm upgrades without ambiguity. Callers must handle both legacy (if any) and current digest formats gracefully.

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
| `@mission-platform/forge-jsx`  | Exécution et adaptateurs JSX indépendants du framework.                            |
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

| Package                          | Objectif                                                                    |
| :------------------------------- | :-------------------------------------------------------------------------- |
| `@mission-platform/barcode`      | Code-barres 1D encodant/décodant la façade et le composant. |
| `@mission-platform/code-scanner` | Camera and image code-scanning component.                   |
| `@mission-platform/matrix-code`  | Data Matrix and Aztec encode/decode façade.                 |
| `@mission-platform/qr-code`      | QR encode/decode façade and component.                      |
| `@mission-platform/harper`       | Harper grammar and style integration for Monaco.            |
| `@mission-platform/hunspell`     | Emscripten Hunspell spell-checking wrapper.                 |

### Cibles du compilateur Forge

These live in `packages/compiler/plugins/`. Un plugin **framework** décide quel runtime est un composant neutre
est abaissé à ; une cible **CMS** décide sur quelle plateforme de contenu elle est projetée. Les deux axes composent, donc n'importe quel CMS
target peut être lié à n’importe quel plugin de framework. See the [Forge Compiler Pipeline](../packages/tooling/vite/forge/docs/reference/compiler.md).

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

| Export                    | Type     | Description                                                                                                              |
| :------------------------ | :------- | :----------------------------------------------------------------------------------------------------------------------- |
| `analyzeContentComponent` | Function | Projette les accessoires d'un composant neutre sur le modèle de contenu neutre en termes de plate-forme. |
| `ContentComponent`        | Type     | Ordonné `ContentField`s, emplacements et le `interactive` drapeau.                                       |
| `ContentFieldKind`        | Type     | `text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`.                          |
| `CmsOutputPlugin`         | Type     | Le contrat cible : un plugin de framework lié plus les quatre émetteurs.                 |
| `defineForgeCmsPlugin`    | Fonction | Valide une cible CMS au moment de la configuration.                                                      |
| `generateCmsArtifacts`    | Fonction | Le pilote générique découverte → IR → modèle de contenu → émission → pilote d'écriture.                  |
| `defineTsdownForgeCms`    | Fonction | configuration tsdown pour une cible CMS, émettant `dist/cms/<cms>/<framework>/**`.                       |
| `defineTsdownForgeCmsAll` | Fonction | configurations tsdown pour une liste de cibles CMS.                                                      |
