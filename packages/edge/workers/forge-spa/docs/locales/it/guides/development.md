# Sviluppa il lavoratore Forge SPA

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/edge/workers/forge-spa/docs/guides/development.md: [packages/edge/workers/forge-spa/docs/guides/development.md](../../../guides/development.md)
> Lingua: Italiano (it)

Esegui i controlli del pacchetto dalla root del repository:

```bash
pnpm --filter @mission-platform/forge-spa build:check
pnpm --filter @mission-platform/forge-spa test
pnpm --filter @mission-platform/forge-spa build
```

La build emette `dist/index.js` e dichiarazioni. Mantieni il conduttore limitato a
la delega digitata `ASSETS.fetch(request)` e l'inoltro della richiesta di test. Prova
e distribuire percorsi applicativi dall'app che li utilizza; non aggiungere l'applicazione
configurazione o risorse a questo lavoratore condiviso.
