# Externe Verbrauchereinrichtung

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/external-consumer-setup.md: [docs/external-consumer-setup.md](../../external-consumer-setup.md)
> Sprache: Deutsch (de)

In diesem Leitfaden wird erläutert, wie Mission Platform-Pakete in Projekten außerhalb des Hauptmonorepo genutzt werden. Der Schwerpunkt liegt auf der Verwendung von Framework-spezifischen Builds und der Verwaltung von Design-Tokens.

## Rahmenauswahl über Bedingungen

Mission Platform-Komponenten werden einmalig erstellt `@mission-platform/forge` und als mehrere Framework-spezifische Bundles verteilt (Vue 3, React, Solidund Webkomponenten) in einem einzigen Paket.

Um das richtige Bundle auszuwählen, müssen Sie Ihr Build-Tool konfigurieren und TypeScript um **Benutzerdefinierte Exportbedingungen** zu verwenden.

### Unterstützte Rahmenbedingungen

| Rahmen | Exportbedingung |
| :--- | :--- |
| **Vue 3** | `mp:vue` |
| **React** | `mp:react` |
| **Solid** | `mp:solid` |
| **Webkomponenten** | `mp:web-component` |

## Projektkonfiguration

### 1. Vite Konfiguration

Wenn Sie verwenden Vitekönnen Sie die Hilfsfunktionen von verwenden `@mission-platform/vite-config` um automatisch die richtigen Auflösungsbedingungen festzulegen. Eine Framework-freie App sollte ausgewählt werden `mp:web-component`; Installieren oder konfigurieren Sie nicht a Vue Plugin für dieses Ziel.

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

### 2. TypeScript Konfiguration

Um sicherzustellen, dass TypeScript Language Service (LSP) löst Typen für das richtige Framework auf. Sie sollten eine Framework-Voreinstellung erweitern `@mission-platform/typescript-config`.

```json
{
  "extends": "@mission-platform/typescript-config/framework-web-component",
  "compilerOptions": {
    "customConditions": ["mp:web-component"]
  }
}
```

## Paketinstallation

Installieren Sie die erforderlichen Pakete aus Ihrer Registrierung:

```bash
pnpm add @mission-platform/components @mission-platform/tokens @mission-platform/router @mission-platform/forge-router-web-components
```

### Peer-Abhängigkeiten

Die meisten Mission Platform-Pakete externalisieren ihre Laufzeitabhängigkeiten. Stellen Sie sicher, dass in Ihrem Projekt das entsprechende Framework und die gemeinsam genutzten Bibliotheken installiert sind:

```bash
# Example for a Vue 3 project
pnpm add @mission-platform/i18n
```

Das neutrale Router-Paket weist keine Framework- oder Router-Bibliothek-Laufzeitabhängigkeiten auf. Installieren Sie den von ausgewählten nativen Router
Ihre Anwendung und das passende Forge-Ziel (`@mission-platform/forge-router-vue`, `-react`, `-solid`, `-svelte`,
`-redwood`, oder `-web-components`). Die Anwendung besitzt Routendefinitionen, Anbieter, Wächter, Lader und den nativen
Router-Instanz; Wiederverwendbare Pakete importieren nur Funktionen von `@mission-platform/router`.

## Komponentenverwendung

Wenn die Bedingungen korrekt konfiguriert sind, können Sie Komponenten aus dem Stammverzeichnis des Pakets importieren. Das Build-Tool wählt automatisch das zu Ihnen passende Bundle aus `mp:*` Zustand.

```vue
<script setup lang="ts">
import { ForgeButton } from '@mission-platform/components';
</script>

<template>
  <ForgeButton variant="primary">Click Me</ForgeButton>
</template>
```

### Framework-freies Routing

Verwenden Sie den Speicherverlauf für Tests und Vorrendern oder lassen Sie ihn weg `history` in einem Browser, um den Browserverlauf zu verwenden. Router registrieren
Elemente einmal; Weisen Sie Routenziele als Eigenschaften zu, wenn sie Parameter, Abfragewerte oder Hashes enthalten:

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

## Design-Token-Anpassung

Mission Platform verwendet benutzerdefinierte CSS-Eigenschaften (Variablen) für Design-Tokens. Sie können diese Token global im Root-Stylesheet Ihrer Anwendung überschreiben.

```css
/* App.css */
:root {
  /* Override the brand primary color */
  --mp-color-brand-primary: #007bff;
  
  /* Override a spacing token */
  --mp-spacing-md: 1.5rem;
}
```

Alle Mission Platform-Komponenten verbrauchen diese Variablen, also Änderungen an der `:root` Die Ebene wird über die gesamte Benutzeroberfläche verteilt.
