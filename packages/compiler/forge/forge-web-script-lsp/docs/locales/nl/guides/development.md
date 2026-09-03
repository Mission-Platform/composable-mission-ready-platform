# Ontwikkel de Forge Web Script-taalserver

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/forge-web-script-lsp/docs/guides/development.md: [packages/forge-web-script-lsp/docs/guides/development.md](../../../guides/development.md)
> Taal: Nederlands (nl)

## Installeer en verifieer

Voer de gerichte pakketcontroles uit vanuit de root van de repository:

```bash
pnpm install
pnpm --filter @mission-platform/forge-web-script-lsp build:check
pnpm --filter @mission-platform/forge-web-script-lsp test
```

Bouw met `pnpm --filter @mission-platform/forge-web-script-lsp build`. De
resultaat wordt verzonden naar `dist/`; lokale uitvoer is geen bronartefact.

## Protocolwijzigingen

Behoud diagnostiek, UTF-16-bereiken, symbolen, voltooiing, hover en semantische token
gedrag afgestemd op het taalservicepakket. Voeg een protocolregressie toe
armatuur voor elk nieuw verzoek of vermogen. Het LSP biedt momenteel geen mogelijkheden
go-to-definition, referenties, hernoemen, opmaak, codeacties, cross-file
taalimport of een door een browser gehost transport.

De server is stdio-gebaseerd en alleen Node. Browser-editor-integratie hoort erbij
de lokale adapter van het taalservicepakket in plaats van deze server.
