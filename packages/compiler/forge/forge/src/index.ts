/**
 * `@mission-platform/forge` — a tiny, dependency-free "write once, run on Vue
 * and React" layer.
 *
 * This package provides only the framework-neutral primitives:
 *
 * - the classic JSX factory {@link h} (+ {@link Fragment}) that builds a
 *   serialisable {@link MpElement} tree, and
 * - the per-framework adapters behind the `./react` and `./vue` subpath
 *   exports (`toReactComponent` / `toVueComponent`).
 *
 * Components are authored once in JSX in a consuming package (see
 * `@mission-platform/components`) and rendered through the adapters:
 *
 * ```ts
 * import { toReactComponent } from '@mission-platform/forge/react';
 * import { toVueComponent } from '@mission-platform/forge/vue';
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
