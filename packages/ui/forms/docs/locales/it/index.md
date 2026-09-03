# @mission-platform/forms

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/ui/forms/docs/index.md: [packages/ui/forms/docs/index.md](../../index.md)
> Lingua: Italiano (it)

`@mission-platform/forms` fornisce componenti di orchestrazione dei moduli di alto livello che consentono il rendering di Mission Platform
moduli complessi e procedure guidate interamente dalle definizioni dello schema JSON.

Come altri pacchetti condivisi, segue un approccio "scrivi una volta", creando componenti in JSX neutrale e compilandoli
nei componenti nativi Vue 3 e React.

Tutte le importazioni utilizzano l'identificatore `@mission-platform/forms` semplice. Il framework viene selezionato una volta per l'intera app
la condizione di esportazione `mp:<framework>` — `resolve.conditions` (vedere `defineFrameworkAppConfig` /
`frameworkResolveConditions` da `@mission-platform/vite-config`) e `customConditions` (tramite il
preimpostazioni `@mission-platform/typescript-config/framework-<name>`).

## Componenti principali

### `ForgeSchemaForm`

Il componente principale per il rendering di moduli basati sui dati. Richiede una definizione di schema JSON e genera automaticamente il file
widget dell'interfaccia utente corrispondenti e logica di convalida.

#### Caratteristiche principali:

- **Schema-Driven**: interamente configurato tramite JSON Schema. Un singolo oggetto esegue il rendering di un modulo in un solo passaggio; una serie di oggetti
  crea una procedura guidata in più passaggi.
- **Convalida coerente**: utilizza `@mission-platform/forms-core` (Ajv) per garantire che le app Vue e React convalidino il
  stessi dati in modo identico.
- **Visibilità condizionale**: supporta `ui.visibleWhen` per mostrare o nascondere i campi in modo dinamico in base ad altri valori di input.
- **Strutture nidificate**: gestisce set di campi nidificati per modelli di dati complessi.

#### Utilizzo:

**Vue** (`mp:vue` attivo):

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

**React** (`mp:react` attivo — notare l'identico specificatore):

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

Uno strumento di creazione visiva che consente ai non sviluppatori di creare schemi di moduli senza scrivere manualmente JSON.

#### Caratteristiche principali:

- **Visual Canvas**: editor di stile drag-and-drop per organizzare i campi e definirne le proprietà.
- **Configurazione guidata**: una scheda "Passaggi" dedicata per la gestione del flusso in più passaggi nelle procedure guidate.
- **Anteprima dal vivo**: rendering in tempo reale del modulo mentre viene creato.
- **Esportazione schema**: emette un `SchemaFormDefinition` che può essere salvato in un database o utilizzato direttamente da
  `ForgeSchemaForm`.

#### Disposizione:

Il builder è strutturato come un layout a tre colonne utilizzando `ForgeVerticalLayout`:

1. **Palette campi**: un elenco di widget disponibili (input, selezioni, date, ecc.) da aggiungere al modulo.
2. **Edit Canvas**: l'area centrale in cui i campi sono configurati e organizzati.
3. **Ispettore**: editor di proprietà dettagliate per il campo attualmente selezionato.

## Architettura e dipendenze

Per evitare cicli di dipendenza mantenendo la parità del framework:

- `@mission-platform/forms` dipende da `@mission-platform/components` (per widget di input individuali come `ForgeInput`,
  `ForgeCheckbox`) e `@mission-platform/layouts`.
- Delega tutto il lavoro pesante (convalida, analisi dello schema e logica condizionale) all'agnostico del framework
  `@mission-platform/forms-core`.

## Stili

Il pacchetto fornisce assistenti condivisi per l'accessibilità tramite:

```ts
import '@mission-platform/forms/styles';
```

Ogni componente utilizza anche i propri moduli CSS co-localizzati per uno stile specifico.
