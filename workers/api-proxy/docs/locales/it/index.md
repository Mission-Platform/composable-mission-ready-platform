# @mission-platform/api-proxy

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> workers/api-proxy/docs/index.md: [workers/api-proxy/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Un esempio di Cloudflare Worker che esegue il proxy delle route API di sola lettura approvate a a
servizio fisso a monte. Questo spazio di lavoro possiede la policy di richiesta, header
sanificazione e limite di errore per il gestore proxy.

## Usa il lavoratore

Il pacchetto esporta il gestore in bundle da `@mission-platform/api-proxy`.
Costruirlo prima di fare riferimento a `dist/index.js` da una configurazione Wrangler:

```bash
pnpm --filter @mission-platform/api-proxy build
```

Sono accettate solo le richieste `GET` e `HEAD` a `/users` e `/v1`. Domanda
le stringhe vengono inoltrate; credenziali, l'`Host` originale e hop-by-hop
le intestazioni vengono rimosse. Gli errori upstream o di costruzione della richiesta restituiscono `502`.

## Limitazioni

Il pacchetto non ha una configurazione di distribuzione Wrangler archiviata e non è un file
proxy inverso generico. Aggiungi una configurazione di distribuzione esplicita e
rivedere le modifiche relative all'autenticazione, all'upstream e alla memorizzazione nella cache prima di esporle.

- [Guida allo sviluppo](guides/development.md)
- [`README.md`](../../../README.md)
