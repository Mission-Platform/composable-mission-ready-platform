# @mission-platform/vite-config

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> configs/vite-config/docs/index.md: [configs/vite-config/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Condiviso Vite E Vitest aiutanti di configurazione per i pacchetti Mission Platform e
applicazioni.

## Installare e utilizzare

```bash
pnpm add --save-dev @mission-platform/vite-config
```

Utilizzo `defineLibraryConfig` per i pacchi, `defineAppConfig` per le applicazioni e
`defineVitestConfig` dal `/vitest` sottopercorso. Le applicazioni quadro dovrebbero
selezionane uno `defineFrameworkAppConfig` condizione e quindi importare i pacchetti condivisi
attraverso i loro identificatori di pacchetto semplici.

## Contribuire

Correre `pnpm --filter @mission-platform/vite-config lint` e controlli del formato. Tieni
le impostazioni predefinite dell'helper sono riutilizzabili e preservano quelle condivise Vite, PostCSS e
comportamento di esternalizzazione descritto nel pacchetto README.
