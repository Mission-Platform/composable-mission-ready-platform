# Ontwikkel de Forge SPA-werker

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> workers/forge-spa/docs/guides/development.md: [workers/forge-spa/docs/guides/development.md](../../../guides/development.md)
> Taal: Nederlands (nl)

Voer de pakketcontroles uit vanuit de root van de repository:

```bash
pnpm --filter @mission-platform/forge-spa build:check
pnpm --filter @mission-platform/forge-spa test
pnpm --filter @mission-platform/forge-spa build
```

De build zendt `dist/index.js` en declaraties uit. Houd de geleider beperkt tot
de getypte `ASSETS.fetch(request)`-delegatie en het doorsturen van testverzoeken. Testen
en applicatieroutes implementeren vanuit de consumerende app; voeg geen toepassing toe
configuratie of activa voor deze gedeelde werker.
