# Build-System

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/build-system.md: [docs/build-system.md](../../build-system.md)
> Sprache: Deutsch (de)

In diesem Dokument werden die Architektur und die Mechanik des Build-Systems der Mission Platform erläutert. Es ist für hohe Ansprüche konzipiert
Leistung, inkrementelle Builds und Multi-Framework-Paketverteilung.

## Kernarchitektur

Die Mission Platform verwendet ein mehrstufiges Build-System, das die Aufgabenorchestrierung von der Kompilierung einzelner Arbeitsbereiche trennt.

### 1. Aufgabenorchestrierung (Turborepo)

**Turborepo** ist der Orchestrator der obersten Ebene. Es verwaltet das Abhängigkeitsdiagramm zwischen Arbeitsbereichen und stellt Caching bereit
alle Aufgaben.

- **Pipeline definiert in `turbo.json`**: Aufgaben wie `build`, `test` und `lint` werden mit ihren Abhängigkeiten definiert
  (z. B. hängt `build` von `^build` ab, was bedeutet, dass alle Abhängigkeiten zuerst erstellt werden müssen).
- **Hashing**: Turborepo hasht Quelldateien, Umgebungsvariablen und globale Abhängigkeiten, um festzustellen, ob eine Aufgabe vorhanden ist
  Die Ausgabe kann aus dem Cache wiederverwendet werden.
- **Parallelität**: Unabhängige Aufgaben werden gleichzeitig ausgeführt, um die CPU-Auslastung zu maximieren.

### 2. Paketzusammenstellung (tsdown)

Die meisten Bibliothekspakete in `packages/` verwenden **tsdown** zur Kompilierung.

- **Geschwindigkeit**: Aufbauend auf **Rolldown** (dem Rust-basierten Nachfolger von Rollup) und ermöglicht nahezu sofortige Builds.
- **Entbündelung**: Pakete werden mit `unbundle: true` erstellt, wobei die ursprüngliche Modulstruktur in `dist/` erhalten bleibt. Dies
  sorgt für optimales Tree-Shaking und besseres Debugging in Verbraucheranwendungen.
- **CSS-Threading**: Ein benutzerdefiniertes Plugin verknüpft extrahierte Stylesheets wieder mit den zugehörigen JS-Modulen und stellt so sicher
  Beim Importieren einer Komponente werden automatisch deren Stile übernommen.

### 3. Anwendungsbündelung (Vite)

Bereitstellbare Anwendungen in `apps/` verwenden **Vite** für die Entwicklungs- und Produktionsbündelung.

- **Gemeinsame Konfigurationen**: Apps erweitern `@mission-platform/vite-config`, um konsistente PostCSS-Pipelines sicherzustellen und
  Framework-agnostische Auflösung.
- **SSR/SSG-Unterstützung**: Anwendungen wie `my-care-notes` verwenden `vite-ssg` für die statische Site-Generierung.

### Forge-Paket-Builds

Forge-Paket-Builds fügen dem normalen `tsdown`- oder Vite-Ablauf ein neutrales Compiler-Frontend hinzu. Ein verbrauchendes Paket wird importiert
die gewünschten Framework-Plugins und übergibt explizite Instanzen an `tsdownForgeComponentPlugins` oder
`tsdownForgeHookPlugins` innerhalb eines `defineTsdownLibrary`-Aufrufs. Der neutrale Treiber erstellt einmal semantische IR, dann besitzt das ausgewählte Plugin die Zielabsenkung,
Quellgenerierung, Deklarationen, Laufzeit-Externals und sein nativer Vite/tsdown-Adapter.

Die Ausgabe auf der Inhaltsplattform ist eine zweite, orthogonale Achse, die über `@mission-platform/forge-cms-plugin-api` konfiguriert wird. A
Der Verbraucher übergibt `tsdownForgeCmsPlugins` jeweils eine Liste von `CmsOutputPlugin`-Instanzen
welches ein Framework-Plugin _zusammensetzt_ – `forgeStoryblokCms({ packageName, plugin, storyblokRuntime })`,
`forgeAstroCms({ packageName, plugin })` usw. für Ghost, Jekyll und Webflow. Denn die Plattform und die
Frameworks werden unabhängig ausgewählt, `storyblok × vue` und `astro × solid` sind Konfigurationen und kein neuer Code.

