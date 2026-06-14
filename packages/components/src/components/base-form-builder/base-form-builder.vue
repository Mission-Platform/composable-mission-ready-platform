<script lang="ts" setup>
  /**
   * `BaseFormBuilder` — a visual, drag-and-drop authoring surface for
   * JSON-Schema forms, and the counterpart to `BaseSchemaForm`.
   *
   * It is laid out as a three-column {@link BaseVerticalLayout}:
   *
   * - **Start sidebar** — the field palette ({@link BaseFormBuilderPalette}):
   *   drag a field type onto the canvas (or click it) to add a field.
   * - **Centre** — a tabbed view ({@link BaseTabs}) of the **Editor** canvas
   *   ({@link BaseFormBuilderCanvas}), a wizard-only **Steps** tab
   *   ({@link BaseFormBuilderSteps}) for configuring the steps, a live **Preview**
   *   rendered with `BaseSchemaForm` from the very schema the builder emits, and
   *   a **Schema** tab showing that schema as formatted JSON
   *   ({@link BaseCodeBlock}).
   * - **End sidebar** — the inspector: the {@link BaseFormBuilderProperties} of
   *   the field selected on the canvas, or the {@link BaseFormBuilderWizardConfig}
   *   (form settings) when nothing is selected.
   *
   * Drag-and-drop is powered by [`@dnd-kit/vue`](https://dndkit.com/vue): palette
   * entries are draggables, canvas rows are sortables, and the canvas / wizard
   * steps / field sets are droppables — so a field can be dragged in, reordered,
   * moved between steps, and **nested into a field set** to any depth. The whole
   * tree is emitted as a {@link SchemaFormDefinition} via `v-model`, ready to feed
   * straight back into `BaseSchemaForm`.
   *
   * See the props, emits, and slots tables below (auto-generated from the
   * component's TypeScript declarations) for the full public API, and refer to
   * the linked stories for usage examples.
   */
  import { DragDropProvider, DragOverlay } from '@dnd-kit/vue';
  import { computed, ref, watch } from 'vue';

  import BaseCodeBlock from '../base-code-block/base-code-block.vue';
  import BaseSchemaForm from '../base-schema-form/base-schema-form.vue';
  import BaseTabs, { type TabItem } from '../base-tabs/base-tabs.vue';
  import BaseTypography from '../base-typography/base-typography.vue';
  import BaseVerticalLayout from '../base-vertical-layout/base-vertical-layout.vue';

  import BaseFormBuilderCanvas from './base-form-builder-canvas.vue';
  import BaseFormBuilderPalette from './base-form-builder-palette.vue';
  import BaseFormBuilderProperties from './base-form-builder-properties.vue';
  import BaseFormBuilderSteps from './base-form-builder-steps.vue';
  import BaseFormBuilderWizardConfig from './base-form-builder-wizard-config.vue';
  import { DEFAULT_FIELD_TYPES, fieldKeyError } from './form-schema';
  import { useFormBuilder, type InsertTarget } from './use-form-builder';

  import type {
    BuilderField,
    FieldTypeDescriptor,
    FormBuilderDragData,
    FormBuilderDropData,
    FormFieldType,
    SchemaFormDefinition,
  } from './types';
  import type { SidebarDraggable } from '../base-sidebar/base-sidebar.vue';

  const props = withDefaults(
    defineProps<{
      /** `v-model` — the generated JSON Schema definition. */
      modelValue?: SchemaFormDefinition;
      /** Form title written into the schema (`v-model:title`). */
      title?: string;
      /** Form description written into the schema (`v-model:description`). */
      description?: string;
      /** Emit a multi-step wizard definition and expose the step editor. */
      wizard?: boolean;
      /** Render the builder read-only (no edits, no drag-and-drop). */
      disabled?: boolean;
      /** The field types offered in the palette. */
      fieldTypes?: FieldTypeDescriptor[];
      /** Whether the start (palette) column is resizable, and its width bound. */
      startDraggable?: SidebarDraggable;
      /** Whether the end (inspector) column is resizable, and its width bound. */
      endDraggable?: SidebarDraggable;
    }>(),
    {
      modelValue: undefined,
      title: '',
      description: '',
      wizard: false,
      disabled: false,
      fieldTypes: () => DEFAULT_FIELD_TYPES,
      startDraggable: false,
      endDraggable: false,
    },
  );

  const emit = defineEmits<{
    /** `v-model` — the generated schema definition changed. */
    'update:modelValue': [definition: SchemaFormDefinition];
    /** `v-model:title` — the form title changed. */
    'update:title': [title: string];
    /** `v-model:description` — the form description changed. */
    'update:description': [description: string];
  }>();

  // Locally-editable copies of the title / description so the inspector can edit
  // them; kept in sync with the props and surfaced back through `v-model`.
  const formTitle = ref(props.title);
  const formDescription = ref(props.description);
  watch(
    () => props.title,
    (value) => {
      formTitle.value = value;
    },
  );
  watch(
    () => props.description,
    (value) => {
      formDescription.value = value;
    },
  );

  const builder = useFormBuilder({
    wizard: () => props.wizard,
    title: () => formTitle.value || undefined,
    description: () => formDescription.value || undefined,
  });

  // ─── v-model synchronisation ──────────────────────────────────────────────
  // `lastEmitted` lets us ignore the echo of our own emitted value when the
  // parent feeds it straight back into `modelValue`, avoiding an update loop.
  let lastEmitted = '';

  watch(
    () => props.modelValue,
    (definition) => {
      const serialized = JSON.stringify(definition ?? null);
      if (serialized === lastEmitted) return;
      builder.load(definition);
    },
    { immediate: true, deep: true },
  );

  watch(
    builder.definition,
    (definition) => {
      lastEmitted = JSON.stringify(definition ?? null);
      emit('update:modelValue', definition);
    },
    { deep: true },
  );

  // ─── Centre tabs ──────────────────────────────────────────────────────────
  // The **Steps** tab sits right next to **Editor** and is only present in
  // wizard mode, where it configures the wizard's list of steps.
  const tabs = computed<TabItem[]>(() => [
    { id: 'editor', label: 'Editor' },
    ...(props.wizard ? [{ id: 'steps', label: 'Steps' }] : []),
    { id: 'preview', label: 'Preview' },
    { id: 'schema', label: 'Schema' },
  ]);
  const activeTab = ref('editor');

  // Leaving wizard mode removes the Steps tab, so fall back to the Editor if it
  // was the active one.
  watch(
    () => props.wizard,
    (wizard) => {
      if (!wizard && activeTab.value === 'steps') activeTab.value = 'editor';
    },
  );

  /** The emitted schema definition, pretty-printed for the **Schema** tab. */
  const schemaJson = computed(() => JSON.stringify(builder.definition.value, null, 2));

  /**
   * The root field lists, one per wizard step. In single-step mode this is a
   * one-element array wrapping the flat list, so the tree helpers below can walk
   * both shapes uniformly.
   */
  const rootLists = computed<BuilderField[][]>(() =>
    props.wizard ? (builder.fields.value as BuilderField[][]) : [builder.fields.value as BuilderField[]],
  );

  const hasFields = computed(() => rootLists.value.some((list) => list.length > 0));

  /** Localised type-chip labels, keyed by field type. */
  const typeLabels = computed<Record<string, string>>(() =>
    Object.fromEntries(props.fieldTypes.map((descriptor) => [descriptor.type, descriptor.label])),
  );

  // ─── Selection / key validation ────────────────────────────────────────────
  /** Walks one list, returning the sibling keys of the field with `id`. */
  function siblingKeysIn(list: BuilderField[], id: string): string[] | undefined {
    if (list.some((field) => field.id === id)) {
      return list.filter((field) => field.id !== id).map((field) => field.key);
    }
    for (const field of list) {
      if (field.children) {
        const nested = siblingKeysIn(field.children, id);
        if (nested) return nested;
      }
    }
    return undefined;
  }

  /** Walks every step, returning the sibling keys of the field with `id`. */
  function siblingKeysOf(id: string): string[] | undefined {
    for (const list of rootLists.value) {
      const found = siblingKeysIn(list, id);
      if (found) return found;
    }
    return undefined;
  }

  const keyError = computed(() => {
    const selected = builder.selectedField.value;
    if (!selected) return undefined;
    const siblings = siblingKeysOf(selected.id) ?? [];
    return fieldKeyError(selected.key, siblings);
  });

  // ─── Drag-and-drop ──────────────────────────────────────────────────────────
  const activeDragLabel = ref<string | null>(null);

  /** Recursively finds the field with `id` within a single list. */
  function findInList(list: BuilderField[], id: string): BuilderField | undefined {
    for (const field of list) {
      if (field.id === id) return field;
      if (field.children) {
        const nested = findInList(field.children, id);
        if (nested) return nested;
      }
    }
    return undefined;
  }

  /** Finds the field with `id` anywhere in the tree (across all steps). */
  function findField(id: string): BuilderField | undefined {
    for (const list of rootLists.value) {
      const found = findInList(list, id);
      if (found) return found;
    }
    return undefined;
  }

  /** The container + position of the field with `id` within one step's list. */
  function locateInList(list: BuilderField[], id: string, step: number, parentId?: string): InsertTarget | undefined {
    for (let index = 0; index < list.length; index += 1) {
      const field = list[index];
      if (field.id === id) return { parentId, index, step };
      if (field.children) {
        const nested = locateInList(field.children, id, step, field.id);
        if (nested) return nested;
      }
    }
    return undefined;
  }

  /** The container + position of the field with `id` (immediate parent + step). */
  function locateTarget(id: string): InsertTarget | undefined {
    for (let step = 0; step < rootLists.value.length; step += 1) {
      const found = locateInList(rootLists.value[step], id, step);
      if (found) return found;
    }
    return undefined;
  }

  /** Append-at-end target for the root list of wizard `step`. */
  function stepTarget(step: number): InsertTarget {
    return { step, index: rootLists.value[step]?.length ?? 0 };
  }

  /** Append-at-end target inside the field set identified by `id`. */
  function fieldsetTarget(id: string): InsertTarget {
    return { parentId: id, index: findField(id)?.children?.length ?? 0 };
  }

  /** Maps a drop target's payload onto an {@link InsertTarget}. */
  function resolveDrop(data: FormBuilderDropData | undefined): InsertTarget | undefined {
    if (!data) return undefined;
    if (data.kind === 'canvas') return stepTarget(0);
    if (data.kind === 'step') return stepTarget(data.step);
    if (data.kind === 'fieldset') return fieldsetTarget(data.id);
    return locateTarget(data.id);
  }

  /** The minimal shape we read from a `@dnd-kit/vue` drag event. */
  type DragEntity = { data?: unknown } | null | undefined;

  /** Tracks the dragged item's label so the drag overlay can preview it. */
  function onDragStart(event: { operation: { source?: DragEntity } }): void {
    const data = event.operation.source?.data as FormBuilderDragData | undefined;
    if (!data) {
      activeDragLabel.value = null;
    } else if (data.kind === 'palette') {
      activeDragLabel.value = typeLabels.value[data.fieldType] ?? data.fieldType;
    } else {
      activeDragLabel.value = findField(data.id)?.label ?? 'Field';
    }
  }

  /** Inserts a new palette field, or moves an existing field, at the drop target. */
  function applyDrop(source: FormBuilderDragData, target: InsertTarget): void {
    if (source.kind === 'palette') builder.insertField(source.fieldType, target);
    else builder.moveField(source.id, target);
  }

  /** Commits a completed drag: resolves the drop target and applies it. */
  function onDragEnd(event: { canceled: boolean; operation: { source?: DragEntity; target?: DragEntity } }): void {
    activeDragLabel.value = null;
    if (props.disabled || event.canceled) return;

    const sourceData = event.operation.source?.data as FormBuilderDragData | undefined;
    const dropData = event.operation.target?.data as FormBuilderDropData | undefined;
    if (!sourceData) return;

    const target = resolveDrop(dropData);
    if (!target) return;

    applyDrop(sourceData, target);
  }

  // ─── Inspector actions ───────────────────────────────────────────────────────
  /** Adds a field of `type` to the first step from the palette's add button. */
  function addFromPalette(type: FormFieldType): void {
    if (props.disabled) return;
    builder.addField(type, { step: 0 });
  }

  /** Updates the form title and notifies the parent via `update:title`. */
  function updateTitle(value: string): void {
    formTitle.value = value;
    emit('update:title', value);
  }

  /** Updates the form description and notifies the parent via `update:description`. */
  function updateDescription(value: string): void {
    formDescription.value = value;
    emit('update:description', value);
  }
