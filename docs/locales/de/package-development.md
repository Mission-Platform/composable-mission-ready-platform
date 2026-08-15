# Paketentwicklung

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> Englische Quelle: [docs/package-development.md](../../package-development.md)
> Sprache: Deutsch (de)

In diesem Leitfaden wird beschrieben, wie Sie wiederverwendbare Pakete im Mission Platform Monorepo erstellen, entwickeln und veröffentlichen.
Pakete sind die Grundbausteine ​​der Plattform und befinden sich im `packages/` Verzeichnis gespeichert und verwaltet über
pnpm Arbeitsbereiche und Turborepo.

## Erstellen eines neuen Pakets

Die empfohlene Methode zum Erstellen eines Pakets ist die Verwendung des Mission Platform Developer MCP-Tools, das alles gewährleistet
Konfigurationen, Skripte und Ordnerstrukturen folgen den Standards der Plattform.

### 1. Gerüst mit MCP

Benutzen Sie die `scaffold_package` Werkzeug zum Erzeugen des Skeletts.

```bash
# Example: Creating a new 'date-utils' package
# The tool defaults to a dry-run; set apply=true to write files
scaffold_package(name="date-utils", description="Shared date manipulation utilities", apply=true)
```

Dies erzeugt eine konventionskonforme `packages/date-utils/` Verzeichnis mit:

- `package.json` mit arbeitsplatzbereiten Skripten und gemeinsam genutzten Konfigurationen.
- `tsconfig.json` Erweiterung der Plattformstandards.
- `vite.config.ts` für optimierte Builds.
- `src/index.ts` Barrel-Datei.
- `llms.txt` für KI-gestützte Dokumentation.

### 2. Manuelle Einrichtung (optional)

Wenn Sie das MCP-Tool nicht verwenden, stellen Sie sicher, dass Ihr `package.json` verwendet [pnpm Kataloge](https://pnpm.io/catalogs) für
Abhängigkeitsmanagement und folgt der bereichsbezogenen Namenskonvention:

```json
{
  "name": "@mission-platform/your-package-name",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "pnpm exec turbo run build --filter @mission-platform/your-package-name",
    "test": "vitest run",
    "lint": "eslint .",
    "format": "prettier --check ."
  },
  "devDependencies": {
    "@mission-platform/eslint-config": "workspace:*",
    "@mission-platform/prettier-config": "workspace:*"
  }
}
```

## Paketstruktur

Jedes Paket folgt einem strengen internen Layout. Codeeinheiten (Komponenten, Composables, Stores oder Utils) MÜSSEN darin leben
ihre eigenen benannten Unterverzeichnisse mit am selben Ort befindlichen Tests.

```text
packages/<name>/
├── src/
│   ├── components/                 # Atomic components (atoms, molecules, etc.)
│   │   ├── atoms/
│   │   │   └── forge-button/        # forge-button.tsx + .stories.tsx + .spec.ts
│   │   └── index.ts                # Component re-exports
│   ├── composables/
│   │   └── use-date-format/        # use-date-format.ts + .spec.ts
│   ├── stores/
│   │   └── date-store/             # date-store.ts + .spec.ts
│   ├── utils/
│   │   └── date-validator/         # date-validator.ts + .spec.ts
│   ├── locales/                    # i18n JSON files
│   └── index.ts                    # Package public API (barrel)
├── llms.txt                        # Technical overview for LLMs
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Entwicklungsworkflow

### Autorenregeln

1. **TypeScript Überall**: Der gesamte Quellcode muss vorhanden sein `.ts` oder `.tsx` (mit `@mission-platform/forge`).
2. **Framework-Neutralität**: Framework-unabhängige Logik bevorzugen. Komponenten sollten einmal in Forge JSX für das Ziel erstellt werden
   mehrere Frameworks.
3. **Isolierung**: Pakete dürfen niemals importiert werden `apps/`.
4. **Testen**: Jede Einheit (kombinierbar, Speicher, Dienstprogramm, Komponente) MUSS einen gemeinsamen Standort haben `.spec.ts` Datei.

Ausführliche Anweisungen zum Verfassen finden Sie unter:

- [Atomares Komponentendesign](atomic-component-design.md)
- [Composable Authoring](composable-authoring.md)
- [Store-Authoring](store-authoring.md)
- [Util Authoring](util-authoring.md)

### Gebäude

Erstellen Sie das Paket mit Turbo um sicherzustellen, dass Abhängigkeiten in der richtigen Reihenfolge erstellt werden:

```bash
pnpm exec turbo run build --filter @mission-platform/<name>
```

### Testen

Führen Sie Tests mit aus Vitest:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

## Dokumentation (`llms.txt`)

Jedes Paket enthält eine `llms.txt` Datei im Stammverzeichnis. Diese Datei enthält eine kurze technische Beschreibung des
APIs, Komponenten und Verhalten des Pakets, sodass KI-Assistenten das Paket besser verstehen und verwenden können.

- **Titel**: Verwenden Sie den bereichsbezogenen Paketnamen.
- **Komponenten/APIs**: Tabelle oder Liste der verfügbaren Symbole mit ihren Requisiten und Verantwortlichkeiten.
- **Beispiele**: Kurze Codeausschnitte für häufige Anwendungsfälle.

## Veröffentlichung

Die Missionsplattform nutzt [Änderungssätze](https://github.com/changesets/changesets) zur Versionierung und Veröffentlichung.

1. **Änderungssatz hinzufügen**: Nachdem Sie Änderungen vorgenommen haben, führen Sie Folgendes aus:
```bash
   pnpm changeset
   ```
   Wählen Sie das Paket und die Art der Änderung (Patch, Minor, Major) aus.
2. **Änderungssatz festschreiben**: Übertragen Sie das Generierte `.changeset/*.md` Datei.
3. **Version und Veröffentlichung**: CI/CD übernimmt die eigentliche Veröffentlichung, Sie können Versionen jedoch lokal in der Vorschau anzeigen mit:
```bash
   pnpm changeset version
   ```
