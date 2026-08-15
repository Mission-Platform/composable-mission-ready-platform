# Externe Verbrauchereinrichtung

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> Englische Quelle: [docs/external-consumer-setup.md](../../external-consumer-setup.md)
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

Wenn Sie verwenden Vitekönnen Sie die Hilfsfunktionen von verwenden `@mission-platform/vite-config` um automatisch die richtigen Auflösungsbedingungen festzulegen.

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

### 2. TypeScript Konfiguration

Um sicherzustellen, dass TypeScript Language Service (LSP) löst Typen für das richtige Framework auf. Sie sollten eine Framework-Voreinstellung erweitern `@mission-platform/typescript-config`.

```json
{
  "extends": "@mission-platform/typescript-config/framework-vue",
  "compilerOptions": {
    "customConditions": ["mp:vue"]
  }
}
```

## Paketinstallation

Installieren Sie die erforderlichen Pakete aus Ihrer Registrierung:

```bash
pnpm add @mission-platform/components @mission-platform/tokens
```

### Peer-Abhängigkeiten

Die meisten Mission Platform-Pakete externalisieren ihre Laufzeitabhängigkeiten. Stellen Sie sicher, dass in Ihrem Projekt das entsprechende Framework und die gemeinsam genutzten Bibliotheken installiert sind:

```bash
# Example for a Vue 3 project
pnpm add vue vue-router @mission-platform/i18n
```

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
