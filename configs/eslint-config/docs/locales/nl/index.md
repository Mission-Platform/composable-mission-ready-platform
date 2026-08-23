# @mission-platform/eslint-config

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> configs/eslint-config/docs/index.md: [configs/eslint-config/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

Gedeeld appartement ESLint configuratie voor Mission Platform-werkruimten.

## Installeren en gebruiken

Voeg het pakket toe aan de ontwikkelingsafhankelijkheden van een werkruimte en breid de flat uit
configuratie van `eslint.config.js`:

```bash
pnpm add --save-dev @mission-platform/eslint-config
```

```js
import baseConfig from '@mission-platform/eslint-config';

export default [...baseConfig];
```

Het pakket bevat TypeScript, Vue 3, toegankelijkheid, import, Turbo, en
opmaakintegraties. Voeg alleen werkruimtespecifieke regels toe voor gedrag dat
kan niet worden gedeeld. Zie [de ESLint referentie](reference/eslint.md) voor de
inclusief plug-ins en opdrachten.

## Bijdragen

Loop `pnpm --filter @mission-platform/eslint-config lint` En
`pnpm --filter @mission-platform/eslint-config format` na het veranderen van regels.
Houd het pakket raamwerkbewust maar werkruimte-agnostisch; toepassingen moeten
importeer geen regels uit een andere werkruimte.
