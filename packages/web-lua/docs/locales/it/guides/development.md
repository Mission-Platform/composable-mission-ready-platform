# Sviluppa WebLua

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/web-lua/docs/guides/development.md: [packages/web-lua/docs/guides/development.md](../../../guides/development.md)
> Lingua: Italiano (it)

## Installa e verifica

Esegui i controlli mirati dalla root del repository:

```bash
pnpm install
pnpm --filter @mission-platform/web-lua build:check
pnpm --filter @mission-platform/web-lua test
```

Costruisci con `pnpm --filter @mission-platform/web-lua build`. Uscita del browser,
Node e le dichiarazioni vengono emesse in `dist/` e `dist-node/`.

## Cambiamenti di compatibilità

Aggiungi prove deterministiche a livello di guest prima di modificare una riga di compatibilità.
Aggiorna `src/compatibility.ts`, i suoi test e la tabella di riferimento insieme.
Utilizzare `matched` solo per il comportamento coperto da un dispositivo deterministico;
`capability-gated` per requisiti espliciti della politica host; e `unresolved` per
comportamento che non deve essere considerato passeggero.

Mantieni il runtime di proprietà dell'ospite e con funzionalità negate per impostazione predefinita. Adattatori solo Node
appartengono all'esportazione `./node` e non devono penetrare nella voce del browser.
