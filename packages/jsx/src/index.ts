/**
 * `@mission-platform/jsx` — a tiny, dependency-free "write once, run on Vue
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
 * import { toReactComponent } from '@mission-platform/jsx/react';
 * import { toVueComponent } from '@mission-platform/jsx/vue';
 * import { MyComponent } from '@mission-platform/components';
 *
 * const ReactComponent = toReactComponent(MyComponent);
 * const VueComponent = toVueComponent(MyComponent);
 * ```
 */
export {
  h,
  Fragment,
  classNames,
  isMpElement,
  Slot,
  hasSlot,
  Teleport,
  Transition,
  TransitionGroup,
  Dynamic,
  createContext,
  useContext,
  isContextProvider,
  MP_CONTEXT,
  type ClassValue,
  type MpChild,
  type MpComponent,
  type MpContext,
  type MpContextProvider,
  type MpContextProviderProperties,
  type MpDynamicProperties,
  type MpElement,
  type MpElementType,
  type MpProperties,
  type MpRenderProperty,
  type MpSlotContent,
  type MpSlotProperties,
  type MpTeleportProperties,
  type MpTransitionProperties,
  type MpTransitionGroupProperties,
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
