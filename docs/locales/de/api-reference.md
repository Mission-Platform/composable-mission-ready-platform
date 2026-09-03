# Paket-API-Verzeichnis

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/api-reference.md: [docs/api-reference.md](../../api-reference.md)
> Sprache: Deutsch (de)

Diese projektweite Seite ist ein Verzeichnis der Paketfunktionen und -kompatibilität
Verträge. Die kanonische Installation, Nutzung, Einschränkungen und API-Details für
Jedes Paket befindet sich neben diesem Paket unter `packages/**/docs/`, ` `,
und ` `. Generierte API-Referenzen müssen dem Besitz hinzugefügt werden
Paket statt dieser Seite.

> **Importe sind immer leer.** Framework-versandende `@mission-platform/*`-Pakete legen ein einzelnes `.` offen
> Eintrag, der durch den Export `mp:vue`, `mp:react`, `mp:solid` und `mp:web-component` geschützt wird
> Bedingungen. Wählen Sie das Framework **einmal** aus – über `resolve.conditions` (siehe `defineFrameworkAppConfig` /
> `frameworkResolveConditions` von `@mission-platform/vite-config`) und `customConditions` (über die
> `@mission-platform/typescript-config/framework-<name>`-Voreinstellungen) – dann importieren Sie alles mit dem bloßen
> Paketspezifizierer. Siehe [External Consumer Setup](external-consumer-setup.md).

## Kern-Framework

### @mission-platform/forge

Die Grundlage der „Write-Once“-Architektur, die eine Framework-neutrale JSX-Laufzeit und Hooks bereitstellt.

| Exportieren | Geben Sie | ein Beschreibung |
| :----------------- | :------- | :-------------------------------------------------------------------------------------- |
| `h`, `Fragment` | Funktion | JSX-Factory und Fragment zum Erstellen von Komponenten.                                      |
| `useState` | Haken | Framework-neutraler Zustands-Hook.                                                           |
| `useEffect` | Haken | Gerüstneutraler Effekthaken.                                                          |
| `useMemo` | Haken | Framework-neutraler Memoisierungs-Hook.                                                     |
| `useRef` | Haken | Framework-neutraler Referenz-Hook.                                                       |
| `useContext` | Haken | Framework-neutraler Kontext-Hook.                                                         |
| `toVueComponent` | Adapter | Konvertiert eine Forge-Komponente in eine Vue 3-Komponente (von `@mission-platform/forge/vue`).   |
| `toReactComponent` | Adapter | Konvertiert eine Forge-Komponente in eine React-Komponente (von `@mission-platform/forge/react`). |

### @mission-platform/vite-plugin-forge

Der Compilertreiber akzeptiert explizite `FrameworkOutputPlugin`-Instanzen; das tut es
keine Framework-Registrierung bereitstellen. `defineViteForgeComponents` und
`defineTsdownForgeComponents` (sowie der Hook und die CMS-Helfer) teilen sich einen In-Process
`ForgeCompilerService` für eine Build- oder Überwachungssitzung.

| Fähigkeit | Beschreibung |
| :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Service-Lebenszyklus | Verwenden Sie den Status von Quelle, Diagramm, analysierter Quelle, semantischer IR und Zielartefakt über Builds hinweg wieder. Bereitstellung von One-Shot-Diensten nach Fertigstellung und Beobachterdiensten bei Abschluss. |
| Cache-Schlüssel | Quell-/Abhängigkeits-/Konfigurations-Fingerabdrücke, Compiler- und Router-Optionen, `tsconfig` `baseUrl`/`paths`, Ziel-ID, Plugin-Identität/-Version und relevante Bedingungen.      |
| Ungültigmachung ansehen | Geänderte Dateien machen Reverse-Graph-Abhängige ungültig, einschließlich transitiver Komponenten- und Hook-Einträge; Nicht verwandte Ziel-Snapshots bleiben wiederverwendbar.                     |
| Diagnose/Bericht | Meldet Phasenzeit, Cache-Hit/Miss-Zähler, betroffene Dateien, Warnungen, Fehler und ausgegebene Artefakte. Fehler blockieren die Werbung.                                 |
| Artefaktmanifest | Listet zielbezogene Einträge, Module, Deklarationen, Quellzuordnungen, Assets und Prüfsummen vor der atomaren Heraufstufung auf.                                                     |
| Erweiterungspunkt | Implementieren und übergeben Sie ein `FrameworkOutputPlugin` aus einem `forge-plugin-*`-Paket, das dem Anrufer gehört; Fügen Sie dem neutralen Treiber keine Zielzweige hinzu.                        |

