# @mission-platform/forms-core

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/forms-core/docs/index.md: [packages/forms-core/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

`@mission-platform/forms-core` ist eine Framework-unabhängige Kernbibliothek, die die Geschäftslogik, Typdefinitionen usw. bereitstellt
Validierungs-Engine für Formulare auf der gesamten Mission-Plattform. Durch die Zentralisierung dieser Logik in einem reinen TypeScript-Paket wird beides erreicht
Vue- und React-Implementierungen wahren konstruktionsbedingt perfekte Parität.

## Überblick

Das Paket konzentriert sich auf drei Hauptbereiche:

1. **JSON-Schemadefinition**: Typen und Strukturen zum Definieren von Formularschemata.
2. **Bedingte Sichtbarkeit**: Logik, um zu bestimmen, ob ein Feld basierend auf anderen Formularwerten gerendert werden soll.
3. **Validierung und Standardwerte**: Integration mit Ajv für JSON-Schema-Validierung und automatische Generierung von Standardwerten
   Werte.

## Schlüsselmodule

### 1. Formulardefinition und -typen (`src/types.ts`)

Definiert den Strukturvertrag für Formulare:

- `SchemaFormDefinition`: Die Root-Definition. Ein einzelnes Objekt stellt ein einstufiges Formular dar, während es sich um ein Array von Objekten handelt
  Definiert einen mehrstufigen Assistenten.
- `FormFieldSchema`: Die aufgelöste Form eines Feldes, das zum Rendern bereit ist.
– `FieldUiOptions`: Erweiterungen des JSON-Schemas zur Bereitstellung von Präsentationshinweisen (der Namespace `ui`).
- `FormValues` und `FormErrors`: Typzuordnungen für aktuelle Formulardaten und die entsprechenden Validierungsfehler.

### 2. Bedingte Sichtbarkeit (`src/conditions.ts`)

Stellt die Engine bereit, um basierend auf den aktuellen Werten zu bewerten, ob ein Feld sichtbar sein sollte:

- `evaluateCondition(condition, values)`: Wertet einen `FieldCondition` mithilfe von JSON-Schema-ähnlichen Kombinatoren aus:
  - `allOf`: UND-Logik (alle Bedingungen müssen wahr sein).
  - `anyOf`: ODER-Logik (mindestens eine Bedingung muss wahr sein).
  - `oneOf`: XOR-Logik (genau eine Bedingung muss wahr sein).
- `isFieldVisible(field, values)`: Ein Hilfsmittel, um festzustellen, ob die `visibleWhen`-Eigenschaft eines bestimmten Felds erfüllt ist.

### 3. JSON-Schema-Integration (`src/json-schema.ts`)

Verarbeitet die Übersetzung zwischen rohen JSON-Schemas und darstellbaren Formularfeldern:

- `jsonSchemaToFields(schema)`: Konvertiert ein JSON-Schema rekursiv in eine geordnete Liste von `FormFieldSchema`.
- `jsonSchemaDefaults(schema)`: Erzeugt Anfangswerte basierend auf den `default`-Schlüsselwörtern des Schemas oder typgerecht
  Leerzeichen.
- `createFormValidator(schema, translate?)`: Gibt ein `FormValidator` zurück, das Ajv zur Validierung von Formularwerten verwendet. Es
  schließt versteckte Felder automatisch von der Validierung aus und unterstützt benutzerdefinierte Fehlermeldungen.

### 4. Form Builder-Logik (`src/builder-types.ts`, `src/form-schema.ts`)

Unterstützt das visuelle Form Builder-Tool:

- **Konvertierung**: Funktionen wie `fieldsToSchema` und `schemaToFields` ermöglichen es dem Builder, zwischen seinen Arbeitsschritten zu wechseln
  Darstellung (ein Feldbaum) und das endgültige `SchemaFormDefinition`.
- **Feldpalette**: Stellt `DEFAULT_FIELD_TYPES` bereit, das die verfügbaren Widgets in der Builder-Palette definiert.

## Abhängigkeitsmodell

Dieses Paket ist bewusst schlank und Framework-unabhängig:

- **Keine Frameworks**: Keine Abhängigkeiten von Vue oder React.
- **Hauptabhängigkeiten**:
  - `ajv` & `ajv-formats`: Für leistungsstarke JSON-Schema-Validierung.
  - `nanoid`: Zum Generieren eindeutiger Feldbezeichner im Builder.

## Verbraucher

Der Hauptverbraucher ist `@mission-platform/forms`, der diesen Kern zur Stromversorgung verwendet:

- **ForgeSchemaForm**: Rendert Felder und validiert Daten mit diesen Dienstprogrammen.
- **ForgeFormBuilder**: Verwendet die Konvertierungslogik, um Benutzern die visuelle Erstellung von Schemata zu ermöglichen.
