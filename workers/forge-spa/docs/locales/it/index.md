# @mission-platform/forge-spa

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> workers/forge-spa/docs/index.md: [workers/forge-spa/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Il punto di ingresso Cloudflare Worker condiviso per Mission Platform SPA e SSG
implementazioni. Delega le richieste all'associazione `ASSETS` e viene utilizzato da
applicazioni piuttosto che distribuite in modo indipendente.

## Integrare il lavoratore

Crea il pacchetto, quindi fai riferimento al suo gestore compilato da un'app che lo utilizza
Configurazione Wrangler:

```bash
pnpm --filter @mission-platform/forge-spa build
```

La configurazione del consumatore dovrebbe impostare `main` su
`workers/forge-spa/dist/index.js` e associare la directory dell'applicazione `dist/` come
`ASSETS` con gestione fallback SPA. Il sito Web e My Care Notes sono aggiornati
consumatori.

Il lavoratore non possiede percorsi, risorse, domini o ambienti dell'applicazione
segreti. Quelli rimangono nel pacchetto dell'applicazione di consumo.

- [Guida allo sviluppo](guides/development.md)
- [`README.md`](../../../README.md)