Konfigurieren Sie Aliase über das Projekt `tsconfig.json` (`baseUrl` und
`paths`); Vite und die tsdown-Diagrammvorbereitung verwenden dieselben Alias-Fakten. Router
Auswahl, Router-Plugins und Bedingungen werden über Komponente und weitergeleitet
Hakenhelfer. Ein zukünftiger Worker/Daemon sitzt möglicherweise hinter dem Servicevertrag, aber
Die unterstützte Implementierung befindet sich derzeit in Bearbeitung.

### @mission-platform/router

Framework-neutrale Routenverträge, reine Matching-Helfer und Compiler-Marker für
Gemeinsame Pakete. Anwendungen besitzen Routendatensätze und native Router-Instanzen; die
Das von der Anwendung ausgewählte Forge-Router-Ziel stellt die Laufzeitfunktionen bereit.

| Export / Paket | Geben Sie | ein Beschreibung |
| :----------------------------------------------------------------------- | :--------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| `MpRoute`, `MpRouteLocationRaw`, `MpResolvedLocation` | Typen | Routendatensätze, Parameter, Abfrage-/Hash-Status, Metadaten und Navigationsziele.                                                            |
| `defineRoutes`, `matchRoutes`, `resolveLocation` | Funktionen | Definieren Sie Routenbäume und lösen Sie Pfade ohne DOM oder Framework-Laufzeit auf.                                                              |
| `MpNavigationResult`, `MpRouteGuard`, `MpHistory`, `MpRouterAdapter` | Typen | Navigationsergebnisse/-ereignisse, Wachen, steckbarer Verlauf und Adapterverträge.                                                         |
| `MpLink`, `useMpRoute`, `useMpRouter`, `useMpNavigation`, `MpRouterView` | Compiler-Marker | Neutrale Link-, Routenstatus-, Navigations-, Auflösungs- und Outlet-Funktionen, die von gemeinsam genutzten Paketen genutzt werden.                               |
| `@mission-platform/forge-router-*` | Schmiedeziele | Unabhängig ausgewählte native Router-Ziele für Vue Router, React Router, SolidJS Router, SvelteKit, RedwoodSDK und Web Components. |

Laufzeitpakete besitzen einen eigenen Verlauf und einen reaktiven Status. Das neutrale Paket importiert niemals ein UI-Framework. Für Webkomponenten:
Registrieren Sie die Elemente einmal und übergeben Sie komplexe Ziele über DOM-Eigenschaften statt über serialisierte Attribute:

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

### Asynchrone Routenansichten und `Suspense`

Der neutrale Compiler von Forge erkennt `Suspense` und setzt es auf den nativen Wert herab
asynchrone Grenze für das ausgewählte Ziel. Behalten Sie den Fallback in der freigegebenen Quelle bei
Daher weist jedes Ziel den gleichen Ladezustand auf, ohne dass ein Framework importiert werden muss
Adapter:

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

React, Vue, Solid und Svelte erhalten ihre native Suspense-Grenze. A
Die Framework-freie Anwendung nutzt den Outlet-Fallback des Web Components-Routers
für asynchrone Routenansichten stattdessen:

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

