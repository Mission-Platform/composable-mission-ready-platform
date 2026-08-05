import {
  BaseButton,
  BaseCheckbox,
  BaseCodeBlock,
  BaseInput,
  BaseNumberStepper,
  BaseSelect,
  BaseSwitch,
  BaseTabs,
  BaseTextarea,
  BaseTypography,
  type TabItem,
} from '@mission-platform/components';
import { h, type MpChild, type MpElement, type MpProperties, useRef, useState } from '@mission-platform/forge';
import {
  type BuilderField,
  type BuilderFieldOption,
  DEFAULT_FIELD_TYPES,
  type FieldCondition,
  type FieldConditionLeaf,
  fieldKeyError,
  fieldsToDefinition,
  type FieldTypeDescriptor,
  type FormFieldType,
  isDateWidget,
  isFileWidget,
  isLocationWidget,
  isMultilineWidget,
  isNumberWidget,
  isTextWidget,
  isTimeWidget,
  type LocationFormat,
  type SchemaFormDefinition,
  schemaStepConditions,
  schemaStepDescriptions,
  schemaStepTitles,
  schemaToFields,
  widgetHasOptions,
} from '@mission-platform/forms-core';
import { BaseVerticalLayout } from '@mission-platform/layouts';

import sizeStyles from '../../size.module.scss';
import { BaseSchemaForm } from '../base-schema-form';

import styles from './base-form-builder.module.scss';
import {
  addChild,
  addStep,
  duplicateField,
  findField,
  insertField,
  type InsertTarget,
  isGhostAtEnd,
  isGhostBefore,
  locateTarget,
  moveField,
  moveFieldToStep,
  removeField,
  removeStep,
  shiftField,
  siblingKeysOf,
  stepOf,
  updateField,
} from './form-builder-tree';

import type { DrawerDraggable } from '@mission-platform/components/base-drawer';

// Re-export the shared builder/schema types so consumers of the JSX component
// can import the same names they used from the Vue component.
export type {
  BuilderField,
  BuilderFieldOption,
  FieldCondition,
  FieldTypeDescriptor,
  FormFieldType,
  SchemaFormDefinition,
} from '@mission-platform/forms-core';

/** Size token — canonical 2xs → 2xl scale. */
export type FormBuilderSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface FormBuilderProperties extends MpProperties {
  /** Size token controlling the builder's font scale. Defaults to `'md'`. */
  size?: FormBuilderSize;
  /**
   * The generated JSON Schema definition (controlled via `modelValue`).
   * @model onUpdateModelValue
   */
  modelValue?: SchemaFormDefinition;
  /** Form title written into the schema. */
  title?: string;
  /** Form description written into the schema. */
  description?: string;
  /** Emit a multi-step wizard definition and expose the step editor. */
  wizard?: boolean;
  /** Render the builder read-only (no edits, no drag-and-drop). */
  disabled?: boolean;
  /** The field types offered in the palette. */
  fieldTypes?: FieldTypeDescriptor[];
  /** Whether the start (palette) column is resizable, and its width bound. */
  startDraggable?: DrawerDraggable;
  /** Whether the end (inspector) column is resizable, and its width bound. */
  endDraggable?: DrawerDraggable;
  /** Fired with the generated schema definition (the controlled `v-model`). */
  onUpdateModelValue?: (definition: SchemaFormDefinition) => void;
  /** Fired with the next form title. */
  onUpdateTitle?: (title: string) => void;
  /** Fired with the next form description. */
  onUpdateDescription?: (description: string) => void;
}

/** Combinator labels for the condition editor's `Match` select. */
const COMBINATOR_OPTIONS = [
  { label: 'All of (AND)', value: 'allOf' },
  { label: 'Any of (OR)', value: 'anyOf' },
  { label: 'One of (XOR)', value: 'oneOf' },
];

/** Coordinate-format options for the `location` widget's inspector select. */
const LOCATION_FORMAT_OPTIONS = [
  { label: 'Decimal degrees', value: 'dd' },
  { label: 'Latitude / longitude', value: 'latlng' },
  { label: 'Degrees, minutes', value: 'dm' },
  { label: 'Degrees, minutes, seconds', value: 'dms' },
  { label: 'GeoJSON', value: 'geojson' },
];

/** Leaf-comparator options for the condition editor. */
const CONDITION_OPERATORS = [
  { label: 'equals', value: 'equals' },
  { label: 'does not equal', value: 'notEquals' },
  { label: 'is one of (comma-separated)', value: 'in' },
  { label: 'greater than', value: 'gt' },
  { label: 'less than', value: 'lt' },
  { label: 'is filled', value: 'truthy' },
];

type Combinator = 'allOf' | 'anyOf' | 'oneOf';

/** Seed the working step matrix from a schema definition. */
function seedSteps(definition: SchemaFormDefinition | undefined): BuilderField[][] {
  const loaded = schemaToFields(definition);
  const steps = Array.isArray(definition) ? (loaded as BuilderField[][]) : [loaded as BuilderField[]];
  return steps.length > 0 ? steps : [[]];
}

/** Coerce a raw condition-value string into a boolean / number / string. */
function coerce(raw: string): string | number | boolean {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw.trim() !== '' && !Number.isNaN(Number(raw))) return Number(raw);
  return raw;
}

