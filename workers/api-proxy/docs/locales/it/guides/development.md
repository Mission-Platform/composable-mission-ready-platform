# Sviluppare il lavoratore proxy API

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> workers/api-proxy/docs/guides/development.md: [workers/api-proxy/docs/guides/development.md](../../../guides/development.md)
> Lingua: Italiano (it)

Esegui i controlli mirati dalla root del repository:

```bash
pnpm --filter @mission-platform/api-proxy build:check
pnpm --filter @mission-platform/api-proxy test
pnpm --filter @mission-platform/api-proxy build
```

La build emette `dist/index.js` e dichiarazioni. Mantieni il gestore compatibile
con il runtime Cloudflare Workers: utilizzare l'oggetto digitato `env` per i collegamenti
e non aggiungere i componenti integrati Node.js. Aggiungi test per elenchi di percorsi consentiti, disinfettati
intestazioni, inoltro di query ed errori upstream durante la modifica del gestore.
