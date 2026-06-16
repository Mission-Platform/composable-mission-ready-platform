<script lang="ts" setup>
  /**
   * `BaseMarkdownInput` — Markdown input component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { useI18n } from '@mission-platform/i18n';
  import {
    IconBlockquote,
    IconBold,
    IconBulletList,
    IconCodeInline,
    IconExternalLink,
    IconHeading,
    IconItalic,
    IconNumberedList,
  } from '@mission-platform/icons';
  import { marked } from 'marked';
  import { computed, ref } from 'vue';

  import { useId } from '../../composables/use-id';
  import BaseTypography from '../base-typography/base-typography.vue';

  export type MarkdownInputSize = 'sm' | 'md' | 'lg';
  export type MarkdownInputTab = 'write' | 'preview';

  const props = withDefaults(
    defineProps<{
      modelValue?: string;
      rows?: number;
      size?: MarkdownInputSize;
      placeholder?: string;
      label?: string;
      labelHidden?: boolean;
      hint?: string;
      error?: string;
      disabled?: boolean;
      readonly?: boolean;
      required?: boolean;
      id?: string;
    }>(),
    {
      modelValue: '',
      rows: 6,
      size: 'md',
      placeholder: '',
      label: undefined,
      labelHidden: false,
      hint: undefined,
      error: undefined,
      disabled: false,
      readonly: false,
      required: false,
      id: undefined,
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [value: string];
    change: [event: Event];
    blur: [event: FocusEvent];
    focus: [event: FocusEvent];
  }>();

  const { t } = useI18n({ useScope: 'local' });

  const { id: resolvedId } = useId(props.id);
  const activeTab = ref<MarkdownInputTab>('write');
  const effectiveTab = computed<MarkdownInputTab>(() =>
    props.disabled || props.readonly ? 'preview' : activeTab.value,
  );
  const textareaRef = ref<HTMLTextAreaElement | null>(null);

  const renderedHtml = computed(() => {
    if (!props.modelValue) return '';
    return marked(props.modelValue) as string;
  });

  function handleInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    emit('update:modelValue', target.value);
  }

  /** Insert or wrap text at the current cursor position / selection. */
  function applyFormat(prefix: string, suffix = '', defaultText = '') {
    const textarea = textareaRef.value;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end) || defaultText;
    const replacement = `${prefix}${selected}${suffix}`;
    const newValue = textarea.value.slice(0, start) + replacement + textarea.value.slice(end);

    emit('update:modelValue', newValue);

    // restore cursor after Vue re-renders
    requestAnimationFrame(() => {
      textarea.focus();
      const cursorPos = start + prefix.length + selected.length + suffix.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    });
  }

  const toolbar: Array<{ key: string; label: () => string; icon: unknown; action: () => void }> = [
    {
      key: 'bold',
      label: () => t('bold'),
      icon: IconBold,
      action: () => applyFormat('**', '**', 'bold text'),
    },
    {
      key: 'italic',
      label: () => t('italic'),
      icon: IconItalic,
      action: () => applyFormat('_', '_', 'italic text'),
    },
    {
      key: 'heading',
      label: () => t('heading'),
      icon: IconHeading,
      action: () => applyFormat('## ', '', 'Heading'),
    },
    {
      key: 'code',
      label: () => t('code'),
      icon: IconCodeInline,
      action: () => applyFormat('`', '`', 'code'),
    },
    {
      key: 'link',
      label: () => t('link'),
      icon: IconExternalLink,
      action: () => applyFormat('[', '](url)', 'link text'),
    },
    {
      key: 'bulletList',
      label: () => t('bulletList'),
      icon: IconBulletList,
      action: () => applyFormat('- ', '', 'list item'),
    },
    {
      key: 'numberedList',
      label: () => t('numberedList'),
      icon: IconNumberedList,
      action: () => applyFormat('1. ', '', 'list item'),
    },
    {
      key: 'quote',
      label: () => t('quote'),
      icon: IconBlockquote,
      action: () => applyFormat('> ', '', 'quoted text'),
    },
  ];
</script>

