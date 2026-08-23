# Configurazione del consumatore esterno

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/external-consumer-setup.md: [docs/external-consumer-setup.md](../../external-consumer-setup.md)
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

Se stai usando Vite, puoi utilizzare le funzioni di supporto da `@mission-platform/vite-config` per impostare automaticamente le condizioni di risoluzione corrette. Dovrebbe essere selezionata un'app priva di framework `mp:web-component`; non installare o configurare a Vue plugin per quella destinazione.

```ts
import { defineConfig } from 'vite';
import { frameworkResolveConditions } from '@mission-platform/vite-config';

export default defineConfig({
  resolve: {
    // This places the Web Components build at the top of the condition list.
    conditions: frameworkResolveConditions('web-component'),
  },
});
```

### 2. TypeScript Configurazione

Per garantire il TypeScript Language Service (LSP) risolve i tipi per il framework corretto da cui dovresti estendere un framework preimpostato `@mission-platform/typescript-config`.

```json
{
  "extends": "@mission-platform/typescript-config/framework-web-component",
  "compilerOptions": {
    "customConditions": ["mp:web-component"]
  }
}
```

## Installazione del pacchetto

Installa i pacchetti richiesti dal registro:

```bash
pnpm add @mission-platform/components @mission-platform/tokens @mission-platform/router @mission-platform/forge-router-web-components
```

### Dipendenze tra pari

La maggior parte dei pacchetti Mission Platform esternalizzano le proprie dipendenze di runtime. Assicurati di avere il framework corrispondente e le librerie condivise installate nel tuo progetto:

```bash
# Example for a Vue 3 project
pnpm add @mission-platform/i18n
```

Il pacchetto router neutro non ha dipendenze di runtime dal framework o dalla libreria del router. Installa il router nativo selezionato da
la tua applicazione e il target Forge corrispondente (`@mission-platform/forge-router-vue`, `-react`, `-solid`, `-svelte`,
`-redwood`, O `-web-components`). L'applicazione possiede definizioni di percorso, fornitori, guardie, caricatori e file nativi
istanza del router; i pacchetti riutilizzabili importano solo le funzionalità da `@mission-platform/router`.

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

### Routing senza framework

Utilizza la cronologia della memoria per test e prerendering oppure omettila `history` in un browser per utilizzare la cronologia del browser. Registra il router
elementi una volta; assegnare target di percorso come proprietà quando contengono parametri, valori di query o hash:

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from '@mission-platform/forge-router-web-components/runtime';

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory('/'),
  routes: [
    { path: '/', redirect: '/docs/intro' },
    { path: '/docs/*', name: 'doc', component: () => document.createTextNode('Docs') },
  ],
});
setForgeRouter(router);

const outlet = document.querySelector('forge-router-outlet');
outlet?.setRouter(router);
```

## Personalizzazione dei token di progettazione

Mission Platform utilizza le proprietà personalizzate CSS (variabili) per i token di progettazione. Puoi sovrascrivere questi token a livello globale nel foglio di stile root della tua applicazione.

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
