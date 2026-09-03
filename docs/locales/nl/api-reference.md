# Pakket-API-directory

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/api-reference.md: [docs/api-reference.md](../../api-reference.md)
> Taal: Nederlands (nl)

Deze projectbrede pagina is een directory met pakketmogelijkheden en compatibiliteit
contracten. De canonieke installatie, het gebruik, de beperkingen en API-details voor
elk pakket bevindt zich naast dat pakket onder `packages/**/docs/`, ` `,
en ` `. Gegenereerde API-referenties moeten worden toegevoegd aan het bezit
pakket in plaats van deze pagina.

> **Imports zijn altijd kaal.** Framework-verzending `@mission-platform/*`-pakketten tonen één `.`
> toegang bewaakt door de export `mp:vue`, `mp:react`, `mp:solid` en `mp:web-component`
> voorwaarden. Selecteer het raamwerk **eenmaal** — via `resolve.conditions` (zie `defineFrameworkAppConfig` /
> `frameworkResolveConditions` van `@mission-platform/vite-config`) en `customConditions` (via de
> `@mission-platform/typescript-config/framework-<name>`-voorinstellingen) - importeer vervolgens alles met de kale
> pakketspecificatie. Zie [Externe consumenteninstellingen](external-consumer-setup.md).

## Kernkader

### @mission-platform/forge

De basis van de "write-once"-architectuur, die een raamwerkneutrale JSX-runtime en hooks biedt.

| Exporteren | Typ | Beschrijving |
| :----------------- | :------- | :-------------------------------------------------------------------------------------- |
| `h`, `Fragment` | Functie | JSX-fabriek en fragment voor het schrijven van componenten.                                      |
| `useState` | Haak | Kaderneutrale staatshaak.                                                           |
| `useEffect` | Haak | Kader-neutrale effecthaak.                                                          |
| `useMemo` | Haak | Kaderneutrale memoisatiehaak.                                                     |
| `useRef` | Haak | Kaderneutrale referentiehaak.                                                       |
| `useContext` | Haak | Kaderneutrale contexthaak.                                                         |
| `toVueComponent` | Adapter | Converteert een smederijcomponent naar een Vue 3-component (van `@mission-platform/forge/vue`).   |
| `toReactComponent` | Adapter | Converteert een smederijcomponent naar een React-component (van `@mission-platform/forge/react`). |

### @mission-platform/vite-plugin-forge

Het compilerstuurprogramma accepteert expliciete `FrameworkOutputPlugin`-instanties; dat doet het
geen kaderregister bieden. `defineViteForgeComponents` en
`defineTsdownForgeComponents` (plus de hook- en CMS-helpers) delen een in-process
`ForgeCompilerService` voor één bouw- of kijksessie.

| Vermogen | Beschrijving |
| :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Levenscyclus van diensten | Hergebruik de status van bron, grafiek, geparseerde bron, semantische IR en doelartefact in verschillende builds; verwijder one-shot-services na voltooiing en watcher-services bij afsluiting. |
| Cachesleutels | Bron/afhankelijkheid/configuratie-vingerafdrukken, compiler- en routeropties, `tsconfig` `baseUrl`/`paths`, doel-ID, identiteit/versie van de plug-in en relevante voorwaarden.      |
| Bekijk ongeldigverklaring | Gewijzigde bestanden maken de afhankelijke functies van de omgekeerde grafiek ongeldig, inclusief transitieve componenten en hook-items; niet-gerelateerde doelsnapshots blijven herbruikbaar.                     |
| Diagnostiek/rapport | Rapporteert fasetiming, aantal treffers/missers in de cache, getroffen bestanden, waarschuwingen, fouten en aantallen uitgezonden artefacten. Fouten blokkeren promotie.                                 |
| Artefactmanifest | Geeft een overzicht van doelgerichte vermeldingen, modules, declaraties, bronkaarten, activa en controlesommen vóór atomaire promotie.                                                     |
| Verlengingspunt | Implementeer en geef een `FrameworkOutputPlugin` door vanuit een `forge-plugin-*`-pakket dat eigendom is van de beller; voeg geen doeltakken toe aan de neutrale driver.                        |