CMS-Builds werden an `dist/cms/<cms>/<framework>/**` ausgegeben, wobei Manifeste und andere Plattform-Sidecars darin gespiegelt werden
`dist/cms/<cms>/`. Ziele, die eine hydratisierte Laufzeit benötigen (Astro, Webflow), generieren gemeinsam einen Inselbaum aus der Grenze
Framework-Plugin in denselben Build integrieren. Die vollständige Verantwortungsaufteilung und Phasengrenzen sind in beschrieben
[Forge-Compiler-Pipeline](../../../packages/tooling/vite/forge/docs/locales/de/reference/compiler.md).

## Bauvertrag

`pnpm build` ist der kanonische Aggregat-Build. Es delegiert an die `build`-Aufgabe auf Paketebene von Turbo, ohne a festzulegen
Framework-Selektor, sodass jedes Forge-Paket seine neutrale Ausgabe und jedes dadurch konfigurierte Framework-Ziel ausgibt
Paket. Pakete mit CMS-Projektionen geben diese Projektionen und ihre gemeinsamen Sidecars im selben gestaffelten Build aus.

```bash
pnpm build
pnpm build:force                 # the same aggregate build, ignoring Turbo's cache
pnpm exec turbo run build --filter @mission-platform/components
```

Forge-Pakete behalten auch dünne Kompatibilitätsaliase für die Neuerstellung eines Ziels bei:

```bash
pnpm --filter @mission-platform/components run build:forge
pnpm --filter @mission-platform/components run build:vue
pnpm --filter @mission-platform/components run build:react
pnpm --filter @mission-platform/components run build:svelte
pnpm --filter @mission-platform/components run build:solid
pnpm --filter @mission-platform/components run build:web-components
```

Die Aliase verwenden denselben typisierten Runner wie `build`; Sie enthalten keine unabhängigen `tsdown`-Implementierungen. `build:forge`
wählt das neutrale Ziel aus, während die Framework-Aliase das entsprechende Framework-Verzeichnis auswählen. Paketspezifisch
Befehle im CMS-Artefaktmodus bleiben dort verfügbar, wo sie verfügbar sind, einschließlich des Befehls „Shared Storyblok Assets“ und des
Storyblok-Wrapper-Befehle pro Framework.

### Inszenierung und Promotion

Jeder Forge-Aufruf schreibt in eine eindeutige paketlokale Phase unter `node_modules/.cache/forge-build/`. Die Bühne ist
wird von den Eingaben von Turbo ignoriert und nie veröffentlicht. Ein erfolgreicher Build wird vor der Heraufstufung auf die Ausgabe überprüft:

- **Aggregate-Modus** ersetzt atomar den kompletten Forge-eigenen `dist`-Baum. Veraltete Neutral-, Framework- und CMS-Dateien
  werden daher entfernt, anstatt die Exporte versehentlich zu erfüllen.
- **Gezielter Modus** ersetzt atomar nur den ausgewählten Framework-Teilbaum (und seinen passenden CMS-Wrapper-Teilbaum),
  Beibehaltung unabhängiger Neutral-, Framework-, E-Mail- und CMS-Ausgaben bereits in `dist`. Der Läufer prüft den CMS-Selektor
  (z. B. `FORGE_CMS_STORYBLOK_TARGET`) zum angeforderten Framework neben `FORGE_FRAMEWORK_TARGET`, also dem CMS eines Pakets
  Durch die Verkabelung (`forgeStoryblokCmsTargets` usw.) wird der passende Wrapper tatsächlich in derselben Phase neu erstellt, anstatt dass er vorhanden ist
  wurde stillschweigend von der Beförderung ausgeschlossen. Durch die Promotion wird nur ein CMS-Wrapper-Teilbaum gelöscht, der von der Stufe neu generiert wurde. es nie
  löscht einen Geschwister-CMS-Wrapper, den der aktuelle Build nicht neu erstellt hat.
- Gemeinsame CMS-Assets wie Storyblok-Schemas und `components.json` haben ein gemeinsames Ziel und werden nicht von einem gelöscht
  spätere Rahmenförderung.
– Ein Compilerfehler, eine leere Phase oder ein Hochstufungsfehler lässt den zuvor veröffentlichten Baum unberührt und entfernt den
  temporäres Bühnen- und Promotionverzeichnis.

Die veröffentlichte Ausgabe bleibt unter dem bestehenden `dist`-Vertrag: neutrale Module und Deklarationen, Framework-Verzeichnisse
(`vue`, `react`, `svelte`, `solid`, `web-components`) und CMS-Projektionen unter `cms/<cms>/<framework>`. Paketexport
Karten, einschließlich `mp:*`-Bedingungen und CMS-Unterpfade, werden weiterhin anhand dieser heraufgestuften Pfade aufgelöst.

