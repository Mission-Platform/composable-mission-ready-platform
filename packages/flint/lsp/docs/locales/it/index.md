# @mission-platform/flint-lsp

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/flint-lsp/docs/index.md: [packages/flint-lsp/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Il server stdio Language Server Protocol per Flint v1. Il pacchetto
possiede il comportamento di trasporto e di lavoro rivolto all'editore; rimane la semantica del linguaggio
di proprietà di `@mission-platform/flint`.

## Inizia qui

- [Riferimento agli strumenti linguistici](reference/language-service.md) — diagnostica,
  completamento, passaggio del mouse, token semantici e limiti supportati.
- [Guida alla creazione e al test](guides/development.md) — controlli del server locale e
  dispositivi di protocollo.
- [`llms.txt` nel pacchetto lingue](../../../../flint/llms.txt) — nucleo
  note sull'API della lingua.

Il server richiede Node.js `>=24.0.0` ed espone `flint-lsp`
binario insieme ai sottopercorsi dei moduli `server` e `workspace`.
