# Vue 2 à Vue 3 Guide de migration

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> Source anglaise: [docs/migration-guides/vue2-to-vue3.md](../../../migration-guides/vue2-to-vue3.md)
> Langue: Français (fr)

Ce guide décrit comment migrer des Vue 2 bases de code pour Vue 3 au sein du monorepo Mission Platform.

## Aperçu

La Plateforme Mission utilise Vue 3 avec l'API Composition et `<script setup>` syntaxe. La migration implique de s'éloigner
à partir de l'API Options et mettre à jour les modèles de cycle de vie et de réactivité des composants.

## Conditions préalables

Avant de migrer, assurez-vous que votre package respecte les règles de dépendance de la plateforme :

- Aucune importation de `apps/`.
- Toute la logique partagée doit résider dans `packages/`.
- La configuration doit provenir de `configs/`.

## Étape 1 : Mettre à jour la configuration de la build

Assurez-vous que votre `package.json` et `vite.config.ts` ciblent Vue 3.

```ts
// vite.config.ts
import { defineAppConfig } from '@mission-platform/vite-config';
import { defineConfig } from 'vite';

export default defineConfig(defineAppConfig({
  // Vue 3 plugin is already included in defineAppConfig
}));
```

## Étape 2 : Convertir l'API d'options en API de composition

Remplacez le Vue 2 API d'options (`data`, `methods`, `computed`) avec le Vue 3 API de composition.

### Données vers les références

Dans Vue 2, l’État a été défini dans le `data()` fonction. Dans Vue 3, utilisez `ref()` ou `reactive()`.

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

### Méthodes vers les fonctions

Les méthodes deviennent de simples fonctions dans le `<script setup>` bloc.

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

## Étape 3 : mettre à jour les hooks de cycle de vie

Les hooks de cycle de vie ont été renommés et doivent être importés.

| Vue 2                      | Vue 3                                     |
|:---------------------------|:------------------------------------------|
| `beforeCreate` / `created` | Utiliser `setup()` / `<script setup>` directement |
| `beforeMount`              | `onBeforeMount`                           |
| `mounted`                  | `onMounted`                               |
| `beforeUpdate`             | `onBeforeUpdate`                          |
| `updated`                  | `onUpdated`                               |
| `beforeDestroy`            | `onBeforeUnmount`                         |
| `destroyed`                | `onUnmounted`                             |

Exemple:

```ts
import { onMounted } from 'vue';

onMounted(() => {
  console.log('Component is mounted');
});
```

## Étape 4 : Adopter `<script setup>`

Tous les composants nouveaux et migrés de la plateforme de mission doivent utiliser le `<script setup>` syntaxe avec TypeScript.

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

## Étape 5 : Gérer les modifications majeures

### Modèle en V

Dans Vue 3, le nom de l'accessoire par défaut pour `v-model` est `modelValue` et l'événement est `update:modelValue`.

### Accès réf

`this.$refs` n’est plus utilisé. Define a ref with the same name as the `ref` attribut sur l'élément.

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

## Étape 6 : Vérification

Exécutez les commandes suivantes pour garantir que la migration réussit et respecte les normes de la plate-forme :

```bash
# Type-check the package
pnpm exec turbo run typecheck --filter <your-package>

# Run linting
pnpm exec turbo run lint --filter <your-package>

# Run tests
pnpm exec turbo run test --filter <your-package>
```
