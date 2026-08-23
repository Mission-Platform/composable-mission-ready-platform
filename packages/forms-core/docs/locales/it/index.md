# @mission-platform/forms-core

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/forms-core/docs/index.md: [packages/forms-core/docs/index.md](../../index.md)
> Lingua: Italiano (it)

`@mission-platform/forms-core` è una libreria principale indipendente dal framework che fornisce la logica aziendale, le definizioni dei tipi e
motore di convalida per i moduli su Mission Platform. Centralizzando questa logica in un pacchetto TypeScript puro, entrambi
Le implementazioni Vue e React mantengono la perfetta parità per costruzione.

## Panoramica

Il pacchetto si concentra su tre aree principali:

1. **Definizione dello schema JSON**: tipi e strutture per la definizione degli schemi dei moduli.
2. **Visibilità condizionale**: logica per determinare se un campo deve essere visualizzato in base ad altri valori del modulo.
3. **Convalida e valori predefiniti**: integrazione con Ajv per la convalida dello schema JSON e generazione automatica dei valori predefiniti
   valori.

## Moduli chiave

### 1. Definizione e tipi di modulo (`src/types.ts`)

Definisce il contratto strutturale per le forme:

- `SchemaFormDefinition`: la definizione radice. Un singolo oggetto rappresenta un modulo in un unico passaggio, mentre un array di oggetti
  definisce una procedura guidata a più passaggi.
- `FormFieldSchema`: la forma risolta di un campo pronto per il rendering.
- `FieldUiOptions`: estensioni allo schema JSON per fornire suggerimenti di presentazione (lo spazio dei nomi `ui`).
- `FormValues` e `FormErrors`: digita le mappe per i dati del modulo corrente e i relativi errori di convalida.

### 2. Visibilità condizionale (`src/conditions.ts`)

Fornisce il motore per valutare se un campo deve essere visibile in base ai valori correnti:

- `evaluateCondition(condition, values)`: valuta un `FieldCondition` utilizzando combinatori simili a JSON Schema:
  - `allOf`: logica AND (tutte le condizioni devono essere vere).
  - `anyOf`: OR logico (almeno una condizione deve essere vera).
  - `oneOf`: logica XOR (esattamente una condizione deve essere vera).
- `isFieldVisible(field, values)`: un helper per determinare se la proprietà `visibleWhen` di un campo specifico è soddisfatta.

### 3. Integrazione dello schema JSON (`src/json-schema.ts`)

Gestisce la traduzione tra schemi JSON grezzi e campi del modulo renderizzabile:

- `jsonSchemaToFields(schema)`: converte ricorsivamente uno schema JSON in un elenco ordinato di `FormFieldSchema`.
- `jsonSchemaDefaults(schema)`: genera valori iniziali in base alle parole chiave `default` dello schema o appropriate al tipo
  spazi vuoti.
- `createFormValidator(schema, translate?)`: restituisce un `FormValidator` che utilizza Ajv per convalidare i valori del modulo. Esso
  esclude automaticamente i campi nascosti dalla convalida e supporta messaggi di errore personalizzati.

### 4. Logica del generatore di moduli (`src/builder-types.ts`, `src/form-schema.ts`)

Supporta lo strumento visivo Form Builder:

- **Conversione**: funzioni come `fieldsToSchema` e `schemaToFields` consentono al costruttore di spostarsi tra le sue lavorazioni
  rappresentazione (un albero di campi) e il `SchemaFormDefinition` finale.
- **Palette campo**: fornisce `DEFAULT_FIELD_TYPES` che definisce i widget disponibili nella tavolozza del builder.

## Modello di dipendenza

Questo pacchetto è intenzionalmente snello e indipendente dal framework:

- **Nessun framework**: nessuna dipendenza da Vue o React.
- **Dipendenze chiave**:
  - `ajv` e `ajv-formats`: per la convalida dello schema JSON ad alte prestazioni.
  - `nanoid`: per generare identificatori di campo univoci nel builder.

## Consumatori

Il consumatore primario è `@mission-platform/forms`, che utilizza questo core per alimentare:

- **ForgeSchemaForm**: esegue il rendering dei campi e convalida i dati utilizzando queste utilità.
- **ForgeFormBuilder**: utilizza la logica di conversione per consentire agli utenti di creare visivamente schemi.
