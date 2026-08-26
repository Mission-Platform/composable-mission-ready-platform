# Komponenten-Token-Referenz fälschen

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/tokens/docs/reference/component-tokens.md: [packages/tokens/docs/reference/component-tokens.md](../../../reference/component-tokens.md)
> Sprache: Deutsch (de)

Dies ist das kanonische Inventar und die Figma-Übergabe für von Forge erstellte Komponenten. Es ist absichtlich unabhängig von
die generierten Framework-Adapter: Der gleiche Eintrag gilt für Vue, React, Solid, Svelte und Webkomponenten.

## Den Vertrag lesen

Die Quelle der Wahrheit ist der rekursive Komponentenquellenbaum unten
[`tokens/component/`](../../../../tokens/component), gruppiert nach atomarer Ebene
(`atoms/`, `molecules/`, `organisms/` und `templates/`). Jede Quelle wird unabhängig generiert, während alle Quellen
Behalten Sie den gleichen stabilen `component.*` DTCG-Vertrag bei:

```text
component.<component>.<variant?>.<slot>.<state?>
  -> --mp-<component>-<variant?>-<slot>-<state?>
  -> Mission Platform / Component / <component> / <variant?> / <slot> / <state?>
```

Der DTCG-Pfad ist auch der Figma- und Runtime-Override-Pfad; Nur der generierte CSS-Name löscht den `component`-Wrapper.
Beispielsweise wird `component.button.primary.background.hover` als `--mp-button-primary-background-hover` ausgegeben. A
Die Quell-ID wie `component/atoms/button` identifiziert die Datei, die den Vertrag besitzt, nicht einen neuen DTCG-Pfad.

Komponentenwerte aliasen die vorhandenen primitiven und semantischen Themendokumente. Folglich hat die Figma-Sammlung
Modi **Hell** und **Dunkel** ohne Duplizierung von Komponenten-Tokens. Das Hell/Dunkel-Verhalten zur Laufzeit wird weiterhin verwendet
Unterbaum-Pins `color-scheme`, `light-dark()`, `[data-theme]` und `.theme-*`. Verbraucher und Storybook können alle überschreiben
Blatt unter `component` in `overrides.tokens.json`; Nach dem generierten Token-Stylesheet wird eine Überschreibung angewendet. Überschreibt
Verwenden Sie weiterhin `component.*`-Schlüssel, obwohl benutzerdefinierte CSS-Eigenschaften den Layer-Namespace verwenden.

## Quell- und generiertes Ausgabelayout

Jeder visuelle Vertrag hat einen Eigentümer unter dem atomaren Quellbaum. Der Generator entdeckt neue Dateien rekursiv, also a
Für die neue Quelle ist keine Deskriptorregistrierung erforderlich:

```text
packages/tokens/tokens/component/<atomic-level>/<source>.tokens.json
  -> packages/tokens/src/generated/scss/component/<atomic-level>/_<source>.scss
  -> packages/tokens/src/generated/scss/component/<atomic-level>/_<source>-vars.scss
  -> packages/tokens/src/generated/ts/component/<atomic-level>/<source>.ts
```

Die generierten SCSS- und TypeScript-Fässer enthalten alle Komponentenquellen in der deterministischen Quellen-ID-Reihenfolge. Komponente
Dateien können gemeinsame Verträge wie `button`, `field`, `input`, `navigation` und `overlay` wiederverwenden; zusammengesetzte Komponenten
darf diese Tokenpfade nicht duplizieren. Nur Verhaltenskomponenten, nur vererbte Glyphen und Layout-/DOM-Formeln bleiben erhalten
außerhalb des visuellen Token-Vertrags, es sei denn, ein Inventareintrag weist ihnen visuelles Eigentum zu.

### Semantische Slots und Staatsvokabular

| Slot-Familie                                 | Figma-Rolle                                   | Typische Zustände                                                                      |
| -------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------- |
| `background` / `surface` / `track` / `thumb` | Füll- oder Kontrollfläche                     | `default`, `hover`, `active`, `disabled`, `loading`, `expanded`, `selected`, `invalid` |
| `text` / `label` / `helper-text`             | Typografiefarbe oder benannter Typografiestil | `default`, `hover`, `disabled`, `selected`, `invalid`                                  |
| `border` / `focus-ring`                      | Strich- und Tastaturanzeige                   | `default`, `hover`, `focus-visible`, `active`, `disabled`, `selected`, `invalid`       |
| `padding` / `gap` / `radius` / `shadow`      | Geometrie und Höhe                            | Standard oder größenspezifisch                                                         |
| `opacity` / `transition`                     | De-Betonung und Bewegung                      | `disabled`, `loading`, `hover`, `active`                                               |

