import { classNames, createForgeStyle, type MpElement, type CSSStyleProperties } from '@mission-platform/forge';

import styles from './forge-carousel-indicator.module.scss';

export type CarouselIndicatorSize = 'sm' | 'md' | 'lg';
export type CarouselIndicatorOrientation = 'horizontal' | 'vertical';
export type CarouselIndicatorVariant = 'dots' | 'bars' | 'numbers';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface CarouselIndicatorStyleProperties {
  readonly 'border-width-thick'?: string;
  readonly 'color-text-on-primary'?: string;
  readonly 'color-text-secondary'?: string;
  readonly 'font-size-xs'?: string;
  readonly 'navigation-carousel-control-radius'?: string;
  readonly 'navigation-carousel-focus-border'?: string;
  readonly 'navigation-carousel-focus-border-width'?: string;
  readonly 'navigation-carousel-focus-offset'?: string;
  readonly 'navigation-carousel-indicator-radius'?: string;
  readonly 'navigation-carousel-indicator-surface-default'?: string;
  readonly 'navigation-carousel-indicator-surface-dot-default'?: string;
  readonly 'navigation-carousel-indicator-surface-dot-selected'?: string;
  readonly 'navigation-carousel-indicator-target-size'?: string;
  readonly 'navigation-carousel-indicator-transition-duration'?: string;
  readonly 'navigation-carousel-indicator-transition-easing'?: string;
  readonly 'navigation-carousel-indicators-gap'?: string;
  readonly 'opacity-disabled'?: string;
  readonly 'radius-sm'?: string;
  readonly 'radius-xs'?: string;
  readonly 'size-checkable-indicator'?: string;
  readonly 'size-icon-lg'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-2'?: string;
}

export type CarouselIndicatorStyle = CSSStyleProperties & {
  readonly '--forge-carousel-indicator-border-width-thick'?: string | undefined;
  readonly '--forge-carousel-indicator-color-text-on-primary'?: string | undefined;
  readonly '--forge-carousel-indicator-color-text-secondary'?: string | undefined;
  readonly '--forge-carousel-indicator-font-size-xs'?: string | undefined;
  readonly '--forge-carousel-indicator-navigation-carousel-control-radius'?: string | undefined;
  readonly '--forge-carousel-indicator-navigation-carousel-focus-border'?: string | undefined;
  readonly '--forge-carousel-indicator-navigation-carousel-focus-border-width'?: string | undefined;
  readonly '--forge-carousel-indicator-navigation-carousel-focus-offset'?: string | undefined;
  readonly '--forge-carousel-indicator-navigation-carousel-indicator-radius'?: string | undefined;
  readonly '--forge-carousel-indicator-navigation-carousel-indicator-surface-default'?: string | undefined;
  readonly '--forge-carousel-indicator-navigation-carousel-indicator-surface-dot-default'?: string | undefined;
  readonly '--forge-carousel-indicator-navigation-carousel-indicator-surface-dot-selected'?: string | undefined;
  readonly '--forge-carousel-indicator-navigation-carousel-indicator-target-size'?: string | undefined;
  readonly '--forge-carousel-indicator-navigation-carousel-indicator-transition-duration'?: string | undefined;
  readonly '--forge-carousel-indicator-navigation-carousel-indicator-transition-easing'?: string | undefined;
  readonly '--forge-carousel-indicator-navigation-carousel-indicators-gap'?: string | undefined;
  readonly '--forge-carousel-indicator-opacity-disabled'?: string | undefined;
  readonly '--forge-carousel-indicator-radius-sm'?: string | undefined;
  readonly '--forge-carousel-indicator-radius-xs'?: string | undefined;
  readonly '--forge-carousel-indicator-size-checkable-indicator'?: string | undefined;
  readonly '--forge-carousel-indicator-size-icon-lg'?: string | undefined;
  readonly '--forge-carousel-indicator-spacing-1'?: string | undefined;
  readonly '--forge-carousel-indicator-spacing-2'?: string | undefined;
};

