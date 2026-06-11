<script lang="ts" setup>
  import { BaseButton, BaseInput, BaseModal } from '@mission-platform/components';
  import { BaseMonacoEditor } from '@mission-platform/components/monaco';
  import { useI18n } from '@mission-platform/i18n';
  import { computed, ref, watch } from 'vue';
  import { useRoute } from 'vue-router';

  import { useMonacoTheme } from '../composables/use-monaco-theme';
  import { useSnippets } from '../composables/use-snippets';

  import type { Snippet } from '../types';

  interface Emits {
    (event: 'close'): void;
    (event: 'save', name: string, content: string): void;
    (event: 'delete', id: string): void;
  }

  const emit = defineEmits<Emits>();

  const { t } = useI18n({ useScope: 'local' });

  const route = useRoute();
  const { snippets } = useSnippets();

  const visible = computed(() => route.query['overlay'] === 'snippet-new' || route.query['overlay'] === 'snippet-edit');

  const snippet = computed<Snippet | undefined>(() => {
    if (route.query['overlay'] !== 'snippet-edit') return undefined;
    const id = route.query['id'];
    if (typeof id !== 'string') return undefined;
    return snippets.value.find((s) => s.id === id);
  });

  const name = ref('');
  const content = ref('');

  const { monacoTheme } = useMonacoTheme();

  const isEditing = computed(() => !!snippet.value);
  const modalTitle = computed(() => (isEditing.value ? t('title.edit') : t('title.new')));
  const commandPreview = computed(() => `/${name.value.trim().replace(/\s+/g, '_') || 'my_snippet'}`);

  watch(
    snippet,
    (s) => {
      name.value = s?.name ?? '';
      content.value = s?.content ?? '';
    },
    { immediate: true },
  );

  watch(visible, (v) => {
    if (v && !snippet.value) {
      name.value = '';
      content.value = '';
    }
  });

  function onSave(): void {
    const trimmedName = name.value.trim().replace(/\s+/g, '_');
    if (!trimmedName) return;
    emit('save', trimmedName, content.value);
  }

  function onDelete(): void {
    if (snippet.value) {
      emit('delete', snippet.value.id);
    }
  }
</script>

<template>
  <BaseModal
    :open="visible"
    :title="modalTitle"
    size="lg"
    @close="emit('close')"
    @update:open="(v) => !v && emit('close')"
  >
    <div class="snippet-form">
      <BaseInput
        id="snippet-name"
        v-model="name"
        :hint="t('name.hint', { preview: commandPreview })"
        autocomplete="off"
        :label="t('name.label')"
        :placeholder="t('name.placeholder')"
      />

      <div class="snippet-editor">
        <p
          id="snippet-content-label"
          class="snippet-editor__label"
        >
          {{ t('content-label') }}
        </p>
        <BaseMonacoEditor
          id="snippet-content"
          v-model="content"
          :line-numbers="true"
          :minimap="false"
          :spell-check="true"
          :theme="monacoTheme"
          :word-wrap="true"
          aria-labelledby="snippet-content-label"
          height="280px"
          language="markdown"
        />
      </div>
    </div>

    <template #footer>
      <div class="snippet-modal-footer">
        <BaseButton
          v-if="isEditing"
          variant="error"
          @click="onDelete"
        >
          {{ t('btn.delete') }}
        </BaseButton>
        <div class="snippet-modal-footer__right">
          <BaseButton
            variant="tertiary"
            @click="emit('close')"
          >
            {{ t('btn.cancel') }}
          </BaseButton>
          <BaseButton
            :disabled="!name.trim()"
            variant="primary"
            @click="onSave"
          >
            {{ t('btn.save') }}
          </BaseButton>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<style lang="scss" scoped>
  .snippet-form {
    display: flex;
    flex-direction: column;
    gap: var(--mp-space-4, 16px);
    padding: var(--mp-space-2, 8px) 0;
  }

  .snippet-editor {
    display: flex;
    flex-direction: column;
    gap: var(--mp-space-1, 4px);

    &__label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--mp-color-text-primary);
    }
  }

  .snippet-modal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;

    &__right {
      display: flex;
      gap: var(--mp-space-2, 8px);
      margin-left: auto;
    }
  }
</style>

<i18n lang="yaml">
en:
  title:
    new: New Snippet
    edit: Edit Snippet
  name:
    label: Snippet name
    placeholder: 'e.g. greeting'
    hint: 'Used as {preview} in the editor'
  content-label: Content
  btn:
    delete: Delete
    cancel: Cancel
    save: Save
</i18n>
