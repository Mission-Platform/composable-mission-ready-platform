# Entwickeln Sie den E-Mail-Absender-Worker

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/edge/workers/email-sender/docs/guides/development.md: [packages/edge/workers/email-sender/docs/guides/development.md](../../../guides/development.md)
> Sprache: Deutsch (de)

Führen Sie die Paketprüfungen vom Repository-Stamm aus aus:

```bash
pnpm --filter @mission-platform/email-sender build:check
pnpm --filter @mission-platform/email-sender test
pnpm --filter @mission-platform/email-sender build
```

Führen Sie nach der Änderung `pnpm --filter @mission-platform/email-sender types` aus
Bindungen. Fügen Sie Endpunktvalidierung, SMTP-Fehler und stabile Antworttests hinzu
Vertragsänderungen. Halten Sie den Worker-Handler Cloudflare-kompatibel und behalten Sie ihn bei
Nur MailPit-Verhalten hinter der lokalen Entwicklungskonfiguration.
