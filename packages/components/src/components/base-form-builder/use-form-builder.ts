// ─── useFormBuilder ──────────────────────────────────────────────────────────
//
// The single source of truth for `BaseFormBuilder`. It owns the working
// {@link BuilderField} tree, the current selection, and the wizard step
// metadata, and exposes a small, intention-revealing set of mutations
// (add / remove / move / duplicate / nest). Every component in the builder is a
// thin, controlled view over this state — they render it and call these methods,
// so all tree manipulation lives in exactly one, unit-testable place.

import { computed, ref, toValue, type MaybeRefOrGetter, type Ref } from 'vue';

import {
  createField,
  fieldsToDefinition,
  schemaStepConditions,
  schemaStepDescriptions,
  schemaStepTitles,
  schemaToFields,
  widgetHasOptions,
} from './form-schema';

import type { BuilderField, FieldCondition, FormFieldType, SchemaFormDefinition } from './types';

/** Configuration passed to {@link useFormBuilder}. */
export interface UseFormBuilderConfig {
  /** Getter for the builder's wizard mode (emits a multi-step definition). */
  wizard: MaybeRefOrGetter<boolean>;
  /** Getter for the form title written into the generated schema. */
  title: MaybeRefOrGetter<string | undefined>;
  /** Getter for the form description written into the generated schema. */
  description: MaybeRefOrGetter<string | undefined>;
}

/** A located field together with the container array that holds it. */
interface Located {
  /** The sibling list that owns the field. */
  list: BuilderField[];
  /** The field's index within that list. */
  index: number;
  /** The field itself. */
  field: BuilderField;
}

/** Where a field should be inserted on the canvas. */
export interface InsertTarget {
  /** Owning field-set id, or `undefined` for the root canvas. */
  parentId?: string;
  /** Insertion index within the container (appends when omitted). */
  index?: number;
  /** Wizard step to assign (top-level fields only). */
  step?: number;
}

/** The public surface returned by {@link useFormBuilder}. */
export interface UseFormBuilder {
  /**
   * The working field tree. In wizard mode this is a per-step matrix
   * (`BuilderField[][]`, one inner list per step); otherwise it is the flat
   * top-level list (`BuilderField[]`). Field sets nest via `children`.
   */
  fields: Ref<BuilderField[] | BuilderField[][]>;
  /** The id of the currently selected field, or `undefined`. */
  selectedId: Ref<string | undefined>;
  /** The currently selected field, resolved from {@link selectedId}. */
  selectedField: Ref<BuilderField | undefined>;
  /**
   * The wizard step (zero-based) the selected field belongs to, or `undefined`
   * when nothing is selected or the selection is a nested (non-top-level) field.
   */
  selectedStep: Ref<number | undefined>;
  /** Per-step titles (wizard mode). */
  stepTitles: Ref<string[]>;
  /** Per-step descriptions (wizard mode). */
  stepDescriptions: Ref<string[]>;
  /** Per-step conditional-visibility rules (wizard mode). */
  stepConditions: Ref<Array<FieldCondition | undefined>>;
  /** The number of wizard steps (`≥ 1`). */
  stepCount: Ref<number>;
  /** The generated {@link SchemaFormDefinition}, kept in sync with the tree. */
  definition: Ref<SchemaFormDefinition>;
  /** Replaces the entire builder state from a schema definition. */
  load: (definition: SchemaFormDefinition | undefined) => void;
  /** Selects a field (or clears the selection with `undefined`). */
  select: (id?: string) => void;
  /** Creates a field of `type` and appends it to a container. Returns the new id. */
  addField: (type: FormFieldType, target?: InsertTarget) => string;
  /** Inserts a brand-new field of `type` at a precise canvas position. */
  insertField: (type: FormFieldType, target: InsertTarget) => string;
  /** Moves an existing field into a new container / position. */
  moveField: (id: string, target: InsertTarget) => void;
  /** Moves a top-level field to the wizard step at `step` (wizard mode). */
  moveFieldToStep: (id: string, step: number) => void;
  /** Reorders a field one position up within its own container. */
  moveUp: (id: string) => void;
  /** Reorders a field one position down within its own container. */
  moveDown: (id: string) => void;
  /** Merges a partial patch into the field with the given id. */
  updateField: (id: string, patch: Partial<BuilderField>) => void;
  /** Removes a field (and clears the selection if it was selected). */
  removeField: (id: string) => void;
  /** Duplicates a field (deep clone with fresh ids/keys) right after the original. */
  duplicateField: (id: string) => void;
  /** Appends a new child field to the field set with the given id. */
  addChild: (parentId: string) => void;
  /** Appends a new (empty) wizard step. */
  addStep: () => void;
  /** Removes the wizard step at `index`, reflowing later steps and their fields. */
  removeStep: (index: number) => void;
  /** Sets the title of the wizard step at `index`. */
  setStepTitle: (index: number, title: string) => void;
  /** Sets the description of the wizard step at `index`. */
  setStepDescription: (index: number, description: string) => void;
  /** Sets the conditional-visibility rule of the wizard step at `index`. */
  setStepCondition: (index: number, condition: FieldCondition | undefined) => void;
}