/** The current combinator + leaves of a condition, normalised for the editor. */
function currentGroup(condition: FieldCondition | undefined): { combinator: Combinator; leaves: FieldConditionLeaf[] } {
  if (condition && typeof condition === 'object') {
    for (const key of ['allOf', 'anyOf', 'oneOf'] as Combinator[]) {
      const array = (condition as Record<string, unknown>)[key];
      if (Array.isArray(array)) return { combinator: key, leaves: array as FieldConditionLeaf[] };
    }
  }
  return { combinator: 'allOf', leaves: [] };
}

/** The operator key currently set on a leaf. */
function leafOperator(leaf: FieldConditionLeaf): string {
  for (const operator of ['equals', 'notEquals', 'in', 'gt', 'lt', 'truthy']) {
    if (operator in leaf) return operator;
  }
  return 'equals';
}

/** The display value for a leaf's comparator. */
function leafValue(leaf: FieldConditionLeaf): string {
  const operator = leafOperator(leaf) as keyof FieldConditionLeaf;
  const value = leaf[operator];
  if (Array.isArray(value)) return value.join(', ');
  return value === undefined ? '' : String(value);
}

/**
 * Keep the live drop ghost stable while a drag hovers it: permit the drop
 * (native HTML5 DnD needs `preventDefault`) and stop the event from bubbling to
 * the container, whose handler would otherwise flip the indicator to an append.
 */
