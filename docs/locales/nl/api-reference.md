# API-referentie

Technische referentie voor de Mission Platform-kernpakketten en framework-adapters.

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

## Gebruikersinterface en ontwerp

### @mission-platform/tokens

Gecentraliseerde ontwerptokens voor kleuren, typografie en spatiëring.

| Exporteren    | Beschrijving                                                                                                                 |
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

| Pakket                             | Purpose                                                               |
| :--------------------------------- | :-------------------------------------------------------------------- |
| `@mission-platform/barcode`        | 1D-barcode codeert/decodeert gevel en onderdeel.      |
| `@mission-platform/code-scan-wasm` | Gegenereerde afbeeldingsscanner WebAssembly-module.   |
| `@mission-platform/code-scanner`   | Component voor het scannen van camera- en beeldcodes. |
| `@mission-platform/matrix-code`    | Data Matrix en Azteekse codeer-/decodeerfaçade.       |
| `@mission-platform/qr-code`        | QR codeert/decodeert gevel en component.              |
| `@mission-platform/harper`         | Harper grammatica en stijlintegratie voor Monaco.     |
| `@mission-platform/hunspell`       | Emscripten Hunspell-wrapper voor spellingcontrole.    |

### Smeed compilerdoelen

Deze wonen in `forge-plugins/` in plaats van `packages/`. Een **framework**-plug-in bepaalt welke runtime een neutraal onderdeel is
wordt verlaagd tot; een **CMS**-doel bepaalt op welk contentplatform het wordt geprojecteerd. De twee assen vormen elkaar, dus elk CMS
target kan aan elke framework-plug-in worden gekoppeld. Zien [Forge Compiler-pijplijn](forge-compiler.md).

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