/** Recursively walks a single list, returning the field with `id` and its container. */
function locateInList(list: BuilderField[], id: string): Located | undefined {
  for (let index = 0; index < list.length; index += 1) {
    const field = list[index];
    if (field.id === id) return { list, index, field };
    if (field.children) {
      const nested = locateInList(field.children, id);
      if (nested) return nested;
    }
  }
  return undefined;
}

/** Walks every wizard step, returning the field with `id` and its container. */
function locate(steps: BuilderField[][], id: string): Located | undefined {
  for (const list of steps) {
    const found = locateInList(list, id);
    if (found) return found;
  }
  return undefined;
}

/**
 * Returns the container array for a drop target. A `parentId` resolves to that
 * field set's `children`; otherwise the root list of the given wizard `step`
 * (clamped to the existing range).
 */
function containerFor(steps: BuilderField[][], parentId?: string, step = 0): BuilderField[] | undefined {
  if (parentId) {
    const located = locate(steps, parentId);
    if (!located || !located.field.children) return undefined;
    return located.field.children;
  }
  const clamped = Math.max(0, Math.min(step, steps.length - 1));
  return steps[clamped];
}

/** The keys used by a list's fields, optionally excluding one field id. */
function siblingKeys(list: BuilderField[], exceptId?: string): string[] {
  return list.filter((field) => field.id !== exceptId).map((field) => field.key);
}

/** Deep-clones a field subtree, assigning fresh ids and de-duplicated keys. */
function cloneField(field: BuilderField, usedKeys: Iterable<string>): BuilderField {
  const fresh = createField({ type: field.type, key: field.key, label: field.label, usedKeys });
  // A JSON round-trip strips Vue's reactive proxy (which `structuredClone`
  // cannot clone) and deep-copies the plain, JSON-serialisable field data.
  const { children, ...rest } = field;
  const clone: BuilderField = {
    // `structuredClone` throws on Vue's reactive proxy, so a JSON round-trip is
    // used deliberately to both strip reactivity and deep-copy the plain data.
    // eslint-disable-next-line unicorn/prefer-structured-clone
    ...(JSON.parse(JSON.stringify(rest)) as BuilderField),
    id: fresh.id,
    key: fresh.key,
  };
  if (children) {
    const childKeys: string[] = [];
    clone.children = children.map((child) => {
      const childClone = cloneField(child, childKeys);
      childKeys.push(childClone.key);
      return childClone;
    });
  }
  return clone;
}

/** Whether `candidateId` is a descendant (a child at any depth) of `field`. */
function isDescendant(field: BuilderField, candidateId: string): boolean {
  if (!field.children) return false;
  return field.children.some((child) => child.id === candidateId || isDescendant(child, candidateId));
}

/** Whether moving field `id` into `parentId` would nest a field set inside itself. */
function wouldNestInSelf(field: BuilderField, id: string, parentId: string | undefined): boolean {
  if (!parentId) return false;
  return parentId === id || isDescendant(field, parentId);
}

/**
 * The insertion index within `destination`, clamped to its bounds and adjusted
 * for the field just spliced out of the same container.
 */
function adjustedIndex(source: Located, destination: BuilderField[], requested: number | undefined): number {
  let index = requested ?? destination.length;
  // Account for the just-removed item when reordering within one container.
  if (source.list === destination && source.index < index) index -= 1;
  return Math.max(0, Math.min(index, destination.length));
}

