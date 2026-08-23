# @mission-platform/api-proxy

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> workers/api-proxy/docs/index.md: [workers/api-proxy/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

Een voorbeeld van een Cloudflare Worker die goedgekeurde alleen-lezen API-routes naar een proxy stuurt
vaste upstream-service. Deze werkruimte is eigenaar van het aanvraagbeleid, header
opschoning en foutgrens voor de proxy-handler.

## Gebruik de arbeider

Het pakket exporteert de gebundelde afhandeling vanuit `@mission-platform/api-proxy`.
Bouw het voordat u naar `dist/index.js` verwijst vanuit een Wrangler-configuratie:

```bash
pnpm --filter @mission-platform/api-proxy build
```

Alleen `GET`- en `HEAD`-verzoeken aan `/users` en `/v1` worden geaccepteerd. Vraag
strings worden doorgestuurd; inloggegevens, de originele `Host` en hop-voor-hop
kopteksten worden verwijderd. Fouten in de stroomopwaartse fase of bij de aanvraagconstructie retourneren `502`.

## Beperkingen

Het pakket heeft geen ingecheckte Wrangler-implementatieconfiguratie en is geen
omgekeerde proxy voor algemeen gebruik. Voeg een expliciete implementatieconfiguratie toe en
controleer authenticatie-, upstream- en caching-wijzigingen voordat u deze openbaar maakt.

- [Ontwikkelingsgids](guides/development.md)
- [`README.md`](../../../README.md)