Der Router sendet während der asynchronen Ausführung ein Lade-Overlay von `forge-router-outlet`
Routenansicht wird aufgelöst. Die aktuelle Ansicht bleibt gemountet, bis das Ziel erreicht ist
bereit, und das Overlay wird nach Erfolg, Weiterleitung, Abbruch oder entfernt
Misserfolg.

## Benutzeroberfläche und Design

### @mission-platform/tokens

Zentralisierte Design-Tokens für Farben, Typografie und Abstände.

| Exportieren | Beschreibung |
| :------------ | :------------------------------------------------------------------------ |
| `tokens` | JS/TS-Objekt, das alle Design-Tokens enthält (z. B. `tokens.color.primary`). |
| `tokens.scss` | SCSS-Variablen zur Verwendung in Stylesheets.                                    |

### @mission-platform/breakpoints

Reaktionsfähige Dienstprogramme und Sichtbarkeitskomponenten.

| Exportieren | Geben Sie | ein Beschreibung |
| :--------------- | :-------- | :--------------------------------------------------------- |
| `useBreakpoints` | Haken | Gibt den reaktiven Haltepunktstatus zurück.                        |
| `ShowIf` | Komponente | Rendert untergeordnete Elemente nur, wenn eine Haltepunktbedingung zutrifft. |
| `HideIf` | Komponente | Versteckt untergeordnete Elemente, wenn eine Haltepunktbedingung übereinstimmt.        |

### @mission-platform/components

Gemeinsam genutzte UI-Komponenten, die einmal erstellt wurden und für mehrere Frameworks verfügbar sind.

- **Import**: immer `@mission-platform/components`; Die aktive `mp:<framework>`-Bedingung entscheidet darüber, ob Sie das erhalten
  Vue 3, React, Solid oder Webkomponenten-Build.
- **Unterpfade pro Komponente**: `@mission-platform/components/<path>` (z. B.
  `@mission-platform/components/atoms/forge-badge/forge-badge`) ist ebenfalls zustandsbewusst und lädt nur die Komponenten dieser Komponente
  Brocken.
- **Komponenten**: `ForgeButton`, `ForgeInput`, `ForgeModal` und mehr.

## Funktionspakete

### @mission-platform/i18n

Internationalisierungssystem basierend auf i18next.

| Exportieren | Beschreibung |
| :---------------- | :-------------------------------------------------------- |
| `createForgeI18N` | Initialisiert die i18n-Instanz mit Plattformstandards.     |
| `useI18n` | Hook für Übersetzungen und Gebietsschemaumschaltung in Komponenten. |

### @mission-platform/seo

Meta-Tag- und SEO-Management.

| Exportieren | Beschreibung |
| :------- | :-------------------------------------------------------------------- |
| `useSeo` | Hook zum deklarativen Festlegen von Seitentiteln, Meta-Tags und Open Graph-Daten. |

### @mission-platform/map

Reaktiver Wrapper für MapLibre GL.

| Komponente | Beschreibung |
| :-------------- | :---------------------------------------- |
| `<MpMap>` | Hauptkomponente des Kartencontainers.             |
| `<MpMapMarker>` | Komponente zum Platzieren von Markierungen auf der Karte. |

### @mission-platform/code-scanner

Kamerabasiertes Scannen von Barcodes und QR-Codes.

| Komponente | Beschreibung |
| :---------------- | :--------------------------------------------------------------- |
| `<MpCodeScanner>` | Komponente, die den Kamerastream initialisiert und Scanergebnisse ausgibt. |

## Integrationen

### @mission-platform/rxjs

Überbindet RxJS-Observables mit dem Komponentenstatus.

| Haken | Beschreibung |
| :-------------- | :-------------------------------------------------------------------------- |
| `useObservable` | Abonniert ein Observable und gibt seinen neuesten Wert als reaktiven Zustand zurück. |

### @mission-platform/d3

Frameworkneutrale D3.js-Integration.

