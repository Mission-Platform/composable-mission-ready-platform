# @mission-platform/vite-plugin-forge

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> vite-plugins/forge/docs/index.md: [vite-plugins/forge/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

Het raamwerkneutrale Forge-compilerstuurprogramma voor Vite en tsdown. Dit pakket
is eigenaar van parsing, normalisatie, semantische analyse, neutrale optimalisatie, caching,
doelverzending en generieke build-orkestratie; framework en CMS-uitvoer
pakketten zijn eigenaar van hun doelspecifieke verlaging en generatie.

## Begin hier

- [Referentie voor compilerpijplijn](reference/compiler.md) — fasecontracten,
  doeleigendom, caching, diagnostiek en gegenereerde artefacten.
- [Bouw- en testhandleiding](guides/development.md) — lokale ontwikkeling en
  integratiecontroles.
- [`README.md`](../../../README.md) — consumentenconfiguratie en vertegenwoordiger
  Vite/tsdown voorbeelden.
- [`llms.txt`](../../../llms.txt) — beknopte pakket-API en pijplijnaantekeningen.

Het stuurprogramma vereist een expliciete `FrameworkOutputPlugin`; er wordt nooit a geselecteerd
framework uit een string of importeer elk doelpakket. Gegenereerde modules zijn
tussenliggende artefacten en moet worden samengesteld door de native van het geselecteerde doel
adapter.
