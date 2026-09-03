# Build-System

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/build-system.md: [docs/build-system.md](../../build-system.md)
> Sprache: Deutsch (de)

In diesem Dokument werden die Architektur und die Mechanik des Build-Systems der Mission Platform erläutert. Es ist für hohe Ansprüche konzipiert
Leistung, inkrementelle Builds und Multi-Framework-Paketverteilung.

## Kernarchitektur

Die Mission Platform verwendet ein mehrstufiges Build-System, das die Orchestrierung von Aufgaben von der Kompilierung einzelner Arbeitsbereiche trennt.

### 1. Aufgabenorchestrierung (Turborepo)

**Turborepo** ist der Orchestrator der obersten Ebene. Es verwaltet das Abhängigkeitsdiagramm zwischen Arbeitsbereichen und stellt Caching bereit
alle Aufgaben.

- **Pipeline definiert in `turbo.json`**: Aufgaben wie `build`, `test`, Und `lint` werden mit ihren Abhängigkeiten definiert
  (z. B. `build` hängt davon ab `^build`, was bedeutet, dass alle Abhängigkeiten zuerst erstellt werden müssen).
- **Hashing**: Turborepo hasht Quelldateien, Umgebungsvariablen und globale Abhängigkeiten, um festzustellen, ob eine Aufgabe vorhanden ist
  Die Ausgabe kann aus dem Cache wiederverwendet werden.
- **Parallelität**: Unabhängige Aufgaben werden gleichzeitig ausgeführt, um die CPU-Auslastung zu maximieren.

### 2. Paketzusammenstellung (tsdown)

Die meisten Bibliothekspakete in `packages/` Verwenden Sie **tsdown** zum Kompilieren.

- **Geschwindigkeit**: Aufbauend auf **Rolldown** (dem Rust-basierten Nachfolger von Rollup) und ermöglicht nahezu sofortige Builds.
- **Entbündelung**: Pakete werden mit erstellt `unbundle: true`, wobei die ursprüngliche Modulstruktur erhalten bleibt `dist/`. Dies
  sorgt für optimales Tree-Shaking und besseres Debugging in Verbraucheranwendungen.
- **CSS-Threading**: Ein benutzerdefiniertes Plugin verknüpft extrahierte Stylesheets wieder mit den zugehörigen JS-Modulen und stellt so sicher
  Beim Importieren einer Komponente werden automatisch deren Stile übernommen.

### 3. Anwendungsbündelung (Vite)

Bereitstellbare Anwendungen in `apps/` verwenden **Vite** für Entwicklungs- und Produktionsbündelung.

- **Shared Configs**: Apps erweitern `@mission-platform/vite-config` um konsistente PostCSS-Pipelines sicherzustellen und
  Framework-agnostische Auflösung.
- **SSR/SSG-Unterstützung**: Anwendungen wie `my-care-notes` verwenden `vite-ssg` für die statische Site-Generierung.

### Forge-Paket-Builds

Forge-Paket-Builds fügen dem Normalen ein neutrales Compiler-Frontend hinzu `tsdown` oder Vite fließen. Ein verbrauchendes Paket wird importiert
die gewünschten Framework-Plugins und übergibt explizite Instanzen an diese `defineTsdownForgeComponents` oder
`defineTsdownForgeHooks`. Der neutrale Treiber erstellt einmal semantische IR, dann besitzt das ausgewählte Plugin die Zielabsenkung,
Quellgenerierung, Deklarationen, Laufzeit-Externals und ihre nativen Elemente Vite/tsdown-Adapter.

Die Ausgabe der Inhaltsplattform erfolgt über eine zweite, orthogonale Achse, die durch konfiguriert ist `@mission-platform/forge-cms-plugin-api`. A
Verbraucherpässe `defineTsdownForgeCms` (oder `defineTsdownForgeCmsAll`) eine Liste von `CmsOutputPlugin` Instanzen, jede von
welches ein Framework-Plugin _zusammensetzt_ — `forgeStoryblokCms({ packageName, plugin, storyblokRuntime })`,
`forgeAstroCms({ packageName, plugin })`usw. für Ghost, Jekyll und Webflow. Denn die Plattform und die
Rahmen werden unabhängig gewählt, `storyblok × vue` Und `astro × solid` Es handelt sich eher um Konfiguration als um neuen Code.

