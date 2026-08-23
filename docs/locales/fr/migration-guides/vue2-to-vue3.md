# Guide de migration de Vue 2 vers Vue 3

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/migration-guides/vue2-to-vue3.md: [docs/migration-guides/vue2-to-vue3.md](../../../migration-guides/vue2-to-vue3.md)
> Langue: Français (fr)

Ce guide décrit comment migrer les bases de code Vue 2 existantes vers Vue 3 dans le monorepo Mission Platform.

## Aperçu

La plateforme de mission utilise Vue 3 avec l'API de composition et la syntaxe `<script setup>`. La migration implique de s'éloigner
à partir de l'API Options et mettre à jour les modèles de cycle de vie et de réactivité des composants.

## Conditions préalables

Avant de migrer, assurez-vous que votre package respecte les règles de dépendance de la plateforme :

- Aucune importation depuis `apps/`.
- Toute la logique partagée doit résider dans `packages/`.
- La configuration doit provenir de `configs/`.

## Étape 1 : Mettre à jour la configuration de la build

Assurez-vous que vos `package.json` et `vite.config.ts` ciblent Vue 3.

```ts
// vite.config.ts
import { defineAppConfig } from '@mission-platform/vite-config';
import { defineConfig } from 'vite';

export default defineConfig(defineAppConfig({
  // Vue 3 plugin is already included in defineAppConfig
}));
```

## Étape 2 : Convertir l'API d'options en API de composition

Remplacez l'API d'options Vue 2 (`data`, `methods`, `computed`) par l'API de composition Vue 3.

### Données vers les références

Dans Vue 2, l'état a été défini dans la fonction `data()`. Dans Vue 3, utilisez `ref()` ou `reactive()`.

**Vue 2 :**

```js
export default {
  data() {
    return {
      count: 0
    }
  }
}
```

**Vue 3 :**

```ts
import { ref } from 'vue';

const count = ref(0);
```

### Méthodes vers les fonctions

Les méthodes deviennent de simples fonctions dans le bloc `<script setup>`.

**Vue 2 :**

```js
methods: {
  increment() {
    this.count++;
  }
}
```

**Vue 3 :**

```ts
const increment = () => {
  count.value++;
};
```

## Étape 3 : mettre à jour les hooks de cycle de vie

Les hooks de cycle de vie ont été renommés et doivent être importés.

| Vue 2 | Vue 3 |
|:---------------------------|:------------------------------------------|
| `beforeCreate` / `created` | Utiliser directement `setup()` / `<script setup>` |
| `beforeMount` | `onBeforeMount` |
| `mounted` | `onMounted` |
| `beforeUpdate` | `onBeforeUpdate` |
| `updated` | `onUpdated` |
| `beforeDestroy` | `onBeforeUnmount` |
| `destroyed` | `onUnmounted` |

Exemple:

```ts
import { onMounted } from 'vue';

onMounted(() => {
  console.log('Component is mounted');
});
```

## Étape 4 : Adoptez `<script setup>`

Tous les composants nouveaux et migrés de Mission Platform doivent utiliser la syntaxe `<script setup>` avec TypeScript.

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

Dans Vue 3, le nom de prop par défaut pour `v-model` est `modelValue` et l'événement est `update:modelValue`.

### Accès réf

`this.$refs` n’est plus utilisé. Définissez une référence avec le même nom que l'attribut `ref` sur l'élément.

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
