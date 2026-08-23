# Paket-API-Verzeichnis

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/api-reference.md: [docs/api-reference.md](../../api-reference.md)
> Sprache: Deutsch (de)

Diese projektweite Seite ist ein Verzeichnis der Paketfunktionen und -kompatibilität
Verträge. Die kanonische Installation, Nutzung, Einschränkungen und API-Details für
Jedes Paket befindet sich neben dem Paket darunter `packages/*/docs/`, `configs/*/docs/`,
Und `forge-plugins/*/docs/`. Generierte API-Referenzen müssen dem Besitz hinzugefügt werden
Paket statt dieser Seite.

> **Importe sind immer leer.** Framework-Versand `@mission-platform/*` Pakete machen ein einzelnes verfügbar `.`
> Eingang bewacht von der `mp:vue`, `mp:react`, `mp:solid`, Und `mp:web-component` exportieren
> Bedingungen. Wählen Sie das Framework **einmal** aus – über `resolve.conditions` (sehen `defineFrameworkAppConfig` /
> `frameworkResolveConditions` aus `@mission-platform/vite-config`) Und `customConditions` (über die
> `@mission-platform/typescript-config/framework-<name>` Presets) – dann importieren Sie alles mit dem bloßen
> Paketspezifizierer. Sehen [Externe Verbrauchereinrichtung](external-consumer-setup.md).

## Kern-Framework

### @mission-platform/forge

Die Grundlage der „Write-Once“-Architektur, die eine Framework-neutrale JSX-Laufzeit und Hooks bereitstellt.

| Exportieren | Geben Sie | ein Beschreibung |
|:-------------------|:---------|:----------------------------------------------------------------------------------------|
| `h`, `Fragment`    | Funktion | JSX-Factory und Fragment zum Erstellen von Komponenten.                                      |
| `useState`         | Haken | Framework-neutraler Zustands-Hook.                                                           |
| `useEffect`        | Haken | Gerüstneutraler Effekthaken.                                                          |
| `useMemo`          | Haken | Framework-neutraler Memoisierungs-Hook.                                                     |
| `useRef`           | Haken | Frameworkneutraler Referenz-Hook.                                                       |
| `useContext`       | Haken | Framework-neutraler Kontext-Hook.                                                         |
| `toVueComponent`   | Adapter | Konvertiert eine Forge-Komponente in eine Vue 3-Komponenten (von `@mission-platform/forge/vue`).   |
| `toReactComponent` | Adapter | Konvertiert eine Forge-Komponente in eine React Komponente (von `@mission-platform/forge/react`). |

### @mission-platform/vite-plugin-forge

Der Compiler-Treiber akzeptiert explizite `FrameworkOutputPlugin` Instanzen; das tut es
keine Framework-Registrierung bereitstellen. `defineViteForgeComponents` Und
`defineTsdownForgeComponents` (sowie der Hook und die CMS-Helfer) teilen sich einen In-Process
`ForgeCompilerService` für eine Build- oder Watch-Sitzung.

| Fähigkeit | Beschreibung |
|:-----------|:------------|
| Service-Lebenszyklus | Verwenden Sie den Status von Quelle, Diagramm, analysierter Quelle, semantischer IR und Zielartefakt über Builds hinweg wieder. Bereitstellung von One-Shot-Diensten nach Fertigstellung und Beobachterdiensten bei Abschluss. |
| Cache-Schlüssel | Quell-/Abhängigkeits-/Konfigurations-Fingerabdrücke, Compiler- und Router-Optionen, `tsconfig` `baseUrl`/`paths`, Ziel-ID, Plugin-Identität/-Version und relevante Bedingungen. |
| Ungültigmachung ansehen | Geänderte Dateien machen Reverse-Graph-Abhängige ungültig, einschließlich transitiver Komponenten- und Hook-Einträge; Nicht verwandte Ziel-Snapshots bleiben wiederverwendbar. |
| Diagnose/Bericht | Meldet Phasenzeit, Cache-Hit/Miss-Zähler, betroffene Dateien, Warnungen, Fehler und ausgegebene Artefakte. Fehler blockieren die Werbung. |
| Artefaktmanifest | Listet zielbezogene Einträge, Module, Deklarationen, Quellzuordnungen, Assets und Prüfsummen vor der atomaren Heraufstufung auf. |
| Erweiterungspunkt | Implementieren und übergeben Sie a `FrameworkOutputPlugin` von einem Anrufer im Besitz `forge-plugin-*` Paket; Fügen Sie dem neutralen Treiber keine Zielzweige hinzu. |

