# @mission-platform/tsdown-config

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> configs/tsdown-config/docs/index.md: [configs/tsdown-config/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Supporti condivisi per la creazione di librerie tsdown per aree di lavoro pubblicabili.

## Installare e utilizzare

```bash
pnpm add --save-dev @mission-platform/tsdown-config
```

Utilizzare il pacchetto da un'area di lavoro `tsdown.config.ts` e mantenere i punti di ingresso,
dipendenze esterne e vincoli di output locali al pacchetto in fase di creazione.
Le dichiarazioni e i bundle generati appartengono a quel pacchetto `dist/` directory.

## Contribuire

Correre `pnpm --filter @mission-platform/tsdown-config lint` e il relativo controllo del formato.
Preservare l'output deterministico e non aggiungere rami target specifici del framework
all'aiutante di costruzione neutrale.
