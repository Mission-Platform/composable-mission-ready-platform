# @mission-platform/forge-web-script-lsp

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/forge-web-script-lsp/docs/index.md: [packages/forge-web-script-lsp/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

De stdio Language Server Protocol-server voor Forge Web Script v1. Het pakket
is eigenaar van op de redactie gericht transport- en werkruimtegedrag; De taalsemantiek blijft bestaan
eigendom van `@mission-platform/forge-web-script`.

## Begin hier

- [Referentie voor taaltools](reference/language-service.md) — diagnostiek,
  voltooiing, zweven, semantische tokens en ondersteunde grenzen.
- [Bouw- en testhandleiding](guides/development.md) — lokale servercontroles en
  protocol armaturen.
- [`llms.txt` in het taalpakket](../../../../forge-web-script/llms.txt) — kern
  taal-API-opmerkingen.

De server vereist Node.js `>=24.0.0` en geeft de `forge-web-script-lsp` weer
binair samen met de subpaden van de modules `server` en `workspace`.