| Haken | Beschreibung |
| :------ | :----------------------------------------------------------------- |
| `useD3` | Bindet eine D3-Auswahl an eine Komponentenreferenz mit Lebenszyklusverwaltung. |

### @mission-platform/hunspell

WebAssembly-basierte Rechtschreibprüfung.

| Exportieren | Beschreibung |
| :------------- | :------------------------------------------------------ |
| `initHunspell` | Lädt und instanziiert das Hunspell WebAssembly-Modul. |
| `spell` | Überprüft, ob ein Wort richtig geschrieben ist.                  |
| `suggest` | Bietet Rechtschreibvorschläge für ein Wort.               |

## Serviceüberwachung

### Service Monitor-API

Die Service-Monitor-Anwendung stellt sowohl öffentliche als auch authentifizierte Endpunkte zur Überwachung des Servicezustands bereit.

#### Öffentliche Endpunkte

Öffentliche Endpunkte stellen nur minimale Statusinformationen bereit und erfordern keine Authentifizierung:

- **`GET /api/services`**: Gibt den Rollup-Status für jeden überwachten Dienst zurück. Die Antwort umfasst nur `{ id, name, type }` für jeden Dienst sowie `now` und `intervalSeconds`. Es werden keine Zielkonfigurationen, URLs, Hosts, Abfragen, Header, Schwellenwerte oder Topologien angezeigt.
- **`GET /api/metrics?service=<id>&since=<ms>`**: Gibt rohe Zeitreihenmetriken für einen Dienst zurück. Der Parameter `since` ist durch das konfigurierte Aufbewahrungsfenster begrenzt. Die Antwort umfasst nur `service`, `now`, `since` und `samples`.

#### Authentifizierte Endpunkte

Authentifizierte Endpunkte erfordern das Trägertoken `MONITOR_API_TOKEN` und stellen die vollständige Monitorkonfiguration bereit:

- **`POST /api/check`**: Löst einen sofortigen Prüfzyklus aus.
- **`GET /api/monitors`**: Alle Monitore mit vollständiger Konfiguration auflisten.
- **`POST /api/monitors`**: Erstellen Sie einen neuen Monitor.
- **`PATCH /api/monitors/<id>`**: Einen vorhandenen Monitor aktualisieren.
- **`DELETE /api/monitors/<id>`**: Löschen Sie einen Monitor und löschen Sie seine historischen Zähler.

#### Sonden- und Zielrichtlinie

Service-Monitor erzwingt strenge Grenzen für das Probe-Verhalten:

- **Zulässige Schemata**: URL-Prüfungen verwenden standardmäßig `https://` (und Port 443), es sei denn, der vertrauenswürdige private Modus ist aktiviert; `http://` ist im vertrauenswürdigen Modus zulässig.
- **Zulässige Ports**: URL-Prüfungen erlauben Port 443; Host-Probes ermöglichen eine Basislinie von Ports [53, 80, 123, 443, 1883, 8883].
- **Verbotene Ziele**: Private/link-local-Adressen (127.0.0.1, ::1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fe80::/10), sofern nicht ausdrücklich vertrauenswürdig.
- **Anfrage-/Antwortgrenzen**: Probe-Anfragen sind auf 64 KB begrenzt; Antworten sind auf 256 KB begrenzt. Geschwindigkeitstests sind auf 25 MB begrenzt.
- **Umleitungsrichtlinie**: Umleitungen müssen innerhalb desselben Ursprungs und derselben genehmigten Pfadpräfixe bleiben; Cross-Origin- oder Disallowed-Path-Weiterleitungen werden abgelehnt.
- **Aufbewahrung des Verlaufs**: Der Vorfall-, Aktualisierungs- und Wartungsverlauf ist durch eine Obergrenze für die Elementanzahl begrenzt (maximal 100 Elemente pro Monitor). Die Standardaufbewahrung für Metrikdaten beträgt 24 Stunden.