Configureer aliassen via het project `tsconfig.json` (`baseUrl` en
`paths`); Vite en tsdown-grafiekvoorbereiding gebruiken dezelfde aliasfeiten. Router
selectie, routerplug-ins en voorwaarden worden doorgestuurd via component en
haak helpers. Een toekomstige werker/daemon kan achter het servicecontract zitten, maar
de ondersteunde implementatie is momenteel in uitvoering.

### @mission-platform/router

Kaderneutrale routecontracten, pure matching-helpers en compilermarkeringen voor
gedeelde pakketten. Applicaties beschikken over routerecords en eigen routerinstances; de
Het door de applicatie geselecteerde Forge-routerdoel levert de runtime-mogelijkheden.

| Exporteren/verpakken | Typ | Beschrijving |
| :----------------------------------------------------------------------- | :--------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| `MpRoute`, `MpRouteLocationRaw`, `MpResolvedLocation` | Soorten | Routerecords, parameters, query-/hashstatus, metagegevens en navigatiedoelen.                                                            |
| `defineRoutes`, `matchRoutes`, `resolveLocation` | Functies | Definieer routebomen en los paden op zonder een DOM- of framework-runtime.                                                              |
| `MpNavigationResult`, `MpRouteGuard`, `MpHistory`, `MpRouterAdapter` | Soorten | Navigatieresultaten/gebeurtenissen, bewakers, inplugbare geschiedenis en adaptercontracten.                                                         |
| `MpLink`, `useMpRoute`, `useMpRouter`, `useMpNavigation`, `MpRouterView` | Compilermarkeringen | Neutrale link-, routestatus-, navigatie-, resolutie- en outlet-mogelijkheden die worden gebruikt door gedeelde pakketten.                               |
| `@mission-platform/forge-router-*` | Doelen smeden | Onafhankelijk geselecteerde native routerdoelen voor Vue Router, React Router, SolidJS Router, SvelteKit, RedwoodSDK en Web Components. |

Runtimepakketten hebben een eigen geschiedenis en reactieve status; het neutrale pakket importeert nooit een UI-framework. Voor webcomponenten,
registreer de elementen één keer en geef complexe doelen door via DOM-eigenschappen in plaats van geserialiseerde attributen:

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

### Asynchrone routeweergaven en `Suspense`

De neutrale compiler van Forge herkent `Suspense` en verlaagt deze naar de native versie
asynchrone grens voor het geselecteerde doel. Bewaar de fallback in de gedeelde bron
dus elk doel presenteert dezelfde laadstatus zonder een raamwerk te importeren
adapter:

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

React, Vue, Solid en Svelte ontvangen hun eigen spanningsgrens. EEN
framework-vrije applicatie maakt gebruik van de outlet-fallback van de Web Components-router
voor asynchrone routeweergaven in plaats daarvan:

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

De router zendt een laadoverlay uit van `forge-router-outlet` terwijl de async
routeweergave is opgelost. De huidige weergave blijft geactiveerd totdat de bestemming is bereikt
klaar en de overlay wordt verwijderd na succes, omleiding, annulering of
mislukking.

## Gebruikersinterface en ontwerp

### @mission-platform/tokens

Gecentraliseerde ontwerptokens voor kleuren, typografie en spatiëring.

| Exporteren | Beschrijving |
| :------------ | :------------------------------------------------------------------------ |
| `tokens` | JS/TS-object dat alle ontwerptokens bevat (bijvoorbeeld `tokens.color.primary`). |
| `tokens.scss` | SCSS-variabelen voor gebruik in stylesheets.                                    |

### @mission-platform/breakpoints

Responsieve hulpprogramma's en zichtbaarheidscomponenten.

| Exporteren | Typ | Beschrijving |
| :--------------- | :-------- | :--------------------------------------------------------- |
| `useBreakpoints` | Haak | Retourneert de reactieve breekpuntstatus.                        |
| `ShowIf` | Onderdeel | Geeft alleen kinderen weer als een breekpuntvoorwaarde overeenkomt. |
| `HideIf` | Onderdeel | Verbergt onderliggende items wanneer een breekpuntvoorwaarde overeenkomt.        |

