import {
  h,
  type MpChild,
  type MpElement,
  type MpProperties,
  type MpRenderProperty,
  Slot,
  useEffect,
  useRef,
  useState,
} from '@mission-platform/forge';
import { IconChevron, IconPause, IconPlay } from '@mission-platform/icons';

import sizeStyles from '../../../styles/size.module.scss';

import styles from './base-carousel.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type CarouselSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Colour tone of the carousel — the canonical colour set (`neutral` is the plain treatment). */
export type CarouselVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';

/** A single slide descriptor. */
export interface CarouselSlide {
  /** Stable unique identifier (used as the list key). */
  id: string;
  /** Image URL rendered as the default slide content. */
  image?: string;
  /** Alt text for the image. */
  alt?: string;
  /** Text content rendered when no `image` is given. */
  content?: string;
}

/** The scope passed to the scoped `slide` slot. */
export interface CarouselSlideScope {
  /** The slide being rendered. */
  slide: CarouselSlide;
  /** The slide's index. */
  index: number;
}

export interface CarouselProperties extends MpProperties {
  /** Size token controlling the carousel's scale. Defaults to `'md'`. */
  size?: CarouselSize;
  /** Ordered list of slides. */
  slides: CarouselSlide[];
  /**
   * Index of the initially visible slide.
   * @model onUpdateModelValue
   */
  modelValue?: number;
  /** Show previous/next navigation controls. Defaults to `true`. */
  controls?: boolean;
  /** Show indicator dots below the carousel. Defaults to `true`. */
  indicators?: boolean;
  /** Colour tone of the controls/indicators. Defaults to `'neutral'`. */
  variant?: CarouselVariant;
  /** Allow the index to wrap past the first/last slide. Defaults to `true`. */
  loop?: boolean;
  /** Accessible label for the carousel region. */
  ariaLabel?: string;
  /** Automatically advance slides at a regular interval. */
  autoplay?: boolean;
  /** Autoplay interval in milliseconds. Defaults to `5000`. */
  interval?: number;
  /** Pause autoplay while the pointer hovers the carousel. Defaults to `true`. */
  pauseOnHover?: boolean;
  /** Minimum horizontal pointer movement (px) to register a swipe. Defaults to `40`. */
  swipeThreshold?: number;
  /** Renders a slide; receives `{ slide, index }`. Falls back to the slide's image/content. */
  slide?: MpRenderProperty<CarouselSlideScope>;
  /** Fired with the new index (the controlled `v-model` update). */
  onUpdateModelValue?: (index: number) => void;
  /** Fired with the new index whenever the active slide changes. */
  onChange?: (index: number) => void;
}

/**
 * `BaseCarousel` — a horizontally-scrollable slide deck authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It shows one slide at a time with optional previous/next controls, indicator
 * dots, keyboard (Arrow/Home/End) navigation, pointer-swipe, and optional
 * autoplay with a WCAG 2.2.2 pause/play control. It owns its styling through the
 * co-located CSS Module `base-carousel.module.scss`.
 *
 * Substitutions from the original Vue SFC: the slides came from the default slot
 * and the count was derived by introspecting slot VNodes — which the neutral
 * dialect cannot do — so the slides are driven by a `slides` array (with a
 * scoped `slide` slot for custom content), the same flattening the migrated
 * {@link BaseTabs} used. The Composition-API `ref`/`watch`/`onBeforeUnmount`
 * autoplay plumbing becomes `useState` + a `useEffect` interval (keyed on the
 * active index so it advances without a stale closure); the `useReducedMotion`
 * composable becomes an inline `matchMedia` check inside the effect; the pointer
 * start coordinates become a `useRef`; `defineExpose` is dropped; and the
 * `v-model` + emits become callback props.
 */
