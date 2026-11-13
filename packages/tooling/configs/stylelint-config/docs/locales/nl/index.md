# @mission-platform/stylelint-config

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/tooling/configs/stylelint-config/docs/index.md: [packages/tooling/configs/stylelint-config/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

Gedeelde Stylelint-regels voor CSS en SCSS in Mission Platform.

## Installeren en gebruiken

```bash
pnpm add --save-dev @mission-platform/stylelint-config postcss-html postcss-scss \
  stylelint stylelint-config-recommended-vue stylelint-config-standard-scss
```

Stijldragende werkruimten gebruiken een werkruimte-lokale `stylelint.config.mjs` in ESM
formaat. Importeer en verspreid de gedeelde configuratie in plaats van deze te dupliceren
`extends`-vermeldingen:

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

De gedeelde configuratie breidt `stylelint-config-standard-scss` en
`stylelint-config-recommended-vue`. Het gebruikt standaard `postcss-html`
`postcss-scss` voor `**/*.scss`, en gebruikt `postcss-html` voor Vue SFC-stijl
blokken. Dit ondersteunt CSS-, SCSS- en Vue-stijlen zonder werkruimtespecifiek
syntaxisconfiguratie.

Voeg de bovenstaande directe ondersteuningsafhankelijkheden toe aan die van de werkruimte
`devDependencies` met behulp van de `catalog:stylelint`-versies, samen met de
gedeeld configuratiepakket met `workspace:*`. Voeg scripts toe die de
stijlbronnen van de werkruimte, bijvoorbeeld:

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

Houd componentstijlen dicht bij hun component en gebruik alleen lokale overschrijvingen voor
een gedocumenteerde beperking van de werkruimte.

## Bijdragen

Voer `pnpm --filter @mission-platform/stylelint-config lint` uit en
`pnpm --filter @mission-platform/stylelint-config format`. Wijzigingen in de testregel
tegen zowel pakket-SCSS als applicatiestijlen.
