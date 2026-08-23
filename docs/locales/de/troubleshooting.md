# Leitfaden zur Fehlerbehebung

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/troubleshooting.md: [docs/troubleshooting.md](../../troubleshooting.md)
> Sprache: Deutsch (de)

Dieser Leitfaden bietet Lösungen für häufige Probleme, die während der Entwicklung, Erstellung und Bereitstellung innerhalb der Mission auftreten
Plattform-Monorepo. Es ist als **Anleitung** zur Diagnose und Lösung technischer Probleme strukturiert.

## Leistungsprobleme

### Langsames LCP (Größter Contentful Paint)

**Problem**: LCP liegt über dem 2,5-Sekunden-Schwellenwert für eine „Gut“-Bewertung.

**Diagnose**:

1. Führen Sie ein Lighthouse-Audit in Chrome DevTools durch.
2. Identifizieren Sie das LCP-Element im Bereich „Leistung“.
3. Überprüfen Sie die Registerkarte „Netzwerk“ auf Verzögerungen bei der Ressourcenauslastung.

**Lösungen**:

- **Inline-kritisches CSS**: Stellen Sie sicher, dass die für „above-the-fold“-Inhalte erforderlichen Stile inline sind.
- **Bildoptimierung**: Verwenden Sie WebP/AVIF-Formate und stellen Sie `srcset` für responsive Bilder bereit.
- **Ressourcenvorladen**: Verwenden Sie `<link rel="preload">` für das LCP-Bild oder kritische Schriftarten.
- **Hauptthread-Arbeit minimieren**: Nicht unbedingt erforderliches JavaScript mithilfe von `async` oder `defer` zurückstellen.

### Speicherlecks

**Problem**: Die Anwendung verbraucht mit der Zeit immer mehr Speicher, was schließlich zu Abstürzen führt.

**Diagnose**:

1. Erstellen Sie mehrere „Heap-Snapshots“ auf der Registerkarte „Speicher“ der Chrome DevTools.
2. Vergleichen Sie Schnappschüsse, um Objekte zu identifizieren, deren Anzahl oder Größe zunimmt.
3. Suchen Sie nach „Detached DOM Elements“.

**Lösungen**:

- **Bereinigung in Composables**: Löschen Sie immer Timer und entfernen Sie Ereignis-Listener in `onUnmounted`.
- **Geschäftsverwaltung**: Stellen Sie sicher, dass der reaktive Status in Pinia oder anderen Geschäften gelöscht wird, wenn es nicht mehr benötigt wird.
- **Observables entsorgen**: Stellen Sie bei Verwendung von RxJS sicher, dass alle Abonnements abgemeldet sind.

## Build- und Arbeitsbereichsprobleme

### Turborepo-Caching-Fehler

**Problem**: Änderungen werden nicht im Build widergespiegelt oder der Build schlägt mit veralteten Artefakten fehl.

**Lösung**: Erzwingen Sie einen neuen Build, indem Sie den Cache umgehen oder ihn manuell löschen.

```bash
# Force a build without cache
pnpm build:force

# Manually clear the turbo cache
rm -rf .turbo
```

### Modul nicht gefunden/Arbeitsbereichsauflösung

**Problem**: TypeScript oder Vite kann kein Paket finden, das im Arbeitsbereich definiert ist.

**Lösungen**:

1. Stellen Sie sicher, dass das Paket im `package.json` des konsumierenden Arbeitsbereichs aufgeführt ist.
2. Stellen Sie sicher, dass die Version übereinstimmt (`workspace:*` wird empfohlen).
3. Führen Sie `pnpm install` aus, um symbolische Links zu aktualisieren.
4. Wenn die Probleme weiterhin bestehen, versuchen Sie es mit einer gründlichen Reinigung:
```bash
   pnpm -r exec rm -rf node_modules
   pnpm install
   ```

### Geben Sie Fehler in CI ein, aber nicht in „Lokal“.

**Problem**: Build schlägt in CI mit TypeScript-Fehlern fehl, die nicht in Ihrer IDE angezeigt werden.

**Lösung**: Führen Sie die Typprüfung lokal im gesamten Arbeitsbereich aus.

```bash
pnpm exec turbo run build:check
```

Dadurch wird sichergestellt, dass alle Paketgrenzen korrekt berücksichtigt werden und die Typen sauber validiert werden.

## Fehlerbehebung beim MCP-Server

### Verbindung konnte nicht hergestellt werden

**Problem**: Ihr AI-Client oder Ihre IDE kann keine Verbindung zum Mission Platform MCP-Server herstellen.

**Diagnose**:

1. Überprüfen Sie, ob der MCP-Server erstellt wurde: `pnpm exec turbo run build --filter @mission-platform/mcp-*`.
2. Überprüfen Sie, ob der Server manuell startet: `node mcp/developer/dist/index.js`.

**Lösungen**:

– Stellen Sie sicher, dass Sie den absoluten Pfad zur node-Binärdatei und zum Skript in Ihrer Client-Konfiguration verwenden.
- Überprüfen Sie die MCP-Serverprotokolle auf bestimmte Fehlermeldungen (z. B. fehlende Umgebungsvariablen).

## Häufige Fehlermuster

### „Eigenschaft von undefiniert kann nicht gelesen werden“

**Ursache**: Zugriff auf Eigenschaften eines Null- oder undefinierten Objekts, oft bevor die Daten vollständig geladen wurden. **Fix**: Verwenden
optionale Verkettung (`?.`) oder Standardwerte bereitstellen.

```typescript
// Instead of:
const name = user.profile.name;

// Use:
const name = user?.profile?.name ?? 'Guest';
```

### „Unbehandelte Versprechensablehnung“

**Ursache**: Eine asynchrone Funktion hat einen Fehler ausgegeben, der nicht abgefangen wurde. **Fix**: Asynchrone Aufrufe immer in `try/catch`-Blöcke einschließen.

```typescript
try {
  await fetchData();
} catch (error) {
  handleError(error);
}
```

## Verwandte Ressourcen

- [Best Practices](best-practices.md)
- [Entwicklungs-Setup](development-setup.md)
- [Testleitfaden](testing.md)
