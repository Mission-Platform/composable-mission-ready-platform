# Arbeitsbereichsstruktur

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> Englische Quelle: [docs/workspace-structure.md](../../workspace-structure.md)
> Sprache: Deutsch (de)

Dieses Dokument bietet eine technische Referenz für das Monorepo-Layout der Mission Platform, für Verzeichniszwecke und für interne Zwecke
Paketkonventionen.

## Monorepo-Layout-Referenz

Mission Platform verwendet pnpm Arbeitsbereiche und Turborepo zur Verwaltung einer Umgebung mit mehreren Paketen. Das Repository ist organisiert
in funktionale Ebenen:

```text
composable_mission_ready_platform/
├── apps/                   # Deployable products, docs, and workbenches
├── configs/                # Shared tooling and base configurations
├── packages/               # Reusable libraries and building blocks
├── vite-plugins/           # Build-time extensions and compilers
├── workers/                # Reusable Cloudflare Worker edge functions
├── crates/                 # Rust crates (including Wasm-compiled ones)
├── mcp/                    # Model Context Protocol servers
├── scripts/                # Repo-wide automation scripts
├── examples/               # Example implementations and demos
└── docs/                   # Canonical English and translated documentation
```

## Primäre Verzeichnisse

### 1. `apps/` (Bewerbungen)

Anwendungen sind bereitstellbare Einheiten, die aus der Funktionalität bestehen `packages/` Verzeichnis. Sie sind in der Regel privat
und niemals in einem Register veröffentlicht.

- **`docs/`**: Der Vite + Vue Dokumentationsseite für das Markdown-Korpus.
- **`my-care-notes/`**: Die Flaggschiff-Anwendung für Pflegenotizen.
- **`service-monitor/`**: Das RedwoodSDK-Service-Integritäts-Dashboard, unterstützt durch ein dauerhaftes Objekt.
- **`website/`**: Die Marketing- und Produktwebsite der Mission Platform.
- **`storybook/`**: Die Komponenten-Workbench und visuelle Testsuite.

### 2. `packages/` (Bausteine)

Wiederverwendbare, versionierte Bibliotheken, die von Apps genutzt werden. Diese sollen nach Möglichkeit Framework-unabhängig sein.

- **`@mission-platform/forge`**: Die Framework-neutrale JSX-Laufzeit und -Adapter.
- **`@mission-platform/components`**: Die Multi-Framework-Komponentenbibliothek.
- **`@mission-platform/forms`** Und **`@mission-platform/forms-core`**: Schemagesteuerte Formularprimitive.
- **`@mission-platform/content`** Und **`@mission-platform/email-renderer`**: Inhalts- und Rendering-Pipelines.
- **`@mission-platform/tokens`**: Design-Token-Quelle der Wahrheit.
- **`@mission-platform/router`** Und **`@mission-platform/i18n`**: Framework-neutrales Routing und Lokalisierung.
- **`@mission-platform/barcode`**, **`@mission-platform/code-scanner`**, **`@mission-platform/matrix-code`**, Und
  **`@mission-platform/qr-code`**: Wasm-gestützte Scan- und Codierungspakete.

### 3. `configs/` (Werkzeugstiftung)

Gemeinsame Konfigurationen, die Konsistenz über alle Arbeitsbereiche hinweg gewährleisten. Pakete in diesem Verzeichnis werden normalerweise als verwendet
`devDependencies`.

- **`eslint-config/`**, **`prettier-config/`**, Und **`stylelint-config/`**: Flusen- und Formatierungsregeln.
- **`typescript-config/`**: Basis `tsconfig.json` Dateien für Node, DOM-, Bibliotheks- und Framework-Konsumenten.
- **`tsdown-config/`** Und **`vite-config/`**: Gemeinsame Bibliothek, App, Vite, Und Vitest Muster erstellen.
- **`i18n-config/`** Und **`storybook-framework/`**: Gemeinsame Gebietsschema-Extraktion und Framework-Workbench-Einstellungen.

### 4. `vite-plugins/` (Build-Erweiterungen)

Benutzerdefinierte Plugins, die das erweitern Vite Build-Prozess.

