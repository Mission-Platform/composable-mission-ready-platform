// ─── Form-builder tree operations ─────────────────────────────────────────────
//
// Pure, framework-agnostic operations over the builder's working state — a
// per-step matrix of {@link BuilderField} trees (`BuilderField[][]`, one inner
// list per wizard step; a single-step form keeps just `steps[0]`). Field sets
// nest via `children`.
//
// These mirror the mutation semantics of the Vue `useFormBuilder`, but are
// **immutable**: each op clones the matrix and returns a fresh one, so the
// neutral `useState`-driven `ForgeFormBuilder` sees a new reference (and React/Vue
// re-render) without mutating the caller's state in place. The clone-then-mutate
// approach reuses the exact, proven Vue logic.

import { createField, widgetHasOptions } from '@mission-platform/forms-core';

import type { BuilderField, FormFieldType } from '@mission-platform/forms-core';

/** Where a field should be inserted on the canvas. */
export interface InsertTarget {
  /** Owning field-set id, or `undefined` for the root canvas. */
  parentId?: string;
  /** Insertion index within the container (appends when omitted). */
  index?: number;
  /** Wizard step to assign (top-level fields only). */
  step?: number;
}

/** A located field together with the container array that holds it. */
interface Located {
  list: BuilderField[];
  index: number;
  field: BuilderField;
}

/** Deep-clone the step matrix (plain, JSON-serialisable field data only). */
function cloneSteps(steps: BuilderField[][]): BuilderField[][] {
  // eslint-disable-next-line unicorn/prefer-structured-clone
  return JSON.parse(JSON.stringify(steps)) as BuilderField[][];
}

/** Recursively walk one list, returning the field with `id` and its container. */
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

/** Walk every step, returning the field with `id` and its container. */
function locate(steps: BuilderField[][], id: string): Located | undefined {
  for (const list of steps) {
    const found = locateInList(list, id);
    if (found) return found;
  }
  return undefined;
}

/** The container array for a drop target (a field set's children, or a step). */
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

