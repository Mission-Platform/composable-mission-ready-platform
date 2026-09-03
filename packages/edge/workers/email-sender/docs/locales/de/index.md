# @mission-platform/email-sender

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/edge/workers/email-sender/docs/index.md: [packages/edge/workers/email-sender/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Ein nur lokaler Cloudflare-Worker, der fertiges HTML akzeptiert und an sendet
MailPit über SMTP. Dieser Arbeitsbereich ist Eigentümer des `/api/email/send`-Vertrags und seiner
MailPit-Entwicklungskonfiguration.

## Lokal verwenden

Der Endpunkt validiert `{ to, recipientName, html }` und gibt einen stabilen JSON zurück
Ergebnis nach Lieferung. Starten Sie MailPit, generieren Sie lokale Worker-Bindungen und führen Sie es dann aus
der Arbeiter:

```bash
docker run --rm --name mission-mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
pnpm --filter @mission-platform/email-sender types
pnpm --filter @mission-platform/email-sender dev -- --port 8787
```

Der Standard-SMTP-Endpunkt ist `127.0.0.1:1025`, mit der MailPit-Benutzeroberfläche unter
`http://localhost:8025`. Überschreiben Sie lokale Wrangler-Variablen, wenn Sie andere verwenden
Gastgeber.

Bei diesem Mitarbeiter handelt es sich um ein lokales Schaufenster und nicht um einen Produktionspostdienst. Niemals
Fügen Sie Anmeldeinformationen oder Geheimnisse in die nachverfolgte Wrangler-Konfiguration ein.

- [Entwicklungsleitfaden](guides/development.md)
- [`README.md`](../../../README.md)
