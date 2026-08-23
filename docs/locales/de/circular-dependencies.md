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

- **Build-Fehler**: Auflösung des Abhängigkeitsdiagramms (z. B. durch Turborepo oder pnpm) kann zum Stillstand kommen oder ausfallen.
- **Laufzeitfehler**: Ein Modul ist möglicherweise teilweise initialisiert, wenn das andere versucht, seine Exporte zu verwenden.
- **Erhöhte Kopplung**: Pakete können nicht mehr isoliert verwendet oder getestet werden.

## Erkennung

Mission Platform nutzt mehrere automatisierte Tools, um zirkuläre Abhängigkeiten zu erkennen, bevor sie in die Produktion gelangen.

### ESLint `no-restricted-paths`

Unser geteiltes ESLint Die Konfiguration erzwingt den unidirektionalen Abhängigkeitsfluss. Wenn Sie versuchen, aus einem Paket zu importieren, das
sollte in der Hierarchie „über“ Ihrem sein, wird der Linter einen Fehler auslösen.

Führen Sie den Linter aus, um nach Verstößen zu suchen:

```bash
pnpm lint
```

### Manuelles Audit mit Madge

Für komplexe Zyklen, die mehrere Dateien umfassen, können Sie verwenden `madge` (falls installiert) oder ähnliche Visualisierer, um das abzubilden
Abhängigkeitsdiagramm.

## Anleitung: Zirkuläre Abhängigkeiten auflösen

Wenn eine zirkuläre Abhängigkeit erkannt wird, verwenden Sie eine der folgenden Strategien, um diese aufzulösen.

### Strategie 1: Gemeinsam genutzten Code extrahieren (empfohlen)

Wenn Paket A und Paket B beide eine gemeinsame Logik benötigen, verschieben Sie diese Logik in ein neues Paket auf einer niedrigeren Ebene (z. B.
`packages/utils-shared`).

**Vor**:

- Paket A ↔ Paket B

**Nach**:

- Paket A → Paket C
- Paket B → Paket C

### Strategie 2: Abhängigkeitsumkehr

Anstatt Paket B direkt aus Paket A zu importieren, lassen Sie Paket B die erforderliche Funktionalität als Requisite akzeptieren, a
Konfigurationsobjekt oder über einen Ereignisbus.

**Beispiel**:
Statt `AuthService` importieren `UserService` um ein Profil zu aktualisieren, `AuthService` kann eine aussenden `AUTH_SUCCESS` Ereignis
das `UserService` lauscht.

### Strategie 3: Konsolidierung

Wenn zwei Pakete so eng miteinander verbunden sind, dass sie ständig die Interna des anderen benötigen, handelt es sich möglicherweise tatsächlich um ein Paket
einzelne logische Einheit. Erwägen Sie, sie in einem Paket zusammenzuführen.

## Best Practices für die Prävention

1. **Folgen Sie dem einseitigen Ablauf**: Halten Sie sich strikt daran `Apps → Packages → Configs` Abhängigkeitsrichtung.
2. **Autoren-Framework-neutrale Logik**: Verwendung `@mission-platform/forge` für die Kernlogik, um Framework-spezifische Zyklen zu vermeiden.
3. **Workspace-Protokolle verwenden**: Immer verwenden `workspace:*` um interne Abhängigkeiten zu gewährleisten pnpm richtig lösen kann
   die Grafik.
4. **Importe regelmäßig prüfen**: Achten Sie auf „Auto-Import“-Vorschläge in Ihrer IDE, da diese manchmal zu Problemen führen können
   unbeabsichtigte paketübergreifende Abhängigkeiten.

## Verwandte Dokumentation

- [Best Practices](best-practices.md)
- [Arbeitsbereichsstruktur](workspace-structure.md)
- [Leitfaden zur Fehlerbehebung](troubleshooting.md)
