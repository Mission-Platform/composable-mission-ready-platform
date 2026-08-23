# @mission-platform/i18n-config

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> configs/i18n-config/docs/index.md: [configs/i18n-config/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Gemeinsame Gebietsschema- und Extraktionskonfiguration für Mission Platform-Arbeitsbereiche.

## Installieren und verwenden

Fügen Sie dieses Paket als Entwicklungsabhängigkeit hinzu, wenn Sie i18next oder konfigurieren
Übersetzungsextraktion:

```bash
pnpm add --save-dev @mission-platform/i18n-config
```

Bewahren Sie Gebietsschemaquellen neben dem Arbeitsbereich auf, zu dem sie gehören. Extraktion schreibt
Namespace-Bundles unter dem besitzenden Arbeitsbereich `locales/<locale>/` Verzeichnis;
Der Befehl auf Repository-Ebene orchestriert alle konfigurierten Arbeitsbereiche.

## Beitragen

Führen Sie vor der Veröffentlichung die Paket-Lint- und Formatprüfungen durch. Legen Sie kein Paket oder
Anwendungsübersetzungsinhalte in diesem Konfigurationspaket.
