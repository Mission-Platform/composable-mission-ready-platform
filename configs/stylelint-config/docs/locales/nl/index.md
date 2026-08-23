# @mission-platform/stylelint-config

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> configs/stylelint-config/docs/index.md: [configs/stylelint-config/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

Gedeeld Stylelint regels voor CSS en SCSS in Mission Platform.

## Installeren en gebruiken

```bash
pnpm add --save-dev @mission-platform/stylelint-config
```

Breid het pakket uit vanuit de werkruimte `stylelint.config.mjs`. Component behouden
stijlen dicht bij hun component en gebruiken alleen lokale overschrijvingen voor een gedocumenteerde
beperking van de werkruimte.

## Bijdragen

Loop `pnpm --filter @mission-platform/stylelint-config lint` En
`pnpm --filter @mission-platform/stylelint-config format`. Wijzigingen in de testregel
tegen zowel pakket-SCSS als applicatiestijlen.
