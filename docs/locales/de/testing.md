# Testen in der Mission Platform

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/testing.md: [docs/testing.md](../../testing.md)
> Sprache: Deutsch (de)

Dieses Dokument beschreibt die Teststrategie und die Tools für das Mission Platform Monorepo. Es dient sowohl als **How-to
Leitfaden** für allgemeine Testaufgaben und eine **technische Referenz** für die zugrunde liegende Konfiguration.

## Teststapel

Mission Platform verwendet einen modernen, einheitlichen Test-Stack basierend auf Vitest:

- **Vitest**: Der primäre Testläufer für einheiten-, komponenten- und browserbasierte Tests.
- **@vue/test-utils**: Standardbibliothek zum Testen von Vue-Komponenten.
- **Vitest Browsermodus (Playwright)**: Echte Browserausführung für Interaktion und visuelle Tests, sofern konfiguriert.
- **Storybook Test Runner**: Integration zwischen Storybook-Storys und Vitest für automatisierte Interaktionstests.

## Anleitung: Tests durchführen

Tests werden über Turborepo ausgeführt, um Caching und arbeitsplatzbezogene Ausführung zu nutzen.

### Führen Sie alle Tests aus

So führen Sie alle Unit- und Komponententests im gesamten Monorepo aus:

```bash
pnpm test
```

### Führen Sie Tests für einen bestimmten Arbeitsbereich durch

So führen Sie Tests für ein einzelnes Paket oder eine einzelne Anwendung aus:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

### Betroffene Tests ausführen (CI-Stil)

Für schnelleres lokales Feedback, das dem Verhalten von CI `--affected` entspricht:

```bash
pnpm exec turbo run test --affected
```

`--affected` wählt Testaufgaben für Arbeitsbereiche aus, die im Vergleich zur Basisrevision des Repositorys geändert wurden. Lassen Sie es weg, um alle auszuführen
Arbeitsbereich-Testaufgabe. Der Versicherungsschutz ist paketspezifisch; Das Komponentenpaket bietet beispielsweise Folgendes:

```bash
pnpm --filter @mission-platform/components test:coverage
```

### Watch-Modus

Verwenden Sie für die Entwicklung den Überwachungsmodus, um Tests zu Dateiänderungen erneut auszuführen:

```bash
pnpm --filter @mission-platform/components test:watch
```

### Abdeckungsberichte

So erstellen Sie einen Abdeckungsbericht mit dem `v8`-Anbieter:

```bash
pnpm --filter @mission-platform/components test:coverage
```

Berichte werden in jedem Arbeitsbereich im Verzeichnis `coverage/` ausgegeben.

## Anleitung: Tests schreiben

### Unit- und Komponententests

Tests werden zusammen mit dem Quellcode gespeichert und verwenden die Erweiterung `.spec.ts` (oder `.spec.tsx`).

```typescript
import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import ForgeButton from "./ForgeButton.vue";

describe("ForgeButton.vue", () => {
  it("renders props.label when passed", () => {
    const label = "Click Me";
    const wrapper = mount(ForgeButton, {
      props: { label },
    });
    expect(wrapper.text()).toMatch(label);
  });

  it("emits click event when clicked", async () => {
    const wrapper = mount(ForgeButton);
    await wrapper.trigger("click");
    expect(wrapper.emitted()).toHaveProperty("click");
  });
});
```

### Browsertests

Mission Platform nutzt den Browsermodus von Vitest für Tests, die eine echte DOM-Umgebung oder browserübergreifend erfordern
Überprüfung.

1. Erstellen Sie Ihre Testdatei wie gewohnt.
2. Stellen Sie sicher, dass das Paket `vitest.config.ts` den Browsermodus aktiviert (siehe Referenz unten).
3. Führen Sie mit `pnpm test` aus.

### Forge-Webskripttests

Verwenden Sie `@mission-platform/forge-web-script-vitest` für deterministischen Compiler, Artefakt, Wasm und selbstgehostete Parität
Schecks. Es delegiert die Kompilierung an denselben Compilerdienst und dasselbe Vite-Plugin, das von der Produktion verwendet wird. es entsteht kein
zweites Modulsystem.

