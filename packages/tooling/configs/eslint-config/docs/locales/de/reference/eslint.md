# ESLint Konfiguration

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/tooling/configs/eslint-config/docs/reference/eslint.md: [packages/tooling/configs/eslint-config/docs/reference/eslint.md](../../../reference/eslint.md)
> Sprache: Deutsch (de)

Das `@mission-platform/eslint-config`-Paket bietet eine zentralisierte, flache ESLint-Konfiguration für das gesamte Monorepo.

## Überblick

Mission Platform verwendet das ESLint Flat Config-Format (`eslint.config.js`). Die gemeinsame Konfiguration erzwingt Konsistenz
Codequalität, Zugänglichkeit und Architekturregeln für alle Pakete, Anwendungen und Worker.

## Hauptmerkmale

- **TypeScript-Unterstützung**: Typbewusstes Linting mit Unterstützung von `typescript-eslint`.
- **Vue 3 SFCs**: Erzwingt `<script setup>` und Best Practices über `eslint-plugin-vue`.
- **Barrierefreiheit**: Integrierte Barrierefreiheitsprüfungen für Vue-Vorlagen mit `eslint-plugin-vuejs-accessibility`.
- **Importorganisation**: Automatische Sortierung und Validierung von Importen über `eslint-plugin-import-x`.
- **Monorepo-Bewusstsein**: Integration mit `eslint-config-turbo`, um sicherzustellen, dass Umgebungsvariablen ordnungsgemäß deklariert werden.

## Integrierte Plugins

Die Konfiguration umfasst die folgenden Plugins und Regelsätze:

| Plugin | Zweck |
| :----------------------- | :----------------------------------------------------- |
| `typescript-eslint` | Standardmäßige TypeScript-Regeln und typbewusstes Linting.      |
| `eslint-plugin-vue` | Vue 3 SFC-Linting und Vorlagenvalidierung.             |
| `eslint-plugin-sonarjs` | Erkennung von Code-Gerüchen und Fehlerrisiken.                |
| `eslint-plugin-unicorn` | Dutzende kleine, nützliche Community-Regeln.               |
| `eslint-plugin-i18next` | Stellt sicher, dass Übersetzungsschlüssel korrekt verwendet werden.           |
| `eslint-config-prettier` | Deaktiviert Regeln, die mit der Prettier-Formatierung in Konflikt stehen. |

## Strenge Eingabe und Einhaltung der Regeln

Das benutzerdefinierte `missionTypeScriptPlugin` bietet schnelle AST-Syntaxprüfungen und setzt so die strengen Typisierungsstandards der Mission Platform durch:

| Regel | Schweregrad | Zweck |
| :--------------------------------------------- | :------------------------------ | :------------------------------------------------------------------------------------------------------- |
| `@typescript-eslint/no-explicit-any` | `error` (`warn` für `**/*.vue`) | Verbietet das Schlüsselwort `any` im TypeScript-Code (`error`), wobei `warn` für Vue SFC-Vorlagen angewendet wird. |
| `@typescript-eslint/prefer-satisfies` | `warn` | Empfiehlt `satisfies` gegenüber `as`-Behauptungen, um schmale Literale beizubehalten, und verbietet `as any` strikt.  |
| `@typescript-eslint/no-unconstrained-generics` | `warn` | Erfordert alle generischen Typparameter, um eine `extends`-Einschränkung zu deklarieren.                                 |
| `@typescript-eslint/no-implicit-unknown` | `warn` | Verhindert das Durchsickern von nicht validiertem `unknown` über exportierte API-Grenzen hinweg.                                  |
| `@typescript-eslint/consistent-type-imports` | `error` | Erfordert `import type`-Deklarationen der obersten Ebene für reine Typimporte.                                     |

## Verwendung

Um die freigegebene Konfiguration auf einen Arbeitsbereich anzuwenden, erstellen Sie eine `eslint.config.js`-Datei im Stammverzeichnis des Arbeitsbereichs:

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
