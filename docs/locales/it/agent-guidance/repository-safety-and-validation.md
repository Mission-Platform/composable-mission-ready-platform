# Sicurezza e convalida del repository

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/agent-guidance/repository-safety-and-validation.md: [docs/agent-guidance/repository-safety-and-validation.md](../../../agent-guidance/repository-safety-and-validation.md)
> Lingua: Italiano (it)

Questo argomento è obbligatorio per le attività di implementazione, refactoring, test, generazione, ispezione del repository, albero di lavoro, LSP, sicurezza e gestione dei file. Conserva i vincoli operativi dettagliati riepilogati nella radice `AGENTS.md`.

## Direzione delle dipendenze e scoperta delle risorse

- Il codice in `packages/` non deve mai essere importato da `apps/`. Le applicazioni utilizzano membri del pacchetto riutilizzabili; i pacchetti di dominio possono dipendere da `core`, `tooling` di livello inferiore e da contratti del compilatore senza importare applicazioni.
- Prima di scrivere il codice, ispezionare le risorse esistenti con gli strumenti MCP del repository (`list_components`, `get_component_usage`, `lsp_find_symbol` e `lsp_list_symbols`) e l'ispezione del file system.
- Riutilizza `@mission-platform/components` invece di creare primitive dell'interfaccia utente duplicate, fai riferimento ai token `--mp-*` anziché ai valori visivi hardcoded, cerca `packages/` per utilità condivise e utilizza i cataloghi YAML con `@mission-platform/i18n` per le stringhe rivolte all'utente.
- Nuovi componenti dell'interfaccia utente, componenti componibili, utilità e token di progettazione condivisi appartengono a `packages/`; gli strumenti di lanugine, formato e creazione condivisi appartengono a `packages/tooling/configs/`.
- Quando si modifica un componente del pacchetto, aggiungere o aggiornare la relativa storia `.stories.tsx` collocata. Il workbench `apps/storybook` rileva le storie dei pacchetti tra Vue, React, Solid, Svelte e Componenti Web.

## Codifica e conformità sicure

Tutto il codice e la configurazione devono seguire lo standard ISO/IEC 27001:2022 Controllo A.8.28 e proteggere da OWASP Top 10 (2025) e CWE Top 25.

- Non impegnare mai credenziali, chiavi private, token cloud o altri segreti.
- Pulisci l'HTML con `DOMPurify.sanitize`, parametrizza le query e utilizza argomenti vettoriali come `execFile` anziché stringhe di shell interpolate.
- Utilizzare la crittografia moderna come SHA-256 e `crypto.getRandomValues`; non utilizzare mai `Math.random()` per valori sensibili alla sicurezza.
- Evita script del ciclo di vita `postinstall` non controllati e dipendenze dei pin tramite riferimenti al catalogo.
- Conserva i privilegi minimi, i limiti della radice del repository e del percorso, l'esecuzione senza shell, l'approvazione esplicita della scrittura e i limiti dello strumento di sicurezza.
- Prima di proporre una PR, eseguire i relativi controlli di sicurezza sviluppatore-MCP: `security_scan_secrets`, `security_analyze_code`, `security_audit_dependencies`, `security_audit_supply_chain`, `security_collect_compliance_evidence` e `security_audit_compliance` quando applicabile.

## Alberi di lavoro e dipendenze di build

- I flussi di lavoro paralleli devono utilizzare alberi di lavoro Git isolati forniti con `node --experimental-strip-types scripts/worktree-manager.ts create <branch>`.
- In un nuovo albero di lavoro, crea dipendenze dell'area di lavoro upstream prima dei test dei pacchetti o dei controlli dei tipi perché potrebbero mancare gli artefatti interni `dist/`:

  ```bash
  pnpm exec turbo run build --filter <package-name>^...
  ```

- Gli alberi di lavoro condividono `.turbo/cache`; non cancellare o ignorare quella cache.

## Configurazione LSP portatile

- Le definizioni LSP in `agent-lsp.json` devono utilizzare invocazioni relative portabili come `["pnpm", "exec", "<server>", "--stdio"]` o `["pnpm", "--dir", "relative/path", ...]`.
- Non codificare mai percorsi di sistema assoluti. Il server MCP LSP esegue i server delle lingue dal repository rilevato o dalla radice dell'albero di lavoro.
- Gli strumenti di query ed esecuzione LSP richiedono una sessione attiva. Controllare `lsp_status` e utilizzare `lsp_start` quando necessario.
- Il server nativo TypeScript 7 utilizza `tsc --lsp --stdio` (`typescript-go` 7.0.2). I simboli dell'intera area di lavoro e le query al passaggio del mouse potrebbero scadere durante l'indicizzazione; utilizzare timeout del protocollo di 15.000–30.000 ms e integrarli con controlli di tipo nell'ambito del pacchetto e Vitest.
- Se l'avvio o il rilevamento scadono, utilizzare i controlli del tipo con ambito pacchetto e Vitest come fallback diagnostico anziché bloccare l'attività.

## Convalida Flint e Scanner

- La diagnostica Flint LSP è solo feedback a livello di sorgente; non dimostrano che un grafico multi-modulo collegato emetta Wasm valido o che il suo ABI di runtime venga eseguito correttamente.
- Per le modifiche al grafico dello scanner, eseguire la suite di grafici focalizzata, il pacchetto `type-check` e la suite del pacchetto Vitest. Registrare i guasti legati alle emissioni di artefatti separatamente dalla diagnostica della sorgente.
- Un dispositivo o un percorso ridotto del decoder non stabilisce la piena parità ZXing. Contrassegna esplicitamente le modalità, i sottoinsiemi di formato, i metadati, i tentativi e le migrazioni di contratti pubblici non supportati nel piano e nella richiesta pull.
- Se il collegamento statico fallisce, acquisire il modulo grafico e i conteggi dei bordi, la diagnostica dell'emettitore e il più piccolo riproduttore isolato prima di modificare il codice dell'algoritmo o indebolire i test.

