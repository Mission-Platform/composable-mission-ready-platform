# @mission-platform/prettier-config

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> configs/prettier-config/docs/index.md: [configs/prettier-config/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Von Paketen und Anwendungen gemeinsam genutzte Repository-Formatierungsstandardwerte.

## Installieren und verwenden

```bash
pnpm add --save-dev @mission-platform/prettier-config
```

Exportieren Sie die freigegebene Konfiguration aus dem Arbeitsbereich `prettier.config.js`.
Verwenden Sie lokale Überschreibungen sparsam, sodass Markdown, TypeScript, Vueund Konfiguration
Dateien bleiben im gesamten Monorepo konsistent.

## Beitragen

Laufen `pnpm --filter @mission-platform/prettier-config format` nach dem Wechsel des
Konfiguration. Änderungen sollten konsistent für jeden verwendeten Arbeitsbereich gelten
das Paket.
