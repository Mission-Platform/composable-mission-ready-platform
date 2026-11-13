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
| **Node.js** | `24.19.0` | Laufzeitumgebung (Aktives LTS) |
| **pnpm** | `12.4.2` | Paketmanager und Arbeitsbereich-Orchestrator |
| **Git** | Neueste stabile | Versionskontrolle |
| **Rost** | Stabile Toolchain | Optionale eigenständige Rust-Benchmark-Entwicklung |
| **Docker** | Neueste stabile | Nur für den Emscripten Hunspell-Build erforderlich |

### Versionsverwaltung (empfohlen)

Wir empfehlen die Verwendung von **nvm** (Node Version Manager), um sicherzustellen, dass Sie die richtige Node.js-Version verwenden, die in angegeben ist
Stammdatei `.nvmrc`.

```bash
nvm install
nvm use
```

Aktivieren Sie **pnpm** mit Corepack:

```bash
corepack enable
corepack prepare pnpm@12.4.2 --activate
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

Dieser Befehl löst das `prepare`-Skript aus, das **Husky** für Commit-Linting initialisiert und alle internen Funktionen sicherstellt
Paketverknüpfungen sind korrekt eingerichtet.

### SonarLint-Sprachserver

`agent-lsp.json` des Repositorys enthält den offiziellen SonarLint-Sprachserver für JavaScript und TypeScript. Die
Der Server wird als Java-Archiv und nicht als npm-Paket verteilt. Installieren Sie daher Java und erstellen oder laden Sie das herunter
`sonarlint-language-server`-Archiv von [SonarSource](https://github.com/SonarSource/sonarlint-language-server).

Legen Sie das Serverarchiv und den JavaScript-Analysator fest, bevor Sie den LSP starten:

```bash
export SONARLINT_LS_JAR=/path/to/sonarlint-language-server.jar
export SONARLINT_ANALYZERS=/path/to/sonarjs.jar
```

Die optionale Variable `SONARLINT_JAVA` kann eine ausführbare Java-Datei auswählen. Der Repository-Launcher validiert die Konfiguration
Pfade und leitet das stdio-Protokoll des Servers weiter, ohne dass ein global installierter Befehl erforderlich ist.

### 3. Überprüfen Sie die Installation

Führen Sie einen Rauchtest durch, um sicherzustellen, dass das Build-System und die Umgebung korrekt konfiguriert sind:

```bash
pnpm exec turbo run build --filter @mission-platform/forge-jsx...
```

Der `...`-Filter erstellt auch die für das Paket erforderlichen Forge-Abhängigkeiten. Die
Der neutrale Codescanner wird aus seinem Flint-Diagramm kompiliert. das tut es nicht
erfordern einen Rust- oder `wasm-pack`-Build-Schritt.

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

Von Forge unterstützte Pakete veröffentlichen die passenden `mp:vue`, `mp:react`, `mp:svelte`,
Bedingungen `mp:solid` und `mp:web-component`. Die aktive Bedingung muss sein
vom konsumierenden Bundler konfiguriert; siehe [die Compiler-Referenz](../../../packages/tooling/vite/forge/docs/locales/de/reference/compiler.md)
für das Ziel-Plugin und die Deklarationspipeline.

### Anwendungsentwicklung

So starten Sie eine bestimmte Anwendung im Entwicklungsmodus:

```bash
# Start My Care Notes (Vue 3)
pnpm exec turbo run dev --filter @mission-platform/my-care-notes
```

Die Anwendung ist normalerweise unter `http://localhost:5173` verfügbar.

### Allgemeine Befehle

| Aufgabe | Befehl | Beschreibung |
| :--------- | :------------ | :----------------------------- |
| **Bauen** | `pnpm build` | Erstellen Sie alle Apps und Pakete |
| **Test** | `pnpm test` | Alle Vitest-Suites ausführen |
| **Fussel** | `pnpm lint` | Führen Sie ESLint über das Monorepo | aus
| **Formatieren** | `pnpm format` | Überprüfen Sie die Formatierung mit Prettier |

## Fehlerbehebung

### Caches löschen

Wenn unerwartete Buildfehler auftreten, leeren Sie die Caches Turborepo und Node:

```bash
# Remove Turborepo cache
rm -rf .turbo

# Deep clean all node_modules and reinstall
pnpm -r exec rm -rf node_modules
pnpm install
```

### WASM-Build-Fehler

Wenn die Erstellung eines Flint-Artefakts fehlschlägt, überprüfen Sie die Diagnose des Compilers
und überprüfen Sie das ausgewählte statische oder dynamische Linkprofil. Die
Für den `@mission-platform/hunspell` Emscripten-Build ist zusätzlich Docker erforderlich
laufen.