export function BaseCarousel(properties: Readonly<CarouselProperties>): MpElement {
  const {
    slides,
    modelValue = 0,
    controls = true,
    indicators = true,
    loop = true,
    ariaLabel = 'Carousel',
    autoplay = false,
    interval = 5000,
    pauseOnHover = true,
    swipeThreshold = 40,
    variant = 'neutral',
    size = 'md',
  } = properties;

  const slideCount = slides.length;

  const [currentIndex, setCurrentIndex] = useState<number>(modelValue);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [userPaused, setUserPaused] = useState<boolean>(false);
  const pointerStart = useRef<{ x: number; y: number } | undefined>(undefined);

  const commit = (index: number): void => {
    setCurrentIndex(index);
    properties.onUpdateModelValue?.(index);
    properties.onChange?.(index);
  };

  const goTo = (index: number): void => {
    if (slideCount === 0) {
      return;
    }
    const next = loop ? ((index % slideCount) + slideCount) % slideCount : Math.max(0, Math.min(slideCount - 1, index));
    commit(next);
  };

  const previous = (): void => goTo(currentIndex - 1);
  const next = (): void => goTo(currentIndex + 1);

  useEffect(() => {
    if (!autoplay || isPaused || userPaused || slideCount <= 1) {
      return;
    }
    if (
      globalThis.window !== undefined &&
      typeof globalThis.matchMedia === 'function' &&
      globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const timer = setInterval(
      () => {
        const upcoming = loop ? (currentIndex + 1) % slideCount : Math.min(slideCount - 1, currentIndex + 1);
        commit(upcoming);
      },
      Math.max(1000, interval),
    );
    return () => clearInterval(timer);
  }, [autoplay, interval, isPaused, userPaused, slideCount, currentIndex, loop]);

  const handleKeydown = (event: KeyboardEvent): void => {
    switch (event.key) {
      case 'ArrowLeft': {
        event.preventDefault();
        previous();
        break;
      }
      case 'ArrowRight': {
        event.preventDefault();
        next();
        break;
      }
      case 'Home': {
        event.preventDefault();
        goTo(0);
        break;
      }
      case 'End': {
        event.preventDefault();
        goTo(slideCount - 1);
        break;
      }
      default: {
        break;
      }
    }
  };

  const handlePointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    pointerStart.current = { x: event.clientX, y: event.clientY };
    if (pauseOnHover) {
      setIsPaused(true);
    }
  };

  const handlePointerUp = (event: PointerEvent): void => {
    const start = pointerStart.current;
    pointerStart.current = undefined;
    if (event.pointerType !== 'mouse' && pauseOnHover) {
      setIsPaused(false);
    }
    if (!start) {
      return;
    }
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < swipeThreshold || Math.abs(deltaX) < Math.abs(deltaY)) {
      return;
    }
    if (deltaX < 0) {
      next();
    } else {
      previous();
    }
  };

  const handlePointerCancel = (): void => {
    pointerStart.current = undefined;
    if (pauseOnHover) {
      setIsPaused(false);
    }
  };

  const showAutoplayToggle = autoplay && slideCount > 1;

  const indicatorButtons: MpChild[] = slides.map((slideItem, index) => (
    <button
      key={slideItem.id}
      aria-label={`Go to slide ${index + 1}`}
      aria-selected={currentIndex === index}
      className={[
        styles['base-carousel__indicator'],
        {
          [styles['base-carousel__indicator--active']]: currentIndex === index,
        },
      ]}
      role="tab"
      type="button"
      onClick={() => goTo(index)}
    />
  ));

  const slideNodes: MpChild[] = slides.map((slideItem, index) => (
    <div
      key={slideItem.id}
      aria-hidden={currentIndex === index ? undefined : 'true'}
      aria-label={`${index + 1} of ${slideCount}`}
      aria-roledescription="slide"
      className={styles['base-carousel__slide']}
      role="group"
    >
      <Slot
        name="slide"
        index={index}
        slide={slideItem}
      >
        {slideItem.image ? (
          <img
            alt={slideItem.alt ?? ''}
            className={styles['base-carousel__image']}
            src={slideItem.image}
          />
        ) : (
          slideItem.content
        )}
      </Slot>
    </div>
  ));

  return (
    <section
      aria-label={ariaLabel}
      aria-roledescription="carousel"
      className={[styles['base-carousel'], styles[`base-carousel--${variant}`], sizeStyles[`base-size--${size}`]]}
      tabindex={0}
      onKeydown={handleKeydown}
      onMouseenter={() => {
        if (pauseOnHover) {
          setIsPaused(true);
        }
      }}
      onMouseleave={() => {
        if (pauseOnHover) {
          setIsPaused(false);
        }
      }}
    >
      <div
        className={styles['base-carousel__viewport']}
        onPointercancel={handlePointerCancel}
        onPointerdown={handlePointerDown}
        onPointerleave={handlePointerCancel}
        onPointerup={handlePointerUp}
      >
        <div
          className={styles['base-carousel__track']}
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {slideNodes}
        </div>
      </div>

      {controls && slideCount > 1 ? (
        <button
          aria-label="Previous slide"
          className={[styles['base-carousel__control'], styles['base-carousel__control--prev']]}
          disabled={loop ? false : currentIndex === 0}
          type="button"
          onClick={previous}
        >
          <IconChevron
            direction="left"
            size="sm"
          />
        </button>
      ) : undefined}
      {controls && slideCount > 1 ? (
        <button
          aria-label="Next slide"
          className={[styles['base-carousel__control'], styles['base-carousel__control--next']]}
          disabled={loop ? false : currentIndex === slideCount - 1}
          type="button"
          onClick={next}
        >
          <IconChevron
            direction="right"
            size="sm"
          />
        </button>
      ) : undefined}

      {indicators && slideCount > 1 ? (
        <div
          className={styles['base-carousel__indicators']}
          role="tablist"
        >
          {indicatorButtons}
        </div>
      ) : undefined}

      {showAutoplayToggle ? (
        <button
          aria-label={userPaused ? 'Start automatic slide rotation' : 'Pause automatic slide rotation'}
          aria-pressed={userPaused}
          className={styles['base-carousel__autoplay']}
          type="button"
          onClick={() => setUserPaused(!userPaused)}
        >
          {userPaused ? <IconPlay size="sm" /> : <IconPause size="sm" />}
        </button>
      ) : undefined}
    </section>
  );
}
