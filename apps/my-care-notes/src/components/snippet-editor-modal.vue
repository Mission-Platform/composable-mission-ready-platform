<script lang="ts" setup>
  import { BaseButton, BaseModal, BaseStack } from '@mission-platform/components/vue';
  import { SchemaForm, type FormValues, type SchemaFormDefinition } from '@mission-platform/forms/vue';
  import { useI18n } from '@mission-platform/i18n/vue';
  import { computed, ref, watch } from 'vue';
  import { useRoute } from 'vue-router';

  import { useSnippets } from '../composables/use-snippets';

  import type { Snippet } from '../types';

  interface Emits {
    (event: 'close'): void;
    (event: 'save', name: string, content: string): void;
    (event: 'delete', id: string): void;
  }

  const emit = defineEmits<Emits>();

  const { t } = useI18n();

  const route = useRoute();
  const { snippets } = useSnippets();

  const visible = computed(() => route.query['overlay'] === 'snippet-new' || route.query['overlay'] === 'snippet-edit');

  const snippet = computed<Snippet | undefined>(() => {
    if (route.query['overlay'] !== 'snippet-edit') return undefined;
    const id = route.query['id'];
    if (typeof id !== 'string') return undefined;
    return snippets.value.find((s) => s.id === id);
  });

  const values = ref<FormValues>({ name: '', content: '' });

  const isEditing = computed(() => !!snippet.value);
  const modalTitle = computed(() =>
    isEditing.value
      ? t(($) => $.title.edit, { ns: 'mp.my-care-notes', defaultValue: 'Edit Snippet' })
      : t(($) => $.title.new, { ns: 'mp.my-care-notes', defaultValue: 'New Snippet' }),
  );
  const commandPreview = computed(() => {
    const name = typeof values.value['name'] === 'string' ? values.value['name'] : '';
    return `/${name.trim().replace(/\s+/g, '_') || 'my_snippet'}`;
  });

  const hintText = computed(() =>
    t(($) => $.name.hint, {
      ns: 'mp.my-care-notes',
      defaultValue: 'Type {preview} in the editor to insert this snippet',
      preview: commandPreview.value,
    }),
  );
  const labelText = computed(() => t(($) => $.name.label, { ns: 'mp.my-care-notes', defaultValue: 'Snippet name' }));
  const placeholderText = computed(() =>
    t(($) => $.name.placeholder, { ns: 'mp.my-care-notes', defaultValue: 'e.g. greeting' }),
  );
  const contentLabelText = computed(() =>
    t(($) => $.content_label, { ns: 'mp.my-care-notes', defaultValue: 'Content' }),
  );
  const deleteBtnText = computed(() => t(($) => $.btn.delete, { ns: 'mp.my-care-notes', defaultValue: 'Delete' }));
  const cancelBtnText = computed(() => t(($) => $.btn.cancel, { ns: 'mp.my-care-notes', defaultValue: 'Cancel' }));
  const saveBtnText = computed(() => t(($) => $.btn.save, { ns: 'mp.my-care-notes', defaultValue: 'Save' }));
  const schema = computed<SchemaFormDefinition>(() => ({
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: labelText.value,
        minLength: 1,
        ui: { hint: hintText.value, placeholder: placeholderText.value },
      },
      content: {
        type: 'string',
        title: contentLabelText.value,
        ui: {
          widget: 'code',
          language: 'markdown',
          height: '280px',
          lineNumbers: true,
          minimap: false,
          spellCheck: true,
          wordWrap: true,
        },
      },
    },
    required: ['name'],
  }));

  watch(
    snippet,
    (s) => {
      values.value = { name: s?.name ?? '', content: s?.content ?? '' };
    },
    { immediate: true },
  );

  watch(visible, (v) => {
    if (v && !snippet.value) {
      values.value = { name: '', content: '' };
    }
  });

  function onSave(nextValues: FormValues, isValid: boolean): void {
    const name = typeof nextValues['name'] === 'string' ? nextValues['name'] : '';
    const content = typeof nextValues['content'] === 'string' ? nextValues['content'] : '';
    const trimmedName = name.trim().replace(/\s+/g, '_');
    if (!isValid || !trimmedName) return;
    emit('save', trimmedName, content);
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
    @update:open="(v: boolean) => !v && emit('close')"
  >
    <SchemaForm
      :model-value="values"
      :schema="schema"
      @submit="onSave"
      @update:model-value="values = $event"
    >
      <template #actions>
        <BaseStack
          align="center"
          class="snippet-modal-footer"
          direction="horizontal"
          justify="between"
        >
          <BaseButton
            v-if="isEditing"
            type="button"
            variant="error"
            @click="onDelete"
          >
            {{ deleteBtnText }}
          </BaseButton>
          <BaseStack
            class="snippet-modal-footer__right"
            direction="horizontal"
            gap="xs"
          >
            <BaseButton
              type="button"
              variant="tertiary"
              @click="emit('close')"
            >
              {{ cancelBtnText }}
            </BaseButton>
            <BaseButton
              type="submit"
              variant="primary"
            >
              {{ saveBtnText }}
            </BaseButton>
          </BaseStack>
        </BaseStack>
      </template>
    </SchemaForm>
  </BaseModal>
</template>

<style lang="scss" scoped>
  .snippet-modal-footer {
    width: 100%;

    &__right {
      margin-left: auto;
    }
  }
</style>
