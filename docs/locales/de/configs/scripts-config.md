# Shared Utility-Skripte

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/configs/scripts-config.md: [docs/configs/scripts-config.md](../../../configs/scripts-config.md)
> Sprache: Deutsch (de)

Dieses Handbuch bleibt absichtlich in der Projektdokumentationsebene: `scripts/`
ist ein privates Arbeitsbereichspaket, das eine Repository-Orchestrierung enthält, statt eines
veröffentlichungsfähige Bibliothek.
Paket- und anwendungsspezifische Befehle bleiben weiterhin dokumentiert
Arbeitsplatz besitzen.

Die Mission Platform verwaltet eine Reihe gemeinsamer Dienstprogrammskripts im Stammverzeichnis
Verzeichnis `scripts/`. Ihre Paketskripte werden als Turbo-Aufgaben registriert
Das Stammverzeichnis `package.json` stellt praktische Wrapper bereit, die an Turbo delegieren.

## Überblick

Diese Skripte automatisieren allgemeine Monorepo-Aufgaben, wie z. B. die Einrichtung der lokalen Entwicklung und die Build-Überprüfung. Übersetzung
Die Extraktion wird von jeder App oder jedem Paket definiert und vom Repository-Stamm mit Turborepo orchestriert.

## Verfügbare Skripte

### Turbo Aufgabenfamilien

Verwenden Sie die Root-Wrapper für die unten aufgeführten Repository-Dienstprogramme. Jeder Befehl ist ein
separate Aufgabe, damit Turbo sie unabhängig hashen und planen kann:

| Befehl | Zweck | Cache-Richtlinie |
| :----------------------------------- | :---------------------------------------------------------------- | :---------------------------------------------------------- |
| `pnpm validate` | Führen Sie die eigenständige statische Prüfung der Komponenteneigenschaften über Turbo aus. | Die Aufgabe wird unabhängig zwischengespeichert.                           |
| `pnpm docs:generate` | Generieren Sie eine Referenzdokumentation für Pakete und Erweiterungen.           | Erzeugte Referenzdateien werden zwischengespeichert.                       |
| `pnpm validate:exports` | Überprüfen Sie Paketexportkarten und erstellte Ziele.                     | Zwischenspeicherbar, wenn die Eingaben unverändert bleiben.                    |
| `pnpm validate:component-properties` | Überprüfen Sie Komponenteneigenschaftsdeklarationen anhand von Quellstilen.      | Zwischenspeicherbar und ausgabefrei.                                  |
| `pnpm validate:inventory` | Erstellen Sie das Laufzeitvalidierungsinventar.                         | Zwischenspeicherbare Artefakte unter `.artifacts/runtime-validation/`. |
| `pnpm validate:framework` | Validieren Sie die Laufzeitabdeckung des Frameworks.                              | Zwischenspeicherbare Artefakte unter `.artifacts/runtime-validation/`. |
| `pnpm validate:app` | Validieren Sie die Laufzeitabdeckung der Anwendung.                            | Zwischenspeicherbare Artefakte unter `.artifacts/runtime-validation/`. |
| `pnpm validate:target` | Validieren Sie konfigurierte Storybook-Ziele.                            | Zwischenspeicherbare Artefakte unter `.artifacts/runtime-validation/`. |
| `pnpm validate:runtime` | Führen Sie die vollständige Laufzeitvalidierungssuite aus.                            | Nicht zwischengespeichert, da dadurch externe Laufzeitprozesse gestartet werden.    |
| `pnpm visual:parity` | Vergleichen Sie die gerenderte Storybook-Ausgabe über Frameworks hinweg.              | Nicht zwischengespeichert, da Entwicklungsserver gestartet werden.           |
| `pnpm test:runtime-validation` | Führen Sie die fokussierten Laufzeitvalidierungs-Komponententests aus.                    | Cachebar gemäß den Eingaben der Testaufgabe.                |

