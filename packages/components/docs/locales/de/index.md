# @mission-platform/components

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/components/docs/index.md: [packages/components/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

`@mission-platform/components` ist die verbleibende einmal beschreibbare Komponentenbibliothek für die Mission Platform. Jede Komponente in
Diese Bibliothek wird einmal mit einem Framework-neutralen JSX-Dialekt (über `@mission-platform/forge`) erstellt und dann unter kompiliert
Buildzeit in die nativen Ausgaben **Vue 3**, **React**, **Svelte**, **Solid** und **Web Component**.

`ForgeTypography` gehört zum dedizierten Paket `@mission-platform/typography`. Importieren Sie es lieber aus diesem Paket
als von `@mission-platform/components`.

## Architektur: „Einmal schreiben, überall ausführen“

Dieses Paket demonstriert eine hocheffiziente, rahmenübergreifende Architektur:

- **Neutrale Quelle**: Komponenten werden mit `@mission-platform/forge` in `.tsx`-Dateien geschrieben.
- **Zweistufige Kompilierung**: Mit `@mission-platform/vite-plugin-forge` wird die neutrale Quelle umgewandelt in
  Framework-spezifischer Quellcode (Vue SFCs und React TSX) und dann von den jeweiligen nativen Toolchains kompiliert.
- **Kein Laufzeit-Overhead**: Es gibt keine Laufzeitadapter. Verbraucher importieren native Komponenten mit dem Bare
  `@mission-platform/components`-Spezifizierer; Das Framework wird **einmal** durch den `mp:<framework>`-Export ausgewählt
  Bedingung – `resolve.conditions` (siehe `defineFrameworkAppConfig` / `frameworkResolveConditions` von
  `@mission-platform/vite-config`) und `customConditions` (über die
  `@mission-platform/typescript-config/framework-<name>`-Voreinstellungen).
- **Storyblok-Integration**: Der Build-Prozess generiert auch Storyblok-Blockkonfigurationen und Wrapper und ermöglicht so
  CMS-gesteuerte Layouts, die dieselben Komponenten verwenden.

## Universelle Größenskala

Jede Komponente in der Bibliothek unterstützt eine `size`-Requisite, die einer kanonischen T-Shirt-Skala folgt. Dies sorgt für Konsistenz
Skalierung über alle UI-Elemente hinweg.

| Wert | Etikett |
| :---- | :---------------- |
| `2xs` | Extra-extra-klein |
| `xs` | Extraklein |
| `sm` | Klein |
| `md` | Mittel (Standard) |
| `lg` | Groß |
| `xl` | Extragroß |
| `2xl` | Extra-extra-groß |

Die meisten Komponenten wenden ein gemeinsames Größenanpassungsdienstprogramm an, das den `font-size` basierend auf Design-Tokens anpasst. Teilweise komplex
Komponenten (wie `ForgeButton` oder `ForgeHero`) verfügen über maßgeschneiderte größenspezifische Formatierungen für Abstand, Ränder und Layout.

## Komponentenkatalog

### Layout und Struktur

Primitive zum Anordnen von Inhalten auf der Seite.

| Komponente | Beschreibung | Wichtige Requisiten |
| :--------------- | :-------------------------------------------------------- | :--------------------------------------------------- |
| `ForgeStack` | Flexbox-Stapel (Zeile/Spalte) mit konfigurierbarer Lücke.         | `direction`, `gap` (`2xs-2xl`), `justify`, `align` |
| `ForgeGrid` | CSS-Grid-Layout-Grundelement.                                | `rows`, `cols`, `gap`, `justify`, `align` |
| `ForgeSeparator` | Visuelle Trennwand (horizontal/vertikal) mit optionaler Beschriftung. | `orientation`, `variant` (`solid`/`dashed`/`dotted`) |
| `ForgeMasonry` | Mehrsäuliger Mauerwerksaufbau.                              | `columns`, `minColumnWidth`, `gap` |

### Anwendungs-Shell und Navigation

High-Level-Komponenten für App-Struktur und Routing.

| Komponente | Beschreibung | Wichtige Requisiten |
| :--------------------------- | :----------------------------------------------------------- | :---------------------------------------------- |
| `ForgeNavbar` | Responsive obere Navigationsleiste mit Marken- und Hamburger-Menü. | `brand`, `sticky`, `mobileTitle` |
| `ForgeDrawer` | Schiebepanel (fest oder inline-responsiv).                  | `open`, `placement`, `size`, `inlineBreakpoint` |
| `ForgePagination` | Kontrollierte Steuerung der Seitennavigation.                          | `modelValue`, `pageCount`/`total`, `pageSize` |
| `ForgeTabs` | ARIA-Tablist mit beweglichem Tabindex und Panels.                | `tabs`, `modelValue`, `variant` (`line`/`pill`) |
| `ForgeMenu` / `ForgeMenubar` | Zugängliche rekursive Menüs/Menüleiste mit Untermenüs.            | `items`, `orientation`, `ariaLabel` |
| `ForgeBreadcrumb` | Hierarchische Spur von Links.                                 | `items`, `separator` |

### Typografie und Inhalt

Textgestaltung und semantische Inhaltsblöcke.

| Komponente | Beschreibung | Wichtige Requisiten |
| :----------- | :--------------------------------------------------------------- | :-------------------------------------- |
| `ForgeHero` | Seitenbanner mit Titel, Untertitel, Medienhintergrund und Aktionen. | `title`, `subtitle`, `media`, `actions` |
| `ForgeQuote` | Semantisches Blockzitat mit Namensnennung.                            | `variant`, `tone`, `author`, `source` |
| `ForgeList` | Generische Liste (geordnet/ungeordnet/Beschreibung).                    | `items`, `variant`, `tone`, `divided` |

### Formulare und Eingaben

Interaktive Elemente zur Dateneingabe.

| Komponente | Beschreibung | Wichtige Requisiten |
| :--------------------------------------- | :--------------------------------------------------- | :------------------------------------------- |
| `ForgeButton` | Grundschaltfläche mit Varianten und Ladezustand. | `variant`, `size`, `loading`, `disabled` |
| `ForgeIconButton` | Kompakte Nur-Symbol-Schaltfläche.                            | `label` (erforderlich), `variant`, `size` |
| `ForgeInput` / `ForgeTextarea` | Textfelder mit Beschriftung, Hinweis und Fehlerstatus.      | `modelValue`, `type`, `placeholder`, `label` |
| `ForgeCheckbox` / `ForgeRadio` | Boolesche oder Gruppenauswahleingänge.                   | `modelValue`, `value`, `label` |
| `ForgeSwitch` | Kippschalter für boolesche Einstellungen.                  | `modelValue`, `label`, `size` |
| `ForgeNumberStepper` | Zahleneingabe mit Inkrement-/Dekrement-Tasten.       | `modelValue`, `min`/`max`, `precision` |
| `ForgeSlider` / `ForgeRangeInput` | Bereichswähler mit einem oder zwei Daumen.                | `modelValue`, `min`/`max`, `step` |
| `ForgeDateInput` / `ForgeDateRangeInput` | Datums- und Datumsbereichsauswahl mit Popover-Kalendern.  | `modelValue`, `min`/`max`, `size` |
| `ForgeColorInput` | Farbauswahl mit Hex-Textfeld.                   | `modelValue`, `size`, `label` |

### Datenanzeige und Virtualisierung

Komponenten für den effizienten Umgang mit großen Datenmengen.

| Komponente | Beschreibung | Wichtige Requisiten |
| :--------------------- | :---------------------------------------------------------- | :-------------------------------------------- |
| `ForgeTable` | Sortierbare Datentabelle mit Lade- und Leerstatus.          | `columns`, `rows`, `onSort`, `loading` |
| `ForgeVirtualList` | Fensterliste für große Arrays (rendert nur sichtbare Zeilen). | `items`, `itemHeight`, `height` |
| `ForgeVirtualTable` | Virtualisierte sortierbare Tabelle mit Sticky-Header.              | `columns`, `rows`, `rowHeight`, `onSort` |
| `ForgeVirtualTreeView` | Fensterstrukturansicht mit Logik zum Erweitern/Reduzieren.              | `nodes`, `itemHeight`, `onSelect`, `onToggle` |
| `ForgeTreeView` | Rekursiver zugänglicher Baum (nicht virtualisiert).                | `nodes`, `defaultOpen`, `onSelect` |
| `ForgeTimeline` | Vertikale oder horizontale Ereignisliste.                          | `items`, `orientation`, `align` |

### Feedback und Overlays

Benachrichtigungs- und Ladeindikatoren.

| Komponente | Beschreibung | Wichtige Requisiten |
| :----------------- | :------------------------------------------- | :--------------------------------------------------- |
| `ForgeSpinner` | Unbestimmter Ladering.                  | `size`, `variant`, `label` |
| `ForgeSkeleton` | Schimmernder Platzhalter zum Laden von Inhalten.  | `shape` (`line`/`circle`/`block`), `width`, `height` |
| `ForgeProgressBar` | Bestimmte oder unbestimmte Fortschrittsspur. | `value`, `max`, `variant`, `indeterminate` |
| `ForgeStatusIcon` | Kleine getönte Statusanzeige-Glyphe.          | `status`, `size`, `label` |

### Medien

Umgang mit Bildern, Videos und dem Erscheinungsbild der Plattform.

| Komponente | Beschreibung | Wichtige Requisiten |
| :--------------------- | :------------------------------------------------------------ | :------------------------------------- |
| `ForgeResponsiveImage` | Künstlerisch gesteuertes `<picture>` mit nativem Quellcode/Größen.            | `src`, `sources`, `aspectRatio`, `fit` |
| `ForgeResponsiveVideo` | Responsiver Videoplayer mit festem Seitenverhältnis.              | `src`, `sources`, `poster`, `autoplay` |
| `ForgeBackgroundVideo` | Vollrandiges Hintergrundvideo mit Unterstützung für reduzierte Bewegungen.      | `src`, `overlay`, `minHeight` |
| `ForgeDeviceMock` | Geräterahmen (Mobilgerät/Tablet/Desktop/Browser) um einen Bildschirm. | `device`, `orientation`, `url`, `size` |

## Implementierungsdetails

### Slots vs. Requisiten

Aufgrund des neutralen JSX-Dialekts verwenden einige Komponenten **Benannte Slots** (kompiliert aus den untergeordneten Elementen/Requisiten von React und den benannten Elementen von Vue).
Slots), während andere **Scoped Render-Props** für Hochleistungsvirtualisierung verwenden.

### Themenintegration

Themenbezogene Komponenten sind Eigentum von `@mission-platform/theme`. Importieren Sie `ForgeThemeToggle`, `ForgeThemeProvider`,
und `ForgeThemeComposer` aus diesem Paket; Seine Singleton-Speicher verwalten `data-theme`-Attribute im Dokumentstamm
und Design-Token-CSS-Variablen, ohne dass in jeder App ein globaler Statusanbieter erforderlich ist.

Der vollständige Restbestand und die abhängigkeitsbewusste zukünftige Paketaufteilung werden in dokumentiert
[die Zerlegungskarte](decomposition-map.md). `ForgeDrawer` und `ForgeWindowPopout` bleiben bis zur Fertigstellung in diesem Paket
die dort beschriebene separate Overlay-/Fenstergrenzen-Entscheidung.
