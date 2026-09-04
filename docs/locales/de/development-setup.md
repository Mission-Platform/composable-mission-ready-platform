# Entwicklungs-Setup

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/development-setup.md: [docs/development-setup.md](../../development-setup.md)
> Sprache: Deutsch (de)

Dieser Leitfaden bietet eine Schritt-für-Schritt-Anleitung zum Einrichten Ihrer lokalen Umgebung, um zur Mission Platform beizutragen.
Am Ende dieses Handbuchs verfügen Sie über ein funktionierendes Monorepo und können die Entwicklungstools ausführen.

## Voraussetzungen

Stellen Sie vor dem Klonen des Repositorys sicher, dass Ihr System die folgenden Anforderungen erfüllt.

### Systemanforderungen

| Werkzeug | Erforderliche Version | Zweck |
| :---------- | :--------------- | :---------------------------------------------- |
| **Node.js** | `24.19.0`        | Laufzeitumgebung (Aktives LTS) |
| **pnpm**    | `11.21.0`        | Paketmanager und Arbeitsbereich-Orchestrator |
| **Git** | Neueste stabile | Versionskontrolle |
| **Rost** | Stabile Toolchain | Optionale eigenständige Rust-Benchmark-Entwicklung |
| **Docker** | Neueste stabile | Nur für den Emscripten Hunspell-Build erforderlich |

### Versionsverwaltung (empfohlen)

Wir empfehlen die Verwendung von **nvm** (Node Versionsmanager), um sicherzustellen, dass Sie die richtige Version verwenden Node.js-Version, die in angegeben ist
Wurzel `.nvmrc` Datei.

```bash
nvm install
nvm use
```

Aktivieren **pnpm** mit Corepack:

```bash
corepack enable
corepack prepare pnpm@11.21.0 --activate
```

## Ersteinrichtung

Befolgen Sie diese Schritte, um das Monorepo auf Ihrem Computer zu initialisieren.

### 1. Klonen Sie das Repository

```bash
git clone git@github.com:Mission-Platform/composable-mission-ready-platform.git
cd composable-mission-ready-platform
```

### 2. Abhängigkeiten installieren

Installieren Sie alle Arbeitsbereichsabhängigkeiten und richten Sie Git-Hooks ein:

```bash
pnpm install
```

Dieser Befehl löst die aus `prepare` Skript, das **Husky** für Commit-Linting initialisiert und alle internen Funktionen sicherstellt
Paketverknüpfungen sind korrekt eingerichtet.

### 3. Überprüfen Sie die Installation

Führen Sie einen Rauchtest durch, um sicherzustellen, dass das Build-System und die Umgebung richtig konfiguriert sind:

```bash
pnpm exec turbo run build --filter @mission-platform/forge-jsx...
```

Der `...` erstellt auch die für das Paket erforderlichen Forge-Abhängigkeiten. Die
Der neutrale Codescanner wird aus seinem Forge Web Script-Diagramm kompiliert. das tut es nicht
erfordern einen Rost oder `wasm-pack` Bauschritt.

## Entwicklungsworkflow

Die Mission Platform verwendet **Turborepo**, um Aufgaben über Anwendungen und Pakete hinweg zu orchestrieren.

### Komponentenentwicklung (Storybook)

Storybook ist die primäre Werkbank zum isolierten Erstellen und Testen von Komponenten. Sie können auf bestimmte Frameworks abzielen
Verwendung von Umgebungsvariablen:

```bash
# Start Vue 3 Storybook
pnpm storybook:vue

# Start React Storybook
pnpm storybook:react

# Start Svelte Storybook
pnpm storybook:svelte

# Start Solid Storybook
pnpm storybook:solid

# Start Web Components Storybook
pnpm storybook:web-component
```

Alle fünf Modi nutzen das gleiche neutrale Story-Inventar. Um jede Statik zu validieren
Werkbankaufbau in einem Durchgang:

```bash
for framework in vue react svelte solid web-component; do
  STORYBOOK_FRAMEWORK="$framework" pnpm --filter @mission-platform/storybook run build-storybook
done
```

Von Forge unterstützte Pakete veröffentlichen Matching `mp:vue`, `mp:react`, `mp:svelte`,
`mp:solid`, Und `mp:web-component` Bedingungen. Die aktive Bedingung muss sein
vom konsumierenden Bundler konfiguriert; sehen [die Compiler-Referenz](../../../packages/tooling/vite/forge/docs/locales/de/reference/compiler.md)
für das Ziel-Plugin und die Deklarationspipeline.

### Anwendungsentwicklung

So starten Sie eine bestimmte Anwendung im Entwicklungsmodus:

```bash
# Start My Care Notes (Vue 3)
pnpm exec turbo run dev --filter @mission-platform/my-care-notes
```

Die Anwendung ist in der Regel unter verfügbar `http://localhost:5173`.

### Allgemeine Befehle

| Aufgabe | Befehl | Beschreibung |
| :--------- | :------------ | :----------------------------- |
| **Bauen** | `pnpm build`  | Erstellen Sie alle Apps und Pakete |
| **Test** | `pnpm test`   | Alles ausführen Vitest Suiten |
| **Fussel** | `pnpm lint`   | Laufen ESLint über das Monorepo |
| **Formatieren** | `pnpm format` | Überprüfen Sie die Formatierung mit Prettier |

## Fehlerbehebung

### Caches löschen

Wenn unerwartete Build-Fehler auftreten, löschen Sie das Turborepo und Node Caches:

```bash
# Remove Turborepo cache
rm -rf .turbo

# Deep clean all node_modules and reinstall
pnpm -r exec rm -rf node_modules
pnpm install
```

### WASM-Build-Fehler

Wenn die Erstellung eines Forge-Webskript-Artefakts fehlschlägt, überprüfen Sie die Diagnose des Compilers
und überprüfen Sie das ausgewählte statische oder dynamische Linkprofil. Der
`@mission-platform/hunspell` Für den Emscripten-Build ist zusätzlich Docker erforderlich
laufen.