### Paketaufgaben

| Aufgabe | Beschreibung |
| :----------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `build` | Aggregieren Sie Neutral-, Framework-, Deklarations-, E-Mail- und konfigurierte CMS-Ausgaben über den gemeinsamen Forge-Runner. |
| `build:forge` | Gezielter neutraler Forge-Ausgabekompatibilitätsalias.                                                           |
| `build:react`, `build:vue`, `build:svelte` | Gezielte Framework-Kompatibilitätsaliase.                                                                    |
| `build:solid`, `build:web-components` | Gezielte Framework-Kompatibilitätsaliase.                                                                    |
| `build:check` | Validiert Typen für einen Arbeitsbereich, ohne die Ausgabe zu veröffentlichen.                                                   |
| `build:watch` | Startet einen inkrementellen Build im Überwachungsmodus für einen Arbeitsbereich.                                                   |

Turbo hasht die Zielselektoren (`FORGE_BUILD_TARGET` und die alten Forge/CMS-Selektoren) zusammen mit den freigegebenen
Runner- und Staging-Quellen. Folglich können aggregierte und gezielte Builds das zwischengespeicherte Ergebnis des anderen nicht wiederverwenden. Endgültig
`dist/**`-Ausgabe wird zwischengespeichert; Temporäre Staging- und Promotion-Verzeichnisse sind ausdrücklich ausgeschlossen.

### Phasen der Anwendungserstellung

Anwendungen, die unabhängig voneinander sinnvolle Build-Stufen haben, stellen diese Stufen als Turbo-Aufgaben und nicht als Verkettung zur Verfügung
sie in `build`:

- `@mission-platform/docs` führt `build:check`, `build:bundle`, `build:prerender` und `build:verify` der Reihe nach aus.
– `@mission-platform/figma-forge-plugin` führt `build:check`, `build:ui` und `build:main` über seine aggregierte `build`-Aufgabe aus.
– `@mission-platform/icons` führt `build:check`, `build:generate` und `build:sprite` über seine aggregierte `build`-Aufgabe aus.

Die Aggregatskripte überprüfen lediglich, ob die aufgabeneigene Ausgabe vorhanden ist. Turbo besitzt Planung, Abhängigkeitsreihenfolge und
Cache-Wiederherstellung. Dadurch bleiben die einzelnen Phasen beobachtbar und es werden verschachtelte Turbo-Aufrufe oder Builds auf Shell-Ebene vermieden
Orchestrierung.

### Caching-Strategie

Turborepo speichert die folgenden Artefakte zwischen:

- `dist/**`: JS/CSS-Artefakte erstellt.
- `.vite/**`: Interner Cache von Vite.
- `coverage/**`: Testabdeckungsberichte.

Um den Cache zu umgehen und einen neuen Build zu erzwingen, verwenden Sie das Flag `--force`:

```bash
pnpm build:force
```

Nur Deklarationsaufgaben können ebenfalls zwischengespeichert werden: `build:types` zeichnet `dist/**/*.d.ts` und Deklarationszuordnungen als Ausgaben auf
Zielgerichtete Builds stellen die Dateien wieder her, die von Downstream-Paketen benötigt werden.

Die Kompatibilitätsaliase und CMS-Artefaktmodus-Aufgaben sind Paketaufgaben, daher wendet Turbo weiterhin ihr Abhängigkeitsdiagramm und an
zielspezifische Cache-Eingaben. Temporäre Stufen sind keine Cache-Ausgaben; nur der hochgestufte `dist`-Baum wird veröffentlicht oder
aus dem Cache wiederhergestellt.

## Gemeinsame Konfigurationen

Build-Konfigurationen werden im `packages/tooling/configs/`-Verzeichnis zentralisiert, um die Konsistenz im gesamten Monorepo aufrechtzuerhalten.

| Paket | Zweck |
| :------------------------------------ | :----------------------------------------------------------- |
| `@mission-platform/vite-config` | Gemeinsame Vite-Logik für Apps und Vue-spezifische Builds.          |
| `@mission-platform/tsdown-config` | Gemeinsame Tsdown-Logik für Bibliothekspakete.                    |
| `@mission-platform/typescript-config` | Basis-`tsconfig.json`-Voreinstellungen für Apps, Bibliotheken und Tests. |
| `@mission-platform/postcss-config` | Standardisierte CSS-Verarbeitung (Autoprefixer usw.).            |

