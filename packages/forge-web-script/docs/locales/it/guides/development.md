# Sviluppa script Web Forge

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/forge-web-script/docs/guides/development.md: [packages/forge-web-script/docs/guides/development.md](../../../guides/development.md)
> Lingua: Italiano (it)

Questa guida è rivolta ai contributori che modificano il parser Forge Web Script, selezionata
contratti o dispositivi di conformità.

## Installa e controlla il pacchetto

Dalla root del repository, installa le dipendenze ed esegui i controlli del pacchetto:

```bash
pnpm install
pnpm --filter @mission-platform/forge-web-script build:check
pnpm --filter @mission-platform/forge-web-script test
```

Esegui `pnpm --filter @mission-platform/forge-web-script build` prima della pubblicazione.
La build genera il bundle sicuro per il browser e i file di dichiarazione in `dist/`.

## Aggiungi un cambio di lingua

Aggiorna insieme la grammatica e il frontend controllato. Aggiungi un dispositivo focalizzato a
`src/fixtures/` e un test di regressione per la diagnostica o il comportamento generato.
Mantenere esplicita la versione della lingua `1.0` e la versione ABI `1.2` a meno che la modifica non sia
una revisione intenzionale della compatibilità. Le modifiche ABI devono aggiornare i manifest,
caricatori e la documentazione di compatibilità.

Il pacchetto è sicuro per il browser. Non aggiungere API solo Node alla facciata pubblica;
Gli strumenti specifici di Node appartengono a `@mission-platform/forge-web-script-cli`.

## Artefatti generati e di origine

Le origini `.fws` archiviate in `src/self-hosted/fws/` sono artefatti di origine,
JavaScript non copiato a mano. Conserva l'output generato in `dist/` e non eseguire il commit
output di compilazione locale. Il riferimento alla documentazione del pacchetto viene mantenuto accanto
il pacchetto e verrà rigenerato dal flusso di lavoro di estrazione della documentazione.
