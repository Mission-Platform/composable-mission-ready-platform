# @mission-platform/vite-config

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> configs/vite-config/docs/index.md: [configs/vite-config/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Geteilt Vite Und Vitest Konfigurationshilfen für Mission Platform-Pakete und
Anwendungen.

## Installieren und verwenden

```bash
pnpm add --save-dev @mission-platform/vite-config
```

Verwenden `defineLibraryConfig` für Pakete, `defineAppConfig` für Bewerbungen und
`defineVitestConfig` aus dem `/vitest` Unterpfad. Rahmenanwendungen sollten
Wählen Sie eine aus `defineFrameworkAppConfig` Bedingung und importieren Sie dann freigegebene Pakete
durch ihre bloßen Paketspezifizierer.

## Beitragen

Laufen `pnpm --filter @mission-platform/vite-config lint` und Formatprüfungen. Behalten
Die Standardeinstellungen des Helfers sind wiederverwendbar und das Gemeinsame bleibt erhalten Vite, PostCSS und
Externalisierungsverhalten, beschrieben im Paket README.
