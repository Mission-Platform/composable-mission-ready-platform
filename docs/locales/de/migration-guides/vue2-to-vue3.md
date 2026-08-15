# Vue 2 bis Vue 3 Migrationsleitfaden

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> Englische Quelle: [docs/migration-guides/vue2-to-vue3.md](../../../migration-guides/vue2-to-vue3.md)
> Sprache: Deutsch (de)

In dieser Anleitung wird beschrieben, wie Sie bestehende migrieren Vue 2 Codebasen zu Vue 3 innerhalb des Mission Platform Monorepo.

## Überblick

Die Missionsplattform nutzt Vue 3 mit der Composition API und `<script setup>` Syntax. Migration bedeutet Wegziehen
über die Options-API und Aktualisierung des Komponentenlebenszyklus und der Reaktivitätsmuster.

## Voraussetzungen

Stellen Sie vor der Migration sicher, dass Ihr Paket den Abhängigkeitsregeln der Plattform entspricht:

- Keine Importe aus `apps/`.
- Die gesamte gemeinsame Logik sollte sich darin befinden `packages/`.
- Die Konfiguration sollte von stammen `configs/`.

## Schritt 1: Build-Konfiguration aktualisieren

Stellen Sie sicher, dass Ihre `package.json` Und `vite.config.ts` zielen darauf ab Vue 3.

```ts
// vite.config.ts
import { defineAppConfig } from '@mission-platform/vite-config';
import { defineConfig } from 'vite';

export default defineConfig(defineAppConfig({
  // Vue 3 plugin is already included in defineAppConfig
}));
```

## Schritt 2: Konvertieren Sie die Options-API in die Composition-API

Ersetzen Sie die Vue 2 Optionen API (`data`, `methods`, `computed`) mit dem Vue 3 Kompositions-API.

### Daten zu Refs

In Vue 2, Zustand wurde in der definiert `data()` Funktion. In Vue 3, verwenden `ref()` oder `reactive()`.

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

Methoden werden zu einfachen Funktionen im `<script setup>` Block.

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

| Vue 2                      | Vue 3                                     |
|:---------------------------|:------------------------------------------|
| `beforeCreate` / `created` | Verwenden `setup()` / `<script setup>` direkt |
| `beforeMount`              | `onBeforeMount`                           |
| `mounted`                  | `onMounted`                               |
| `beforeUpdate`             | `onBeforeUpdate`                          |
| `updated`                  | `onUpdated`                               |
| `beforeDestroy`            | `onBeforeUnmount`                         |
| `destroyed`                | `onUnmounted`                             |

Beispiel:

```ts
import { onMounted } from 'vue';

onMounted(() => {
  console.log('Component is mounted');
});
```

## Schritt 4: Adoptieren `<script setup>`

Alle neuen und migrierten Komponenten in der Mission Platform sollten das verwenden `<script setup>` Syntax mit TypeScript.

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

In Vue 3, der Standard-Requisitenname für `v-model` Ist `modelValue` und das Ereignis ist `update:modelValue`.

### Ref-Zugriff

`this.$refs` wird nicht mehr verwendet. Definieren Sie eine Referenz mit demselben Namen wie die `ref` Attribut für das Element.

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
