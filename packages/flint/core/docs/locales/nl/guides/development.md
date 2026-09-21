# Ontwikkel Forge-webscript

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/flint/core/docs/guides/development.md: [packages/flint/core/docs/guides/development.md](../../../guides/development.md)
> Taal: Nederlands (nl)

Deze handleiding is bedoeld voor bijdragers die de Flint-parser wijzigen, aangevinkt
contracten of conformiteitsbepalingen.

## Installeer en controleer het pakket

Installeer afhankelijkheden vanuit de root van de repository en voer de pakketcontroles uit:

```bash
pnpm install
pnpm --filter @mission-platform/flint build:check
pnpm --filter @mission-platform/flint test
```

Voer `pnpm --filter @mission-platform/flint build` uit voordat u publiceert.
De build verzendt de browserveilige bundel- en declaratiebestanden onder `dist/`.

## Voeg een taalwijziging toe

Werk de grammatica en de gecontroleerde frontend samen bij. Voeg een gericht armatuur toe
`src/fixtures/` en een regressietest voor diagnostiek of gegenereerd gedrag.
Houd de taalversie `1.0` en de ABI-versie `1.2` expliciet tenzij de wijziging
een opzettelijke herziening van de compatibiliteit. ABI-wijzigingen moeten manifesten bijwerken,
laders en de compatibiliteitsdocumentatie.

Het pakket is browserveilig. Voeg geen alleen-Node-API's toe aan de publieke gevel;
Node-specifieke tooling hoort thuis in `@mission-platform/flint-cli`.

## Gegenereerde en bronartefacten

De ingecheckte `.flint`-bronnen onder `src/self-hosted/fws/` zijn bronartefacten,
niet met de hand gekopieerd JavaScript. Bewaar de gegenereerde uitvoer in `dist/` en voer geen commit uit
lokale build-output. De pakketdocumentatiereferentie wordt hiernaast bijgehouden
het pakket en zal opnieuw worden gegenereerd door de documentatie-extractieworkflow.
