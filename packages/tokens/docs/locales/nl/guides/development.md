# Ontwikkel het tokenpakket

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/tokens/docs/guides/development.md: [packages/tokens/docs/guides/development.md](../../../guides/development.md)
> Taal: Nederlands (nl)

## Installeer en verifieer

Voer de pakketcontroles uit vanuit de root van de repository:

```bash
pnpm install
pnpm --filter @mission-platform/tokens lint
pnpm --filter @mission-platform/tokens lint:style
pnpm --filter @mission-platform/tokens build
```

De build produceert JavaScript- en declaratie-uitvoer in `dist/`. Gegenereerd
SCSS- en TypeScript-bronnen onder `src/generated/` zijn afgeleide artefacten en
moet deterministisch blijven.

## Verander een token

Bewerk de bron-JSON onder `tokens/` en houd het DTCG-pad stabiel, tenzij de
verandering is opzettelijk en gedocumenteerd. Componentcontracten leven onder
`tokens/component/<atomic-level>/`; componentbronnen mogen niet dupliceren
gedeelde tokenpaden. Gebruik de bestaande scripts voor het genereren van tokens en bekijk beide
SCSS- en TypeScript-uitvoer vóór publicatie.

Het pakket is kaderneutraal. Themagedrag wordt geselecteerd door de consument
stylesheet via de geëxporteerde SCSS-ingangspunten; dit pakket is geen eigenaar
toepassingsthemastatus of componentopmaak.