Nachfolgend sind nur die von einer Komponente unterstützten Zustände aufgeführt. `expanded` wird für die Offenlegung/Auswahl von Oberflächen verwendet, `selected`
für Auswahlmöglichkeiten/Registerkarten/Navigation und `invalid` für die Formularvalidierung; Es sind keine ungenutzten Zustandsvariablen erforderlich.

## Bestandsübersicht

Das Repository-Inventar basiert auf den folgenden engen Quellpfaden:

```text
packages/*/src/components/**/*.tsx
packages/*/src/components/**/*.stories.tsx
packages/*/src/components/**/*.module.scss
```

| Artefakt                | Zählen | Bedeutung                                                                                         |
| ----------------------- | -----: | ------------------------------------------------------------------------------------------------- |
| Komponenten-TSX-Quellen |    249 | Nicht-Story-Forge- und E-Mail-Komponentenquellen                                                  |
| Gemeinsame Geschichten  |    246 | Drei rekursive Markdown-/Baum-Hilfsquellen haben absichtlich keine eigenständige Geschichte       |
| CSS-Module              |    219 | Lokale visuelle Stilmodule; Inline-E-Mails und übernommene Verträge werden ebenfalls dokumentiert |
| Pakete                  |     20 | Jedes Paket, das eine Komponentenquelle                                                           | enthält |

Die nach der Prüfung generierte Oberfläche enthält **2.841 Token-Blätter**: 132 aktive, 2.161 geschützte und 548 mehrdeutige;
Es gibt keine Kandidaten mehr. Durch die Bereinigung wurden insgesamt 189 unerreichbare Blätter entfernt: die 185 Kandidaten aus dem
Überprüfungsbericht plus 4 Netto-Palettenblätter zweiter Ordnung (6 entfernt, 2 als erreichbare `.500`-Blätter wiederhergestellt), die nach der Alias-Schließung freigelegt wurden. Diese Reduzierung wirkt sich auf die erzeugte Menge aus
Nur primitive, semantische, typografische und strukturelle Exporte; Behaltene `component.*`-Pfade und deren
`--mp-<layer>-*`-Namen bleiben unverändert. Die drei ungelösten Aliase (`color.surface.raised`, `radius.2xs` und
`font.weight.light`) stammen aus der Zeit vor dieser Prüfung und bleiben unverändert.

Die Klassifizierung erfolgt pro Quelle, nicht pro Paket:

- **Visual** – besitzt ein CSS-Modul oder eine visuelle Inline-Ausgabe und ist dem in der Pakettabelle angezeigten Vertrag zugeordnet.
- **Inherited-visual** – rendert keinen unabhängig gestalteten Host; Sein Aussehen stammt von einem Kind, einem Elternteil, `currentColor`,
  ein Host/Canvas eines Drittanbieters oder der Vertrag der komponierten Komponente.
- **Nur Verhalten** – steuert das Rendering- oder Ansichtsfensterverhalten und trifft keine eigene visuelle Entscheidung.

Jeder Aufzählungspunkt unten ist ein Inventareintrag. Sofern eine Story nicht mit `story: missing` gekennzeichnet ist, verfügt die Komponente über eine Übereinstimmung
`<component>.stories.tsx` neben der Quelle. Eine Paket-/Ebenenüberschrift liefert das stabile Quellpfadpräfix.

## `@mission-platform/components`

### Atome – `packages/components/src/components/atoms/`

| Komponente               | Klassifizierung | Vertrag                                         | Aussehen Requisiten / Zustände                                                               |
| ------------------------ | --------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `forge-avatar`           | visuell         | `component.media`                               | `src`, `initials`, `size`, `shape`, `status`, `variant`; Standard-/deaktivierte Statusfarben |
| `forge-background-video` | visuell         | `component.media`                               | Quelle, automatische Wiedergabe/stummgeschaltet/Schleife; Standard/Overlay                   |
| `forge-badge`            | visuell         | `component.feedback`                            | `variant`, `size`; Standard/deaktiviert                                                      |
| `forge-button`           | visuell         | `component.button.<variant>`                    | `variant`, `size`, `padding`, `margin`; default/hover/active/focus-visible/disabled/loading  |
| `forge-icon-button`      | visuell         | `component.button.<variant>` + `component.icon` | Etikett, `variant`, `size`; default/hover/active/focus-visible/disabled/loading              |
| `forge-progress-bar`     | visuell         | `component.feedback`                            | Wert, Variante; default/loading/disabled                                                     |
| `forge-quote`            | visuell         | `component.typography` + `component.surface`    | Zitat, Variante; Standard                                                                    |
| `forge-responsive-image` | visuell         | `component.media`                               | Quelle, Aspekt/Passform; Standard/Platzhalter                                                |
| `forge-responsive-video` | visuell         | `component.media`                               | Quelle, Steuerung/Autoplay; Standard/Overlay                                                 |
| `forge-separator`        | visuell         | `component.surface`                             | Orientierung; Standard                                                                       |
| `forge-skeleton`         | visuell         | `component.feedback`                            | Form/Größe; Laden                                                                            |
| `forge-spinner`          | visuell         | `component.feedback`                            | Größe, Variante; Laden                                                                       |
| `forge-stack`            | visuell         | `component.layout`                              | Richtung, `gap`, Ausrichtung; Standard                                                       |
| `forge-status-icon`      | visuell         | `component.feedback.<status>`                   | Status, Größe; Standard/deaktiviert                                                          |
| `forge-tag`              | visuell         | `component.feedback`                            | Variante, Größe, abnehmbar; default/hover/disabled                                           |
| `forge-theme-toggle`     | visuell         | `component.button` + `component.icon`           | Thema, Größe; default/hover/active/selected                                                  |
| `forge-typography`       | visuell         | `component.typography`                          | `as`, Typografievariante, Farbe; default/link/disabled                                       |

