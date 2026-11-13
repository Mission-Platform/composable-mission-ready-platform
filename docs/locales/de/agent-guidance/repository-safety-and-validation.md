# Repository-Sicherheit und Validierung

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/agent-guidance/repository-safety-and-validation.md: [docs/agent-guidance/repository-safety-and-validation.md](../../../agent-guidance/repository-safety-and-validation.md)
> Sprache: Deutsch (de)

Dieses Thema ist für Implementierungs-, Refactoring-, Test-, Generierungs-, Repository-Inspektion-, Arbeitsbaum-, LSP-, Sicherheits- und Dateiverwaltungsaufgaben obligatorisch. Es behält die detaillierten betrieblichen Einschränkungen bei, die im Stammverzeichnis `AGENTS.md` zusammengefasst sind.

## Abhängigkeitsrichtung und Asset-Erkennung

– Code in `packages/` darf niemals aus `apps/` importiert werden. Anwendungen verbrauchen wiederverwendbare Paketmitglieder; Domänenpakete können von `core`, `tooling` und Compilerverträgen niedrigerer Ebene abhängen, ohne Anwendungen zu importieren.
- Überprüfen Sie vor dem Schreiben von Code vorhandene Assets mit den Repository-MCP-Tools (`list_components`, `get_component_usage`, `lsp_find_symbol` und `lsp_list_symbols`) und der Dateisystemprüfung.
– Verwenden Sie `@mission-platform/components` wieder, anstatt doppelte UI-Grundelemente zu erstellen, verweisen Sie auf `--mp-*`-Tokens anstelle von hartcodierten visuellen Werten, durchsuchen Sie `packages/` nach gemeinsamen Dienstprogrammen und verwenden Sie YAML-Kataloge mit `@mission-platform/i18n` für benutzerbezogene Zeichenfolgen.
– Neue gemeinsam genutzte UI-Komponenten, Composables, Dienstprogramme und Design-Token gehören zu `packages/`; Gemeinsam genutzte Lint-, Format- und Build-Tools gehören in `packages/tooling/configs/`.
– Wenn Sie eine Paketkomponente ändern, fügen Sie die dazugehörige `.stories.tsx`-Story hinzu oder aktualisieren Sie sie. Die `apps/storybook`-Workbench erkennt Paketgeschichten in Vue, React, Solid, Svelte und Webkomponenten.

## Sichere Codierung und Compliance

Der gesamte Code und die gesamte Konfiguration müssen ISO/IEC 27001:2022 Control A.8.28 entsprechen und vor den OWASP Top 10 (2025) und CWE Top 25 schützen.

- Geben Sie niemals Zugangsdaten, private Schlüssel, Cloud-Tokens oder andere Geheimnisse weiter.
- Bereinigen Sie HTML mit `DOMPurify.sanitize`, parametrisieren Sie Abfragen und verwenden Sie Vektorargumente wie `execFile` anstelle interpolierter Shell-Strings.
- Verwenden Sie moderne Kryptografie wie SHA-256 und `crypto.getRandomValues`; Verwenden Sie `Math.random()` niemals für sicherheitsrelevante Werte.
- Vermeiden Sie ungeprüfte `postinstall`-Lebenszyklusskripte und Pin-Abhängigkeiten durch Katalogverweise.
- Behalten Sie die geringsten Rechte, Repository-Stamm- und Pfadgrenzen, Shell-freie Ausführung, explizite Schreibgenehmigung und Sicherheitstoolgrenzen bei.
– Bevor Sie eine PR vorschlagen, führen Sie die entsprechenden Entwickler-MCP-Sicherheitsüberprüfungen durch: `security_scan_secrets`, `security_analyze_code`, `security_audit_dependencies`, `security_audit_supply_chain`, `security_collect_compliance_evidence` und `security_audit_compliance`, sofern zutreffend.

## Arbeitsbäume und Build-Abhängigkeiten

– Parallele Arbeitsströme müssen isolierte Git-Arbeitsbäume verwenden, die mit `node --experimental-strip-types scripts/worktree-manager.ts create <branch>` bereitgestellt werden.
– Erstellen Sie in einem neuen Arbeitsbaum Upstream-Arbeitsbereichsabhängigkeiten vor Pakettests oder Typprüfungen, da möglicherweise interne `dist/`-Artefakte fehlen:

  ```bash
  pnpm exec turbo run build --filter <package-name>^...
  ```

