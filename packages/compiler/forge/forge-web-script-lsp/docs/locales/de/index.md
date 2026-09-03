# @mission-platform/forge-web-script-lsp

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/forge-web-script-lsp/docs/index.md: [packages/forge-web-script-lsp/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Der stdio Language Server Protocol-Server für Forge Web Script v1. Das Paket
besitzt gegenüber dem Redakteur zugewandtes Transport- und Arbeitsbereichsverhalten; Sprachsemantik bleibt bestehen
Eigentum von `@mission-platform/forge-web-script`.

## Beginnen Sie hier

- [Referenz zu Sprachtools](reference/language-service.md) – Diagnose,
  Vervollständigung, Hover, semantische Token und unterstützte Grenzen.
- [Build- und Testanleitung](guides/development.md) – lokale Serverprüfungen und
  Protokollvorrichtungen.
- [`llms.txt` im Sprachpaket](../../../../forge-web-script/llms.txt) – Kern
  Hinweise zur Sprach-API.

Der Server benötigt Node.js `>=24.0.0` und stellt `forge-web-script-lsp` bereit
binär zusammen mit den Modulunterpfaden `server` und `workspace`.