function holdGhostDragOver(event: DragEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

/** Build a leaf from its three editable parts. */
function buildLeaf(field: string, operator: string, raw: string): FieldConditionLeaf {
  const leaf: FieldConditionLeaf = { field };
  if (operator === 'truthy') {
    leaf.truthy = raw !== 'false';
  } else if (operator === 'in') {
    leaf.in = raw
      .split(',')
      .map((part) => coerce(part.trim()))
      .filter((part) => part !== '');
  } else {
    (leaf as unknown as Record<string, unknown>)[operator] = coerce(raw);
  }
  return leaf;
}

/**
 * `BaseFormBuilder` — a visual, drag-and-drop authoring surface for JSON-Schema
 * forms (the counterpart to `BaseSchemaForm`), authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * Laid out as a three-column `BaseVerticalLayout`: a field **palette**, a tabbed
 * centre (**Editor** canvas, a wizard-only **Steps** tab, a live **Preview**
 * rendered with `BaseSchemaForm`, and a **Schema** JSON tab), and an **inspector**
 * (the selected field's properties + a conditional-visibility editor, or the
 * form settings when nothing is selected). The whole field tree is emitted as a
 * `SchemaFormDefinition` (built through the shared `@mission-platform/forms-core`,
 * so it feeds straight back into `BaseSchemaForm`).
 *
 * Substitutions from the Vue SFC: `@dnd-kit/vue` is replaced with the **native
 * HTML5 drag-and-drop** element event props (`draggable`/`onDragStart`/
 * `onDragOver`/`onDrop`) — a palette entry drops to add a field, a canvas row
 * drops to reorder, and a field set drops to nest; the
 * palette/canvas/properties/condition/steps sub-components are inlined; and
 * `v-model`/emits become callback props. While a drag hovers the canvas a
 * placeholder **drop ghost** row is rendered at the exact slot the field will
 * land in (before the hovered row, or appended at the end of the hovered
 * container), driven by a `dropIndicator` insert-target updated on `dragover`.
 */
export function BaseFormBuilder(properties: Readonly<FormBuilderProperties>): MpElement {
  const {
    modelValue,
    wizard = false,
    disabled = false,
    fieldTypes = DEFAULT_FIELD_TYPES,
    startDraggable = false,
    endDraggable = false,
    size = 'md',
  } = properties;

  const [steps, setSteps] = useState<BuilderField[][]>(seedSteps(modelValue));
  // eslint-disable-next-line unicorn/no-useless-undefined -- the neutral `useState` requires an explicit initial value
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('editor');
  const [stepTitles, setStepTitles] = useState<string[]>(schemaStepTitles(modelValue));
  const [stepDescriptions, setStepDescriptions] = useState<string[]>(schemaStepDescriptions(modelValue));
  const [stepConditions, setStepConditions] = useState<Array<FieldCondition | undefined>>(
    schemaStepConditions(modelValue),
  );
  const [title, setTitle] = useState(properties.title ?? '');
  const [description, setDescription] = useState(properties.description ?? '');

  // Transient native-DnD payload: the palette type being added or the field id
  // being moved.
  const dragReference = useRef<{ kind: 'palette'; type: FormFieldType } | { kind: 'field'; id: string } | undefined>(
    undefined,
  );

  // The live drop-placement ghost: the container + index a drop would land at
  // while a drag is hovering the canvas (cleared on drop / drag-end). Rendered as
  // a placeholder row so the author sees where the field will be inserted.
  const [dropIndicator, setDropIndicator] = useState<InsertTarget | undefined>(
    // eslint-disable-next-line unicorn/no-useless-undefined -- the neutral `useState` requires an explicit initial value
    undefined,
  );

  // The field currently being dragged (a canvas move) — used to dim its source
  // row while it is in flight (drag movement styling).
  const [draggingId, setDraggingId] = useState<string | undefined>(
    // eslint-disable-next-line unicorn/no-useless-undefined -- the neutral `useState` requires an explicit initial value
    undefined,
  );

  /** Build the schema definition from the given working state. */
  const buildDefinition = (
    nextSteps: BuilderField[][],
    nextTitle: string,
    nextDescription: string,
    nextTitles: string[],
    nextDescriptions: string[],
    nextConditions: Array<FieldCondition | undefined>,
  ): SchemaFormDefinition =>
    fieldsToDefinition(wizard ? nextSteps : (nextSteps[0] ?? []), {
      wizard,
      title: nextTitle || undefined,
      description: nextDescription || undefined,
      stepTitles: nextTitles,
      stepDescriptions: nextDescriptions,
      stepConditions: nextConditions,
      stepCount: Math.max(1, nextSteps.length),
    });

  const definition = buildDefinition(steps, title, description, stepTitles, stepDescriptions, stepConditions);

  /** Commit a new step matrix (everything else unchanged) and emit the schema. */
  const commitSteps = (nextSteps: BuilderField[][]): void => {
    setSteps(nextSteps);
    properties.onUpdateModelValue?.(
      buildDefinition(nextSteps, title, description, stepTitles, stepDescriptions, stepConditions),
    );
  };

  // ─── Palette / canvas mutations ─────────────────────────────────────────────

  const addFromPalette = (type: FormFieldType): void => {
    if (disabled) return;
    const result = insertField(steps, type, { step: 0 });
    setSelectedId(result.id);
    commitSteps(result.steps);
  };

  const applyDrop = (target: InsertTarget): void => {
    const payload = dragReference.current;
    dragReference.current = undefined;
    setDropIndicator(undefined);
    setDraggingId(undefined);
    if (disabled || !payload) return;
    if (payload.kind === 'palette') {
      const result = insertField(steps, payload.type, target);
      setSelectedId(result.id);
      commitSteps(result.steps);
    } else {
      commitSteps(moveField(steps, payload.id, target));
    }
  };

  const onRemove = (id: string): void => {
    if (selectedId === id) setSelectedId(undefined);
    commitSteps(removeField(steps, id));
  };

  const onDuplicate = (id: string): void => {
    const result = duplicateField(steps, id);
    if (result.id) setSelectedId(result.id);
    commitSteps(result.steps);
  };

  const onAddChild = (parentId: string): void => {
    const result = addChild(steps, parentId);
    if (result.id) setSelectedId(result.id);
    commitSteps(result.steps);
  };

  const onUpdateField = (id: string, patch: Partial<BuilderField>): void => {
    commitSteps(updateField(steps, id, patch));
  };

  const onMoveFieldToStep = (id: string, step: number): void => {
    commitSteps(moveFieldToStep(steps, id, step));
  };

  // ─── Form / step metadata ───────────────────────────────────────────────────

  const updateTitle = (value: string): void => {
    setTitle(value);
    properties.onUpdateTitle?.(value);
    properties.onUpdateModelValue?.(
      buildDefinition(steps, value, description, stepTitles, stepDescriptions, stepConditions),
    );
  };

  const updateDescription = (value: string): void => {
    setDescription(value);
    properties.onUpdateDescription?.(value);
    properties.onUpdateModelValue?.(buildDefinition(steps, title, value, stepTitles, stepDescriptions, stepConditions));
  };

  const setStepMeta = (
    nextTitles: string[],
    nextDescriptions: string[],
    nextConditions: Array<FieldCondition | undefined>,
  ): void => {
    setStepTitles(nextTitles);
    setStepDescriptions(nextDescriptions);
    setStepConditions(nextConditions);
    properties.onUpdateModelValue?.(
      buildDefinition(steps, title, description, nextTitles, nextDescriptions, nextConditions),
    );
  };

  const onAddStep = (): void => {
    commitSteps(addStep(steps));
  };

  const onRemoveStep = (index: number): void => {
    const nextSteps = removeStep(steps, index);
    const drop = <T,>(list: T[]): T[] => list.filter((_, index_) => index_ !== index);
    setStepTitles(drop(stepTitles));
    setStepDescriptions(drop(stepDescriptions));
    setStepConditions(drop(stepConditions));
    setSteps(nextSteps);
    properties.onUpdateModelValue?.(
      buildDefinition(nextSteps, title, description, drop(stepTitles), drop(stepDescriptions), drop(stepConditions)),
    );
  };

  // ─── Drag handlers ────────────────────────────────────────────────────────────

  const onPaletteDragStart = (type: FormFieldType) => (): void => {
    dragReference.current = { kind: 'palette', type };
  };

  const onFieldDragStart = (id: string) => (): void => {
    dragReference.current = { kind: 'field', id };
    setDraggingId(id);
  };

  /** Clear the drag-in-flight state (on drag-end, or when leaving the canvas). */
  const clearDropIndicator = (): void => {
    setDropIndicator(undefined);
    setDraggingId(undefined);
  };

  /** Whether two insert targets address the exact same slot. */
  const sameSlot = (a: InsertTarget | undefined, b: InsertTarget | undefined): boolean =>
    a?.parentId === b?.parentId && a?.index === b?.index && a?.step === b?.step;

  // Resolve the drop slot for a hovered row from the pointer's position within
  // it: the **top half** lands the field *before* the row, the **bottom half**
  // *after* it. Anchoring to each row's own midpoint keeps placement stable — it
  // no longer flips wildly as the inserted ghost reflows the list.
  const fieldDropTarget = (field: BuilderField, event: DragEvent): InsertTarget | undefined => {
    const base = locateTarget(steps, field.id);
    if (!base || base.index === undefined) return base;
    const row = event.currentTarget as HTMLElement | null;
    if (!row) return base;
    const rect = row.getBoundingClientRect();
    const after = event.clientY - rect.top > rect.height / 2;
    return after ? { ...base, index: base.index + 1 } : base;
  };

  // Hovering a field row places the ghost at the resolved (before/after) slot.
  // `stopPropagation` keeps the owning container's handler from overriding the
  // more specific position; the `sameSlot` guard avoids re-rendering on every
  // `dragover` tick while the resolved slot is unchanged.
  const onFieldDragOver =
    (field: BuilderField) =>
    (event: DragEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      if (disabled) return;
      const target = fieldDropTarget(field, event);
      if (target && !sameSlot(target, dropIndicator)) setDropIndicator(target);
    };

  // Hovering the empty area of a container (a step root or a field-set) places
  // the ghost at the end of that container (an append).
  const onContainerDragOver =
    (step: number, parentId?: string) =>
    (event: DragEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      if (disabled) return;
      const target: InsertTarget = { step, parentId };
      if (!sameSlot(target, dropIndicator)) setDropIndicator(target);
    };

  const onDropOnContainer =
    (step: number, parentId?: string) =>
    (event: DragEvent): void => {
      event.preventDefault();
      applyDrop({ step, parentId });
    };

  const onDropOnField =
    (field: BuilderField) =>
    (event: DragEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      const target = fieldDropTarget(field, event);
      if (target) applyDrop(target);
    };

  // The ghost row sits at the live `dropIndicator` slot, so its `drop` lands the
  // dragged field exactly there (its `dragover` keeps the indicator stable via
  // the module-level `holdGhostDragOver`).
  const onGhostDrop = (event: DragEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    if (dropIndicator) applyDrop(dropIndicator);
  };

  // A preview of the field being dragged (the moved field itself, or a palette
  // entry's descriptor) used to render the drop ghost as a faded clone of the
  // row it will become — rather than a bare placeholder.
  const draggedGhostField = (): { label: string; type: string } | undefined => {
    const payload = dragReference.current;
    if (!payload) return undefined;
    if (payload.kind === 'field') {
      const moved = findField(steps, payload.id);
      return moved ? { label: moved.label || moved.key, type: moved.type } : undefined;
    }
    const descriptor = fieldTypes.find((entry) => entry.type === payload.type);
    return { label: descriptor?.label ?? payload.type, type: payload.type };
  };

  /**
   * The drop-placement ghost: a faded, non-interactive clone of the field that
   * will land here (the same row markup, in a "disabled" state) so the author
   * previews the exact result. It is its own drop zone (`onGhostDrop`) and holds
   * the indicator stable while hovered (`holdGhostDragOver`).
   */
  const renderDropGhost = (key: string): MpElement => {
    const preview = draggedGhostField();
    return (
      <li
        key={`drop-ghost-${key}`}
        aria-hidden="true"
        className={[styles['base-form-builder__field'], styles['base-form-builder__field--ghost']]}
        onDragOver={holdGhostDragOver}
        onDrop={onGhostDrop}
      >
        <div className={styles['base-form-builder__field-row']}>
          <span className={styles['base-form-builder__field-select']}>
            <span
              aria-hidden="true"
              className={styles['base-form-builder__field-handle']}
            >
              ⠿
            </span>
            <BaseTypography
              as="span"
              color="inherit"
              variant="body-sm"
            >
              {preview?.label ?? 'New field'}
            </BaseTypography>
            {preview ? <span className={styles['base-form-builder__field-type']}>{preview.type}</span> : undefined}
          </span>
        </div>
      </li>
    );
  };

  // Render a container's child rows interleaved with the drop ghost at the
  // hovered slot (before a field, or appended at the end).
  const renderContainerChildren = (list: BuilderField[], step: number, parentId?: string): MpChild[] => {
    const nodes: MpChild[] = [];
    const scope = parentId ?? `step-${step}`;
    for (const [index, field] of list.entries()) {
      if (isGhostBefore(dropIndicator, parentId, step, index)) {
        nodes.push(renderDropGhost(`${scope}-${index}`));
      }
      nodes.push(renderRow(field, step));
    }
    if (isGhostAtEnd(dropIndicator, parentId, step, list.length)) {
      nodes.push(renderDropGhost(`${scope}-end`));
    }
    return nodes;
  };

  // ─── Render: palette ──────────────────────────────────────────────────────────

  const renderPalette = (): MpElement => (
    <section className={styles['base-form-builder__palette']}>
      <ul
        className={styles['base-form-builder__palette-list']}
        role="list"
      >
        {fieldTypes.map((descriptor) => (
          <li
            key={descriptor.type}
            aria-label={descriptor.label}
            className={styles['base-form-builder__palette-item']}
            draggable={!disabled}
            onDragEnd={clearDropIndicator}
            onDragStart={onPaletteDragStart(descriptor.type)}
          >
            <button
              className={styles['base-form-builder__palette-add']}
              disabled={disabled}
              type="button"
              onClick={() => addFromPalette(descriptor.type)}
            >
              <BaseTypography
                as="span"
                color="inherit"
                variant="body-sm"
              >
                {descriptor.label}
              </BaseTypography>
              {descriptor.description ? (
                <BaseTypography
                  as="span"
                  color="secondary"
                  variant="caption"
                >
                  {descriptor.description}
                </BaseTypography>
              ) : undefined}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );

  // ─── Render: canvas rows (recursive) ────────────────────────────────────────

  const renderRow = (field: BuilderField, step: number): MpElement => {
    const isFieldset = field.type === 'fieldset';
    return (
      <li
        key={field.id}
        aria-current={field.id === selectedId ? 'true' : undefined}
        className={[
          styles['base-form-builder__field'],
          {
            [styles['base-form-builder__field--selected']]: field.id === selectedId,
            [styles['base-form-builder__field--dragging']]: field.id === draggingId,
          },
        ]}
        draggable={!disabled}
        onDragEnd={clearDropIndicator}
        onDragOver={onFieldDragOver(field)}
        onDragStart={onFieldDragStart(field.id)}
        onDrop={onDropOnField(field)}
      >
        <div className={styles['base-form-builder__field-row']}>
          <button
            className={styles['base-form-builder__field-select']}
            type="button"
            onClick={() => setSelectedId(field.id)}
          >
            <span
              aria-hidden="true"
              className={styles['base-form-builder__field-handle']}
            >
              ⠿
            </span>
            <BaseTypography
              as="span"
              color="inherit"
              variant="body-sm"
            >
              {field.label || field.key}
            </BaseTypography>
            <span className={styles['base-form-builder__field-type']}>{field.type}</span>
          </button>
          <div className={styles['base-form-builder__field-actions']}>
            <button
              aria-label={`Move ${field.label} up`}
              className={styles['base-form-builder__field-action']}
              disabled={disabled}
              type="button"
              onClick={() => commitSteps(shiftField(steps, field.id, -1))}
            >
              <span aria-hidden="true">↑</span>
            </button>
            <button
              aria-label={`Move ${field.label} down`}
              className={styles['base-form-builder__field-action']}
              disabled={disabled}
              type="button"
              onClick={() => commitSteps(shiftField(steps, field.id, 1))}
            >
              <span aria-hidden="true">↓</span>
            </button>
            {isFieldset ? (
              <button
                aria-label={`Add field to ${field.label}`}
                className={styles['base-form-builder__field-action']}
                disabled={disabled}
                type="button"
                onClick={() => onAddChild(field.id)}
              >
                <span aria-hidden="true">＋</span>
              </button>
            ) : undefined}
            <button
              aria-label={`Duplicate ${field.label}`}
              className={styles['base-form-builder__field-action']}
              disabled={disabled}
              type="button"
              onClick={() => onDuplicate(field.id)}
            >
              <span aria-hidden="true">⧉</span>
            </button>
            <button
              aria-label={`Remove ${field.label}`}
              className={styles['base-form-builder__field-remove']}
              disabled={disabled}
              type="button"
              onClick={() => onRemove(field.id)}
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        </div>
        {isFieldset ? (
          <ul
            className={styles['base-form-builder__nested']}
            role="list"
            onDragOver={onContainerDragOver(step, field.id)}
            onDrop={onDropOnContainer(step, field.id)}
          >
            {(field.children ?? []).length === 0 && !isGhostAtEnd(dropIndicator, field.id, step, 0) ? (
              <li className={styles['base-form-builder__nested-empty']}>
                <BaseTypography
                  as="span"
                  color="secondary"
                  variant="caption"
                >
                  Drop fields here
                </BaseTypography>
              </li>
            ) : undefined}
            {renderContainerChildren(field.children ?? [], step, field.id)}
          </ul>
        ) : undefined}
      </li>
    );
  };

  const renderStepList = (list: BuilderField[], step: number): MpElement => (
    <ul
      className={styles['base-form-builder__field-list']}
      role="list"
      onDragOver={onContainerDragOver(step)}
      onDrop={onDropOnContainer(step)}
    >
      {list.length === 0 && !isGhostAtEnd(dropIndicator, undefined, step, 0) ? (
        <li className={styles['base-form-builder__empty']}>
          <BaseTypography
            as="p"
            color="secondary"
            variant="body-sm"
          >
            Drag a field here, or click one in the palette.
          </BaseTypography>
        </li>
      ) : undefined}
      {renderContainerChildren(list, step)}
    </ul>
  );

  const renderCanvas = (): MpElement => (
    <div className={styles['base-form-builder__panel']}>
      {wizard
        ? steps.map((list, step) => (
            <div
              key={`step-${step}`}
              className={styles['base-form-builder__step']}
            >
              <BaseTypography
                as="h3"
                className={styles['base-form-builder__step-heading']}
                variant="label"
              >
                {stepTitles[step] || `Step ${step + 1}`}
              </BaseTypography>
              {renderStepList(list, step)}
            </div>
          ))
        : renderStepList(steps[0] ?? [], 0)}
    </div>
  );

  // ─── Render: condition editor ───────────────────────────────────────────────

  const renderConditionEditor = (
    value: FieldCondition | undefined,
    onChange: (next: FieldCondition | undefined) => void,
    legend: string,
    toggleLabel: string,
  ): MpElement => {
    const group = currentGroup(value);
    const enabled = value !== undefined;
    const emitGroup = (combinator: Combinator, leaves: FieldConditionLeaf[]): void => {
      onChange(leaves.length === 0 ? undefined : ({ [combinator]: leaves } as FieldCondition));
    };
    const updateLeaf = (index: number, part: { field?: string; operator?: string; value?: string }): void => {
      const existing = group.leaves[index];
      const field = part.field ?? existing.field;
      const operator = part.operator ?? leafOperator(existing);
      const raw = part.value ?? leafValue(existing);
      emitGroup(
        group.combinator,
        group.leaves.map((leaf, index_) => (index_ === index ? buildLeaf(field, operator, raw) : leaf)),
      );
    };
    return (
      <fieldset className={styles['base-form-builder__condition']}>
        <legend className={styles['base-form-builder__condition-legend']}>{legend}</legend>
        <BaseCheckbox
          disabled={disabled}
          label={toggleLabel}
          modelValue={enabled}
          onUpdateModelValue={(on: boolean | string[]) =>
            emitGroup('allOf', on === true ? [{ field: '', equals: '' }] : [])
          }
        />
        {enabled ? (
          <div className={styles['base-form-builder__condition-body']}>
            <BaseSelect
              disabled={disabled}
              label="Match"
              modelValue={group.combinator}
              options={COMBINATOR_OPTIONS}
              onUpdateModelValue={(next: string | number) => emitGroup(next as Combinator, group.leaves)}
            />
            {group.leaves.map((leaf, index) => (
              <div
                key={index}
                className={styles['base-form-builder__condition-rule']}
              >
                <BaseInput
                  disabled={disabled}
                  label={`Rule ${index + 1} field`}
                  modelValue={leaf.field}
                  placeholder="Field key"
                  onUpdateModelValue={(next: string | number) => updateLeaf(index, { field: String(next) })}
                />
                <BaseSelect
                  disabled={disabled}
                  label={`Rule ${index + 1} operator`}
                  modelValue={leafOperator(leaf)}
                  options={CONDITION_OPERATORS}
                  onUpdateModelValue={(next: string | number) => updateLeaf(index, { operator: String(next) })}
                />
                <BaseInput
                  disabled={disabled}
                  label={`Rule ${index + 1} value`}
                  modelValue={leafValue(leaf)}
                  placeholder="Value"
                  onUpdateModelValue={(next: string | number) => updateLeaf(index, { value: String(next) })}
                />
                <button
                  aria-label="Remove rule"
                  className={styles['base-form-builder__field-remove']}
                  disabled={disabled}
                  type="button"
                  onClick={() =>
                    emitGroup(
                      group.combinator,
                      group.leaves.filter((_, index_) => index_ !== index),
                    )
                  }
                >
                  <span aria-hidden="true">✕</span>
                </button>
              </div>
            ))}
            <BaseButton
              disabled={disabled}
              type="button"
              variant="secondary"
              onClick={() => emitGroup(group.combinator, [...group.leaves, { field: '', equals: '' }])}
            >
              Add rule
            </BaseButton>
          </div>
        ) : undefined}
      </fieldset>
    );
  };

  // ─── Render: properties inspector ──────────────────────────────────────────

  const renderOptionsEditor = (field: BuilderField): MpElement => {
    const setOptions = (options: BuilderFieldOption[]): void => onUpdateField(field.id, { options });
    return (
      <div className={styles['base-form-builder__options']}>
        <BaseTypography
          as="span"
          variant="label"
        >
          Options
        </BaseTypography>
        {field.options.map((option, index) => (
          <div
            key={index}
            className={styles['base-form-builder__option-row']}
          >
            <BaseInput
              disabled={disabled}
              label={`Option ${index + 1} label`}
              modelValue={option.label}
              placeholder="Label"
              onUpdateModelValue={(next: string | number) =>
                setOptions(field.options.map((o, index_) => (index_ === index ? { ...o, label: String(next) } : o)))
              }
            />
            <BaseInput
              disabled={disabled}
              label={`Option ${index + 1} value`}
              modelValue={option.value}
              placeholder="Value"
              onUpdateModelValue={(next: string | number) =>
                setOptions(field.options.map((o, index_) => (index_ === index ? { ...o, value: String(next) } : o)))
              }
            />
            <button
              aria-label={`Remove option ${index + 1}`}
              className={styles['base-form-builder__field-remove']}
              disabled={disabled}
              type="button"
              onClick={() => setOptions(field.options.filter((_, index_) => index_ !== index))}
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        ))}
        <BaseButton
          disabled={disabled}
          type="button"
          variant="secondary"
          onClick={() =>
            setOptions([
              ...field.options,
              { label: `Option ${field.options.length + 1}`, value: `option_${field.options.length + 1}` },
            ])
          }
        >
          Add option
        </BaseButton>
      </div>
    );
  };

  // `keyError`/`selectedStep` are resolved by the caller (`renderInspector`)
  // from the live `selectedId`/`steps` so the inspector's reactive reads happen
  // at slot-invocation time inside the host drawer's render — keeping the panel
  // in sync with the selected field.
  const renderProperties = (
    field: BuilderField,
    keyError: string | undefined,
    selectedStep: number | undefined,
  ): MpElement => (
    <div className={styles['base-form-builder__properties']}>
      <BaseSelect
        disabled={disabled}
        label="Field type"
        modelValue={field.type}
        options={fieldTypes.map((descriptor) => ({ label: descriptor.label, value: descriptor.type }))}
        onUpdateModelValue={(next: string | number) => onUpdateField(field.id, { type: next as FormFieldType })}
      />
      <BaseInput
        disabled={disabled}
        error={keyError}
        hint="The schema property name."
        label="Key"
        modelValue={field.key}
        onUpdateModelValue={(next: string | number) => onUpdateField(field.id, { key: String(next) })}
      />
      <BaseInput
        disabled={disabled}
        label="Label"
        modelValue={field.label}
        onUpdateModelValue={(next: string | number) => onUpdateField(field.id, { label: String(next) })}
      />
      <BaseInput
        disabled={disabled}
        label="Placeholder"
        modelValue={field.placeholder ?? ''}
        onUpdateModelValue={(next: string | number) => onUpdateField(field.id, { placeholder: String(next) })}
      />
      <BaseTextarea
        disabled={disabled}
        label="Hint"
        modelValue={field.hint ?? ''}
        rows={2}
        onUpdateModelValue={(next: string) => onUpdateField(field.id, { hint: next })}
      />
      <BaseSwitch
        disabled={disabled}
        label="Required"
        modelValue={field.required}
        onUpdateModelValue={(next: boolean) => onUpdateField(field.id, { required: next })}
      />
      <BaseSwitch
        disabled={disabled}
        label="Disabled"
        modelValue={field.disabled ?? false}
        onUpdateModelValue={(next: boolean) => onUpdateField(field.id, { disabled: next })}
      />
      {widgetHasOptions(field.type) ? renderOptionsEditor(field) : undefined}
      {isMultilineWidget(field.type) ? (
        <BaseNumberStepper
          disabled={disabled}
          label="Rows"
          modelValue={field.rows}
          onUpdateModelValue={(next?: number) => onUpdateField(field.id, { rows: next })}
        />
      ) : undefined}
      {isTextWidget(field.type) ? (
        <div className={styles['base-form-builder__numeric']}>
          <BaseNumberStepper
            disabled={disabled}
            label="Minimum length"
            modelValue={field.minLength}
            onUpdateModelValue={(next?: number) => onUpdateField(field.id, { minLength: next })}
          />
          <BaseNumberStepper
            disabled={disabled}
            label="Maximum length"
            modelValue={field.maxLength}
            onUpdateModelValue={(next?: number) => onUpdateField(field.id, { maxLength: next })}
          />
          <BaseInput
            disabled={disabled}
            hint="Regular expression the value must match."
            label="Pattern"
            modelValue={field.pattern ?? ''}
            onUpdateModelValue={(next: string | number) =>
              onUpdateField(field.id, { pattern: String(next) || undefined })
            }
          />
        </div>
      ) : undefined}
      {isNumberWidget(field.type) ? (
        <div className={styles['base-form-builder__numeric']}>
          <BaseNumberStepper
            disabled={disabled}
            label="Minimum"
            modelValue={field.minimum}
            onUpdateModelValue={(next?: number) => onUpdateField(field.id, { minimum: next })}
          />
          <BaseNumberStepper
            disabled={disabled}
            label="Maximum"
            modelValue={field.maximum}
            onUpdateModelValue={(next?: number) => onUpdateField(field.id, { maximum: next })}
          />
          {field.type === 'stepper' ? (
            <BaseNumberStepper
              disabled={disabled}
              label="Step amount"
              modelValue={field.stepAmount}
              onUpdateModelValue={(next?: number) => onUpdateField(field.id, { stepAmount: next })}
            />
          ) : undefined}
          <BaseSwitch
            disabled={disabled}
            label="Whole numbers only"
            modelValue={field.integer ?? false}
            onUpdateModelValue={(next: boolean) => onUpdateField(field.id, { integer: next })}
          />
          <BaseSwitch
            disabled={disabled}
            label="Disallow negative values"
            modelValue={field.unsigned ?? false}
            onUpdateModelValue={(next: boolean) => onUpdateField(field.id, { unsigned: next })}
          />
        </div>
      ) : undefined}
      {isDateWidget(field.type) ? (
        <div className={styles['base-form-builder__numeric']}>
          <BaseInput
            disabled={disabled}
            label="Earliest date"
            modelValue={field.minDate ?? ''}
            placeholder="YYYY-MM-DD"
            onUpdateModelValue={(next: string | number) =>
              onUpdateField(field.id, { minDate: String(next) || undefined })
            }
          />
          <BaseInput
            disabled={disabled}
            label="Latest date"
            modelValue={field.maxDate ?? ''}
            placeholder="YYYY-MM-DD"
            onUpdateModelValue={(next: string | number) =>
              onUpdateField(field.id, { maxDate: String(next) || undefined })
            }
          />
        </div>
      ) : undefined}
      {isTimeWidget(field.type) ? (
        <BaseSwitch
          disabled={disabled}
          label="Show seconds"
          modelValue={field.showSeconds ?? false}
          onUpdateModelValue={(next: boolean) => onUpdateField(field.id, { showSeconds: next })}
        />
      ) : undefined}
      {isFileWidget(field.type) ? (
        <div className={styles['base-form-builder__numeric']}>
          <BaseInput
            disabled={disabled}
            hint="Comma-separated MIME types or extensions (e.g. image/*, .pdf)."
            label="Accepted file types"
            modelValue={field.accept ?? ''}
            onUpdateModelValue={(next: string | number) =>
              onUpdateField(field.id, { accept: String(next) || undefined })
            }
          />
          <BaseSwitch
            disabled={disabled}
            label="Allow multiple files"
            modelValue={field.multiple ?? false}
            onUpdateModelValue={(next: boolean) => onUpdateField(field.id, { multiple: next })}
          />
        </div>
      ) : undefined}
      {isLocationWidget(field.type) ? (
        <BaseSelect
          disabled={disabled}
          label="Coordinate format"
          modelValue={field.locationFormat ?? 'dd'}
          options={LOCATION_FORMAT_OPTIONS}
          onUpdateModelValue={(next: string | number) =>
            onUpdateField(field.id, { locationFormat: next as LocationFormat })
          }
        />
      ) : undefined}
      {wizard && selectedStep !== undefined ? (
        <BaseSelect
          disabled={disabled}
          label="Wizard step"
          modelValue={selectedStep}
          options={steps.map((_, index) => ({ label: stepTitles[index] || `Step ${index + 1}`, value: index }))}
          onUpdateModelValue={(next: string | number) => onMoveFieldToStep(field.id, Number(next))}
        />
      ) : undefined}
      {renderConditionEditor(
        field.visibleWhen,
        (next) => onUpdateField(field.id, { visibleWhen: next }),
        'Conditional visibility',
        'Only show when…',
      )}
    </div>
  );

  const renderFormSettings = (): MpElement => (
    <div className={styles['base-form-builder__properties']}>
      <BaseInput
        disabled={disabled}
        label="Form title"
        modelValue={title}
        onUpdateModelValue={(next: string | number) => updateTitle(String(next))}
      />
      <BaseTextarea
        disabled={disabled}
        label="Form description"
        modelValue={description}
        rows={3}
        onUpdateModelValue={(next: string) => updateDescription(next)}
      />
    </div>
  );

  const renderInspector = (): MpElement => {
    // Resolve the selection here — inside the render the host drawer invokes for
    // its `end` slot — so reading `selectedId`/`steps` subscribes the drawer to
    // the selection and the panel re-renders to match the chosen field.
    const selectedField = selectedId ? findField(steps, selectedId) : undefined;
    const selectedStep = selectedId ? stepOf(steps, selectedId) : undefined;
    const keyError = selectedField
      ? fieldKeyError(selectedField.key, siblingKeysOf(steps, selectedField.id))
      : undefined;
    return (
      <div className={styles['base-form-builder__inspector']}>
        <BaseTypography
          as="h2"
          className={styles['base-form-builder__inspector-title']}
          variant="label"
          weight="semibold"
        >
          {selectedField ? 'Field properties' : 'Form settings'}
        </BaseTypography>
        {selectedField ? renderProperties(selectedField, keyError, selectedStep) : renderFormSettings()}
      </div>
    );
  };

  // ─── Render: wizard steps editor ────────────────────────────────────────────

  const renderSteps = (): MpElement => (
    <div className={styles['base-form-builder__panel']}>
      {steps.map((_, index) => (
        <div
          key={`step-config-${index}`}
          className={styles['base-form-builder__step-config']}
        >
          <BaseInput
            disabled={disabled}
            label={`Step ${index + 1} title`}
            modelValue={stepTitles[index] ?? ''}
            onUpdateModelValue={(next: string | number) =>
              setStepMeta(
                stepTitles.map((value, index_) => (index_ === index ? String(next) : value)),
                stepDescriptions,
                stepConditions,
              )
            }
          />
          <BaseInput
            disabled={disabled}
            label={`Step ${index + 1} description`}
            modelValue={stepDescriptions[index] ?? ''}
            onUpdateModelValue={(next: string | number) =>
              setStepMeta(
                stepTitles,
                stepDescriptions.map((value, index_) => (index_ === index ? String(next) : value)),
                stepConditions,
              )
            }
          />
          {renderConditionEditor(
            stepConditions[index],
            (next) =>
              setStepMeta(
                stepTitles,
                stepDescriptions,
                stepConditions.map((value, index_) => (index_ === index ? next : value)),
              ),
            'Show this step when…',
            'Conditional step',
          )}
          <BaseButton
            disabled={disabled || steps.length <= 1}
            type="button"
            variant="secondary"
            onClick={() => onRemoveStep(index)}
          >
            Remove step
          </BaseButton>
        </div>
      ))}
      <BaseButton
        disabled={disabled}
        type="button"
        variant="primary"
        onClick={onAddStep}
      >
        Add step
      </BaseButton>
    </div>
  );

  // ─── Render: tabbed centre ──────────────────────────────────────────────────

  const hasFields = steps.some((list) => list.length > 0);

  const tabs: TabItem[] = [
    { id: 'editor', label: 'Editor' },
    ...(wizard ? [{ id: 'steps', label: 'Steps' }] : []),
    { id: 'preview', label: 'Preview' },
    { id: 'schema', label: 'Schema' },
  ];

  const renderPanel = (tabId: string): MpChild => {
    switch (tabId) {
      case 'steps': {
        return renderSteps();
      }
      case 'preview': {
        return (
          <div className={styles['base-form-builder__panel']}>
            {hasFields ? (
              <BaseSchemaForm schema={definition} />
            ) : (
              <BaseTypography
                as="p"
                color="secondary"
                variant="body-sm"
              >
                Add a field to preview the form.
              </BaseTypography>
            )}
          </div>
        );
      }
      case 'schema': {
        return (
          <div className={styles['base-form-builder__panel']}>
            <BaseCodeBlock
              code={JSON.stringify(definition, undefined, 2)}
              language="json"
              maxHeight="60vh"
              showLineNumbers={true}
            />
          </div>
        );
      }
      default: {
        return renderCanvas();
      }
    }
  };

  return (
    <div
      aria-disabled={disabled ? 'true' : undefined}
      className={[
        styles['base-form-builder'],
        sizeStyles[`base-size--${size}`],
        {
          [styles['base-form-builder--disabled']]: disabled,
        },
      ]}
    >
      <BaseVerticalLayout
        endDraggable={endDraggable}
        endSize="lg"
        endTitle="Field properties"
        startDraggable={startDraggable}
        startSize="md"
        startTitle="Field palette"
      >
        <div slot="start">{renderPalette()}</div>
        <div slot="end">{renderInspector()}</div>
        <BaseTabs
          modelValue={activeTab}
          panel={(scope) => renderPanel(scope.tab.id)}
          tabs={tabs}
          variant="pill"
          onUpdateModelValue={(next: string) => setActiveTab(next)}
        />
      </BaseVerticalLayout>
    </div>
  );
}
