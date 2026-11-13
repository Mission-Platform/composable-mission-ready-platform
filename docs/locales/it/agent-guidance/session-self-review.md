# Autorevisione della sessione

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/agent-guidance/session-self-review.md: [docs/agent-guidance/session-self-review.md](../../../agent-guidance/session-self-review.md)
> Lingua: Italiano (it)

Completa questa revisione alla fine di ogni sessione, indipendentemente dal fatto che l'attività abbia avuto esito positivo, negativo o sia stata interrotta prima dell'implementazione. La revisione è un record di chiusura, non un'autorizzazione per espandere l'attività corrente.

## Revisione dei risultati

Registrare prove concise per:

- Cosa è stato tentato e quale risultato è stato richiesto.
- Comportamento atteso rispetto al comportamento osservato.
- Ipotesi confermate, smentite o lasciate incerte.
- Fallimenti, lavoro bloccato, regressioni e rischi irrisolti.
- Verifica eseguita, inclusi comandi, test, diagnostica, scansioni, revisioni e relativi risultati.
- Se la differenza finale è mirata, portabile, priva di artefatti temporanei e coerente con le convenzioni del repository.
- Quali indicazioni hanno consentito il lavoro e quali istruzioni erano ambigue, difficili da reperire, duplicate, obsolete o inutilmente costose.

Preservare le convenzioni che hanno funzionato. Distinguere i problemi osservati dalle ipotesi o idee di miglioramento speculative e includere le prove a sostegno di ogni modifica proposta.

## Recensione MCP

Quando sono stati utilizzati strumenti o profili MCP, rispondi a queste domande:

- Il profilo selezionato era il profilo minimo in grado di completare l'attività?
- Sono stati preferiti strumenti di ispezione limitati e di sola lettura fino a quando non fosse necessaria una scrittura esplicita?
- `review_changes` e i controlli di sicurezza disponibili erano sufficienti per verificare la mutazione proposta e i suoi rischi?
- Uno schema, un limite di output, un limite di impaginazione, un timeout o l'ergonomia dello strumento hanno creato attriti o nascosto prove utili?
- Qualche percorso di scrittura richiedeva una conferma più chiara, limiti più ristretti, un isolamento più forte o un fallback più sicuro?
- La terminologia e il comportamento corrispondevano a `mcp/README.md`, `mcp/developer/README.md`, `.ai/mcp/mcp.json`, `scripts/launch-mcp.mjs`, `mcp/developer/src/tools/profiles.ts` e `mcp/developer/src/tools/index.ts`?

Non proporre un profilo più ampio o un nuovo strumento solo perché è conveniente. Spiegare il cambiamento più piccolo che eliminerebbe un problema osservato di sicurezza, affidabilità o comprensione.

## Decisione di miglioramento

Classificare ogni opportunità di miglioramento:

- **Follow-up della documentazione:** da utilizzare quando il comportamento del repository è corretto ma le indicazioni sono mancanti, poco chiare, duplicate, obsolete o difficili da individuare. Proporre l'aggiornamento più piccolo a `AGENTS.md` o al documento dell'argomento proprietario.
- **Implementazione autorizzata separatamente:** utilizzare quando il risultato richiede la modifica del comportamento di runtime MCP, dei profili, degli schemi, della registrazione del server, di `.ai/mcp/mcp.json`, degli strumenti o di un'altra implementazione. Registratelo come follow-up; non implementarlo come parte di una revisione della documentazione se non esplicitamente autorizzato.
- **Nessun cambiamento:** utilizzare quando l'osservazione è speculativa, manca di prove o la convenzione esistente rimane la scelta più sicura e chiara.

Qualsiasi follow-up deve preservare la direzione delle dipendenze, i confini espliciti della mutazione, la portabilità, la compatibilità con le versioni precedenti, i privilegi minimi e le operazioni limitate. Collega le prove e identifica il proprietario, la fonte della verità interessata e la più piccola azione successiva sicura.

## Formato di chiusura

Utilizza questo formato compatto nella consegna finale quando è richiesta una revisione scritta:

```markdown
### Session self-review
- Outcome: <expected and observed result>
- Evidence: <checks performed and results>
- Assumptions or uncertainty: <confirmed, disproved, or unresolved items>
- Guidance and MCP findings: <what helped or caused friction>
- Follow-up: <documentation, separately authorized implementation, or no change; include evidence>
```

Politica correlata: [Rubrica Qualità](quality-rubric.md), [Sicurezza e convalida del repository](repository-safety-and-validation.md) e la radice [AGENTS.md](../../../../AGENTS.md).
