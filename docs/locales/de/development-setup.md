# Entwicklungs-Setup

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> Englische Quelle: [docs/development-setup.md](../../development-setup.md)
> Sprache: Deutsch (de)

Dieser Leitfaden bietet eine Schritt-für-Schritt-Anleitung zum Einrichten Ihrer lokalen Umgebung, um zur Mission Platform beizutragen.
Am Ende dieses Handbuchs verfügen Sie über ein funktionierendes Monorepo und können die Entwicklungstools ausführen.

## Voraussetzungen

Stellen Sie vor dem Klonen des Repositorys sicher, dass Ihr System die folgenden Anforderungen erfüllt.

### Systemanforderungen

| Werkzeug | Erforderliche Version | Zweck |
| :------------ | :---------------- | :---------------------------------------------------- |
| **Node.js** | `24.19.0`         | Laufzeitumgebung (Aktives LTS) |
| **pnpm**      | `11.21.0`         | Paketmanager und Arbeitsbereich-Orchestrator |
| **Git** | Neueste stabile | Versionskontrolle |
| **Rost** | Stabile Toolchain | Native Tests und Entwicklung von Rust/WASM-Kisten |
| **wasm-pack** | `0.15.0` über pnpm | Verpacken von Rust-Kisten als typisierte WebAssembly-Arbeitsbereiche |
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

Installieren Sie das Rust-Ziel, wenn Sie an Rust-Kisten arbeiten. Der WebAssembly-Packager wird von pinned bereitgestellt `wasm-pack` npm
Abhängigkeit während `pnpm install`:

```bash
rustup target add wasm32-unknown-unknown
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

Führen Sie einen Rauchtest durch, um sicherzustellen, dass das Build-System und die Umgebung korrekt konfiguriert sind:

```bash
pnpm exec turbo run build --filter @mission-platform/forge...
```

Der `...` erstellt auch die für das Paket erforderlichen Forge-Abhängigkeiten. Rust-Decoder und Encoder-Kisten werden getestet
nativ mit `cargo test`; ihre
`wasm-pack` Ausgänge werden in die entsprechenden geschrieben `packages/*-wasm/`
workspace durch die Paketaufgabe der Kiste, bei der es sich um das eingecheckte Paket/den Build-Vertrag handelt, der von Turborepo verwendet wird.

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
vom konsumierenden Bundler konfiguriert; sehen [die Compiler-Referenz](forge-compiler.md)
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

Wenn Rust/WASM-Pakete nicht erstellt werden können, überprüfen Sie, ob die stabile Rust-Toolchain und
`wasm32-unknown-unknown` Das Ziel wird installiert und dann ausgeführt `pnpm install` um das Angepinnte wiederherzustellen `wasm-pack` npm Abhängigkeit.
Der
`@mission-platform/hunspell` Für den Emscripten-Build muss außerdem Docker ausgeführt werden. die anderen Rust-Kisten bauen
mit der lokalen Rust-Toolchain.