Konfigurieren Sie Aliase über das Projekt `tsconfig.json` (`baseUrl` Und
`paths`); Vite und die tsdown-Grafikvorbereitung verwenden dieselben Alias-Fakten. Router
Auswahl, Router-Plugins und Bedingungen werden über Komponente und weitergeleitet
Hakenhelfer. Ein zukünftiger Worker/Daemon kann hinter dem Servicevertrag stehen, aber
Die unterstützte Implementierung befindet sich derzeit in Bearbeitung.

### @mission-platform/router

Framework-neutrale Routenverträge, reine Matching-Helfer und Compiler-Marker für
Gemeinsame Pakete. Anwendungen besitzen Routendatensätze und native Router-Instanzen; die
Das von der Anwendung ausgewählte Forge-Router-Ziel stellt die Laufzeitfunktionen bereit.

| Export / Paket | Geben Sie | ein Beschreibung |
|:-----------------|:-----|:------------|
| `MpRoute`, `MpRouteLocationRaw`, `MpResolvedLocation` | Typen | Routendatensätze, Parameter, Abfrage-/Hash-Status, Metadaten und Navigationsziele. |
| `defineRoutes`, `matchRoutes`, `resolveLocation` | Funktionen | Definieren Sie Routenbäume und lösen Sie Pfade ohne DOM oder Framework-Laufzeit auf. |
| `MpNavigationResult`, `MpRouteGuard`, `MpHistory`, `MpRouterAdapter` | Typen | Navigationsergebnisse/-ereignisse, Wachen, steckbarer Verlauf und Adapterverträge. |
| `MpLink`, `useMpRoute`, `useMpRouter`, `useMpNavigation`, `MpRouterView` | Compiler-Marker | Neutrale Link-, Routenstatus-, Navigations-, Auflösungs- und Outlet-Funktionen, die von gemeinsam genutzten Paketen genutzt werden. |
| `@mission-platform/forge-router-*` | Schmiedeziele | Unabhängig ausgewählte native Router-Ziele für Vue Router, React Router, SolidJS-Router, SvelteKit, RedwoodSDK und Webkomponenten. |

Laufzeitpakete besitzen einen eigenen Verlauf und einen reaktiven Status. Das neutrale Paket importiert niemals ein UI-Framework. Für Webkomponenten:
Registrieren Sie die Elemente einmal und übergeben Sie komplexe Ziele über DOM-Eigenschaften statt über serialisierte Attribute:

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

| Exportieren | Beschreibung |
|:--------------|:--------------------------------------------------------------------------|
| `tokens`      | JS/TS-Objekt, das alle Design-Tokens enthält (z. B. `tokens.color.primary`). |
| `tokens.scss` | SCSS-Variablen zur Verwendung in Stylesheets.                                    |

### @mission-platform/breakpoints

Reaktionsfähige Dienstprogramme und Sichtbarkeitskomponenten.

| Exportieren | Geben Sie | ein Beschreibung |
|:-----------------|:----------|:-----------------------------------------------------------|
| `useBreakpoints` | Haken | Gibt den reaktiven Haltepunktstatus zurück.                        |
| `ShowIf`         | Komponente | Rendert untergeordnete Elemente nur, wenn eine Haltepunktbedingung zutrifft. |
| `HideIf`         | Komponente | Versteckt untergeordnete Elemente, wenn eine Haltepunktbedingung übereinstimmt.        |

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

| Exportieren | Beschreibung |
|:------------------|:----------------------------------------------------------|
| `createForgeI18N` | Initialisiert die i18n-Instanz mit Plattformstandards.     |
| `useI18n`         | Hook für Übersetzungen und Gebietsschemaumschaltung in Komponenten. |

### @mission-platform/seo

Meta-Tag- und SEO-Management.

| Exportieren | Beschreibung |
|:---------|:----------------------------------------------------------------------|
| `useSeo` | Hook zum deklarativen Festlegen von Seitentiteln, Meta-Tags und Open Graph-Daten. |

### @mission-platform/map

Reaktiver Wrapper für MapLibre GL.

| Komponente | Beschreibung |
|:----------------|:------------------------------------------|
| `<MpMap>`       | Hauptkomponente des Kartencontainers.             |
| `<MpMapMarker>` | Komponente zum Platzieren von Markierungen auf der Karte. |

### @mission-platform/code-scanner

Kamerabasiertes Scannen von Barcodes und QR-Codes.

