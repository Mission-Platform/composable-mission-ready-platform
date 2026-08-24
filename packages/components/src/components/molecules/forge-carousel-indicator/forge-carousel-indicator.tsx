import { classNames, type MpElement } from '@mission-platform/forge';

import styles from './forge-carousel-indicator.module.scss';

export type CarouselIndicatorSize = 'sm' | 'md' | 'lg';
export type CarouselIndicatorOrientation = 'horizontal' | 'vertical';
export type CarouselIndicatorVariant = 'dots' | 'bars' | 'numbers';

export interface CarouselIndicatorProperties {
  /** Number of slides represented by the indicator. */
  total: number;
  /** Active zero-based slide index. */
  current: number;
  variant?: CarouselIndicatorVariant;
  clickable?: boolean;
  ariaLabel?: string;
  onSelect?: (index: number) => void;
}

/** Accessible, keyboard-operable pagination dots for a carousel. */
export function ForgeCarouselIndicator(properties: Readonly<CarouselIndicatorProperties>): MpElement {
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
