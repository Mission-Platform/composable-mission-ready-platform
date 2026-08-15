# Vue 2 tot Vue 3 Migratiegids

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> Engelse bron: [docs/migration-guides/vue2-to-vue3.md](../../../migration-guides/vue2-to-vue3.md)
> Taal: Nederlands (nl)

In deze handleiding wordt beschreven hoe u bestaande Vue 2 codebases voor Vue 3 binnen de monorepo van het Mission Platform.

## Overzicht

Het Mission Platform maakt gebruik van Vue 3 met de Composition API en `<script setup>` syntaxis. Migratie houdt in dat je weggaat
vanuit de Options API en het bijwerken van de levenscyclus- en reactiviteitspatronen van componenten.

## Vereisten

Voordat u migreert, moet u ervoor zorgen dat uw pakket de afhankelijkheidsregels van het platform volgt:

- Geen import uit `apps/`.
- Alle gedeelde logica moet zich daarin bevinden `packages/`.
- Configuratie zou vandaan moeten komen `configs/`.

## Stap 1: Update de build-configuratie

Verzeker uw `package.json` En `vite.config.ts` zijn gericht Vue 3.

```ts
// vite.config.ts
import { defineAppConfig } from '@mission-platform/vite-config';
import { defineConfig } from 'vite';

export default defineConfig(defineAppConfig({
  // Vue 3 plugin is already included in defineAppConfig
}));
```

## Stap 2: Converteer Opties-API naar Composition-API

Vervang de Vue 2 Opties-API (`data`, `methods`, `computed`) met de Vue 3 Samenstelling-API.

### Gegevens naar ref

In Vue 2, staat werd gedefinieerd in de `data()` functie. In Vue 3, gebruik `ref()` of `reactive()`.

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

### Methoden voor functies

Methoden worden eenvoudige functies in de `<script setup>` blok.

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

## Stap 3: Levenscyclushaken bijwerken

Lifecycle-hooks hebben een nieuwe naam gekregen en moeten worden geïmporteerd.

| Vue 2                      | Vue 3                                     |
|:---------------------------|:------------------------------------------|
| `beforeCreate` / `created` | Gebruik `setup()` / `<script setup>` direct |
| `beforeMount`              | `onBeforeMount`                           |
| `mounted`                  | `onMounted`                               |
| `beforeUpdate`             | `onBeforeUpdate`                          |
| `updated`                  | `onUpdated`                               |
| `beforeDestroy`            | `onBeforeUnmount`                         |
| `destroyed`                | `onUnmounted`                             |

Voorbeeld:

```ts
import { onMounted } from 'vue';

onMounted(() => {
  console.log('Component is mounted');
});
```

## Stap 4: Adopteer `<script setup>`

Alle nieuwe en gemigreerde componenten in het Mission Platform moeten de `<script setup>` syntaxis met TypeScript.

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

## Stap 5: Behandel belangrijke wijzigingen

### V-model

In Vue 3, de standaard propnaam voor `v-model` is `modelValue` en het evenement is `update:modelValue`.

### Ref-toegang

`this.$refs` wordt niet meer gebruikt. Definieer een ref met dezelfde naam als de `ref` attribuut op het element.

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

## Stap 6: Verificatie

Voer de volgende opdrachten uit om ervoor te zorgen dat de migratie succesvol is en voldoet aan de platformstandaarden:

```bash
# Type-check the package
pnpm exec turbo run typecheck --filter <your-package>

# Run linting
pnpm exec turbo run lint --filter <your-package>

# Run tests
pnpm exec turbo run test --filter <your-package>
```
