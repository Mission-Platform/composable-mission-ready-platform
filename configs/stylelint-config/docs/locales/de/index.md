# @mission-platform/stylelint-config

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> configs/stylelint-config/docs/index.md: [configs/stylelint-config/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Geteilt Stylelint Regeln für CSS und SCSS in Mission Platform.

## Installieren und verwenden

```bash
pnpm add --save-dev @mission-platform/stylelint-config
```

Erweitern Sie das Paket über den Arbeitsbereich `stylelint.config.mjs`. Komponente behalten
Stile in der Nähe ihrer Komponente und verwenden lokale Überschreibungen nur für eine dokumentierte
Einschränkung des Arbeitsbereichs.

## Beitragen

Laufen `pnpm --filter @mission-platform/stylelint-config lint` Und
`pnpm --filter @mission-platform/stylelint-config format`. Testregeländerungen
sowohl gegen Paket-SCSS- als auch gegen Anwendungsstile.
