# Entwickeln Sie WebLua

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/web-lua/docs/guides/development.md: [packages/web-lua/docs/guides/development.md](../../../guides/development.md)
> Sprache: Deutsch (de)

## Installieren und überprüfen

Führen Sie die gezielten Prüfungen vom Repository-Stamm aus aus:

```bash
pnpm install
pnpm --filter @mission-platform/web-lua build:check
pnpm --filter @mission-platform/web-lua test
```

Erstellen Sie mit `pnpm --filter @mission-platform/web-lua build`. Browserausgabe,
Node-Ausgabe und Deklarationen werden an `dist/` und `dist-node/` ausgegeben.

## Kompatibilitätsänderungen

Fügen Sie deterministische Beweise auf Gastebene hinzu, bevor Sie eine Kompatibilitätszeile ändern.
Aktualisieren Sie `src/compatibility.ts`, seine Tests und die Referenztabelle gemeinsam.
Verwenden Sie `matched` nur für Verhalten, das von einer deterministischen Vorrichtung abgedeckt wird.
`capability-gated` für explizite Host-Richtlinienanforderungen; und `unresolved` für
Verhalten, das nicht als vorübergehend angesehen werden darf.

Behalten Sie die Laufzeit im Besitz des Gasts bei und lassen Sie die Funktion standardmäßig verweigern. Nur Node-Adapter
gehören hinter den `./node`-Export und dürfen nicht in den Browsereintrag gelangen.
