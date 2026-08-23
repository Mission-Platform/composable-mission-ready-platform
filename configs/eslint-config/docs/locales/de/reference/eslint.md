# ESLint Konfiguration

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> configs/eslint-config/docs/reference/eslint.md: [configs/eslint-config/docs/reference/eslint.md](../../../reference/eslint.md)
> Sprache: Deutsch (de)

Der `@mission-platform/eslint-config` Paket bietet eine zentralisierte, flache ESLint Konfiguration für das gesamte Monorepo.

## Überblick

Mission Platform nutzt die ESLint Flaches Konfigurationsformat (`eslint.config.js`). Die gemeinsame Konfiguration erzwingt Konsistenz
Codequalität, Zugänglichkeit und Architekturregeln für alle Pakete, Anwendungen und Worker.

## Hauptmerkmale

- **TypeScript Unterstützung**: Typbewusstes Linting, unterstützt von `typescript-eslint`.
- **Vue 3 SFCs**: Erzwingt `<script setup>` und Best Practices über `eslint-plugin-vue`.
- **Barrierefreiheit**: Integrierte Barrierefreiheitsprüfungen für Vue Vorlagen mit `eslint-plugin-vuejs-accessibility`.
- **Importorganisation**: Automatische Sortierung und Validierung von Importen über `eslint-plugin-import-x`.
- **Monorepo-Bewusstsein**: Integration mit `eslint-config-turbo` um sicherzustellen, dass Umgebungsvariablen ordnungsgemäß deklariert werden.

## Integrierte Plugins

Die Konfiguration umfasst die folgenden Plugins und Regelsätze:

| Plugin | Zweck |
|:-------------------------|:-------------------------------------------------------|
| `typescript-eslint`      | Standard TypeScript Regeln und typbewusstes Linting.      |
| `eslint-plugin-vue`      | Vue 3 SFC-Linting und Vorlagenvalidierung.             |
| `eslint-plugin-sonarjs`  | Erkennung von Code-Gerüchen und Fehlerrisiken.                |
| `eslint-plugin-unicorn`  | Dutzende kleine, nützliche Community-Regeln.               |
| `eslint-plugin-i18next`  | Stellt sicher, dass Übersetzungsschlüssel korrekt verwendet werden.           |
| `eslint-config-prettier` | Deaktiviert Regeln, die im Konflikt stehen Prettier Formatierung. |

## Verwendung

Um die freigegebene Konfiguration auf einen Arbeitsbereich anzuwenden, erstellen Sie eine `eslint.config.js` Datei im Stammverzeichnis des Arbeitsbereichs:

```js
import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  // Add workspace-specific overrides here
];
```

## Den Linter laufen lassen

Verwenden Sie Turborepo, um Linting über einen oder mehrere Arbeitsbereiche hinweg auszuführen:

```bash
# Lint the entire monorepo
pnpm exec turbo run lint

# Lint a specific package
pnpm exec turbo run lint --filter <package-name>

# Automatically fix fixable issues
pnpm exec turbo run lint:fix
```
