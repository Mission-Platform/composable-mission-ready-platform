# Konfigurationspakete

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/configs/index.md: [docs/configs/index.md](../../../configs/index.md)
> Sprache: Deutsch (de)

Die Mission Platform verwendet zentralisierte Konfigurationspakete im `packages/tooling/configs/`-Verzeichnis, um die Konsistenz zwischen allen sicherzustellen
das Monorepo.

## Überblick

Die Zentralisierung von Konfigurationen ermöglicht eine einzige Quelle der Wahrheit für Werkzeugregeln, Erstellungsprozesse und Codestil.
Pakete und Anwendungen nutzen diese Konfigurationen, indem sie sie in ihren lokalen Konfigurationsdateien erweitern.

## Paketzusammenfassung

Die Dokumentation des Konfigurationspakets ist Eigentum jedes Pakets. Die Links unten
sind heute Repository-Dateiverknüpfungen und werden im Paket-Namespace zu Routen
Dokumentationsseite:

| Paket | Zweck | Primäre Konfigurationsoberfläche |
| :---------------------------------------------------------------------------------------------------------- | :----------------------------------------------- | :---------------------------- |
| [`@mission-platform/eslint-config`](../../../../packages/tooling/configs/eslint-config/docs/locales/de/index.md) | Flache ESLint-Regeln für JS/TS und Vue.             | `eslint.config.js` |
| [`@mission-platform/prettier-config`](../../../../packages/tooling/configs/prettier-config/docs/locales/de/index.md) | Standardeinstellungen für die Repository-Formatierung.                  | `prettier.config.js` |
| [`@mission-platform/typescript-config`](../../../../packages/tooling/configs/typescript-config/docs/locales/de/index.md) | TypeScript Compiler-Voreinstellungen.                     | `tsconfig.json` |
| [`@mission-platform/stylelint-config`](../../../../packages/tooling/configs/stylelint-config/docs/locales/de/index.md) | CSS- und SCSS-Linting.                            | `stylelint.config.mjs` |
| [`@mission-platform/vite-config`](../../../../packages/tooling/configs/vite-config/docs/locales/de/index.md) | Konfigurationshelfer Vite und Vitest.           | `vite.config.ts` |
| [`@mission-platform/tsdown-config`](../../../../packages/tooling/configs/tsdown-config/docs/locales/de/index.md) | Bibliotheksbündelungshelfer.                        | `tsdown.config.ts` |
| [`@mission-platform/postcss-config`](../../../../packages/tooling/configs/postcss-config/docs/locales/de/index.md) | Geteilte PostCSS-Pipeline.                         | `postcss.config.mjs` |
| [`@mission-platform/i18n-config`](../../../../packages/tooling/configs/i18n-config/docs/locales/de/index.md) | Gemeinsame Gebietsschema- und Extraktionseinstellungen.           | `i18next.config.ts` |
| [`@mission-platform/storybook-framework`](../../../../packages/tooling/configs/storybook-framework/docs/locales/de/index.md) | Von der Umgebung ausgewählte Storybook-Framework-Voreinstellung. | `.storybook/main.ts` |
| [Workers-Konfiguration](workers-config.md) | Workspace-übergreifende Cloudflare Worker-Konventionen.   | `wrangler.jsonc` |

## Kernwerkzeuge

### ESLint (`@mission-platform/eslint-config`)

Standardisiert Codequalitätsregeln in allen Arbeitsbereichen. Es verwendet das Flat Config-Format und bietet Unterstützung für
TypeScript, Vue 3 und Barrierefreiheit.

### Prettier (`@mission-platform/prettier-config`)

Erzwingt einen konsistenten Codestil (Tabs, Anführungszeichen, Semikolons) im gesamten Monorepo.

### TypeScript (`@mission-platform/typescript-config`)

Bietet Basis-`tsconfig`-Voreinstellungen für verschiedene Ziele:

- `base`: Allgemeine Standardeinstellungen.
- `vue`: Optimiert für Vue 3 SFCs.
- `node`: Optimiert für Node.js-Umgebungen.
- `framework-<name>`: Fügt die passende Exportbedingung `mp:<framework>` für externe Verbraucher hinzu.

## Build-System

### Vite (`@mission-platform/vite-config`)

Bietet Factory-Funktionen zum Erstellen von Vite-Konfigurationen für Anwendungen und Bibliotheken.

```ts
import {
  defineAppConfig,
  defineLibraryConfig,
} from "@mission-platform/vite-config";
```

- `defineAppConfig`: Für Anwendungen der obersten Ebene (SPA, Worker).
- `defineLibraryConfig`: Für gemeinsam genutzte Pakete mit optimaler Bündelung und Tree-Shaking.

### PostCSS (`@mission-platform/postcss-config`)

Gibt die PostCSS-Plugin-Pipeline (einschließlich Autoprefixer) gemeinsam, um sicherzustellen, dass CSS unabhängig vom Standort konsistent verarbeitet wird
es ist verfasst.

## Nutzungsmuster

So verwenden Sie eine Konfiguration in einem Arbeitsbereich:

1. Fügen Sie das Konfigurationspaket als `devDependency` in `package.json` hinzu.
2. Erstellen Sie eine lokale Konfigurationsdatei (für Stylelint, `stylelint.config.mjs`).
3. Importieren und exportieren/erweitern Sie die Basiskonfiguration.

```js
// Example: eslint.config.js
import baseConfig from "@mission-platform/eslint-config";

export default [
  ...baseConfig,
  // local overrides
];
```

Verwenden Sie für Stylelint dasselbe ESM-Import-/Verbreitungsmuster in `stylelint.config.mjs`:

```js
// stylelint.config.mjs
import baseConfig from "@mission-platform/stylelint-config";

export default { ...baseConfig };
```

## Auswahl einer Konfiguration

Verwenden Sie das Paket, dem das Anliegen gehört, anstatt Regeln in einen Arbeitsbereich zu kopieren. Build-Dateien für Anwendungen und Bibliotheken
kann lokale Überschreibungen hinzufügen, gemeinsame Standardwerte sollten jedoch in `packages/tooling/configs/` verbleiben. Beginnen Sie bei einem neuen Paket mit dem Paket
scaffold und führen Sie dann die Arbeitsbereichsprüfungen aus:

```bash
pnpm exec turbo run build:check --filter @mission-platform/<name>
pnpm exec turbo run lint --filter @mission-platform/<name>
pnpm exec turbo run format --filter @mission-platform/<name>
```
