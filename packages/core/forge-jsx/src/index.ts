/**
 * `@mission-platform/forge-jsx` — a tiny, dependency-free framework-neutral JSX
 * runtime.
 *
 * This package provides only the framework-neutral primitives:
 *
 * - the classic JSX factory {@link h} (+ {@link Fragment}) that builds a
 *   serialisable {@link MpElement} tree, and
 * - the framework-neutral primitives consumed by the separate
 *   `@mission-platform/forge-adapters` package.
 *
 * Components are authored once in JSX in a consuming package (see
 * `@mission-platform/components`) and rendered through the adapters:
 *
 * ```ts
 * import { toReactComponent } from '@mission-platform/forge-adapters/react';
 * import { toVueComponent } from '@mission-platform/forge-adapters/vue';
 * import { MyComponent } from '@mission-platform/components';
 *
 * const ReactComponent = toReactComponent(MyComponent);
 * const VueComponent = toVueComponent(MyComponent);
 * ```
 */
export {
  h,
  Fragment,
  Suspense,
  classNames,
  createForgeStyle,
  isMpElement,
  Slot,
  hasSlot,
  Teleport,
  Transition,
  TransitionGroup,
  Dynamic,
  HtmlContent,
  createContext,
  useContext,
  isContextProvider,
  MP_CONTEXT,
  type ClassValue,
  type CSSStyleProperties,
  type MpChild,
  type MpComponent,
  type MpContext,
  type MpContextProvider,
  type MpContextProviderProperties,
  type MpDynamicProperties,
  type HtmlContentProperties,
  type MpElement,
  type MpElementType,
  type MpPropertyBag,
  type MpReservedProperties,
  type MpRenderProperty,
  type MpSlotContent,
  type MpSlotProperties,
  type MpTeleportProperties,
  type MpTransitionProperties,
  type MpTransitionGroupProperties,
  type MpSuspenseProperties,
  type MpSuspenseChild,
} from './runtime';

export {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useId,
  type MpRef,
  type MpSetState,
  type MpEffectCallback,
  type MpEffectCleanup,
  type MpDependencyList,
} from './runtime';
