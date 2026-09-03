# @mission-platform/forms

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/ui/forms/docs/index.md: [packages/ui/forms/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

`@mission-platform/forms` stellt hochrangige Formularorchestrierungskomponenten bereit, die das Rendern der Mission Platform ermöglichen
komplexe Formulare und Assistenten vollständig aus JSON-Schemadefinitionen.

Wie andere gemeinsam genutzte Pakete folgt es einem „Einmal schreiben“-Ansatz, bei dem Komponenten in neutralem JSX erstellt und kompiliert werden
in native Vue 3- und React-Komponenten.

Alle Importe verwenden den bloßen Spezifizierer `@mission-platform/forms`. Das Framework wird einmalig für die gesamte App ausgewählt
die Exportbedingung `mp:<framework>` – `resolve.conditions` (siehe `defineFrameworkAppConfig` /
`frameworkResolveConditions` von `@mission-platform/vite-config`) und `customConditions` (über die
`@mission-platform/typescript-config/framework-<name>`-Voreinstellungen).

## Kernkomponenten

### `ForgeSchemaForm`

Die Hauptkomponente zum Rendern datengesteuerter Formulare. Es nimmt eine JSON-Schemadefinition und generiert automatisch die
entsprechende UI-Widgets und Validierungslogik.

#### Hauptmerkmale:

- **Schemagesteuert**: Vollständig über JSON-Schema konfiguriert. Ein einzelnes Objekt rendert ein einstufiges Formular; ein Array von Objekten
  erstellt einen mehrstufigen Assistenten.
- **Konsistente Validierung**: Verwendet `@mission-platform/forms-core` (Ajv), um sicherzustellen, dass die Apps Vue und React validieren
  gleiche Daten identisch.
- **Bedingte Sichtbarkeit**: Unterstützt `ui.visibleWhen`, um Felder basierend auf anderen Eingabewerten dynamisch anzuzeigen oder auszublenden.
- **Verschachtelte Strukturen**: Verarbeitet verschachtelte Feldsätze für komplexe Datenmodelle.

#### Verwendung:

**Vue** (`mp:vue` aktiv):

```vue
<script setup lang="ts">
  import { SchemaForm } from '@mission-platform/forms';
  const mySchema = {/* JSON Schema */};
</script>

<template>
  <SchemaForm
    :schema="mySchema"
    @change="onValuesChange"
  />
</template>
```

**React** (`mp:react` aktiv – beachten Sie den identischen Spezifizierer):

```tsx
import { SchemaForm } from '@mission-platform/forms';

const MyComponent = () => (
  <SchemaForm
    schema={mySchema}
    onChange={(values) => console.log(values)}
  />
);
```

---

### `ForgeFormBuilder`

Ein visuelles Authoring-Tool, das es Nicht-Entwicklern ermöglicht, Formularschemata zu erstellen, ohne JSON manuell schreiben zu müssen.

#### Hauptmerkmale:

- **Visual Canvas**: Drag-and-Drop-Stileditor zum Anordnen von Feldern und Definieren ihrer Eigenschaften.
- **Assistentenkonfiguration**: Eine spezielle Registerkarte „Schritte“ zum Verwalten des mehrstufigen Ablaufs in Assistenten.
- **Live-Vorschau**: Echtzeit-Rendering des Formulars während der Erstellung.
- **Schema-Export**: Gibt ein `SchemaFormDefinition` aus, das in einer Datenbank gespeichert oder direkt von verwendet werden kann
  `ForgeSchemaForm`.

#### Layout:

Der Builder ist als dreispaltiges Layout mit `ForgeVerticalLayout` aufgebaut:

1. **Feldpalette**: Eine Liste der verfügbaren Widgets (Eingaben, Auswahlen, Daten usw.), die dem Formular hinzugefügt werden sollen.
2. **Editor-Canvas**: Der zentrale Bereich, in dem Felder konfiguriert und organisiert werden.
3. **Inspektor**: Detaillierter Eigenschafteneditor für das aktuell ausgewählte Feld.

## Architektur und Abhängigkeiten

Um Abhängigkeitszyklen zu vermeiden und gleichzeitig die Framework-Parität aufrechtzuerhalten:

- `@mission-platform/forms` hängt von `@mission-platform/components` ab (für einzelne Eingabe-Widgets wie `ForgeInput`,
  `ForgeCheckbox`) und `@mission-platform/layouts`.
- Es delegiert die gesamte schwere Arbeit – Validierung, Schemaanalyse und bedingte Logik – an den Framework-Agnostiker
  `@mission-platform/forms-core`.

## Stile

Das Paket bietet gemeinsame Barrierefreiheitshilfen über:

```ts
import '@mission-platform/forms/styles';
```

Jede Komponente nutzt außerdem ihre eigenen, am selben Ort befindlichen CSS-Module für spezifisches Styling.
