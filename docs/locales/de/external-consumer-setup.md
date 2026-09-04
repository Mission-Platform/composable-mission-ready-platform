# Externe Verbrauchereinrichtung

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/external-consumer-setup.md: [docs/external-consumer-setup.md](../../external-consumer-setup.md)
> Sprache: Deutsch (de)

In diesem Leitfaden wird erläutert, wie Mission Platform-Pakete in Projekten außerhalb des Hauptmonorepo genutzt werden. Der Schwerpunkt liegt auf der Verwendung von Framework-spezifischen Builds und der Verwaltung von Design-Tokens.

## Rahmenauswahl über Bedingungen

Mission Platform-Komponenten werden einmal mit `@mission-platform/forge-jsx` erstellt und als mehrere Framework-spezifische Bundles (Vue 3, React, Solid und Webkomponenten) innerhalb eines einzigen Pakets verteilt.

Um das richtige Bundle auszuwählen, müssen Sie Ihr Build-Tool und TypeScript für die Verwendung von **Benutzerdefinierten Exportbedingungen** konfigurieren.

### Unterstützte Rahmenbedingungen

| Rahmen | Exportbedingung |
| :----------------- | :----------------- |
| **Vue 3** | `mp:vue` |
| **React** | `mp:react` |
| **Solid** | `mp:solid` |
| **Webkomponenten** | `mp:web-component` |

## Projektkonfiguration

### 1. Vite-Konfiguration

Wenn Sie Vite verwenden, können Sie die Hilfsfunktionen von `@mission-platform/vite-config` verwenden, um automatisch die richtigen Auflösungsbedingungen festzulegen. Eine Framework-freie App sollte `mp:web-component` auswählen; Installieren oder konfigurieren Sie kein Vue-Plugin für dieses Ziel.

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

### 2. TypeScript-Konfiguration

Um sicherzustellen, dass der TypeScript Language Service (LSP) Typen für das richtige Framework auflöst, sollten Sie eine Framework-Voreinstellung von `@mission-platform/typescript-config` erweitern.

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

Das neutrale Router-Paket weist keine Framework- oder Router-Bibliotheks-Laufzeitabhängigkeiten auf. Installieren Sie den von ausgewählten nativen Router
Ihre Anwendung und das passende Forge-Ziel (`@mission-platform/forge-router-vue`, `-react`, `-solid`, `-svelte`,
`-redwood` oder `-web-components`). Die Anwendung besitzt Routendefinitionen, Anbieter, Wächter, Lader und den nativen
Router-Instanz; Wiederverwendbare Pakete importieren nur Funktionen von `@mission-platform/router`.

## Komponentenverwendung

Wenn die Bedingungen korrekt konfiguriert sind, können Sie Komponenten aus dem Stammverzeichnis des Pakets importieren. Das Build-Tool wählt automatisch das Bundle aus, das Ihrer `mp:*`-Bedingung entspricht.

```vue
<script setup lang="ts">
import { ForgeButton } from "@mission-platform/components";
</script>

<template>
  <ForgeButton variant="primary">Click Me</ForgeButton>
</template>
```

### Framework-freies Routing

Verwenden Sie den Speicherverlauf für Tests und Vorrendern oder lassen Sie `history` in einem Browser weg, um den Browserverlauf zu verwenden. Router registrieren
Elemente einmal; Weisen Sie Routenziele als Eigenschaften zu, wenn sie Parameter, Abfragewerte oder Hashes enthalten:

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

### Asynchrone Navigation mit einem Lade-Spinner

Asynchrone Routenkomponenten können die aktuelle Seite beim nächsten Aufruf sichtbar halten
Lasten. Konfigurieren Sie den Outlet-Fallback beim Erstellen des Web Components-Routers.
`forge-router-link` führt dann die SPA-Navigation mit `pushState` durch (oder ersetzen).
Verlauf, wenn `replace` aktiviert ist):

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

Die Steckdose besitzt das Lade-Overlay und entfernt das aktuell gemountete nicht
anzeigen, bis das Ziel aufgelöst wird. Es löscht die Überlagerung für erfolgreich,
Umgeleitete, abgebrochene und fehlgeschlagene Navigation. Modifizierte Klicks, Downloads,
Externe URLs und Links mit einem anderen Ziel behalten das native Browserverhalten bei.

Verwenden Sie beim Erstellen einer gemeinsam genutzten Forge-Quelle direkt die neutrale Grenze und lassen Sie sie zu
Jeder Compiler wählt seine native Implementierung aus:

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
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

Alle Mission Platform-Komponenten nutzen diese Variablen, sodass Änderungen auf der `:root`-Ebene über die gesamte Benutzeroberfläche verbreitet werden.