- **`forge/`**: Der mehrstufige Compiler für Forge-Komponenten.
- **`tokens/`**: Erzeugt Code-Artefakte aus DTCG-Token-Definitionen.
- **`i18n/`**: Verwaltet das Laden des Gebietsschemas und die statische Extraktion.

### 5. `workers/` (Edge-Dienste)

Cloudflare Workers für serverseitige Logik und optimierte Asset-Bereitstellung.

- **`api-proxy/`**: Bietet eingeschränkten Lesezugriff auf genehmigte API-Routen.
- **`email-sender/`**: Lokaler, von MailPit unterstützter E-Mail-Showcase-Mitarbeiter.
- **`forge-spa/`**: Stellt statische Assets mit einem bereit `ASSETS`-verbindlicher SPA-Fallback.

Bereitstellbare Anwendungs-Worker werden von konfiguriert `apps/website/wrangler.jsonc`,
`apps/my-care-notes/wrangler.jsonc`, Und `apps/service-monitor/wrangler.jsonc`. Der
`api-proxy` Und `forge-spa` Pakete sind gebündelte Abhängigkeiten und keine eigenständigen Pakete Wrangler Bereitstellungen.

## Interne Paketkonventionen

Um eine vorhersehbare Umgebung aufrechtzuerhalten, folgen alle Pakete und Apps einem standardmäßigen internen Layout.

### Standard `src/` Hierarchie

Der Quellcode ist nach Funktionstyp organisiert:

- **`components/`**: UI-Logik (SFCs oder TSX).
- **`composables/`**: Reaktive Logik und Hooks.
- **`utils/`**: Reine Funktionen und Framework-unabhängige Helfer.
- **`locales/`**: JSON/YAML-Übersetzungsdateien.
- **`styles/`**: SCSS-Teile und Designsystemintegrationen.

### Barrel-Exportmuster

Jedes Verzeichnis darin `src/` muss eine enthalten `index.ts` (Fassfeile).

- Unterverzeichnisse exportieren ihre internen Symbole über ihre lokalen `index.ts`.
- Die Wurzel `src/index.ts` fungiert als öffentlicher Einstiegspunkt für das gesamte Arbeitsbereichsmitglied.

## Root-Konfigurationsregistrierung

Schlüsseldateien im Repository-Stammverzeichnis bestimmen das Verhalten des Monorepos:

| Datei | Zweck |
|:------------------------|:---------------------------------------------------------------------|
| `pnpm-workspace.yaml`   | Definiert Arbeitsbereichsgrenzen, Member-Globs und Abhängigkeitskataloge. |
| `turbo.json`            | Orchestriert die Build-Pipeline und das Aufgaben-Caching.                    |
| `package.json`          | Skripte auf Root-Ebene und monorepoweite DevDependencies.                |
| `commitlint.config.mjs` | Erzwingt die Spezifikation für konventionelle Commits.                     |

## Abhängigkeits- und Arbeitsbereichsmanagement

Mission Platform nutzt die `workspace:*` Protokoll für interne Abhängigkeiten. Dadurch wird sichergestellt, dass Pakete immer die verwenden
lokale Version anderer Arbeitsbereichsmitglieder während der Entwicklung.

### PNPM Kataloge

Das Repository nutzt **pnpm Kataloge** (definiert in `pnpm-workspace.yaml`) um Abhängigkeitsversionen übergreifend zu zentralisieren
das Monorepo. Dies verhindert Versionsdrift und vereinfacht die Wartung.

### Aufgabenausführung

Über den Root werden arbeitsbereichsübergreifende Aufgaben ausgeführt `package.json` mit Turborepo:

- `pnpm build`: Erstellen Sie alle Arbeitsbereiche in der richtigen Abhängigkeitsreihenfolge.
- `pnpm test`: Führen Sie die Testsuiten für alle Arbeitsbereiche mit a aus `test` Aufgabe. Verwenden `pnpm exec turbo run test --affected` für
  der CI-Bereich des geänderten Arbeitsbereichs.
- `pnpm lint`: Laufen ESLint über die Arbeitsbereiche hinweg.
- `pnpm lint:style`: Laufen Stylelint für App- und Paketstile.
- `pnpm format`: Formatierung prüfen mit Prettier.
- `pnpm i18n:extract`: Übersetzungsschlüssel für Arbeitsbereiche extrahieren, die Kataloge besitzen.
