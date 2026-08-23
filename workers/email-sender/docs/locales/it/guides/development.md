# Sviluppare il lavoratore mittente della posta elettronica

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> workers/email-sender/docs/guides/development.md: [workers/email-sender/docs/guides/development.md](../../../guides/development.md)
> Lingua: Italiano (it)

Esegui i controlli del pacchetto dalla root del repository:

```bash
pnpm --filter @mission-platform/email-sender build:check
pnpm --filter @mission-platform/email-sender test
pnpm --filter @mission-platform/email-sender build
```

Esegui `pnpm --filter @mission-platform/email-sender types` dopo la modifica
legature. Aggiungi la convalida dell'endpoint, l'errore SMTP e i test di risposta stabile per
modifiche contrattuali. Mantieni il gestore Worker compatibile con Cloudflare e mantieni
Comportamento solo MailPit dietro la configurazione di sviluppo locale.
