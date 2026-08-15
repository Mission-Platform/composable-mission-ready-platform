# ESLint Configurazione

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> Fonte inglese: [docs/configs/eslint-config.md](../../../configs/eslint-config.md)
> Lingua: Italiano (it)

IL `@mission-platform/eslint-config` il pacchetto fornisce un'interfaccia centralizzata e piatta ESLint configurazione per l'intero monorepo.

## Panoramica

Mission Platform utilizza il file ESLint Formato Flat Config (`eslint.config.js`). La configurazione condivisa impone coerenza
qualità del codice, accessibilità e regole dell'architettura in tutti i pacchetti, applicazioni e lavoratori.

## Caratteristiche principali

- **TypeScript Supporto**: linting compatibile con il tipo fornito da `typescript-eslint`.
- **Vue 3 SFC**: applica `<script setup>` e le migliori pratiche tramite `eslint-plugin-vue`.
- **Accessibilità**: controlli di accessibilità integrati per Vue modelli con `eslint-plugin-vuejs-accessibility`.
- **Organizzazione importazione**: ordinamento automatico e convalida delle importazioni tramite `eslint-plugin-import-x`.
- **Consapevolezza Monorepo**: Integrazione con `eslint-config-turbo` per garantire che le variabili di ambiente siano dichiarate correttamente.

## Plugin integrati

La configurazione include i seguenti plugin e set di regole:

| Plug-in | Scopo |
|:-------------------------|:-------------------------------------------------------|
| `typescript-eslint`      | Standard TypeScript regole e linting in base al tipo.      |
| `eslint-plugin-vue`      | Vue 3 Linting SFC e convalida del modello.             |
| `eslint-plugin-sonarjs`  | Rilevamento di odori di codice e rischi di bug.                |
| `eslint-plugin-unicorn`  | Decine di piccole, utili regole comunitarie.               |
| `eslint-plugin-i18next`  | Garantisce che le chiavi di traduzione vengano utilizzate correttamente.           |
| `eslint-config-prettier` | Disabilita le regole in conflitto con Prettier formattazione. |

## Utilizzo

Per applicare la configurazione condivisa a uno spazio di lavoro, creare un file `eslint.config.js` file nella radice dello spazio di lavoro:

```js
import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  // Add workspace-specific overrides here
];
```

## Esecuzione del Linter

Utilizza Turborepo per eseguire linting su una o più aree di lavoro:

```bash
# Lint the entire monorepo
pnpm exec turbo run lint

# Lint a specific package
pnpm exec turbo run lint --filter <package-name>

# Automatically fix fixable issues
pnpm exec turbo run lint:fix
```