### Moleküle – `packages/components/src/components/molecules/`

| Komponente                | Klassifizierung | Vertrag                                                 | Aussehen Requisiten / Zustände                                                                 |
| ------------------------- | --------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `forge-accordion`         | visuell         | `component.surface` + `component.navigation`            | Artikel, erweitert; default/hover/focus-visible/expanded/disabled                              |
| `forge-alert-banner`      | visuell         | `component.feedback` + `component.overlay`              | Status, entlassen; default/hover/focus-visible                                                 |
| `forge-breadcrumb`        | visuell         | `component.navigation`                                  | Artikel; default/hover/selected/focus-visible                                                  |
| `forge-button-group`      | visuell         | `component.button-group`                                | Orientierung, befestigt, Variante, Lücke; Standard/Fokus sichtbar/deaktiviert                  |
| `forge-card`              | visuell         | `component.surface`                                     | Variante, Polsterung; default/hover/selected                                                   |
| `forge-chat-bubble`       | visuell         | `component.media` + `component.surface`                 | Autor, Regie/Status; Standard/ausgewählt                                                       |
| `forge-collapse`          | visuell         | `component.collapse`                                    | offen, Variante, deaktiviert; default/hover/focus-visible/expanded/disabled                    |
| `forge-device-mock`       | visuell         | `component.media.device`                                | Gerät, Ausrichtung, Größe; Standard                                                            |
| `forge-dropdown`          | visuell         | `component.overlay` + `component.navigation`            | offen, Platzierung; default/expanded/focus-visible                                             |
| `forge-grid`              | visuell         | `component.layout.grid`                                 | Spalten, Lücke, Polsterung; Standard                                                           |
| `forge-in-view`           | visuell         | `component.layout`                                      | Schwelle; erblicher Kindervertrag                                                              |
| `forge-language-switcher` | geerbt-visuell  | `component.navigation` + untergeordneter Auswahlvertrag | Gebietsschema; Standard/erweitert/ausgewählt                                                   |
| `forge-list`              | visuell         | `component.surface`                                     | Variante, Lücke; Standard/ausgewählt                                                           |
| `forge-masonry`           | visuell         | `component.layout.masonry`                              | Spalten, Lücke, Polsterung; Standard                                                           |
| `forge-menu-item`         | visuell         | `component.navigation`                                  | aktiv/deaktiviert; default/hover/focus-visible/selected/disabled                               |
| `forge-menu`              | visuell         | `component.navigation`                                  | Offenheit/Orientierung; Standard/erweitert                                                     |
| `forge-navbar-item`       | visuell         | `component.navigation.navbar-item`                      | aktiv, Dropdown, Variante, deaktiviert; default/hover/focus-visible/selected/expanded/disabled |
| `forge-pagination`        | visuell         | `component.navigation`                                  | Seite, Größe; default/hover/focus-visible/selected/disabled                                    |
| `forge-popover`           | visuell         | `component.overlay`                                     | offen, Platzierung; default/expanded/focus-visible                                             |
| `forge-tabs`              | visuell         | `component.navigation`                                  | Ausrichtung, aktive Registerkarte; default/hover/focus-visible/selected/disabled               |
| `forge-timeline`          | visuell         | `component.timeline`                                    | Status, Orientierung, umrissene Markierung; Standard/ausgewählt                                |
| `forge-toast`             | visuell         | `component.overlay` + `component.feedback`              | Status, Dauer; Standard/Laden                                                                  |
| `forge-tooltip`           | visuell         | `component.overlay`                                     | offen, Platzierung; Standard/erweitert                                                         |
| `forge-window-popout`     | visuell         | `component.overlay.window-popout`                       | offen, Größe; default/hover/focus-visible/selected                                             |

### Organismen und Vorlagen – `packages/components/src/components/{organisms,templates}/`

