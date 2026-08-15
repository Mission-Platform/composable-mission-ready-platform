# Vue 2 a Vue 3 Guida alla migrazione

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> Fonte inglese: [docs/migration-guides/vue2-to-vue3.md](../../../migration-guides/vue2-to-vue3.md)
> Lingua: Italiano (it)

Questa guida descrive come eseguire la migrazione dei file esistenti Vue 2 basi di codice a Vue 3 all'interno del monorepo Mission Platform.

## Panoramica

La piattaforma di missione utilizza Vue 3 con l'API di composizione e `<script setup>` sintassi. La migrazione comporta l’allontanamento
dall'API delle opzioni e aggiornando il ciclo di vita dei componenti e i modelli di reattività.

## Prerequisiti

Prima della migrazione, assicurati che il tuo pacchetto segua le regole di dipendenza della piattaforma:

- Nessuna importazione da `apps/`.
- Tutta la logica condivisa dovrebbe risiedere in `packages/`.
- La configurazione dovrebbe provenire da `configs/`.

## Passaggio 1: aggiorna la configurazione della build

Assicurati che il tuo `package.json` E `vite.config.ts` stanno prendendo di mira Vue 3.

```ts
// vite.config.ts
import { defineAppConfig } from '@mission-platform/vite-config';
import { defineConfig } from 'vite';

export default defineConfig(defineAppConfig({
  // Vue 3 plugin is already included in defineAppConfig
}));
```

## Passaggio 2: converti l'API delle opzioni nell'API di composizione

Sostituisci il Vue 2 Opzioni API (`data`, `methods`, `computed`) con il Vue 3 API di composizione.

### Dati ai rif

In Vue 2, lo stato è stato definito nell'art `data()` funzione. In Vue 3, utilizzare `ref()` O `reactive()`.

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

### Metodi per le funzioni

I metodi diventano semplici funzioni nel file `<script setup>` bloccare.

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

## Passaggio 3: aggiornamento degli hook del ciclo di vita

Gli hook del ciclo di vita sono stati rinominati e devono essere importati.

| Vue 2                      | Vue 3                                     |
|:---------------------------|:------------------------------------------|
| `beforeCreate` / `created` | Utilizzo `setup()` / `<script setup>` direttamente |
| `beforeMount`              | `onBeforeMount`                           |
| `mounted`                  | `onMounted`                               |
| `beforeUpdate`             | `onBeforeUpdate`                          |
| `updated`                  | `onUpdated`                               |
| `beforeDestroy`            | `onBeforeUnmount`                         |
| `destroyed`                | `onUnmounted`                             |

Esempio:

```ts
import { onMounted } from 'vue';

onMounted(() => {
  console.log('Component is mounted');
});
```

## Passaggio 4: adotta `<script setup>`

Tutti i componenti nuovi e migrati nella Mission Platform dovrebbero utilizzare il file `<script setup>` sintassi con TypeScript.

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

## Passaggio 5: gestire le modifiche importanti

### Modello V

In Vue 3, il nome dell'elica predefinita per `v-model` È `modelValue` e l'evento è `update:modelValue`.

### Accesso rif

`this.$refs` non è più utilizzato. Definire un riferimento con lo stesso nome del file `ref` attributo sull'elemento.

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

## Passaggio 6: verifica

Esegui i seguenti comandi per assicurarti che la migrazione abbia esito positivo e rispetti gli standard della piattaforma:

```bash
# Type-check the package
pnpm exec turbo run typecheck --filter <your-package>

# Run linting
pnpm exec turbo run lint --filter <your-package>

# Run tests
pnpm exec turbo run test --filter <your-package>
```
