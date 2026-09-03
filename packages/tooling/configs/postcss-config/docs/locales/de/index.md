# @mission-platform/postcss-config

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/tooling/configs/postcss-config/docs/index.md: [packages/tooling/configs/postcss-config/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Gemeinsame PostCSS-Pipeline, die von Mission Platform-Stylesheets verwendet wird.

## Installieren und verwenden

```bash
pnpm add --save-dev @mission-platform/postcss-config
```

Verweisen Sie im Arbeitsbereich auf das Paket `postcss.config.mjs` eher als
Duplizieren der gemeinsam genutzten Plugin-Pipeline. Dazu gehören lokale Overrides
Arbeitsbereichskonfiguration.

## Beitragen

Laufen `pnpm --filter @mission-platform/postcss-config lint` Und
`pnpm --filter @mission-platform/postcss-config format`. Browser behalten
Kompatibilitätsverhalten in diesem Paket und vermeiden Sie anwendungsspezifische Plugins.