| Komponente                 | Klassifizierung | Vertrag                                                 | Aussehen Requisiten / Zustände                                                                               |
| -------------------------- | --------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `forge-carousel`           | visuell         | `component.navigation.carousel`                         | Folien, Bedienelemente, Autoplay, Ton; default/hover/focus-visible/selected/disabled                         |
| `forge-chat-area`          | visuell         | `component.media.chat-area`                             | Größe, Kopf-/Fußzeilenslots, automatisches Scrollen; Standard/Laden                                          |
| `forge-dialog`             | visuell         | `component.overlay`                                     | öffnen, Titel/Fußzeile; default/expanded/focus-visible                                                       |
| `forge-drawer`             | visuell         | `component.overlay.drawer`                              | öffnen, Platzierung/Größe, Größe ändern; default/hover/active/expanded                                       |
| `forge-menubar`            | visuell         | `component.navigation.menubar`                          | Artikel, umrandet, Größe; default/hover/focus-visible/expanded/disabled                                      |
| `forge-modal`              | visuell         | `component.overlay`                                     | öffnen, Größe, Kopf-/Fußzeile; default/expanded/focus-visible                                                |
| `forge-navbar`             | visuell         | `component.navigation.navbar`                           | Elemente, Reaktionsmodus; default/hover/focus-visible/selected                                               |
| `forge-table`              | visuell         | `component.data.table`                                  | Spalten, Größe, Beschriftung, gestreift/umrandet/schwebbar, Ton, Laden; default/hover/focus-visible/loading  |
| `forge-theme-composer`     | visuell         | `component.surface` + `component.field`                 | Themenwerte; Standard/ungültig                                                                               |
| `forge-theme-provider`     | visuell         | `component.layout`                                      | Themenmodus; Standard/hell/dunkel                                                                            |
| `forge-toast-container`    | visuell         | `component.overlay`                                     | Platzierung; Standard/Laden                                                                                  |
| `forge-tree-view-item`     | geerbt-visuell  | `component.navigation` + `component.surface`            | erweitert, ausgewählt, deaktiviert; default/hover/focus-visible/expanded/selected/disabled                   |
| `forge-tree-view`          | visuell         | `component.data.tree`                                   | Knoten, Größe, defaultOpen, Label-Renderer; default/hover/focus-visible/expanded/selected                    |
| `forge-virtual-list`       | visuell         | `component.data.virtual-list`                           | Elemente, Größe, Elementhöhe, Höhe, Overscan, Zeilenrenderer; Standard/ausgewählt                            |
| `forge-virtual-log-viewer` | visuell         | `component.code.virtual-log-viewer`                     | Ebene/Filter, Spalten, Follow-Tail; default/hover/focus-visible/warn/error/fatal                             |
| `forge-virtual-table`      | visuell         | `component.data.virtual-table` + `component.data.table` | Spalten, Größe, Zeilenhöhe, Höhe, Overscan, gestreift/umrandet, sortieren; default/hover/focus-visible       |
| `forge-virtual-tabs`       | visuell         | `component.navigation.tabs`                             | Variante, aktive Registerkarte, verschließbar/hinzufügbar; default/hover/focus-visible/selected/disabled     |
| `forge-virtual-tree-view`  | visuell         | `component.data.virtual-tree`                           | Knoten, Größe, itemHeight, Höhe, Overscan, defaultOpen, Zeilenrenderer; default/hover/focus-visible/expanded |
| `forge-hero`               | visuell         | `component.layout.hero`                                 | Medien, Ausrichtung, Größe, Overlay; Standard                                                                |

## Spezialisierte Forge-Pakete

