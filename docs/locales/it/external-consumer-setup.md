# Configurazione del consumatore esterno

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> Fonte inglese: [docs/external-consumer-setup.md](../../external-consumer-setup.md)
> Lingua: Italiano (it)

Questa guida spiega come utilizzare i pacchetti Mission Platform in progetti situati al di fuori del monorepo principale. Si concentra sull'utilizzo di build specifiche del framework e sulla gestione dei token di progettazione.

## Selezione del quadro tramite condizioni

I componenti di Mission Platform vengono creati una volta utilizzati `@mission-platform/forge` e distribuito come più bundle specifici del framework (Vue 3, React, Solide Componenti Web) all'interno di un unico pacchetto.

Per selezionare il pacchetto corretto, è necessario configurare lo strumento di creazione e TypeScript per utilizzare le **Condizioni di esportazione personalizzate**.

### Condizioni quadro supportate

| Quadro | Condizione di esportazione |
| :--- | :--- |
| **Vue 3** | `mp:vue` |
| **React** | `mp:react` |
| **Solid** | `mp:solid` |
| **Componenti Web** | `mp:web-component` |

## Configurazione del progetto

### 1. Vite Configurazione

Se stai usando Vite, puoi utilizzare le funzioni di supporto da `@mission-platform/vite-config` per impostare automaticamente le condizioni di risoluzione corrette.

```ts
import { defineConfig } from 'vite';
import { frameworkResolveConditions } from '@mission-platform/vite-config';

export default defineConfig({
  resolve: {
    // This places 'mp:vue' at the top of the condition list
    conditions: frameworkResolveConditions('mp:vue'),
  },
});
```

### 2. TypeScript Configurazione

Per garantire il TypeScript Language Service (LSP) risolve i tipi per il framework corretto da cui dovresti estendere un framework preimpostato `@mission-platform/typescript-config`.

```json
{
  "extends": "@mission-platform/typescript-config/framework-vue",
  "compilerOptions": {
    "customConditions": ["mp:vue"]
  }
}
```

## Installazione del pacchetto

Installa i pacchetti richiesti dal registro:

```bash
pnpm add @mission-platform/components @mission-platform/tokens
```

### Dipendenze tra pari

La maggior parte dei pacchetti Mission Platform esternalizzano le proprie dipendenze di runtime. Assicurati di avere il framework corrispondente e le librerie condivise installate nel tuo progetto:

```bash
# Example for a Vue 3 project
pnpm add vue vue-router @mission-platform/i18n
```

## Utilizzo dei componenti

Con le condizioni configurate correttamente, è possibile importare i componenti dalla radice del pacchetto. Lo strumento di creazione selezionerà automaticamente il pacchetto corrispondente al tuo `mp:*` condizione.

```vue
<script setup lang="ts">
import { ForgeButton } from '@mission-platform/components';
</script>

<template>
  <ForgeButton variant="primary">Click Me</ForgeButton>
</template>
```

## Personalizzazione dei token di progettazione

Mission Platform utilizza proprietà personalizzate CSS (variabili) per i token di progettazione. Puoi sovrascrivere questi token a livello globale nel foglio di stile root della tua applicazione.

```css
/* App.css */
:root {
  /* Override the brand primary color */
  --mp-color-brand-primary: #007bff;
  /* Override a spacing token */
  --mp-spacing-md: 1.5rem;
}
```

Tutti i componenti di Mission Platform utilizzano queste variabili, quindi le modifiche cambiano al momento `:root` il livello si propagherà nell'intera interfaccia utente.
