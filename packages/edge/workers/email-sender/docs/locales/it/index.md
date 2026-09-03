# @mission-platform/email-sender

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/edge/workers/email-sender/docs/index.md: [packages/edge/workers/email-sender/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Un Cloudflare Worker solo locale che accetta l'HTML completato e lo invia a
MailPit su SMTP. Questa area di lavoro possiede il contratto `/api/email/send` e il suo
Configurazione dello sviluppo di MailPit.

## Utilizzare localmente

L'endpoint convalida `{ to, recipientName, html }` e restituisce un JSON stabile
risultato dopo la consegna. Avvia MailPit, genera associazioni Worker locali, quindi esegui
il lavoratore:

```bash
docker run --rm --name mission-mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
pnpm --filter @mission-platform/email-sender types
pnpm --filter @mission-platform/email-sender dev -- --port 8787
```

L'endpoint SMTP predefinito è `127.0.0.1:1025`, con l'interfaccia utente di MailPit su
`http://localhost:8025`. Sostituisci le variabili locali Wrangler quando ne usi un'altra
ospite.

Questo lavoratore è una vetrina locale e non è un servizio di posta di produzione. Mai
inserire credenziali o segreti nella configurazione Wrangler tracciata.

- [Guida allo sviluppo](guides/development.md)
- [`README.md`](../../../README.md)
