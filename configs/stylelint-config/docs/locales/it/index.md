# @mission-platform/stylelint-config

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> configs/stylelint-config/docs/index.md: [configs/stylelint-config/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Condiviso Stylelint regole per CSS e SCSS in Mission Platform.

## Installare e utilizzare

```bash
pnpm add --save-dev @mission-platform/stylelint-config
```

Estendi il pacchetto dall'area di lavoro `stylelint.config.mjs`. Conserva il componente
stili vicini al loro componente e utilizzano sostituzioni locali solo per un documento documentato
vincolo dello spazio di lavoro.

## Contribuire

Correre `pnpm --filter @mission-platform/stylelint-config lint` E
`pnpm --filter @mission-platform/stylelint-config format`. Testare le modifiche alle regole
rispetto sia al pacchetto SCSS che agli stili dell'applicazione.
