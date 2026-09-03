# @mission-platform/forge-spa

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/edge/workers/forge-spa/docs/index.md: [packages/edge/workers/forge-spa/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Der gemeinsame Cloudflare Worker-Einstiegspunkt für Mission Platform SPA und SSG
Bereitstellungen. Es delegiert Anforderungen an die `ASSETS`-Bindung und wird von verwendet
Anwendungen statt unabhängig voneinander bereitzustellen.

## Integrieren Sie den Arbeitnehmer

Erstellen Sie das Paket und verweisen Sie dann auf den kompilierten Handler einer konsumierenden App
Wrangler-Konfiguration:

```bash
pnpm --filter @mission-platform/forge-spa build
```

Die Verbraucherkonfiguration sollte `main` auf setzen
`packages/edge/workers/forge-spa/dist/index.js` und binden Sie das Anwendungsverzeichnis `dist/` als
`ASSETS` mit SPA-Fallback-Behandlung. Website und My Care Notes sind aktuell
Verbraucher.

Der Worker besitzt keine Anwendungsrouten, Assets, Domänen oder Umgebungen
Geheimnisse. Diese verbleiben im verbrauchenden Anwendungspaket.

- [Entwicklungsleitfaden](guides/development.md)
- [`README.md`](../../../README.md)
