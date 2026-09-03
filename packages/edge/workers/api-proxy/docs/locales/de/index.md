# @mission-platform/api-proxy

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/edge/workers/api-proxy/docs/index.md: [packages/edge/workers/api-proxy/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Ein Beispiel für einen Cloudflare-Worker, der genehmigte schreibgeschützte API-Routen an a weiterleitet
fester Upstream-Dienst. Dieser Arbeitsbereich ist Eigentümer der Anforderungsrichtlinie und des Headers
Bereinigung und Fehlergrenze für den Proxy-Handler.

## Benutze den Arbeiter

Das Paket exportiert seinen gebündelten Handler aus `@mission-platform/api-proxy`.
Erstellen Sie es, bevor Sie aus einer Wrangler-Konfiguration auf `dist/index.js` verweisen:

```bash
pnpm --filter @mission-platform/api-proxy build
```

Es werden nur `GET`- und `HEAD`-Anfragen an `/users` und `/v1` akzeptiert. Abfrage
Zeichenfolgen werden weitergeleitet; Anmeldeinformationen, das ursprüngliche `Host` und Hop-by-Hop
Header werden entfernt. Upstream- oder Anforderungskonstruktionsfehler geben `502` zurück.

## Einschränkungen

Das Paket verfügt über keine eingecheckte Wrangler-Bereitstellungskonfiguration und ist keine
Allzweck-Reverse-Proxy. Fügen Sie eine explizite Bereitstellungskonfiguration hinzu und
Überprüfen Sie Authentifizierungs-, Upstream- und Caching-Änderungen, bevor Sie sie offenlegen.

- [Entwicklungsleitfaden](guides/development.md)
- [`README.md`](../../../README.md)
