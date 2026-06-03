/**
 * Watches for route navigation and calls the provided `close` callback
 * whenever the current route changes. Designed to auto-close overlay
 * components (modals, sidebars, dialogs) on navigation.
 *
 * Vue Router is an optional peer dependency. When it is not installed or the
 * component is rendered outside a router context, this composable is a no-op.
 */
export declare function useRouterClose(close: () => void): void;
