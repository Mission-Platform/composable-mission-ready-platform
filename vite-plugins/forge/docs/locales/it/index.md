# @mission-platform/vite-plugin-forge

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> vite-plugins/forge/docs/index.md: [vite-plugins/forge/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Il driver del compilatore Forge indipendente dal framework per Vite e tsdown. Questo pacchetto
possiede parsing, normalizzazione, analisi semantica, ottimizzazione neutra, caching,
invio del target e orchestrazione della build generica; framework e output del CMS
i pacchetti possiedono il loro abbassamento e generazione specifici del target.

## Inizia qui

- [Riferimento alla pipeline del compilatore](reference/compiler.md) — contratti a tappe,
  proprietà del target, memorizzazione nella cache, diagnostica e artefatti generati.
- [Guida alla creazione e al test](guides/development.md) — sviluppo locale e
  controlli di integrazione.
- [`README.md`](../../../README.md) — configurazione e rappresentante del consumatore
  Vite/tsdown esempi.
- [`llms.txt`](../../../llms.txt): API concisa del pacchetto e note sulla pipeline.

Il driver richiede un `FrameworkOutputPlugin` esplicito; non seleziona mai a
framework da una stringa o importare ogni pacchetto di destinazione. I moduli generati sono
artefatti intermedi e devono essere compilati dal nativo del target selezionato
adattatore.
