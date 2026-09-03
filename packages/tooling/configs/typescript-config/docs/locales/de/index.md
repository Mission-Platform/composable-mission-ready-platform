# @mission-platform/typescript-config

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/tooling/configs/typescript-config/docs/index.md: [packages/tooling/configs/typescript-config/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Geteilt TypeScript Voreinstellungen für jeden Mission Platform-Arbeitsbereich.

## Installieren und verwenden

```bash
pnpm add --save-dev @mission-platform/typescript-config
```

Erweitern Sie die passende Voreinstellung von `tsconfig.json`: verwenden `app` für Vue Apps,
`react` für React Apps, `library` für Paketdeklarationen, `node` für Werkzeuge,
und `test` für Vitest Spezifikationen. Auch Framework-Konsumenten sollten das Matching nutzen
`framework-<name>` Voreinstellung für benutzerdefinierte Bedingungen. Weitere Informationen finden Sie in der README-Datei des Pakets
vollständige Preset-Tabelle und Beispiele.

## Beitragen

Behalten Sie gemeinsam genutzte Compiler-Flags in den Voreinstellungen bei. Laufen
`pnpm --filter @mission-platform/typescript-config build:check` und formatieren
prüft nach einem Wechsel.
