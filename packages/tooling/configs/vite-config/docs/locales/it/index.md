# @mission-platform/vite-config

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/tooling/configs/vite-config/docs/index.md: [packages/tooling/configs/vite-config/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Helper di configurazione condivisi Vite e Vitest per i pacchetti Mission Platform e
applicazioni.

## Installare e utilizzare

```bash
pnpm add --save-dev @mission-platform/vite-config
```

Utilizzare `defineLibraryConfig` per i pacchetti, `defineAppConfig` per le applicazioni e
`defineVitestConfig` dal sottopercorso `/vitest`. Le applicazioni quadro dovrebbero
selezionare una condizione `defineFrameworkAppConfig` e quindi importare i pacchetti condivisi
attraverso i loro identificatori di pacchetto semplici.

## Contribuire

Esegui `pnpm --filter @mission-platform/vite-config lint` e formatta i controlli. Tieni
le impostazioni predefinite dell'helper sono riutilizzabili e preservano Vite, PostCSS e condivisi
comportamento di esternalizzazione descritto nel pacchetto README.
