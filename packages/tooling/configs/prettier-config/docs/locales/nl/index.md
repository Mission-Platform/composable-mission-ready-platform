# @mission-platform/prettier-config

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/tooling/configs/prettier-config/docs/index.md: [packages/tooling/configs/prettier-config/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

Standaardinstellingen voor de opmaak van de opslagplaats die worden gedeeld door pakketten en toepassingen.

## Installeren en gebruiken

```bash
pnpm add --save-dev @mission-platform/prettier-config
```

Exporteer de gedeelde configuratie vanuit de werkruimte `prettier.config.js`.
Maak spaarzaam gebruik van lokale overschrijvingen, dus Markdown, TypeScript, Vueen configuratie
bestanden blijven consistent in de monorepo.

## Bijdragen

Loop `pnpm --filter @mission-platform/prettier-config format` na het wijzigen van de
configuratie. Wijzigingen moeten consistent worden toegepast op elke werkruimte die gebruikmaakt van
het pakket.
