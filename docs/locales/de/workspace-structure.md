# Arbeitsbereichsstruktur

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/workspace-structure.md: [docs/workspace-structure.md](../../workspace-structure.md)
> Sprache: Deutsch (de)

Dieses Dokument bietet eine technische Referenz für das Monorepo-Layout der Mission Platform, für Verzeichniszwecke und für interne Zwecke
Paketkonventionen.

## Monorepo-Layout-Referenz

Mission Platform verwendet pnpm-Arbeitsbereiche und Turborepo, um eine Umgebung mit mehreren Paketen zu verwalten. Das Repository ist organisiert
in funktionale Ebenen:

```text
composable_mission_ready_platform/
├── apps/                   # Deployable products, docs, and workbenches
├── packages/core/          # Framework-neutral runtime, Forge JSX/adapters, routing, i18n, and scheduling
├── packages/ui/            # Components, forms, layouts, themes, and design tokens
├── packages/content/       # Content, email, search, and SEO pipelines
├── packages/integrations/  # Barcode, maps, media, 3D, and interoperability adapters
├── packages/compiler/      # Figma bridges and Forge compiler plugins
├── packages/tooling/       # Shared configs and Vite/build-time extensions
├── packages/edge/          # Reusable Cloudflare Worker edge functions
├── mcp/                    # Model Context Protocol servers
├── scripts/                # Repo-wide automation scripts
├── examples/               # Example implementations and demos
└── docs/                   # Canonical English and translated documentation
```

## Primäre Verzeichnisse

### 1. `apps/` (Anwendungen)

Anwendungen sind bereitstellbare Einheiten, die Funktionen aus dem `packages/`-Verzeichnis zusammenstellen. Sie sind in der Regel privat
und niemals in einem Register veröffentlicht.

- **`docs/`**: Die Dokumentationsseite Vite + Vue für das Markdown-Korpus.
- **`figma-forge-plugin/`**: Das Figma-Plugin, das von Forge erstellte Komponenten in Figma-Workflows integriert.
- **`my-care-notes/`**: Die Flaggschiff-Anwendung für Pflegenotizen.
- **`service-monitor/`**: Das RedwoodSDK-Service-Integritäts-Dashboard, unterstützt durch ein dauerhaftes Objekt.
- **`website/`**: Die Marketing- und Produktwebsite der Mission Platform.
- **`storybook/`**: Die Komponenten-Workbench und visuelle Testsuite.

### 2. `packages/` (Bausteine)

Wiederverwendbare, versionierte Bibliotheken, die von Apps genutzt werden. Domänenverzeichnisse machen den Besitz explizit, ohne Paketnamen oder Importe zu ändern.

- **`core/`**: Framework-neutrale Laufzeit, Forge JSX/Adapter, Routing, Lokalisierung, Observability, RxJS und Scheduler-Dienste.
- **`ui/`**: Komponenten, Haltepunkte, Formulare, Layouts, Auswahl, Themen, Token und Typografie.
- **`content/`**: Inhaltsmodelle, E-Mail-Komponenten/-Rendering, Sprachtools und SEO.
- **`integrations/`**: Barcode, Code-Scannen, D3, Karten, QR/Matrix-Codes, Sprache, Three.js und vCards.
- **`compiler/`**: Figma-Brücken und Framework-/Router-/CMS-Compiler-Plugins.
- **`tooling/`**: Gemeinsame Konfigurationspakete und Vite-Plugins.
- **`edge/`**: Von Anwendungen und lokalen Beispielen verwendete Worker-Pakete.

- **`@mission-platform/forge-jsx`**: Die Framework-neutrale JSX-Laufzeit und -Adapter.
- **`@mission-platform/components`**: Die Multi-Framework-Komponentenbibliothek.
- **`@mission-platform/forms`** und **`@mission-platform/forms-core`**: Schemagesteuerte Formularprimitive.
– **`@mission-platform/content`** und **`@mission-platform/email-renderer`**: Inhalts- und Rendering-Pipelines.
- **`@mission-platform/tokens`**: Design-Token-Quelle der Wahrheit.
- **`@mission-platform/router`** und **`@mission-platform/i18n`**: Framework-neutrales Routing und Lokalisierung.
- **`@mission-platform/barcode`**, **`@mission-platform/code-scanner`**, **`@mission-platform/matrix-code`** und
  **`@mission-platform/qr-code`**: Wasm-gestützte Scan- und Codierungspakete.

### 3. `packages/tooling/configs/` (Tooling Foundation)

Gemeinsame Konfigurationen, die Konsistenz über alle Arbeitsbereiche hinweg gewährleisten. Pakete in diesem Verzeichnis werden normalerweise als verwendet
`devDependencies`.

- **`eslint-config/`**, **`prettier-config/`** und **`stylelint-config/`**: Flusen- und Formatierungsregeln.
- **`typescript-config/`**: Basis-`tsconfig.json`-Dateien für Node-, DOM-, Bibliotheks- und Framework-Konsumenten.
- **`tsdown-config/`** und **`vite-config/`**: Gemeinsame Build-Muster für Bibliothek, App, Vite und Vitest.
- **`i18n-config/`** und **`storybook-framework/`**: Gemeinsame Gebietsschema-Extraktion und Framework-Workbench-Einstellungen.

### 4. `packages/tooling/vite/` (Build-Erweiterungen)

Benutzerdefinierte Plugins, die den Vite-Build-Prozess erweitern.