/** Deep-clone a field subtree, assigning fresh ids and de-duplicated keys. */
function cloneField(field: BuilderField, usedKeys: Iterable<string>): BuilderField {
  const fresh = createField({ type: field.type, key: field.key, label: field.label, usedKeys });
  const { children, ...rest } = field;
  const clone: BuilderField = {
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

/** Insertion index within `destination`, clamped and adjusted for a same-list move. */
function adjustedIndex(source: Located, destination: BuilderField[], requested: number | undefined): number {
  let index = requested ?? destination.length;
  if (source.list === destination && source.index < index) index -= 1;
  return Math.max(0, Math.min(index, destination.length));
}

/** Reconcile type-dependent state (children / starter options) after a type change. */
function reconcileType(field: BuilderField, type: FormFieldType): void {
  field.children = type === 'fieldset' ? (field.children ?? []) : undefined;
  if (widgetHasOptions(type) && field.options.length === 0) {
    field.options = [
      { label: 'Option 1', value: 'option_1' },
      { label: 'Option 2', value: 'option_2' },
    ];
  }
}

// ─── Read helpers ───────────────────────────────────────────────────────────

/** The field with `id` anywhere in the tree (across all steps). */
export function findField(steps: BuilderField[][], id: string): BuilderField | undefined {
  return locate(steps, id)?.field;
}

/** The zero-based wizard step the field with `id` belongs to (top-level only). */
export function stepOf(steps: BuilderField[][], id: string): number | undefined {
  const index = steps.findIndex((list) => list.some((field) => field.id === id));
  return index === -1 ? undefined : index;
}

/**
 * The container + position of the field with `id`: its owning field-set
 * `parentId` (or `undefined` at a step root), its `index` within that
 * container, and the wizard `step` of its root ancestor.
 */
export function locateTarget(steps: BuilderField[][], id: string): InsertTarget | undefined {
  function walk(list: BuilderField[], step: number, parentId?: string): InsertTarget | undefined {
    for (const [index, field] of list.entries()) {
      if (field.id === id) return { parentId, index, step };
      if (field.children) {
        const nested = walk(field.children, step, field.id);
        if (nested) return nested;
      }
    }
    return undefined;
  }
  for (const [step, step_] of steps.entries()) {
    const found = walk(step_, step);
    if (found) return found;
  }
  return undefined;
}

/**
 * Whether the two insert targets address the same container (the same owning
 * field-set `parentId`, and — for the root canvas — the same wizard `step`).
 */
function sameContainer(target: InsertTarget, parentId: string | undefined, step: number): boolean {
  if ((target.parentId ?? undefined) !== (parentId ?? undefined)) return false;
  // The wizard step only disambiguates root-level containers; a nested
  // field-set is uniquely identified by its `parentId`.
  if (parentId === undefined && (target.step ?? 0) !== step) return false;
  return true;
}

/**
 * Whether the drop-placement ghost should render **before** the field at
 * `index` of the container identified by (`parentId`, `step`) — true when the
 * drop indicator targets that exact slot. Pure, so it can be unit-tested
 * independently of the live drag interaction.
 */
export function isGhostBefore(
  indicator: InsertTarget | undefined,
  parentId: string | undefined,
  step: number,
  index: number,
): boolean {
  if (!indicator || !sameContainer(indicator, parentId, step)) return false;
  return indicator.index === index;
}

/**
 * Whether the drop-placement ghost should render at the **end** of the
 * container identified by (`parentId`, `step`) — true when the drop indicator
 * targets that container with no (or an out-of-range) index, i.e. an append.
 * Pure, so it can be unit-tested independently of the live drag interaction.
 */
export function isGhostAtEnd(
  indicator: InsertTarget | undefined,
  parentId: string | undefined,
  step: number,
  length: number,
): boolean {
  if (!indicator || !sameContainer(indicator, parentId, step)) return false;
  return indicator.index === undefined || indicator.index >= length;
}

/** The sibling keys of the field with `id` (the keys of its container's others). */
export function siblingKeysOf(steps: BuilderField[][], id: string): string[] {
  for (const list of steps) {
    const found = (function walk(candidate: BuilderField[]): string[] | undefined {
      if (candidate.some((field) => field.id === id)) {
        return candidate.filter((field) => field.id !== id).map((field) => field.key);
      }
      for (const field of candidate) {
        if (field.children) {
          const nested = walk(field.children);
          if (nested) return nested;
        }
      }
      return undefined;
    })(list);
    if (found) return found;
  }
  return [];
}

// ─── Immutable mutations ──────────────────────────────────────────────────────

/** Insert a brand-new field of `type` at a canvas position. Returns the new id. */
export function insertField(
  steps: BuilderField[][],
  type: FormFieldType,
  target: InsertTarget,
): { steps: BuilderField[][]; id: string } {
  const next = cloneSteps(steps);
  const container = containerFor(next, target.parentId, target.step ?? 0) ?? next[0];
  const field = createField({ type, usedKeys: siblingKeys(container) });
  const index = target.index ?? container.length;
  container.splice(Math.max(0, Math.min(index, container.length)), 0, field);
  return { steps: next, id: field.id };
}

/** Move an existing field into a new container / position. */
export function moveField(steps: BuilderField[][], id: string, target: InsertTarget): BuilderField[][] {
  const next = cloneSteps(steps);
  const source = locate(next, id);
  if (!source) return next;
  const destination = containerFor(next, target.parentId, target.step ?? 0);
  if (!destination || wouldNestInSelf(source.field, id, target.parentId)) return next;
  const [moved] = source.list.splice(source.index, 1);
  destination.splice(adjustedIndex(source, destination, target.index), 0, moved);
  return next;
}

/** Move a top-level field to the wizard step at `step`. */
export function moveFieldToStep(steps: BuilderField[][], id: string, step: number): BuilderField[][] {
  const next = cloneSteps(steps);
  const source = locate(next, id);
  if (!source) return next;
  const clamped = Math.max(0, Math.min(step, next.length - 1));
  const destination = next[clamped];
  if (!destination || source.list === destination) return next;
  const [moved] = source.list.splice(source.index, 1);
  destination.push(moved);
  return next;
}

/** Swap a field one slot in `delta` direction within its own container. */
export function shiftField(steps: BuilderField[][], id: string, delta: -1 | 1): BuilderField[][] {
  const next = cloneSteps(steps);
  const located = locate(next, id);
  if (!located) return next;
  const { list, index } = located;
  const swap = index + delta;
  if (swap < 0 || swap >= list.length) return next;
  [list[index], list[swap]] = [list[swap], list[index]];
  return next;
}

/** Merge a partial patch into the field with `id`. */
export function updateField(steps: BuilderField[][], id: string, patch: Partial<BuilderField>): BuilderField[][] {
  const next = cloneSteps(steps);
  const located = locate(next, id);
  if (!located) return next;
  Object.assign(located.field, patch);
  if (patch.type) reconcileType(located.field, patch.type);
  return next;
}

/** Remove the field with `id`. */
export function removeField(steps: BuilderField[][], id: string): BuilderField[][] {
  const next = cloneSteps(steps);
  const located = locate(next, id);
  if (located) located.list.splice(located.index, 1);
  return next;
}

/** Duplicate the field with `id` (deep clone, fresh ids/keys) right after it. */
export function duplicateField(steps: BuilderField[][], id: string): { steps: BuilderField[][]; id?: string } {
  const next = cloneSteps(steps);
  const located = locate(next, id);
  if (!located) return { steps: next };
  const clone = cloneField(located.field, siblingKeys(located.list));
  located.list.splice(located.index + 1, 0, clone);
  return { steps: next, id: clone.id };
}

/** Append a new child field to the field set with `parentId`. Returns the new id. */
export function addChild(steps: BuilderField[][], parentId: string): { steps: BuilderField[][]; id?: string } {
  const next = cloneSteps(steps);
  const container = containerFor(next, parentId);
  if (!container) return { steps: next };
  const field = createField({ type: 'text', usedKeys: siblingKeys(container) });
  container.push(field);
  return { steps: next, id: field.id };
}

/** Append a new (empty) wizard step. */
export function addStep(steps: BuilderField[][]): BuilderField[][] {
  return [...cloneSteps(steps), []];
}

/** Remove the wizard step at `index`, reflowing its fields onto the previous step. */
export function removeStep(steps: BuilderField[][], index: number): BuilderField[][] {
  if (steps.length <= 1) return cloneSteps(steps);
  const next = cloneSteps(steps);
  const [removed] = next.splice(index, 1);
  const target = Math.max(0, index - 1);
  if (removed?.length) next[target].push(...removed);
  return next;
}

export { type FieldCondition } from '@mission-platform/forms-core';
