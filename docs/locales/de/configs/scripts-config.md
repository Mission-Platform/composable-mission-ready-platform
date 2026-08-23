# Gemeinsam genutzte Dienstprogrammskripte

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/configs/scripts-config.md: [docs/configs/scripts-config.md](../../../configs/scripts-config.md)
> Sprache: Deutsch (de)

Dieser Leitfaden bleibt absichtlich in der Projektdokumentationsebene: `scripts/`
enthält eine Repository-Orchestrierung und kein veröffentlichbares Arbeitsbereichspaket.
Paket- und anwendungsspezifische Befehle bleiben weiterhin dokumentiert
Arbeitsplatz besitzen.

Die Mission Platform verwaltet eine Reihe gemeinsam genutzter Dienstprogrammskripte im Stammverzeichnis
`scripts/` Verzeichnis, das vom Root-Workspace-Tool verwaltet wird.

## Überblick

Diese Skripte automatisieren allgemeine Monorepo-Aufgaben, wie z. B. die Einrichtung der lokalen Entwicklung und die Build-Überprüfung. Übersetzung
Die Extraktion wird von jeder App oder jedem Paket definiert und vom Repository-Stamm mit Turborepo orchestriert.

## Verfügbare Skripte

### i18n-Extraktion (`i18n:extract`)

Jede App oder jedes Paket, das Übersetzungen besitzt, bietet eine `i18n:extract` Drehbuch und `i18next.config.ts`. Der Befehl schreibt
Namespace-Bundles unter jedem Arbeitsbereich `locales/<locale>/` Verzeichnis. Führen Sie die Extraktion für alle konfigurierten Arbeitsbereiche aus
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

Bestätigt das `@mission-platform/*` Paketexporte werden korrekt in den vorgesehenen Framework-Build aufgelöst (Vue, Reactusw.)
basierend auf den Exportbedingungen der Umgebung.

```bash
node scripts/verify-framework-resolution.mjs
```

## Ausführungsmethoden

### Über den Paketmanager

Die meisten Skripte sind verfügbar als `pnpm` Skripte im Stammverzeichnis `package.json`:

```bash
pnpm run <script-name>
```

### Direkte Ausführung

Person TypeScript Skripte können mit ausgeführt werden `tsx` oder `node --experimental-strip-types`:

```bash
pnpm exec tsx scripts/<filename>.ts
```

## Beitragsrichtlinien

Beim Hinzufügen eines neuen freigegebenen Skripts:

- Legen Sie es in die `scripts/` Verzeichnis.
- Verwenden TypeScript wo möglich.
- Wenn das Skript von externen Paketen abhängt, fügen Sie diese dem Arbeitsbereich des Eigentümers hinzu `package.json`.
- Dokumentieren Sie den Zweck und die Verwendung des Skripts in dieser Datei.
- Fügen Sie einen entsprechenden Eintrag im Stammverzeichnis hinzu `package.json` wenn es sich um ein häufig verwendetes Dienstprogramm handelt.