Installieren Sie das Paket in einem Arbeitsbereich, der `.fws`-Module testet, und erstellen Sie dann seinen Adapter mit der Standardkonfiguration Vitest:

```typescript
// vitest.config.ts
import { defineForgeWebScriptVitestConfig } from "@mission-platform/forge-web-script-vitest";

export default defineForgeWebScriptVitestConfig({
  environment: "node",
  forgeWebScript: {
    root: import.meta.dirname,
    requestedCapabilities: ["clock.now"],
    selfHostedVmMode: "interpret",
  },
  overrides: {
    // Consumer plugins, aliases, and other Vite/Vitest settings remain active.
    resolve: { alias: { "@fixtures": "./fixtures" } },
  },
});
```

Erstellen Sie für direkte Compiler- und Laufzeitzusicherungen einen Harness pro Suite oder Test und entsorgen Sie ihn in `afterEach`:

```typescript
import { afterEach, describe, expect, it } from "vitest";
import {
  assertForgeWebScriptDiagnostic,
  assertForgeWebScriptNoDiagnostics,
  createForgeWebScriptTestHarness,
} from "@mission-platform/forge-web-script-vitest";

describe("FWS fixture", () => {
  const harness = createForgeWebScriptTestHarness({
    requestedCapabilities: ["clock.now"],
  });

  afterEach(() => harness.dispose());

  it("checks artifacts, Wasm exports, and explicit capabilities", async () => {
    const result = await harness.compile("valid/scalar.fws");
    assertForgeWebScriptNoDiagnostics(result.diagnostics);
    expect(result.artifact.manifest?.exports.map(({ name }) => name)).toEqual([
      "answer",
    ]);
    expect(
      (
        await harness.load<{ answer: () => number }>("valid/scalar.fws")
      ).answer(),
    ).toBe(42);

    const clock = await harness.load<{ current: () => bigint }>(
      "capabilities/clock-now.fws",
      {
        "clock.now": { now: () => 123n },
      },
    );
    expect(clock.current()).toBe(123n);
  });

  it("keeps diagnostic code, phase, and span structured", async () => {
    const result = await harness.inspect("diagnostics/invalid-type.fws");
    assertForgeWebScriptDiagnostic(result.diagnostics, {
      code: "FWS-TYPE-005",
      phase: "type-check",
      line: 2,
    });
  });
});
```

`load` und `loadSync` akzeptieren nur die vom Test bereitgestellten Fähigkeitsimporte. Es fehlen deklarierte und gelieferte Importe
nicht deklarierte Importe schlagen explizit fehl; Es werden keine Browser- oder Node-APIs implizit injiziert. Verwenden Sie `compileGraph` für den Quellimport
Diagramme und Vergleich von `graphHash`, verknüpften Modulen, Deklarationen und Inhalts-Hashes beim Testen der Linkkonfiguration.

Der Adapterpfad testet den generierten ESM-Vertrag, wie Vitest ihn sieht:

```typescript
import {
  abiManifest,
  load,
  loadSync,
  manifest,
} from "./fixtures/valid/scalar.fws";

expect(abiManifest).toEqual(manifest);
expect((await load<{ answer: () => number }>()).answer()).toBe(42);
expect(loadSync<{ answer: () => number }>().answer()).toBe(42);
```

Testen Sie für FWS-Werte beide Ebenen explizit. Rohe WASM-Tests sollten dies bestätigen
ABI- und Besitzaufrufe mit Zeigerlänge; Generierte ESM-Tests sollten das bestätigen
JavaScript-Projektion:

```typescript
const artifact = harness.compileSource(
  `
  export fn echo(value: string) -> string { return value; }
`,
  "strings.fws",
).artifact;

const generated = await importFromEsmSource(artifact.esmSource);
expect(generated.loadSync().echo("Δοκιμή 🚀")).toBe("Δοκιμή 🚀");
expect((await generated.load()).echo("")).toBe("");
```

