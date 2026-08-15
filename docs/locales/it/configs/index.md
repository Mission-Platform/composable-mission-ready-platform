# Pacchetti di configurazione

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> Fonte inglese: [docs/configs/index.md](../../../configs/index.md)
> Lingua: Italiano (it)

La Mission Platform utilizza pacchetti di configurazione centralizzati in `configs/` directory per garantire la coerenza tra i file
il monorepo.

## Panoramica

La centralizzazione delle configurazioni consente un'unica fonte attendibile per le regole degli strumenti, i processi di creazione e lo stile del codice.
I pacchetti e le applicazioni utilizzano queste configurazioni estendendole nei file di configurazione locali.

## Riepilogo del pacchetto

| Pacchetto | Scopo | Superficie di configurazione primaria |
|:---|:---|:---|
| [`@mission-platform/eslint-config`](eslint-config.md) | Piatto ESLint regole per JS/TS e Vue. | `eslint.config.js` |
| `@mission-platform/prettier-config` | Impostazioni predefinite di formattazione del repository. | `prettier.config.mjs` |
| `@mission-platform/typescript-config` | TypeScript preimpostazioni del compilatore. | `tsconfig.json` |
| `@mission-platform/stylelint-config` | Linting CSS e SCSS. | `stylelint.config.mjs` |
| `@mission-platform/vite-config` | Vite E Vitest aiutanti di configurazione. | `vite.config.ts` |
| `@mission-platform/tsdown-config` | Aiutanti per il raggruppamento di biblioteche. | `tsdown.config.ts` |
| `@mission-platform/postcss-config` | Pipeline PostCSS condivisa. | `postcss.config.mjs` |
| `@mission-platform/i18n-config` | Impostazioni locali e di estrazione condivise. | `i18next.config.ts` |
| `@mission-platform/storybook-framework` | Preimpostazione del framework Storybook selezionato dall'ambiente. | `.storybook/main.ts` |
| [Configurazione dei lavoratori](workers-config.md) | Convenzioni dei lavoratori Cloudflare. | `wrangler.jsonc` |

## Utensili di base

### ESLint (`@mission-platform/eslint-config`)

Standardizza le regole di qualità del codice in tutte le aree di lavoro. Utilizza il formato Flat Config e include il supporto per
TypeScript, Vue 3 e accessibilità.

### Prettier (`@mission-platform/prettier-config`)

Applica uno stile di codice coerente (tabulazioni, virgolette, punto e virgola) nell'intero monorepo.

### TypeScript (`@mission-platform/typescript-config`)

Fornisce base `tsconfig` preimpostazioni per diversi target:

- `base`: impostazioni predefinite generali.
- `vue`: Ottimizzato per Vue 3 SFC.
- `node`: Ottimizzato per Nodeambienti .js.
- `framework-<name>`: aggiunge la corrispondenza `mp:<framework>` condizione di esportazione per i consumatori esterni.

## Costruisci sistema

### Vite (`@mission-platform/vite-config`)

Fornisce funzioni di fabbrica per creare Vite configurazioni sia per le applicazioni che per le librerie.

```ts
import { defineAppConfig, defineLibraryConfig } from '@mission-platform/vite-config';
```

- `defineAppConfig`: Per applicazioni di primo livello (SPA, lavoratori).
- `defineLibraryConfig`: Per pacchetti condivisi con raggruppamento e scuotimento ottimali degli alberi.

### PostCSS (`@mission-platform/postcss-config`)

Condivide la pipeline del plugin PostCSS (incluso Autoprefixer) per garantire che i CSS vengano elaborati in modo coerente indipendentemente da dove
è scritto.

## Modello di utilizzo

Per utilizzare una configurazione in uno spazio di lavoro:

1. Aggiungere il pacchetto di configurazione come a `devDependency` In `package.json`.
2. Creare un file di configurazione locale (ad esempio, `eslint.config.js`).
3. Importa ed esporta/estendi la configurazione di base.

```js
// Example: eslint.config.js
import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  // local overrides
];
```

## Scelta di una configurazione

Utilizzare il pacchetto proprietario dell'azienda anziché copiare le regole in un'area di lavoro. File di build dell'applicazione e della libreria
potrebbe aggiungere sostituzioni locali, ma le impostazioni predefinite condivise dovrebbero rimanere `configs/`. Per un nuovo pacchetto, iniziare con il pacchetto
impalcatura e quindi eseguire i controlli dell'area di lavoro:

```bash
pnpm exec turbo run build:check --filter @mission-platform/<name>
pnpm exec turbo run lint --filter @mission-platform/<name>
pnpm exec turbo run format --filter @mission-platform/<name>
```
