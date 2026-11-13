# Visuelle Komponenten überschreiben Vertrags- und Migrationsinventar

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/visual-component-overrides.md: [docs/visual-component-overrides.md](../../visual-component-overrides.md)
> Sprache: Deutsch (de)

Status: Komponenteneigenschaftsregistrierung und Vue-Unterstützung im Gültigkeitsbereich
umgesetzt. Typisierte `properties`-Beutel, neutrale `style`-Emission, am selben Ort
`@property`-Teilwerte und eine zielbewusste Vue `v-bind()`-Absenkung sind vorhanden.

## Umfang und Prüfmethode

Das Prüfungsziel ist der vollständige Satz, der durch Folgendes erfüllt wird:

```text
packages/**/src/components/**/*.module.scss
```

Die aktuelle Prüfung ergab **258 Quellmodule in 17 Paketen**. Für jedes Modul Folgendes
Parallel angeordnete Berührungspunkte wurden überprüft:

- `<component>.tsx` – die neutrale JSX-Schnittstelle und Root-/Wrapper-Besitz;
- `<component>.module.scss` – Deklarationen, vorhandene `--forge-*`-Variablen,
  `--mp-*` Token-Abdeckung, Selektoren, Pseudoklassen und Medienregeln; jeder
  Die `--forge-*`-Referenz mit konkretem Komponentenpräfix wird gegen eine lokale Referenz geprüft
  Registrierung teilweise;
- `<component>.stories.tsx` – die repräsentative Storybook-Oberfläche;
- `<component>.spec.ts` – neutrale und/oder Ziel-rendering-Regressionsabdeckung;
- `index.ts` – der lokale Typ-/Komponentenexport und die Paketkomponente
  Fass (`packages/<package>/src/components/index.ts`).

Jedes geprüfte Modul verfügt über eine neutrale `.tsx`-Quelle und eine am gleichen Standort
`.stories.tsx`. Jedes Modul verfügt über ein am selben Ort befindliches `index.ts`, außer
`packages/ui/resource-planner/src/components/organisms/forge-resource-planner`;
Dieses Paket Barrel exportiert die Quelldatei direkt. Die Paketebene
Fässer sind daher der Export-Touchpoint, selbst wenn es sich um ein lokales Fass handelt
fehlt.

Die Klassifizierung ist bewusst konservativ:

- **Prototyp** – implementiert bereits das Muster für verschachtelte Beutel/geerbte Variablen
  und ist die Kompatibilitätsreferenz.
- **Vorhandene semantische Variable** – gibt bereits eine benutzerdefinierte Eigenschaft aus, aber die
  Der Wert wird von einer semantischen Requisite wie `columns` abgeleitet. dupliziere es nicht
  in einer generischen Override-Tasche.
- **Migrieren/Überprüfen** – visuelles, gemeinsam platziertes CSS, das eng besessene,
  tokengestützte Steuerelemente nach einer komponentenweisen API-Entscheidung. A
  Eine tokenisierte Erklärung allein ist kein Grund, sie zu veröffentlichen.
- **Ausgeschlossen** – generiertes Glyph, Diagnose, Anbieter/Canvas, Rendering-Status,
  oder editoreigenes Styling ohne sichere komponenteneigene Überschreibung in diesem Durchgang.

## Vertrag

### Öffentliche Form

Jede Komponente, die für Außerkraftsetzungen zugelassen ist, besitzt eine benannte Schnittstelle. Die
Die Eigenschaft ist optional und hat keine Indexsignatur:

```ts
export interface ComponentProperties {
  readonly "surface-color"?: string;
  readonly "border-width"?: string;
}

export interface ComponentProps {
  readonly properties?: Readonly<ComponentProperties>;
}
```

Die konkrete Bauteilschnittstelle bleibt beispielsweise weiterhin öffentlicher Export
`TypographyProperties`; Führen Sie kein globales `CSSProperties`-Wörterbuch ein.
Verwenden Sie einen aussagekräftigeren Alias, wenn ein Wert eine stabile Grammatik hat (z. B.
`TypographyFontFamily` oder `TypographyLineHeight`) und verwenden Sie `string` nur, wenn
Die CSS-Grammatik enthält legitimerweise Token-Referenzen, `calc()`, Kommas oder
Browserdefinierte Werte. Unbekannte Schlüssel müssen durch den Überschuss TypeScript abgelehnt werden
Immobilienprüfung.

Der verschachtelte Schlüssel ist das komponenteneigene Konzept und keine reine CSS-Deklaration. Tun Sie es
`display`, `position`, `content`, Animationsinterna oder a nicht verfügbar machen
Deklaration, deren beabsichtigte Entscheidung bereits durch ein semantisches Requisit repräsentiert wird
(`size`, `variant`, `columns`, `rows`, `gap` und ähnliche).

### Benutzerdefinierte Eigenschaftsnamen und Stylesheet-Auflösung

Konvertieren Sie einen verschachtelten Schlüssel in eine benutzerdefinierte stabile Kebab-Case-Eigenschaft:

| Verschachtelter Schlüssel | Benutzerdefinierte Eigenschaft |
| --------------- | --------------------------------- |
| `surface-color` | `--forge-component-surface-color` |
| `border-width` | `--forge-component-border-width` |
| `font-family` | `--forge-typography-font-family` |