- **`forge/`**: Der mehrstufige Compiler für Forge-Komponenten.
- **`tokens/`**: Erzeugt Codeartefakte aus DTCG-Tokendefinitionen.
- **`i18n/`**: Verwaltet das Laden des Gebietsschemas und die statische Extraktion.

### 5. `packages/edge/workers/` (Edge-Dienste)

Cloudflare Workers für serverseitige Logik und optimierte Asset-Bereitstellung.

- **`api-proxy/`**: Bietet eingeschränkten Lesezugriff auf genehmigte API-Routen.
- **`email-sender/`**: Lokaler, von MailPit unterstützter E-Mail-Showcase-Worker.
– **`forge-spa/`**: Stellt statische Assets mit einem `ASSETS`-bindenden SPA-Fallback bereit.

Bereitstellbare Anwendungs-Worker werden durch `apps/website/wrangler.jsonc` konfiguriert.
`apps/my-care-notes/wrangler.jsonc` und `apps/service-monitor/wrangler.jsonc`. Die
Bei den Paketen `api-proxy` und `forge-spa` handelt es sich um gebündelte Abhängigkeiten und nicht um eigenständige Wrangler-Bereitstellungen.

### 6. `packages/compiler/plugins/` (Forge-Compiler-Plugins)

Framework-spezifische Ausgabe-Plugins und Adapter für den Forge-Compiler.

- **`forge-cms-plugin-api/`**: CMS-Artefaktgenerierung und Vite/tsdown-Adapterintegration.
- **`forge-cms-astro/`**, **`forge-cms-ghost/`**, **`forge-cms-jekyll/`**, **`forge-cms-storyblok/`**, **`forge-cms-webflow/`**: CMS-spezifische Integrationsadapter.
- **`forge-plugin-api/`**: Gemeinsam genutzte Forge-Compiler-Plugin-Schnittstellen.
- **`forge-vue/`**, **`forge-react/`**, **`forge-solid/`**, **`forge-svelte/`**, **`forge-web-components/`**: Framework-spezifische Codegenerierung und Laufzeitadapter.
- **`forge-router-plugin-api/`**, **`forge-router-vue/`**, **`forge-router-react/`**, **`forge-router-solid/`**, **`forge-router-svelte/`**, **`forge-router-web-components/`**, **`forge-router-redwood/`**: Router-Framework-spezifische Integrationsadapter.

## Interne Paketkonventionen

Um eine vorhersehbare Umgebung aufrechtzuerhalten, folgen alle Pakete und Apps einem standardmäßigen internen Layout.

### Standard-`src/`-Hierarchie

Der Quellcode ist nach Funktionstyp organisiert:

- **`components/`**: UI-Logik (SFCs oder TSX).
- **`composables/`**: Reaktive Logik und Hooks.
- **`utils/`**: Reine Funktionen und Framework-unabhängige Helfer.
- **`locales/`**: JSON/YAML-Übersetzungsdateien.
- **`styles/`**: SCSS-Teile und Designsystemintegrationen.

### Barrel-Exportmuster

Jedes Verzeichnis innerhalb von `src/` muss eine `index.ts` (Barrel-Datei) enthalten.

- Unterverzeichnisse exportieren ihre internen Symbole über ihr lokales `index.ts`.
– Der Stamm `src/index.ts` fungiert als öffentlicher Einstiegspunkt für das gesamte Arbeitsbereichsmitglied.

## Root-Konfigurationsregistrierung

Schlüsseldateien im Repository-Stammverzeichnis bestimmen das Verhalten des Monorepos:

| Datei | Zweck |
| :---------------------- | :------------------------------------------------------------------- |
| `pnpm-workspace.yaml` | Definiert Arbeitsbereichsgrenzen, Member-Globs und Abhängigkeitskataloge. |
| `turbo.json` | Orchestriert die Build-Pipeline und das Aufgaben-Caching.                    |
| `package.json` | Skripte auf Root-Ebene und monorepoweite DevDependencies.                |
| `commitlint.config.mjs` | Erzwingt die Spezifikation für konventionelle Commits.                     |

## Abhängigkeits- und Arbeitsbereichsmanagement

Mission Platform verwendet das `workspace:*`-Protokoll für interne Abhängigkeiten. Dadurch wird sichergestellt, dass Pakete immer die verwenden
lokale Version anderer Arbeitsbereichsmitglieder während der Entwicklung.

### PNPM Kataloge

Das Repository nutzt **pnpm-Kataloge** (definiert in `pnpm-workspace.yaml`), um Abhängigkeitsversionen übergreifend zu zentralisieren
das Monorepo. Dies verhindert Versionsdrift und vereinfacht die Wartung.

### Aufgabenausführung

Arbeitsbereichsübergreifende Aufgaben werden über das Root-`package.json` mithilfe von Turborepo ausgeführt:

- `pnpm build`: Erstellen Sie alle Arbeitsbereiche in der richtigen Abhängigkeitsreihenfolge.
- `pnpm test`: Führen Sie die Testsuiten für alle Arbeitsbereiche mit einer `test`-Aufgabe aus. Verwenden Sie `pnpm exec turbo run test --affected` für
  der CI-Bereich des geänderten Arbeitsbereichs.
- `pnpm lint`: Führen Sie ESLint in allen Arbeitsbereichen aus.
- `pnpm lint:style`: Führen Sie Stylelint für App- und Paketstile aus.
- `pnpm format`: Formatierung mit Prettier prüfen.
- `pnpm i18n:extract`: Übersetzungsschlüssel für Arbeitsbereiche extrahieren, die Kataloge besitzen.
