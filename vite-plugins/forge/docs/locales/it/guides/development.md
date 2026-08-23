# Sviluppa il plugin Forge Vite

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> vite-plugins/forge/docs/guides/development.md: [vite-plugins/forge/docs/guides/development.md](../../../guides/development.md)
> Lingua: Italiano (it)

## Installa e verifica

Esegui controlli mirati dalla radice del repository:

```bash
pnpm install
pnpm --filter @mission-platform/vite-plugin-forge build:check
pnpm --filter @mission-platform/vite-plugin-forge test
```

Costruisci con `pnpm --filter @mission-platform/vite-plugin-forge build`. Fasci
e le dichiarazioni vengono emesse in `dist/`; non eseguire il commit dell'output di compilazione locale.

## Cambia il compilatore

Mantieni neutrali l'analisi, la normalizzazione, l'IR semantico, la memorizzazione nella cache e la diagnostica.
L'abbassamento del target e la generazione della fonte appartengono a quelli selezionati
Pacchetto `@mission-platform/forge-plugin-*`. Aggiungi la copertura della regressione per la cache
identità, invalidazione, diagnostica, artefatti generati e plug-in del chiamante
conservazione quando si cambia il driver.

Il pacchetto deve rimanere utilizzabile sia da Vite che da tsdown. Non aggiungere un obiettivo
commutare la tabella o la dipendenza del runtime del framework dal driver neutro. Aggiorna il
[riferimento alla pipeline del compilatore](../reference/compiler.md) quando una scena pubblica o
modifiche al contratto dell'artefatto.
