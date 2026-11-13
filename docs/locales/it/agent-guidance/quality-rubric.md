# Rubrica sulla qualità del lavoro degli agenti

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/agent-guidance/quality-rubric.md: [docs/agent-guidance/quality-rubric.md](../../../agent-guidance/quality-rubric.md)
> Lingua: Italiano (it)

Utilizzare questa rubrica prima dell'implementazione per scegliere un approccio e durante la revisione per valutare il risultato. Applicare ogni dimensione adatta all'attività; una modifica basata esclusivamente sulla documentazione deve comunque essere semplice, manutenibile, leggibile e igienica. Registrare prove concrete di compromessi materiali invece di trattare la rubrica come un punteggio soggettivo.

## Il più piccolo cambiamento sicuro

- Indicare il risultato richiesto e la più piccola modifica che possa soddisfarlo.
- Preferire modelli di repository, pacchetti, strumenti, profili e documentazione esistenti rispetto a nuove astrazioni.
- Escludere dall'attività la pulizia non correlata, la riprogettazione speculativa e le modifiche del runtime MCP non approvate.
- Ampliare l'ambito solo quando le prove dimostrano che un approccio più limitato non può preservare la correttezza, la sicurezza o la convalida richiesta.

## Sette dimensioni

### Semplicità

- La soluzione utilizza il minor numero di file, parti mobili, dipendenze, transizioni di stato e chiamate a strumenti che soddisfano il requisito?
- Riutilizza un componente, un'utilità, un token, una traduzione, un flusso di lavoro o una funzionalità MCP esistente invece di duplicarne uno?
- Sono state rimosse le astrazioni speculative, gli strumenti MCP duplicati e le modifiche non necessarie alla configurazione?

### Complessità

- Identificare nuove dipendenze, stato, flusso di controllo, bordi tra pacchetti, superficie del profilo/utensile, passaggi operativi e modalità di errore.
- Spiegare perché ogni inevitabile fonte di complessità è necessaria e perché un'alternativa più semplice è insufficiente.
- Mantieni la complessità locale al pacchetto proprietario o al documento dell'argomento ed evita di diffondere la politica su fonti duplicate.

### Affidabilità

- Definire il comportamento atteso osservabile e le prove che lo dimostreranno.
- Preferire comportamento deterministico, operazioni limitate, gestione esplicita degli errori e fallback sicuri.
- Convalidare i percorsi che contano, compresi i casi negativi e i confini dell'integrazione; non trattare un dispositivo parziale, una diagnostica della sorgente o un'unità isolata come prova di un comportamento end-to-end.
- Segnalare fallimenti, incertezze e ipotesi non verificate invece di dedurre silenziosamente il successo.

### Manutenibilità

- Seguire le convenzioni del repository per struttura, denominazione, dipendenze, test, documentazione e proprietà.
- Mantenere le responsabilità locali e fornire a ciascuna regola una documentazione canonica a casa.
- Documentare decisioni durevoli e vincoli non ovvi dove un futuro agente li troverà.
- Evita collegamenti obsoleti, inventari duplicati, implementazioni parallele e formulazioni che possono allontanarsi dalla fonte della verità.

### Sicurezza

- Preservare privilegi minimi, root del repository e limiti del percorso, esecuzione senza shell, approvazione esplicita della mutazione e igiene segreta.
- Difendersi dall'iniezione, utilizzare la crittografia approvata e pratiche di dipendenza e preservare la direzione delle dipendenze.
- Non indebolire le scansioni di sicurezza esistenti né sostituire l'ispezione limitata/di sola lettura con un accesso più ampio per comodità.
- Per le modifiche applicabili, eseguire i controlli di sicurezza MCP pertinenti per sviluppatori: `security_scan_secrets`, `security_analyze_code`, `security_audit_dependencies`, `security_audit_supply_chain`, `security_collect_compliance_evidence` e `security_audit_compliance`.

### Igiene

- Mantieni focalizzata la differenza e preserva la formattazione, la denominazione e le convenzioni del flusso di lavoro del repository.
- Rimuovi gli artefatti temporanei creati durante l'attività senza eliminare file preesistenti o gestiti dalla sessione.
- Aggiornare la documentazione e i collegamenti interessati e verificare che non siano stati inclusi file generati, locali, segreti o non correlati.
- Riportare l'esatta validazione effettuata ed eventuali controlli che non è stato possibile eseguire.

### Leggibilità e comprensione

- Utilizzare una gerarchia di titoli chiara, sezioni brevi, una terminologia coerente e frasi dirette in modo che l'agente destinatario possa esaminare rapidamente la guida.
- Ridurre al minimo il carico cognitivo: presentare i prerequisiti prima delle azioni, tenere insieme le regole correlate, identificare il lavoro obbligatorio rispetto a quello facoltativo ed evitare riferimenti incrociati inspiegabili.
- Spiegare vincoli non ovvi, proprietà, precedenza, limiti di sicurezza e il motivo di un requisito di convalida insolito.
- Verifica che collegamenti, esempi, nomi e descrizioni di output siano comprensibili senza il contesto della sessione nascosta.
- Eseguire un passaggio di comprensione indipendente: un altro agente potrebbe seguire la guida e scegliere l'azione successiva corretta solo dal documento?

## Revisione della registrazione

Per un compito non banale, riassumere i risultati della rubrica nella revisione finale o nel passaggio di consegne. Menzionare il più piccolo approccio sicuro, la complessità dei materiali, le prove di affidabilità, i controlli di sicurezza e igiene e qualsiasi problema di leggibilità che dovrebbe diventare un lavoro di follow-up autorizzato separatamente.

Policy correlata: [Sicurezza e convalida del repository](repository-safety-and-validation.md) e [Autorevisione della sessione](session-self-review.md).
