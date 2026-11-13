# Pacchetti di configurazione

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/configs/index.md: [docs/configs/index.md](../../../configs/index.md)
> Lingua: Italiano (it)

La Mission Platform utilizza pacchetti di configurazione centralizzati nella directory `packages/tooling/configs/` per garantire la coerenza tra
il monorepo.

## Panoramica

La centralizzazione delle configurazioni consente di avere un'unica fonte attendibile per le regole degli strumenti, i processi di creazione e lo stile del codice.
I pacchetti e le applicazioni utilizzano queste configurazioni estendendole nei file di configurazione locali.

## Riepilogo del pacchetto

La documentazione del pacchetto di configurazione è di proprietà di ciascun pacchetto. I link qui sotto
sono oggi collegamenti a file di repository e diventano percorsi con spazi dei nomi dei pacchetti nel formato
sito di documentazione:

| Pacchetto | Scopo | Superficie di configurazione primaria |
| :---------------------------------------------------------------------------------------------------------- | :----------------------------------------------- | :---------------------------- |
| [`@mission-platform/eslint-config`](../../../../packages/tooling/configs/eslint-config/docs/locales/it/index.md) | Regole piatte ESLint per JS/TS e Vue.             | `eslint.config.js` |
| [`@mission-platform/prettier-config`](../../../../packages/tooling/configs/prettier-config/docs/locales/it/index.md) | Impostazioni predefinite di formattazione del repository.                  | `prettier.config.js` |
| [`@mission-platform/typescript-config`](../../../../packages/tooling/configs/typescript-config/docs/locales/it/index.md) | TypeScript preimpostazioni del compilatore.                     | `tsconfig.json` |
| [`@mission-platform/stylelint-config`](../../../../packages/tooling/configs/stylelint-config/docs/locales/it/index.md) | Linting CSS e SCSS.                            | `stylelint.config.mjs` |
| [`@mission-platform/vite-config`](../../../../packages/tooling/configs/vite-config/docs/locales/it/index.md) | Supporti per la configurazione Vite e Vitest.           | `vite.config.ts` |
| [`@mission-platform/tsdown-config`](../../../../packages/tooling/configs/tsdown-config/docs/locales/it/index.md) | Aiutanti per il raggruppamento di biblioteche.                        | `tsdown.config.ts` |
| [`@mission-platform/postcss-config`](../../../../packages/tooling/configs/postcss-config/docs/locales/it/index.md) | Pipeline PostCSS condivisa.                         | `postcss.config.mjs` |
| [`@mission-platform/i18n-config`](../../../../packages/tooling/configs/i18n-config/docs/locales/it/index.md) | Impostazioni locali e di estrazione condivise.           | `i18next.config.ts` |
| [`@mission-platform/storybook-framework`](../../../../packages/tooling/configs/storybook-framework/docs/locales/it/index.md) | Preimpostazione del framework Storybook selezionato dall'ambiente. | `.storybook/main.ts` |
| [Configurazione lavoratori](workers-config.md) | Convenzioni Cloudflare Worker tra spazi di lavoro.   | `wrangler.jsonc` |

## Utensili di base

### ESLint (`@mission-platform/eslint-config`)

Standardizza le regole di qualità del codice in tutte le aree di lavoro. Utilizza il formato Flat Config e include il supporto per
TypeScript, Vue 3 e accessibilità.

### Prettier (`@mission-platform/prettier-config`)

Applica uno stile di codice coerente (tabulazioni, virgolette, punto e virgola) nell'intero monorepo.

### TypeScript (`@mission-platform/typescript-config`)

Fornisce preimpostazioni `tsconfig` di base per diversi target:

- `base`: impostazioni predefinite generali.
- `vue`: ottimizzato per Vue 3 SFC.
- `node`: ottimizzato per ambienti Node.js.
- `framework-<name>`: aggiunge la condizione di esportazione `mp:<framework>` corrispondente per i consumatori esterni.

## Costruisci sistema

### Vite (`@mission-platform/vite-config`)

Fornisce funzioni di fabbrica per creare configurazioni Vite sia per le applicazioni che per le librerie.

```ts
import {
  defineAppConfig,
  defineLibraryConfig,
} from "@mission-platform/vite-config";
```

- `defineAppConfig`: Per applicazioni di primo livello (SPA, lavoratori).
- `defineLibraryConfig`: per pacchetti condivisi con raggruppamento e scuotimento degli alberi ottimali.

### PostCSS (`@mission-platform/postcss-config`)

Condivide la pipeline del plugin PostCSS (incluso Autoprefixer) per garantire che i CSS vengano elaborati in modo coerente indipendentemente da dove
è scritto.

## Modello di utilizzo

Per utilizzare una configurazione in uno spazio di lavoro:

1. Aggiungere il pacchetto di configurazione come `devDependency` in `package.json`.
2. Creare un file di configurazione locale (per Stylelint, `stylelint.config.mjs`).
3. Importa ed esporta/estendi la configurazione di base.

```js
// Example: eslint.config.js
import baseConfig from "@mission-platform/eslint-config";

export default [
  ...baseConfig,
  // local overrides
];
```

Per Stylelint, utilizzare lo stesso modello di importazione/diffusione ESM in `stylelint.config.mjs`:

```js
// stylelint.config.mjs
import baseConfig from "@mission-platform/stylelint-config";

export default { ...baseConfig };
```

## Scelta di una configurazione

Utilizzare il pacchetto proprietario dell'azienda anziché copiare le regole in un'area di lavoro. File di build dell'applicazione e della libreria
può aggiungere sostituzioni locali, ma le impostazioni predefinite condivise dovrebbero rimanere in `packages/tooling/configs/`. Per un nuovo pacchetto, iniziare con il pacchetto
impalcatura e quindi eseguire i controlli dell'area di lavoro:

```bash
pnpm exec turbo run build:check --filter @mission-platform/<name>
pnpm exec turbo run lint --filter @mission-platform/<name>
pnpm exec turbo run format --filter @mission-platform/<name>
```
