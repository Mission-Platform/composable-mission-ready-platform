# @mission-platform/forms-core

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/ui/forms-core/docs/index.md: [packages/ui/forms-core/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

`@mission-platform/forms-core` is een raamwerk-agnostische kernbibliotheek die de bedrijfslogica, typedefinities en
validatie-engine voor formulieren op het Mission Platform. Door deze logica te centraliseren in een puur TypeScript-pakket, beide
Vue- en React-implementaties behouden perfecte pariteit door constructie.

## Overzicht

Het pakket richt zich op drie hoofdgebieden:

1. **JSON-schemadefinitie**: typen en structuren voor het definiëren van formulierschema's.
2. **Voorwaardelijke zichtbaarheid**: Logica om te bepalen of een veld moet worden weergegeven op basis van andere formulierwaarden.
3. **Validatie en standaardwaarden**: Integratie met Ajv voor JSON-schemavalidatie en automatisch genereren van standaardwaarden
   waarden.

## Sleutelmodules

### 1. Formulierdefinitie en -typen (`src/types.ts`)

Definieert het structurele contract voor formulieren:

- `SchemaFormDefinition`: de basisdefinitie. Een enkel object vertegenwoordigt een eenstapsvorm, terwijl een reeks objecten
  definieert een wizard met meerdere stappen.
- `FormFieldSchema`: de opgeloste vorm van een veld dat gereed is voor weergave.
- `FieldUiOptions`: uitbreidingen van het JSON-schema om presentatiehints te bieden (de naamruimte `ui`).
- `FormValues` & `FormErrors`: Type kaarten voor huidige formuliergegevens en de bijbehorende validatiefouten.

### 2. Voorwaardelijke zichtbaarheid (`src/conditions.ts`)

Biedt de engine om te evalueren of een veld zichtbaar moet zijn op basis van de huidige waarden:

- `evaluateCondition(condition, values)`: Evalueert een `FieldCondition` met behulp van JSON Schema-achtige combinators:
  - `allOf`: AND-logica (alle voorwaarden moeten waar zijn).
  - `anyOf`: OR-logica (minstens één voorwaarde moet waar zijn).
  - `oneOf`: XOR-logica (precies één voorwaarde moet waar zijn).
- `isFieldVisible(field, values)`: een helper om te bepalen of aan de eigenschap `visibleWhen` van een specifiek veld wordt voldaan.

### 3. JSON-schema-integratie (`src/json-schema.ts`)

Verwerkt de vertaling tussen onbewerkte JSON-schema's en renderbare formuliervelden:

- `jsonSchemaToFields(schema)`: converteert een JSON-schema recursief naar een geordende lijst van `FormFieldSchema`.
- `jsonSchemaDefaults(schema)`: genereert initiële waarden op basis van de `default`-sleutelwoorden van het schema of op basis van het type
  blanco's.
- `createFormValidator(schema, translate?)`: retourneert een `FormValidator` die Ajv gebruikt om formulierwaarden te valideren. Het
  sluit automatisch verborgen velden uit van validatie en ondersteunt aangepaste foutmeldingen.

### 4. Logica van formulierbouwer (`src/builder-types.ts`, `src/form-schema.ts`)

Ondersteunt de visuele Form Builder-tool:

- **Conversie**: functies zoals `fieldsToSchema` en `schemaToFields` zorgen ervoor dat de bouwer tussen zijn werkgebieden kan schakelen
  representatie (een veldboom) en de uiteindelijke `SchemaFormDefinition`.
- **Veldpalet**: Biedt `DEFAULT_FIELD_TYPES` die de beschikbare widgets in het bouwerspalet definieert.

## Afhankelijkheidsmodel

Dit pakket is opzettelijk gestroomlijnd en raamwerk-agnostisch:

- **Geen raamwerken**: geen afhankelijkheden van Vue of React.
- **Belangrijke afhankelijkheden**:
  - `ajv` & `ajv-formats`: voor krachtige JSON-schemavalidatie.
  - `nanoid`: Voor het genereren van unieke veld-ID's in de builder.

## Consumenten

De primaire consument is `@mission-platform/forms`, die deze kern gebruikt voor de voeding:

- **ForgeSchemaForm**: Geeft velden weer en valideert gegevens met behulp van deze hulpprogramma's.
- **ForgeFormBuilder**: gebruikt de conversielogica om gebruikers in staat te stellen visueel schema's te schrijven.