## TypeScript 7 Toolchain

Der Arbeitsbereichskatalog heftet den Compiler an den stabilen TypeScript `7.0.2`. Arbeitsbereichsprüfungen und Deklarationserstellungen verwenden die
native ausführbare `tsc`-Datei, während Editor-Integrationen den nativen Sprachserver von TypeScript verwenden:

```bash
pnpm exec tsc --version
pnpm exec tsc --lsp --stdio
```

Gemeinsame Voreinstellungen in `@mission-platform/typescript-config` bleiben die Quelle der Wahrheit für Ziel, Modulauflösung,
Umgebungstypen, Strenge, Projektverweise und Deklarationsausgabe. Forge- und CMS-Tools verwenden das entfernte nicht
TypeScript Compiler-API; Stattdessen werden die parserneutralen/OXC-Verträge des Repositorys genutzt. Diese Grenze hat auch Macht
Der Paketdokumentationsscanner sorgt dafür, dass die generierte Forge-Ausgabe unabhängig von den Interna der Compiler-API bleibt.

Kompilierte JavaScript- und Deklarationsdateien werden nur in das `dist`-Verzeichnis des besitzenden Pakets ausgegeben. Forge ist generiert
Der Framework-Quellbaum ist eine temporäre Build-Eingabe und wird nach Abschluss des Bundles entfernt. es darf `*.js` oder nicht verlassen
`*.d.ts`-Dateien unter `src` oder Cache-Verzeichnissen auf Paketebene.

Vue-target-Paketdeklarationen werden vom Deklarations-Plugin Forge `tsdown` synthetisiert. Dieser Pfad gibt Pakete aus
Deklarationen ohne Aufruf von `vue-tsc`; Es bietet keine Typprüfung für SFC-Vorlagen beliebiger Anwendungen.
Anwendungs-SFC-Prüfungen bleiben ein explizites Akzeptanztor und erfordern derzeit einen Upstream-TypeScript 7-kompatiblen
`vue-tsc`-Release. Das verfügbare `vue-tsc@3.3.11` schlägt gegen TypeScript `7.0.2` fehl
`ERR_PACKAGE_PATH_NOT_EXPORTED` für `typescript/lib/tsc`, während das native `tsc` absichtlich keine Typprüfung für `.vue` durchführt
Dateien. Fügen Sie keinen TypeScript 6-Kompatibilitätsalias hinzu, um diese Grenze zu umgehen.

Die gemeinsam genutzte ESLint-Konfiguration verwendet `@babel/eslint-parser` für TypeScript, TSX und Vue-Syntax und eine kleine
Repository-eigenes Kompatibilitäts-Plugin für die beibehaltenen `@typescript-eslint/no-explicit-any` und
`@typescript-eslint/consistent-type-imports` Regel-IDs. Dies ist absichtlich nur syntaktisch: die aktuelle
Die `typescript-eslint`-Version lehnt TypeScript 7 ab, daher werden typbewusste Lint-Regeln durch die gemeinsam genutzten TypeScript ersetzt
`noUnusedLocals` und `noUnusedParameters` prüfen, bis eine kompatible Upstream-Version verfügbar ist.

## Lokale Entwicklung vs. Produktion

### Entwicklung (Aufgabe `dev`)

Der Entwicklungsserver von Vite bietet Hot Module Replacement (HMR). Wenn die `dev`-Aufgabe einer App startet, wird auch Turborepo ausgeführt
Die `build:watch`-Aufgabe der Komponentenbibliothek daneben (über den `with`-Schlüssel der Aufgabe), also bearbeitet
`@mission-platform/components` werden automatisch neu kompiliert und von der laufenden App übernommen, ohne dass eine manuelle Neuerstellung erforderlich ist.

### Produktion (Aufgabe `build`)

Turborepo führt Builds in topologischer Reihenfolge aus. Ein Paket wird erst erstellt, nachdem alle seine internen Abhängigkeiten erfüllt sind
erfolgreich gebaut. Die Ausgabe in `dist/` ist das, was schließlich veröffentlicht oder bereitgestellt wird.

## Erweitert: WASM-Integration

Bestimmte Pakete (z. B. `@mission-platform/hunspell`, Barcode-Scanner) beinhalten Rust-Code, der zu WebAssembly kompiliert wurde. Diese
Builds werden über spezielle Aufgaben orchestriert, die `wasm-pack` verwenden, um die Konsistenz und optimale Umgebung sicherzustellen
Leistung.