## Stile del codice e verifica

- I nuovi file sorgente utilizzano `.ts` o `.vue` con `<script setup lang="ts">`; le API pubbliche e le funzioni esportate necessitano di tipi espliciti.
- Utilizzare `undefined` per valori assenti o cancellati a meno che un protocollo esterno non richieda `null`.
- Gli oggetti di scena dell'evento Forge JSX utilizzano nomi camelCase standard come `onKeyDown`, `onPointerDown` e `onMouseDown`.
- Raggruppare le importazioni in questo ordine senza righe vuote all'interno di un gruppo: Node integrati, dipendenze esterne, pacchetti `@mission-platform/*` interni e file relativi. Gruppi separati con una riga vuota.
- Eseguire `pnpm --filter <pkg> run lint` e `pnpm --filter <pkg> run lint:style`; utilizzare la correzione del pacchetto ESLint solo per gli errori di stile applicabili. Markdown e storie utilizzano il flusso di lavoro di formattazione del repository.
- Le modifiche al compilatore, al transpiler, all'AST e alla generazione del codice richiedono una copertura di integrazione end-to-end. Verifica gli output senza collisioni per nomi di base identici, riesportazioni di voci non ambigue e contenuti emessi preservati.
- `TargetIntentions.lowered` è obbligatorio in `@mission-platform/forge-plugin-api`; i plugin di destinazione richiedono piani ridotti. Le apparecchiature, i mock e i plug-in di integrazione CMS devono fornire `{ framework, appliedOptimizations: [] }` o eseguire `lower -> optimize -> generate`.
- In caso di caricamento parallelo, i test multi-framework, di estrazione della documentazione e AST di grandi dimensioni devono utilizzare timeout `60_000`-`120_000` ms espliciti.
- Per il lavoro del piano trasversale, utilizzare una revisione indipendente incentrata sul comportamento end-to-end, sui test negativi e sui lint gate a livello di pacchetto.

## Modalità di interazione

Utilizza la prima modalità applicabile e mantienila per la sessione a meno che la sua regola di persistenza non consenta un passaggio:

1. `[CHAT]` per saluti, chiacchiere, domande concrete o semplici calcoli.
2. `[ADVANCED_CHAT]` per spiegazioni, analisi, ricerca di informazioni o proposte di sola lettura.
3. `[RUN_VERIFY]` per comandi brevi sicuri, esecuzione di app o test senza modifiche.
4. `[FAST_CODE]` per una banale modifica di un file che non richiede ulteriore raccolta di contesto.
5. `[SETUP]` per build, installazioni, infrastrutture, correzioni ambientali o controlli di sistema.
6. `[CODE]` per modifiche al progetto non banali che richiedono indagini o passaggi multipli.
7. `[NICHE]` solo per analisi forensi specializzate, reverse engineering, recupero dati o ricerche sulla sicurezza che non si adattano ad altre modalità.

`[CHAT]` e `[CODE]` non cambiano modalità. `[ADVANCED_CHAT]` passa a `[CODE]` solo dopo una richiesta esplicita di implementazione; `[FAST_CODE]` e `[RUN_VERIFY]` passano a `[CODE]` se non riescono a terminare entro tre passaggi; `[SETUP]` e `[NICHE]` possono passare a `[CODE]` quando l'implementazione diventa necessaria.

## Generazione atomica e gestione dei file

- Non cancellare o eliminare mai un target di generazione prima che la generazione abbia avuto successo. Metti in scena gli artefatti in una directory di tentativo di pari livello come `.forge-attempt/`, esegui la diagnostica pre-commit e scambia in modo atomico solo dopo aver superato i controlli.
- Conserva i dotfile del repository come `.gitkeep` e `.gitignore` e preserva le directory di staging in volo durante la sincronizzazione o l'eliminazione delle destinazioni di build.
- Mantenere le mutazioni esplicite e limitate. Non utilizzare comandi di pulizia generici né eliminare file che non sono stati creati per l'attività corrente.

## Contratto del flusso di lavoro LSP MCP per sviluppatori

Preferire gli strumenti di intelligenza del codice `lsp_*` limitati dello sviluppatore MCP rispetto alla ricerca manuale di testo per le attività di codice. Utilizzare `lsp_capabilities` per confermare il contratto attuale e la disponibilità; prima della modifica, utilizzare `lsp_review_structure` o `lsp_debug_context` di sola lettura, prima di applicare una modifica LSP utilizzare `lsp_preview_edit` e dopo una modifica utilizzare `lsp_get_diagnostics`, quindi `lsp_run_build` e `lsp_run_tests` quando applicabile.

Utilizzare la mappatura appositamente creata: `lsp_list_symbols` per la struttura, `lsp_find_symbol` per i simboli, `lsp_find_references` per gli usi, `lsp_inspect_symbol` per la comprensione, `lsp_find_callers` per i siti di chiamata, `lsp_replace_symbol_body` per la sostituzione delle funzioni e `lsp_safe_delete_symbol` per i simboli non utilizzati. Utilizza i flussi di lavoro documentati `/lsp-*` per architettura, impatto, refactoring, modifiche sicure, correlazione dei test e verifica completa.

Politica correlata: [Rubrica qualità](quality-rubric.md), [Autorevisione della sessione](session-self-review.md) e la radice [AGENTS.md](../../../../AGENTS.md).