Der Komponenten-Slug ist der öffentliche CSS-Namespace. Die SCSS-Deklaration wird aufgelöst
die Überschreibung vor dem Token/Standard-Fallback:

```scss
color: var(--forge-component-surface-color, var(--mp-color-bg-surface));
```

Wenn die aktuelle Deklaration einen sinnvollen Nicht-Token-Standardwert hat, behalten Sie ihn als bei
letzter Fallback (`var(--forge-..., var(--mp-token, 1px))`). Erstellen Sie kein neues
Mission Platform-Token für einen Wert, der bereits durch `packages/tokens` abgedeckt ist.

Verwenden Sie `@property` mit `inherits: true`, wenn der Wert über Nachkommen verfügen muss.
Variantenselektoren, Pseudoklassen oder eine Popup-/Wrapper-Grenze. Setzen Sie die
Inline-Zuordnung benutzerdefinierter Eigenschaften für das Element, das den BEM-Stamm besitzt. Für einen
Multi-Element-Komponente, legen Sie sie auf den zuverlässigen vorhandenen Wrapper, also alles
Nachkommen erben es; Verlassen Sie sich bei verschachtelten Objekten nicht auf Vue-Bereichsattribute
Render-Closure-Knoten. Ein außerhalb dieses Wrappers gerendertes Portal benötigt ein explizites
Portal-Host-/Verbreitungsentscheidung, keine stillschweigende globale Variable.

### Vollständigkeit der Erklärung

Jede konkrete `--forge-*`-Eigenschaft, die von einem Komponentenmodul gelesen wird, muss Folgendes haben:
genau eine passende `@property`-Registrierung im importierten Modul des Moduls,
Teilweise am gleichen Ort `_forge-<component>-properties.scss`. Anmeldungen konform
zur W3C CSS Properties and Values API Level 1-Spezifikation:
Sie verwenden `syntax: "*"` und `inherits: true` ohne ungültiges `initial-value`
Deskriptor, der die Auflösung standardmäßiger `var(--forge-*, var(--mp-*))`-Fallbacks ermöglicht
bei einer Auswertung im Stil von nahezu $O(1)$. Anmeldungen werden als konkrete Namen geschrieben
statt ungelöster Sass-Interpolationen. Dazu gehört jede endliche Größe,
Ton, Zustand, Typografie, Popup und kartengenerierte Variante sowie semantische Anker
wie `--forge-logo-columns`, `--forge-stats-columns`,
`--forge-testimonial-columns`, `--forge-grid-columns` und
`--forge-grid-rows`.

Bei den `--forge-*`-Deklarationen handelt es sich um komponentenlokale Überschreibungsmetadaten. Die
`--mp-*`-Variablen bleiben Eigentum von `packages/tokens` und dürfen es nicht sein
in Teilkomponenten umdeklariert. Ein wiederholbarer Schutz ist verfügbar als
`pnpm validate:component-properties`; Es scannt nur Quellmodule und erstellt Berichte
das genaue Modul und die Eigenschaft für fehlende, doppelte, verwaiste oder ungelöste Elemente
Erklärungen.

### Neutrale Ausgabe und Vorrang

Die neutrale JSX-Ausgabe verwendet die von erstellte Standardeigenschaft `style`
`createForgeComponentStyle(prefix, props.properties)`. Sein Typ akzeptiert beides
CamelCase- und Kebab-Case-Schlüssel über das `ForgePropertyBag` / der Plattform
`CSSStyleProperties`, mit automatischer Konvertierung und Präfixierung:

```ts
import { createForgeComponentStyle, type CSSStyleProperties } from '@mission-platform/forge-jsx';

export interface ButtonProperties {
  readonly primaryGap?: string;
  readonly 'primary-gap'?: string;
  readonly primaryBackgroundDefault?: string;
  readonly 'primary-background-default'?: string;
}

// In component rendering:
const customStyle = createForgeComponentStyle('button', props.properties);
```

Undefinierte Werte werden im ausgegebenen Objekt weggelassen, sodass Token-Fallbacks bestehen bleiben
aktiv. Geben Sie niemals eine `styles`-Eigenschaft aus. es ist nicht Teil der neutralen Laufzeit
Vertrag und wäre ein unbekanntes DOM-Attribut in Zielen, die es nicht herabsetzen
speziell. Numerische semantische Variablen behalten möglicherweise ihren vorhandenen `number`
Vertretung; typisierte Überschreibungswerte sind CSS-Zeichenfolgen, also Einheiten, Kommas, Leerzeichen,
und `calc()` bleiben erhalten.

### CSS-Kaskadenschichthierarchie und atomare Struktur

Alle Stile sind in einer expliziten, deterministischen `@layer`-Hierarchie organisiert
auf der Root-Token-Ebene deklariert (`@mission-platform/tokens`):

