# Komponentenzerlegungskarte

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/ui/components/docs/decomposition-map.md: [packages/ui/components/docs/decomposition-map.md](../../decomposition-map.md)
> Sprache: Deutsch (de)

In diesem Dokument wird der Restbestand nach dem Extrahieren von `ForgeTag` erfasst
`@mission-platform/select`, Floating- und Benachrichtigungs-UI zu `@mission-platform/float`,
und Design-Benutzeroberfläche/-Status auf `@mission-platform/theme`. Der neutrale Lauf bei
`src/components/index.ts` exportiert derzeit **45** Komponenten; Die folgenden Listen sind
die empfohlenen Eigentumsgrenzen der nächsten Welle, nicht die Erstellung zusätzlicher Pakete
durch diese Migration.

## Empfohlene Next-Wave-Pakete

### `@mission-platform/navigation`

`ForgeBreadcrumb`, `ForgeMenu`, `ForgeMenuItem`, `ForgeMenubar`, `ForgeNavbar`,
`ForgeNavbarItem`, `ForgePagination`, `ForgeTabs` und `ForgeVirtualTabs`.

Diese Komponenten teilen sich die Tastaturnavigation, den beweglichen Fokus, den Menü-/Registerkartenstatus usw
Navigationsorientierte Interaktionsverträge. Ihre neutralen Implementierungen hängen davon ab
auf `@mission-platform/forge-jsx`; Es werden auch menü- und tabellenartige Steuerelemente verwendet
`@mission-platform/icons`, während Breadcrumb-/Navigationsleisteninhalte den Eigentümer bilden
`@mission-platform/typography`-Paket. `ForgeNavbar` besteht derzeit aus dem
Rest `ForgeDrawer`, daher muss das Extrahieren der Navigation entweder beibehalten werden
Abhängigkeit explizit oder zuerst die Schubladengrenze festlegen; es darf nicht eingeführt werden
eine Abhängigkeit von `@mission-platform/components` zurück in die Navigation.

### `@mission-platform/data-display`

`ForgeAccordion`, `ForgeList`, `ForgeTable`, `ForgeTreeView`, `ForgeVirtualList`,
`ForgeVirtualTable`, `ForgeVirtualTreeView`, `ForgeVirtualLogViewer`,
`ForgeTimeline`, `ForgeBadge`, `ForgeProgressBar` und `ForgeStatusIcon`.

Das gemeinsame Anliegen ist die Darstellung strukturierter oder großvolumiger Daten, einschließlich
Fensterung, Sortierung, Baumerweiterung und Statusdarstellung. Die aktuelle Quelle
verwendet `@mission-platform/forge-jsx` und, wo Text oder Glyphen zusammengesetzt sind,
`@mission-platform/typography` und `@mission-platform/icons`; diese sollten bleiben
Abhängigkeiten auf niedrigerer Ebene eines zukünftigen Pakets. Virtuelle Komponenten sollten mitziehen
ihre nebeneinander liegenden Stile/Spezifikationen/Geschichten, also ihr neutrales Hook-Verhalten und fünf
Forge-Ziele bleiben gemeinsam getestet.

### `@mission-platform/layout`

`ForgeCard`, `ForgeGrid`, `ForgeMasonry`, `ForgeStack`, `ForgeSeparator` und
`ForgeCollapse`.

Dabei handelt es sich um Strukturprimitive ohne Abhängigkeit vom extrahierten Float, Theme,
oder Pakete auswählen. `ForgeCard` und die derzeit verwendeten abstandtragenden Grundelemente
paketlokale SCSS-Dienstprogramme, daher muss ein Umzug diese Stile entweder tragen oder fördern
das Dienstprogramm zu einem stabilen Paket auf niedrigerer Ebene; es sollte nicht in ein anderes hineinreichen
Quellbaum des Domänenpakets.

### `@mission-platform/media`

`ForgeBackgroundVideo`, `ForgeResponsiveImage`, `ForgeResponsiveVideo`,
`ForgeCarousel` und `ForgeDeviceMock`.

Die ersten drei besitzen die Semantik für das Laden/Rendering von Medien, Karussell und Gerät
Mock-Add-Präsentation rund um die Medien. Ihre neutrale Quelle hängt derzeit davon ab
`@mission-platform/forge-jsx` und für Karussellsteuerungen `@mission-platform/icons`;
Es besteht keine Abhängigkeit von den extrahierten Paketen. Reduzierte Bewegung beibehalten und
CSS pro Komponente als Teil eines zukünftigen Schritts zu integrieren, anstatt das Medienverhalten aufzuteilen
aus seinen Stilen.

