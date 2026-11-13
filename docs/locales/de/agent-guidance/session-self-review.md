# Selbstüberprüfung der Sitzung

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/agent-guidance/session-self-review.md: [docs/agent-guidance/session-self-review.md](../../../agent-guidance/session-self-review.md)
> Sprache: Deutsch (de)

Führen Sie diese Überprüfung am Ende jeder Sitzung durch, unabhängig davon, ob die Aufgabe erfolgreich war, fehlgeschlagen ist oder vor der Implementierung gestoppt wurde. Bei der Überprüfung handelt es sich um einen Abschlussdatensatz und nicht um die Erlaubnis, die aktuelle Aufgabe zu erweitern.

## Ergebnisüberprüfung

Erfassen Sie prägnante Beweise für:

- Was wurde versucht und welches Ergebnis wurde gewünscht.
- Erwartetes Verhalten im Vergleich zu beobachtetem Verhalten.
- Annahmen, die bestätigt, widerlegt oder unsicher gelassen wurden.
- Ausfälle, blockierte Arbeiten, Rückschritte und ungelöste Risiken.
- Durchgeführte Überprüfung, einschließlich Befehle, Tests, Diagnosen, Scans, Überprüfungen und deren Ergebnisse.
– Ob das endgültige Diff fokussiert, portierbar, frei von temporären Artefakten und im Einklang mit den Repository-Konventionen ist.
- Welche Anleitung ermöglichte die Arbeit und welche Anleitung war mehrdeutig, schwer zu finden, dupliziert, veraltet oder unnötig kostspielig.

Bewahren Sie bewährte Konventionen. Unterscheiden Sie beobachtete Probleme von Hypothesen oder spekulativen Verbesserungsideen und schließen Sie die Beweise ein, die jede vorgeschlagene Änderung stützen.

## MCP-Rezension

Wenn MCP-Tools oder -Profile verwendet wurden, beantworten Sie diese Fragen:

- War das ausgewählte Profil das Mindestprofil, mit dem die Aufgabe erledigt werden konnte?
- Wurden begrenzte, schreibgeschützte Inspektionstools bevorzugt, bis ein explizites Schreiben erforderlich war?
- Waren `review_changes` und die verfügbaren Sicherheitskontrollen ausreichend, um die vorgeschlagene Mutation und ihre Risiken zu untersuchen?
- Haben ein Schema, eine Ausgabebegrenzung, eine Paginierungsbeschränkung, eine Zeitüberschreitung oder die Werkzeugergonomie zu Reibungen geführt oder nützliche Beweise verborgen?
- Erforderte ein Schreibpfad eine klarere Bestätigung, engere Grenzen, eine stärkere Isolierung oder einen sichereren Fallback?
- Stimmen Terminologie und Verhalten mit `mcp/README.md`, `mcp/developer/README.md`, `.ai/mcp/mcp.json`, `scripts/launch-mcp.mjs`, `mcp/developer/src/tools/profiles.ts` und `mcp/developer/src/tools/index.ts` überein?

Schlagen Sie nicht ein breiteres Profil oder ein neues Tool vor, nur weil es praktisch ist. Erklären Sie die kleinste Änderung, die ein beobachtetes Sicherheits-, Zuverlässigkeits- oder Verständnisproblem beseitigen würde.

## Verbesserungsentscheidung

Klassifizieren Sie jede Verbesserungsmöglichkeit:

- **Nachverfolgung der Dokumentation:** wird verwendet, wenn das Repository-Verhalten korrekt ist, aber Anleitungen fehlen, unklar, dupliziert, veraltet oder schwer zu finden sind. Schlagen Sie das kleinste Update vor `AGENTS.md` oder das besitzende Themendokument.
- **Separat autorisierte Implementierung:** wird verwendet, wenn die Feststellung eine Änderung des MCP-Laufzeitverhaltens, der Profile, Schemata und der Serverregistrierung erfordert. `.ai/mcp/mcp.json`, Tools oder eine andere Implementierung. Nehmen Sie es als Folgemaßnahme auf; Implementieren Sie es nicht als Teil einer Dokumentationsprüfung, es sei denn, dies ist ausdrücklich genehmigt.
- **Keine Änderung:** wird verwendet, wenn die Beobachtung spekulativ ist, es an Beweisen mangelt oder die bestehende Konvention weiterhin die sicherste und klarste Wahl bleibt.

Bei jeder Nachverfolgung müssen die Abhängigkeitsrichtung, explizite Mutationsgrenzen, Portabilität, Abwärtskompatibilität, geringste Privilegien und begrenzte Operationen erhalten bleiben. Verknüpfen Sie die Beweise und identifizieren Sie den Eigentümer, die betroffene Wahrheitsquelle und die kleinste sichere nächste Maßnahme.

## Closeout-Format

Verwenden Sie dieses kompakte Format bei der endgültigen Übergabe, wenn eine schriftliche Überprüfung erforderlich ist:

```markdown
### Session self-review
- Outcome: <expected and observed result>
- Evidence: <checks performed and results>
- Assumptions or uncertainty: <confirmed, disproved, or unresolved items>
- Guidance and MCP findings: <what helped or caused friction>
- Follow-up: <documentation, separately authorized implementation, or no change; include evidence>
```

Zugehörige Richtlinie: [Qualitätsrubrik](quality-rubric.md), [Repository-Sicherheit und Validierung](repository-safety-and-validation.md) und das Stammverzeichnis [AGENTS.md](../../../../AGENTS.md).
