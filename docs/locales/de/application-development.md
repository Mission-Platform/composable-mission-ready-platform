# Anwendungsentwicklung

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> Englische Quelle: [docs/application-development.md](../../application-development.md)
> Sprache: Deutsch (de)

In dieser Anleitung wird erläutert, wie Sie die Anwendungen ausführen, testen und bereitstellen `apps/`. Anwendungen sind wiederverwendbar
Pakete; Gemeinsam genutzte Komponenten, Composables, Dienstprogramme und Konfigurationen gehören in ihren eigenen Arbeitsbereich, anstatt dort zu sein
in eine App kopiert.

## Wählen Sie eine Anwendung

| Bewerbung | Lokale Entwicklung | Bauen | Bereitstellung |
|:---|:---|:---|:---|
| `@mission-platform/docs` | `pnpm --filter @mission-platform/docs dev` | `pnpm --filter @mission-platform/docs build` | Vorschau oder Bereitstellung über seinen Hosting-Worker |
| `@mission-platform/website` | `pnpm --filter @mission-platform/website dev` | `pnpm --filter @mission-platform/website build` | `pnpm --filter @mission-platform/website deploy:staging` |
| `@mission-platform/my-care-notes` | `pnpm --filter @mission-platform/my-care-notes dev` | `pnpm --filter @mission-platform/my-care-notes build` | `pnpm --filter @mission-platform/my-care-notes deploy:staging` |
| `@mission-platform/service-monitor` | `pnpm --filter @mission-platform/service-monitor dev` | `pnpm --filter @mission-platform/service-monitor build` | `pnpm --filter @mission-platform/service-monitor deploy:staging` |
| `@mission-platform/storybook` | `pnpm --filter @mission-platform/storybook dev` | `pnpm --filter @mission-platform/storybook build` | Verwenden Sie den konfigurierten Storybook/Chromatic-Workflow |

Das Anwendungspaket besitzt seine Vite oder Wrangler Konfiguration. Laufen Sie nicht `wrangler deploy` von einem wiederverwendbaren Arbeiter
Paket, es sei denn, dieses Paket hat ein eigenes `wrangler.jsonc`.

## Entwickeln Sie eine Veränderung

1. Starten Sie die Zielanwendung mit ihrem Paket `dev` Skript.
2. Nehmen Sie wiederverwendbare Änderungen vor `packages/` und App-spezifische Kompositionsänderungen in `apps/<name>/`.
3. Erstellen Sie die geänderte Anwendung und ihre Abhängigkeiten:

```bash
   pnpm exec turbo run build --filter @mission-platform/<app>...
   ```

4. Führen Sie Tests, Lint, Stilprüfungen und Formatierungen für den betroffenen Arbeitsbereich durch:

```bash
   pnpm exec turbo run test lint lint:style format --filter @mission-platform/<app>
   ```

Ersetzen Sie für eine gemeinsame Paketänderung `<app>` mit dem Paketnamen und der Verwendung `...` wenn Sie abhängige Arbeitsbereiche benötigen
im Build-Graph enthalten.

## Statische Dokumentation und Website-Erstellung

Die verwendeten Dokumente und Website-Anwendungen `vite-ssg`. Ein Produktions-Build generiert statische Routen aus dem Quellinhalt und
Gebietsschemakataloge. Überprüfen Sie die generierte Ausgabe mit der des Pakets `preview` Skript:

```bash
pnpm --filter @mission-platform/docs build
pnpm --filter @mission-platform/docs preview

pnpm --filter @mission-platform/website build
pnpm --filter @mission-platform/website preview
```

Bewahren Sie die Dokumentation unter Markdown auf `docs/` und Website-Nachrichten im besitzenden Gebietsschema-Katalog. Fügen Sie keine Sekunde hinzu
Renderzeitkopie einer der Quellen.

## Cloudflare-Entwicklung und -Bereitstellung

Bewerbungen mit a `wrangler.jsonc` Umgebungsbewusste Befehle verfügbar machen:

```bash
pnpm --filter @mission-platform/website cf:dev
pnpm --filter @mission-platform/my-care-notes cf:dev
pnpm --filter @mission-platform/service-monitor dev

pnpm --filter @mission-platform/website deploy:staging
pnpm --filter @mission-platform/my-care-notes deploy:staging
pnpm --filter @mission-platform/service-monitor deploy:staging
```

Verwenden `wrangler secret put` für Geheimnisse. Behalten Sie Bindungen und nicht geheime Standardeinstellungen bei `wrangler.jsonc`, und überprüfen Sie die
Überprüfen Sie die ausgewählte Umgebung vor der Bereitstellung.

## Verwandte Leitfäden

- [Entwicklungs-Setup](development-setup.md)
- [Arbeitsbereichsstruktur](workspace-structure.md)
- [Build-System](build-system.md)
- [Worker-Konfiguration](configs/workers-config.md)
- [Testen](testing.md)