- Worktrees teilen sich `.turbo/cache`; Löschen oder umgehen Sie diesen Cache nicht.

## Portable LSP-Konfiguration

– LSP-Definitionen in `agent-lsp.json` müssen portable relative Aufrufe wie `["pnpm", "exec", "<server>", "--stdio"]` oder `["pnpm", "--dir", "relative/path", ...]` verwenden.
- Kodieren Sie niemals absolute Systempfade fest. Der MCP-LSP-Server führt Sprachserver aus dem erkannten Repository oder Arbeitsbaumstamm aus.
– LSP-Abfrage- und Ausführungstools erfordern eine aktive Sitzung. Überprüfen Sie `lsp_status` und verwenden Sie bei Bedarf `lsp_start`.
– Der native Server TypeScript 7 verwendet `tsc --lsp --stdio` (`typescript-go` 7.0.2). Bei Symbol- und Hover-Abfragen für den gesamten Arbeitsbereich kann es während der Indizierung zu Zeitüberschreitungen kommen. Verwenden Sie Protokoll-Timeouts von 15.000–30.000 ms und ergänzen Sie diese durch paketbezogene Typprüfungen und Vitest.
– Wenn beim Start oder bei der Erkennung eine Zeitüberschreitung auftritt, verwenden Sie paketbezogene Typprüfungen und Vitest als Diagnose-Fallback, anstatt die Aufgabe zu blockieren.

## Feuerstein- und Scannervalidierung

- Die Flint LSP-Diagnose erfolgt nur als Rückmeldung auf Quellenebene. Sie beweisen nicht, dass ein verknüpfter Multi-Modul-Graph gültiges Wasm ausgibt oder dass sein Laufzeit-ABI korrekt ausgeführt wird.
– Führen Sie für Scannerdiagrammänderungen die fokussierte Diagrammsuite, das Paket `type-check` und die Paketsuite Vitest aus. Erfassen Sie Artefaktemissionsfehler getrennt von der Quellendiagnose.
- Ein Fixture- oder reduzierter Decoder-Pfad stellt keine vollständige ZXing-Parität her. Markieren Sie nicht unterstützte Modi, Formatteilmengen, Metadaten, Wiederholungsversuche und Migrationen öffentlicher Verträge explizit im Plan und in der Pull-Anfrage.
- Wenn die statische Verknüpfung fehlschlägt, erfassen Sie die Anzahl der Diagrammmodule und Kanten, die Emitter-Diagnose und den kleinsten isolierten Reproduzierer, bevor Sie den Algorithmuscode ändern oder Tests schwächen.

## Codestil und Überprüfung

- Neue Quelldateien verwenden `.ts` oder `.vue` mit `<script setup lang="ts">`; Öffentliche APIs und exportierte Funktionen benötigen explizite Typen.
- Verwenden Sie `undefined` für fehlende oder gelöschte Werte, es sei denn, ein externes Protokoll erfordert `null`.
– Forge JSX-Ereignis-Requisiten verwenden standardmäßige CamelCase-Namen wie `onKeyDown`, `onPointerDown` und `onMouseDown`.
– Gruppieren Sie Importe in dieser Reihenfolge ohne Leerzeilen innerhalb einer Gruppe: integrierte Node-Dateien, externe Abhängigkeiten, interne `@mission-platform/*`-Pakete und relative Dateien. Trennen Sie Gruppen durch eine Leerzeile.
- Führen Sie `pnpm --filter <pkg> run lint` und `pnpm --filter <pkg> run lint:style` aus; Verwenden Sie den Paket-ESLint-Fix nur für zutreffende Stilfehler. Markdown und Storys verwenden den Repository-Formatierungsworkflow.
– Compiler-, Transpiler-, AST- und Codegenerierungsänderungen erfordern eine durchgängige Integrationsabdeckung. Überprüfen Sie nicht kollidierende Ausgaben auf identische Basisnamen, eindeutige erneute Exporte von Einträgen und erhaltene ausgegebene Inhalte.
- `TargetIntentions.lowered` ist in `@mission-platform/forge-plugin-api` obligatorisch; Ziel-Plugins erfordern reduzierte Tarife. Fixtures, Mocks und CMS-Integrations-Plugins müssen `{ framework, appliedOptimizations: [] }` bereitstellen oder `lower -> optimize -> generate` ausführen.
– Unter paralleler Last sollten Multi-Framework-, Dokumentationsextraktions- und große AST-Tests explizite `60_000`–`120_000` ms-Timeouts verwenden.
- Nutzen Sie für bereichsübergreifende Planarbeiten eine unabhängige Überprüfung, die sich auf End-to-End-Verhalten, negative Tests und paketbezogene Flusentore konzentriert.

