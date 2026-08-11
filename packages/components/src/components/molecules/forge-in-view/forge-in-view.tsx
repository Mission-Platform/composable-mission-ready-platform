import {
  classNames,
  Dynamic,
  h,
  type MpChild,
  type MpElement,
  useEffect,
  useRef,
  useState,
} from '@mission-platform/forge';

import sizeStyles from '../../../styles/size.module.scss';

export type InViewAnimation = 'fade' | 'slide-up' | 'slide-left' | 'slide-right' | 'scale' | 'none';
/** Size token — canonical 2xs → 2xl scale. */
export type InViewSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface InViewProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** 0–1 intersection ratio required to trigger. */
  threshold?: number;
  /** `IntersectionObserver` `rootMargin`. */
  rootMargin?: string;
  /** Reveal animation applied once the element enters the viewport. */
  animation?: InViewAnimation;
  /** CSS transition duration in ms. */
  duration?: number;
  /** CSS transition delay in ms. */
  delay?: number;
  /** Trigger only once and disconnect the observer (default `true`). */
  once?: boolean;
  /** Host element tag to render as the wrapper. */
  tag?: string;
  /** Size token controlling the wrapper's font scale. Defaults to `'md'`. */
  size?: InViewSize;
  /** Called when the element enters the viewport. */
  onEnter?: () => void;
  /** Called when the element leaves the viewport (only when `once` is false). */
  onLeave?: () => void;
}

/** Hidden (pre-reveal) style per animation. */
function hiddenStyle(animation: InViewAnimation): Record<string, string> {
  switch (animation) {
    case 'fade': {
      return { opacity: '0' };
    }
    case 'slide-up': {
      return { opacity: '0', transform: 'translateY(24px)' };
    }
    case 'slide-left': {
      return { opacity: '0', transform: 'translateX(24px)' };
    }
    case 'slide-right': {
      return { opacity: '0', transform: 'translateX(-24px)' };
    }
    case 'scale': {
      return { opacity: '0', transform: 'scale(0.92)' };
    }
    default: {
      return {};
    }
  }
}

/** Combined inline style applied to the wrapper for the current state. */
function wrapperStyle(
  animation: InViewAnimation,
  duration: number,
  delay: number,
  inView: boolean,
): Record<string, string> {
  if (animation === 'none') {
    return {};
  }
  const transition = {
    transition: `opacity ${duration}ms ease ${delay}ms, transform ${duration}ms ease ${delay}ms`,
  };
  const state = inView ? { opacity: '1', transform: 'none' } : hiddenStyle(animation);
  return { ...state, ...transition };
}

/**
 * `ForgeInView` — wraps content and uses `IntersectionObserver` to reveal it with
 * a configurable animation once it scrolls into view. Authored once in the
 * neutral JSX dialect; the cross-framework state/lifecycle is provided by the
 * neutral hooks (`useState`/`useRef`/`useEffect`), which compile to React hooks
 * or the Vue hook shim via `@mission-platform/vite-plugin-forge`.
 *
 * Note: unlike the Vue original it does not expose a scoped slot — reveal state
 * is conveyed purely through the wrapper's animated style and the
 * `onEnter`/`onLeave` callbacks, which map cleanly onto both frameworks.
 */
export function ForgeInView(properties: Readonly<InViewProperties>): MpElement {
  const {
    threshold = 0.15,
    rootMargin = '0px',
    animation = 'fade',
    duration = 500,
    delay = 0,
    once = true,
    tag = 'div',
    size = 'md',
    onEnter,
    onLeave,
  } = properties;

  const wrapperReference = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = wrapperReference.current;
    if (element === null || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setInView(true);
          onEnter?.();
          if (once) {
            observer.disconnect();
          }
        } else if (!once) {
          setInView(false);
          onLeave?.();
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return (
    <Dynamic
      is={tag}
      ref={wrapperReference}
      className={classNames('in-view', sizeStyles[`forge-size--${size}`])}
      style={wrapperStyle(animation, duration, delay, inView)}
    >
      {properties.children}
    </Dynamic>
  );
}
