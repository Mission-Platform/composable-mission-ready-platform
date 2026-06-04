import { useId as useVueId } from 'vue';

/**
 * Returns a stable element ID.  If the caller passes an explicit `id` prop,
 * that value is used as-is.  Otherwise a unique `mp-{id}` string is generated
 * so that label/input associations are always valid even when the consumer
 * does not supply an id.
 */
export function useId(explicitId: string | undefined): { id: string } {
  const id = explicitId ?? useVueId();
  return { id };
}
