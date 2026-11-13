# Sviluppa Flint

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/flint/core/docs/guides/development.md: [packages/flint/core/docs/guides/development.md](../../../guides/development.md)
> Lingua: Italiano (it)

Questa guida è per i contributori che modificano il parser Flint, selezionata
contratti o dispositivi di conformità.

## Installa e controlla il pacchetto

Dalla root del repository, installa le dipendenze ed esegui i controlli del pacchetto:

```bash
pnpm install
pnpm --filter @mission-platform/flint build:check
pnpm --filter @mission-platform/flint test
```

Esegui `pnpm --filter @mission-platform/flint build` prima della pubblicazione.
La build genera il bundle sicuro per il browser e i file di dichiarazione in `dist/`.

## Aggiungi un cambio di lingua

Aggiorna insieme la grammatica e il frontend controllato. Aggiungi un dispositivo focalizzato a
`src/fixtures/` e un test di regressione per la diagnostica o il comportamento generato.
Mantenere esplicita la versione della lingua `1.0` e la versione ABI `1.2` a meno che la modifica non sia
una revisione intenzionale della compatibilità. Le modifiche ABI devono aggiornare i manifest,
caricatori e la documentazione di compatibilità.

Il pacchetto è sicuro per il browser. Non aggiungere API solo Node alla facciata pubblica;
Gli strumenti specifici di Node appartengono a `@mission-platform/flint-cli`.

## Artefatti generati e di origine

Le origini `.flint` archiviate in `src/self-hosted/fws/` sono artefatti di origine,
JavaScript non copiato manualmente. Conserva l'output generato in `dist/` e non eseguire il commit
output di compilazione locale. Il riferimento alla documentazione del pacchetto viene mantenuto accanto
il pacchetto e verrà rigenerato dal flusso di lavoro di estrazione della documentazione.

## Ispezione della pipeline a due stadi

Il confine canonico del frontend è il grafico deterministico Sea-of-Nodes. Il
il grafico viene ottimizzato prima di scendere a Wasm IR, dove si applica un secondo ottimizzatore
propagazione backend-safe, rimozione del codice morto, semplificazione degli indirizzi, switch
abbassamento e layout deterministico. Mantenere entrambe le fasi verificabili: ottimizzatore
i report e la policy dei limiti selezionati devono essere conservati negli artefatti del compilatore.

Utilizzare i controlli dei limiti di runtime a meno che una regola di produzione di prove non li stabilisca
accesso sicuro. `proven-safe` e `excluded-by-profile` sono policy esplicite
valori, non un comportamento di rilascio implicito. Un artefatto della cache `.sonir.json` è
solo dati diagnostici; i lettori devono convalidarne lo schema, gli hash, la policy e
limiti prima di visualizzarlo e non deve mai eseguire il contenuto del grafico.

Per i controlli di fumo CLI:

```bash
flint check src/example.flint --bounds-checks runtime --optimizer-report --format json
flint inspect-sonir .cache/example.sonir.json --format json
```

Quando si modifica l'analisi, aggiungere fatti e un test diagnostico stabile prima di modificare
una regola di ottimizzazione. L'analisi dello sviluppo dovrebbe esporre intervalli sconosciuti,
alias/stati di durata, cambio di copertura e passaggio di metadati; è necessaria un'analisi rigorosa
bloccare richieste di policy sui limiti non sicuri e violazioni di regioni/proprietà.
