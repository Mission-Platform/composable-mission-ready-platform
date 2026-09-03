# @mission-platform/forge-spa

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/edge/workers/forge-spa/docs/index.md: [packages/edge/workers/forge-spa/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

Het gedeelde Cloudflare Worker-toegangspunt voor Mission Platform SPA en SSG
implementaties. Het delegeert aanvragen naar de `ASSETS`-binding en wordt verbruikt door
toepassingen in plaats van onafhankelijk te worden ingezet.

## Integreer de werknemer

Bouw het pakket en verwijs vervolgens naar de gecompileerde handler van een verbruikende app
Wrangler-configuratie:

```bash
pnpm --filter @mission-platform/forge-spa build
```

De consumentenconfiguratie moet `main` instellen op
`packages/edge/workers/forge-spa/dist/index.js` en bind de applicatiemap `dist/` als
`ASSETS` met SPA-fallback-afhandeling. Website en Mijn zorgnotities zijn actueel
consumenten.

De werknemer is geen eigenaar van applicatieroutes, activa, domeinen of omgeving
geheimen. Deze blijven in het verbruikende applicatiepakket.

- [Ontwikkelingsgids](guides/development.md)
- [`README.md`](../../../README.md)
