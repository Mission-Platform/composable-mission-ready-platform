# Best Practices der Missionsplattform

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> Englische Quelle: [docs/best-practices.md](../../best-practices.md)
> Sprache: Deutsch (de)

Dieses Dokument beschreibt die Grundprinzipien, Architektur und Codierungsstandards für das Mission Platform Monorepo. Es
dient als **Erklärung**, warum wir bestimmten Mustern folgen, und als **Leitlinie** für die tägliche Entwicklung.

## Grundprinzipien

### Zusammensetzbare Architektur

Mission Platform folgt einer paketgesteuerten, zusammensetzbaren Architektur. Wiederverwendbare Bausteine (UI-Komponenten,
Composables, Dienstprogramme) leben in `packages/`, während aus diesen Blöcken bereitstellbare Anwendungen zusammengestellt werden `apps/`.

### Abhängigkeitsdisziplin

Um ein wartbares Monorepo aufrechtzuerhalten, erzwingen wir einen strikten einseitigen Abhängigkeitsfluss:

- **`apps`** → **`packages`** / **`vite-plugins`** / **`workers`**
- **`packages`** / **`vite-plugins`** / **`workers`** → **`configs`**
- **`apps`** → **`configs`** (Direkt für Tooling/Build-Konfiguration)

**Regel:** Code eingeben `packages/` darf **niemals** aus importieren `apps/`. Dies verhindert zirkuläre Abhängigkeiten und stellt sicher
Pakete bleiben wirklich wiederverwendbar.

### Bilderbuch als Werkbank

Beim Hinzufügen oder Ändern von Komponenten in `packages/`, verwenden Sie die Storybook-App (`apps/storybook`) als Ihre primäre Entwicklung
Umgebung. Der `apps/storybook` Die App enthält nicht die Storys selbst – sie ist die Aggregations-Workbench
entdeckt und gibt die Geschichten wieder, die neben ihren Komponenten leben.

- Ordnen Sie alle gemeinsam an `.stories.tsx` Datei mit ihrer Komponente im Paketverzeichnis dieser Komponente (z. B.
  `packages/components/src/components/**/<component>/<component>.stories.tsx`), nicht unter `apps/storybook`. Das passt
  die Konvention in [Atomares Komponentendesign](atomic-component-design.md).
- Überprüfen Sie das Verhalten der Komponenten übergreifend Vue, React, Svelte, Solidund Webkomponenten durch Umschalten der
  `STORYBOOK_FRAMEWORK` Umgebungsvariable. Jeder Modus muss das gleiche neutrale Story-Inventar verbrauchen; ein Vermisster
  Framework-Artefakt ist ein Paket-/Exportfehler und kein Grund, diese Geschichte herauszufiltern.

Die vollständige statische Validierungsschleife ist:

```bash
for framework in vue react svelte solid web-component; do
  STORYBOOK_FRAMEWORK="$framework" pnpm --filter @mission-platform/storybook run build-storybook
done
```

## Entwicklungsstandards

### TypeScript Überall

Der gesamte neue Quellcode muss eingeschrieben werden TypeScript (`.ts`) oder Vue SFCs mit `<script setup lang="ts">`.

- **Strenger Modus**: `strict: true` wird überall durchgesetzt `tsconfig.json` Dateien.
- **Explizite Typen**: Stellen Sie explizite Typen für alle öffentlichen APIs, exportierten Funktionen und Composables bereit.
- **Vermeiden `any`**: Verwenden Sie präzise Typen oder Generika. Wenn ein Typ wirklich unbekannt ist, verwenden Sie `unknown` und führen Sie eine Typeingrenzung durch.

### Framework-neutrale Komponenten

Wenn möglich, erstellen Sie UI-Komponenten mithilfe von `@mission-platform/forge` Dialekt. Dadurch können Komponenten sein
zusammengestellt und verwendet Vue, React, Svelte, Solidund Webkomponenten, ohne die Kernlogik neu zu schreiben. Konfigurieren Sie die
Verbraucher-Resolver mit dem Matching `mp:vue`, `mp:react`, `mp:svelte`, `mp:solid`, oder `mp:web-component` Zustand.

### Reaktivitätsmuster (Vue 3)

- Verwenden Sie ausschließlich die **Composition API**.
- Bevorzugen `ref()` für die meisten Staaten, um die Konsistenz aufrechtzuerhalten.
- Extrahieren Sie komplexe Zustandslogik in **Composables** (`useXxx`).
– Stellen Sie sicher, dass alle Nebenwirkungen (Beobachter, Intervalle, Ereignis-Listener) ordnungsgemäß bereinigt werden `onUnmounted`.

## Monorepo-Workflow

### Isolierung von Bedenken

- **Neue UI-Komponenten**: Gehören dazu `packages/`.
- **Shared Utilities**: Gehören dazu `packages/`.
- **Lint/Format/Build Tooling**: Gemeinsam genutzte Konfigurationen gehören dazu `configs/`.

### Linting und Formatierung

Ein konsistenter Codestil wird durch erzwungen ESLint Und Prettier.

- Laufen `pnpm lint` um auf Verstöße zu prüfen.
- Laufen `pnpm format:write` um Formatierungsprobleme automatisch zu beheben.
- Commit-Nachrichten müssen der **Conventional Commits**-Spezifikation entsprechen.

## Leistungsoptimierung

- **Code-Splitting**: Dynamisch verwenden `import()` für unkritische Funktionen und große Bibliotheken.
- **Asset-Optimierung**: Bevorzugen Sie moderne Bildformate (WebP/AVIF) und stellen Sie sicher, dass alle statischen Assets komprimiert sind.
- **Reaktivitätsaufwand**: Verwenden `shallowRef` für große Objekte, die keine tiefe Reaktivität erfordern.

## Prüfung und Dokumentation

- **Testgetriebene Entwicklung**: Jede neue Funktion oder Fehlerbehebung sollte von Unit-Tests begleitet werden (`.spec.ts`).
- **Diátaxis-Dokumentation**: Autorendokumentation nach dem Diátaxis-Framework (Tutorials, Anleitungen, Referenzen,
  Erklärung).
- **TSDoc**: Verwenden Sie TSDoc/JSDoc für alle öffentlich zugänglichen Methoden und Eigenschaften, um die IDE-Intelligenz zu unterstützen.

## Verwandte Ressourcen

- [Testleitfaden](testing.md)
- [Best Practices für Frameworks](framework-best-practices.md)
- [Arbeitsbereichsstruktur](workspace-structure.md)
- [Fehlerbehebung](troubleshooting.md)