### `@mission-platform/communication`

`ForgeChatBubble` und `ForgeChatArea`.

Diese Komponenten teilen die Konversationssemantik, das Verhalten in der Live-Region und die Nachricht
Layout. `ForgeChatBubble` setzt sich aus `ForgeAvatar` und `@mission-platform/typography` zusammen
Daher sollte das künftige Paket von stabilen öffentlichen Aufträgen für diese Bereiche abhängen
Primitive (oder behalten Sie sie im Basispaket), anstatt Residuen zu importieren
Komponentenquelldateien über einen Alias.

## Komponenten, die vorerst zusammen bleiben

Behalten Sie diesen kleinen Grund-/Inhalts-/Vorlagensatz in `@mission-platform/components`
bis genügend API-Oberfläche vorhanden ist, um eine weitere Grenze zu rechtfertigen:

`ForgeAvatar`, `ForgeButton`, `ForgeButtonGroup`, `ForgeIconButton`, `ForgeQuote`,
`ForgeSkeleton`, `ForgeSpinner` und `ForgeHero`.

`ForgeInView` bleibt auch als kleines Interaktionsdienstprogramm erhalten. `ForgeTypography`
ist Eigentum von `@mission-platform/typography` und ist absichtlich nicht Teil des
Restfass.

## Aufgeschobene Overlay-/Fensterkandidaten

`ForgeDrawer` und `ForgeWindowPopout` werden bei dieser Änderung bewusst nicht verschoben.
`ForgeDrawer` ist Overlay/Fenster angrenzend und wird derzeit von erstellt
`ForgeNavbar`; `ForgeWindowPopout` besitzt den Browser-Fenster-Lebenszyklus und daher
erfordert eine separate SSR-, Fokus- und fensterübergreifende Vertragsentscheidung. Bewerten Sie beide
mit den Navigations- und Float-Eigentümern, bevor Sie ein Paket erstellen, und behalten Sie es nicht
Duplizierte Implementierungen als Kompatibilitätsverknüpfung.

## Grenzprüfung

Die verbleibende Komponentenquelle wurde auf Importe der extrahierten Pakete überprüft:
Es gibt keine Importe von `@mission-platform/theme`, `@mission-platform/float` oder
`@mission-platform/select` unter `packages/ui/components/src`. Neutrale Komponenten
Verwenden Sie `@mission-platform/forge-jsx`, ausgewählte Symbole aus `@mission-platform/icons`,
Typografie von `@mission-platform/typography` und paketlokale Stile/Dienstprogramme.
Geschichten können das Paketfass importieren, um die öffentliche Oberfläche zu nutzen; das ist es nicht
eine Implementierungsabhängigkeit oder ein Paketzyklus.

Jede Restkomponente behält ihre am selben Ort befindliche `index.ts`, neutrale Quelle, SCSS,
Spezifikation und Storybook-Geschichte. Das Paketmanifest veröffentlicht `dist`, Komponenten,
Stile und nur Dienstprogramme; Der extrahierte Geschäftsbaum ist nicht mehr enthalten.

## Versorgungsvertrag mit geteilter Größe

Die Klassen `.forge-size--2xs` bis `.forge-size--2xl` sind absichtlich
wird von `@mission-platform/tokens/scss/tokens` und nicht vom Rest ausgegeben
Komponentenpaket. Restkomponenten und die extrahierten `float` und `theme`
Alle Pakete verwenden diese Klassen, während die Ausgabe eigenständiger Forge-Pakete dies nicht kann
Integrieren Sie zuverlässig ein CSS-Modul im Besitz von `@mission-platform/components`.

Das Token-Fass enthält `scss/_size.scss` einmal in der `mp.tokens`-Kaskade
Ebene, neben den benutzerdefinierten Token-Eigenschaften und Basis-Resets. Das konserviert
Der bestehende Vorrangvertrag: Nicht geschichtete Anwendungsstile überschreiben den
Dienstprogrammregeln, und jede betroffene App/Storybook-Eintrag importiert bereits die
Token-Fass. Komponenten geben daher weiterhin die stabile globale Klasse aus
Namen, ohne dass die Größenskala in jedem Paket dupliziert wird.
