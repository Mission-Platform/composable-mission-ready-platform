# Guida alla risoluzione dei problemi

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/troubleshooting.md: [docs/troubleshooting.md](../../troubleshooting.md)
> Lingua: Italiano (it)

Questa guida fornisce soluzioni per problemi comuni riscontrati durante lo sviluppo, la creazione e la distribuzione all'interno della Missione
Piattaforma monorepo. È strutturato come una **guida pratica** per la diagnosi e la risoluzione dei problemi tecnici.

## Problemi di prestazioni

### LCP lento (pittura con contenuto più grande)

**Problema**: LCP è superiore alla soglia di 2,5 s per una valutazione "Buona".

**Diagnosi**:

1. Esegui un controllo Lighthouse in Chrome DevTools.
2. Identificare l'elemento LCP nel pannello "Prestazioni".
3. Controlla la scheda "Rete" per i ritardi nel caricamento delle risorse.

**Soluzioni**:

- **CSS critici in linea**: assicurati che gli stili richiesti per i contenuti sopra la piega siano incorporati.
- **Ottimizzazione immagine**: utilizza i formati WebP/AVIF e fornisci `srcset` per immagini reattive.
- **Precaricamento risorse**: utilizzare `<link rel="preload">` per l'immagine LCP o i caratteri critici.
- **Riduci al minimo il lavoro del thread principale**: rinvia JavaScript non essenziale utilizzando `async` o `defer`.

### Perdite di memoria

**Problema**: l'applicazione consuma quantità crescenti di memoria nel tempo, causando infine arresti anomali.

**Diagnosi**:

1. Acquisisci più "istantanee heap" nella scheda Memoria di Chrome DevTools.
2. Confronta le istantanee per identificare gli oggetti che stanno crescendo in numero o dimensione.
3. Cerca "Elementi DOM distaccati".

**Soluzioni**:

- **Pulizia nei componenti componibili**: cancella sempre i timer e rimuovi i listener di eventi in `onUnmounted`.
- **Gestione negozio**: assicurati che lo stato reattivo in Pinia o in altri negozi venga cancellato quando non è più necessario.
- **Elimina elementi osservabili**: se si utilizza RxJS, assicurarsi che tutte le iscrizioni siano annullate.

## Problemi di costruzione e spazio di lavoro

### Errori di memorizzazione nella cache Turborepo

**Problema**: le modifiche non si riflettono nella build oppure la build fallisce con artefatti obsoleti.

**Soluzione**: forza una nuova build ignorando la cache o svuotandola manualmente.

```bash
# Force a build without cache
pnpm build:force

# Manually clear the turbo cache
rm -rf .turbo
```

### Modulo non trovato/Risoluzione dell'area di lavoro

**Problema**: TypeScript o Vite non riescono a trovare un pacchetto definito nello spazio di lavoro.

**Soluzioni**:

1. Verificare che il pacchetto sia elencato nell'`package.json` dell'area di lavoro di consumo.
2. Assicurarsi che la versione corrisponda (si consiglia `workspace:*`).
3. Eseguire `pnpm install` per aggiornare i collegamenti simbolici.
4. Se i problemi persistono, prova una pulizia approfondita:
```bash
   pnpm -r exec rm -rf node_modules
   pnpm install
   ```

### Digitare Errori in CI ma non Locale

**Problema**: la compilazione non riesce nell'elemento della configurazione con errori TypeScript che non vengono visualizzati nell'IDE.

**Soluzione**: esegui il controllo del tipo localmente nell'intero spazio di lavoro.

```bash
pnpm exec turbo run build:check
```

Ciò garantisce che tutti i limiti del pacchetto siano rispettati correttamente e che i tipi vengano convalidati in modo pulito.

## Risoluzione dei problemi del server MCP

### Impossibile connettersi

**Problema**: il tuo client AI o IDE non riesce a connettersi al server MCP di Mission Platform.

**Diagnosi**:

1. Verificare che il server MCP sia creato: `pnpm exec turbo run build --filter @mission-platform/mcp-*`.
2. Controllare se il server si avvia manualmente: `node mcp/developer/dist/index.js`.

**Soluzioni**:

- Assicurati di utilizzare il percorso assoluto del file binario node e dello script nella configurazione del client.
- Controllare i registri del server MCP per messaggi di errore specifici (ad esempio, variabili di ambiente mancanti).

## Modelli di errore comuni

### "Impossibile leggere la proprietà di undefinito"

**Causa**: accesso alle proprietà su un oggetto nullo o non definito, spesso prima che i dati abbiano terminato il caricamento. **Correzione**: utilizzare
concatenamento opzionale (`?.`) o fornire valori predefiniti.

```typescript
// Instead of:
const name = user.profile.name;

// Use:
const name = user?.profile?.name ?? 'Guest';
```

### "Rifiuto di una promessa non gestita"

**Causa**: una funzione asincrona ha generato un errore che non è stato rilevato. **Correzione**: racchiude sempre le chiamate asincrone nei blocchi `try/catch`.

```typescript
try {
  await fetchData();
} catch (error) {
  handleError(error);
}
```

## Risorse correlate

- [Migliori pratiche](best-practices.md)
- [Configurazione dello sviluppo](development-setup.md)
- [Guida al test](testing.md)
