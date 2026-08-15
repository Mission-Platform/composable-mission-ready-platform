# Configurazione e sviluppo dei lavoratori

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> Fonte inglese: [docs/configs/workers-config.md](../../../configs/workers-config.md)
> Lingua: Italiano (it)

Questo documento descrive i lavoratori Cloudflare nel monorepo della Mission Platform, i loro TypeScript punti di ingresso e il
file di configurazione utilizzati per eseguirli o distribuirli.

## Inventario dei lavoratori

I pacchetti per lavoratori autonomi vivono sotto `workers/`:

| Lavoratore | Gestore | Configurazione | Scopo |
| :----- | :------ | :------------ | :------ |
| `api-proxy` | `workers/api-proxy/src/index.ts` | Nessuno; consumato come pacchetto combinato | Proxy API di sola lettura vincolato |
| `email-sender` | `workers/email-sender/src/index.ts` | `workers/email-sender/wrangler.jsonc` | Lavoratore vetrina e-mail supportato da MailPit |
| `forge-spa` | `workers/forge-spa/src/index.ts` | Nessuno; consumato come pacchetto combinato | `ASSETS`-binding Gestore fallback SPA |

I Worker dell'applicazione distribuibile sono:

| Applicazione | Gestore | Configurazione |
| :---------- | :------ | :------------ |
| Sito web | `workers/forge-spa/dist/index.js` | `apps/website/wrangler.jsonc` |
| Le mie note di cura | `workers/forge-spa/dist/index.js` | `apps/my-care-notes/wrangler.jsonc` |
| Monitoraggio del servizio | `apps/service-monitor/src/worker.tsx` | `apps/service-monitor/wrangler.jsonc` |

`api-proxy` E `forge-spa` non hanno autonomo Wrangler file di configurazione: loro `src/index.ts` i gestori sono
impacchettato da `tsdown` e referenziato dall'applicazione Wrangler configurazioni o una distribuzione di consumo.

## Costruisci sistema

Utilizzo dei pacchetti di lavoro `tsdown` per il raggruppamento. Utilizzare l'attività del pacchetto tramite Turborepo o pnpm così sono le dipendenze dello spazio di lavoro
risolto in modo coerente:

```bash
pnpm exec turbo run build --filter=@mission-platform/api-proxy
pnpm exec turbo run build --filter=@mission-platform/forge-spa
pnpm exec turbo run build --filter=@mission-platform/email-sender
```

Utilizzo dei test sui lavoratori Vitest:

```bash
pnpm --filter @mission-platform/api-proxy test
pnpm --filter @mission-platform/email-sender test
pnpm --filter @mission-platform/forge-spa test
```

Utilizzo `@cloudflare/workers-types` per i tipi di gestore e rilegatura. Le dichiarazioni vincolanti generate dal mittente dell'e-mail sono
scritto a `workers/email-sender/src/worker-configuration.d.ts` dal suo `types` sceneggiatura.

## Configurazione e sviluppo locale

I lavoratori ricevono valori di runtime tramite il file `env` oggetti e collegamenti Cloudflare. Non inserire segreti nel tracciato
`wrangler.jsonc` file; utilizzo `wrangler secret put` per i valori sensibili.

Per il mittente e-mail autonomo, esegui il file configurato Wrangler server di sviluppo dal pacchetto workspace:

```bash
pnpm --filter @mission-platform/email-sender dev
```

Per le applicazioni distribuibili, utilizzare gli script in ogni pacchetto dell'app. Ad esempio, il sito Web e My Care Notes Wrangler
i file forniscono `staging` E `production` ambienti, mentre Service Monitor fornisce a `staging` ambiente:

```bash
pnpm --filter @mission-platform/website cf:dev
pnpm --filter @mission-platform/my-care-notes cf:dev
pnpm --filter @mission-platform/service-monitor dev
```

## Distribuzione

Distribuire dal pacchetto dell'applicazione cui `wrangler.jsonc` possiede il percorso e l'ambiente:

```bash
pnpm --filter @mission-platform/website deploy:staging
pnpm --filter @mission-platform/my-care-notes deploy:staging
pnpm --filter @mission-platform/service-monitor deploy:staging
```

I pacchetti lavoratore autonomo senza Wrangler la configurazione non viene distribuita direttamente con `wrangler deploy`; costruire
i loro gestori e distribuirli attraverso la configurazione dell'applicazione di consumo.

## Migliori pratiche

- Raggruppare le dipendenze nell'output del lavoratore per un'esecuzione edge prevedibile.
- Usa il `env` oggetto passato al `fetch` gestore anziché variabili di processo globali.
- Evitare Node.js integrati non supportati dal runtime Workers, come `fs` E `child_process`, nei gestori dei lavoratori.
- Mantieni piccoli i pacchetti di lavoro per ridurre al minimo gli avvii a freddo e rimanere entro i limiti delle risorse Cloudflare.