```scss
@layer mp.reset,
       mp.tokens,
       mp.components,
       mp.components.atoms,
       mp.components.molecules,
       mp.components.organisms,
       mp.components.templates,
       mp.content,
       mp.content.atoms,
       mp.content.molecules,
       mp.content.organisms,
       mp.scheduler,
       mp.scheduler.organisms,
       mp.barcode,
       mp.barcode.molecules,
       mp.code-scanner,
       mp.code-scanner.organisms,
       mp.map,
       mp.map.organisms,
       mp.matrix-code,
       mp.matrix-code.molecules,
       mp.qr-code,
       mp.qr-code.molecules,
       mp.breakpoints,
       mp.breakpoints.molecules,
       mp.overrides,
       mp.utilities;
```

Komponenten-Stylesheets weisen ihre Regeln ihrem jeweiligen Paket und Atom zu
Unterschicht (z. B. `@layer mp.components.atoms`, `@layer mp.components.molecules`,
`@layer mp.scheduler.organisms`), was eine vorhersehbare Kaskadenpriorität garantiert
ohne Spezifitätskonflikte.

### Progressive Leistungsverbesserungen über `@supports`

Komplexe zusammengesetzte Komponenten und schwere Organismen nutzen modernes Browser-CSS
Funktionen, die durch `@supports`-Funktionsabfragen mit Resilient Graceful geschützt werden
Abbau:

1. **`content-visibility: auto`**: Off-Screen-Layout und Lackierkosten für Heavy
   Organismen (`ForgeScheduler`, `ForgeCodeBlock`, `ForgeBarcode`, `ForgeTable`)
   werden mit `contain-intrinsic-size` zurückgestellt.
2. **Containerabfragen (`@container`)**: Adaptive Dichte und Reaktionsfähigkeit
   Komponententypografie passt sich über Containerabmessungen an
   `@supports (container-type: inline-size)`.
3. **Single-Hop-Fallbacks**: Die Suche nach Eigenschaften bleibt flach
   `var(--forge-*, var(--mp-*))`-Diagramme, um die Neuberechnung des Stils in der Nähe von $O(1)$ zu halten.

Die Priorität ist, vom niedrigsten zum höchsten: Token/Theme-Fallback, Komponente
Varianten-/Standardregel, semantische Requisitenauswahl, Komponentenüberschreibung benutzerdefiniert
Eigenschaft, dann ein explizit bereitgestellter Consumer-Inline-Stil (wenn das Ziel
unterstützt einen). `className` bleibt der Klassen-Hook des Aufrufers und kann Regeln hinzufügen.
Sie darf jedoch nicht als Ersatz für die getippte Tasche angesehen werden. Die Überschreibung
Tasche ändert die ausgewählte semantische Variante nicht oder umgeht den Fokus, deaktiviert,
Regeln mit reduzierter Bewegung oder Kaskadenschichtregeln.

React, Svelte, Solid und die Webkomponentenausgabe verbrauchen die neutrale Karte `style`.
Nur der SFC-Stilpfad der nativen Vorlage Vue kann später den entsprechenden Pfad neu schreiben
SCSS-Wert zu `v-bind('properties.<name>')`; Vue Render-Closure-Fallback und
Alle nicht-Vue-Stylesheet-Pfade müssen gültiges normales CSS/SCSS bleiben.

Die Umsetzungspunkte für diese Absenkung sind die neutrale Laufzeit
Vertrag in `packages/core/forge-jsx/src/runtime/types.ts` und `packages/core/forge-jsx/src/runtime/h.ts`,
der vorhandene Neutral-zu-Vue-Stil wird abgesenkt
`packages/compiler/plugins/forge-vue/src/transformers/template.ts` und das am selben Ort befindliche
Stilmontage/Emission in `packages/compiler/plugins/forge-vue/src/runtime/styles.ts` und
`packages/compiler/plugins/forge-vue/src/emitters/sfc.ts`. Diese Dateien tragen oder senken die
eingegebener `style`-Wert; Sie dürfen kein Framework-spezifisches `styles`-Attribut hinzufügen.

## Prototyp und bestehende Kandidaten

Dies sind die exakt vorhandenen benutzerdefinierten Eigenschaftenseiten. Sie sind Regression und
Kompatibilitätsanker, keine Aufforderung, semantische APIs durch Taschen zu ersetzen.