### @mission-platform/components

Gedeelde UI-componenten die één keer zijn geschreven en beschikbaar zijn voor meerdere frameworks.

- **Importeren**: altijd `@mission-platform/components`; de actieve `mp:<framework>`-voorwaarde bepaalt of u de
  Vue 3, React, Solid of webcomponentbuild.
- **Subpaden per component**: `@mission-platform/components/<path>` (bijv.
  `@mission-platform/components/atoms/forge-badge/forge-badge`) is ook conditiebewust en laadt alleen die component
  stuk.
- **Componenten**: `ForgeButton`, `ForgeInput`, `ForgeModal` en meer.

## Functiepakketten

### @mission-platform/i18n

Internationaliseringssysteem gebaseerd op i18next.

| Exporteren | Beschrijving |
| :---------------- | :-------------------------------------------------------- |
| `createForgeI18N` | Initialiseert de i18n-instantie met platformstandaardwaarden.     |
| `useI18n` | Hook voor vertalingen en locale-omschakeling in componenten. |

### @mission-platform/seo

Metatag- en SEO-beheer.

| Exporteren | Beschrijving |
| :------- | :-------------------------------------------------------------------- |
| `useSeo` | Hook om de paginatitel, metatags en Open Graph-gegevens declaratief in te stellen. |

### @mission-platform/map

Reactieve verpakking voor MapLibre GL.

| Onderdeel | Beschrijving |
| :-------------- | :---------------------------------------- |
| `<MpMap>` | Hoofdkaartcontainercomponent.             |
| `<MpMapMarker>` | Component voor het plaatsen van markeringen op de kaart. |

### @mission-platform/code-scanner

Cameragebaseerd scannen van streepjescodes en QR-codes.

| Onderdeel | Beschrijving |
| :---------------- | :--------------------------------------------------------------- |
| `<MpCodeScanner>` | Component dat de camerastream initialiseert en scanresultaten verzendt. |

## Integraties

### @mission-platform/rxjs

Overbrugt RxJS-observabelen naar de componentstatus.

| Haak | Beschrijving |
| :-------------- | :-------------------------------------------------------------------------- |
| `useObservable` | Abonneert zich op een waarneembare en retourneert de nieuwste waarde als reactieve status. |

### @mission-platform/d3

Kaderneutrale D3.js-integratie.

| Haak | Beschrijving |
| :------ | :----------------------------------------------------------------- |
| `useD3` | Bindt een D3-selectie aan een componentreferentie met levenscyclusbeheer. |

### @mission-platform/hunspell

Spellingcontrole door WebAssembly.

| Exporteren | Beschrijving |
| :------------- | :------------------------------------------------------ |
| `initHunspell` | Laadt en instantieert de Hunspell WebAssembly-module. |
| `spell` | Controleert of een woord correct is gespeld.                  |
| `suggest` | Geeft spellingsuggesties voor een woord.               |

## Servicebewaking

### Servicemonitor-API

De servicemonitortoepassing biedt zowel openbare als geverifieerde eindpunten voor het bewaken van de servicestatus.

#### Openbare eindpunten

Openbare eindpunten geven slechts minimale statusinformatie weer en vereisen geen authenticatie:

- **`GET /api/services`**: retourneert de opgerolde status voor elke bewaakte service. Het antwoord omvat alleen `{ id, name, type }` voor elke service, plus `now` en `intervalSeconds`. Er worden geen doelconfiguratie, URL's, hosts, queries, headers, drempels of topologie getoond.
- **`GET /api/metrics?service=<id>&since=<ms>`**: retourneert onbewerkte tijdreeksstatistieken voor één service. De parameter `since` wordt begrensd door het geconfigureerde bewaarvenster. Het antwoord omvat alleen `service`, `now`, `since` en `samples`.

#### Geauthenticeerde eindpunten

Voor geverifieerde eindpunten is het `MONITOR_API_TOKEN`-dragertoken vereist en wordt de volledige monitorconfiguratie weergegeven:

- **`POST /api/check`**: Activeer een onmiddellijke sondecyclus.
- **`GET /api/monitors`**: Lijst van alle monitoren met volledige configuratie.
- **`POST /api/monitors`**: maak een nieuwe monitor.
- **`PATCH /api/monitors/<id>`**: update een bestaande monitor.
- **`DELETE /api/monitors/<id>`**: verwijder een monitor en wis de historische tellers.

#### Sonde- en bestemmingsbeleid

Service-monitor dwingt strikte grenzen af voor het gedrag van de tests:

- **Toegestane schema's**: URL-tests zijn standaard ingesteld op `https://` (en poort 443), tenzij de vertrouwde privémodus is ingeschakeld; `http://` is toegestaan ​​in de vertrouwde modus.
- **Toegestane poorten**: URL-tests staan ​​poort 443 toe; gastheersondes maken een basislijn van poorten mogelijk [53, 80, 123, 443, 1883, 8883].
- **Verboden bestemmingen**: privé/link-local adressen (127.0.0.1, ::1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fe80::/10), tenzij expliciet vertrouwd.
- **Verzoek-/antwoordgrenzen**: Probe-aanvragen zijn beperkt tot 64 KB; reacties zijn beperkt tot 256 KB. Snelheidstests zijn beperkt tot 25 MB.
- **Omleidingsbeleid**: omleidingen moeten binnen dezelfde oorsprong en goedgekeurde padvoorvoegsels blijven; cross-origin of niet-toegestane pad-omleidingen worden afgewezen.
- **Geschiedenisbehoud**: de incident-, update- en onderhoudsgeschiedenis wordt begrensd door limieten voor het aantal items (max. 100 items per monitor). De standaardbewaring voor metrische gegevens is 24 uur.

#### Server-side rendering (SSR)

De service-monitor SSR-laag vereist authenticatie voordat de privé-monitorconfiguratie in client-props wordt serialiseerd. Niet-geverifieerde verzoeken krijgen alleen de publieke status DTO.

### Werknemer van e-mailafzender

De medewerker voor e-mailafzenders biedt een showcase voor lokale ontwikkeling voor het weergeven en bezorgen van e-mail.

#### Implementatiemodi

- **Lokale ontwikkeling** (standaard): verzendt naar MailPit op `localhost:1025`. Geen authenticatie vereist.
- **Niet-lokale implementatie**: vereist expliciete `EMAIL_DEPLOYMENT_TOKEN`-dragerautorisatie, `EMAIL_ALLOWED_ORIGINS`-toelatingslijst en `EMAIL_ALLOWED_RECIPIENTS`-toelatingslijst. Snelheidsbeperking via `EMAIL_RATE_LIMITER` wordt afgedwongen.

#### Validatie aanvragen

Alle e-mailverzoeken moeten:

- Gebruik `Content-Type: application/json`.
- Voeg een geldig e-mailadres van de ontvanger toe (veld `to`, maximaal 254 tekens).
- Voeg een naam van de ontvanger toe (`recipientName`, 1–100 tekens).
- Voeg voltooide e-mail-HTML toe (`html`, max. 240 KB).
- Voer HTML-compatibiliteitscontroles uit via `assertCompatibleEmailHtml`.

#### Fail-closed standaardinstellingen

Bij niet-lokale implementaties zonder expliciete configuratie worden alle aanvragen afgewezen. Lokale implementaties blijven onbeperkt voor ontwikkelingsgemak.

## Verificatie van webscriptartefacten

### Identiteit van artefactinhoud

Forge Web Script-artefacten gebruiken een SHA-256-inhoudsidentiteit met versiebeheer in de indeling `sha256-v1:<hex>`. Deze samenvatting wordt berekend over het volledige binaire artefact en wordt opgeslagen in het veld `contentHash` van het artefactmanifest.

#### Integriteit versus authenticiteit

Een inhoudshash **detecteert onbedoelde of ongeautoriseerde inhoudswijzigingen** in vergelijking met een vertrouwde verwachte waarde. Het doet **niet**:

- Authenticeer de producent of de oorsprong van het artefact.
- Vervang cryptografische handtekeningen of toegangscontroles voor implementatie.
- Garandeer dat het artefact veilig kan worden uitgevoerd.

