# @mission-platform/theme

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/theme/docs/index.md: [packages/theme/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

`@mission-platform/theme` besitzt die einmal beschreibbare Designoberfläche, die aus `@mission-platform/components` extrahiert wurde.

## Öffentliche Oberfläche

- `ForgeThemeToggle` wechselt zwischen den gemeinsamen Einstellungen Hell, Dunkel und Auto.
  – `ForgeThemeProvider` konfiguriert die Persistenz und macht den Designstatus über seine bereichsbezogene Render-Requisite verfügbar.
  – `ForgeThemeComposer` steuert bereichsbezogene oder globale `--mp-*`-Token-Überschreibungen.
- Theme-Store-Verträge umfassen `getThemeSnapshot`, `subscribeTheme`, `setTheme`, `toggleTheme`, `cycleTheme` und
  `configureTheme`.
- Composer-Verträge umfassen Konfigurationszusammenführung, Attribut-/Token-Mutation, CSS-Variablenkonvertierung und Reset-Helfer.

Alle Komponenten und Stores verwenden eine paketlokale Implementierung, sodass Provider-, Toggle- und Composer-Konsumenten dies beachten
die gleichen Laufzeitverträge nach der Framework-spezifischen Forge-Kompilierung.