function createCarouselIndicatorStyle(
  properties: Readonly<CarouselIndicatorStyleProperties> | undefined,
): CarouselIndicatorStyle | undefined {
  return createForgeStyle({
    '--forge-carousel-indicator-border-width-thick': properties?.['border-width-thick'],
    '--forge-carousel-indicator-color-text-on-primary': properties?.['color-text-on-primary'],
    '--forge-carousel-indicator-color-text-secondary': properties?.['color-text-secondary'],
    '--forge-carousel-indicator-font-size-xs': properties?.['font-size-xs'],
    '--forge-carousel-indicator-navigation-carousel-control-radius': properties?.['navigation-carousel-control-radius'],
    '--forge-carousel-indicator-navigation-carousel-focus-border': properties?.['navigation-carousel-focus-border'],
    '--forge-carousel-indicator-navigation-carousel-focus-border-width':
      properties?.['navigation-carousel-focus-border-width'],
    '--forge-carousel-indicator-navigation-carousel-focus-offset': properties?.['navigation-carousel-focus-offset'],
    '--forge-carousel-indicator-navigation-carousel-indicator-radius':
      properties?.['navigation-carousel-indicator-radius'],
    '--forge-carousel-indicator-navigation-carousel-indicator-surface-default':
      properties?.['navigation-carousel-indicator-surface-default'],
    '--forge-carousel-indicator-navigation-carousel-indicator-surface-dot-default':
      properties?.['navigation-carousel-indicator-surface-dot-default'],
    '--forge-carousel-indicator-navigation-carousel-indicator-surface-dot-selected':
      properties?.['navigation-carousel-indicator-surface-dot-selected'],
    '--forge-carousel-indicator-navigation-carousel-indicator-target-size':
      properties?.['navigation-carousel-indicator-target-size'],
    '--forge-carousel-indicator-navigation-carousel-indicator-transition-duration':
      properties?.['navigation-carousel-indicator-transition-duration'],
    '--forge-carousel-indicator-navigation-carousel-indicator-transition-easing':
      properties?.['navigation-carousel-indicator-transition-easing'],
    '--forge-carousel-indicator-navigation-carousel-indicators-gap': properties?.['navigation-carousel-indicators-gap'],
    '--forge-carousel-indicator-opacity-disabled': properties?.['opacity-disabled'],
    '--forge-carousel-indicator-radius-sm': properties?.['radius-sm'],
    '--forge-carousel-indicator-radius-xs': properties?.['radius-xs'],
    '--forge-carousel-indicator-size-checkable-indicator': properties?.['size-checkable-indicator'],
    '--forge-carousel-indicator-size-icon-lg': properties?.['size-icon-lg'],
    '--forge-carousel-indicator-spacing-1': properties?.['spacing-1'],
    '--forge-carousel-indicator-spacing-2': properties?.['spacing-2'],
  }) as CarouselIndicatorStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface CarouselIndicatorProperties {
  /** Number of slides represented by the indicator. */
  total: number;
  /** Active zero-based slide index. */
  current: number;
  variant?: CarouselIndicatorVariant;
  clickable?: boolean;
  ariaLabel?: string;
  onSelect?: (index: number) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<CarouselIndicatorStyleProperties>;
}

/** Accessible, keyboard-operable pagination dots for a carousel. */
export function ForgeCarouselIndicator(properties: Readonly<CarouselIndicatorProperties>): MpElement {
  const style = createCarouselIndicatorStyle(properties.properties);

  const count = Number.isFinite(properties.total) ? Math.max(0, Math.floor(properties.total)) : 0;
  const requestedActive = properties.current ?? 0;
  const active = Number.isFinite(requestedActive) ? Math.min(Math.max(0, requestedActive), Math.max(0, count - 1)) : 0;
  const clickable = properties.clickable ?? true;
  const select = (index: number): void => {
    if (clickable) {
      properties.onSelect?.(index);
    }
  };
  const variant = properties.variant ?? 'dots';
  return (
    <div
      aria-label={properties.ariaLabel ?? 'Carousel slides'}
      className={classNames(styles['forge-carousel-indicator'])}
      role="tablist"
      style={style}
    >
      {Array.from({ length: count }, (_, index) =>
        clickable ? (
          <button
            aria-selected={index === active ? 'true' : 'false'}
            aria-label={`Go to slide ${index + 1}`}
            className={styles['forge-carousel-indicator__button']}
            key={index}
            role="tab"
            type="button"
            onClick={() => select(index)}
          >
            <span
              aria-hidden="true"
              className={classNames(styles[`forge-carousel-indicator__${variant}`], {
                [styles['forge-carousel-indicator__active']]: index === active,
              })}
            >
              {variant === 'numbers' ? index + 1 : undefined}
            </span>
          </button>
        ) : (
          <span
            aria-label={`Go to slide ${index + 1}`}
            aria-selected={index === active ? 'true' : 'false'}
            className={classNames(styles[`forge-carousel-indicator__${variant}`], {
              [styles['forge-carousel-indicator__active']]: index === active,
            })}
            key={index}
            role="tab"
          />
        ),
      )}
    </div>
  );
}