</script>

<template>
  <DragDropProvider
    @drag-end="onDragEnd"
    @drag-start="onDragStart"
  >
    <BaseVerticalLayout
      :end-draggable="endDraggable"
      :start-draggable="startDraggable"
      class="form-builder"
      end-size="lg"
      end-title="Field properties"
      start-size="md"
      start-title="Field palette"
    >
      <template #start>
        <BaseFormBuilderPalette
          :disabled="disabled"
          :field-types="fieldTypes ?? []"
          @add="addFromPalette"
        />
      </template>

      <BaseTabs
        v-model="activeTab"
        :tabs="tabs"
        class="form-builder__center"
        variant="pill"
      >
        <template #editor>
          <div class="form-builder__panel">
            <BaseFormBuilderCanvas
              :disabled="disabled"
              :fields="builder.fields.value"
              :selected-id="builder.selectedId.value"
              :step-titles="builder.stepTitles.value"
              :type-labels="typeLabels"
              :wizard="wizard"
              @add-child="builder.addChild"
              @duplicate="builder.duplicateField"
              @move-down="builder.moveDown"
              @move-up="builder.moveUp"
              @remove="builder.removeField"
              @select="builder.select"
            />
          </div>
        </template>

        <template #steps>
          <BaseFormBuilderSteps
            :disabled="disabled"
            :step-conditions="builder.stepConditions.value"
            :step-count="builder.stepCount.value"
            :step-descriptions="builder.stepDescriptions.value"
            :step-titles="builder.stepTitles.value"
            @add-step="builder.addStep"
            @remove-step="builder.removeStep"
            @update-step-condition="builder.setStepCondition"
            @update-step-description="builder.setStepDescription"
            @update-step-title="builder.setStepTitle"
          />
        </template>

        <template #preview>
          <div class="form-builder__panel">
            <BaseSchemaForm
              v-if="hasFields"
              :key="JSON.stringify(builder.definition.value)"
              :schema="builder.definition.value"
            />
            <BaseTypography
              v-else
              as="p"
              color="secondary"
              variant="body-sm"
            >
              Add a field to preview the form.
            </BaseTypography>
          </div>
        </template>

        <template #schema>
          <div class="form-builder__panel">
            <BaseCodeBlock
              :code="schemaJson"
              :show-line-numbers="true"
              language="json"
              max-height="60vh"
            />
          </div>
        </template>
      </BaseTabs>

      <template #end>
        <div class="form-builder__inspector">
          <BaseTypography
            as="h2"
            class="form-builder__inspector-title"
            variant="label"
            weight="semibold"
          >
            {{ builder.selectedField.value ? 'Field properties' : 'Form settings' }}
          </BaseTypography>

          <BaseFormBuilderProperties
            v-if="builder.selectedField.value"
            :disabled="disabled"
            :field="builder.selectedField.value"
            :field-types="fieldTypes ?? []"
            :key-error="keyError"
            :step="builder.selectedStep.value"
            :step-count="builder.stepCount.value"
            :wizard="wizard"
            @move-to-step="builder.moveFieldToStep(builder.selectedField.value!.id, $event)"
            @update="builder.updateField(builder.selectedField.value!.id, $event)"
          />
          <BaseFormBuilderWizardConfig
            v-else
            :description="formDescription"
            :disabled="disabled"
            :title="formTitle"
            @update:description="updateDescription"
            @update:title="updateTitle"
          />
        </div>
      </template>
    </BaseVerticalLayout>

    <!-- Pointer-following ghost shown while dragging. -->
    <DragOverlay>
      <div
        v-if="activeDragLabel"
        class="form-builder__overlay"
      >
        {{ activeDragLabel }}
      </div>
    </DragOverlay>
  </DragDropProvider>
</template>

<style lang="scss" scoped>
  .form-builder {
    min-height: 30rem;

    &__center {
      min-width: 0;
    }

    &__panel {
      display: flex;
      flex-direction: column;
      gap: var(--mp-spacing-3);
      padding: var(--mp-spacing-3) 0;
    }

    &__inspector {
      display: flex;
      flex-direction: column;
      gap: var(--mp-spacing-3);
    }

    &__inspector-title {
      margin: 0;
    }

    &__overlay {
      padding: var(--mp-spacing-2) var(--mp-spacing-3);
      font-size: var(--mp-font-size-sm);
      color: var(--mp-color-primary-text);
      background-color: var(--mp-color-bg-surface);
      border: 1px solid var(--mp-color-primary-default);
      border-radius: var(--mp-radius-md);
      box-shadow: var(--mp-shadow-md);
    }
  }
</style>
