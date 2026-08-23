# @mission-platform/vite-config

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> configs/vite-config/docs/index.md: [configs/vite-config/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

Gedeeld Vite En Vitest configuratiehelpers voor Mission Platform-pakketten en
toepassingen.

## Installeren en gebruiken

```bash
pnpm add --save-dev @mission-platform/vite-config
```

Gebruik `defineLibraryConfig` voor pakketten, `defineAppConfig` voor toepassingen, en
`defineVitestConfig` van de `/vitest` subpad. Framework-applicaties zouden dat moeten doen
selecteer er een `defineFrameworkAppConfig` voorwaarde en importeer vervolgens gedeelde pakketten
via hun kale pakketspecificaties.

## Bijdragen

Loop `pnpm --filter @mission-platform/vite-config lint` en formaatcontroles. Houd
de standaardinstellingen van de helper zijn herbruikbaar en behouden het gedeelde Vite, PostCSS, en
externalisatiegedrag beschreven in het pakket README.
