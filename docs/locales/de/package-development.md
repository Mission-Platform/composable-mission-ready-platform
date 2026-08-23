# Paketentwicklung

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/package-development.md: [docs/package-development.md](../../package-development.md)
> Sprache: Deutsch (de)

In diesem Leitfaden wird beschrieben, wie Sie wiederverwendbare Pakete im Mission Platform Monorepo erstellen, entwickeln und veröffentlichen.
Pakete sind die Grundbausteine der Plattform. Sie befinden sich im Verzeichnis `packages/` und werden über verwaltet
pnpm Arbeitsbereiche und Turborepo.

## Erstellen eines neuen Pakets

Die empfohlene Methode zum Erstellen eines Pakets ist die Verwendung des Mission Platform Developer MCP-Tools, das alles gewährleistet
Konfigurationen, Skripte und Ordnerstrukturen folgen den Standards der Plattform.

### 1. Gerüst mit MCP

Verwenden Sie das Tool `scaffold_package`, um das Skelett zu generieren.

```bash
# Example: Creating a new 'date-utils' package
# The tool defaults to a dry-run; set apply=true to write files
scaffold_package(name="date-utils", description="Shared date manipulation utilities", apply=true)
```

Dadurch wird ein konventionskonformes `packages/date-utils/`-Verzeichnis generiert mit:

- `package.json` mit arbeitsplatzbereiten Skripten und freigegebenen Konfigurationen.
- `tsconfig.json` erweitert die Plattformstandards.
- `vite.config.ts` für optimierte Builds.
- `src/index.ts` Barrel-Datei.
- `llms.txt` für KI-gestützte Dokumentation.

### 2. Manuelle Einrichtung (optional)

Wenn Sie das MCP-Tool nicht verwenden, stellen Sie sicher, dass Ihr `package.json` verwendet wird [pnpm Kataloge](https://pnpm.io/catalogs) für
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
├── docs/                           # Package-owned guides and generated API reference
│   └── reference/generated/        # Regenerated during prebuild
├── llms.txt                        # Technical overview for LLMs
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Entwicklungsworkflow

### Autorenregeln

1. **TypeScript überall**: Der gesamte Quellcode muss in `.ts` oder `.tsx` (unter Verwendung von `@mission-platform/forge`) vorliegen.
2. **Framework-Neutralität**: Framework-unabhängige Logik bevorzugen. Komponenten sollten einmal in Forge JSX für das Ziel erstellt werden
   mehrere Frameworks.
3. **Isolierung**: Pakete dürfen niemals aus `apps/` importiert werden.
4. **Testen**: Jede Einheit (zusammensetzbar, Store, Util, Komponente) MUSS über eine `.spec.ts`-Datei am selben Ort verfügen.

Ausführliche Anweisungen zum Verfassen finden Sie unter:

- [Atomares Komponentendesign](atomic-component-design.md)
- [Composable Authoring](composable-authoring.md)
- [Store-Authoring](store-authoring.md)
- [Util Authoring](util-authoring.md)

### Gebäude

Erstellen Sie das Paket mit Turbo, um sicherzustellen, dass Abhängigkeiten in der richtigen Reihenfolge erstellt werden:

```bash
pnpm exec turbo run build --filter @mission-platform/<name>
```

### Testen

Führen Sie Tests mit Vitest durch:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

### Router-Pakete und Webkomponenten-Ziele

Verwenden Sie `@mission-platform/router` für strukturierte Routenziele, reine URL-Helfer und neutrale Compiler-Marker. Geteilt
Pakete dürfen keine Anwendungsrouten definieren oder registrieren. Anwendungen wählen unabhängig voneinander ein Forge-Router-Ziel aus
ihr UI-Ziel, behalten den Besitz nativer Routendatensätze und Router-Instanzen und binden jede zielspezifische Laufzeit
Kontext während des Bootstrap. Die anfänglichen Ziele sind `@mission-platform/forge-router-vue`, `-react`, `-solid`, `-svelte`,
`-redwood` und `-web-components`; Nicht unterstützte Funktionskombinationen müssen eine Compiler-Diagnose bleiben.

Wählen Sie für ein Framework-freies Paket oder eine App die Bedingung Forge Web Components sowohl in der Build- als auch in der TypeScript-Konfiguration aus:

```ts
import { frameworkResolveConditions } from "@mission-platform/vite-config";

export default {
  resolve: { conditions: frameworkResolveConditions("web-component") },
};
```

Für Web Components-Anwendungen importieren Sie die Laufzeit aus `@mission-platform/forge-router-web-components/runtime`, rufen Sie auf
Rufen Sie `registerRouterElements()` einmal auf, rufen Sie `setForgeRouter(appRouter)` auf, nachdem Sie den App-eigenen Router erstellt haben, und übergeben Sie ihn strukturiert
`to`-Werte als DOM-Eigenschaften und Verwendung von `MpMemoryHistory` beim Vorrendern/Testen. Ein Paket, das einen wiederverwendbaren Router hinzufügt
Element oder Änderungen im Verhalten von Webkomponenten müssen eine neutrale Story unter `src/**/*.stories.ts` hinzufügen und das Ziel einschließen
die Web Components Storybook-Workbench.

## Dokumentation (`llms.txt`)

Jedes Paket enthält im Stammverzeichnis eine `llms.txt`-Datei. Diese Datei enthält eine kurze technische Beschreibung des
APIs, Komponenten und Verhalten des Pakets, sodass KI-Assistenten das Paket besser verstehen und verwenden können.

- **Titel**: Verwenden Sie den bereichsbezogenen Paketnamen.
- **Komponenten/APIs**: Tabelle oder Liste der verfügbaren Symbole mit ihren Requisiten und Verantwortlichkeiten.
- **Beispiele**: Kurze Codeausschnitte für häufige Anwendungsfälle.

## Besitz der Paketdokumentation

Paketspezifische Installation, Nutzung, Einschränkungen, Mitwirkende-Workflows und API-Referenzseiten gehören dazu
Das `docs/`-Verzeichnis des Pakets, nicht im Repository-weiten `docs/`-Baum. Die Docs-Site nimmt diese Dateien direkt auf und
veröffentlicht sie unter einem stabilen Paketnamensraum wie `/packages/barcode/index` oder `/configs/eslint-config/index`.
Projektweite Konzepte, Architektur, Workspace-Workflows und paketübergreifende Fehlerbehebung bleiben im Stammverzeichnis `docs/`.

Generierte API-Seiten befinden sich unter `docs/reference/generated/` und werden durch den Paket-Hook `prebuild` aktualisiert. nicht bearbeiten
diese Dateien manuell. Um eine Vorschau der Paketdokumentation über die Site anzuzeigen, führen Sie den Docs-App-Build aus oder verwenden Sie den All-Workspace
Extraktor, der in der README-Datei der Dokumenten-App beschrieben ist.

## Veröffentlichung

Die Missionsplattform nutzt [Änderungssätze](https://github.com/changesets/changesets) zur Versionierung und Veröffentlichung.

1. **Änderungssatz hinzufügen**: Nachdem Sie Änderungen vorgenommen haben, führen Sie Folgendes aus:
```bash
   pnpm changeset
   ```
   Wählen Sie das Paket und die Art der Änderung (Patch, Minor, Major) aus.
2. **Änderungssatz festschreiben**: Übertragen Sie die generierte `.changeset/*.md`-Datei.
3. **Version und Veröffentlichung**: CI/CD übernimmt die eigentliche Veröffentlichung, Sie können Versionen jedoch lokal in der Vorschau anzeigen mit:
```bash
   pnpm changeset version
   ```
