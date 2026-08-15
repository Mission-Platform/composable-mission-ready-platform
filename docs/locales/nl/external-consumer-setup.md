# Externe consumentenconfiguratie

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> Engelse bron: [docs/external-consumer-setup.md](../../external-consumer-setup.md)
> Taal: Nederlands (nl)

In deze handleiding wordt uitgelegd hoe u Mission Platform-pakketten kunt gebruiken in projecten die zich buiten de hoofdmonorepo bevinden. Het richt zich op het gebruik van raamwerkspecifieke builds en het beheren van ontwerptokens.

## Kaderselectie via voorwaarden

Mission Platform-componenten worden eenmaal gebruikt `@mission-platform/forge` en gedistribueerd als meerdere raamwerkspecifieke bundels (Vue 3, React, Soliden webcomponenten) binnen één pakket.

Om de juiste bundel te selecteren, moet u uw buildtool configureren en TypeScript om **Aangepaste exportvoorwaarden** te gebruiken.

### Ondersteunde raamvoorwaarden

| Kader | Exportvoorwaarde |
| :--- | :--- |
| **Vue 3** | `mp:vue` |
| **React** | `mp:react` |
| **Solid** | `mp:solid` |
| **Webcomponenten** | `mp:web-component` |

## Projectconfiguratie

### 1. Vite Configuratie

Als u gebruikt Vite, kunt u de helpfuncties van gebruiken `@mission-platform/vite-config` om automatisch de juiste oplossingsvoorwaarden in te stellen.

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

### 2. TypeScript Configuratie

Om ervoor te zorgen dat de TypeScript Language Service (LSP) lost typen op voor het juiste raamwerk, u moet een raamwerkvoorinstelling uitbreiden `@mission-platform/typescript-config`.

```json
{
  "extends": "@mission-platform/typescript-config/framework-vue",
  "compilerOptions": {
    "customConditions": ["mp:vue"]
  }
}
```

## Pakket installatie

Installeer de vereiste pakketten vanuit uw register:

```bash
pnpm add @mission-platform/components @mission-platform/tokens
```

### Afhankelijkheden van leeftijdsgenoten

De meeste Mission Platform-pakketten externaliseren hun runtime-afhankelijkheden. Zorg ervoor dat u het bijbehorende raamwerk en de gedeelde bibliotheken in uw project hebt geïnstalleerd:

```bash
# Example for a Vue 3 project
pnpm add vue vue-router @mission-platform/i18n
```

## Componentgebruik

Als de voorwaarden correct zijn geconfigureerd, kunt u componenten importeren vanuit de hoofdmap van het pakket. De bouwtool selecteert automatisch de bundel die bij uw past `mp:*` voorwaarde.

```vue
<script setup lang="ts">
import { ForgeButton } from '@mission-platform/components';
</script>

<template>
  <ForgeButton variant="primary">Click Me</ForgeButton>
</template>
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

Alle Mission Platform-componenten gebruiken deze variabelen, dus veranderingen aan de `:root` niveau zal zich door de gehele gebruikersinterface verspreiden.
