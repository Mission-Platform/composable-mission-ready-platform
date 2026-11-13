# @mission-platform/vite-config

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/tooling/configs/vite-config/docs/index.md: [packages/tooling/configs/vite-config/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Gemeinsame Konfigurationshilfen Vite und Vitest für Mission Platform-Pakete und
Anwendungen.

## Installieren und verwenden

```bash
pnpm add --save-dev @mission-platform/vite-config
```

Verwenden Sie `defineLibraryConfig` für Pakete, `defineAppConfig` für Anwendungen und
`defineVitestConfig` aus dem Unterpfad `/vitest`. Rahmenanwendungen sollten
Wählen Sie eine `defineFrameworkAppConfig`-Bedingung aus und importieren Sie dann freigegebene Pakete
durch ihre bloßen Paketspezifizierer.

## Beitragen

Führen Sie `pnpm --filter @mission-platform/vite-config lint` und Formatprüfungen aus. Behalten
Die Standardeinstellungen des Helfers sind wiederverwendbar und behalten die gemeinsam genutzten Werte Vite, PostCSS und bei
Externalisierungsverhalten, beschrieben im Paket README.
