# Pakket-API-directory

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/api-reference.md: [docs/api-reference.md](../../api-reference.md)
> Taal: Nederlands (nl)

Deze projectbrede pagina is een directory met pakketmogelijkheden en compatibiliteit
contracten. De canonieke installatie, het gebruik, de beperkingen en API-details voor
elk pakket bevindt zich naast dat pakket eronder `packages/*/docs/`, `configs/*/docs/`,
En `forge-plugins/*/docs/`. Gegenereerde API-referenties moeten worden toegevoegd aan het bezit
pakket in plaats van deze pagina.

> **Invoer is altijd kaal.** Kaderverzending `@mission-platform/*` pakketten tonen een single `.`
> ingang bewaakt door de `mp:vue`, `mp:react`, `mp:solid`, En `mp:web-component` exporteren
> voorwaarden. Selecteer het raamwerk **eenmaal** — via `resolve.conditions` (zien `defineFrameworkAppConfig` /
> `frameworkResolveConditions` van `@mission-platform/vite-config`) En `customConditions` (via de
> `@mission-platform/typescript-config/framework-<name>` presets) — importeer vervolgens alles met de bare
> pakketspecificatie. Zien [Externe consumentenconfiguratie](external-consumer-setup.md).

## Kernkader

### @mission-platform/forge

De basis van de "write-once"-architectuur, die een raamwerkneutrale JSX-runtime en hooks biedt.

| Exporteren | Typ | Beschrijving |
|:-------------------|:---------|:----------------------------------------------------------------------------------------|
| `h`, `Fragment`    | Functie | JSX-fabriek en fragment voor het schrijven van componenten.                                      |
| `useState`         | Haak | Kaderneutrale staatshaak.                                                           |
| `useEffect`        | Haak | Kader-neutrale effecthaak.                                                          |
| `useMemo`          | Haak | Kaderneutrale memoisatiehaak.                                                     |
| `useRef`           | Haak | Kaderneutrale referentiehaak.                                                       |
| `useContext`       | Haak | Kaderneutrale contexthaak.                                                         |
| `toVueComponent`   | Adapter | Converteert een smederijcomponent naar een Vue 3 componenten (vanaf `@mission-platform/forge/vue`).   |
| `toReactComponent` | Adapter | Converteert een smederijcomponent naar een React onderdeel (van `@mission-platform/forge/react`). |

### @mission-platform/vite-plugin-forge

Het compilerstuurprogramma accepteert expliciete `FrameworkOutputPlugin` instanties; dat doet het
geen kaderregister bieden. `defineViteForgeComponents` En
`defineTsdownForgeComponents` (plus de hook- en CMS-helpers) delen een in-process
`ForgeCompilerService` voor één bouw- of kijksessie.

| Vermogen | Beschrijving |
|:-----------|:------------|
| Levenscyclus van diensten | Hergebruik de status van bron, grafiek, ontlede bron, semantische IR en doelartefact in verschillende builds; verwijder one-shot-services na voltooiing en watcher-services bij afsluiting. |
| Cachesleutels | Bron/afhankelijkheid/configuratie-vingerafdrukken, compiler- en routeropties, `tsconfig` `baseUrl`/`paths`, doel-ID, identiteit/versie van de plug-in en relevante voorwaarden. |
| Bekijk ongeldigverklaring | Gewijzigde bestanden maken de afhankelijke functies van de omgekeerde grafiek ongeldig, inclusief transitieve componenten en hook-items; niet-gerelateerde doelsnapshots blijven herbruikbaar. |
| Diagnostiek/rapport | Rapporteert fasetiming, aantal treffers/missers in de cache, getroffen bestanden, waarschuwingen, fouten en aantallen uitgezonden artefacten. Fouten blokkeren promotie. |
| Artefactmanifest | Geeft een overzicht van doelgerichte vermeldingen, modules, declaraties, bronkaarten, activa en controlesommen vóór atomaire promotie. |
| Verlengingspunt | Implementeren en doorgeven van een `FrameworkOutputPlugin` van een beller die eigendom is `forge-plugin-*` pakket; voeg geen doeltakken toe aan de neutrale driver. |

