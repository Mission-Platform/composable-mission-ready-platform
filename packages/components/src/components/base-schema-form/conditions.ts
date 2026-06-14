// ─── Conditional field blocks ─────────────────────────────────────────────────
//
// Pure, framework-agnostic evaluation of the `ui.visibleWhen` conditions that
// drive conditional field/field-set visibility.  A condition is either a single
// leaf comparison against one field's value, or a boolean combinator
// (`allOf` / `anyOf` / `oneOf`) of nested conditions — mirroring JSON Schema's
// own keywords.  Keeping this free of Vue reactivity makes it trivial to
// unit-test and reuse in both the renderer and the validator.

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
  const typeChecks: { [key: string]: (v: unknown) => boolean } = {
    undefined: () => false,
    object: v => v === null ? false : Array.isArray(v) ? v.length > 0 : true,
    string: v => (v as string).length > 0,
    boolean: v => v as boolean,
    default: () => true,
  };
  const check = typeChecks[typeof value] || typeChecks.default;
  return check(value);
}

/** Coerce a value to a finite number, or `undefined` when not numeric. */
function toNumber(value: unknown): number | undefined {
  const handlers: Record<string, (v: any) => number | undefined> = {
    number: (v) => Number.isFinite(v) ? v : undefined,
    string: (v) => {
      if (v.trim() === '') return undefined;
      const parsed = Number(v);
      return Number.isNaN(parsed) ? undefined : parsed;
    },
  };

  const handler = handlers[typeof value];
  return handler ? handler(value as any) : undefined;
}

/** Evaluate a single leaf comparison against the current form values. */
function evaluateLeaf(leaf: FieldConditionLeaf, values: FormValues): boolean {
  const value = valueAtPath(values, leaf.field);

  const checks: Record<string, (val: any, cond: any) => boolean> = {
    equals: (val, cond) => val === cond,
    notEquals: (val, cond) => val !== cond,
    in: (val, cond: Array<string | number | boolean>) => cond.includes(val),
    contains: (val, cond) => Array.isArray(val) && val.includes(cond),
    truthy: (val, cond: boolean) => isFilled(val) === cond,
  };

  for (const [key, checker] of Object.entries(checks)) {
    const cond = (leaf as any)[key];
    if (cond !== undefined && !checker(value, cond)) {
      return false;
    }
  }

  const numericComparators: Record<string, (num: number, cond: number) => boolean> = {
    gt: (num, cond) => num > cond,
    gte: (num, cond) => num >= cond,
    lt: (num, cond) => num < cond,
    lte: (num, cond) => num <= cond,
  };

  if (leaf.gt !== undefined || leaf.gte !== undefined || leaf.lt !== undefined || leaf.lte !== undefined) {
    const numeric = toNumber(value);
    if (numeric === undefined) {
      return false;
    }
    for (const [key, checker] of Object.entries(numericComparators)) {
      const cond = (leaf as any)[key];
      if (cond !== undefined && !checker(numeric, cond)) {
        return false;
      }
    }
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
  if (!isGroup(condition)) {
    return evaluateLeaf(condition, values);
  }

  const checks: Record<'allOf' | 'anyOf' | 'oneOf', (children: FieldCondition[]) => boolean> = {
    allOf: (children) => children.every((child) => evaluateCondition(child, values)),
    anyOf: (children) => children.some((child) => evaluateCondition(child, values)),
    oneOf: (children) => children.filter((child) => evaluateCondition(child, values)).length === 1,
  };

  for (const key of ['allOf', 'anyOf', 'oneOf'] as const) {
    const children = condition[key];
    if (children && !checks[key](children)) {
      return false;
    }
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