Die Eingaben für die Dienstprogrammaufgabe werden in `turbo.json` deklariert. Repository-weite Eingaben verwenden
`$TURBO_ROOT| `pnpm test:runtime-validation` | Führen Sie die fokussierten Laufzeitvalidierungs-Komponententests aus.                    | Cachebar gemäß den Eingaben der Testaufgabe.                |

Die Eingaben für die Dienstprogrammaufgabe werden in `turbo.json` deklariert. Repository-weite Eingaben verwenden
, damit sie korrekt bleiben, wenn die Aufgabe über `scripts/` ausgeführt wird
Arbeitsbereich. Die erzeugten Laufzeit- und visuellen Artefakte werden unten aufgeführt
`.artifacts/` und werden nicht als Quelleingaben behandelt.

`pnpm validate:exports` ist absichtlich ein separates Post-Build-Gate, weil es
Überprüft Dateien in Paket-`dist/`-Verzeichnissen. Führen Sie es nach `pnpm build` aus, da das
Chromatische Statik-Gates funktionieren.
 `$TURBO_ROOT$`
### i18n-Extraktion (`i18n:extract`)

Jede App oder jedes Paket, das Übersetzungen besitzt, stellt ein `i18n:extract`-Skript und `i18next.config.ts` bereit. Der Befehl schreibt
Namespace-Bundles im `locales/<locale>/`-Verzeichnis jedes Arbeitsbereichs. Führen Sie die Extraktion für alle konfigurierten Arbeitsbereiche aus
das Repository-Stammverzeichnis:

```bash
pnpm i18n:extract
```

### Erstellung von Entwicklungszertifikaten (`generate-dev-cert.ts`)

Erzeugt lokale SSL/TLS-Zertifikate für die HTTPS-Entwicklung. Dies ist nützlich zum Testen von Funktionen, die eine Sicherheit erfordern
Kontext (z. B. Kamerazugriff über `@mission-platform/code-scanner`).

```bash
pnpm exec tsx scripts/generate-dev-cert.ts
```

### Überprüfung der Framework-Auflösung (`verify-framework-resolution.mjs`)

Überprüft, ob `@mission-platform/*`-Paketexporte korrekt in den vorgesehenen Framework-Build (Vue, React usw.) aufgelöst werden.
basierend auf den Exportbedingungen der Umgebung.

```bash
node scripts/verify-framework-resolution.mjs
```

### Dokumentationsgenerierung (`docs:generate`)

Die Dokumentationsgenerierung ist eine Turbo-Aufgabe, deren Eigentümer `@mission-platform/scripts` ist.
Die Docs-Anwendung hängt explizit von dieser Aufgabe ab, also Entwicklung und Build
Befehle starten keinen verschachtelten Turbo-Build.

## Ausführungsmethoden

### Über den Paketmanager

Häufig verwendete Dienstprogramme sind als von Turbo unterstützte `pnpm`-Skripte im verfügbar
root `package.json`:

```bash
pnpm run <script-name>
```

Für einen paketbezogenen Aufruf verwenden Sie Turbo direkt:

```bash
pnpm exec turbo run validate:exports --filter=@mission-platform/scripts
```

### Direkte Ausführung

Einzelne TypeScript-Skripte können mit `tsx` oder `node --experimental-strip-types` ausgeführt werden:

```bash
pnpm exec tsx scripts/<filename>.ts
```

## Beitragsrichtlinien

Beim Hinzufügen eines neuen freigegebenen Skripts:

- Platzieren Sie es im Verzeichnis `scripts/`.
- Verwenden Sie nach Möglichkeit TypeScript.
– Wenn das Skript von externen Paketen abhängt, fügen Sie diese zum `package.json` des besitzenden Arbeitsbereichs hinzu.
- Dokumentieren Sie den Zweck und die Verwendung des Skripts in dieser Datei.
– Fügen Sie einen entsprechenden Eintrag im Stammverzeichnis `package.json` hinzu, wenn es sich um ein häufig verwendetes Dienstprogramm handelt.