Configureer aliassen via het project `tsconfig.json` (`baseUrl` En
`paths`); Vite en tsdown-grafiekvoorbereiding gebruiken dezelfde aliasfeiten. Router
selectie, routerplug-ins en voorwaarden worden doorgestuurd via component en
haak helpers. Een toekomstige werker/daemon kan achter het servicecontract zitten, maar
de ondersteunde implementatie is momenteel in uitvoering.

### @mission-platform/router

Kaderneutrale routecontracten, pure matching-helpers en compilermarkeringen voor
gedeelde pakketten. Applicaties beschikken over routerecords en eigen routerinstances; de
Het door de applicatie geselecteerde Forge-routerdoel levert de runtime-mogelijkheden.

| Exporteren/verpakken | Typ | Beschrijving |
|:-----------------|:-----|:------------|
| `MpRoute`, `MpRouteLocationRaw`, `MpResolvedLocation` | Soorten | Routerecords, parameters, query-/hashstatus, metagegevens en navigatiedoelen. |
| `defineRoutes`, `matchRoutes`, `resolveLocation` | Functies | Definieer routebomen en los paden op zonder een DOM- of framework-runtime. |
| `MpNavigationResult`, `MpRouteGuard`, `MpHistory`, `MpRouterAdapter` | Soorten | Navigatieresultaten/gebeurtenissen, bewakers, inplugbare geschiedenis en adaptercontracten. |
| `MpLink`, `useMpRoute`, `useMpRouter`, `useMpNavigation`, `MpRouterView` | Compilermarkeringen | Neutrale link-, routestatus-, navigatie-, resolutie- en outlet-mogelijkheden die worden gebruikt door gedeelde pakketten. |
| `@mission-platform/forge-router-*` | Doelen smeden | Onafhankelijk geselecteerde native routerdoelen voor Vue Router, React Router, SolidJS Router, SvelteKit, RedwoodSDK en webcomponenten. |

Runtimepakketten hebben een eigen geschiedenis en reactieve status; het neutrale pakket importeert nooit een UI-framework. Voor webcomponenten,
registreer de elementen één keer en geef complexe doelen door via DOM-eigenschappen in plaats van geserialiseerde attributen:

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

| Exporteren | Beschrijving |
|:--------------|:--------------------------------------------------------------------------|
| `tokens`      | JS/TS-object dat alle ontwerptokens bevat (bijv. `tokens.color.primary`). |
| `tokens.scss` | SCSS-variabelen voor gebruik in stylesheets.                                    |

### @mission-platform/breakpoints

Responsieve hulpprogramma's en zichtbaarheidscomponenten.

| Exporteren | Typ | Beschrijving |
|:-----------------|:----------|:-----------------------------------------------------------|
| `useBreakpoints` | Haak | Retourneert de reactieve breekpuntstatus.                        |
| `ShowIf`         | Onderdeel | Geeft alleen kinderen weer als een breekpuntvoorwaarde overeenkomt. |
| `HideIf`         | Onderdeel | Verbergt onderliggende items wanneer een breekpuntvoorwaarde overeenkomt.        |

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

| Exporteren | Beschrijving |
|:------------------|:----------------------------------------------------------|
| `createForgeI18N` | Initialiseert de i18n-instantie met platformstandaardwaarden.     |
| `useI18n`         | Hook voor vertalingen en locale-omschakeling in componenten. |

### @mission-platform/seo

Metatag- en SEO-beheer.

| Exporteren | Beschrijving |
|:---------|:----------------------------------------------------------------------|
| `useSeo` | Hook om de paginatitel, metatags en Open Graph-gegevens declaratief in te stellen. |

### @mission-platform/map

Reactieve verpakking voor MapLibre GL.

| Onderdeel | Beschrijving |
|:----------------|:------------------------------------------|
| `<MpMap>`       | Hoofdkaartcontainercomponent.             |
| `<MpMapMarker>` | Component voor het plaatsen van markeringen op de kaart. |

### @mission-platform/code-scanner

Cameragebaseerd scannen van streepjescodes en QR-codes.

| Onderdeel | Beschrijving |
|:------------------|:-----------------------------------------------------------------|
| `<MpCodeScanner>` | Component dat de camerastream initialiseert en scanresultaten verzendt. |

