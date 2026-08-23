# Gestione delle dipendenze circolari

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/circular-dependencies.md: [docs/circular-dependencies.md](../../circular-dependencies.md)
> Lingua: Italiano (it)

Questo documento spiega l'impatto delle dipendenze circolari all'interno del monorepo di Mission Platform e fornisce un **How-to
guida** per rilevarli, risolverli e prevenirli. Serve sia come **Spiegazione** della salute di monorepo sia come a
ricetta tecnica per il refactoring.

## Cosa sono le dipendenze circolari?

Una dipendenza circolare si verifica quando due o più pacchetti dipendono l'uno dall'altro, direttamente o indirettamente. Per esempio:

- Il pacchetto A importa dal pacchetto B.
- Il pacchetto B viene importato dal pacchetto A.

In un monorepo questi cicli sono particolarmente dannosi perché possono causare:

- **Errori di compilazione**: risoluzione del grafico delle dipendenze (ad esempio, tramite Turborepo o pnpm) può bloccarsi o fallire.
- **Errori di runtime**: un modulo potrebbe essere parzialmente inizializzato quando l'altro tenta di utilizzare le sue esportazioni.
- **Accoppiamento aumentato**: i pacchetti diventano impossibili da utilizzare o testare isolatamente.

## Rilevamento

Mission Platform utilizza diversi strumenti automatizzati per individuare le dipendenze circolari prima che raggiungano la produzione.

### ESLint `no-restricted-paths`

La nostra condivisa ESLint la configurazione impone il flusso di dipendenza unidirezionale. Se provi a importare da un pacchetto that
dovrebbe essere "sopra" il tuo nella gerarchia, il linter genererà un errore.

Esegui il linter per verificare la presenza di violazioni:

```bash
pnpm lint
```

### Audit manuale con Madge

Per cicli complessi che si estendono su più file, è possibile utilizzare `madge` (se installato) o visualizzatori simili per mappare i
grafico delle dipendenze.

## Procedura: risolvere le dipendenze circolari

Quando viene rilevata una dipendenza circolare, utilizzare una delle seguenti strategie per risolverla.

### Strategia 1: estrazione del codice condiviso (consigliato)

Se il Pacchetto A e il Pacchetto B necessitano entrambi di una parte logica comune, spostare tale logica in un nuovo pacchetto di livello inferiore (ad esempio,
`packages/utils-shared`).

**Prima**:

- Pacchetto A ↔ Pacchetto B

**Dopo**:

- Pacchetto A → Pacchetto C
- Pacchetto B → Pacchetto C

### Strategia 2: inversione delle dipendenze

Invece di importare il pacchetto B direttamente dal pacchetto A, fai in modo che il pacchetto B accetti la funzionalità richiesta come oggetto di scena, a
oggetto di configurazione o tramite un bus di eventi.

**Esempio**:
Invece di `AuthService` importazione `UserService` per aggiornare un profilo, `AuthService` può emettere un `AUTH_SUCCESS` evento
quello `UserService` ascolta.

### Strategia 3: consolidamento

Se due pacchetti sono così strettamente accoppiati da richiedere costantemente i rispettivi componenti interni, potrebbero effettivamente essere a
unica unità logica. Valuta la possibilità di unirli in un unico pacchetto.

## Migliori pratiche di prevenzione

1. **Segui il flusso unidirezionale**: aderisci rigorosamente al `Apps → Packages → Configs` direzione della dipendenza.
2. **Logica neutra rispetto al framework dell'autore**: utilizzo `@mission-platform/forge` per la logica di base per evitare cicli specifici del framework.
3. **Utilizza protocolli Workspace**: utilizzare sempre `workspace:*` per le dipendenze interne da garantire pnpm può risolvere correttamente
   il grafico.
4. **Controlla regolarmente le importazioni**: presta attenzione ai suggerimenti di "importazione automatica" nel tuo IDE, poiché a volte possono introdurre
   dipendenze tra pacchetti non intenzionali.

## Documentazione correlata

- [Migliori pratiche](best-practices.md)
- [Struttura dell'area di lavoro](workspace-structure.md)
- [Guida alla risoluzione dei problemi](troubleshooting.md)
