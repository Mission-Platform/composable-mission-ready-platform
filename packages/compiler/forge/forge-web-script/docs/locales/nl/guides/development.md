# Ontwikkel Forge-webscript

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/compiler/forge/forge-web-script/docs/guides/development.md: [packages/compiler/forge/forge-web-script/docs/guides/development.md](../../../guides/development.md)
> Taal: Nederlands (nl)

Deze handleiding is bedoeld voor bijdragers die de Forge Web Script-parser wijzigen, aangevinkt
contracten of conformiteitsbepalingen.

## Installeer en controleer het pakket

Installeer afhankelijkheden vanuit de root van de repository en voer de pakketcontroles uit:

```bash
pnpm install
pnpm --filter @mission-platform/forge-web-script build:check
pnpm --filter @mission-platform/forge-web-script test
```

Voer `pnpm --filter @mission-platform/forge-web-script build` uit voordat u publiceert.
De build verzendt de browserveilige bundel- en declaratiebestanden onder `dist/`.

## Voeg een taalwijziging toe

Werk de grammatica en de gecontroleerde frontend samen bij. Voeg een gericht armatuur toe
`src/fixtures/` en een regressietest voor diagnostiek of gegenereerd gedrag.
Houd de taalversie `1.0` en de ABI-versie `1.2` expliciet tenzij de wijziging
een opzettelijke herziening van de compatibiliteit. ABI-wijzigingen moeten manifesten bijwerken,
laders en de compatibiliteitsdocumentatie.

Het pakket is browserveilig. Voeg geen alleen-Node-API's toe aan de publieke gevel;
Node-specifieke tooling hoort thuis in `@mission-platform/forge-web-script-cli`.

## Gegenereerde en bronartefacten

De ingecheckte `.fws`-bronnen onder `src/self-hosted/fws/` zijn bronartefacten,
niet met de hand gekopieerd JavaScript. Bewaar de gegenereerde uitvoer in `dist/` en voer geen commit uit
lokale build-output. De pakketdocumentatiereferentie wordt hiernaast bijgehouden
het pakket en zal opnieuw worden gegenereerd door de documentatie-extractieworkflow.
