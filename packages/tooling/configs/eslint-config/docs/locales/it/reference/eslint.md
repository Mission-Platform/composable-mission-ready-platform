# ESLint Configurazione

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/tooling/configs/eslint-config/docs/reference/eslint.md: [packages/tooling/configs/eslint-config/docs/reference/eslint.md](../../../reference/eslint.md)
> Lingua: Italiano (it)

Il pacchetto `@mission-platform/eslint-config` fornisce una configurazione ESLint centralizzata e piatta per l'intero monorepo.

## Panoramica

Mission Platform utilizza il formato ESLint Flat Config (`eslint.config.js`). La configurazione condivisa impone coerenza
qualità del codice, accessibilità e regole dell'architettura in tutti i pacchetti, applicazioni e lavoratori.

## Caratteristiche principali

- **Supporto TypeScript**: lanugine sensibile al tipo fornita da `typescript-eslint`.
- **Vue 3 SFC**: applica `<script setup>` e le migliori pratiche tramite `eslint-plugin-vue`.
- **Accessibilità**: controlli di accessibilità integrati per i modelli Vue con `eslint-plugin-vuejs-accessibility`.
- **Organizzazione importazione**: ordinamento e convalida automatici delle importazioni tramite `eslint-plugin-import-x`.
- **Monorepo Awareness**: integrazione con `eslint-config-turbo` per garantire che le variabili di ambiente siano dichiarate correttamente.

## Plugin integrati

La configurazione include i seguenti plugin e set di regole:

| Plug-in | Scopo |
| :----------------------- | :----------------------------------------------------- |
| `typescript-eslint` | Regole TypeScript standard e lanugine in base al tipo.      |
| `eslint-plugin-vue` | Vue 3 Linting SFC e convalida del modello.             |
| `eslint-plugin-sonarjs` | Rilevamento di odori di codice e rischi di bug.                |
| `eslint-plugin-unicorn` | Decine di piccole, utili regole comunitarie.               |
| `eslint-plugin-i18next` | Garantisce che le chiavi di traduzione vengano utilizzate correttamente.           |
| `eslint-config-prettier` | Disabilita le regole in conflitto con la formattazione Prettier. |

## Digitazione rigorosa e conforme alle regole

`missionTypeScriptPlugin` personalizzato fornisce controlli rapidi della sintassi AST applicando i rigorosi standard di tipizzazione di Mission Platform:

| Regola | Gravità | Scopo |
| :--------------------------------------------- | :------------------------------ | :------------------------------------------------------------------------------------------------------- |
| `@typescript-eslint/no-explicit-any` | `error` (`warn` per `**/*.vue`) | Proibisce la parola chiave `any` nel codice TypeScript (`error`), con `warn` applicato ai modelli SFC Vue. |
| `@typescript-eslint/prefer-satisfies` | `warn` | Consiglia `satisfies` rispetto alle asserzioni `as` per preservare i valori letterali ristretti e vieta severamente `as any`.  |
| `@typescript-eslint/no-unconstrained-generics` | `warn` | Richiede che tutti i parametri di tipo generico dichiarino un vincolo `extends`.                                 |
| `@typescript-eslint/no-implicit-unknown` | `warn` | Impedisce la perdita di `unknown` non convalidato oltre i limiti dell'API esportata.                                  |
| `@typescript-eslint/consistent-type-imports` | `error` | Impone le dichiarazioni `import type` di livello superiore per le importazioni di solo tipo.                                     |

## Utilizzo

Per applicare la configurazione condivisa a uno spazio di lavoro, creare un file `eslint.config.js` nella radice dello spazio di lavoro:

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