| Paket / Ebene            | Komponente                     | Klassifizierung | Vertrag                                                | Aussehen Requisiten / Zustände                                      |
| ------------------------ | ------------------------------ | --------------- | ------------------------------------------------------ | ------------------------------------------------------------------- |
| `barcode/molecules`      | `forge-barcode`                | visuell         | `component.code.barcode`                               | Wert, Format, Größe; default/loading/invalid                        |
| `breakpoints/atoms`      | `forge-hide-at`                | Nur Verhalten   | keine                                                  | `min`, `max`; Nur Sichtbarkeit im Ansichtsfenster                   |
| `breakpoints/atoms`      | `forge-show-at`                | Nur Verhalten   | keine                                                  | `min`, `max`; Nur Sichtbarkeit im Ansichtsfenster                   |
| `breakpoints/molecules`  | `forge-breakpoint-debug`       | visuell         | `component.debug.breakpoint`                           | Haltepunktanzeige; Standard                                         |
| `code-scanner/organisms` | `forge-code-scanner`           | visuell         | `component.code.scanner`                               | Kamera/Format, Scannen; default/loading/invalid                     |
| `content/atoms`          | `forge-code-block`             | visuell         | `component.code`                                       | Sprache, Kopie; Standard/ausgewählt                                 |
| `content/atoms`          | `forge-mermaid`                | visuell         | `component.code`                                       | Diagrammquelle, Laden/Fehler; default/loading/invalid               |
| `content/atoms`          | `forge-wysiwyg-toolbar-button` | visuell         | `component.button` + `component.icon`                  | Befehl, aktiv; default/hover/active/focus-visible/disabled/selected |
| `content/molecules`      | `forge-markdown`               | visuell         | `component.typography` + `component.code`              | Größe, Links; Standard/ungültig                                     |
| `content/molecules`      | `markdown-block`               | geerbt-visuell  | `component.typography` + untergeordnete Verträge       | Token, Größe; geerbt                                                |
| `content/molecules`      | `markdown-inline`              | geerbt-visuell  | `component.typography`                                 | Token, Links; geerbt/hover/selected                                 |
| `content/molecules`      | `forge-wysiwyg-block-controls` | visuell         | `component.editor.block-controls` + `component.button` | Blockauswahl; default/hover/focus-visible/selected                  |
| `content/molecules`      | `forge-wysiwyg-block-menu`     | visuell         | `component.editor.block-menu` + `component.overlay`    | offen; Standard/erweitert/ausgewählt                                |
| `content/molecules`      | `forge-wysiwyg-status-bar`     | visuell         | `component.editor.status-bar`                          | Status; Standard/ungültig/Laden                                     |
| `content/molecules`      | `forge-wysiwyg-toolbar`        | visuell         | `component.editor.toolbar` + `component.button`        | Befehle; Standard/deaktiviert                                       |
| `content/organisms`      | `forge-monaco-editor`          | visuell         | `component.editor.monaco` + `component.code`           | Sprache, schreibgeschützt; Standard/deaktiviert/ungültig            |
| `content/organisms`      | `forge-wysiwyg-editor`         | visuell         | `component.editor.wysiwyg` + `component.code`          | editierbar, ungültig; default/focus-visible/invalid/disabled        |
| `float/molecules`        | `forge-alert-banner`           | visuell         | `component.feedback` + `component.overlay`             | Status, entlassen; Standard/Fokus-sichtbar                          |
| `float/molecules`        | `forge-dropdown`               | visuell         | `component.overlay` + `component.navigation`           | offen; Standard/erweitert/ausgewählt                                |
| `float/molecules`        | `forge-popover`                | visuell         | `component.overlay`                                    | offen; Standard/erweitert                                           |
| `float/molecules`        | `forge-toast`                  | visuell         | `component.overlay` + `component.feedback`             | Status; Standard/Laden                                              |
| `float/molecules`        | `forge-tooltip`                | visuell         | `component.overlay`                                    | offen; Standard/erweitert                                           |
| `float/organisms`        | `forge-dialog`                 | visuell         | `component.overlay`                                    | öffnen, Titel/Fußzeile; default/expanded/focus-visible              |
| `float/organisms`        | `forge-modal`                  | visuell         | `component.overlay`                                    | öffnen, Größe, Kopf-/Fußzeile; default/expanded/focus-visible       |
| `float/organisms`        | `forge-toast-container`        | visuell         | `component.overlay`                                    | Platzierung; Standard/Laden                                         |

### Formulare – `packages/forms/src/components/`

Alle Formulareinträge verwenden zusätzlich zum unten stehenden Vertrag die gemeinsam genutzten Rollen `component.field` label/helper/error. Einheimisch
Kontrollzustände werden nur dort dargestellt, wo das Steuerelement sie unterstützt.

| Ebene      | Komponenten (ein Eintrag pro durch Kommas getrennten Namen)                                                                                                                                                                                                                                                                                                               | Klassifizierung / Vertrag                                                                                                                     | Requisiten und Zustände für das gemeinsame Erscheinungsbild                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Atome      | `forge-checkbox`, `forge-input`, `forge-radio`, `forge-range-input`, `forge-rating`, `forge-slider`, `forge-switch`, `forge-textarea`                                                                                                                                                                                                                                     | visuell / `component.checkable` für Kontrollkästchen/Radio/Bewertung/Schieberegler/Schalter; `component.input` für input/range-input/textarea | `size`, Label-/Wert-Requisiten; default/hover/active/focus-visible/disabled/invalid/selected, sofern unterstützt   |
| Moleküle   | `forge-calendar`, `forge-color-input`, `forge-date-input`, `forge-date-range-input`, `forge-field-set`, `forge-file-input`, `forge-location-input`, `forge-multiselect`, `forge-number-stepper`, `forge-otp-input`, `forge-phone-input`, `forge-radio-group`, `forge-search-input`, `forge-segment-control`, `forge-select`, `forge-time-input`, `forge-time-range-input` | visual / `component.input`, `component.select`, `component.checkable` oder `component.field` je nach zusammengesetztem Steuerelement          | `size`, `disabled`, Validierungs- und Auswahl-Requisiten; default/focus-visible/disabled/expanded/selected/invalid |
| Organismen | `forge-date-time-range-input`, `forge-form-builder`, `forge-form-wizard`, `forge-schema-form-dialog`, `forge-schema-form`                                                                                                                                                                                                                                                 | visual / `component.field` + zusammengesetzte Eingabe-/Auswahl-/Overlay-Verträge                                                              | Schema, Schritte, Validierung; default/focus-visible/disabled/expanded/selected/invalid                            |