#### Serverseitiges Rendering (SSR)

Die Service-Monitor-SSR-Schicht erfordert eine Authentifizierung, bevor die private Monitorkonfiguration in Client-Requisiten serialisiert wird. Nicht authentifizierte Anfragen erhalten nur den öffentlichen Status DTO.

### E-Mail-Absender-Mitarbeiter

Der E-Mail-Sender-Worker stellt ein lokales Entwicklungsschaufenster für die E-Mail-Wiedergabe und -Zustellung bereit.

#### Bereitstellungsmodi

- **Lokale Entwicklung** (Standard): Wird auf `localhost:1025` an MailPit gesendet. Keine Authentifizierung erforderlich.
- **Nicht-lokale Bereitstellung**: Erfordert eine explizite `EMAIL_DEPLOYMENT_TOKEN`-Inhaberautorisierung, eine `EMAIL_ALLOWED_ORIGINS`-Zulassungsliste und eine `EMAIL_ALLOWED_RECIPIENTS`-Zulassungsliste. Die Ratenbegrenzung über `EMAIL_RATE_LIMITER` wird erzwungen.

#### Validierung anfordern

Alle E-Mail-Anfragen müssen:

- Verwenden Sie `Content-Type: application/json`.
- Geben Sie eine gültige Empfänger-E-Mail-Adresse an (Feld `to`, max. 254 Zeichen).
- Geben Sie einen Empfängernamen an (`recipientName`, 1–100 Zeichen).
- Fügen Sie den vollständigen HTML-Code der E-Mail hinzu (`html`, max. 240 KB).
- Bestehen Sie HTML-Kompatibilitätsprüfungen über `assertCompatibleEmailHtml`.

#### Fail-Closed-Standardwerte

Nicht-lokale Bereitstellungen ohne explizite Konfiguration lehnen alle Anfragen ab. Aus Gründen der Entwicklungsfreundlichkeit bleiben lokale Bereitstellungen uneingeschränkt.

## Verifizierung von Forge-Webskript-Artefakten

### Identität des Artefaktinhalts

Forge-Webskriptartefakte verwenden eine versionierte SHA-256-Inhaltsidentität im Format `sha256-v1:<hex>`. Dieser Digest wird über die gesamte Artefaktbinärdatei berechnet und im Feld `contentHash` des Artefaktmanifests gespeichert.

#### Integrität vs. Authentizität

Ein Inhalts-Hash **erkennt versehentliche oder nicht autorisierte Inhaltsänderungen**, wenn er mit einem vertrauenswürdigen erwarteten Wert verglichen wird. Es ist **nicht**:

- Authentifizieren Sie den Hersteller oder Ursprung des Artefakts.
- Ersetzen Sie kryptografische Signaturen oder Bereitstellungszugriffskontrollen.
- Stellen Sie sicher, dass das Artefakt sicher ausgeführt werden kann.

#### Verifizierungsworkflow

1. **Beziehen Sie den erwarteten Hash** von einer vertrauenswürdigen Quelle (z. B. einem signierten Manifest, einem CI-Build-Protokoll oder einer sicheren Konfiguration).
2. **Berechnen Sie den Artefakt-Hash** mit dem Prüfer: `fws_verify_artifact(artifact)` gibt `contentHash` zurück.
3. **Hashes vergleichen**: Wenn sie übereinstimmen, wurde das Artefakt seit der Aufzeichnung des erwarteten Werts nicht versehentlich oder böswillig verändert.
4. **Überprüfen Sie das Manifest**: Verwenden Sie `fws_inspect_manifest`, um Funktionsimporte, -exporte, Metadaten und Richtlinieneinhaltung unabhängig zu überprüfen.

#### Versionierung

Das Präfix `sha256-v1` ermöglicht zukünftige Upgrades des Hash-Algorithmus ohne Mehrdeutigkeit. Aufrufer müssen sowohl ältere (falls vorhanden) als auch aktuelle Digest-Formate ordnungsgemäß verarbeiten.

