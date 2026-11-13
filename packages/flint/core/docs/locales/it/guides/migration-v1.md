# Migrazione alla pipeline FWS sicura per impostazione predefinita

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/flint/core/docs/guides/migration-v1.md: [packages/flint/core/docs/guides/migration-v1.md](../../../guides/migration-v1.md)
> Lingua: Italiano (it)

Questa guida riguarda i moduli FWS scritti prima di local immutabili, prestiti espliciti,
e i metadati della politica dei limiti controllati sono diventati parte del contratto v1.

## Rendi esplicita la mutazione

Aggiungere `mut` alle localizzazioni e ai parametri assegnati. Aggiungi `&` per un valore immutabile
prendere in prestito e `&mut` per un prestito mutabile; i prestiti mutabili non possono sovrapporsi.

```flint
fn increment(mut value: i32) -> i32 {
  value = value + 1;
  value
}

fn inspect(values: &Vector<i32>) -> i32 { values[0] }
fn update(values: &mut Vector<i32>) -> unit { values[0] = 1; }
```

Non fare affidamento sulla proprietà dedotta. I valori POD vengono passati per valore per impostazione predefinita;
i valori non POD utilizzano riferimenti immutabili. Mantieni `owned`, `borrowed` e `shared`
sui confini ABI in cui è prevista una durata specifica o una responsabilità di rilascio
richiesto. Una regione temporanea non può essere restituita o archiviata in una regione di più lunga durata
valore senza un esplicito confine di proprietà/promozione.

## Scegliere e controllare la politica dei limiti

I controlli dei limiti di runtime rimangono l'impostazione predefinita:

```bash
flint compile src/main.flint --bounds-checks runtime --format json
```

Utilizzare `proven-safe` solo quando l'analisi dimostra ogni accesso dalla lunghezza della raccolta
e fatti relativi all'intervallo dell'indice. `excluded-by-profile` è una versione esplicita e verificabile
scelta, non una scorciatoia per indici sconosciuti:

```bash
flint check src/main.flint --bounds-checks proven-safe --optimizer-report
```

Esaminare i risultati dell'analisi e la politica del manifest prima della spedizione. Sconosciuto o
gli indici non attendibili dovrebbero utilizzare `runtime`; un’analisi rigorosa respinge una politica non sicura
richieste.

## Esamina i metadati della cache generati

La cache del compilatore può contenere `<key>.sonir.json`, un riepilogo deterministico di
il grafico ottimizzato del Mare dei Nodi. Ispezionalo senza eseguire il codice ospite:

```bash
flint inspect-sonir .cache/main.sonir.json --format json
```

L'artefatto registra le versioni dello schema e della lingua/ABI, gli hash di origine e del grafico,
modalità di ottimizzazione, policy sui limiti, effetti, metadati di proprietà, intervalli di origine,
e ho ordinato i rapporti sui passaggi. Stanti, non formati correttamente, sovradimensionati o non corrispondenti alle norme
gli artefatti vengono ignorati e possono essere rimossi in sicurezza.

## Tipizzazione statica rigorosa e assenza di tipi dinamici

Flint è un linguaggio tipizzato staticamente con layout di memoria deterministico e zero spese di riflessione in fase di esecuzione. Il linguaggio non supporta i tipi superiori dinamici come `any` o `unknown`.

Il tentativo di annotare i tipi con `any` o `unknown` produce la diagnostica in fase di compilazione `FLINT-TYPE-020`. Per migrare il codice da ambienti dinamici:

- Sostituire i valori dinamici con primitive concrete (`i32`, `u32`, `f64`, `bool`, `string`, `bytes`).
- Utilizzare polimorfismo parametrico/generici (`Vector<T>`, `Option<T>`, `Result<T, E>`) per algoritmi di contenitori riutilizzabili.
- Utilizzare tipi di dati algebrici con tag (`enum`) per rappresentazioni di domini polimorfici.
- Per i puntatori C ABI e gli handle host opachi, dichiarare `opaque foreign type Handle;` anziché puntatori non tipizzati.
- Nei bridge e nei collegamenti Web IDL, fornire mappature di tipo esplicite tramite `FlintBindingOptions.customTypeMappings`.

## Memoria e comportamento di rilascio

I valori con ambito utilizzano le regioni selezionate. I valori che sopravvivono a una regione sono espliciti
ARC/maniglie condivise; ogni maniglia trattenuta ha un rilascio corrispondente e cicli
non sono implicitamente accettati. `fws_alloc`, `fws_realloc` e `fws_dealloc` non elaborati
rimanere il confine ABI controllato di proprietà del chiamante. La sospensione asincrona e iteratrice lo è
un limite di fuga, quindi i valori utilizzati dopo la sospensione devono essere conservati esplicitamente.