Generierte Loader-Grenztests sollten ASCII, leer, Multibyte-UTF-8 abdecken.
zurückgegebene Verkettungen, String-Fähigkeitsimporte, rohe `bytes`-Tupel und
das exponierte `memory`. Verwenden Sie fatale UTF-8-Fixtures und stellen Sie sicher, dass diese temporär sind
`fws_dealloc`-Aufrufe treten bei erfolgreichen Rückgaben, Gast-Traps, Host-Ausnahmen usw. auf.
und Fehler dekodieren. Instrumentieren Sie vorher den generierten `artifact.esmSource`
es importieren; Das Patchen von Exporten nach dem Laden beachtet die Wrapper nicht
Schließen Sie den ursprünglichen Allokator und den Deallokator.

Der generierte Adapter packt alle String-Argumente für einen Aufruf in eins
Gästezuteilung. Behalten Sie eine Zuordnungsanzahlzusicherung für Funktionen bei
mehrere Zeichenfolgenparameter und führen Sie einen reinen Skalartest durch, um zu überprüfen, ob nein
String-Marshalling-Arbeit wird für rein numerische Funktionen generiert. Ein Bytetest
muss weiterhin ein `[pointer, length]`-Tupel übergeben, anstatt ein zu erwarten
automatische `Uint8Array`-Konvertierung.

Der Benchmark-Arbeitsbereich vergleicht den Rohzeigerlängenadapter mit dem
generierter ESM-Adapter als separate FWS-Modi:

```bash
pnpm --filter @mission-platform/benchmark run bench -- \
  --node-only --warmup 3 --samples 10 \
  --output benchmark/results/fws-generated-boundary
```

Berichte umfassen Build-, Initialisierungs- und Steady-State-Ausführungsphasen. Die
Die FWS-Rohzeile `wasm` verwendet neue Instanzen und drei Zeichenfolgeneingabezuordnungen für
der Benchmark-Kernel; `wasm-generated` verwendet den generierten `loadSync`-Vertrag
und eine gepackte String-Eingabezuordnung. Denn der aktuelle Gast-Deallocator
validiert Bereiche, ohne Bump-Allocator-Speicherplatz und generierte Zeichenfolgen/Bytes zu recyceln
Beispiele verwenden pro Aufruf eine neue Loader-Instanz; Skalare Proben verwenden das geladene wieder
Instanz. Dies isoliert jede zuordnungsintensive Stichprobe und ist beabsichtigt
wird als Loader-Grenzen-Overhead und nicht als Anspruch auf eine persistente Instanz gemeldet.
Jedes Artefakt meldet rohe Wasm-Bytes, generierte ESM-Quellbytes, Inhalts-Hash,
und die vom Vergleich verwendeten statischen Zuordnungszahlen. Nur Zeilen vergleichen
wenn der Korpus-Hash, die Host-Laufzeit und das Benchmark-Schema übereinstimmen.

Beispielsweise lieferte der obige Nur-Node-Lauf 336 gemessene Phasenergebnisse mit
Null Fehler und Korpus-Hash `ad092f7c552cc914`. Beide FWS-Reihen hatten rohes Wasm
Hash `0ac58f11`, rohe Wasm-Größe 1.625 Bytes und generierte ESM-Quellengröße 18.490
Bytes; Die Anzahl der rohen und generierten String-Eingabezuweisungen betrug 3 und 1. Auf der
Bei Unicode-kleinen Zeichenfolgen betrug die mittlere Initialisierung 0,00024 ms roh im Vergleich zu
Die generierte Zeit betrug 0,00188 ms und die durchschnittliche Ausführungszeit betrug 0,0236 ms im Rohzustand gegenüber 0,1070 ms
generiert beim aufgezeichneten Node-Lauf. Diese Zahlen sind repräsentative Beweise,
keine maschinenübergreifenden Leistungsgarantien; Verwenden Sie die Fallbeispiele des Berichts
für Vergleiche.

Das Plugin stellt außerdem explizite virtuelle Abfragen für `?forge-web-script-manifest`, `?forge-web-script-declarations`,
`?forge-web-script-wasm` und `?forge-web-script-source-map`. Um diese Umgebungsmodule für TypeScript erkennbar zu machen,
Fügen Sie den Unterpfad der mitgelieferten Deklaration zu den Typen des Testprojekts hinzu:

```json
{
  "compilerOptions": {
    "types": [
      "node",
      "@mission-platform/forge-web-script-vitest/forge-web-script"
    ]
  }
}
```