| Komponente | Stilmodul | Vorhandene Variablen | Aktueller Eigentümer/Verfügung | Spätere Berührungspunkte |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ForgeTypography` | `packages/ui/typography/src/components/atoms/forge-typography/forge-typography.module.scss` | Vollständige `--forge-typography-*`-Oberfläche, einschließlich Basis, Anzeige, Variante, Farbe, Link und Popup-Werten | Prototyp; geerbt durch den Typografie-Stamm und den Truncate-Popup-Wrapper | `forge-typography.tsx`, lokal `index.ts`, `.spec.ts`, `.stories.tsx`; alle konkreten Namen werden im zusammenliegenden Teil | registriert
| `ForgeLogoCloud` | `packages/ui/components/src/components/organisms/forge-logo-cloud/forge-logo-cloud.module.scss` | `--forge-logo-columns` | Vorhandene semantische Variable; Behalten Sie `columns` und seine Klemmung bei | `forge-logo-cloud.tsx`, lokales Fass, Spezifikation, Geschichte; kein Duplikat `properties.columns` |
| `ForgeStatsSection` | `packages/ui/components/src/components/organisms/forge-stats-section/forge-stats-section.module.scss` | `--forge-stats-columns` | Vorhandene semantische Variable; `columns` | beibehalten `forge-stats-section.tsx`, lokales Fass, Spezifikation, Geschichte; kein Duplikat `properties.columns` |
| `ForgeTestimonialsSection` | `packages/ui/components/src/components/organisms/forge-testimonials-section/forge-testimonials-section.module.scss` | `--forge-testimonial-columns` | Vorhandene semantische Variable; `columns` | beibehalten `forge-testimonials-section.tsx`, lokales Fass, Spezifikation, Geschichte; kein Duplikat `properties.columns` |
| `ForgeGridLayout` | `packages/ui/layout/src/components/templates/forge-grid-layout/forge-grid-layout.module.scss` | `--forge-grid-columns`, `--forge-grid-rows` | Vorhandene semantische Variablen abgeleitet von `columns`/`rows`; Klemm- und Halteverhalten beibehalten | `forge-grid-layout.tsx`, lokales Fass, Spezifikation, Geschichte; kein doppelter Gitterbeutel |

Der Typografie-Prototyp verfügt jetzt über einen vollständigen Registrierungsteil für alle
konkrete Eigenschaft, die von seinem Modul verbraucht wird, einschließlich aller endlichen Varianten und
Popup-Namen. Seine neutrale JSX-Ausgabe verwendet `style={style}` und behält die Typisierung bei
`CSSStyleProperties`-Erweiterung; Die semantische Typografie-API bleibt unverändert.

## Inventar auf Paketebene

Die folgenden Listen enthalten den vollständigen Komponenten-Slug-Bestand für die 258 passenden
Stilmodule. Für jede Schnecke das Modul, die neutrale Quelle, die Geschichte und (wo
vorhanden) spec befinden sich im selben Verzeichnis unter dem vorhandenen Atom des Pakets,
Molekül, Organismus oder Template-Pfad. Der Paketmodul-Glob im ersten
Die Spalte ist eine genaue Pfadangabe für die Stildateien.

| Paket und genaue Modulpfadspezifikation |   Zählen | Disposition |
| -------------------------------------------------------------------- | ------: | ------------------------------------------------------------------ |
| `packages/integrations/barcode/src/components/**/*.module.scss` |       1 | Generierte Barcode-Präsentation migrieren/überprüfen |
| `packages/ui/breakpoints/src/components/**/*.module.scss` |       1 | Ausgeschlossene Diagnose-/Debug-Präsentation |
| `packages/integrations/code-scanner/src/components/**/*.module.scss` |       1 | Scanner-Host/Frame-Präsentation migrieren/überprüfen |
| `packages/ui/components/src/components/**/*.module.scss` |      84 | 3 vorhandene semantische Variablen; 81 migrieren/überprüfen |
| `packages/content/content/content/src/components/**/*.module.scss` |      10 | 8 migrieren/überprüfen; 2 im Besitz des Herausgebers/ausgeschlossen |
| `packages/ui/float/src/components/**/*.module.scss` |       8 | Migrieren/Überprüfen; Popup-/Portal-Vererbungspriorität |
| `packages/ui/forms/src/components/**/*.module.scss` |      28 | Migrieren/Überprüfen unter Beibehaltung der Kontrollsemantik |
| `packages/ui/icons/src/components/**/*.module.scss` |     106 | Ausgeschlossene generierte Glyphen-Wrapper |
| `packages/ui/layout/src/components/**/*.module.scss` |       7 | 1 vorhandene semantische Variable; 6 migrieren/überprüfen |
| `packages/integrations/map/src/components/**/*.module.scss` |       1 | Ausgeschlossener MapLibre/Canvas-Host |
| `packages/integrations/matrix-code/src/components/**/*.module.scss` |       1 | Generierte Codepräsentation migrieren/überprüfen |
| `packages/integrations/qr-code/src/components/**/*.module.scss` |       1 | Generierte Codepräsentation migrieren/überprüfen |
| `packages/ui/resource-planner/src/components/**/*.module.scss` |       1 | Domain-Präsentation migrieren/überprüfen |
| `packages/core/scheduler/src/components/**/*.module.scss` |       1 | Domain-Präsentation migrieren/überprüfen |
| `packages/ui/select/src/components/**/*.module.scss` |       3 | Migrieren/Überprüfen unter Beibehaltung der Auswahlsemantik |
| `packages/ui/theme/src/components/**/*.module.scss` |       3 | 1 Migration/Überprüfung; 2 Renderless/State-Ausschlüsse |
| `packages/ui/typography/src/components/**/*.module.scss` |       1 | Prototyp |
| **Gesamt** | **258** | **141 migrieren/überprüfen, 5 Prototypen/semantische Anker, 112 ausgeschlossen** |

### Abdeckungssignale

Die folgenden Signale stammen aus demselben Modulscan und sind beabsichtigt
orthogonal. **MP refs** zählt Module, die `--mp-*`-Referenzen enthalten; **Farbe
Literale** zählen Module, die eine Farbfunktion oder ein Hex enthalten; **Abmessung
Literale** zählt Module, die ein CSS-Längen-/Prozentliteral enthalten (einschließlich
absichtliche Null-/Ansichtsfensterwerte); **Forge-Vars** zählt Module, die eine enthalten
vorhandene Variable `--forge-*`; **kein Token-Signal** zählt Module, die enthalten
weder `--mp-*` noch `--forge-*`. Dies sind Triage-Signale, keine automatische API
Entscheidungen.

| Paket | Module | MP-Schiedsrichter | Farbliterale | Dimensionsliterale | Forge-Vars | Kein Token-Signal | Root-/Wrapper-Klassifizierung |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Barcode | 1 | 1 | 0 | 1 | 0 | 0 | einzelner Barcode-Stamm |
| Haltepunkte | 1 | 1 | 1 | 1 | 0 | 0 | Diagnosestamm |
| Code-Scanner | 1 | 1 | 0 | 1 | 0 | 0 | Scanner-Host/Frame-Root |
| Komponenten | 84 | 83 | 3 | 75 | 3 | 1 | BEM-Wurzeln; ausgewählte innere Gitter und Hüllen |
| Inhalt | 10 | 9 | 0 | 6 | 0 | 1 | Roots plus Editor-/Symbolleisten-Wrapper |
| schweben | 8 | 8 | 0 | 8 | 0 | 0 | Popup-, Dialog-, Toast- und Portal-benachbarte Wrapper |
| Formen | 28 | 28 | 0 | 25 | 0 | 0 | Kontrollwurzeln mit Zustandsnachkommen |
| Symbole | 106 | 0 | 0 | 1 | 0 | 106 | generierte Glyphenwurzeln/SVG-Wrapper |
| Layout | 7 | 2 | 0 | 7 | 1 | 4 | Layout-Wurzeln; Rastervariablen im Rasterstamm |
| Karte | 1 | 0 | 0 | 1 | 0 | 1 | MapLibre-Host-/Canvas-Stammverzeichnis |
| Matrixcode | 1 | 1 | 0 | 1 | 0 | 0 | Stammverzeichnis des generierten Codes |
| QR-Code | 1 | 1 | 0 | 1 | 0 | 0 | Stammverzeichnis des generierten Codes |
| Ressourcenplaner | 1 | 1 | 0 | 1 | 0 | 0 | Planerwurzel mit dichten Nachkommen |
| Planer | 1 | 1 | 0 | 1 | 0 | 0 | Scheduler-Wurzel mit dichten Nachkommen |
| wählen | 3 | 3 | 0 | 3 | 0 | 0 | Wurzeln mit Popup-Nachkommen auswählen/kontrollieren |
| Thema | 3 | 2 | 0 | 0 | 0 | 1 | Root umschalten; Composer/Provider-Wrapper |
| Typografie | 1 | 1 | 0 | 1 | 1 | 0 | Typografie-Root plus Truncate-Popup-Wrapper |
| **Gesamt** | **258** | **143** | **4** | **134** | **5** | **114** | Signale überschneiden sich konstruktionsbedingt |

Die Root-Platzierungsregel ergibt sich aus dieser Klassifizierung: gewöhnliche BEM-Module
Hängen Sie die Karte an ihr Stammverzeichnis an. `ForgeLogoCloud`, `ForgeStatsSection` und
`ForgeTestimonialsSection` platziert derzeit semantische Spaltenvariablen auf ihrem
inneres Raster/Liste; `ForgeGridLayout` platziert Zeilen/Spalten im Stammverzeichnis; und
`ForgeTypography` platziert dabei geerbte Werte im Popup-Wrapper
Wrapper existiert. Float/Select-Popup-Strukturen verwenden dieselbe Wrapper-Ebene
Erbschaftsregel, und der Deklarationswächter deckt jedes von ihm genutzte Eigentum ab
Popup-Stile.

### `@mission-platform/barcode`, `breakpoints` und `code-scanner`

- `forge-barcode` – `packages/integrations/barcode/src/components/molecules/forge-barcode/`
  – Quelle, Modul, lokaler Index, Spezifikation, Story. Überprüfen Sie nur den generierten Barcode
  Abmessungen oder Oberflächenkontrollen, die nicht Teil der Barcode-Kodierungs-API sind.
- `forge-breakpoint-debug` – `packages/ui/breakpoints/src/components/molecules/forge-breakpoint-debug/`
  – Quelle, Modul, lokaler Index, Spezifikation, Story. Ausgeschlossen: Dies ist eine Diagnose
  Ansichtsfenster/Debug-Anzeige, keine wiederverwendbare visuelle Themenoberfläche.
- `forge-code-scanner` — `packages/integrations/code-scanner/src/components/organisms/forge-code-scanner/`
  – Quelle, Modul, lokaler Index, Spezifikation, Story. Überprüfen Sie den Rahmen/Behälter des Scanners
  nur Kontrollen; Das Verhalten der Scanner-Engine ist keine Styling-API.

### `@mission-platform/components` (84)

Alle folgenden Einträge haben `<slug>.tsx`, `<slug>.module.scss`,
`<slug>.stories.tsx`, `<slug>.spec.ts` und `<slug>/index.ts` mit dem Paket
Fass bei `packages/ui/components/src/components/index.ts`.

**Vorhandene semantische Variablenanker:**
`forge-logo-cloud`, `forge-stats-section`, `forge-testimonials-section`.

**Migrieren/Überprüfen:**

- Atome: `forge-avatar`, `forge-background-video`, `forge-badge`,
  `forge-button`, `forge-divider`, `forge-gauge`, `forge-icon-button`,
  `forge-icon`, `forge-kbd`, `forge-progress-bar`, `forge-quote`,
  `forge-responsive-image`, `forge-responsive-video`, `forge-separator`,
  `forge-skeleton`, `forge-spinner`, `forge-stack`, `forge-status-icon`,
  `forge-surface`, `forge-sync-status-indicator`.
- Moleküle: `forge-accordion`, `forge-alert`, `forge-breadcrumb`,
  `forge-button-group`, `forge-callout-block`, `forge-card`,
  `forge-carousel-indicator`, `forge-chat-bubble`, `forge-collapse`,
  `forge-device-mock`, `forge-drop-zone`, `forge-empty-state`, `forge-grid`,
  `forge-in-view`, `forge-inline-edit`, `forge-list`, `forge-masonry`,
  `forge-mention-input`, `forge-menu-item`, `forge-menu`, `forge-metric-card`,
  `forge-navbar-item`, `forge-pagination`, `forge-shortcut-hint`, `forge-tabs`,
  `forge-tag-input`, `forge-timeline`, `forge-window-popout`.
- Organismen: `forge-activity-feed`, `forge-announcement-bar`,
  `forge-asset-browser`, `forge-carousel`, `forge-chat-area`,
  `forge-command-palette`, `forge-comment-thread`, `forge-comparison-table`,
  `forge-cookie-consent`, `forge-cta-banner`, `forge-data-card`,
  `forge-diff-viewer`, `forge-drawer`, `forge-error-page`,
  `forge-kanban-board`, `forge-marketing-header`, `forge-menubar`,
  `forge-navbar`, `forge-notification-panel`, `forge-onboarding-tour`,
  `forge-pricing-table`, `forge-profile-card`, `forge-site-footer`,
  `forge-split-pane`, `forge-table`, `forge-transfer-list`, `forge-tree-view`,
  `forge-virtual-list`, `forge-virtual-log-viewer`, `forge-virtual-table`,
  `forge-virtual-tabs`, `forge-virtual-tree-view`.
- Vorlage: `forge-hero`.

Die drei vorhandenen Anker bleiben für ihren aktuellen Zweck nur semantische Props
`columns`-API; Bei einer späteren Verabschiedung können weitere eng begrenzte Grundstücke hinzugefügt werden, müssen aber
Es wird keine zweite Möglichkeit zum Auswählen von Spalten bereitgestellt.

### `@mission-platform/content` (10)

`forge-code-block`, `forge-mermaid`, `forge-wysiwyg-toolbar-button`,
`forge-markdown`, `forge-wysiwyg-block-controls`, `forge-wysiwyg-block-menu`,
`forge-wysiwyg-status-bar`, `forge-wysiwyg-toolbar`, `forge-monaco-editor`,
`forge-wysiwyg-editor` befinden sich unter ihrem vorhandenen Atom/Molekül/Organismus
Verzeichnisse und alle verfügen über Quelle, Modul, Story, lokalen Index und das Paket
Fass bei `packages/content/content/content/src/components/index.ts`.

Es gibt Spezifikationen für `forge-code-block`, `forge-mermaid`, `forge-markdown`,
`forge-monaco-editor`, `forge-wysiwyg-status-bar` und
`forge-wysiwyg-editor`. Für die anderen vier WYSIWYG-Steuerelemente fehlen Spezifikationen.
`forge-monaco-editor` und `forge-wysiwyg-editor` sind von Direct ausgeschlossen
Editor-Styling-Überschreibungen: Monaco/Editor-DOM und Editor-Status besitzen ihr Inneres
Stile. Die umliegenden Host-/Symbolleisten bleiben Kandidaten für die Überprüfung.

### `@mission-platform/float`, `forms`, `layout` und Domänenpakete

- Float (alle 8, jeweils mit Quelle/Modul/Spezifikation/Story/lokalem Index):
  `forge-alert-banner`, `forge-dropdown`, `forge-popover`, `forge-toast`,
  `forge-tooltip`, `forge-dialog`, `forge-modal`, `forge-toast-container`.
  Priorisieren Sie die Root-to-Popup-Vererbung und das Wrapper-/Portalverhalten.
- Formulare (alle 28, jeweils mit Quelle/Modul/Spezifikation/Story/lokalem Index):
  `forge-checkbox`, `forge-input`, `forge-radio`, `forge-range-input`,
  `forge-rating`, `forge-slider`, `forge-switch`, `forge-textarea`,
  `forge-calendar`, `forge-color-input`, `forge-date-input`,
  `forge-date-range-input`, `forge-field-set`, `forge-file-input`,
  `forge-location-input`, `forge-number-stepper`, `forge-otp-input`,
  `forge-phone-input`, `forge-radio-group`, `forge-search-input`,
  `forge-segment-control`, `forge-time-input`, `forge-time-range-input`,
  `forge-date-time-range-input`, `forge-form-builder`, `forge-form-wizard`,
  `forge-schema-form-dialog`, `forge-schema-form`.
  Behalten Sie `size`, Validierung, geprüfte, deaktivierte und Auswahlsemantik bei.
- Layout: `forge-container`, `forge-application-layout`, `forge-bento-layout`,
  `forge-f-pattern-layout`, `forge-vertical-layout`, `forge-z-pattern-layout`
  sind Review-Kandidaten. `forge-grid-layout` ist der vorhandene semantische Anker
  und behält `rows`, `columns`, `gap`, `margin`, `padding` und `breakpoint`.
  Das Paketfass ist `packages/ui/layout/src/components/index.ts`.
- Generierte/Domänenkandidaten (jeder hat Quelle/Modul/Story/lokalen Index/Spezifikation
  sofern nicht anders angegeben): `forge-matrix-code` (`packages/matrix-code`), `forge-qr-code`
  (`packages/qr-code`), `forge-resource-planner`
  (`packages/resource-planner`; kein lokaler Index, direkter Export aus
  `src/components/index.ts`) und `forge-scheduler` (`packages/scheduler`).
- Wählen Sie: `forge-tag`, `forge-multiselect` und `forge-select`, jeweils mit
  source/module/spec/story/local index und das Paket Barrel. Option behalten
  Zustand und Auswahl Requisiten Semantik.
- Thema: `forge-theme-toggle` ist ein Review-Kandidat; `forge-theme-composer`
  und `forge-theme-provider` sind von der visuellen Override-Migration ausgeschlossen als
  Themenstatus/Renderless-Anbieter-Infrastruktur. Das Paketfass ist
  `packages/ui/theme/src/components/index.ts`.

### `@mission-platform/icons` (106)

Alle 106 Symbolmodule werden unter Glyphen-Wrappern generiert
`packages/ui/icons/src/components/**`, haben eine neutrale Quelle, ein neutrales Modul, eine neutrale Geschichte und
lokaler Export und werden vom generierten exportiert
`packages/ui/icons/src/components/index.ts`. Keiner hat eine am selben Ort befindliche Spezifikation. Die
vollständig generierte Namen sind:

`forge-icon-alert`, `forge-icon-alert-critical`, `forge-icon-alert-info`,
`forge-icon-alert-neutral`, `forge-icon-alert-warning`, `forge-icon-align-center`,
`forge-icon-align-justify`, `forge-icon-align-left`, `forge-icon-align-right`,
`forge-icon-arrow`, `forge-icon-bell`, `forge-icon-blockquote`, `forge-icon-bold`,
`forge-icon-bullet-list`, `forge-icon-calendar`, `forge-icon-camera`,
`forge-icon-chat`, `forge-icon-check`, `forge-icon-chevron`, `forge-icon-chevrons`,
`forge-icon-clock`, `forge-icon-close`, `forge-icon-cloud`, `forge-icon-code-block`,
`forge-icon-code-inline`, `forge-icon-copy`, `forge-icon-debug`, `forge-icon-download`,
`forge-icon-draw-circle`, `forge-icon-draw-line`, `forge-icon-draw-polygon`,
`forge-icon-draw-square`, `forge-icon-draw-triangle`, `forge-icon-edit`,
`forge-icon-error`, `forge-icon-external-link`, `forge-icon-eye`, `forge-icon-eye-off`,
`forge-icon-filter`, `forge-icon-geodesic`, `forge-icon-globe`,
`forge-icon-country-globe`, `forge-icon-layer`, `forge-icon-map-marker-cluster`,
`forge-icon-flag`, `forge-icon-heading`, `forge-icon-heading-five`,
`forge-icon-heading-four`, `forge-icon-heading-one`, `forge-icon-heading-six`,
`forge-icon-heading-three`, `forge-icon-heading-two`, `forge-icon-heart`,
`forge-icon-home`, `forge-icon-image`, `forge-icon-info`, `forge-icon-italic`,
`forge-icon-join`, `forge-icon-language`, `forge-icon-lightning`, `forge-icon-link`,
`forge-icon-lock`, `forge-icon-lock-open`, `forge-icon-mail`, `forge-icon-map-pin`,
`forge-icon-menu`, `forge-icon-minus`, `forge-icon-move`, `forge-icon-notice`,
`forge-icon-numbered-list`, `forge-icon-palette`, `forge-icon-pause`,
`forge-icon-pencil`, `forge-icon-phone`, `forge-icon-play`, `forge-icon-plus`,
`forge-icon-puzzle`, `forge-icon-qr-code`, `forge-icon-refresh`, `forge-icon-redo`,
`forge-icon-route`, `forge-icon-rotate-ccw`, `forge-icon-rotate-cw`,
`forge-icon-scale-down`, `forge-icon-scale-up`, `forge-icon-search`,
`forge-icon-send`, `forge-icon-settings`, `forge-icon-share`, `forge-icon-sort`,
`forge-icon-split`, `forge-icon-star`, `forge-icon-strikethrough`,
`forge-icon-table`, `forge-icon-table-column-add`, `forge-icon-table-column-remove`,
`forge-icon-table-row-add`, `forge-icon-table-row-remove`, `forge-icon-trash`,
`forge-icon-undo`, `forge-icon-underline`, `forge-icon-upload`, `forge-icon-user`,
`forge-icon-warning`, `forge-icon-waypoint`, `forge-icon-wrench`.

Diese Stile legen nur den Glyphen-Wrapper fest (`inline-flex`, Ausrichtung,
`currentColor` oder SVG-Größe). Verbraucher steuern die Symbolgröße bereits durch
der umgebende Symbol-/Schriftartkontext oder die semantische API des Symbols. Fügen Sie kein hinzu
Tasche zu jedem generierten Symbol hinzufügen.

### `@mission-platform/map` und `@mission-platform/typography`

`forge-map-libre` ist das einzige MapLibre-Hostmodul unter
`packages/integrations/map/src/components/organisms/forge-map-libre/`; es hat eine Geschichte und
lokale/Paketexporte, aber keine gemeinsam lokalisierte Spezifikation. Seine Canvas/Map-Engine besitzt die
inneres visuelles Modell, daher ist es ausgeschlossen; Nur das Hostgrößenverhalten sollte sein
wird berücksichtigt, wenn eine spätere API dies ausdrücklich erfordert.

`forge-typography` ist das einzige Typografiemodul bei
`packages/ui/typography/src/components/atoms/forge-typography/`. Seine Quelle,
lokaler Index, Paketfass (`packages/ui/typography/src/components/index.ts`),
Spezifikation und Story sind die genauen Berührungspunkte für Schritt 2. Es ist vorhanden und vererbt
Eigenschaften sind die Referenz für Schriftfamilie, Zeilenabstand, Anzeigemetriken und
Truncate-Popup-Nachkommen.

## Explizite Ausschlüsse und rein semantische Regeln

1. **E-Mail-Komponenten:** Im 258-Match-Set ist kein E-Mail-Modul enthalten. E-Mail-Stile
   sind absichtlich inline und folgen einem separaten Rendering-Modell; nicht hinzufügen
   diesen Vertrag auf `packages/email-components`.
2. **Generierte Symbole:** Alle 106 `@mission-platform/icons`-Module bleiben erhalten
   semantische Glyphenkomponenten, ohne visuelle Tasche pro Symbol.
3. **Diagnose-/Infrastruktur-Hosts:** `ForgeBreakpointDebug`, `ForgeMapLibre`,
   `ForgeThemeComposer` und `ForgeThemeProvider` bleiben für den ausgeschlossen
   Gründe oben. Auch Monaco/im Besitz des Herausgebers befindliches DOM bleibt ausgeschlossen.
4. **Vorhandene semantische Dimensionen:** `ForgeLogoCloud.columns`,
   `ForgeStatsSection.columns`, `ForgeTestimonialsSection.columns` und
   `ForgeGridLayout.rows`/`columns` bleiben die einzigen Eigentümer dieser Entscheidungen.
   Ihre bestehenden benutzerdefinierten Eigenschaftsnamen dürfen nicht im Widerspruch zu zukünftigen Taschen stehen
   Namen.
5. **Semantische Interaktions-Requisiten:** `size`, `variant`, geprüfter/ausgewählter Status,
   Validierungsstatus, Haltepunkt, Zeilen/Spalten und Steuerverhalten gelten nicht
   CSS-Überschreibungsschlüssel. Die Tasche kann einen komponenteneigenen visuellen Wert umstimmen
   den ausgewählten semantischen Zustand, darf diesen Zustand jedoch nicht ersetzen.

## Checkliste für die Implementierung von Schritt 2

– Fügen Sie eine typisierte `properties`-Schnittstelle nur für klassifizierte Zeilen hinzu
  **Migrieren/Überprüfen**, nachdem bestätigt wurde, dass die Deklaration Komponenteneigentum ist.
- Geben Sie jeden neutralen Überschreibungsstil als Schnittpunkt von `CSSStyleProperties` ein
  die expliziten benutzerdefinierten Eigenschaftsschlüssel der Komponente (`string | undefined`); tun
  Ersetzen Sie dies nicht durch `Record<string, string>` oder ein globales CSS-Wörterbuch.
– Fügen Sie einen `--forge-<slug>-<key>`-Fallback pro offengelegtem Schlüssel hinzu, mit Token-Fallback
  und `inherits: true`, wo Nachkommen es erfordern.
- Hängen Sie über `style` nur definierte Werte an den Komponentenstamm/Wrapper an.
  niemals `styles` und niemals ein unbekanntes Taschenattribut.
- Aktualisieren Sie den genauen lokalen Index und die Paketkomponentenfass bei einer neuen Öffentlichkeit
  Typ wird eingeführt; Beibehaltung der bestehenden Exportordnung/-konventionen.
– Fügen Sie jeder betroffenen Spezifikation eine Standard-/One-Override-/Verschachtelungsstatusabdeckung hinzu
  Überschreiben Sie das Beispiel mit der vorhandenen, am selben Ort befindlichen Story. Verwenden Sie die Ankerspezifikationen für
  logo/stats/testimonials/grid zum Schutz semantischer Variablen.
– Halten Sie die Vue-Emitter-Arbeit getrennt: Es können Stile mit nativem Vorlagenbereich verwendet werden
  Vue `v-bind()`, während neutrale Quell- und andere Zielstile beibehalten werden müssen
  rahmenneutral.
