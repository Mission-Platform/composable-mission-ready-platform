# Entwickeln Sie den Forge Web Script-Sprachserver

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/forge-web-script-lsp/docs/guides/development.md: [packages/forge-web-script-lsp/docs/guides/development.md](../../../guides/development.md)
> Sprache: Deutsch (de)

## Installieren und überprüfen

Führen Sie die gezielten Paketprüfungen im Repository-Stammverzeichnis aus:

```bash
pnpm install
pnpm --filter @mission-platform/forge-web-script-lsp build:check
pnpm --filter @mission-platform/forge-web-script-lsp test
```

Erstellen Sie mit `pnpm --filter @mission-platform/forge-web-script-lsp build`. Die
Ergebnis wird an `dist/` ausgegeben; Die lokale Ausgabe ist kein Quellartefakt.

## Protokolländerungen

Behalten Sie Diagnose, UTF-16-Bereiche, Symbole, Vervollständigung, Hover und semantisches Token bei
Verhalten im Einklang mit dem Sprachdienstleistungspaket. Fügen Sie eine Protokollregression hinzu
Fixpunkt für jede neue Anfrage oder Fähigkeit. Der LSP stellt derzeit nicht zur Verfügung
Go-to-Definition, Referenzen, Umbenennen, Formatierung, Codeaktionen, dateiübergreifend
Sprachimporte oder ein browsergehosteter Transport.

Der Server ist stdio-basiert und nur Node. Die Integration des Browser-Editors gehört dazu
Der lokale Adapter des Sprachdienstpakets und nicht dieser Server.
