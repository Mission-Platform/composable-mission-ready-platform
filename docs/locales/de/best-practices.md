# Best Practices der Missionsplattform

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/best-practices.md: [docs/best-practices.md](../../best-practices.md)
> Sprache: Deutsch (de)

Dieses Dokument beschreibt die Grundprinzipien, Architektur und Codierungsstandards für das Mission Platform Monorepo. Es
dient als **Erklärung**, warum wir bestimmten Mustern folgen, und als **Leitlinie** für die tägliche Entwicklung.

## Grundprinzipien

### Zusammensetzbare Architektur

Mission Platform folgt einer paketgesteuerten, zusammensetzbaren Architektur. Reusable building blocks (UI components,
Composables, Dienstprogramme) befinden sich in `packages/`, während bereitstellbare Anwendungen aus diesen Blöcken in `apps/` zusammengestellt werden.

### Abhängigkeitsdisziplin

Um ein wartbares Monorepo aufrechtzuerhalten, erzwingen wir einen strikten einseitigen Abhängigkeitsfluss:

- **`apps`** → **`packages`**
- **`packages`** → Domänenpakete auf niedrigerer Ebene wie **`core`**, **`tooling`** und **`compiler`**

**Regel:** Code in `packages/` darf **niemals** aus `apps/` importiert werden. Dies verhindert zirkuläre Abhängigkeiten und stellt sicher
Pakete bleiben wirklich wiederverwendbar.

### Bilderbuch als Werkbank

Wenn Sie Komponenten in `packages/` hinzufügen oder ändern, verwenden Sie die Storybook-App (`apps/storybook`) als primäre Entwicklung
Umgebung. Die `apps/storybook`-App enthält nicht die Storys selbst – sie ist die Aggregations-Workbench
entdeckt und gibt die Geschichten wieder, die neben ihren Komponenten leben.

- Platzieren Sie jede `.stories.tsx`-Datei zusammen mit ihrer Komponente im Paketverzeichnis dieser Komponente (z. B.
  `packages/ui/components/src/components/**/<component>/<component>.stories.tsx`), nicht unter `apps/storybook`. Das passt
  die Konvention in [Atomic Component Design](atomic-component-design.md).
- Überprüfen Sie das Komponentenverhalten in Vue, React, Svelte, Solid und Webkomponenten, indem Sie die umschalten
  Umgebungsvariable `STORYBOOK_FRAMEWORK`. Jeder Modus muss das gleiche neutrale Story-Inventar verbrauchen; ein Vermisster
  Framework-Artefakt ist ein Paket-/Exportfehler und kein Grund, diese Geschichte herauszufiltern.

Die vollständige statische Validierungsschleife ist:

```bash
for framework in vue react svelte solid web-component; do
  STORYBOOK_FRAMEWORK="$framework" pnpm --filter @mission-platform/storybook run build-storybook
done
```

## Entwicklungsstandards

### TypeScript Überall

Der gesamte neue Quellcode muss in den SFCs TypeScript (`.ts`) oder Vue mit `<script setup lang="ts">` geschrieben werden.

- **Strenger Modus**: `strict: true` wird für alle `tsconfig.json`-Dateien erzwungen.
- **Explizite Typen**: Stellen Sie explizite Typen für alle öffentlichen APIs, exportierten Funktionen und Composables bereit.
- **`any` vermeiden**: Verwenden Sie präzise Typen oder Generika. Wenn ein Typ wirklich unbekannt ist, verwenden Sie `unknown` und führen Sie eine Typeingrenzung durch.

### Framework-neutrale Komponenten

Erstellen Sie UI-Komponenten nach Möglichkeit mit dem `@mission-platform/forge-jsx`-Dialekt. Dadurch können Komponenten sein
kompiliert und in Vue, React, Svelte, Solid und Webkomponenten verwendet, ohne die Kernlogik neu zu schreiben. Konfigurieren Sie die
Verbraucher-Resolver mit der passenden Bedingung `mp:vue`, `mp:react`, `mp:svelte`, `mp:solid` oder `mp:web-component`.

### Reaktivitätsmuster (Vue 3)

- Verwenden Sie ausschließlich die **Composition API**.
– Bevorzugen Sie `ref()` für die meisten Staaten, um die Konsistenz zu wahren.
- Extrahieren Sie komplexe Zustandslogik in **Composables** (`useXxx`).
– Stellen Sie sicher, dass alle Nebenwirkungen (Beobachter, Intervalle, Ereignis-Listener) in `onUnmounted` ordnungsgemäß bereinigt werden.

## Monorepo-Workflow