### Symbole – `packages/icons/src/components/`

Alle 106 Symboleinträge sind **visuell vererbt**. Glyphen verwenden `currentColor`; Ihre Größe wird vom Verbraucher gesteuert oder ist darauf abgebildet
`component.icon.size`. Sie erhalten keine Variable pro Glyphe. Jedes hat eine parallele Geschichte und folgt der gleichen
Standard-/ausgewählte/deaktivierte Farbrollen, bei denen das übergeordnete Element diesen Status offenlegt.

| Symbolkategorie         | Komponenten                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kommunikation/Messaging | `forge-icon-bell`, `forge-icon-chat`, `forge-icon-mail`, `forge-icon-phone`, `forge-icon-send`                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Kommunikation/Teilen    | `forge-icon-share`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Inhalt/Bearbeitung      | `forge-icon-copy`, `forge-icon-edit`, `forge-icon-eye`, `forge-icon-eye-off`, `forge-icon-redo`, `forge-icon-trash`, `forge-icon-undo`                                                                                                                                                                                                                                                                                                                                                                                       |
| Inhalt/Dateien          | `forge-icon-download`, `forge-icon-upload`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Daten/Filterung         | `forge-icon-filter`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Daten/Tabellen          | `forge-icon-sort`, `forge-icon-table`, `forge-icon-table-column-add`, `forge-icon-table-column-remove`, `forge-icon-table-row-add`, `forge-icon-table-row-remove`                                                                                                                                                                                                                                                                                                                                                            |
| Zeichnen/Transformieren | `forge-icon-draw-circle`, `forge-icon-draw-line`, `forge-icon-draw-polygon`, `forge-icon-draw-square`, `forge-icon-draw-triangle`, `forge-icon-move`, `forge-icon-palette`, `forge-icon-pencil`, `forge-icon-rotate-ccw`, `forge-icon-rotate-cw`, `forge-icon-scale-down`, `forge-icon-scale-up`                                                                                                                                                                                                                             |
| Karten/Länder           | `forge-icon-country-globe`, `forge-icon-flag`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Karten/Geographie       | `forge-icon-geodesic`, `forge-icon-globe`, `forge-icon-language`, `forge-icon-map-pin`                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Karten/Ebenen           | `forge-icon-layer`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Karten/Markierungen     | `forge-icon-map-marker-cluster`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Medien/Erfassung        | `forge-icon-camera`, `forge-icon-image`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Medien/Wiedergabe       | `forge-icon-pause`, `forge-icon-play`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Navigation/Steuerung    | `forge-icon-arrow`, `forge-icon-chevron`, `forge-icon-chevrons`, `forge-icon-close`, `forge-icon-home`, `forge-icon-join`, `forge-icon-menu`, `forge-icon-minus`, `forge-icon-plus`, `forge-icon-refresh`, `forge-icon-split`                                                                                                                                                                                                                                                                                                |
| Navigation/Links        | `forge-icon-external-link`, `forge-icon-link`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Navigation/Suche        | `forge-icon-search`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Objekte/System          | `forge-icon-cloud`, `forge-icon-debug`, `forge-icon-heart`, `forge-icon-lightning`, `forge-icon-puzzle`, `forge-icon-qr-code`, `forge-icon-settings`, `forge-icon-star`, `forge-icon-wrench`                                                                                                                                                                                                                                                                                                                                 |
| Route/Wegbeschreibung   | `forge-icon-route`, `forge-icon-waypoint`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Sicherheit/Zugang       | `forge-icon-lock`, `forge-icon-lock-open`, `forge-icon-user`                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Status/Feedback         | `forge-icon-alert`, `forge-icon-alert-critical`, `forge-icon-alert-info`, `forge-icon-alert-neutral`, `forge-icon-alert-warning`, `forge-icon-check`, `forge-icon-error`, `forge-icon-info`, `forge-icon-notice`, `forge-icon-warning`                                                                                                                                                                                                                                                                                       |
| Text/Formatierung       | `forge-icon-align-center`, `forge-icon-align-justify`, `forge-icon-align-left`, `forge-icon-align-right`, `forge-icon-blockquote`, `forge-icon-bold`, `forge-icon-bullet-list`, `forge-icon-code-block`, `forge-icon-code-inline`, `forge-icon-heading`, `forge-icon-heading-five`, `forge-icon-heading-four`, `forge-icon-heading-one`, `forge-icon-heading-six`, `forge-icon-heading-three`, `forge-icon-heading-two`, `forge-icon-italic`, `forge-icon-numbered-list`, `forge-icon-strikethrough`, `forge-icon-underline` |
| Zeit/Kalender           | `forge-icon-calendar`, `forge-icon-clock`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