<template>
  <div
    :class="[
      'markdown-input',
      `markdown-input--${size}`,
      {
        'markdown-input--error': !!error,
        'markdown-input--disabled': disabled,
        'markdown-input--readonly': readonly,
      },
    ]"
  >
    <label
      v-if="label"
      :class="['markdown-input__label', { 'markdown-input__label--hidden': labelHidden }]"
      :for="resolvedId"
    >
      <BaseTypography
        as="span"
        color="primary"
        variant="label"
      >
        {{ label }}
      </BaseTypography>
      <span
        v-if="required"
        :title="t('required')"
        aria-hidden="true"
        class="markdown-input__required"
      >
        *
      </span>
    </label>

    <div class="markdown-input__editor">
      <!-- Tab bar — hidden when component is locked to preview (disabled or readonly) -->
      <div
        v-if="!disabled && !readonly"
        class="markdown-input__tabs"
        role="tablist"
      >
        <button
          :aria-controls="`${resolvedId}-write-panel`"
          :aria-selected="effectiveTab === 'write'"
          :class="['markdown-input__tab', { 'markdown-input__tab--active': effectiveTab === 'write' }]"
          role="tab"
          type="button"
          @click="activeTab = 'write'"
        >
          <BaseTypography
            as="span"
            color="inherit"
            variant="label"
          >
            {{ t('write') }}
          </BaseTypography>
        </button>
        <button
          :aria-controls="`${resolvedId}-preview-panel`"
          :aria-selected="effectiveTab === 'preview'"
          :class="['markdown-input__tab', { 'markdown-input__tab--active': effectiveTab === 'preview' }]"
          role="tab"
          type="button"
          @click="activeTab = 'preview'"
        >
          <BaseTypography
            as="span"
            color="inherit"
            variant="label"
          >
            {{ t('preview') }}
          </BaseTypography>
        </button>
      </div>

      <!-- Toolbar (visible only on write tab) -->
      <div
        v-if="effectiveTab === 'write'"
        :aria-label="label ?? 'Markdown toolbar'"
        class="markdown-input__toolbar"
        role="toolbar"
      >
        <button
          v-for="item in toolbar"
          :key="item.key"
          :aria-label="item.label()"
          :disabled="disabled"
          :title="item.label()"
          class="markdown-input__tool"
          type="button"
          @click="item.action()"
        >
          <component
            :is="item.icon"
            size="sm"
          />
        </button>
      </div>

      <!-- Write panel -->
      <div
        v-show="effectiveTab === 'write'"
        :id="`${resolvedId}-write-panel`"
        class="markdown-input__panel"
        role="tabpanel"
      >
        <textarea
          :id="resolvedId"
          ref="textareaRef"
          :aria-describedby="error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined"
          :aria-invalid="!!error || undefined"
          :disabled="disabled"
          :placeholder="placeholder"
          :readonly="readonly"
          :required="required"
          :rows="rows"
          :value="modelValue"
          class="markdown-input__field"
          @blur="emit('blur', $event)"
          @change="emit('change', $event)"
          @focus="emit('focus', $event)"
          @input="handleInput"
        />
      </div>

      <!-- Preview panel -->
      <div
        v-show="effectiveTab === 'preview'"
        :id="`${resolvedId}-preview-panel`"
        class="markdown-input__panel markdown-input__preview"
        role="tabpanel"
      >
        <!-- eslint-disable vue/no-v-html -->
        <article
          v-if="renderedHtml"
          class="markdown-input__preview-content"
          v-html="renderedHtml"
        />
        <!-- eslint-enable vue/no-v-html -->
        <BaseTypography
          v-else
          as="p"
          class="markdown-input__preview-empty"
          color="tertiary"
          variant="body-sm"
        >
          {{ t('emptyPreview') }}
        </BaseTypography>
      </div>
    </div>

    <BaseTypography
      v-if="error"
      :id="`${resolvedId}-error`"
      as="p"
      class="markdown-input__error"
      color="inherit"
      role="alert"
      variant="caption"
    >
      {{ error }}
    </BaseTypography>
    <BaseTypography
      v-else-if="hint"
      :id="`${resolvedId}-hint`"
      as="p"
      class="markdown-input__hint"
      color="secondary"
      variant="caption"
    >
      {{ hint }}
    </BaseTypography>
  </div>
</template>