CMS-Builds senden an `dist/cms/<cms>/<framework>/**`, mit gespiegelten Manifesten und anderen Plattform-Sidecars
`dist/cms/<cms>/`. Ziele, die eine hydratisierte Laufzeit benötigen (Astro, Webflow), generieren gemeinsam einen Inselbaum aus der Grenze
Framework-Plugin in denselben Build integrieren. Die vollständige Verantwortungsaufteilung und Phasengrenzen sind in beschrieben
[Forge-Compiler-Pipeline](../../../packages/tooling/vite/forge/docs/locales/de/reference/compiler.md).

## Bauvertrag

`pnpm build` ist der kanonische Aggregataufbau. Es delegiert an Turboist auf Paketebene `build` Aufgabe ohne Einstellung a
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

Die Aliase verwenden denselben typisierten Runner wie `build`; sie enthalten keine unabhängigen `tsdown` Implementierungen. `build:forge`
wählt das neutrale Ziel aus, während die Framework-Aliase das entsprechende Framework-Verzeichnis auswählen. Paketspezifisch
Befehle im CMS-Artefaktmodus bleiben dort verfügbar, wo sie verfügbar sind, einschließlich des Befehls „Shared Storyblok Assets“ und des
Storyblok-Wrapper-Befehle pro Framework.

### Inszenierung und Promotion

Jeder Forge-Aufruf schreibt in eine einzigartige paketlokale Phase darunter `node_modules/.cache/forge-build/`. Die Bühne ist
ignoriert von TurboDie Eingaben werden niemals veröffentlicht. Ein erfolgreicher Build wird vor der Heraufstufung auf die Ausgabe überprüft:

- **Aggregate-Modus** ersetzt atomar den kompletten Forge-eigenen Modus `dist` Baum. Veraltete Neutral-, Framework- und CMS-Dateien
  werden daher entfernt, anstatt die Exporte versehentlich zu erfüllen.
- **Gezielter Modus** ersetzt atomar nur den ausgewählten Framework-Unterbaum (und seinen passenden CMS-Wrapper-Unterbaum),
  Beibehaltung unabhängiger Neutral-, Framework-, E-Mail- und CMS-Ausgaben, die bereits vorhanden sind `dist`. Der Läufer prüft den CMS-Selektor
  (z.B. `FORGE_CMS_STORYBLOK_TARGET`) auf den gewünschten Rahmen daneben `FORGE_FRAMEWORK_TARGET`, also das CMS eines Pakets
  Verkabelung (`forgeStoryblokCmsTargets`usw.) erstellt den passenden Wrapper tatsächlich in derselben Phase neu, anstatt ihn zu erstellen
  wurde stillschweigend von der Beförderung ausgeschlossen. Bei der Promotion wird nur ein CMS-Wrapper-Teilbaum gelöscht, der von der Stufe neu generiert wurde. es nie
  löscht einen Geschwister-CMS-Wrapper, den der aktuelle Build nicht neu erstellt hat.
- Gemeinsame CMS-Assets wie Storyblok-Schemata und `components.json` haben ein gemeinsames Ziel und werden nicht von einem gelöscht
  spätere Rahmenförderung.
– Ein Compilerfehler, eine leere Phase oder ein Hochstufungsfehler lässt den zuvor veröffentlichten Baum unberührt und entfernt den
  temporäres Bühnen- und Promotionverzeichnis.

Die veröffentlichte Ausgabe bleibt unter der bestehenden `dist` Vertrag: neutrale Module und Deklarationen, Framework-Verzeichnisse
(`vue`, `react`, `svelte`, `solid`, `web-components`)und CMS-Projektionen unten `cms/<cms>/<framework>`. Paketexport
Karten, einschließlich `mp:*` Bedingungen und CMS-Unterpfade werden weiterhin anhand dieser heraufgestuften Pfade aufgelöst.

### Paketaufgaben

