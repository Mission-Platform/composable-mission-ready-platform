# @mission-platform/email-sender

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/edge/workers/email-sender/docs/index.md: [packages/edge/workers/email-sender/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

Een lokale Cloudflare Worker die voltooide HTML accepteert en naar deze verzendt
MailPit via SMTP. Deze werkruimte is eigenaar van het `/api/email/send`-contract en de bijbehorende
MailPit-ontwikkelingsconfiguratie.

## Lokaal gebruiken

Het eindpunt valideert `{ to, recipientName, html }` en retourneert een stabiele JSON
resultaat na oplevering. Start MailPit, genereer lokale Worker-bindingen en voer het vervolgens uit
de arbeider:

```bash
docker run --rm --name mission-mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
pnpm --filter @mission-platform/email-sender types
pnpm --filter @mission-platform/email-sender dev -- --port 8787
```

Het standaard SMTP-eindpunt is `127.0.0.1:1025`, met de MailPit-gebruikersinterface op
`http://localhost:8025`. Overschrijf lokale Wrangler-variabelen wanneer u een andere gebruikt
gastheer.

Deze medewerker is een lokale etalage en geen productiepostdienst. Nooit
plaats inloggegevens of geheimen in de bijgehouden Wrangler-configuratie.

- [Ontwikkelingsgids](guides/development.md)
- [`README.md`](../../../README.md)
