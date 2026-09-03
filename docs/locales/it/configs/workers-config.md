# Directory di distribuzione del lavoratore

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/packages/tooling/configs/workers-config.md: [docs/packages/tooling/configs/workers-config.md](../../../packages/tooling/configs/workers-config.md)
> Lingua: Italiano (it)

La documentazione di implementazione del lavoratore appartiene accanto a ciascun lavoratore pubblicabile:

- [`@mission-platform/api-proxy`](../../../../packages/edge/workers/api-proxy/docs/locales/it/index.md) — proxy API di sola lettura vincolato.
- [`@mission-platform/email-sender`](../../../../packages/edge/workers/email-sender/docs/locales/it/index.md) - mittente locale supportato da MailPit.
- [`@mission-platform/forge-spa`](../../../../packages/edge/workers/forge-spa/docs/locales/it/index.md) - condiviso `ASSETS` Gestore di fallback SPA.

Questa pagina del progetto conserva solo la mappa di distribuzione tra aree di lavoro. Lavoratore
i pacchetti possiedono i propri contratti di gestione, esempi, test e istruzioni di compilazione;
i pacchetti applicativi possiedono percorsi, domini, associazioni e distribuzione
ambienti.

## Mappa di distribuzione dell'applicazione

| Applicazione | Gestore | Configurazione | Beni |
| :---------- | :------ | :------------ | :----- |
| Sito web | `packages/edge/workers/forge-spa/dist/index.js` | `apps/website/wrangler.jsonc` | `apps/website/dist/`, legato come `ASSETS` |
| Le mie note di cura | `packages/edge/workers/forge-spa/dist/index.js` | `apps/my-care-notes/wrangler.jsonc` | `apps/my-care-notes/dist/`, legato come `ASSETS` |
| Monitoraggio del servizio | `apps/service-monitor/src/worker.tsx` | `apps/service-monitor/wrangler.jsonc` | `apps/service-monitor/public/`, legato come `ASSETS` |
| Documenti | Asset statici | `apps/docs/wrangler.jsonc` | `apps/docs/dist/` |

Il sito Web e My Care Notes utilizzano il lavoratore condiviso Forge SPA. Monitoraggio del servizio
possiede il punto di ingresso Worker e l'associazione di oggetti durevoli. Il sito dei documenti è a
statico Vite distribuzione e non dispone di punto di ingresso di lavoro; Il libro di fiabe non è un
obiettivo di distribuzione.

Distribuire dal pacchetto dell'applicazione cui Wrangler la configurazione possiede il
percorso e ambiente. Mantieni i segreti fuori dalla configurazione e dall'utilizzo tracciati
Archiviazione segreta Cloudflare per valori sensibili. Vedi l'applicazione specifica
script di distribuzione e guide di lavoro locali del pacchetto per l'implementazione
dettagli.
