# @mission-platform/prettier-config

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/tooling/configs/prettier-config/docs/index.md: [packages/tooling/configs/prettier-config/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Von Paketen und Anwendungen gemeinsam genutzte Repository-Formatierungsstandardwerte.

## Installieren und verwenden

```bash
pnpm add --save-dev @mission-platform/prettier-config
```

Exportieren Sie die freigegebene Konfiguration aus dem `prettier.config.js` des Arbeitsbereichs.
Verwenden Sie lokale Überschreibungen sparsam, also Markdown, TypeScript, Vue und Konfiguration
Dateien bleiben im gesamten Monorepo konsistent.

## Beitragen

Führen Sie `pnpm --filter @mission-platform/prettier-config format` aus, nachdem Sie die geändert haben
Konfiguration. Änderungen sollten konsistent für jeden verwendeten Arbeitsbereich gelten
das Paket.
