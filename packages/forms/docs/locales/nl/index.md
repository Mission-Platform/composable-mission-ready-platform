# @mission-platform/forms

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/forms/docs/index.md: [packages/forms/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

`@mission-platform/forms` biedt hoogwaardige vormorkestratiecomponenten waarmee het Mission Platform kan renderen
complexe formulieren en wizards volledig op basis van JSON Schema-definities.

Net als andere gedeelde pakketten volgt het een "eenmalig schrijven"-aanpak, waarbij componenten in neutrale JSX worden geschreven en gecompileerd
in native Vue 3- en React-componenten.

Bij alle import wordt de kale `@mission-platform/forms`-specificatie gebruikt. Het raamwerk wordt één keer voor de hele app geselecteerd
de `mp:<framework>` exportvoorwaarde — `resolve.conditions` (zie `defineFrameworkAppConfig` /
`frameworkResolveConditions` van `@mission-platform/vite-config`) en `customConditions` (via de
`@mission-platform/typescript-config/framework-<name>`-voorinstellingen).

## Kerncomponenten

### `ForgeSchemaForm`

Het primaire onderdeel voor het weergeven van datagestuurde formulieren. Er is een JSON Schema-definitie voor nodig en genereert automatisch de
bijbehorende UI-widgets en validatielogica.

#### Belangrijkste kenmerken:

- **Schemagestuurd**: volledig geconfigureerd via JSON-schema. Een enkel object geeft een vorm in één stap weer; een reeks objecten
  creëert een wizard met meerdere stappen.
- **Consistente validatie**: gebruikt `@mission-platform/forms-core` (Ajv) om ervoor te zorgen dat de apps Vue en React de
  dezelfde gegevens identiek.
- **Voorwaardelijke zichtbaarheid**: Ondersteunt `ui.visibleWhen` om velden dynamisch weer te geven of te verbergen op basis van andere invoerwaarden.
- **Geneste structuren**: verwerkt geneste veldsets voor complexe gegevensmodellen.

#### Gebruik:

**Vue** (`mp:vue` actief):

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

**React** (`mp:react` actief - let op de identieke specificatie):

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

Een visuele ontwerptool waarmee niet-ontwikkelaars formulierschema's kunnen maken zonder JSON handmatig te schrijven.

#### Belangrijkste kenmerken:

- **Visueel canvas**: Drag-and-drop-stijleditor voor het rangschikken van velden en het definiëren van hun eigenschappen.
- **Wizardconfiguratie**: een speciaal tabblad "Stappen" voor het beheren van de meerstapsstroom in wizards.
- **Live Preview**: realtime weergave van het formulier terwijl het wordt gebouwd.
- **Schema-export**: verzendt een `SchemaFormDefinition` die kan worden opgeslagen in een database of direct kan worden gebruikt door
  `ForgeSchemaForm`.

#### Indeling:

De builder is gestructureerd als een lay-out met drie kolommen met behulp van `ForgeVerticalLayout`:

1. **Veldpalet**: een lijst met beschikbare widgets (invoer, selecties, datums, etc.) om aan het formulier toe te voegen.
2. **Editor Canvas**: het centrale gebied waar velden worden geconfigureerd en georganiseerd.
3. **Inspector**: gedetailleerde eigenschappeneditor voor het momenteel geselecteerde veld.

## Architectuur en afhankelijkheden

Om afhankelijkheidscycli te vermijden en tegelijkertijd de raamwerkpariteit te behouden:

- `@mission-platform/forms` is afhankelijk van `@mission-platform/components` (voor individuele invoerwidgets zoals `ForgeInput`,
  `ForgeCheckbox`) en `@mission-platform/layouts`.
- Het delegeert al het zware werk (validatie, schema-parsing en voorwaardelijke logica) aan de raamwerk-agnostische
  `@mission-platform/forms-core`.

## Stijlen

Het pakket biedt gedeelde toegankelijkheidshelpers via:

```ts
import '@mission-platform/forms/styles';
```

Elke component maakt ook gebruik van zijn eigen, naast elkaar geplaatste CSS-modules voor een specifieke stijl.
