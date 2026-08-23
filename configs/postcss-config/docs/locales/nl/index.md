# @mission-platform/postcss-config

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> configs/postcss-config/docs/index.md: [configs/postcss-config/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

Gedeelde PostCSS-pijplijn gebruikt door Mission Platform-stylesheets.

## Installeren en gebruiken

```bash
pnpm add --save-dev @mission-platform/postcss-config
```

Verwijs naar het pakket vanuit de werkruimte `postcss.config.mjs` in plaats van
het dupliceren van de gedeelde plug-inpijplijn. Lokale overrides horen daarbij
configuratie van de werkruimte.

## Bijdragen

Loop `pnpm --filter @mission-platform/postcss-config lint` En
`pnpm --filter @mission-platform/postcss-config format`. Browser behouden
compatibiliteitsgedrag in dit pakket en vermijd applicatiespecifieke plug-ins.
