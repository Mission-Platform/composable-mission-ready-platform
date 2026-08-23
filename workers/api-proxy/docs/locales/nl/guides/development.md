# Ontwikkel de API-proxywerker

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> workers/api-proxy/docs/guides/development.md: [workers/api-proxy/docs/guides/development.md](../../../guides/development.md)
> Taal: Nederlands (nl)

Voer de gerichte controles uit vanuit de root van de repository:

```bash
pnpm --filter @mission-platform/api-proxy build:check
pnpm --filter @mission-platform/api-proxy test
pnpm --filter @mission-platform/api-proxy build
```

De build zendt `dist/index.js` en declaraties uit. Houd de handler compatibel
met de Cloudflare Workers-runtime: gebruik het getypte `env`-object voor bindingen
en voeg geen ingebouwde Node.js toe. Voeg tests toe voor toelatingslijsten voor routes, opgeschoond
headers, het doorsturen van query's en upstream-fouten bij het wijzigen van de handler.
