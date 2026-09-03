# Package API Directory

This project-wide page is a directory of package capabilities and compatibility
contracts. The canonical installation, usage, limitations, and API details for
each package live beside that package under `packages/*/docs/`, `configs/*/docs/`,
and `forge-plugins/*/docs/`. Generated API references must be added to the owning
package rather than this page.

> **Le importazioni sono sempre scarne.** Spedizione quadro `@mission-platform/*` i pacchetti espongono un singolo `.`
> ingresso custodito dal `mp:vue`, `mp:react`, `mp:solid`, E `mp:web-component` esportazione
> condizioni. Seleziona il framework **una volta** — via `resolve.conditions` (Vedere `defineFrameworkAppConfig` /
> `frameworkResolveConditions` da `@mission-platform/vite-config`) E `customConditions` (tramite il
> `@mission-platform/typescript-config/framework-<name>` preimpostazioni) - quindi importa tutto con bare
> identificatore del pacchetto. Vedere [Configurazione del consumatore esterno](external-consumer-setup.md).

## Quadro fondamentale

### @mission-platform/forge

La base dell'architettura "write-once", che fornisce un runtime JSX e hook indipendenti dal framework.

| Esporta            | Type       | Digitare                                                                                                                            |
| :----------------- | :--------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| `h`, `Fragment`    | Funzione   | Factory JSX e frammento per la creazione di componenti.                                                             |
| `useState`         | Gancio     | Hook di stato neutrale rispetto al quadro normativo.                                                                |
| `useEffect`        | Gancio     | Gancio effetto quadro neutro.                                                                                       |
| `useMemo`          | Gancio     | Gancio di memorizzazione neutro dal framework.                                                                      |
| `useRef`           | Gancio     | Gancio di riferimento neutro rispetto al contesto.                                                                  |
| `useContext`       | Gancio     | Hook di contesto neutrale rispetto al contesto.                                                                     |
| `toVueComponent`   | Adattatore | Converte un componente di forgiatura in a Vue 3 componenti (da `@mission-platform/forge/vue`).   |
| `toReactComponent` | Adattatore | Converte un componente di forgiatura in a React componente (da `@mission-platform/forge/react`). |

### @mission-platform/vite-plugin-forge

The compiler driver accepts explicit `FrameworkOutputPlugin` instances; it does
not provide a framework registry. `defineViteForgeComponents` and
`defineTsdownForgeComponents` (plus the hook and CMS helpers) share an in-process
`ForgeCompilerService` for one build or watch session.

| Capability         | Descrizione                                                                                                                                                                         |
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

