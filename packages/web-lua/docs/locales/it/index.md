# @mission-platform/web-lua

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/web-lua/docs/index.md: [packages/web-lua/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Fondazione runtime Lua di proprietà degli ospiti compilata da Forge Web Script. Questo pacchetto
possiede il contratto di compatibilità di runtime e il limite della capacità dell'host.

## Inizia qui

- [Riferimento alla compatibilità con Lua 5.5.1](reference/compatibility.md) — testato,
  comportamento legato alle capacità e irrisolto.
- [Guida alla creazione e al test](guides/development.md) — dispositivi e output runtime
  vincoli.
- Il pacchetto README e il riferimento generato forniscono note concise sull'API del pacchetto.

La voce del browser è `@mission-platform/web-lua`; Node i consumatori utilizzano il file
esportazione esplicita `@mission-platform/web-lua/node`. Gli effetti dell'ospite sono negati da
predefinito e richiedono una politica di capacità esplicita.
