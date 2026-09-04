# Package API Directory

This project-wide page is a directory of package capabilities and compatibility
contracts. The canonical installation, usage, limitations, and API details for
each package live beside that package under its full `packages/**/docs/` path. Generated API references must be added to the owning
package rather than this page.

> **Invoer is altijd kaal.** Kaderverzending `@mission-platform/*` pakketten tonen een single `.`
> ingang bewaakt door de `mp:vue`, `mp:react`, `mp:solid`, En `mp:web-component` exporteren
> voorwaarden. Selecteer het raamwerk **eenmaal** — via `resolve.conditions` (zien `defineFrameworkAppConfig` /
> `frameworkResolveConditions` van `@mission-platform/vite-config`) En `customConditions` (via de
> `@mission-platform/typescript-config/framework-<name>` presets) — importeer vervolgens alles met de bare
> pakketspecificatie. Zien [Externe consumentenconfiguratie](external-consumer-setup.md).

## Core Framework

### @mission-platform/forge

De basis van de "write-once"-architectuur, die een raamwerkneutrale JSX-runtime en hooks biedt.

| Exporteren         | Typ     | Beschrijving                                                                                                                           |
| :----------------- | :------ | :------------------------------------------------------------------------------------------------------------------------------------- |
| `h`, `Fragment`    | Functie | JSX-fabriek en fragment voor het schrijven van componenten.                                                            |
| `useState`         | Haak    | Kaderneutrale staatshaak.                                                                                              |
| `useEffect`        | Haak    | Kader-neutrale effecthaak.                                                                                             |
| `useMemo`          | Haak    | Kaderneutrale memoisatiehaak.                                                                                          |
| `useRef`           | Haak    | Kaderneutrale referentiehaak.                                                                                          |
| `useContext`       | Haak    | Kaderneutrale contexthaak.                                                                                             |
| `toVueComponent`   | Adapter | Converteert een smederijcomponent naar een Vue 3 componenten (vanaf `@mission-platform/forge/vue`). |
| `toReactComponent` | Adapter | Converteert een smederijcomponent naar een React onderdeel (van `@mission-platform/forge/react`).   |

### @mission-platform/vite-plugin-forge

The compiler driver accepts explicit `FrameworkOutputPlugin` instances; it does
not provide a framework registry. `defineViteForgeComponents` and
`defineTsdownForgeComponents` (plus the hook and CMS helpers) share an in-process
`ForgeCompilerService` for one build or watch session.

| Capability         | Beschrijving                                                                                                                                                                        |
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

