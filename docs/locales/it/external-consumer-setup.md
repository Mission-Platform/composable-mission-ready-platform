# Configurazione del consumatore esterno

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/external-consumer-setup.md: [docs/external-consumer-setup.md](../../external-consumer-setup.md)
> Lingua: Italiano (it)

Questa guida spiega come utilizzare i pacchetti Mission Platform in progetti situati al di fuori del monorepo principale. Si concentra sull'utilizzo di build specifiche del framework e sulla gestione dei token di progettazione.

## Selezione del quadro tramite condizioni

I componenti Mission Platform vengono creati una volta utilizzando `@mission-platform/forge` e distribuiti come più bundle specifici del framework (Vue 3, React, Solid e componenti Web) all'interno di un singolo pacchetto.

Per selezionare il pacchetto corretto, è necessario configurare lo strumento di creazione e TypeScript per utilizzare le **Condizioni di esportazione personalizzate**.

### Condizioni quadro supportate

| Quadro | Condizione di esportazione |
| :----------------- | :----------------- |
| **Vue 3** | `mp:vue` |
| **React** | `mp:react` |
| **Solid** | `mp:solid` |
| **Componenti Web** | `mp:web-component` |

## Configurazione del progetto

### 1. Configurazione Vite

Se si utilizza Vite, è possibile utilizzare le funzioni di supporto di `@mission-platform/vite-config` per impostare automaticamente le condizioni di risoluzione corrette. Un'app senza framework dovrebbe selezionare `mp:web-component`; non installare o configurare un plugin Vue per quella destinazione.

```ts
import { defineConfig } from "vite";
import { frameworkResolveConditions } from "@mission-platform/vite-config";

export default defineConfig({
  resolve: {
    // This places the Web Components build at the top of the condition list.
    conditions: frameworkResolveConditions("web-component"),
  },
});
```

### 2. Configurazione TypeScript

Per garantire che TypeScript Language Service (LSP) risolva i tipi per il framework corretto, è necessario estendere una preimpostazione del framework da `@mission-platform/typescript-config`.

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
l'applicazione e il target Forge corrispondente (`@mission-platform/forge-router-vue`, `-react`, `-solid`, `-svelte`,
`-redwood` o `-web-components`). L'applicazione possiede definizioni di percorso, fornitori, guardie, caricatori e file nativi
istanza del router; i pacchetti riutilizzabili importano solo funzionalità da `@mission-platform/router`.

## Utilizzo dei componenti

Con le condizioni configurate correttamente, è possibile importare i componenti dalla radice del pacchetto. Lo strumento di creazione selezionerà automaticamente il pacchetto corrispondente alla condizione `mp:*`.

```vue
<script setup lang="ts">
import { ForgeButton } from "@mission-platform/components";
</script>

<template>
  <ForgeButton variant="primary">Click Me</ForgeButton>
</template>
```

### Routing senza framework

Utilizza la cronologia della memoria per test e prerendering oppure ometti `history` in un browser per utilizzare la cronologia del browser. Registra il router
elementi una volta; assegnare target di percorso come proprietà quando contengono parametri, valori di query o hash:

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from "@mission-platform/forge-router-web-components/runtime";

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/"),
  routes: [
    { path: "/", redirect: "/docs/intro" },
    {
      path: "/docs/*",
      name: "doc",
      component: () => document.createTextNode("Docs"),
    },
  ],
});
setForgeRouter(router);

const outlet = document.querySelector("forge-router-outlet");
outlet?.setRouter(router);
```

### Navigazione asincrona con uno spinner di caricamento

I componenti del percorso asincrono possono mantenere visibile la pagina corrente durante la visualizzazione successiva
carichi. Configurare il fallback della presa durante la creazione del router Web Components;
`forge-router-link` esegue quindi la navigazione SPA con `pushState` (o sostituisce
cronologia quando `replace` è abilitato):

```ts
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/docs/intro"),
  loadingFallback: () => {
    const spinner = document.createElement("span");
    spinner.className = "docs-loading-spinner";
    spinner.setAttribute("aria-label", "Loading documentation");
    return spinner;
  },
  routes: [
    {
      path: "/docs/*",
      component: async () => (await import("./views/docs-view")).default(),
    },
  ],
});
setForgeRouter(router);
document.querySelector("forge-router-outlet")?.setRouter(router);
```

```html
<forge-router-link to="/docs/advanced"
  >Advanced documentation</forge-router-link
>
<forge-router-outlet></forge-router-outlet>
```

La presa possiede la sovrapposizione di caricamento e non rimuove quella attualmente montata
visualizzare finché la destinazione non viene risolta. Cancella la sovrapposizione per successo,
navigazione reindirizzata, annullata e non riuscita. Clic, download modificati
gli URL esterni e i collegamenti con un'altra destinazione mantengono il comportamento nativo del browser.

Quando crei un sorgente Forge condiviso, usa direttamente il confine neutro e lascia
ogni compilatore seleziona la sua implementazione nativa:

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
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

Tutti i componenti di Mission Platform utilizzano queste variabili, quindi le modifiche a livello `:root` si propagheranno all'intera interfaccia utente.
