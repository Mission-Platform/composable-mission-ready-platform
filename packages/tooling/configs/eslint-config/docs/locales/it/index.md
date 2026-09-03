# @mission-platform/eslint-config

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/tooling/configs/eslint-config/docs/index.md: [packages/tooling/configs/eslint-config/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Appartamento condiviso ESLint configurazione per gli spazi di lavoro di Mission Platform.

## Installare e utilizzare

Aggiungi il pacchetto alle dipendenze di sviluppo di un'area di lavoro ed estendi flat
configurazione da `eslint.config.js`:

```bash
pnpm add --save-dev @mission-platform/eslint-config
```

```js
import baseConfig from '@mission-platform/eslint-config';

export default [...baseConfig];
```

Il pacchetto include TypeScript, Vue 3, accessibilità, importazione, Turbo, e
integrazioni di formattazione. Aggiungi regole specifiche dell'area di lavoro solo per comportamenti che
non può essere condiviso. Vedi [il ESLint riferimento](reference/eslint.md) per il
plugin e comandi inclusi.

## Contribuire

Correre `pnpm --filter @mission-platform/eslint-config lint` E
`pnpm --filter @mission-platform/eslint-config format` dopo aver cambiato le regole.
Mantenere il pacchetto compatibile con il framework ma indipendente dall'area di lavoro; le applicazioni dovrebbero
non importare regole da un altro spazio di lavoro.
