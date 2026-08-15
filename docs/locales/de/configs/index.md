# Konfigurationspakete

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> Englische Quelle: [docs/configs/index.md](../../../configs/index.md)
> Sprache: Deutsch (de)

Die Mission Platform verwendet zentralisierte Konfigurationspakete im `configs/` Verzeichnis, um die Konsistenz zwischen allen zu gewährleisten
das Monorepo.

## Überblick

Die Zentralisierung von Konfigurationen ermöglicht eine einzige Quelle der Wahrheit für Werkzeugregeln, Erstellungsprozesse und Codestil.
Pakete und Anwendungen nutzen diese Konfigurationen, indem sie sie in ihren lokalen Konfigurationsdateien erweitern.

## Paketzusammenfassung

| Paket | Zweck | Primäre Konfigurationsoberfläche |
|:---|:---|:---|
| [`@mission-platform/eslint-config`](eslint-config.md) | Wohnung ESLint Regeln für JS/TS und Vue. | `eslint.config.js` |
| `@mission-platform/prettier-config` | Standardeinstellungen für die Repository-Formatierung. | `prettier.config.mjs` |
| `@mission-platform/typescript-config` | TypeScript Compiler-Voreinstellungen. | `tsconfig.json` |
| `@mission-platform/stylelint-config` | CSS- und SCSS-Linting. | `stylelint.config.mjs` |
| `@mission-platform/vite-config` | Vite Und Vitest Konfigurationshelfer. | `vite.config.ts` |
| `@mission-platform/tsdown-config` | Bibliotheksbündelungshelfer. | `tsdown.config.ts` |
| `@mission-platform/postcss-config` | Geteilte PostCSS-Pipeline. | `postcss.config.mjs` |
| `@mission-platform/i18n-config` | Gemeinsame Gebietsschema- und Extraktionseinstellungen. | `i18next.config.ts` |
| `@mission-platform/storybook-framework` | Von der Umgebung ausgewählte Storybook-Framework-Voreinstellung. | `.storybook/main.ts` |
| [Worker-Konfiguration](workers-config.md) | Cloudflare Worker-Konventionen. | `wrangler.jsonc` |

## Kernwerkzeuge

### ESLint (`@mission-platform/eslint-config`)

Standardisiert Codequalitätsregeln in allen Arbeitsbereichen. Es verwendet das Flat Config-Format und bietet Unterstützung für
TypeScript, Vue 3 und Zugänglichkeit.

### Prettier (`@mission-platform/prettier-config`)

Erzwingt einen konsistenten Codestil (Tabs, Anführungszeichen, Semikolons) im gesamten Monorepo.

### TypeScript (`@mission-platform/typescript-config`)

Bietet Basis `tsconfig` Voreinstellungen für verschiedene Ziele:

- `base`: Allgemeine Standardeinstellungen.
- `vue`: Optimiert für Vue 3 SFCs.
- `node`: Optimiert für Node.js-Umgebungen.
- `framework-<name>`: Fügt die Übereinstimmung hinzu `mp:<framework>` Exportbedingung für externe Verbraucher.

## Build-System

### Vite (`@mission-platform/vite-config`)

Bietet Factory-Funktionen zum Erstellen Vite Konfigurationen für Anwendungen und Bibliotheken.

```ts
import { defineAppConfig, defineLibraryConfig } from '@mission-platform/vite-config';
```

- `defineAppConfig`: Für Anwendungen der obersten Ebene (SPA, Arbeiter).
- `defineLibraryConfig`: Für gemeinsame Pakete mit optimaler Bündelung und Tree-Shaking.

### PostCSS (`@mission-platform/postcss-config`)

Gibt die PostCSS-Plugin-Pipeline (einschließlich Autoprefixer) gemeinsam, um sicherzustellen, dass CSS unabhängig vom Standort konsistent verarbeitet wird
es ist verfasst.

## Nutzungsmuster

So verwenden Sie eine Konfiguration in einem Arbeitsbereich:

1. Fügen Sie das Konfigurationspaket als hinzu `devDependency` In `package.json`.
2. Erstellen Sie eine lokale Konfigurationsdatei (z. B. `eslint.config.js`).
3. Importieren und exportieren/erweitern Sie die Basiskonfiguration.

```js
// Example: eslint.config.js
import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  // local overrides
];
```

## Auswahl einer Konfiguration

Verwenden Sie das Paket, dem das Anliegen gehört, anstatt Regeln in einen Arbeitsbereich zu kopieren. Build-Dateien für Anwendungen und Bibliotheken
kann lokale Außerkraftsetzungen hinzufügen, aber gemeinsame Standardwerte sollten erhalten bleiben `configs/`. Beginnen Sie bei einem neuen Paket mit dem Paket
scaffold und führen Sie dann die Arbeitsbereichsprüfungen aus:

```bash
pnpm exec turbo run build:check --filter @mission-platform/<name>
pnpm exec turbo run lint --filter @mission-platform/<name>
pnpm exec turbo run format --filter @mission-platform/<name>
```
