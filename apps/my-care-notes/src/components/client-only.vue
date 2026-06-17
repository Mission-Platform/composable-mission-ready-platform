<script lang="ts" setup>
  import { onMounted, ref } from 'vue';

  /**
   * Renders its default slot only on the client, after the component has
   * mounted. During SSR/SSG prerendering (and the initial client render that
   * hydrates that prerendered HTML) the slot is skipped, so browser-only
   * children — e.g. the Monaco-backed editor, which transitively imports
   * `monaco-editor` and its `?worker` entries — are never evaluated on the
   * server and never cause a hydration mismatch. The `mounted` flag flips in
   * `onMounted` (client-only), and the slot is patched in afterwards.
   */
  defineOptions({ name: 'ClientOnly' });

  const mounted = ref(false);

  onMounted(() => {
    mounted.value = true;
  });
</script>

<template>
  <slot v-if="mounted" />
</template>
