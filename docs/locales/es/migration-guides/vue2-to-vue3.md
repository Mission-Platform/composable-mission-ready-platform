# Vue 2 a Vue 3 Guía de migración

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> Fuente en inglés: [docs/migration-guides/vue2-to-vue3.md](../../../migration-guides/vue2-to-vue3.md)
> Idioma: Español (es)

Esta guía describe cómo migrar archivos existentes Vue 2 bases de código para Vue 3 dentro del monorepo Mission Platform.

## Descripción general

La Plataforma de la Misión utiliza Vue 3 con la API de composición y `<script setup>` sintaxis. Migrar implica alejarse
desde la API de opciones y actualizando el ciclo de vida de los componentes y los patrones de reactividad.

## Requisitos previos

Antes de migrar, asegúrese de que su paquete siga las reglas de dependencia de la plataforma:

- No hay importaciones de `apps/`.
- Toda la lógica compartida debe residir en `packages/`.
- La configuración debe provenir de `configs/`.

## Paso 1: actualizar la configuración de compilación

Asegure su `package.json` y `vite.config.ts` están apuntando Vue 3.

```ts
// vite.config.ts
import { defineAppConfig } from '@mission-platform/vite-config';
import { defineConfig } from 'vite';

export default defineConfig(defineAppConfig({
  // Vue 3 plugin is already included in defineAppConfig
}));
```

## Paso 2: Convertir API de opciones en API de composición

Reemplace el Vue API de 2 opciones (`data`, `methods`, `computed`) con el Vue 3 API de composición.

### Datos a referencias

En Vue 2, el estado se definió en el `data()` función. En Vue 3, uso `ref()` o `reactive()`.

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

### Métodos de funciones

Los métodos se convierten en funciones simples en el `<script setup>` bloquear.

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

## Paso 3: actualice los ganchos del ciclo de vida

Se ha cambiado el nombre de los ganchos del ciclo de vida y se deben importar.

| Vue 2                      | Vue 3                                     |
|:---------------------------|:------------------------------------------|
| `beforeCreate` / `created` | Usar `setup()` / `<script setup>` directamente |
| `beforeMount`              | `onBeforeMount`                           |
| `mounted`                  | `onMounted`                               |
| `beforeUpdate`             | `onBeforeUpdate`                          |
| `updated`                  | `onUpdated`                               |
| `beforeDestroy`            | `onBeforeUnmount`                         |
| `destroyed`                | `onUnmounted`                             |

Ejemplo:

```ts
import { onMounted } from 'vue';

onMounted(() => {
  console.log('Component is mounted');
});
```

## Paso 4: adoptar `<script setup>`

Todos los componentes nuevos y migrados en Mission Platform deben utilizar el `<script setup>` sintaxis con TypeScript.

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

## Paso 5: Manejar los cambios importantes

### modelo V

En Vue 3, el nombre de accesorio predeterminado para `v-model` es `modelValue` y el evento es `update:modelValue`.

### Acceso de referencia

`this.$refs` ya no se usa. Defina una referencia con el mismo nombre que la `ref` atributo en el elemento.

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

## Paso 6: Verificación

Ejecute los siguientes comandos para garantizar que la migración se realice correctamente y cumpla con los estándares de la plataforma:

```bash
# Type-check the package
pnpm exec turbo run typecheck --filter <your-package>

# Run linting
pnpm exec turbo run lint --filter <your-package>

# Run tests
pnpm exec turbo run test --filter <your-package>
```
