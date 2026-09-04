# Externe consumentenconfiguratie

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/external-consumer-setup.md: [docs/external-consumer-setup.md](../../external-consumer-setup.md)
> Taal: Nederlands (nl)

In deze handleiding wordt uitgelegd hoe u Mission Platform-pakketten kunt gebruiken in projecten die zich buiten de hoofdmonorepo bevinden. Het richt zich op het gebruik van raamwerkspecifieke builds en het beheren van ontwerptokens.

## Kaderselectie via voorwaarden

Mission Platform-componenten worden één keer geschreven met behulp van `@mission-platform/forge-jsx` en gedistribueerd als meerdere raamwerkspecifieke bundels (Vue 3, React, Solid en Web Components) binnen één pakket.

Om de juiste bundel te selecteren, moet u uw buildtool en TypeScript configureren om **Aangepaste exportvoorwaarden** te gebruiken.

### Ondersteunde raamvoorwaarden

| Kader | Exportvoorwaarde |
| :----------------- | :----------------- |
| **Vue 3** | `mp:vue` |
| **React** | `mp:react` |
| **Solid** | `mp:solid` |
| **Webcomponenten** | `mp:web-component` |

## Projectconfiguratie

### 1. Vite-configuratie

Als u Vite gebruikt, kunt u de helperfuncties van `@mission-platform/vite-config` gebruiken om automatisch de juiste oplossingsvoorwaarden in te stellen. Een framework-vrije app zou `mp:web-component` moeten selecteren; installeer of configureer geen Vue-plug-in voor dat doel.

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

### 2. TypeScript-configuratie

Om ervoor te zorgen dat de TypeScript Language Service (LSP) typen voor het juiste raamwerk omzet, moet u een raamwerkvoorinstelling van `@mission-platform/typescript-config` uitbreiden.

```json
{
  "extends": "@mission-platform/typescript-config/framework-web-component",
  "compilerOptions": {
    "customConditions": ["mp:web-component"]
  }
}
```

## Pakket installatie

Installeer de vereiste pakketten vanuit uw register:

```bash
pnpm add @mission-platform/components @mission-platform/tokens @mission-platform/router @mission-platform/forge-router-web-components
```

### Afhankelijkheden van leeftijdsgenoten

De meeste Mission Platform-pakketten externaliseren hun runtime-afhankelijkheden. Zorg ervoor dat u het bijbehorende raamwerk en de gedeelde bibliotheken in uw project hebt geïnstalleerd:

```bash
# Example for a Vue 3 project
pnpm add @mission-platform/i18n
```

Het neutrale routerpakket heeft geen runtime-afhankelijkheden van het raamwerk of de routerbibliotheek. Installeer de native router die is geselecteerd door
uw toepassing en het bijpassende Forge-doel (`@mission-platform/forge-router-vue`, `-react`, `-solid`, `-svelte`,
`-redwood` of `-web-components`). De applicatie is eigenaar van routedefinities, providers, bewakers, laders en de native
routerinstantie; herbruikbare pakketten importeren alleen mogelijkheden uit `@mission-platform/router`.

## Componentgebruik

Als de voorwaarden correct zijn geconfigureerd, kunt u componenten importeren vanuit de hoofdmap van het pakket. De buildtool selecteert automatisch de bundel die overeenkomt met uw `mp:*`-voorwaarde.

```vue
<script setup lang="ts">
import { ForgeButton } from "@mission-platform/components";
</script>

<template>
  <ForgeButton variant="primary">Click Me</ForgeButton>
</template>
```

### Framework-vrije routering

Gebruik geheugengeschiedenis voor tests en pre-rendering, of laat `history` weg in een browser om de browsergeschiedenis te gebruiken. Router registreren
elementen één keer; wijs routedoelen toe als eigenschappen wanneer ze params, querywaarden of hashes bevatten:

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

### Asynchrone navigatie met een laadspinner

Asynchrone routecomponenten kunnen de huidige pagina zichtbaar houden tijdens de volgende weergave
ladingen. Configureer de outlet-fallback bij het maken van de Web Components-router;
`forge-router-link` voert vervolgens SPA-navigatie uit met `pushState` (of vervang
geschiedenis wanneer `replace` is ingeschakeld):

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

Het stopcontact is eigenaar van de laadoverlay en verwijdert de momenteel gemonteerde niet
bekijken totdat de bestemming is opgelost. Het maakt de overlay leeg voor succesvol,
omgeleid, geannuleerd en mislukte navigatie. Gewijzigde klikken, downloads,
externe URL's en links met een ander doel behouden het oorspronkelijke browsergedrag.

Wanneer u een gedeelde Forge-bron schrijft, gebruik dan direct de neutrale grens en laat
elke compiler selecteert zijn eigen implementatie:

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

## Aanpassing van ontwerptokens

Mission Platform gebruikt CSS Custom Properties (variabelen) voor ontwerptokens. U kunt deze tokens globaal overschrijven in het hoofdstijlblad van uw toepassing.

```css
/* App.css */
:root {
  /* Override the brand primary color */
  --mp-color-brand-primary: #007bff;

  /* Override a spacing token */
  --mp-spacing-md: 1.5rem;
}
```

Alle Mission Platform-componenten gebruiken deze variabelen, dus wijzigingen op het `:root`-niveau zullen zich door de gehele gebruikersinterface verspreiden.
