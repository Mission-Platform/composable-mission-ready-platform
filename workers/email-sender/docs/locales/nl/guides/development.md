# Ontwikkel de e-mailafzenderwerker

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> workers/email-sender/docs/guides/development.md: [workers/email-sender/docs/guides/development.md](../../../guides/development.md)
> Taal: Nederlands (nl)

Voer de pakketcontroles uit vanuit de root van de repository:

```bash
pnpm --filter @mission-platform/email-sender build:check
pnpm --filter @mission-platform/email-sender test
pnpm --filter @mission-platform/email-sender build
```

Voer `pnpm --filter @mission-platform/email-sender types` uit na het wijzigen
bindingen. Voeg eindpuntvalidatie, SMTP-fout en stabiele responstests toe voor
contractwijzigingen. Houd de Worker-handler Cloudflare-compatibel en bewaar deze
Alleen MailPit-gedrag achter de lokale ontwikkelingsconfiguratie.