## Integraties

### @mission-platform/rxjs

Overbrugt RxJS-observabelen naar de componentstatus.

| Haak | Beschrijving |
|:----------------|:----------------------------------------------------------------------------|
| `useObservable` | Abonneert zich op een waarneembare en retourneert de nieuwste waarde als reactieve status. |

### @mission-platform/d3

Kaderneutrale D3.js-integratie.

| Haak | Beschrijving |
|:--------|:-------------------------------------------------------------------|
| `useD3` | Bindt een D3-selectie aan een componentreferentie met levenscyclusbeheer. |

### @mission-platform/hunspell

Door WebAssembly aangedreven spellingcontrole.

| Exporteren | Beschrijving |
|:---------------|:--------------------------------------------------------|
| `initHunspell` | Laadt en instantieert de Hunspell WebAssembly-module. |
| `spell`        | Controleert of een woord correct is gespeld.                  |
| `suggest`      | Geeft spellingsuggesties voor een woord.               |

## Verder lezen

- [Vue 2 tot Vue 3 Migratiegids](migration-guides/vue2-to-vue3.md)
- [Overzicht projectconfiguratie](configs/index.md)
- [Structuur van de werkruimte](workspace-structure.md)

## Volledige werkruimtepakketindex

De volgende index wordt gegenereerd op basis van de pakketmanifesten en wordt hier bewaard, zodat de openbare API-referentie alles omvat
inpakken `packages/`, inclusief de getypte WebAssembly gevels.

### Kern en gebruikersinterface

| Pakket | Doel |
|:-------------------------------|:--------------------------------------------------------------|
| `@mission-platform/forge`      | Framework-neutrale JSX-runtime en adapters.                   |
| `@mission-platform/components` | UI-componenten die eenmalig kunnen worden geschreven.                                     |
| `@mission-platform/icons`      | Eenmalig beschrijfbare SVG-pictogramcomponenten.                               |
| `@mission-platform/layouts`    | Applicatie-, container- en responsieve lay-outcomponenten.     |
| `@mission-platform/forms`      | Schemaformulieren en componenten voor de visuele formulierbouwer.              |
| `@mission-platform/forms-core` | Schema-afleiding, validatie en domeinlogica voor formulierbouwer. |
| `@mission-platform/tokens`     | Aangepaste CSS-eigenschappen en SCSS-ontwerptokens.                 |

### Composables en integraties

| Pakket | Doel |
|:-----------------------------------|:--------------------------------------------------------------|
| `@mission-platform/breakpoints`    | Responsieve breekpuntstatus en zichtbaarheidshelpers.           |
| `@mission-platform/d3`             | D3 selectie levenscyclus composable en margehulpprogramma's.       |
| `@mission-platform/i18n`           | i18next status- en raamwerkintegratiehelpers.              |
| `@mission-platform/map`            | MapLibre kaartcomponenten en composables.                      |
| `@mission-platform/observers`      | Composables voor snijpunten, mutaties en prestatiewaarnemers. |
| `@mission-platform/phone-number`   | Getypte WebAssembly-parsering en opmaak van telefoonnummers.        |
| `@mission-platform/router`         | Kaderneutrale routecontracten en compilermogelijkheden. |
| `@mission-platform/forge-router-web-components` | Web Components-routerdoel en framework-vrije runtime. |
| `@mission-platform/rxjs`           | RxJS waarneembare en abonnementscomposables.                 |
| `@mission-platform/scheduler`     | Scheduler UI, herhaling en agenda-indeling domeinlogica. |
| `@mission-platform/vcard`         | RFC 6350 vCard- en RFC 5545 iCalendar-gegevens en componenten.  |
| `@mission-platform/content`       | Inhoud AST, bouwers, Monaco, Markdown en WYSIWYG-componenten. |
| `@mission-platform/seo`            | Metagegevens, Open Graph en samengestelde gegevens met gestructureerde gegevens.        |
| `@mission-platform/speech-audio`   | Spraak-, audio- en web-MIDI-composables.                      |
| `@mission-platform/three`          | Three.js canvas en levenscycluscomposables.                    |

