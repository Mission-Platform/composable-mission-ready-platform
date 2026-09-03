# @mission-platform/tsdown-config

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/tooling/configs/tsdown-config/docs/index.md: [packages/tooling/configs/tsdown-config/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

Gedeelde hulpprogramma's voor het bouwen van tsdown-bibliotheken voor publiceerbare werkruimten.

## Installeren en gebruiken

```bash
pnpm add --save-dev @mission-platform/tsdown-config
```

Gebruik het pakket vanuit een werkruimte `tsdown.config.ts` en toegangspunten behouden,
externe afhankelijkheden en uitvoerbeperkingen die lokaal zijn voor het pakket dat wordt gebouwd.
Gegenereerde declaraties en bundels horen thuis in dat pakket `dist/` map.

## Bijdragen

Loop `pnpm --filter @mission-platform/tsdown-config lint` en de formaatcontrole.
Behoud de deterministische uitvoer en voeg geen raamwerkspecifieke doelvertakkingen toe
aan de neutrale bouwhulp.