| Aufgabe | Beschreibung |
| :------------ | :------------------------------------------------------------------------------------------------------- |
| `build`       | Aggregieren Sie Neutral-, Framework-, Deklarations-, E-Mail- und konfigurierte CMS-Ausgaben über den gemeinsamen Forge-Runner. |
| `build:forge` | Gezielter neutraler Forge-Ausgabekompatibilitätsalias.                                                      |
| `build:react`, `build:vue`, `build:svelte` | Gezielte Framework-Kompatibilitätsaliase.                                      |
| `build:solid`, `build:web-components` | Gezielte Framework-Kompatibilitätsaliase.                                         |
| `build:check` | Validiert Typen für einen Arbeitsbereich, ohne die Ausgabe zu veröffentlichen.                                               |
| `build:watch` | Startet einen inkrementellen Build im Überwachungsmodus für einen Arbeitsbereich.                                               |

Turbo hasht die Zielselektoren (`FORGE_BUILD_TARGET` und die alten Forge/CMS-Selektoren) zusammen mit den freigegebenen
Runner- und Staging-Quellen. Folglich können aggregierte und gezielte Builds das zwischengespeicherte Ergebnis des anderen nicht wiederverwenden. Finale
`dist/**` Die Ausgabe wird zwischengespeichert. Temporäre Staging- und Promotion-Verzeichnisse sind ausdrücklich ausgeschlossen.

### Caching-Strategie

Turborepo speichert die folgenden Artefakte zwischen:

- `dist/**`: JS/CSS-Artefakte erstellt.
- `.vite/**`: Vite's interner Cache.
- `coverage/**`: Testabdeckungsberichte.

Um den Cache zu umgehen und einen neuen Build zu erzwingen, verwenden Sie die `--force` Flagge:

```bash
pnpm build:force
```

Die Kompatibilitätsaliase und CMS-Artefaktmodus-Aufgaben sind also Paketaufgaben Turbo wendet weiterhin ihr Abhängigkeitsdiagramm an und
zielspezifische Cache-Eingaben. Temporäre Stufen sind keine Cache-Ausgaben; nur die Beförderten `dist` Baum wird veröffentlicht oder
aus dem Cache wiederhergestellt.

## Gemeinsame Konfigurationen

Build-Konfigurationen sind im zentralisiert `packages/tooling/configs/` Verzeichnis, um die Konsistenz im gesamten Monorepo aufrechtzuerhalten.

| Paket | Zweck |
| :------------------------------------ | :----------------------------------------------------------- |
| `@mission-platform/vite-config`       | Geteilt Vite Logik für Apps und Vue-spezifische Builds.          |
| `@mission-platform/tsdown-config`     | Gemeinsame Tsdown-Logik für Bibliothekspakete.                    |
| `@mission-platform/typescript-config` | Base `tsconfig.json` Voreinstellungen für Apps, Bibliotheken und Tests. |
| `@mission-platform/postcss-config`    | Standardisierte CSS-Verarbeitung (Autoprefixer usw.).            |

## Lokale Entwicklung vs. Produktion

### Entwicklung (`dev` Aufgabe)

ViteDer Entwicklungsserver von bietet Hot Module Replacement (HMR). Wenn eine App `dev` Wenn die Aufgabe gestartet wird, wird auch Turborepo ausgeführt
der Komponentenbibliothek `build:watch` Aufgabe daneben (über die Aufgabe `with` Schlüssel), also bearbeitet zu
`@mission-platform/components` werden automatisch neu kompiliert und von der laufenden App übernommen, ohne dass ein manueller Neuaufbau erforderlich ist.

### Produktion (`build` Aufgabe)

Turborepo führt Builds in topologischer Reihenfolge aus. Ein Paket wird erst erstellt, nachdem alle seine internen Abhängigkeiten erfüllt sind
erfolgreich gebaut. Die Ausgabe in `dist/` ist das, was schließlich veröffentlicht oder bereitgestellt wird.

## Erweitert: WASM-Integration

Bestimmte Pakete (z. B. `@mission-platform/hunspell`, Barcode-Scanner) beinhalten Rust-Code, der zu WebAssembly kompiliert wurde. Diese
Builds werden über spezielle Aufgaben orchestriert, die Folgendes verwenden `wasm-pack` um eine konsistente und optimale Umgebung zu gewährleisten
Leistung.