### Andere visuelle Pakete

| Paket / Ebene                | Komponente                                                                                                                                         | Klassifizierung | Vertrag                                                      | Aussehen Requisiten / Zustände                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `layout/atoms`               | `forge-container`                                                                                                                                  | visuell         | `component.layout`                                           | maximale Breite, Polsterung; Standard                                                                   |
| `layout/templates`           | `forge-application-layout`, `forge-bento-layout`, `forge-f-pattern-layout`, `forge-grid-layout`, `forge-vertical-layout`, `forge-z-pattern-layout` | visuell         | `component.layout`                                           | Layoutkonfiguration und Lücken; Standard                                                                |
| `map/molecules`              | `forge-map-draw`, `forge-map-layer`, `forge-map-marker`, `forge-map-popup`, `forge-map-source`                                                     | geerbt-visuell  | `component.map`                                              | Optionen für Kartenquelle/Ebene/Markierung/Popup; Popup-Standard/Fokus sichtbar, andere vom Host geerbt |
| `map/organisms`              | `forge-map-libre`                                                                                                                                  | visuell         | `component.map`                                              | Steuerelemente, Stil, Popup; default/loading/selected                                                   |
| `matrix-code/molecules`      | `forge-matrix-code`                                                                                                                                | visuell         | `component.code`                                             | Wert, Größe; Standard/ungültig/Laden                                                                    |
| `qr-code/molecules`          | `forge-qr-code`                                                                                                                                    | visuell         | `component.code`                                             | Wert, Größe; Standard/ungültig/Laden                                                                    |
| `resource-planner/organisms` | `forge-resource-planner`                                                                                                                           | visuell         | `component.resource-planner`                                 | Ressourcen, Reichweite, Auswahl; default/hover/selected/focus-visible/conflict/unavailable              |
| `scheduler/organisms`        | `forge-scheduler`                                                                                                                                  | visuell         | `component.scheduler`                                        | Sortiment, Veranstaltungen, Auswahl; default/focus-visible/today/outside/busy                           |
| `select/atoms`               | `forge-tag`                                                                                                                                        | visuell         | `component.feedback`                                         | Variante, Größe, abnehmbar; default/hover/disabled                                                      |
| `select/molecules`           | `forge-language-switcher`                                                                                                                          | geerbt-visuell  | `component.select` + `component.navigation`                  | Gebietsschema; Standard/erweitert/ausgewählt                                                            |
| `select/molecules`           | `forge-multiselect`, `forge-select`                                                                                                                | visuell         | `component.select` + `component.input` + `component.field`   | Größe, Optionen, Modell, Validierung; default/hover/focus-visible/disabled/expanded/selected/invalid    |
| `theme/atoms`                | `forge-theme-toggle`                                                                                                                               | visuell         | `component.button` + `component.icon`                        | Modus; default/hover/active/selected                                                                    |
| `theme/organisms`            | `forge-theme-composer`, `forge-theme-provider`                                                                                                     | visuell         | `component.surface` + `component.field` / `component.layout` | Themenwerte/Modus; Standard/hell/dunkel/ungültig                                                        |
| `three/organisms`            | `forge-three-canvas`                                                                                                                               | geerbt-visuell  | `component.media`                                            | Die Abmessungen des Canvas-Hosts sind strukturell. geerbte Oberfläche                                   |
| `typography/atoms`           | `forge-typography`                                                                                                                                 | visuell         | `component.typography`                                       | Variante, Farbe, `as`; default/link/disabled                                                            |
| `vcard`                      | `forge-icalendar`                                                                                                                                  | Nur Verhalten   | keine                                                        | serialisiert Kalenderdaten; kein visueller Host                                                         |
| `vcard`                      | `forge-vcard`                                                                                                                                      | Nur Verhalten   | keine                                                        | serialisiert Kontaktdaten; kein visueller Host                                                          |

## E-Mail-Komponenten

`@mission-platform/email-components` ist enthalten, da seine TSX-Quellen von Forge erstellt wurden. E-Mail-Clients tun dies nicht
Benutzerdefinierte Laufzeiteigenschaften verbrauchen: Der Renderer löst dieselben semantischen Rollen in Inline-Werte auf. Jeder Eintrag unten
ist visuell und verwendet `component.email`, mit `component.button`, `component.typography` oder `component.media`, sofern angegeben.