## Weiterführende Literatur

- [Vue 2 bis Vue 3 Migrationsleitfaden](migration-guides/vue2-to-vue3.md)
- [Übersicht über die Projektkonfiguration](packages/tooling/configs/index.md)
- [Arbeitsbereichsstruktur](workspace-structure.md)

## Vollständiger Workspace-Paketindex

Der folgende Index wird aus den Paketmanifesten generiert und hier aufbewahrt, sodass die öffentliche API-Referenz alle abdeckt
Paket in `packages/`, einschließlich der typisierten WebAssembly-Fassaden.

### Kern und Benutzeroberfläche

| Paket | Zweck |
| :----------------------------- | :------------------------------------------------------------ |
| `@mission-platform/forge` | Frameworkneutrale JSX-Laufzeit und -Adapter.                   |
| `@mission-platform/components` | Einmal beschreibbare UI-Komponenten.                                     |
| `@mission-platform/icons` | Einmal beschreibbare SVG-Symbolkomponenten.                               |
| `@mission-platform/layouts` | Anwendungs-, Container- und responsive Layoutkomponenten.     |
| `@mission-platform/forms` | Schemaformulare und visuelle Formularerstellungskomponenten.              |
| `@mission-platform/forms-core` | Schemaableitung, Validierung und Form-Builder-Domänenlogik. |
| `@mission-platform/tokens` | Benutzerdefinierte CSS-Eigenschaften und SCSS-Design-Tokens.                 |

### Composables und Integrationen

| Paket | Zweck |
| :---------------------------------------------- | :--------------------------------------------------------------- |
| `@mission-platform/breakpoints` | Reaktionsfähige Haltepunktstatus- und Sichtbarkeitshelfer.              |
| `@mission-platform/d3` | Zusammensetzbare und Margin-Dienstprogramme für den D3-Auswahllebenszyklus.          |
| `@mission-platform/i18n` | i18next-Status- und Framework-Integrationshelfer.                 |
| `@mission-platform/map` | MapLibre-Kartenkomponenten und Composables.                         |
| `@mission-platform/observers` | Zusammensetzbare Schnitt-, Mutations- und Leistungsbeobachter-Elemente.    |
| `@mission-platform/phone-number` | Typisierte WebAssembly-Telefonnummernanalyse und -formatierung.           |
| `@mission-platform/router` | Frameworkneutrale Routenverträge und Compilerfunktionen.     |
| `@mission-platform/forge-router-web-components` | Web Components-Router-Ziel und Framework-freie Laufzeit.         |
| `@mission-platform/rxjs` | RxJS-Observables und Abonnement-Composables.                    |
| `@mission-platform/scheduler` | Planer-Benutzeroberfläche, Wiederholung und Kalenderlayoutdomänenlogik.      |
| `@mission-platform/vcard` | RFC 6350 vCard- und RFC 5545 iCalendar-Daten und -Komponenten.       |
| `@mission-platform/content` | Inhalt AST, Builder, Monaco, Markdown und WYSIWYG-Komponenten. |
| `@mission-platform/seo` | Metadaten, Open Graph und Composables mit strukturierten Daten.           |
| `@mission-platform/speech-audio` | Sprach-, Audio- und Web-MIDI-Composables.                         |
| `@mission-platform/three` | Three.js Canvas und Lifecycle Composables.                       |

### Code- und WebAssembly-Pakete

| Paket | Zweck |
| :------------------------------- | :----------------------------------------------- |
| `@mission-platform/barcode` | 1D-Barcode kodiert/dekodiert Fassade und Bauteil.   |
| `@mission-platform/code-scanner` | Kamera- und Bildcode-Scankomponente.        |
| `@mission-platform/matrix-code` | Data Matrix und Aztec kodieren/dekodieren Fassade.      |
| `@mission-platform/qr-code` | QR-Kodierung/Dekodierung von Fassade und Bauteil.           |
| `@mission-platform/harper` | Harper-Grammatik- und Stilintegration für Monaco. |
| `@mission-platform/hunspell` | Emscripten Hunspell-Rechtschreibprüfungs-Wrapper.      |