### Isolierung von Bedenken

- **Neue UI-Komponenten**: Gehören zu `packages/`.
- **Gemeinsame Dienstprogramme**: Gehören zu `packages/`.
- **Lint/Format/Build Tooling**: Freigegebene Konfigurationen gehören in `packages/tooling/configs/`.

### Linting und Formatierung

Ein konsistenter Codestil wird über ESLint und Prettier erzwungen.

– Führen Sie `pnpm lint` aus, um nach Verstößen zu suchen.
– Führen Sie `pnpm format:write` aus, um Formatierungsprobleme automatisch zu beheben.
- Commit-Nachrichten müssen der **Conventional Commits**-Spezifikation entsprechen.

### Upstream-Abhängigkeitspriming und Pakettests

In einem modularen Monorepo importieren Downstream-Pakete häufig Build-Ausgaben (`dist/`) von Upstream-Paketen. So vermeiden Sie Fehler bei Clean-State-Tests und vermeiden die manuelle Verfolgung der Build-Reihenfolge mehrerer Pakete:

1. **Automatisiertes Upstream-Build-Priming (`^build`)**:
   `turbo.json`-Aufgabendiagramme definieren `test`, `build:check` und Verifizierungsaufgaben mit `"dependsOn": ["^build"]`. Beim Ausführen einer beliebigen Test- oder Typprüfungsaufgabe über Turborepo werden zunächst automatisch alle Upstream-Arbeitsbereichsabhängigkeiten erstellt.

2. **Paketbezogene Ausführung**:
   So testen oder erstellen Sie ein einzelnes Paket, ohne die Voraussetzungen manuell zu kompilieren:
   - Führen Sie Tests mit Grundierung durch:
     ```bash
     pnpm test:package <package-name>
     ```
     oder direkt über Turborepo:
     ```bash
     pnpm exec turbo run test --filter <package-name>
     ```
   - Erstellen Sie ein Paket mit seinen Abhängigkeiten:
     ```bash
     pnpm build:package <package-name>
     ```
     oder direkt über Turborepo:
     ```bash
     pnpm exec turbo run build --filter <package-name>
     ```

   In Turbo-Filtern wählt `<package-name>...` das Paket UND seinen Upstream aus
   Abhängigkeiten, `...<package-name>` wählt das Paket UND seinen Downstream aus
   Abhängige, und `<package-name>^...` wählt nur den Upstream des Pakets aus
   Abhängigkeiten (mit Ausnahme des Pakets selbst). Die Pakethilfsprogramme werden explizit ausgeführt
   das Upstream-Formular (`<package-name>^...`) zuerst, um Paket-Workflows direkt zu steuern
   ein vorhersehbares, gut kalkulierbares Aufwärmen haben; die `^build`-Abhängigkeit des Aufgabendiagramms
   bleibt das Sicherheitsnetz für direkte Turborepo-Aufrufe.

3. **Worktree-Bereitstellung**:
   Wenn neue Git-Arbeitsbäume über `pnpm worktree:create` bereitgestellt oder über `pnpm worktree:setup` initialisiert werden, werden Upstream-Abhängigkeiten automatisch vorbereitet, bevor Validierungsprüfungen ausgeführt werden, um sicherzustellen, dass neu erstellte Arbeitsbäume sofort betriebsbereit sind.

## Leistungsoptimierung

- **Code-Splitting**: Verwenden Sie dynamisches `import()` für unkritische Funktionen und große Bibliotheken.
- **Asset-Optimierung**: Bevorzugen Sie moderne Bildformate (WebP/AVIF) und stellen Sie sicher, dass alle statischen Assets komprimiert sind.
- **Reaktivitätsaufwand**: Verwenden Sie `shallowRef` für große Objekte, die keine tiefe Reaktivität erfordern.

## Prüfung und Dokumentation

- **Testgetriebene Entwicklung**: Jede neue Funktion oder Fehlerbehebung sollte von Unit-Tests begleitet werden (`.spec.ts`).
- **Diátaxis-Dokumentation**: Autorendokumentation nach dem Diátaxis-Framework (Tutorials, Anleitungen, Referenzen,
  Erklärung).
- **TSDoc**: Verwenden Sie TSDoc/JSDoc für alle öffentlich zugänglichen Methoden und Eigenschaften, um die IDE-Intelligenz zu unterstützen.

## Verwandte Ressourcen

- [Testleitfaden](testing.md)
- [Best Practices für das Framework](framework-best-practices.md)
- [Arbeitsbereichsstruktur](workspace-structure.md)
- [Fehlerbehebung](troubleshooting.md)