| Ebene      | Komponenten                                                                   | Vertrag                                                                                                                                                              |
| ---------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Atome      | `email-button`                                                                | `component.email` + `component.button.<variant>`; Varianten neutral/primär/sekundär/tertiär/Erfolg/Warnung/Info/Fehler/kritisch/Ghost; default/hover/active/disabled |
| Atome      | `email-divider`, `email-image`, `email-spacer`, `email-typography`            | `component.email` + `component.surface`/`component.media`/`component.typography`; Standard                                                                           |
| Moleküle   | `email-card`, `email-column`, `email-list`, `email-row`, `email-social-links` | `component.email`; Standard/ausgewählt, wenn Links interaktiv sind                                                                                                   |
| Organismen | `email-footer`, `email-header`, `email-preheader`                             | `component.email` + `component.typography`; Standard                                                                                                                 |
| Vorlagen   | `email-container`, `email-document`, `email-section`                          | `component.email`; Standard-/Hell-/Dunkel-Quellenmodus                                                                                                               |

## Story- und Override-Berichterstattung

Es gibt 246 nebeneinander liegende Geschichten für 249 Komponentenquellen. Die einzigen Quellen ohne eigenständige Geschichten sind die
rekursive Helfer `components/organisms/forge-tree-view/forge-tree-view-item`,
`content/molecules/forge-markdown/markdown-block` und `content/molecules/forge-markdown/markdown-inline`; ihr
Visuelle Zustände werden durch ihre übergeordneten Geschichten ausgeübt und sind oben als vererbt-visuell dokumentiert.

Die freigegebene Storybook-Vorschau lädt `@mission-platform/tokens/scss/tokens`, das Storybook-Override-Plugin und das
`theme` global. Um den Vertrag zu überprüfen, stellen Sie das globale Thema auf hell oder dunkel ein und verwenden Sie die Steuerelemente der Komponentengeschichten.
Um Verbraucherüberschreibungen zu testen, bearbeiten Sie `apps/storybook/design-tokens/overrides.tokens.json` unter `component` mit a
`{ "light": "...", "dark": "..." }`-Wert. Das Überschreibungsschema ist
[`vite-plugins/token-overrides/schema/token-overrides.schema.json`](../../../../../../vite-plugins/token-overrides/schema/token-overrides.schema.json).

Die folgenden Blätter sind absichtlich komponentenbezogen und können auch auf einem einzelnen Komponentenhost überschrieben werden
mit der generierten benutzerdefinierten CSS-Eigenschaft. Die Fallback-Werte in zusammengesetzten Komponenten behalten die Standardwerte bei, wenn es sich um einen Host handelt
definiert keine Überschreibung.

| Komponente           | DTCG-Überschreibungspfad                           | Generiertes CSS-Variablenmuster                        |
| -------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| `forge-avatar`       | `component.media.avatar.size.<size>`               | `--mp-media-avatar-size-<size>`                        |
| `forge-avatar`       | `component.media.avatar.status-size.<size>`        | `--mp-media-avatar-status-size-<size>`                 |
| `forge-avatar`       | `component.media.avatar.status-border-width`       | `--mp-media-avatar-status-border-width`                |
| `forge-progress-bar` | `component.feedback.progress.size.<size>`          | `--mp-feedback-progress-size-<size>`                   |
| `forge-progress-bar` | `component.feedback.progress.indeterminate-*`      | `--mp-feedback-progress-indeterminate-duration/easing` |
| `forge-spinner`      | `component.feedback.spinner.border-width.<size>`   | `--mp-feedback-spinner-border-width-<size>`            |
| `forge-spinner`      | `component.feedback.spinner.animation-*`           | `--mp-feedback-spinner-animation-duration/easing`      |
| `forge-button`       | `component.button.spinner.animation-*`             | `--mp-button-spinner-animation-duration/easing`        |
| `forge-timeline`     | `component.timeline.marker.size/gutter/line.width` | `--mp-timeline-marker-size/gutter/line-width`          |

## Figma-Übergabe-Checkliste

1. Erstellen Sie die Variablensammlung `Mission Platform / Component` mit den Modi Hell und Dunkel.
2. Importieren Sie die Komponentenpfade aus dem `component/<atomic-level>/`-Quellbaum und behalten Sie dabei Komponente, Variante, Steckplatz usw. bei.
   und Staatssegmente.
3. Binden Sie Komponentenvariablen an die entsprechenden primitiven/semantischen Variablen, anstatt rohe Farb- oder Skalenwerte zu kopieren.
4. Komponenteneigenschaften für die dokumentierten Varianten und Größen erstellen; Erstellen Sie Zustandsvarianten nur für die im Inventar aufgeführten Staaten.
5. Halten Sie Layoutformeln, Haltepunkte für Ansichtsfenster, Canvas-Verhalten und DOM-/Zugänglichkeitsverhalten außerhalb der visuellen Variablensammlung.