Alternativ können Sie `/// <reference types="@mission-platform/forge-web-script-vitest/forge-web-script" />` zu einem Nur-Test hinzufügen
Geben Sie den im Projekt enthaltenen Einstiegspunkt ein. Der Deklarationsunterpfad ist nur typspezifisch und fügt keinen Laufzeitimport hinzu.

Verwenden Sie gemeinsam genutzte Fixtures in `packages/forge-web-script-vitest/fixtures/` für paketübergreifende Sprach- und ABI-Konformität:
`valid/`, `diagnostics/`, `capabilities/`, `graphs/` und `self-hosted/` sind absichtlich stabil. Halten Sie eine Halterung daneben
eine Compiler-, Laufzeit- oder Plugin-Spezifikation, wenn sie ein privates Implementierungsdetail abdeckt; Verwenden Sie eine Inline-Quelle für einen kleinen Parser oder
Fälle von VM-Einheiten. Dadurch bleiben Gerätenamen und Bereinigung deterministisch, ohne dass Tests auf niedriger Ebene durch den Kabelbaum gezwungen werden.

`checkVmParity(file, mode)` unterstützt `interpret`, `jit` und `aot`, aber sein Bericht ist der vorhandene begrenzte selbstgehostete Bericht
Lex-Stage-Paritätsvertrag. Bestätigen Sie `parity`, Fingerabdrücke, Schritte und AOT-Reproduzierbarkeitsmetadaten. Behandeln Sie den Bericht nicht
als beliebige kompilierte FWS-VM-Ausführung oder als Ersatz für Wasm-Verhaltenstests.

Führen Sie die fokussierte FWS-Matrix mit den normalen Arbeitsbereichsaufgaben aus:

```bash
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script-vitest
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script-runtime
pnpm exec turbo run test build:check --filter @mission-platform/vite-plugin-forge-web-script
```

## Technische Referenz

### Gemeinsame Konfiguration

Die meisten Arbeitsbereiche verwenden das Dienstprogramm `defineVitestConfig` von `@mission-platform/vite-config`. Dies sorgt für eine standardisierte
Umgebung:

- **Umgebung**: Standardmäßig `jsdom`.
- **Globals**: Aktiviert (`describe`, `it`, `expect` müssen nicht importiert werden, es sei denn, dies ist gewünscht).
- **Plugins**: Beinhaltet `@vitejs/plugin-vue` und i18n-Block-Ignorierung.
- **Abdeckung**: Vorkonfigurierter `v8`-Anbieter.

**Beispiel `vitest.config.ts`:**

```typescript
import { defineVitestConfig } from "@mission-platform/vite-config/vitest";

export default defineVitestConfig({
  overrides: {
    // Package-specific overrides
  },
});
```

### Verzeichnisstruktur

- `src/**/*.spec.ts`: Unit-Tests und Komponententests.
- `src/**/*.stories.tsx`: Storybook-Geschichten (wird auch als Interaktionstestdefinitionen verwendet).
- `apps/storybook/vitest.config.ts`: Hauptkonfiguration für browserbasierte Interaktionstests.

### Zusammenfassung der Skripte

| Skript | Befehl | Zweck |
| :-------------- | :--------------------------------------------------------- | :------------------------------------- |
| `test` | `pnpm exec turbo run test` | Führen Sie alle Arbeitsbereichstestaufgaben aus.          |
| `test:watch` | `pnpm --filter @mission-platform/components test:watch` | Führen Sie Komponententests im Überwachungsmodus durch.    |
| `test:coverage` | `pnpm --filter @mission-platform/components test:coverage` | Erstellen Sie einen Bericht zur Komponentenabdeckung. |
| Rost/WASM | `cargo test --workspace` | Führen Sie native Rust-Kistentests durch.           |

Wasm-Wrapper-Pakete werden durch ihre eigenen Paketaufgaben getestet. Führen Sie beispielsweise das Scannerpaket und dessen Paket aus
Wrapper zusammen, wenn das Scannerverhalten geändert wird:

```bash
pnpm exec turbo run test --filter @mission-platform/code-scanner...
```

## Verwandte Dokumentation

- [Entwicklungs-Setup](development-setup.md)
- [Best Practices](best-practices.md)
- [Paketentwicklung](package-development.md)
