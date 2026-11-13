# Zirkuläres Abhängigkeitsmanagement

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/circular-dependencies.md: [docs/circular-dependencies.md](../../circular-dependencies.md)
> Sprache: Deutsch (de)

Dieses Dokument erläutert die Auswirkungen zirkulärer Abhängigkeiten innerhalb des Mission Platform Monorepo und bietet eine **Anleitung
Leitfaden** zum Erkennen, Beheben und Verhindern dieser Probleme. Es dient sowohl als **Erklärung** der Monorepo-Gesundheit als auch als
technisches Rezept für Refactoring.

## Was sind zirkuläre Abhängigkeiten?

Eine zirkuläre Abhängigkeit entsteht, wenn zwei oder mehr Pakete direkt oder indirekt voneinander abhängig sind. Zum Beispiel:

- Paket A importiert aus Paket B.
- Paket B importiert aus Paket A.

Bei einem Monorepo sind diese Zyklen besonders schädlich, da sie Folgendes verursachen können:

- **Build Failures**: Dependency graph resolution (e.g., by Turborepo or pnpm) can deadlock or fail.
- **Laufzeitfehler**: Ein Modul ist möglicherweise teilweise initialisiert, wenn das andere versucht, seine Exporte zu verwenden.
- **Erhöhte Kopplung**: Pakete können nicht mehr isoliert verwendet oder getestet werden.

## Erkennung

Mission Platform nutzt mehrere automatisierte Tools, um zirkuläre Abhängigkeiten zu erkennen, bevor sie in die Produktion gelangen.

### ESLint `no-restricted-paths`

Unsere gemeinsame ESLint-Konfiguration erzwingt den unidirektionalen Abhängigkeitsfluss. Wenn Sie versuchen, aus einem Paket zu importieren, das
sollte in der Hierarchie „über“ Ihrem sein, wird der Linter einen Fehler auslösen.

Führen Sie den Linter aus, um nach Verstößen zu suchen:

```bash
pnpm lint
```

### Manuelles Audit mit Madge

Für komplexe Zyklen, die sich über mehrere Dateien erstrecken, können Sie `madge` (falls installiert) oder ähnliche Visualisierer verwenden, um die abzubilden
Abhängigkeitsdiagramm.

## Anleitung: Zirkuläre Abhängigkeiten auflösen

Wenn eine zirkuläre Abhängigkeit erkannt wird, verwenden Sie eine der folgenden Strategien, um diese aufzulösen.

### Strategie 1: Gemeinsam genutzten Code extrahieren (empfohlen)

Wenn Paket A und Paket B beide eine gemeinsame Logik benötigen, verschieben Sie diese Logik in ein neues Paket auf einer niedrigeren Ebene (z. B.
`packages/utils-shared`).

**Vorher**:

- Paket A ↔ Paket B

**Nachher**:

- Paket A → Paket C
- Paket B → Paket C

### Strategie 2: Abhängigkeitsumkehr

Anstatt Paket B direkt aus Paket A zu importieren, lassen Sie Paket B die erforderliche Funktionalität als Requisite akzeptieren, a
Konfigurationsobjekt oder über einen Ereignisbus.

**Beispiel**:
Anstatt dass `AuthService` `UserService` importiert, um ein Profil zu aktualisieren, kann `AuthService` ein `AUTH_SUCCESS`-Ereignis ausgeben
dass `UserService` lauscht.

### Strategie 3: Konsolidierung

Wenn zwei Pakete so eng miteinander verbunden sind, dass sie ständig die Interna des anderen benötigen, handelt es sich möglicherweise tatsächlich um ein Paket
einzelne logische Einheit. Erwägen Sie, sie in einem Paket zusammenzufassen.

## Best Practices zur Prävention

1. **Folgen Sie dem einseitigen Ablauf**: Halten Sie sich strikt an die `Apps → Packages → Configs`-Abhängigkeitsrichtung.
2. **Autoren-Framework-neutrale Logik**: Verwenden Sie `@mission-platform/forge-jsx` für die Kernlogik, um Framework-spezifische Zyklen zu vermeiden.
3. **Workspace-Protokolle verwenden**: Verwenden Sie immer `workspace:*` für interne Abhängigkeiten, um sicherzustellen, dass pnpm korrekt aufgelöst werden kann
   die Grafik.
4. **Importe regelmäßig prüfen**: Achten Sie auf „Auto-Import“-Vorschläge in Ihrer IDE, da diese manchmal zu Problemen führen können
   unbeabsichtigte paketübergreifende Abhängigkeiten.

## Verwandte Dokumentation

- [Best Practices](best-practices.md)
- [Arbeitsbereichsstruktur](workspace-structure.md)
- [Anleitung zur Fehlerbehebung](troubleshooting.md)