### Code- en WebAssembly-pakketten

| Pakket | Doel |
|:--------------------------------------------|:--------------------------------------------------|
| `@mission-platform/barcode`                 | 1D-barcode codeert/decodeert gevel en onderdeel.    |
| `@mission-platform/code-scanner`            | Component voor het scannen van camera- en beeldcodes.         |
| `@mission-platform/matrix-code`             | Data Matrix en Azteekse codeer-/decodeerfaçade.       |
| `@mission-platform/qr-code`                 | QR codeert/decodeert gevel en component.            |
| `@mission-platform/harper`                  | Harper grammatica en stijlintegratie voor Monaco.  |
| `@mission-platform/hunspell`                | Emscripten Hunspell-wrapper voor spellingcontrole.       |

### Smeed compilerdoelen

Deze wonen erin `forge-plugins/` in plaats van `packages/`. Een **framework**-plug-in bepaalt welke runtime een neutraal onderdeel is
wordt verlaagd tot; een **CMS**-doel bepaalt op welk contentplatform het wordt geprojecteerd. De twee assen vormen elkaar, dus elk CMS
target kan aan elke framework-plug-in worden gekoppeld. Zie de [Forge Compiler-pijplijn](../../../vite-plugins/forge/docs/locales/nl/reference/compiler.md).

| Pakket | Doel |
|:-------------------------------------------------|:--------------------------------------------------------------------------------|
| `@mission-platform/forge-plugin-api`             | `FrameworkOutputPlugin` contract-, semantische IR-typen en build-adaptertypen.   |
| `@mission-platform/forge-plugin-react`           | React uitgangsdoel.                                                            |
| `@mission-platform/forge-plugin-vue`             | Vue 3 uitgangsdoel.                                                            |
| `@mission-platform/forge-plugin-solid`           | Solid uitgangsdoel.                                                            |
| `@mission-platform/forge-plugin-svelte`          | Svelte 5 uitgangsdoel.                                                         |
| `@mission-platform/forge-plugin-web-components`  | Uitvoerdoel voor webcomponenten.                                                   |
| `@mission-platform/forge-cms-plugin-api`         | `CmsOutputPlugin` contract, neutraal inhoudsmodel, CMS-stuurprogramma en bouwhulpen. |
| `@mission-platform/forge-cms-storyblok`          | Storyblok-componentobjecten, blok-wrappers en `components.json`.              |
| `@mission-platform/forge-cms-astro`              | Statisch `.astro` sjablonen en `client:load` kader eilanden.                  |
| `@mission-platform/forge-cms-ghost`              | Ghost-stuurgedeelten en een `config.custom` thema fragment.                 |
| `@mission-platform/forge-cms-jekyll`             | Jekyll-vloeistof omvat, `_data` schema, en een `_config.yml` fragment.           |
| `@mission-platform/forge-cms-webflow`            | Webstroom `declareComponent` codecomponenten en a `webflow.json` bibliotheekfragment. |

#### @mission-platform/forge-cms-plugin-api

| Exporteren | Typ | Beschrijving |
|:---------------------------|:---------|:--------------------------------------------------------------------------------|
| `analyzeContentComponent`  | Functie | Projecteert de rekwisieten van een neutrale component op het platformneutrale inhoudsmodel.  |
| `ContentComponent`         | Typ | Besteld `ContentField`s, slots en de `interactive` vlag.                    |
| `ContentFieldKind`         | Typ | `text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`. |
| `CmsOutputPlugin`          | Typ | Het doelcontract: een gebonden raamwerkplug-in plus de vier emitters.          |
| `defineForgeCmsPlugin`     | Functie | Valideert een CMS-doel tijdens de configuratie.                                  |
| `generateCmsArtifacts`     | Functie | Het generieke stuurprogramma Discover → IR → Content Model → Emit → Write.               |
| `defineTsdownForgeCms`     | Functie | tsdown-configuratie voor één CMS-doel, uitzendend `dist/cms/<cms>/<framework>/**`.    |
| `defineTsdownForgeCmsAll`  | Functie | tsdown-configuraties voor een lijst met CMS-doelen.                                      |
