# @mission-platform/stylelint-config

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> configs/stylelint-config/docs/index.md: [configs/stylelint-config/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

Gedeeld Stylelint regels voor CSS en SCSS in Mission Platform.

## Installeren en gebruiken

```bash
pnpm add --save-dev @mission-platform/stylelint-config postcss-html postcss-scss \
  stylelint stylelint-config-recommended-vue stylelint-config-standard-scss
```

Werkruimten met stijlen gebruiken een lokaal ESM-bestand `stylelint.config.mjs`. Importeer en verspreid de gedeelde configuratie in plaats van de `extends`-items te dupliceren:

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

De gedeelde configuratie breidt `stylelint-config-standard-scss` en `stylelint-config-recommended-vue` uit. Ze gebruikt standaard `postcss-html`, `postcss-scss` voor `**/*.scss` en `postcss-html` voor Vue-stijlblokken. Voeg de directe ondersteuningsafhankelijkheden met `catalog:stylelint`-versies en het gedeelde configuratiepakket met `workspace:*` toe aan `devDependencies`.

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

Breid het pakket uit vanuit de werkruimte `stylelint.config.mjs`. Component behouden
stijlen dicht bij hun component en gebruiken alleen lokale overschrijvingen voor een gedocumenteerde
beperking van de werkruimte.

## Bijdragen

Loop `pnpm --filter @mission-platform/stylelint-config lint` En
`pnpm --filter @mission-platform/stylelint-config format`. Wijzigingen in de testregel
tegen zowel pakket-SCSS als applicatiestijlen.
