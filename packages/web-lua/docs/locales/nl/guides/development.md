# Ontwikkel WebLua

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/web-lua/docs/guides/development.md: [packages/web-lua/docs/guides/development.md](../../../guides/development.md)
> Taal: Nederlands (nl)

## Installeer en verifieer

Voer de gerichte controles uit vanuit de root van de repository:

```bash
pnpm install
pnpm --filter @mission-platform/web-lua build:check
pnpm --filter @mission-platform/web-lua test
```

Bouw met `pnpm --filter @mission-platform/web-lua build`. Browseruitvoer,
Node-uitvoer en declaraties worden verzonden naar `dist/` en `dist-node/`.

## Compatibiliteitswijzigingen

Voeg deterministisch bewijs op gastniveau toe voordat u een compatibiliteitsrij wijzigt.
Update `src/compatibility.ts`, de tests en de referentietabel samen.
Gebruik `matched` alleen voor gedrag dat onder een deterministische fixatie valt;
`capability-gated` voor expliciete hostbeleidsvereisten; en `unresolved` voor
gedrag dat niet als voorbijgaand mag worden beschouwd.

Houd de runtime-gast eigendom en mogelijkheid-weigeren-standaard. Alleen Node-adapters
horen achter de `./node`-export en mogen niet in de browserinvoer lekken.
