# Ontwikkel Vuursteen

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

Het pakket is browserveilig. Voeg geen alleen-Node-API's toe aan de publieke façade;
Node-specifieke tooling hoort thuis in `@mission-platform/flint-cli`.

## Gegenereerde en bronartefacten

De ingecheckte `.flint`-bronnen onder `src/self-hosted/fws/` zijn bronartefacten,
niet met de hand gekopieerd JavaScript. Bewaar de gegenereerde uitvoer in `dist/` en voer geen commit uit
lokale build-output. De pakketdocumentatiereferentie wordt hiernaast bijgehouden
het pakket en zal opnieuw worden gegenereerd door de documentatie-extractieworkflow.

## Inspectie van de tweetrapspijpleiding

De canonieke frontendgrens is de deterministische Sea-of-Nodes-grafiek. De
grafiek wordt geoptimaliseerd voordat deze wordt verlaagd naar Wasm IR, waar een tweede optimalisatie van toepassing is
backend-veilige propagatie, verwijdering van dode code, adresvereenvoudiging, switch
verlaging en deterministische lay-out. Houd beide fasen controleerbaar: optimizer
rapporten en het geselecteerde grenzenbeleid moeten behouden blijven in compilerartefacten.

Gebruik runtime-grenscontroles, tenzij een regel voor het produceren van proefdrukken elk vastlegt
toegang als veilig. `proven-safe` en `excluded-by-profile` zijn expliciet beleid
waarden, en niet impliciet vrijgavegedrag. Er is een `.sonir.json`-cache-artefact
alleen diagnostische gegevens; lezers moeten het schema, de hashes, het beleid en het
limieten voordat deze wordt weergegeven, en mag nooit de grafiekinhoud uitvoeren.

Voor CLI-rookcontroles:

```bash
flint check src/example.flint --bounds-checks runtime --optimizer-report --format json
flint inspect-sonir .cache/example.sonir.json --format json
```

Wanneer u de analyse wijzigt, voeg dan feiten en een stabiele diagnostische test toe voordat u wijzigt
een optimalisatieregel. Ontwikkelingsanalyse moet onbekende bereiken blootleggen,
alias/levensduurstatussen, dekking wijzigen en metadata doorgeven; strikte analyse moet
blokkeer onveilige grenzenbeleidsverzoeken en schendingen van de regio/eigendom.
