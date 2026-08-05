/**
 * Resolve the `<Teleport>` target for a floating panel (dropdown / popover /
 * tooltip) given the `id` of its trigger element.
 *
 * Floating panels are portalled out of their normal DOM position so they escape
 * any `overflow`/stacking context. By default that target is `document.body`,
 * but that breaks when the trigger sits **inside an open native modal
 * `<dialog>`** (`BaseModal`/`BaseDialog`): a modal dialog renders everything
 * that is **not** part of its own subtree `inert`, so a panel portalled to
 * `body` ends up inert — invisible/non-interactive and mis-stacked — while the
 * (possibly nested) modal is open.
 *
 * Portalling the panel into the **nearest enclosing `<dialog>`** instead keeps
 * it inside that dialog's (top-layer) subtree: it is no longer inert and, once
 * promoted with the Popover API (`popover="manual"` + `showPopover()`), stacks
 * correctly above the dialog — including a dialog stacked on top of other
 * dialogs. When the trigger is not inside a dialog it falls back to
 * `document.body`, preserving the previous behaviour.
 *
 * The trigger is looked up by `id` (rather than by a captured ref) so the target
 * can be resolved **synchronously during render**: this keeps the panel teleported
 * to its final home from the very first render — avoiding a re-parent that would
 * drop the panel out of the browser top layer — and it is authored this way
 * because `@mission-platform/vite-plugin-forge` cannot compile a `ref.current` read
 * inside a render expression on the Vue target. On the server (`document`
 * undefined) it returns `'body'`, keeping SSR output framework-neutral.
 */
export function resolvePortalTarget(triggerId: string): Element | string {
  if (typeof document === 'undefined') {
    return 'body';
  }
  // `getElementById` (not `querySelector`) is deliberate: `useId` values can
  // contain characters that are invalid in a CSS id selector (e.g. React's
  // `:r0:`), and `getElementById` matches the id literally with no escaping —
  // it also does not depend on the `CSS` global, which is absent in some SSR /
  // test (jsdom) environments where `document` is nonetheless defined.
  // eslint-disable-next-line unicorn/prefer-query-selector
  const trigger = document.getElementById(triggerId);
  return trigger?.closest('dialog') ?? document.body;
}
