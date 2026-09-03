# Ontwikkel de Forge Vite-plug-in

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/tooling/vite/forge/docs/guides/development.md: [packages/tooling/vite/forge/docs/guides/development.md](../../../guides/development.md)
> Taal: Nederlands (nl)

## Installeer en verifieer

Voer gerichte controles uit vanuit de root van de repository:

```bash
pnpm install
pnpm --filter @mission-platform/vite-plugin-forge build:check
pnpm --filter @mission-platform/vite-plugin-forge test
```

Bouw met `pnpm --filter @mission-platform/vite-plugin-forge build`. Bundels
en aangiften worden verzonden naar `dist/`; voer geen lokale build-uitvoer uit.

## Wijzig de compiler

Houd parsering, normalisatie, semantische IR, caching en diagnostiek neutraal.
Doelverlaging en brongeneratie horen bij het geselecteerde
`@mission-platform/forge-plugin-*`-pakket. Voeg regressiedekking voor cache toe
identiteit, invalidatie, diagnostiek, gegenereerde artefacten en bellerplug-in
behoud bij het wisselen van bestuurder.

Het pakket moet bruikbaar blijven vanuit zowel Vite als tsdown. Voeg geen doel toe
schakel de runtime-afhankelijkheid van de tabel of het raamwerk over naar de neutrale driver. Update de
[compilerpijplijnreferentie](../reference/compiler.md) wanneer een openbaar podium of
artefactcontractwijzigingen.
