// ─── Conditional field blocks ─────────────────────────────────────────────────
//
// Pure, framework-agnostic evaluation of the `ui.visibleWhen` conditions that
// drive conditional field/field-set visibility.  A condition is either a single
// leaf comparison against one field's value, or a boolean combinator
// (`allOf` / `anyOf` / `oneOf`) of nested conditions — mirroring JSON Schema's
// own keywords.  Keeping this free of any framework reactivity makes it trivial
// to unit-test and reuse in both the Vue and the JSX renderer + validator.

import type { FieldCondition, FieldConditionGroup, FieldConditionLeaf, FormValues } from './types';

/** Whether a condition node is a boolean combinator rather than a leaf. */
function isGroup(condition: FieldCondition): condition is FieldConditionGroup {
  return 'allOf' in condition || 'anyOf' in condition || 'oneOf' in condition;
}

/**
 * Read a (possibly dotted) field path out of the values bag, walking into
 * nested field-set objects.  Returns `undefined` when any segment is missing.
 */
function valueAtPath(values: FormValues, path: string): unknown {
  let cursor: unknown = values;
  for (const segment of path.split('.')) {
    if (typeof cursor !== 'object' || cursor === null) return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

/** Whether a value counts as "filled" for the `truthy` comparator. */
function isFilled(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'boolean') return value;
  return true;
}

/** Coerce a value to a finite number, or `undefined` when not numeric. */
function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

/** Evaluate a single leaf comparison against the current form values. */
function evaluateLeaf(leaf: FieldConditionLeaf, values: FormValues): boolean {
  const value = valueAtPath(values, leaf.field);

  if (leaf.equals !== undefined && value !== leaf.equals) return false;
  if (leaf.notEquals !== undefined && value === leaf.notEquals) return false;
  if (leaf.in !== undefined && !leaf.in.includes(value as string | number | boolean)) return false;
  if (leaf.contains !== undefined && (!Array.isArray(value) || !value.includes(leaf.contains))) return false;
  if (leaf.truthy !== undefined && isFilled(value) !== leaf.truthy) return false;

  if (leaf.gt !== undefined || leaf.gte !== undefined || leaf.lt !== undefined || leaf.lte !== undefined) {
    const numeric = toNumber(value);
    if (numeric === undefined) return false;
    if (leaf.gt !== undefined && !(numeric > leaf.gt)) return false;
    if (leaf.gte !== undefined && !(numeric >= leaf.gte)) return false;
    if (leaf.lt !== undefined && !(numeric < leaf.lt)) return false;
    if (leaf.lte !== undefined && !(numeric <= leaf.lte)) return false;
  }

  return true;
}

/**
 * Evaluate a {@link FieldCondition} against the form `values`, returning whether
 * it currently holds.  Combinator groups follow JSON Schema semantics:
 * `allOf` = AND, `anyOf` = OR, `oneOf` = exactly-one (XOR).  Multiple keywords
 * present on the same group are themselves AND-ed.  An empty group passes.
 */
export function evaluateCondition(condition: FieldCondition, values: FormValues): boolean {
  if (!isGroup(condition)) return evaluateLeaf(condition, values);

  if (condition.allOf && !condition.allOf.every((child) => evaluateCondition(child, values))) {
    return false;
  }
  if (condition.anyOf && !condition.anyOf.some((child) => evaluateCondition(child, values))) {
    return false;
  }
  if (condition.oneOf) {
    const passing = condition.oneOf.filter((child) => evaluateCondition(child, values)).length;
    if (passing !== 1) return false;
  }

  return true;
}

/**
 * Whether a field with an optional `visibleWhen` condition should currently be
 * rendered.  Fields without a condition are always visible.
 */
export function isFieldVisible(field: { visibleWhen?: FieldCondition }, values: FormValues): boolean {
  return field.visibleWhen ? evaluateCondition(field.visibleWhen, values) : true;
}