| Export / package                                                     | Type             | Descrizione                                                                                                                                           |
| :------------------------------------------------------------------- | :--------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MpRoute`                                                            | Types            | Route records, params, query/hash state, metadata, and navigation targets.                                                            |
| `defineRoutes`                                                       | Funzione         | Define route trees and resolve paths without a DOM or framework runtime.                                                              |
| `MpNavigationResult`, `MpRouteGuard`, `MpHistory`, `MpRouterAdapter` | Types            | Navigation outcomes/events, guards, pluggable history, and adapter contracts.                                                         |
| `useMpRoute`                                                         | Compiler markers | Neutral link, route-state, navigation, resolution, and outlet capabilities consumed by shared packages.                               |
| `@mission-platform/forge-router-*`                                   | Scopo            | Independently selected native router targets for Vue Router, React Router, SolidJS Router, SvelteKit, RedwoodSDK, and Web Components. |

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

## Interfaccia utente e design

### @mission-platform/tokens

Token di progettazione centralizzati per colori, tipografia e spaziatura.

| Esporta       | Description                                                                                                                      |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------- |
| `tokens`      | Oggetto JS/TS contenente tutti i token di progettazione (ad esempio, `tokens.color.primary`). |
| `tokens.scss` | Variabili SCSS da utilizzare nei fogli di stile.                                                                 |

### @mission-platform/breakpoints

Utilità reattive e componenti di visibilità.

| Esporta          | Type       | Descrizione                                                                                    |
| :--------------- | :--------- | :--------------------------------------------------------------------------------------------- |
| `useBreakpoints` | Gancio     | Restituisce lo stato del punto di interruzione reattivo.                       |
| `ShowIf`         | Componente | Rende i figli solo quando corrisponde una condizione di punto di interruzione. |
| `HideIf`         | Componente | Nasconde i figli quando corrisponde una condizione del punto di interruzione.  |

### @mission-platform/components

Componenti dell'interfaccia utente condivisi creati una volta e disponibili per più framework.

- **Importa**: sempre `@mission-platform/components`; l'attivo `mp:<framework>` la condizione decide se ottieni il file
  Vue 3, React, Solido build di componenti Web.
- **Percorsi secondari per componente**: `@mission-platform/components/<path>` (e.g.
  `@mission-platform/components/atoms/forge-badge/forge-badge`) è anche sensibile alle condizioni e carica solo quel componente
  pezzo.
- **Componenti**: `ForgeButton`, `ForgeInput`, `ForgeModal`e altro ancora.

## Pacchetti di funzionalità

### @mission-platform/i18n

Sistema di internazionalizzazione basato su i18next.

| Esporta           | Descrizione                                                                                   |
| :---------------- | :-------------------------------------------------------------------------------------------- |
| `createForgeI18N` | Inizializza l'istanza i18n con le impostazioni predefinite della piattaforma. |
| `useI18n`         | Hook per traduzioni e cambio locale nei componenti.                           |

### @mission-platform/seo

Meta tag e gestione SEO.

| Esporta  | Descrizione                                                                                                     |
| :------- | :-------------------------------------------------------------------------------------------------------------- |
| `useSeo` | Hook per impostare in modo dichiarativo il titolo della pagina, i meta tag e i dati Open Graph. |

### @mission-platform/map

Wrapper reattivo per MapLibre GL.

| Componente      | Descrizione                                                         |
| :-------------- | :------------------------------------------------------------------ |
| `<MpMap>`       | Componente contenitore della mappa principale.      |
| `<MpMapMarker>` | Componente per posizionare i marcatori sulla mappa. |

### @mission-platform/code-scanner

Scansione di codici a barre e codici QR basata su fotocamera.

| Componente        | Descrizione                                                                                                  |
| :---------------- | :----------------------------------------------------------------------------------------------------------- |
| `<MpCodeScanner>` | Componente che inizializza il flusso della telecamera ed emette i risultati della scansione. |

## Integrazioni

### @mission-platform/rxjs

Collega gli osservabili RxJS allo stato del componente.

| Gancio          | Descrizione                                                                                              |
| :-------------- | :------------------------------------------------------------------------------------------------------- |
| `useObservable` | Si iscrive a un osservabile e restituisce il suo valore più recente come stato reattivo. |

### @mission-platform/d3

Integrazione D3.js indipendente dal framework.

| Gancio  | Descrizione                                                                                             |
| :------ | :------------------------------------------------------------------------------------------------------ |
| `useD3` | Associa una selezione D3 a un riferimento componente con la gestione del ciclo di vita. |

### @mission-platform/hunspell

Controllo ortografico basato su WebAssembly.

| Esporta        | Descrizione                                                               |
| :------------- | :------------------------------------------------------------------------ |
| `initHunspell` | Carica e crea un'istanza del modulo Hunspell WebAssembly. |
| `spell`        | Controlla se una parola è stata scritta correttamente.    |
| `suggest`      | Fornisce suggerimenti per l'ortografia di una parola.     |

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

## Ulteriori letture

- [Vue 2 a Vue 3 Guida alla migrazione](migration-guides/vue2-to-vue3.md)
- [Panoramica della configurazione del progetto](configs/index.md)
- [Struttura dell'area di lavoro](workspace-structure.md)

## Indice completo del pacchetto Workspace

L'indice seguente viene generato dai manifesti del pacchetto e viene mantenuto qui in modo che il riferimento all'API pubblica copra ogni
pacchetto dentro `packages/`, incluse le facciate WebAssembly tipizzate.

### Core and UI

| Pacchetto                      | Purpose                                                                                           |
| :----------------------------- | :------------------------------------------------------------------------------------------------ |
| `@mission-platform/forge`      | Runtime e adattatori JSX indipendenti dal framework.                              |
| `@mission-platform/components` | Componenti dell'interfaccia utente scrivibili una sola volta.                     |
| `@mission-platform/icons`      | Componenti dell'icona SVG scrivibili una sola volta.                              |
| `@mission-platform/layouts`    | Componenti dell'applicazione, del contenitore e del layout reattivo.              |
| `@mission-platform/forms`      | Moduli dello schema e componenti visivi per la creazione di moduli.               |
| `@mission-platform/forms-core` | Derivazione dello schema, convalida e logica del dominio di creazione del modulo. |
| `@mission-platform/tokens`     | Proprietà personalizzate CSS e token di progettazione SCSS.                       |

### Componibili e integrazioni

| Pacchetto                                       | Purpose                                                                                                                          |
| :---------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| `@mission-platform/breakpoints`                 | Stato del punto di interruzione reattivo e aiutanti di visibilità.                                               |
| `@mission-platform/d3`                          | D3 selezione del ciclo di vita componibile e utilità di margine.                                                 |
| `@mission-platform/i18n`                        | Aiutanti dell'integrazione statale e quadro i18next.                                                             |
| `@mission-platform/map`                         | Componenti e componenti di mappe MapLibre.                                                                       |
| `@mission-platform/observers`                   | Componenti componibili di intersezione, mutazione e osservatore di prestazioni.                                  |
| `@mission-platform/phone-number`                | Analisi e formattazione del numero di telefono WebAssembly digitato.                                             |
| `@mission-platform/router`                      | Framework-neutral route contracts and compiler capabilities.                                                     |
| `@mission-platform/forge-router-web-components` | Web Components router target and framework-free runtime.                                                         |
| `@mission-platform/rxjs`                        | Osservabile RxJS e componenti componibili in abbonamento.                                                        |
| `@mission-platform/scheduler`                   | Interfaccia utente dello strumento di pianificazione, ricorrenza e logica del dominio del layout del calendario. |
| `@mission-platform/vcard`                       | Dati e componenti RFC 6350 vCard e RFC 5545 iCalendar.                                                           |
| `@mission-platform/content`                     | Contenuto AST, costruttori, Monaco, Markdown e componenti WYSIWYG.                                               |
| `@mission-platform/seo`                         | Metadati, Open Graph e componenti componibili con dati strutturati.                                              |
| `@mission-platform/speech-audio`                | Componenti componibili vocali, audio e Web MIDI.                                                                 |
| `@mission-platform/three`                       | Tre.js canvas e componenti componibili del ciclo di vita.                                        |

### Pacchetti di codice e WebAssembly

| Pacchetto                        | Purpose                                                                             |
| :------------------------------- | :---------------------------------------------------------------------------------- |
| `@mission-platform/barcode`      | Codifica/decodifica di codici a barre 1D per facciate e componenti. |
| `@mission-platform/code-scanner` | Camera and image code-scanning component.                           |
| `@mission-platform/matrix-code`  | Data Matrix and Aztec encode/decode façade.                         |
| `@mission-platform/qr-code`      | QR encode/decode façade and component.                              |
| `@mission-platform/harper`       | Harper grammar and style integration for Monaco.                    |
| `@mission-platform/hunspell`     | Emscripten Hunspell spell-checking wrapper.                         |

### Obiettivi del compilatore Forge

Questi vivono dentro `forge-plugins/` piuttosto che `packages/`. Un plugin **framework** decide quale runtime è un componente neutro
è abbassato a; un target **CMS** decide su quale piattaforma di contenuti viene proiettato. I due assi si compongono, quindi qualsiasi CMS
target può essere associato a qualsiasi plugin del framework. See the [Forge Compiler Pipeline](../vite-plugins/forge/docs/reference/compiler.md).

| Pacchetto                                       | Purpose                                                                                                         |
| :---------------------------------------------- | :-------------------------------------------------------------------------------------------------------------- |
| `@mission-platform/forge-plugin-api`            | `FrameworkOutputPlugin` contratto, tipi IR semantici e tipi di adattatori di build.             |
| `@mission-platform/forge-plugin-react`          | React obiettivo di uscita.                                                                      |
| `@mission-platform/forge-plugin-vue`            | Vue 3 obiettivi di uscita.                                                                      |
| `@mission-platform/forge-plugin-solid`          | Solid obiettivo di uscita.                                                                      |
| `@mission-platform/forge-plugin-svelte`         | Svelte 5 obiettivi di uscita.                                                                   |
| `@mission-platform/forge-plugin-web-components` | Destinazione di output dei componenti Web.                                                      |
| `@mission-platform/forge-cms-plugin-api`        | `CmsOutputPlugin` contratto, modello di contenuto neutro, driver CMS e build helper.            |
| `@mission-platform/forge-cms-storyblok`         | Oggetti componenti Storyblok, wrapper di blocchi e `components.json`.                           |
| `@mission-platform/forge-cms-astro`             | Statico `.astro` modelli e `client:load` isole quadro.                                          |
| `@mission-platform/forge-cms-ghost`             | Parziali del manubrio Ghost e a `config.custom` frammento tematico.                             |
| `@mission-platform/forge-cms-jekyll`            | Jekyll Liquid include, `_data` schema e a `_config.yml` frammento.                              |
| `@mission-platform/forge-cms-webflow`           | Flusso web `declareComponent` componenti del codice e a `webflow.json` frammento di biblioteca. |

#### @mission-platform/forge-cms-plugin-api

| Esporta                   | Type     | Descrizione                                                                                                                          |
| :------------------------ | :------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| `analyzeContentComponent` | Funzione | Proietta gli oggetti di scena di un componente neutrale sul modello di contenuto neutrale rispetto alla piattaforma. |
| `ContentComponent`        | Type     | Ordinato `ContentField`s, slot e il `interactive` bandiera.                                                          |
| `ContentFieldKind`        | Type     | `text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`.                                      |
| `CmsOutputPlugin`         | Type     | Il contratto target: un plugin framework vincolato più i quattro emettitori.                         |
| `defineForgeCmsPlugin`    | Funzione | Convalida una destinazione CMS in fase di configurazione.                                                            |
| `generateCmsArtifacts`    | Funzione | Il generico discover → IR → content model → emit → write driver.                                                     |
| `defineTsdownForgeCms`    | Funzione | tsdown config per un target CMS, emissione `dist/cms/<cms>/<framework>/**`.                                          |
| `defineTsdownForgeCmsAll` | Funzione | tsdown per un elenco di destinazioni CMS.                                                                            |
