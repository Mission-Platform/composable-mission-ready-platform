# Util Authoring

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> Englische Quelle: [docs/util-authoring.md](../../util-authoring.md)
> Sprache: Deutsch (de)

Dienstprogramme (utils) sind reine, Framework-unabhängige Hilfsfunktionen. Sie sollten frei von UI-Framework-Importen sein und, sofern nicht
explizit erforderlich und dokumentiert, frei von DOM-APIs. Dies stellt sicher, dass sie in jedem Kontext verwendet werden können, einschließlich
serverseitige Logik und Worker.

## Verzeichnislayout

Jedes Dienstprogramm SOLLTE sich in einem eigenen benannten Unterverzeichnis befinden `src/utils/`, begleitet von einer am selben Ort befindlichen Testdatei und
ein lokales Fass.

```text
src/utils/
├── format-date/
│   ├── format-date.ts        # Pure logic
│   ├── format-date.spec.ts   # Required unit tests
│   └── index.ts              # Local barrel
└── index.ts                  # Package-level re-exports
```

## Autorenregeln

1. **Reinheit**: Bevorzugen Sie reine Funktionen, die keine Nebenwirkungen haben. Bei gleicher Eingabe sollten sie immer Folgendes zurückgeben
   gleiche Ausgabe.
2. **Keine UI-Hooks**: Niemals importieren `vue`, `react`, oder `@mission-platform/forge` Hooks in einem Dienstprogramm. Logik erfordert
   Reaktivität gehört dazu [Composables](composable-authoring.md).
3. **Explizite Typisierung**: Vollständige Angabe TypeScript Typen für alle Argumente und Rückgabewerte.
4. **Obligatorische Tests**: Für jedes Versorgungsunternehmen muss ein Co-Standort vorhanden sein `.spec.ts` Datei.
5. **Einzelne Verantwortung**: Jeder Util-Ordner sollte sich auf eine bestimmte, eng begrenzte Aufgabe konzentrieren.

## Grundlegendes Beispiel

```ts
/**
 * Clamps a number between a minimum and maximum value.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
```

## Gerüst

Verwenden Sie das Mission Platform Developer MCP-Tool, um ein neues Dienstprogrammskelett zu generieren:

```bash
# Example: Creating a new 'string-utils' folder in the 'i18n' package
scaffold_util(name="string-utils", package="i18n", apply=true)
```

## Verwandte Leitfäden

- [Paketentwicklung](package-development.md)
- [Atomares Komponentendesign](atomic-component-design.md)
- [Composable Authoring](composable-authoring.md)
- [Store-Authoring](store-authoring.md)
