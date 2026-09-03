# Vue 2 bis Vue 3 Migrationshandbuch

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/migration-guides/vue2-to-vue3.md: [docs/migration-guides/vue2-to-vue3.md](../../../migration-guides/vue2-to-vue3.md)
> Sprache: Deutsch (de)

In dieser Anleitung wird beschrieben, wie Sie vorhandene Vue 2-Codebasen zu Vue 3 innerhalb des Mission Platform Monorepo migrieren.

## Überblick

Die Mission Platform verwendet Vue 3 mit der Composition API und der `<script setup>`-Syntax. Migration bedeutet Wegziehen
über die Options-API und Aktualisierung des Komponentenlebenszyklus und der Reaktivitätsmuster.

## Voraussetzungen

Stellen Sie vor der Migration sicher, dass Ihr Paket den Abhängigkeitsregeln der Plattform entspricht:

- Keine Importe aus `apps/`.
– Die gesamte gemeinsame Logik sollte sich in `packages/` befinden.
- Die Konfiguration sollte von `packages/tooling/configs/` stammen.

## Schritt 1: Build-Konfiguration aktualisieren

Stellen Sie sicher, dass Ihre `package.json` und `vite.config.ts` auf Vue 3 ausgerichtet sind.

```ts
// vite.config.ts
import { defineAppConfig } from '@mission-platform/vite-config';
import { defineConfig } from 'vite';

export default defineConfig(defineAppConfig({
  // Vue 3 plugin is already included in defineAppConfig
}));
```

## Schritt 2: Konvertieren Sie die Options-API in die Composition-API

Ersetzen Sie die Vue 2 Options-API (`data`, `methods`, `computed`) durch die Vue 3 Composition API.

### Daten zu Refs

In Vue 2 wurde der Status in der Funktion `data()` definiert. Verwenden Sie in Vue 3 `ref()` oder `reactive()`.

**Vue 2:**

```js
export default {
  data() {
    return {
      count: 0
    }
  }
}
```

**Vue 3:**

```ts
import { ref } from 'vue';

const count = ref(0);
```

### Methoden zu Funktionen

Methoden werden im `<script setup>`-Block zu einfachen Funktionen.

**Vue 2:**

```js
methods: {
  increment() {
    this.count++;
  }
}
```

**Vue 3:**

```ts
const increment = () => {
  count.value++;
};
```

## Schritt 3: Lebenszyklus-Hooks aktualisieren

Lifecycle-Hooks wurden umbenannt und müssen importiert werden.

| Vue 2 | Vue 3 |
|:---------------------------|:------------------------------------------|
| `beforeCreate` / `created` | Verwenden Sie `setup()` / `<script setup>` direkt |
| `beforeMount` | `onBeforeMount` |
| `mounted` | `onMounted` |
| `beforeUpdate` | `onBeforeUpdate` |
| `updated` | `onUpdated` |
| `beforeDestroy` | `onBeforeUnmount` |
| `destroyed` | `onUnmounted` |

Beispiel:

```ts
import { onMounted } from 'vue';

onMounted(() => {
  console.log('Component is mounted');
});
```

## Schritt 4: `<script setup>` übernehmen

Alle neuen und migrierten Komponenten in der Mission Platform sollten die Syntax `<script setup>` mit TypeScript verwenden.

```vue
<template>
  <button @click="increment">{{ count }}</button>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const count = ref(0);
const increment = () => count.value++;
</script>
```

## Schritt 5: Behandeln Sie wichtige Änderungen

### V-Modell

In Vue 3 ist der Standard-Requisitenname für `v-model` `modelValue` und das Ereignis ist `update:modelValue`.

### Ref-Zugriff

`this.$refs` wird nicht mehr verwendet. Definieren Sie eine Referenz mit demselben Namen wie das Attribut `ref` für das Element.

```vue
<template>
  <div ref="root"></div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const root = ref<HTMLElement | null>(null);

onMounted(() => {
  console.log(root.value);
});
</script>
```

## Schritt 6: Verifizierung

Führen Sie die folgenden Befehle aus, um sicherzustellen, dass die Migration erfolgreich ist und den Plattformstandards entspricht:

```bash
# Type-check the package
pnpm exec turbo run typecheck --filter <your-package>

# Run linting
pnpm exec turbo run lint --filter <your-package>

# Run tests
pnpm exec turbo run test --filter <your-package>
```
