# API-Referenz

Technische Referenz für die Mission Platform-Kernpakete und Framework-Adapter.

> **Importe sind immer leer.** Framework-Versand `@mission-platform/*` Pakete machen ein einzelnes verfügbar `.`
> Eingang bewacht von der `mp:vue`, `mp:react`, `mp:solid`, Und `mp:web-component` exportieren
> Bedingungen. Wählen Sie das Framework **einmal** aus – über `resolve.conditions` (sehen `defineFrameworkAppConfig` /
> `frameworkResolveConditions` aus `@mission-platform/vite-config`) Und `customConditions` (über die
> `@mission-platform/typescript-config/framework-<name>` Presets) – dann importieren Sie alles mit dem bloßen
> Paketspezifizierer. Sehen [Externe Verbrauchereinrichtung](external-consumer-setup.md).

## Kern-Framework

### @mission-platform/forge

Die Grundlage der „Write-Once“-Architektur, die eine Framework-neutrale JSX-Laufzeit und Hooks bereitstellt.

| Exportieren        | Type     | ein Beschreibung                                                                                                                     |
| :----------------- | :------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| `h`, `Fragment`    | Funktion | JSX-Factory und Fragment zum Erstellen von Komponenten.                                                              |
| `useState`         | Haken    | Framework-neutraler Zustands-Hook.                                                                                   |
| `useEffect`        | Haken    | Gerüstneutraler Effekthaken.                                                                                         |
| `useMemo`          | Haken    | Framework-neutraler Memoisierungs-Hook.                                                                              |
| `useRef`           | Haken    | Frameworkneutraler Referenz-Hook.                                                                                    |
| `useContext`       | Haken    | Framework-neutraler Kontext-Hook.                                                                                    |
| `toVueComponent`   | Adapter  | Konvertiert eine Forge-Komponente in eine Vue 3-Komponenten (von `@mission-platform/forge/vue`).  |
| `toReactComponent` | Adapter  | Konvertiert eine Forge-Komponente in eine React Komponente (von `@mission-platform/forge/react`). |

### @mission-platform/vite-plugin-forge

The compiler driver accepts explicit `FrameworkOutputPlugin` instances; it does
not provide a framework registry. `defineViteForgeComponents` and
`defineTsdownForgeComponents` (plus the hook and CMS helpers) share an in-process
`ForgeCompilerService` for one build or watch session.

| Capability         | Beschreibung                                                                                                                                                                        |
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

| Exportieren                                                          | Type             | Beschreibung                                                                                                                                          |
| :------------------------------------------------------------------- | :--------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MpRoute`                                                            | Types            | Route records, params, query/hash state, metadata, and navigation targets.                                                            |
| `defineRoutes`                                                       | Funktion         | Define route trees and resolve paths without a DOM or framework runtime.                                                              |
| `MpNavigationResult`, `MpRouteGuard`, `MpHistory`, `MpRouterAdapter` | Types            | Navigation outcomes/events, guards, pluggable history, and adapter contracts.                                                         |
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

## Benutzeroberfläche und Design

### @mission-platform/tokens

Zentralisierte Design-Tokens für Farben, Typografie und Abstände.

| Exportieren   | Beschreibung                                                                                                                                    |
| :------------ | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokens`      | JS/TS-Objekt, das alle Design-Tokens enthält (z. B. `tokens.color.primary`). |
| `tokens.scss` | SCSS-Variablen zur Verwendung in Stylesheets.                                                                                   |

### @mission-platform/breakpoints

Reaktionsfähige Dienstprogramme und Sichtbarkeitskomponenten.

| Exportieren      | Type       | Beschreibung                                                               |
| :--------------- | :--------- | :------------------------------------------------------------------------- |
| `useBreakpoints` | Haken      | Gibt den reaktiven Haltepunktstatus zurück.                |
| `ShowIf`         | Komponente | Renders children only when a breakpoint condition matches. |
| `HideIf`         | Komponente | Hides children when a breakpoint condition matches.        |

### @mission-platform/components

Gemeinsam genutzte UI-Komponenten, die einmal erstellt wurden und für mehrere Frameworks verfügbar sind.

- **Importieren**: immer `@mission-platform/components`; der Aktive `mp:<framework>` Bedingung entscheidet darüber, ob Sie das bekommen
  Vue 3, React, Solidoder Webkomponenten-Build.
- **Unterpfade pro Komponente**: `@mission-platform/components/<path>` (e.g.
  `@mission-platform/components/atoms/forge-badge/forge-badge`) ist auch zustandsbewusst und lädt nur diese Komponenten
  Brocken.
- **Komponenten**: `ForgeButton`, `ForgeInput`, `ForgeModal`, und mehr.

## Funktionspakete

### @mission-platform/i18n

Internationalisierungssystem basierend auf i18next.

| Exportieren       | Beschreibung                                                                        |
| :---------------- | :---------------------------------------------------------------------------------- |
| `createForgeI18N` | Initialisiert die i18n-Instanz mit Plattformstandards.              |
| `useI18n`         | Hook für Übersetzungen und Gebietsschemaumschaltung in Komponenten. |