<style lang="scss" scoped>
  @layer mp.components {
    .markdown-input {
      display: flex;
      flex-direction: column;
      gap: var(--mp-spacing-1);

      &__label {
        &--hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip-path: inset(50%);
          white-space: nowrap;
          border: 0;
        }
      }

      &__required {
        color: var(--mp-color-danger-default);
        margin-left: 2px;
      }

      &__editor {
        display: flex;
        flex-direction: column;
        border: 1px solid var(--mp-color-border-default);
        border-radius: var(--mp-radius-md);
        overflow: hidden;
        transition:
          border-color 150ms ease,
          box-shadow 150ms ease;

        &:focus-within {
          border-color: var(--mp-color-border-focus);
          box-shadow: var(--mp-shadow-focus-primary);
        }
      }

      /* Tabs */
      &__tabs {
        display: flex;
        border-bottom: 1px solid var(--mp-color-border-default);
        background-color: var(--mp-color-bg-subtle, var(--mp-color-bg-muted));
      }

      &__tab {
        display: inline-flex;
        align-items: center;
        padding: var(--mp-spacing-1) var(--mp-spacing-3);
        color: var(--mp-color-text-secondary);
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        cursor: pointer;
        transition:
          color 150ms ease,
          border-color 150ms ease;

        &--active {
          color: var(--mp-color-text-primary);
          border-bottom-color: var(--mp-color-primary-default);
        }

        &:hover {
          color: var(--mp-color-text-primary);
        }
      }

      /* Toolbar */
      &__toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: var(--mp-spacing-1);
        padding: var(--mp-spacing-1) var(--mp-spacing-2);
        border-bottom: 1px solid var(--mp-color-border-default);
        background-color: var(--mp-color-bg-surface);
      }

      &__tool {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: var(--mp-spacing-1);
        color: var(--mp-color-text-secondary);
        background: none;
        border: 1px solid var(--mp-color-border-default);
        border-radius: var(--mp-radius-sm);
        cursor: pointer;
        transition:
          background-color 150ms ease,
          color 150ms ease;

        &:disabled {
          color: var(--mp-color-text-disabled);
          cursor: not-allowed;
        }

        &:hover:not(:disabled) {
          background-color: var(--mp-color-bg-muted);
          color: var(--mp-color-text-primary);
        }
      }

      /* Panels */
      &__panel {
        flex: 1;
      }

      &__field {
        width: 100%;
        box-sizing: border-box;
        border: none;
        background-color: var(--mp-color-bg-surface);
        color: var(--mp-color-text-primary);
        font-family: var(--mp-font-family-mono, var(--mp-font-family-sans));
        line-height: var(--mp-line-height-normal);
        outline: none;
        resize: vertical;

        &::placeholder {
          color: var(--mp-color-text-tertiary);
        }
      }

      &__preview {
        background-color: var(--mp-color-bg-surface);
      }

      &__preview-content {
        color: var(--mp-color-text-primary);
        line-height: var(--mp-line-height-normal);

        :deep(h1),
        :deep(h2),
        :deep(h3),
        :deep(h4) {
          margin: var(--mp-spacing-2) 0 var(--mp-spacing-1);
          font-weight: var(--mp-font-weight-semibold);
        }

        :deep(p) {
          margin: 0 0 var(--mp-spacing-2);
        }

        :deep(ul),
        :deep(ol) {
          margin: 0 0 var(--mp-spacing-2);
          padding-left: var(--mp-spacing-5);
        }

        :deep(code) {
          font-family: var(--mp-font-family-mono, monospace);
          background-color: var(--mp-color-bg-muted);
          padding: 1px 4px;
          border-radius: var(--mp-radius-sm);
        }

        :deep(pre) {
          background-color: var(--mp-color-bg-muted);
          padding: var(--mp-spacing-3);
          border-radius: var(--mp-radius-md);
          overflow-x: auto;
        }

        :deep(blockquote) {
          margin: 0 0 var(--mp-spacing-2);
          padding-left: var(--mp-spacing-3);
          border-left: 3px solid var(--mp-color-border-default);
          color: var(--mp-color-text-secondary);
        }

        :deep(a) {
          color: var(--mp-color-primary-text);
          text-decoration: underline;
        }
      }

      &__preview-empty {
        margin: 0;
        font-style: italic;
      }

      /* Sizes */
      &--sm {
        .markdown-input__field,
        .markdown-input__preview-content {
          padding: var(--mp-spacing-1) var(--mp-spacing-2);
          font-size: var(--mp-font-size-sm);
        }

        .markdown-input__preview-empty {
          padding: var(--mp-spacing-1) var(--mp-spacing-2);
        }
      }

      &--md {
        .markdown-input__field,
        .markdown-input__preview-content {
          padding: var(--mp-spacing-2) var(--mp-spacing-3);
          font-size: var(--mp-font-size-md);
        }

        .markdown-input__preview-empty {
          padding: var(--mp-spacing-2) var(--mp-spacing-3);
        }
      }

      &--lg {
        .markdown-input__field,
        .markdown-input__preview-content {
          padding: var(--mp-spacing-3) var(--mp-spacing-4);
          font-size: var(--mp-font-size-lg);
        }

        .markdown-input__preview-empty {
          padding: var(--mp-spacing-3) var(--mp-spacing-4);
        }
      }

      /* Error state */
      &--error {
        .markdown-input__editor {
          border-color: var(--mp-color-danger-default);

          &:focus-within {
            box-shadow: var(--mp-shadow-focus-danger);
          }
        }
      }

      /* Disabled state */
      &--disabled {
        pointer-events: none;

        .markdown-input__editor {
          background-color: var(--mp-color-bg-muted);
        }

        .markdown-input__field {
          background-color: var(--mp-color-bg-muted);
          color: var(--mp-color-text-disabled);
          cursor: not-allowed;
        }

        .markdown-input__preview-content {
          color: var(--mp-color-text-disabled);
        }

        .markdown-input__preview-empty {
          color: var(--mp-color-text-disabled);

          :deep(.base-typography) {
            color: var(--mp-color-text-disabled);
          }
        }
      }

      /* Readonly state */
      &--readonly {
        .markdown-input__editor {
          border-color: var(--mp-color-border-default);

          &:focus-within {
            border-color: var(--mp-color-border-default);
            box-shadow: none;
          }
        }
      }

      &__error {
        color: var(--mp-color-danger-text);
        margin: 0;
      }

      &__hint {
        margin: 0;
      }
    }
  }
</style>

<i18n lang="yaml">
en:
  required: required
  write: Write
  preview: Preview
  bold: Bold
  italic: Italic
  heading: Heading
  link: Link
  bulletList: Bullet list
  numberedList: Numbered list
  quote: Blockquote
  code: Inline code
  emptyPreview: Nothing to preview.
</i18n>