| Komponente | Beschreibung |
|:------------------|:-----------------------------------------------------------------|
| `<MpCodeScanner>` | Komponente, die den Kamerastream initialisiert und Scanergebnisse ausgibt. |

## Integrationen

### @mission-platform/rxjs

Überbindet RxJS-Observables mit dem Komponentenstatus.

| Haken | Beschreibung |
|:----------------|:----------------------------------------------------------------------------|
| `useObservable` | Abonniert ein Observable und gibt seinen neuesten Wert als reaktiven Zustand zurück. |

### @mission-platform/d3

Frameworkneutrale D3.js-Integration.

| Haken | Beschreibung |
|:--------|:-------------------------------------------------------------------|
| `useD3` | Bindet eine D3-Auswahl an eine Komponentenreferenz mit Lebenszyklusverwaltung. |

### @mission-platform/hunspell

WebAssembly-basierte Rechtschreibprüfung.

| Exportieren | Beschreibung |
|:---------------|:--------------------------------------------------------|
| `initHunspell` | Lädt und instanziiert das Hunspell WebAssembly-Modul. |
| `spell`        | Überprüft, ob ein Wort richtig geschrieben ist.                  |
| `suggest`      | Bietet Rechtschreibvorschläge für ein Wort.               |

## Weiterführende Literatur

- [Vue 2 bis Vue 3 Migrationsleitfaden](migration-guides/vue2-to-vue3.md)
- [Übersicht über die Projektkonfiguration](configs/index.md)
- [Arbeitsbereichsstruktur](workspace-structure.md)

## Vollständiger Workspace-Paketindex

Der folgende Index wird aus den Paketmanifesten generiert und hier aufbewahrt, sodass die öffentliche API-Referenz alle abdeckt
einpacken `packages/`, einschließlich der typisierten WebAssembly-Fassaden.

### Kern und Benutzeroberfläche

| Paket | Zweck |
|:-------------------------------|:--------------------------------------------------------------|
| `@mission-platform/forge`      | Frameworkneutrale JSX-Laufzeit und -Adapter.                   |
| `@mission-platform/components` | Einmal beschreibbare UI-Komponenten.                                     |
| `@mission-platform/icons`      | Einmal beschreibbare SVG-Symbolkomponenten.                               |
| `@mission-platform/layouts`    | Anwendungs-, Container- und responsive Layoutkomponenten.     |
| `@mission-platform/forms`      | Schemaformulare und visuelle Formularerstellungskomponenten.              |
| `@mission-platform/forms-core` | Schemaableitung, Validierung und Form-Builder-Domänenlogik. |
| `@mission-platform/tokens`     | Benutzerdefinierte CSS-Eigenschaften und SCSS-Design-Tokens.                 |

### Composables und Integrationen

| Paket | Zweck |
|:-----------------------------------|:--------------------------------------------------------------|
| `@mission-platform/breakpoints`    | Reaktionsfähige Haltepunktstatus- und Sichtbarkeitshelfer.           |
| `@mission-platform/d3`             | Zusammensetzbare und Margin-Dienstprogramme für den D3-Auswahllebenszyklus.       |
| `@mission-platform/i18n`           | i18next-Status- und Framework-Integrationshelfer.              |
| `@mission-platform/map`            | MapLibre-Kartenkomponenten und Composables.                      |
| `@mission-platform/observers`      | Zusammensetzbare Schnitt-, Mutations- und Leistungsbeobachter-Elemente. |
| `@mission-platform/phone-number`   | Typisiertes Parsen und Formatieren von WebAssembly-Telefonnummern.        |
| `@mission-platform/router`         | Frameworkneutrale Routenverträge und Compilerfunktionen. |
| `@mission-platform/forge-router-web-components` | Web Components-Router-Ziel und Framework-freie Laufzeit. |
| `@mission-platform/rxjs`           | RxJS-Observables und Abonnement-Composables.                 |
| `@mission-platform/scheduler`     | Planer-Benutzeroberfläche, Wiederholung und Kalenderlayoutdomänenlogik. |
| `@mission-platform/vcard`         | RFC 6350 vCard- und RFC 5545 iCalendar-Daten und -Komponenten.  |
| `@mission-platform/content`       | Inhalt AST, Builder, Monaco, Markdown und WYSIWYG-Komponenten. |
| `@mission-platform/seo`            | Metadaten, Open Graph und Composables mit strukturierten Daten.        |
| `@mission-platform/speech-audio`   | Sprach-, Audio- und Web-MIDI-Composables.                      |
| `@mission-platform/three`          | Three.js Canvas und Lifecycle Composables.                    |

