# @mission-platform/postcss-config

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/tooling/configs/postcss-config/docs/index.md: [packages/tooling/configs/postcss-config/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Pipeline PostCSS condivisa utilizzata dai fogli di stile di Mission Platform.

## Installare e utilizzare

```bash
pnpm add --save-dev @mission-platform/postcss-config
```

Fare riferimento al pacchetto dall'area di lavoro `postcss.config.mjs` piuttosto che
duplicando la pipeline del plugin condiviso. Gli override locali rientrano in questo
configurazione dello spazio di lavoro.

## Contribuire

Correre `pnpm --filter @mission-platform/postcss-config lint` E
`pnpm --filter @mission-platform/postcss-config format`. Mantieni il browser
comportamento di compatibilità in questo pacchetto ed evitare plugin specifici dell'applicazione.