| Exporteren                                                           | Typ              | Beschrijving                                                                                                                                          |
| :------------------------------------------------------------------- | :--------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MpRoute`                                                            | Typ              | Route records, params, query/hash state, metadata, and navigation targets.                                                            |
| `defineRoutes`                                                       | Functie          | Define route trees and resolve paths without a DOM or framework runtime.                                                              |
| `MpNavigationResult`, `MpRouteGuard`, `MpHistory`, `MpRouterAdapter` | Haak             | Navigation outcomes/events, guards, pluggable history, and adapter contracts.                                                         |
| `useMpRoute`                                                         | Compiler markers | Neutral link, route-state, navigation, resolution, and outlet capabilities consumed by shared packages.                               |
| `@mission-platform/forge-router-*`                                   | Forge targets    | Independently selected native router targets for Vue Router, React Router, SolidJS Router, SvelteKit, RedwoodSDK, and Web Components. |

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

## Gebruikersinterface en ontwerp

### @mission-platform/tokens

Gecentraliseerde ontwerptokens voor kleuren, typografie en spatiëring.

| Exporteren    | Description                                                                                                                  |
| :------------ | :--------------------------------------------------------------------------------------------------------------------------- |
| `tokens`      | JS/TS-object dat alle ontwerptokens bevat (bijv. `tokens.color.primary`). |
| `tokens.scss` | SCSS-variabelen voor gebruik in stylesheets.                                                                 |

### @mission-platform/breakpoints

Responsieve hulpprogramma's en zichtbaarheidscomponenten.

| Exporteren       | Typ       | Beschrijving                                                                        |
| :--------------- | :-------- | :---------------------------------------------------------------------------------- |
| `useBreakpoints` | Haak      | Retourneert de reactieve breekpuntstatus.                           |
| `ShowIf`         | Onderdeel | Geeft alleen kinderen weer als een breekpuntvoorwaarde overeenkomt. |
| `HideIf`         | Onderdeel | Hides children when a breakpoint condition matches.                 |

### @mission-platform/components

Gedeelde UI-componenten die één keer zijn geschreven en beschikbaar zijn voor meerdere frameworks.

- **Importeren**: altijd `@mission-platform/components`; de actieve `mp:<framework>` voorwaarde bepaalt of u de
  Vue 3, React, Solid, of het bouwen van webcomponenten.
- **Subpaden per component**: `@mission-platform/components/<path>` (e.g.
  `@mission-platform/components/atoms/forge-badge/forge-badge`) is ook conditiebewust en laadt alleen die component
  stuk.
- **Componenten**: `ForgeButton`, `ForgeInput`, `ForgeModal`, en meer.

## Functiepakketten

### @mission-platform/i18n

Internationaliseringssysteem gebaseerd op i18next.

| Exporteren        | Beschrijving                                                                 |
| :---------------- | :--------------------------------------------------------------------------- |
| `createForgeI18N` | Initialiseert de i18n-instantie met platformstandaarden.     |
| `useI18n`         | Hook voor vertalingen en locale-omschakeling in componenten. |

### @mission-platform/seo

Metatag- en SEO-beheer.

| Exporteren | Beschrijving                                                                                       |
| :--------- | :------------------------------------------------------------------------------------------------- |
| `useSeo`   | Hook om de paginatitel, metatags en Open Graph-gegevens declaratief in te stellen. |

### @mission-platform/map

Reactieve verpakking voor MapLibre GL.

| Onderdeel       | Beschrijving                                                             |
| :-------------- | :----------------------------------------------------------------------- |
| `<MpMap>`       | Hoofdkaartcontainercomponent.                            |
| `<MpMapMarker>` | Component voor het plaatsen van markeringen op de kaart. |

### @mission-platform/code-scanner

Cameragebaseerd scannen van streepjescodes en QR-codes.

| Onderdeel         | Beschrijving                                                                            |
| :---------------- | :-------------------------------------------------------------------------------------- |
| `<MpCodeScanner>` | Component dat de camerastream initialiseert en scanresultaten verzendt. |

## Integraties

### @mission-platform/rxjs

Overbrugt RxJS-observabelen naar de componentstatus.

| Haak            | Beschrijving                                                                                               |
| :-------------- | :--------------------------------------------------------------------------------------------------------- |
| `useObservable` | Abonneert zich op een waarneembare en retourneert de nieuwste waarde als reactieve status. |

### @mission-platform/d3

Kaderneutrale D3.js-integratie.

| Haak    | Beschrijving                                                                              |
| :------ | :---------------------------------------------------------------------------------------- |
| `useD3` | Bindt een D3-selectie aan een componentreferentie met levenscyclusbeheer. |

### @mission-platform/hunspell

Spellingcontrole door WebAssembly.

| Exporteren     | Beschrijving                                                          |
| :------------- | :-------------------------------------------------------------------- |
| `initHunspell` | Laadt en instantieert de Hunspell WebAssembly-module. |
| `spell`        | Controleert of een woord correct is gespeld.          |
| `suggest`      | Geeft spellingsuggesties voor een woord.              |

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

## Verder lezen

- [Vue 2 tot Vue 3 Migratiegids](migration-guides/vue2-to-vue3.md)
- [Overzicht projectconfiguratie](configs/index.md)
- [Structuur van de werkruimte](workspace-structure.md)

## Volledige werkruimtepakketindex

De volgende index wordt gegenereerd op basis van de pakketmanifesten en wordt hier bewaard, zodat de openbare API-referentie alles omvat
inpakken `packages/`, inclusief de getypte WebAssembly gevels.

### Kern en gebruikersinterface

| Pakket                         | Purpose                                                                           |
| :----------------------------- | :-------------------------------------------------------------------------------- |
| `@mission-platform/forge`      | Framework-neutrale JSX-runtime en adapters.                       |
| `@mission-platform/components` | UI-componenten die eenmalig kunnen worden geschreven.             |
| `@mission-platform/icons`      | Eenmalig beschrijfbare SVG-pictogramcomponenten.                  |
| `@mission-platform/layouts`    | Applicatie-, container- en responsieve lay-outcomponenten.        |
| `@mission-platform/forms`      | Schemaformulieren en componenten voor de visuele formulierbouwer. |
| `@mission-platform/forms-core` | Schema-afleiding, validatie en domeinlogica voor formulierbouwer. |
| `@mission-platform/tokens`     | Aangepaste CSS-eigenschappen en SCSS-ontwerptokens.               |

### Composables en integraties

| Pakket                                          | Purpose                                                                                          |
| :---------------------------------------------- | :----------------------------------------------------------------------------------------------- |
| `@mission-platform/breakpoints`                 | Responsieve breekpuntstatus en zichtbaarheidshelpers.                            |
| `@mission-platform/d3`                          | D3 selectie levenscyclus composable en margehulpprogramma's.                     |
| `@mission-platform/i18n`                        | i18next status- en raamwerkintegratiehelpers.                                    |
| `@mission-platform/map`                         | MapLibre kaartcomponenten en composables.                                        |
| `@mission-platform/observers`                   | Intersection, mutation, and performance observer composables.                    |
| `@mission-platform/phone-number`                | Getypte WebAssembly-parsering en opmaak van telefoonnummers.                     |
| `@mission-platform/router`                      | Framework-neutral route contracts and compiler capabilities.                     |
| `@mission-platform/forge-router-web-components` | Web Components router target and framework-free runtime.                         |
| `@mission-platform/rxjs`                        | RxJS waarneembare en abonnementscomposables.                                     |
| `@mission-platform/scheduler`                   | Scheduler UI, herhaling en kalenderindeling domeinlogica.                        |
| `@mission-platform/vcard`                       | RFC 6350 vCard- en RFC 5545 iCalendar-gegevens en componenten.                   |
| `@mission-platform/content`                     | Inhoud AST, bouwers, Monaco, Markdown en WYSIWYG-componenten.                    |
| `@mission-platform/seo`                         | Metagegevens, Open Graph en samengestelde gegevens met gestructureerde gegevens. |
| `@mission-platform/speech-audio`                | Spraak-, audio- en web-MIDI-composables.                                         |
| `@mission-platform/three`                       | Three.js canvas en levenscycluscomposables.                      |

### Code- en WebAssembly-pakketten

| Pakket                           | Purpose                                                          |
| :------------------------------- | :--------------------------------------------------------------- |
| `@mission-platform/barcode`      | 1D-barcode codeert/decodeert gevel en onderdeel. |
| `@mission-platform/code-scanner` | Camera and image code-scanning component.        |
| `@mission-platform/matrix-code`  | Data Matrix and Aztec encode/decode façade.      |
| `@mission-platform/qr-code`      | QR encode/decode façade and component.           |
| `@mission-platform/harper`       | Harper grammar and style integration for Monaco. |
| `@mission-platform/hunspell`     | Emscripten Hunspell spell-checking wrapper.      |

### Smeed compilerdoelen

These live in `packages/compiler/plugins/`. Een **framework**-plug-in bepaalt welke runtime een neutraal onderdeel is
wordt verlaagd tot; een **CMS**-doel bepaalt op welk contentplatform het wordt geprojecteerd. De twee assen vormen elkaar, dus elk CMS
target kan aan elke framework-plug-in worden gekoppeld. See the [Forge Compiler Pipeline](../packages/tooling/vite/forge/docs/reference/compiler.md).

| Pakket                                          | Purpose                                                                                               |
| :---------------------------------------------- | :---------------------------------------------------------------------------------------------------- |
| `@mission-platform/forge-plugin-api`            | `FrameworkOutputPlugin` contract-, semantische IR-typen en build-adaptertypen.        |
| `@mission-platform/forge-plugin-react`          | React uitgangsdoel.                                                                   |
| `@mission-platform/forge-plugin-vue`            | Vue 3 uitgangsdoel.                                                                   |
| `@mission-platform/forge-plugin-solid`          | Solid uitgangsdoel.                                                                   |
| `@mission-platform/forge-plugin-svelte`         | Svelte 5 uitgangsdoel.                                                                |
| `@mission-platform/forge-plugin-web-components` | Uitvoerdoel voor webcomponenten.                                                      |
| `@mission-platform/forge-cms-plugin-api`        | `CmsOutputPlugin` contract, neutraal inhoudsmodel, CMS-stuurprogramma en bouwhulpen.  |
| `@mission-platform/forge-cms-storyblok`         | Storyblok-componentobjecten, blok-wrappers en `components.json`.                      |
| `@mission-platform/forge-cms-astro`             | Statisch `.astro` sjablonen en `client:load` kader eilanden.                          |
| `@mission-platform/forge-cms-ghost`             | Ghost-stuurgedeelten en een `config.custom` thema fragment.                           |
| `@mission-platform/forge-cms-jekyll`            | Jekyll-vloeistof omvat, `_data` schema, en een `_config.yml` fragment.                |
| `@mission-platform/forge-cms-webflow`           | Webstroom `declareComponent` codecomponenten en a `webflow.json` bibliotheekfragment. |

#### @mission-platform/forge-cms-plugin-api

| Exporteren                | Typ     | Doel                                                                                                        |
| :------------------------ | :------ | :---------------------------------------------------------------------------------------------------------- |
| `analyzeContentComponent` | Functie | Projecteert de rekwisieten van een neutrale component op het platformneutrale inhoudsmodel. |
| `ContentComponent`        | Typ     | Besteld `ContentField`s, slots en de `interactive` vlag.                                    |
| `ContentFieldKind`        | Typ     | `text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`.             |
| `CmsOutputPlugin`         | Typ     | Het doelcontract: een gebonden raamwerkplug-in plus de vier emitters.       |
| `defineForgeCmsPlugin`    | Functie | Valideert een CMS-doel tijdens de configuratie.                                             |
| `generateCmsArtifacts`    | Functie | Het generieke stuurprogramma Discover → IR → Content Model → Emit → Write.                  |
| `defineTsdownForgeCms`    | Functie | tsdown-configuratie voor één CMS-doel, uitzendend `dist/cms/<cms>/<framework>/**`.          |
| `defineTsdownForgeCmsAll` | Functie | tsdown-configuraties voor een lijst met CMS-doelen.                                         |
