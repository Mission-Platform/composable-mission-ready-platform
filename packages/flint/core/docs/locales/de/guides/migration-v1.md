# Migrieren Sie zur standardmäßig sicheren FWS-Pipeline

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/flint/core/docs/guides/migration-v1.md: [packages/flint/core/docs/guides/migration-v1.md](../../../guides/migration-v1.md)
> Sprache: Deutsch (de)

Dieses Handbuch richtet sich an FWS-Module, die vor unveränderlichen Einheimischen, expliziten Anleihen,
und überprüfte Bounds-Policy-Metadaten wurden Teil des v1-Vertrags.

## Make mutation explicit

Hinzufügen `mut`  `&` für einen unveränderlichen
leihen und `&mut` für eine veränderliche Anleihe; Veränderliche Kredite können sich nicht überschneiden.

```flint
fn increment(mut value: i32) -> i32 {
  value = value + 1;
  value
}

fn inspect(values: &Vector<i32>) -> i32 { values[0] }
fn update(values: &mut Vector<i32>) -> unit { values[0] = 1; }
```

Verlassen Sie sich nicht auf abgeleitetes Eigentum. POD-Werte werden standardmäßig als Wert übergeben;
Nicht-POD-Werte verwenden unveränderliche Referenzen. Behalten Sie `owned`, `borrowed` und `shared`
an ABI-Grenzen, an denen eine bestimmte Lebenszeit- oder Release-Verantwortung liegt
erforderlich. Eine temporäre Region kann nicht zurückgegeben oder in einer längerfristigen gespeichert werden
Wert ohne explizite Eigentums-/Förderungsgrenze.

## Wählen Sie eine Grenzrichtlinie aus und prüfen Sie sie

Die Überprüfung der Laufzeitgrenzen bleibt die Standardeinstellung:

```bash
flint compile src/main.flint --bounds-checks runtime --format json
```

Verwenden Sie `proven-safe` nur, wenn die Analyse jeden Zugriff aus der Sammlungslänge beweist
und Fakten zum Indexbereich. `excluded-by-profile` ist eine explizite, überprüfbare Version
Auswahl, keine Abkürzung für unbekannte Indizes:

```bash
flint check src/main.flint --bounds-checks proven-safe --optimizer-report
```

Überprüfen Sie vor dem Versand die Analyseergebnisse und die Manifestrichtlinie. Unbekannt bzw
Nicht vertrauenswürdige Indizes sollten `runtime` verwenden. Eine strenge Analyse lehnt unsichere Richtlinien ab
Anfragen.

## Überprüfen Sie die generierten Cache-Metadaten

Der Compiler-Cache enthält möglicherweise `<key>.sonir.json`, eine deterministische Zusammenfassung von
das optimierte Sea-of-Nodes-Diagramm. Überprüfen Sie es, ohne Gastcode auszuführen:

```bash
flint inspect-sonir .cache/main.sonir.json --format json
```

Das Artefakt zeichnet Schema- und Sprach-/ABI-Versionen, Quell- und Diagramm-Hashes auf.
Optimierungsmodus, Begrenzungsrichtlinie, Effekte, Eigentumsmetadaten, Quellspannen,
und bestellte Passberichte. Veraltet, fehlerhaft, übergroß oder nicht mit den Richtlinien übereinstimmend
Artefakte werden ignoriert und können sicher entfernt werden.

## Strikte statische Typisierung und Fehlen dynamischer Typen

Flint ist eine statisch typisierte Sprache mit deterministischem Speicherlayout und keinem Laufzeitreflexionsaufwand. Die Sprache unterstützt keine dynamischen Top-Typen wie `any` oder `unknown`.

Der Versuch, Typen mit `any` oder `unknown` zu kommentieren, erzeugt zur Kompilierungszeit die Diagnose `FLINT-TYPE-020`. So migrieren Sie Code aus dynamischen Umgebungen:

- Ersetzen Sie dynamische Werte durch konkrete Grundelemente (`i32`, `u32`, `f64`, `bool`, `string`, `bytes`).
- Verwenden Sie parametrischen Polymorphismus/Generika (`Vector<T>`, `Option<T>`, `Result<T, E>`) für wiederverwendbare Containeralgorithmen.
– Verwenden Sie getaggte algebraische Datentypen (`enum`) für polymorphe Domänendarstellungen.
– Deklarieren Sie für C-ABI-Zeiger und undurchsichtige Host-Handles `opaque foreign type Handle;` anstelle untypisierter Zeiger.
– Stellen Sie in Web-IDL-Brücken und -Bindungen explizite Typzuordnungen über `FlintBindingOptions.customTypeMappings` bereit.

## Gedächtnis- und Release-Verhalten

Bereichswerte verwenden überprüfte Bereiche. Werte, die eine Region überdauern, werden explizit verwendet
ARC/gemeinsame Handles; Jedes beibehaltene Handle verfügt über ein passendes Release und Zyklen
werden nicht implizit akzeptiert. Rohe `fws_alloc`, `fws_realloc` und `fws_dealloc`
bleiben die vom Anrufer überprüfte ABI-Grenze. Async- und Iterator-Sperrung ist
eine Escape-Grenze, daher müssen die nach der Suspendierung verwendeten Werte explizit beibehalten werden.