/** Reconciles type-dependent state (children / starter options) after a type change. */
function reconcileType(field: BuilderField, type: FormFieldType): void {
  field.children = type === 'fieldset' ? (field.children ?? []) : undefined;
  if (widgetHasOptions(type) && field.options.length === 0) {
    field.options = [
      { label: 'Option 1', value: 'option_1' },
      { label: 'Option 2', value: 'option_2' },
    ];
  }
}

/**
 * Creates the form-builder state machine. See {@link UseFormBuilder} for the
 * full returned API.
 */
export function useFormBuilder(config: UseFormBuilderConfig): UseFormBuilder {
  // The canonical working state: one inner list per wizard step. Single-step
  // forms simply keep a single step (`steps[0]`), so the same tree operations
  // work in both modes without storing a step index on each field.
  const steps = ref<BuilderField[][]>([[]]);
  const selectedId = ref<string | undefined>();
  const stepTitles = ref<string[]>([]);
  const stepDescriptions = ref<string[]>([]);
  const stepConditions = ref<Array<FieldCondition | undefined>>([]);

  // The public field tree: the per-step matrix in wizard mode, the flat
  // top-level list otherwise.
  const fields = computed<BuilderField[] | BuilderField[][]>(() =>
    toValue(config.wizard) ? steps.value : (steps.value[0] ?? []),
  );

  const stepCount = computed(() => Math.max(1, steps.value.length));

  const selectedField = computed(() => (selectedId.value ? locate(steps.value, selectedId.value)?.field : undefined));

  const selectedStep = computed<number | undefined>(() => {
    const id = selectedId.value;
    const index = id ? steps.value.findIndex((list) => list.some((field) => field.id === id)) : -1;
    return index === -1 ? undefined : index;
  });

  const definition = computed<SchemaFormDefinition>(() =>
    fieldsToDefinition(fields.value, {
      wizard: toValue(config.wizard),
      title: toValue(config.title),
      description: toValue(config.description),
      stepTitles: stepTitles.value,
      stepDescriptions: stepDescriptions.value,
      stepConditions: stepConditions.value,
      stepCount: stepCount.value,
    }),
  );

  /** Replaces the entire builder state from a schema definition. */
  function load(next: SchemaFormDefinition | undefined): void {
    const loaded = schemaToFields(next);
    if (Array.isArray(next)) {
      const matrix = loaded as BuilderField[][];
      steps.value = matrix.length > 0 ? matrix : [[]];
    } else {
      steps.value = [loaded as BuilderField[]];
    }
    stepTitles.value = schemaStepTitles(next);
    stepDescriptions.value = schemaStepDescriptions(next);
    stepConditions.value = schemaStepConditions(next);
    if (selectedId.value && !locate(steps.value, selectedId.value)) selectedId.value = undefined;
  }

  /** Selects a field (or clears the selection with `undefined`). */
  function select(id?: string): void {
    selectedId.value = id;
  }

  /** Inserts a brand-new field of `type` at a precise canvas position. */
  function insertField(type: FormFieldType, target: InsertTarget): string {
    const container = containerFor(steps.value, target.parentId, target.step ?? 0) ?? steps.value[0];
    const field = createField({ type, usedKeys: siblingKeys(container) });
    const index = target.index ?? container.length;
    container.splice(Math.max(0, Math.min(index, container.length)), 0, field);
    selectedId.value = field.id;
    return field.id;
  }

  /** Creates a field of `type` and appends it to a container. Returns the new id. */
  function addField(type: FormFieldType, target: InsertTarget = {}): string {
    return insertField(type, target);
  }

  /** Moves an existing field into a new container / position. */
  function moveField(id: string, target: InsertTarget): void {
    const source = locate(steps.value, id);
    if (!source) return;
    const destination = containerFor(steps.value, target.parentId, target.step ?? 0);
    if (!destination) return;
    // Disallow nesting a field set into itself or its own descendants.
    if (wouldNestInSelf(source.field, id, target.parentId)) return;
    const [moved] = source.list.splice(source.index, 1);
    destination.splice(adjustedIndex(source, destination, target.index), 0, moved);
  }

  /** Moves a top-level field to the wizard step at `step` (wizard mode). */
  function moveFieldToStep(id: string, step: number): void {
    const source = locate(steps.value, id);
    if (!source) return;
    const clamped = Math.max(0, Math.min(step, steps.value.length - 1));
    const destination = steps.value[clamped];
    if (!destination || source.list === destination) return;
    const [moved] = source.list.splice(source.index, 1);
    destination.push(moved);
  }

  /** Swaps a field one slot in `delta` direction within its own container. */
  function shift(id: string, delta: -1 | 1): void {
    const located = locate(steps.value, id);
    if (!located) return;
    const { list, index } = located;

    // Each wizard step is its own list, so a neighbour swap can never jump a
    // field across a step boundary (nor out of its field set).
    const swap = index + delta;
    if (swap < 0 || swap >= list.length) return;

    [list[index], list[swap]] = [list[swap], list[index]];
  }

  /** Reorders a field one position up within its own container. */
  function moveUp(id: string): void {
    shift(id, -1);
  }

  /** Reorders a field one position down within its own container. */
  function moveDown(id: string): void {
    shift(id, 1);
  }

  /** Merges a partial patch into the field with the given id. */
  function updateField(id: string, patch: Partial<BuilderField>): void {
    const located = locate(steps.value, id);
    if (!located) return;
    Object.assign(located.field, patch);
    // Keep type-dependent state (children / starter options) coherent.
    if (patch.type) reconcileType(located.field, patch.type);
  }

  /** Removes a field (and clears the selection if it was selected). */
  function removeField(id: string): void {
    const located = locate(steps.value, id);
    if (!located) return;
    located.list.splice(located.index, 1);
    if (selectedId.value === id) selectedId.value = undefined;
  }

  /** Duplicates a field (deep clone with fresh ids/keys) right after the original. */
  function duplicateField(id: string): void {
    const located = locate(steps.value, id);
    if (!located) return;
    const clone = cloneField(located.field, siblingKeys(located.list));
    located.list.splice(located.index + 1, 0, clone);
    selectedId.value = clone.id;
  }

  /** Appends a new child field to the field set with the given id. */
  function addChild(parentId: string): void {
    const container = containerFor(steps.value, parentId);
    if (!container) return;
    const field = createField({ type: 'text', usedKeys: siblingKeys(container) });
    container.push(field);
    selectedId.value = field.id;
  }

  /** Appends a new (empty) wizard step. */
  function addStep(): void {
    steps.value.push([]);
  }

  /** Removes the wizard step at `index`, reflowing later steps and their fields. */
  function removeStep(index: number): void {
    if (steps.value.length <= 1) return;
    const [removed] = steps.value.splice(index, 1);
    // Reflow fields: drop those on the removed step onto the previous one.
    const target = Math.max(0, index - 1);
    if (removed?.length) steps.value[target].push(...removed);
    stepTitles.value.splice(index, 1);
    stepDescriptions.value.splice(index, 1);
    stepConditions.value.splice(index, 1);
  }

  /** Sets the title of the wizard step at `index`. */
  function setStepTitle(index: number, title: string): void {
    const next = [...stepTitles.value];
    next[index] = title;
    stepTitles.value = next;
  }

  /** Sets the description of the wizard step at `index`. */
  function setStepDescription(index: number, description: string): void {
    const next = [...stepDescriptions.value];
    next[index] = description;
    stepDescriptions.value = next;
  }

  /** Sets the conditional-visibility rule of the wizard step at `index`. */
  function setStepCondition(index: number, condition: FieldCondition | undefined): void {
    const next = [...stepConditions.value];
    next[index] = condition;
    stepConditions.value = next;
  }

  return {
    fields,
    selectedId,
    selectedField,
    selectedStep,
    stepTitles,
    stepDescriptions,
    stepConditions,
    stepCount,
    definition,
    load,
    select,
    addField,
    insertField,
    moveField,
    moveFieldToStep,
    moveUp,
    moveDown,
    updateField,
    removeField,
    duplicateField,
    addChild,
    addStep,
    removeStep,
    setStepTitle,
    setStepDescription,
    setStepCondition,
  };
}
