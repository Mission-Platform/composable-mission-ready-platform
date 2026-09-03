# Entwickeln Sie den Forge SPA-Worker

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/edge/workers/forge-spa/docs/guides/development.md: [packages/edge/workers/forge-spa/docs/guides/development.md](../../../guides/development.md)
> Sprache: Deutsch (de)

Führen Sie die Paketprüfungen vom Repository-Stamm aus aus:

```bash
pnpm --filter @mission-platform/forge-spa build:check
pnpm --filter @mission-platform/forge-spa test
pnpm --filter @mission-platform/forge-spa build
```

Der Build gibt `dist/index.js` und Deklarationen aus. Beschränken Sie den Handler auf
die typisierte `ASSETS.fetch(request)`-Delegierung und Testanforderungsweiterleitung. Testen
und Anwendungsrouten von der nutzenden App aus bereitstellen; Keine Anwendung hinzufügen
Konfiguration oder Assets für diesen freigegebenen Worker.
