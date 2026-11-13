# Entwickeln Sie den API-Proxy-Worker

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/edge/workers/api-proxy/docs/guides/development.md: [packages/edge/workers/api-proxy/docs/guides/development.md](../../../guides/development.md)
> Sprache: Deutsch (de)

Führen Sie die gezielten Prüfungen vom Repository-Stamm aus aus:

```bash
pnpm --filter @mission-platform/api-proxy build:check
pnpm --filter @mission-platform/api-proxy test
pnpm --filter @mission-platform/api-proxy build
```

Der Build gibt `dist/index.js` und Deklarationen aus. Halten Sie den Handler kompatibel
mit der Cloudflare Workers-Laufzeit: Verwenden Sie das typisierte `env`-Objekt für Bindungen
und fügen Sie keine Node.js-Integrationen hinzu. Tests für Routenzulassungslisten hinzugefügt, bereinigt
Header, Abfrageweiterleitung und Upstream-Fehler beim Ändern des Handlers.