## Interaktionsmodi

Verwenden Sie den ersten anwendbaren Modus und behalten Sie ihn für die Sitzung bei, es sei denn, seine Persistenzregel lässt einen Wechsel zu:

1. `[CHAT]` für Begrüßungen, Smalltalk, Sachfragen oder einfache Mathematik.
2. `[ADVANCED_CHAT]` für schreibgeschützte Erklärungen, Analysen, Informationssuche oder Vorschläge.
3. `[RUN_VERIFY]` für kurze sichere Befehle, App-Ausführungen oder Tests ohne Änderungen.
4. `[FAST_CODE]` für eine einfache Änderung in einer Datei, die keine zusätzliche Kontexterfassung erfordert.
5. `[SETUP]` für Builds, Installationen, Infrastruktur, Umgebungskorrekturen oder Systemprüfungen.
6. `[CODE]` für nicht triviale Projektänderungen, die eine Untersuchung oder mehrere Schritte erfordern.
7. `[NICHE]` nur für spezielle Forensik, Reverse Engineering, Datenwiederherstellung oder Sicherheitsforschung, die nicht in einen anderen Modus passt.

`[CHAT]` und `[CODE]` wechseln nicht den Modus. `[ADVANCED_CHAT]` wechselt erst nach einer expliziten Implementierungsanforderung zu `[CODE]`; `[FAST_CODE]` und `[RUN_VERIFY]` wechseln zu `[CODE]`, wenn sie nicht innerhalb von drei Schritten fertig werden können; `[SETUP]` und `[NICHE]` können zu `[CODE]` wechseln, wenn eine Implementierung erforderlich wird.

## Atomare Generierung und Dateiverwaltung

- Löschen oder löschen Sie niemals ein Generierungsziel vor erfolgreicher Generierung. Stellen Sie Artefakte in einem gleichgeordneten Versuchsverzeichnis wie `.forge-attempt/` bereit, führen Sie Diagnosen vor dem Festschreiben aus und tauschen Sie sie nur dann atomar aus, wenn die Prüfungen bestanden wurden.
– Behalten Sie Repository-Punktdateien wie `.gitkeep` und `.gitignore` bei und bewahren Sie In-Flight-Staging-Verzeichnisse beim Synchronisieren oder Bereinigen von Build-Zielen auf.
- Halten Sie Mutationen explizit und begrenzt. Verwenden Sie keine umfassenden Bereinigungsbefehle und löschen Sie keine Dateien, die nicht für die aktuelle Aufgabe erstellt wurden.

## Entwickler-MCP-LSP-Workflow-Vertrag

Bevorzugen Sie für Codeaufgaben die begrenzten Code-Intelligence-Tools `lsp_*` des Entwickler-MCP gegenüber der manuellen Textsuche. Verwenden Sie `lsp_capabilities`, um den aktuellen Vertrag und die Verfügbarkeit zu bestätigen; Verwenden Sie vor der Bearbeitung das schreibgeschützte `lsp_review_structure` oder `lsp_debug_context`, vor dem Anwenden einer LSP-Bearbeitung `lsp_preview_edit` und nach einer Änderung `lsp_get_diagnostics`, dann ggf. `lsp_run_build` und `lsp_run_tests`.

Verwenden Sie die speziell entwickelte Zuordnung: `lsp_list_symbols` für die Struktur, `lsp_find_symbol` für Symbole, `lsp_find_references` für Verwendungen, `lsp_inspect_symbol` für das Verständnis, `lsp_find_callers` für Aufrufstellen, `lsp_replace_symbol_body` für Funktionsersetzung und `lsp_safe_delete_symbol` für nicht verwendete Symbole. Verwenden Sie die dokumentierten `/lsp-*`-Workflows für Architektur, Auswirkungen, Refactoring, sichere Bearbeitungen, Testkorrelation und vollständige Überprüfung.

Zugehörige Richtlinie: [Qualitätsrubrik](quality-rubric.md), [Selbstüberprüfung der Sitzung](session-self-review.md) und das Stammverzeichnis [AGENTS.md](../../../../AGENTS.md).