### Forge-Compiler-Ziele

Diese befinden sich in `packages/compiler/plugins/` und nicht in `packages/`. Ein **Framework**-Plugin entscheidet, welche Laufzeit eine neutrale Komponente ist
wird abgesenkt auf; Ein **CMS**-Ziel entscheidet, auf welche Content-Plattform es projiziert wird. Die beiden Achsen bilden zusammen, also jedes CMS
Das Ziel kann an ein beliebiges Framework-Plugin gebunden werden. Siehe die [Forge Compiler Pipeline](../../../packages/tooling/vite/forge/docs/locales/de/reference/compiler.md).

| Paket | Zweck |
| :---------------------------------------------- | :-------------------------------------------------------------------------------- |
| `@mission-platform/forge-plugin-api` | `FrameworkOutputPlugin`-Vertrag, semantische IR-Typen und Build-Adaptertypen.     |
| `@mission-platform/forge-plugin-react` | React Ausgabeziel.                                                              |
| `@mission-platform/forge-plugin-vue` | Vue 3 Ausgabeziel.                                                              |
| `@mission-platform/forge-plugin-solid` | Solid Ausgabeziel.                                                              |
| `@mission-platform/forge-plugin-svelte` | Svelte 5 Ausgabeziel.                                                           |
| `@mission-platform/forge-plugin-web-components` | Ausgabeziel der Webkomponenten.                                                     |
| `@mission-platform/forge-cms-plugin-api` | `CmsOutputPlugin`-Vertrag, neutrales Inhaltsmodell, CMS-Treiber und Build-Helfer. |
| `@mission-platform/forge-cms-storyblok` | Storyblok-Komponentenobjekte, Block-Wrapper und `components.json`.                |
| `@mission-platform/forge-cms-astro` | Statische `.astro`-Vorlagen und `client:load`-Framework-Inseln.                    |
| `@mission-platform/forge-cms-ghost` | Ghost-Lenker-Teiltöne und ein `config.custom`-Themenfragment.                   |
| `@mission-platform/forge-cms-jekyll` | Jekyll Liquid enthält das `_data`-Schema und ein `_config.yml`-Fragment.             |
| `@mission-platform/forge-cms-webflow` | Webflow `declareComponent`-Codekomponenten und ein `webflow.json`-Bibliotheksfragment. |

#### @mission-platform/forge-cms-plugin-api

| Exportieren | Geben Sie | ein Beschreibung |
| :------------------------ | :------- | :------------------------------------------------------------------------------ |
| `analyzeContentComponent` | Funktion | Projiziert die Requisiten einer neutralen Komponente auf das plattformneutrale Inhaltsmodell.   |
| `ContentComponent` | Geben Sie | ein Bestellte `ContentField`s, Slots und das `interactive`-Flag.                     |
| `ContentFieldKind` | Geben Sie | ein `text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`. |
| `CmsOutputPlugin` | Geben Sie | ein Der Zielvertrag: ein gebundenes Framework-Plugin plus die vier Emitter.           |
| `defineForgeCmsPlugin` | Funktion | Validiert ein CMS-Ziel zum Zeitpunkt der Konfiguration.                                   |
| `generateCmsArtifacts` | Funktion | Der generische Discover → IR → Content Model → Emit → Write-Treiber.                |
| `defineTsdownForgeCms` | Funktion | tsdown-Konfiguration für ein CMS-Ziel, die `dist/cms/<cms>/<framework>/**` ausgibt.     |
| `defineTsdownForgeCmsAll` | Funktion | tsdown configs für eine Liste von CMS-Zielen.                                       |
