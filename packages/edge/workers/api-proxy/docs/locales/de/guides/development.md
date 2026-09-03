# Entwicklung des API-Proxy-Workers

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/edge/workers/api-proxy/docs/guides/development.md: [packages/edge/workers/api-proxy/docs/guides/development.md](../../../guides/development.md)
> Sprache: Deutsch (de)

Führe die gezielten Prüfungen aus dem Repository-Stammverzeichnis aus:

```bash
pnpm --filter @mission-platform/api-proxy build:check
pnpm --filter @mission-platform/api-proxy test
pnpm --filter @mission-platform/api-proxy build
```

Der Build erzeugt `dist/index.js` und Deklarationen. Der Handler muss mit der
Cloudflare-Workers-Laufzeit kompatibel bleiben: Verwende das typisierte `env`-
Objekt für Bindings und füge keine integrierten Node.js-Module hinzu. Ergänze
Tests für Route-Allow-Listen, bereinigte Header, Query-Weiterleitung und
Upstream-Fehler, wenn du den Handler änderst.