### @mission-platform/seo

Meta-Tag- und SEO-Management.

| Exportieren | Beschreibung                                                                                      |
| :---------- | :------------------------------------------------------------------------------------------------ |
| `useSeo`    | Hook zum deklarativen Festlegen von Seitentiteln, Meta-Tags und Open Graph-Daten. |

### @mission-platform/map

Reaktiver Wrapper für MapLibre GL.

| Komponente      | Geben Sie                                                                 |
| :-------------- | :------------------------------------------------------------------------ |
| `<MpMap>`       | Hauptkomponente des Kartencontainers.                     |
| `<MpMapMarker>` | Komponente zum Platzieren von Markierungen auf der Karte. |

### @mission-platform/code-scanner

Kamerabasiertes Scannen von Barcodes und QR-Codes.

| Komponente        | Beschreibung                                                                               |
| :---------------- | :----------------------------------------------------------------------------------------- |
| `<MpCodeScanner>` | Komponente, die den Kamerastream initialisiert und Scanergebnisse ausgibt. |

## Integrationen

### @mission-platform/rxjs

Überbindet RxJS-Observables mit dem Komponentenstatus.

| Haken           | ein Beschreibung                                                                                     |
| :-------------- | :--------------------------------------------------------------------------------------------------- |
| `useObservable` | Abonniert ein Observable und gibt seinen neuesten Wert als reaktiven Zustand zurück. |

### @mission-platform/d3

Frameworkneutrale D3.js-Integration.

| Haken   | ein Beschreibung                                                                               |
| :------ | :--------------------------------------------------------------------------------------------- |
| `useD3` | Bindet eine D3-Auswahl an eine Komponentenreferenz mit Lebenszyklusverwaltung. |

### @mission-platform/hunspell

WebAssembly-basierte Rechtschreibprüfung.

| Exportieren    | ein Beschreibung                                                      |
| :------------- | :-------------------------------------------------------------------- |
| `initHunspell` | Lädt und instanziiert das Hunspell WebAssembly-Modul. |
| `spell`        | Überprüft, ob ein Wort richtig geschrieben ist.       |
| `suggest`      | Bietet Rechtschreibvorschläge für ein Wort.           |

## Weiterführende Literatur

- [Vue 2 bis Vue 3 Migrationsleitfaden](migration-guides/vue2-to-vue3.md)
- [Übersicht über die Projektkonfiguration](configs/index.md)
- [Arbeitsbereichsstruktur](workspace-structure.md)

## Vollständiger Workspace-Paketindex

Der folgende Index wird aus den Paketmanifesten generiert und hier aufbewahrt, sodass die öffentliche API-Referenz alle abdeckt
einpacken `packages/`, einschließlich der typisierten WebAssembly-Fassaden.

### Kern und Benutzeroberfläche

| Paket                          | Zweck                                                                        |
| :----------------------------- | :--------------------------------------------------------------------------- |
| `@mission-platform/forge`      | Frameworkneutrale JSX-Laufzeit und -Adapter.                 |
| `@mission-platform/components` | Einmal beschreibbare UI-Komponenten.                         |
| `@mission-platform/icons`      | Einmal beschreibbare SVG-Symbolkomponenten.                  |
| `@mission-platform/layouts`    | Anwendungs-, Container- und responsive Layoutkomponenten.    |
| `@mission-platform/forms`      | Schemaformulare und visuelle Formularerstellungskomponenten. |
| `@mission-platform/forms-core` | Schemaableitung, Validierung und Form-Builder-Domänenlogik.  |
| `@mission-platform/tokens`     | Benutzerdefinierte CSS-Eigenschaften und SCSS-Design-Tokens. |

### Composables und Integrationen

| Paket                                           | Zweck                                                                                       |
| :---------------------------------------------- | :------------------------------------------------------------------------------------------ |
| `@mission-platform/breakpoints`                 | Reaktionsfähige Haltepunktstatus- und Sichtbarkeitshelfer.                  |
| `@mission-platform/d3`                          | Zusammensetzbare und Margin-Dienstprogramme für den D3-Auswahllebenszyklus. |
| `@mission-platform/i18n`                        | i18next-Status- und Framework-Integrationshelfer.                           |
| `@mission-platform/map`                         | MapLibre-Kartenkomponenten und Composables.                                 |
| `@mission-platform/observers`                   | Zusammensetzbare Schnitt-, Mutations- und Leistungsbeobachter-Elemente.     |
| `@mission-platform/phone-number`                | Typisierte WebAssembly-Telefonnummernanalyse und -formatierung.             |
| `@mission-platform/router`                      | Frameworkneutrale Routing-Grundelemente und -Adapter.                       |
| `@mission-platform/forge-router-web-components` | Web Components router target and framework-free runtime.                    |
| `@mission-platform/rxjs`                        | RxJS-Observables und Abonnement-Composables.                                |
| `@mission-platform/scheduler`                   | Planer-Benutzeroberfläche, Wiederholung und Kalenderlayoutdomänenlogik.     |
| `@mission-platform/vcard`                       | RFC 6350 vCard- und RFC 5545 iCalendar-Daten und -Komponenten.              |
| `@mission-platform/content`                     | Inhalt AST, Builder, Monaco, Markdown und WYSIWYG-Komponenten.              |
| `@mission-platform/seo`                         | Metadaten, Open Graph und Composables mit strukturierten Daten.             |
| `@mission-platform/speech-audio`                | Sprach-, Audio- und Web-MIDI-Composables.                                   |
| `@mission-platform/three`                       | Three.js Canvas und Lifecycle Composables.                  |

