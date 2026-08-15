# Testen in der Mission Platform

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> Englische Quelle: [docs/testing.md](../../testing.md)
> Sprache: Deutsch (de)

Dieses Dokument beschreibt die Teststrategie und die Tools für das Mission Platform Monorepo. Es dient sowohl als **How-to
Leitfaden** für allgemeine Testaufgaben und eine **technische Referenz** für die zugrunde liegende Konfiguration.

## Teststapel

Mission Platform verwendet einen modernen, einheitlichen Test-Stack, der auf basiert Vitest:

- **Vitest**: Der primäre Testläufer für einheiten-, komponenten- und browserbasierte Tests.
- **@vue/test-utils**: Standardbibliothek zum Testen Vue Komponenten.
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
Für schnelleres lokales Feedback passend zum CI `--affected` Verhalten:

```bash
pnpm exec turbo run test --affected
```

`--affected` Wählt Testaufgaben für Arbeitsbereiche aus, die im Vergleich zur Basisrevision des Repositorys geändert wurden. Lassen Sie es weg, um jeden auszuführen
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

So erstellen Sie einen Abdeckungsbericht mit dem `v8` Anbieter:

```bash
pnpm --filter @mission-platform/components test:coverage
```

Berichte werden an die ausgegeben `coverage/` Verzeichnis innerhalb jedes Arbeitsbereichs.

## Anleitung: Tests schreiben

### Unit- und Komponententests

Tests werden zusammen mit dem Quellcode gespeichert und verwenden den `.spec.ts` (oder `.spec.tsx`) Verlängerung.

```typescript
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import ForgeButton from './ForgeButton.vue';

describe('ForgeButton.vue', () => {
  it('renders props.label when passed', () => {
    const label = 'Click Me';
    const wrapper = mount(ForgeButton, {
      props: { label }
    });
    expect(wrapper.text()).toMatch(label);
  });

  it('emits click event when clicked', async () => {
    const wrapper = mount(ForgeButton);
    await wrapper.trigger('click');
    expect(wrapper.emitted()).toHaveProperty('click');
  });
});
```

### Browsertests

Mission Platform nutzt VitestBrowsermodus für Tests, die eine echte DOM-Umgebung oder browserübergreifend erfordern
Überprüfung.

1. Erstellen Sie Ihre Testdatei wie gewohnt.
2. Stellen Sie das Paket sicher `vitest.config.ts` Aktiviert den Browsermodus (siehe Referenz unten).
3. Laufen Sie mit `pnpm test`.

## Technische Referenz

### Gemeinsame Konfiguration

Die meisten Arbeitsbereiche verwenden die `defineVitestConfig` Dienstprogramm von `@mission-platform/vite-config`. Dies sorgt für eine standardisierte
Umgebung:

- **Umfeld**: `jsdom` standardmäßig.
- **Globals**: Aktiviert (kein Import erforderlich `describe`, `it`, `expect` sofern nicht gewünscht).
- **Plugins**: Enthält `@vitejs/plugin-vue` und i18n-Block wird ignoriert.
- **Abdeckung**: Vorkonfiguriert `v8` Anbieter.

**Beispiel `vitest.config.ts`:**

```typescript
import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  overrides: {
    // Package-specific overrides
  }
});
```

### Verzeichnisstruktur

- `src/**/*.spec.ts`: Unit-Tests und Komponententests.
- `src/**/*.stories.tsx`: Bilderbuchgeschichten (auch als Interaktionstestdefinitionen verwendet).
- `apps/storybook/vitest.config.ts`: Hauptkonfiguration für browserbasierte Interaktionstests.

### Zusammenfassung der Skripte

| Skript | Befehl | Zweck |
|:----------------|:--------------------------|:--------------------------------------------|
| `test`          | `pnpm exec turbo run test`                              | Führen Sie alle Arbeitsbereichstestaufgaben aus.            |
| `test:watch`    | `pnpm --filter @mission-platform/components test:watch` | Führen Sie Komponententests im Überwachungsmodus durch.      |
| `test:coverage` | `pnpm --filter @mission-platform/components test:coverage` | Erstellen Sie einen Bericht zur Komponentenabdeckung. |
| Rost/WASM | `cargo test --workspace` | Führen Sie native Rust-Crate-Tests durch. |

Wasm-Wrapper-Pakete werden durch ihre eigenen Paketaufgaben getestet. Führen Sie beispielsweise das Scannerpaket und dessen Paket aus
Wrapper zusammen, wenn das Scannerverhalten geändert wird:

```bash
pnpm exec turbo run test --filter @mission-platform/code-scanner...
```

## Verwandte Dokumentation

- [Entwicklungs-Setup](development-setup.md)
- [Best Practices](best-practices.md)
- [Paketentwicklung](package-development.md)