#### Verificatiewerkstroom

1. **Verkrijg de verwachte hash** van een vertrouwde bron (bijvoorbeeld een ondertekend manifest, CI-buildlogboek of beveiligde configuratie).
2. **Bereken de artefact-hash** met behulp van de verifier: `fws_verify_artifact(artifact)` retourneert de `contentHash`.
3. **Vergelijk hashes**: als ze overeenkomen, is het artefact niet per ongeluk of kwaadwillig gewijzigd sinds de verwachte waarde werd vastgelegd.
4. **Verifieer het manifest**: gebruik `fws_inspect_manifest` om de import-, export-, metadata- en beleidsnaleving onafhankelijk van elkaar te controleren.

#### Versiebeheer

Het voorvoegsel `sha256-v1` maakt toekomstige upgrades van het hash-algoritme zonder dubbelzinnigheid mogelijk. Bellers moeten op een correcte manier omgaan met zowel de oude (indien aanwezig) als de huidige samenvattingsformaten.

## Verder lezen

- [Vue 2 naar Vue 3 Migratiehandleiding](migration-guides/vue2-to-vue3.md)
- [Overzicht projectconfiguratie](packages/tooling/configs/index.md)
- [Werkruimtestructuur](workspace-structure.md)

## Volledige werkruimtepakketindex

De volgende index wordt gegenereerd op basis van de pakketmanifesten en wordt hier bewaard, zodat de openbare API-referentie alles omvat
pakket in `packages/`, inclusief de getypte WebAssembly gevels.

### Kern en gebruikersinterface

| Pakket | Doel |
| :----------------------------- | :------------------------------------------------------------ |
| `@mission-platform/forge` | Framework-neutrale JSX-runtime en adapters.                   |
| `@mission-platform/components` | UI-componenten die eenmalig kunnen worden geschreven.                                     |
| `@mission-platform/icons` | Eenmalig beschrijfbare SVG-pictogramcomponenten.                               |
| `@mission-platform/layouts` | Applicatie-, container- en responsieve lay-outcomponenten.     |
| `@mission-platform/forms` | Schemaformulieren en componenten voor de visuele formulierbouwer.              |
| `@mission-platform/forms-core` | Schema-afleiding, validatie en domeinlogica voor formulierbouwer. |
| `@mission-platform/tokens` | Aangepaste CSS-eigenschappen en SCSS-ontwerptokens.                 |

### Composables en integraties

| Pakket | Doel |
| :---------------------------------------------- | :--------------------------------------------------------------- |
| `@mission-platform/breakpoints` | Responsieve breekpuntstatus en zichtbaarheidshelpers.              |
| `@mission-platform/d3` | D3 selectie levenscyclus composable en margehulpprogramma's.          |
| `@mission-platform/i18n` | i18next status- en raamwerkintegratiehelpers.                 |
| `@mission-platform/map` | MapLibre kaartcomponenten en composables.                         |
| `@mission-platform/observers` | Composables voor snijpunten, mutaties en prestatiewaarnemers.    |
| `@mission-platform/phone-number` | Getypte WebAssembly-parsering en opmaak van telefoonnummers.           |
| `@mission-platform/router` | Kaderneutrale routecontracten en compilermogelijkheden.     |
| `@mission-platform/forge-router-web-components` | Web Components-routerdoel en framework-vrije runtime.         |
| `@mission-platform/rxjs` | RxJS waarneembare en abonnementscomposables.                    |
| `@mission-platform/scheduler` | Scheduler UI, herhaling en agenda-indeling domeinlogica.      |
| `@mission-platform/vcard` | RFC 6350 vCard- en RFC 5545 iCalendar-gegevens en componenten.       |
| `@mission-platform/content` | Inhoud AST, bouwers, Monaco, Markdown en WYSIWYG-componenten. |
| `@mission-platform/seo` | Metagegevens, Open Graph en samengestelde gegevens met gestructureerde gegevens.           |
| `@mission-platform/speech-audio` | Spraak-, audio- en web-MIDI-composables.                         |
| `@mission-platform/three` | Three.js canvas en levenscycluscomposables.                       |

