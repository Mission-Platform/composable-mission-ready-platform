# Rubrik „Qualität der Agentenarbeit“.

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/agent-guidance/quality-rubric.md: [docs/agent-guidance/quality-rubric.md](../../../agent-guidance/quality-rubric.md)
> Sprache: Deutsch (de)

Verwenden Sie diese Rubrik vor der Implementierung, um einen Ansatz auszuwählen, und während der Überprüfung, um das Ergebnis zu bewerten. Wenden Sie jede Dimension an, die zur Aufgabe passt. Eine reine Dokumentationsänderung muss dennoch einfach, wartbar, lesbar und hygienisch sein. Erfassen Sie konkrete Beweise für wesentliche Kompromisse, anstatt die Rubrik als subjektive Bewertung zu behandeln.

## Kleinste sichere Änderung

- Geben Sie das gewünschte Ergebnis und die kleinste Änderung an, die es erfüllen kann.
- Bevorzugen Sie vorhandene Repository-Muster, Pakete, Tools, Profile und Dokumentationen gegenüber neuen Abstraktionen.
- Halten Sie irrelevante Bereinigungen, spekulative Neugestaltungen und nicht genehmigte MCP-Laufzeitänderungen aus der Aufgabe heraus.
- Erweitern Sie den Anwendungsbereich nur, wenn Beweise zeigen, dass der kleinere Ansatz die Korrektheit, Sicherheit oder erforderliche Validierung nicht gewährleisten kann.

## Sieben Dimensionen

### Einfachheit

- Verwendet die Lösung die wenigsten Dateien, beweglichen Teile, Abhängigkeiten, Zustandsübergänge und Toolaufrufe, die die Anforderung erfüllen?
- Wird eine vorhandene Komponente, ein Dienstprogramm, ein Token, eine Übersetzung, ein Workflow oder eine MCP-Funktion wiederverwendet, anstatt sie zu duplizieren?
- Wurden spekulative Abstraktionen, doppelte MCP-Tools und unnötige Konfigurationsänderungen entfernt?

### Komplexität

- Identifizieren Sie neue Abhängigkeiten, Zustände, Kontrollflüsse, paketübergreifende Kanten, Profil/Werkzeugoberfläche, Betriebsschritte und Fehlermodi.
- Erklären Sie, warum jede unvermeidbare Komplexitätsquelle erforderlich ist und warum eine einfachere Alternative nicht ausreicht.
- Behalten Sie die Komplexität lokal beim Eigentümerpaket oder Themendokument bei und vermeiden Sie die Verteilung von Richtlinien auf doppelte Quellen.

### Zuverlässigkeit

- Definieren Sie beobachtbares erwartetes Verhalten und die Beweise, die es belegen.
- Bevorzugen Sie deterministisches Verhalten, begrenzte Operationen, explizite Fehlerbehandlung und sichere Fallbacks.
- Validieren Sie die wichtigen Pfade, einschließlich negativer Fälle und Integrationsgrenzen; Betrachten Sie ein Teilgerät, eine Quelldiagnose oder eine isolierte Einheit nicht als Beweis für ein durchgängiges Verhalten.
- Melden Sie Misserfolge, Unsicherheiten und unbestätigte Annahmen, anstatt stillschweigend auf einen Erfolg zu schließen.

### Wartbarkeit

- Befolgen Sie die Repository-Konventionen für Struktur, Benennung, Abhängigkeiten, Tests, Dokumentation und Eigentum.
- Halten Sie die Verantwortlichkeiten lokal und geben Sie jeder Regel eine kanonische Dokumentation.
- Dokumentieren Sie dauerhafte Entscheidungen und nicht offensichtliche Einschränkungen dort, wo ein zukünftiger Agent sie finden wird.
- Vermeiden Sie veraltete Links, doppelte Inventare, parallele Implementierungen und Formulierungen, die von der Quelle der Wahrheit abweichen können.

### Sicherheit

- Bewahren Sie die geringsten Rechte, die Stamm- und Pfadgrenzen des Repositorys, die Shell-freie Ausführung, die explizite Mutationsgenehmigung und die geheime Hygiene.
- Schützen Sie sich vor Injektionen, verwenden Sie genehmigte Kryptografie- und Abhängigkeitspraktiken und bewahren Sie die Abhängigkeitsrichtung.
- Schwächen Sie bestehende Sicherheitsscans nicht und ersetzen Sie aus Bequemlichkeitsgründen nicht die eingeschränkte/schreibgeschützte Inspektion durch einen breiteren Zugriff.
– Führen Sie für anwendbare Änderungen die entsprechenden Entwickler-MCP-Sicherheitsüberprüfungen aus: `security_scan_secrets`, `security_analyze_code`, `security_audit_dependencies`, `security_audit_supply_chain`, `security_collect_compliance_evidence` und `security_audit_compliance`.

### Hygiene

- Konzentrieren Sie sich auf den Unterschied und bewahren Sie die Formatierung, Benennung und Workflow-Konventionen des Repositorys.
- Entfernen Sie temporäre Artefakte, die während der Aufgabe erstellt wurden, ohne bereits vorhandene oder sitzungsverwaltete Dateien zu löschen.
- Aktualisieren Sie die betroffene Dokumentation und Links und stellen Sie sicher, dass keine generierten, lokalen, geheimen oder nicht verwandten Dateien enthalten sind.
- Melden Sie die genaue durchgeführte Validierung und alle Prüfungen, die nicht ausgeführt werden konnten.

### Lesbarkeit und Verständnis

- Verwenden Sie eine klare Überschriftenhierarchie, kurze Abschnitte, einheitliche Terminologie und direkte Sätze, damit der vorgesehene Agent die Anleitung schnell lesen kann.
- Minimieren Sie die kognitive Belastung: Präsentieren Sie Voraussetzungen vor Aktionen, halten Sie zusammengehörige Regeln zusammen, identifizieren Sie obligatorische und optionale Arbeit und vermeiden Sie ungeklärte Querverweise.
- Erklären Sie nicht offensichtliche Einschränkungen, Eigentumsverhältnisse, Vorrang, Sicherheitsgrenzen und den Grund für eine ungewöhnliche Validierungsanforderung.
- Überprüfen Sie, ob Links, Beispiele, Namen und Ausgabebeschreibungen ohne versteckten Sitzungskontext verständlich sind.
- Führen Sie einen unabhängigen Verständnisdurchgang durch: Könnte ein anderer Agent der Anleitung folgen und allein aus dem Dokument die richtige nächste Aktion auswählen?

## Überprüfungsdatensatz

Fassen Sie bei einer nicht trivialen Aufgabe die Ergebnisse der Rubrik in der abschließenden Überprüfung oder Übergabe zusammen. Erwähnen Sie den kleinsten sicheren Ansatz, die Materialkomplexität, den Nachweis der Zuverlässigkeit, Sicherheits- und Hygienekontrollen sowie alle Lesbarkeitsprobleme, die zu gesondert genehmigten Folgearbeiten führen sollten.

Zugehörige Richtlinie: [Repository-Sicherheit und -Validierung](repository-safety-and-validation.md) und [Selbstüberprüfung der Sitzung](session-self-review.md).