### Code- und WebAssembly-Pakete

| Paket                              | Zweck                                                              |
| :--------------------------------- | :----------------------------------------------------------------- |
| `@mission-platform/barcode`        | 1D-Barcode kodiert/dekodiert Fassade und Bauteil.  |
| `@mission-platform/code-scan-wasm` | Generiertes Bildscanner-WebAssembly-Modul.         |
| `@mission-platform/code-scanner`   | Kamera- und Bildcode-Scankomponente.               |
| `@mission-platform/matrix-code`    | Data Matrix und Aztec kodieren/dekodieren Fassade. |
| `@mission-platform/qr-code`        | QR-Kodierung/Dekodierung von Fassade und Bauteil.  |
| `@mission-platform/harper`         | Harper-Grammatik- und Stilintegration für Monaco.  |
| `@mission-platform/hunspell`       | Emscripten Hunspell-Rechtschreibprüfungs-Wrapper.  |

### Forge compiler targets

Diese leben darin `forge-plugins/` statt `packages/`. Ein **Framework**-Plugin entscheidet, welche Laufzeit eine neutrale Komponente ist
wird abgesenkt auf; Ein **CMS**-Ziel entscheidet, auf welche Content-Plattform es projiziert wird. Die beiden Achsen bilden zusammen, also jedes CMS
Das Ziel kann an ein beliebiges Framework-Plugin gebunden werden. Sehen [Forge-Compiler-Pipeline](forge-compiler.md).

| Paket                                           | Zweck                                                                                                  |
| :---------------------------------------------- | :----------------------------------------------------------------------------------------------------- |
| `@mission-platform/forge-plugin-api`            | `FrameworkOutputPlugin` Vertrag, semantische IR-Typen und Build-Adaptertypen.          |
| `@mission-platform/forge-plugin-react`          | React Ausgabeziel.                                                                     |
| `@mission-platform/forge-plugin-vue`            | Vue 3 Ausgabeziel.                                                                     |
| `@mission-platform/forge-plugin-solid`          | Solid Ausgabeziel.                                                                     |
| `@mission-platform/forge-plugin-svelte`         | Svelte 5 Ausgabeziel.                                                                  |
| `@mission-platform/forge-plugin-web-components` | Ausgabeziel der Webkomponenten.                                                        |
| `@mission-platform/forge-cms-plugin-api`        | `CmsOutputPlugin` Vertrag, neutrales Inhaltsmodell, CMS-Treiber und Build-Helfer.      |
| `@mission-platform/forge-cms-storyblok`         | Storyblok-Komponentenobjekte, Block-Wrapper und `components.json`.                     |
| `@mission-platform/forge-cms-astro`             | Statisch `.astro` Vorlagen und `client:load` Rahmeninseln.                             |
| `@mission-platform/forge-cms-ghost`             | Ghost-Lenker-Teile und ein `config.custom` Themenfragment.                             |
| `@mission-platform/forge-cms-jekyll`            | Jekyll Liquid beinhaltet: `_data` Schema und a `_config.yml` Fragment. |
| `@mission-platform/forge-cms-webflow`           | Webflow `declareComponent` Codekomponenten und a `webflow.json` Bibliotheksfragment.   |

#### @mission-platform/forge-cms-plugin-api

| Exportieren               | Type     | Beschreibung                                                                                                  |
| :------------------------ | :------- | :------------------------------------------------------------------------------------------------------------ |
| `analyzeContentComponent` | Funktion | Projiziert die Requisiten einer neutralen Komponente auf das plattformneutrale Inhaltsmodell. |
| `ContentComponent`        | Type     | ein Bestellt `ContentField`s, Slots und die `interactive` Flagge.                             |
| `ContentFieldKind`        | Type     | ein `text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`.           |
| `CmsOutputPlugin`         | Type     | ein Der Zielvertrag: ein gebundenes Framework-Plugin plus die vier Emitter.   |
| `defineForgeCmsPlugin`    | Funktion | Validiert ein CMS-Ziel zum Zeitpunkt der Konfiguration.                                       |
| `generateCmsArtifacts`    | Funktion | Der generische Discover → IR → Content Model → Emit → Write-Treiber.                          |
| `defineTsdownForgeCms`    | Funktion | tsdown-Konfiguration für ein CMS-Ziel, Ausgabe `dist/cms/<cms>/<framework>/**`.               |
| `defineTsdownForgeCmsAll` | Funktion | tsdown configs für eine Liste von CMS-Zielen.                                                 |