### Code- en WebAssembly-pakketten

| Pakket | Doel |
| :------------------------------- | :----------------------------------------------- |
| `@mission-platform/barcode` | 1D-barcode codeert/decodeert gevel en onderdeel.   |
| `@mission-platform/code-scanner` | Component voor het scannen van camera- en beeldcodes.        |
| `@mission-platform/matrix-code` | Data Matrix en Azteekse codeer-/decodeerfaçade.      |
| `@mission-platform/qr-code` | QR codeert/decodeert gevel en component.           |
| `@mission-platform/harper` | Harper grammatica en stijlintegratie voor Monaco. |
| `@mission-platform/hunspell` | Emscripten Hunspell-wrapper voor spellingcontrole.      |

### Smeed compilerdoelen

Deze bevinden zich in `packages/compiler/plugins/` in plaats van `packages/`. Een **framework**-plug-in bepaalt welke runtime een neutraal onderdeel is
wordt verlaagd naar; een **CMS**-doel bepaalt op welk contentplatform het wordt geprojecteerd. De twee assen vormen elkaar, dus elk CMS
target kan aan elke framework-plug-in worden gekoppeld. Zie de [Forge Compiler Pipeline](../../../packages/tooling/vite/forge/docs/locales/nl/reference/compiler.md).

| Pakket | Doel |
| :---------------------------------------------- | :-------------------------------------------------------------------------------- |
| `@mission-platform/forge-plugin-api` | `FrameworkOutputPlugin` contract-, semantische IR-typen en build-adaptertypen.     |
| `@mission-platform/forge-plugin-react` | React uitvoerdoel.                                                              |
| `@mission-platform/forge-plugin-vue` | Vue 3 uitvoerdoel.                                                              |
| `@mission-platform/forge-plugin-solid` | Solid uitvoerdoel.                                                              |
| `@mission-platform/forge-plugin-svelte` | Svelte 5 uitvoerdoel.                                                           |
| `@mission-platform/forge-plugin-web-components` | Uitvoerdoel voor webcomponenten.                                                     |
| `@mission-platform/forge-cms-plugin-api` | `CmsOutputPlugin`-contract, neutraal inhoudsmodel, CMS-stuurprogramma en bouwhulpen. |
| `@mission-platform/forge-cms-storyblok` | Storyblok-componentobjecten, blok-wrappers en `components.json`.                |
| `@mission-platform/forge-cms-astro` | Statische `.astro`-sjablonen en `client:load`-framework-eilanden.                    |
| `@mission-platform/forge-cms-ghost` | Ghost Handlebar-gedeelten en een `config.custom`-themafragment.                   |
| `@mission-platform/forge-cms-jekyll` | Jekyll Liquid bevat het `_data`-schema en een `_config.yml`-fragment.             |
| `@mission-platform/forge-cms-webflow` | Webflow `declareComponent`-codecomponenten en een `webflow.json`-bibliotheekfragment. |

#### @mission-platform/forge-cms-plugin-api

| Exporteren | Typ | Beschrijving |
| :------------------------ | :------- | :------------------------------------------------------------------------------ |
| `analyzeContentComponent` | Functie | Projecteert de rekwisieten van een neutrale component op het platformneutrale inhoudsmodel.   |
| `ContentComponent` | Typ | Bestelde `ContentField`'s, slots en de `interactive`-vlag.                     |
| `ContentFieldKind` | Typ | `text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`. |
| `CmsOutputPlugin` | Typ | Het doelcontract: een gebonden raamwerkplug-in plus de vier emitters.           |
| `defineForgeCmsPlugin` | Functie | Valideert een CMS-doel tijdens de configuratie.                                   |
| `generateCmsArtifacts` | Functie | Het generieke stuurprogramma Discover → IR → Content Model → Emit → Write.                |
| `defineTsdownForgeCms` | Functie | tsdown-configuratie voor één CMS-doel, waarbij `dist/cms/<cms>/<framework>/**` wordt uitgezonden.     |
| `defineTsdownForgeCmsAll` | Functie | tsdown-configuraties voor een lijst met CMS-doelen.                                       |