### Code- und WebAssembly-Pakete

| Paket | Zweck |
|:--------------------------------------------|:--------------------------------------------------|
| `@mission-platform/barcode`                 | 1D-Barcode kodiert/dekodiert Fassade und Bauteil.    |
| `@mission-platform/code-scanner`            | Kamera- und Bildcode-Scankomponente.         |
| `@mission-platform/matrix-code`             | Data Matrix und Aztec kodieren/dekodieren Fassade.       |
| `@mission-platform/qr-code`                 | QR-Kodierung/Dekodierung von Fassade und Bauteil.            |
| `@mission-platform/harper`                  | Harper-Grammatik- und Stilintegration für Monaco.  |
| `@mission-platform/hunspell`                | Emscripten Hunspell-Rechtschreibprüfungs-Wrapper.       |

### Forge-Compiler-Ziele

Diese leben darin `forge-plugins/` statt `packages/`. Ein **Framework**-Plugin entscheidet, welche Laufzeit eine neutrale Komponente ist
wird abgesenkt auf; Ein **CMS**-Ziel entscheidet, auf welche Content-Plattform es projiziert wird. Die beiden Achsen bilden also jedes CMS
Das Ziel kann an ein beliebiges Framework-Plugin gebunden werden. Siehe die [Forge-Compiler-Pipeline](../../../vite-plugins/forge/docs/locales/de/reference/compiler.md).

| Paket | Zweck |
|:-------------------------------------------------|:--------------------------------------------------------------------------------|
| `@mission-platform/forge-plugin-api`             | `FrameworkOutputPlugin` Vertrag, semantische IR-Typen und Build-Adaptertypen.   |
| `@mission-platform/forge-plugin-react`           | React Ausgabeziel.                                                            |
| `@mission-platform/forge-plugin-vue`             | Vue 3 Ausgabeziel.                                                            |
| `@mission-platform/forge-plugin-solid`           | Solid Ausgabeziel.                                                            |
| `@mission-platform/forge-plugin-svelte`          | Svelte 5 Ausgabeziel.                                                         |
| `@mission-platform/forge-plugin-web-components`  | Ausgabeziel der Webkomponenten.                                                   |
| `@mission-platform/forge-cms-plugin-api`         | `CmsOutputPlugin` Vertrag, neutrales Inhaltsmodell, CMS-Treiber und Build-Helfer. |
| `@mission-platform/forge-cms-storyblok`          | Storyblok-Komponentenobjekte, Block-Wrapper und `components.json`.              |
| `@mission-platform/forge-cms-astro`              | Statisch `.astro` Vorlagen und `client:load` Rahmeninseln.                  |
| `@mission-platform/forge-cms-ghost`              | Ghost-Lenker-Teile und ein `config.custom` Themenfragment.                 |
| `@mission-platform/forge-cms-jekyll`             | Jekyll Liquid beinhaltet: `_data` Schema und a `_config.yml` Fragment.           |
| `@mission-platform/forge-cms-webflow`            | Webflow `declareComponent` Codekomponenten und a `webflow.json` Bibliotheksfragment. |

#### @mission-platform/forge-cms-plugin-api

| Exportieren | Geben Sie | ein Beschreibung |
|:---------------------------|:---------|:--------------------------------------------------------------------------------|
| `analyzeContentComponent`  | Funktion | Projiziert die Requisiten einer neutralen Komponente auf das plattformneutrale Inhaltsmodell.  |
| `ContentComponent`         | Geben Sie | ein Bestellt `ContentField`s, Slots und die `interactive` Flagge.                    |
| `ContentFieldKind`         | Geben Sie | ein `text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`. |
| `CmsOutputPlugin`          | Geben Sie | ein Der Zielvertrag: ein gebundenes Framework-Plugin plus die vier Emitter.          |
| `defineForgeCmsPlugin`     | Funktion | Validiert ein CMS-Ziel zum Zeitpunkt der Konfiguration.                                  |
| `generateCmsArtifacts`     | Funktion | Der generische Discover → IR → Content Model → Emit → Write-Treiber.               |
| `defineTsdownForgeCms`     | Funktion | tsdown-Konfiguration für ein CMS-Ziel, Ausgabe `dist/cms/<cms>/<framework>/**`.    |
| `defineTsdownForgeCmsAll`  | Funktion | tsdown configs für eine Liste von CMS-Zielen.                                      |
